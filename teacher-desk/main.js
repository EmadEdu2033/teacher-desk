'use strict';

const { app, BrowserWindow, ipcMain, Tray, Menu, Notification, dialog, nativeTheme, shell, powerMonitor } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

let Database;
let dbLoadError = null;
try {
  Database = require('better-sqlite3');
} catch (err) {
  dbLoadError = err;
  console.error('Failed to load better-sqlite3:', err);
}

const userDataDir = app.getPath('userData');
if (!fs.existsSync(userDataDir)) fs.mkdirSync(userDataDir, { recursive: true });
const dbPath = path.join(userDataDir, 'teacher-desk.db');
const backupsDir = path.join(userDataDir, 'backups');
const AUTO_BACKUP_KEEP = 7;
const AUTO_BACKUP_RE = /^teacher-desk-(\d{4}-\d{2}-\d{2})\.db$/;

let db = null;
function openDb() {
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      title TEXT DEFAULT '',
      body TEXT DEFAULT '',
      color TEXT DEFAULT 'yellow',
      font_size TEXT DEFAULT 'medium',
      x REAL DEFAULT 0,
      y REAL DEFAULT 0,
      width REAL DEFAULT 240,
      height REAL DEFAULT 220,
      z INTEGER DEFAULT 1,
      created_at INTEGER DEFAULT (strftime('%s','now')*1000),
      updated_at INTEGER DEFAULT (strftime('%s','now')*1000)
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      priority TEXT DEFAULT 'normal',
      category TEXT DEFAULT '',
      due_at INTEGER,
      completed INTEGER DEFAULT 0,
      completed_at INTEGER,
      reminder_fired INTEGER DEFAULT 0,
      created_at INTEGER DEFAULT (strftime('%s','now')*1000),
      updated_at INTEGER DEFAULT (strftime('%s','now')*1000)
    );

    CREATE TABLE IF NOT EXISTS subtasks (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      title TEXT NOT NULL,
      completed INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  // Migration: add font_size column to existing notes tables
  const noteCols = db.prepare("PRAGMA table_info(notes)").all().map(c => c.name);
  if (!noteCols.includes('font_size')) {
    db.exec("ALTER TABLE notes ADD COLUMN font_size TEXT DEFAULT 'medium'");
  }
}

function getSetting(key, fallback) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  if (!row) return fallback;
  try { return JSON.parse(row.value); } catch { return fallback; }
}
function setSetting(key, value) {
  db.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value')
    .run(key, JSON.stringify(value));
}

function ensureBackupsDir() {
  if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir, { recursive: true });
}

function todayStamp(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function listAutoBackupFiles() {
  ensureBackupsDir();
  return fs.readdirSync(backupsDir)
    .filter(f => AUTO_BACKUP_RE.test(f))
    .map(name => {
      const full = path.join(backupsDir, name);
      let stat = null;
      try { stat = fs.statSync(full); } catch {}
      return {
        name,
        path: full,
        date: name.match(AUTO_BACKUP_RE)[1],
        size: stat ? stat.size : 0,
        mtime: stat ? stat.mtimeMs : 0,
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

function rotateAutoBackups(keep = AUTO_BACKUP_KEEP) {
  const files = listAutoBackupFiles();
  for (const f of files.slice(keep)) {
    try { fs.unlinkSync(f.path); } catch {}
  }
}

function rotatePreRestoreBackups(keep = 3) {
  ensureBackupsDir();
  const files = fs.readdirSync(backupsDir)
    .filter(f => /^teacher-desk-prerestore-\d+\.db$/.test(f))
    .map(name => {
      const full = path.join(backupsDir, name);
      let mtime = 0;
      try { mtime = fs.statSync(full).mtimeMs; } catch {}
      return { name, full, mtime };
    })
    .sort((a, b) => b.mtime - a.mtime);
  for (const f of files.slice(keep)) {
    try { fs.unlinkSync(f.full); } catch {}
  }
}

let lastAutoBackupDate = null;
let autoBackupTimer = null;

function runAutoBackup() {
  try {
    if (!fs.existsSync(dbPath)) return;
    ensureBackupsDir();
    const stamp = todayStamp();
    const target = path.join(backupsDir, `teacher-desk-${stamp}.db`);
    if (!fs.existsSync(target)) {
      try { db.pragma('wal_checkpoint(TRUNCATE)'); } catch {}
      fs.copyFileSync(dbPath, target);
    }
    lastAutoBackupDate = stamp;
    rotateAutoBackups(AUTO_BACKUP_KEEP);
    // A successful run clears any previously recorded failure so the
    // renderer's warning banner disappears on the next refresh.
    try { setSetting('lastBackupFailure', null); } catch {}
  } catch (err) {
    const reason = err && err.message ? String(err.message) : String(err);
    console.warn('Auto-backup failed:', reason);
    try {
      setSetting('lastBackupFailure', {
        at: Date.now(),
        reason: reason.slice(0, 500),
      });
    } catch {}
  }
}

function checkAutoBackupForToday() {
  try {
    if (todayStamp() !== lastAutoBackupDate) {
      runAutoBackup();
    }
  } catch (err) {
    console.warn('Auto-backup check failed:', err && err.message ? err.message : err);
  }
}

function startAutoBackupScheduler() {
  if (autoBackupTimer) return;
  // Hourly poll: cheap, non-blocking, and self-corrects after sleep/wake
  // since timers don't fire while the OS is suspended.
  const HOUR_MS = 60 * 60 * 1000;
  autoBackupTimer = setInterval(checkAutoBackupForToday, HOUR_MS);
  if (autoBackupTimer.unref) autoBackupTimer.unref();

  // When the laptop lid is opened or the machine resumes from sleep,
  // check immediately so a missed midnight rollover is captured right away.
  try {
    powerMonitor.on('resume', checkAutoBackupForToday);
    powerMonitor.on('unlock-screen', checkAutoBackupForToday);
  } catch {}
}

let mainWindow = null;
let tray = null;
let isQuitting = false;

function createWindow() {
  const podium = !!getSetting('podiumMode', false);
  const theme = getSetting('theme', 'system');

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 780,
    minWidth: 800,
    minHeight: 560,
    backgroundColor: theme === 'dark' ? '#1a1a1f' : '#f6f5f0',
    title: 'Teacher Desk',
    icon: path.join(__dirname, 'build', 'icon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  if (podium) {
    try { mainWindow.setContentProtection(true); } catch {}
  }

  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      mainWindow.hide();
      if (process.platform === 'win32' && tray) {
        try {
          tray.displayBalloon({ title: 'Teacher Desk', content: 'Still running in the tray.' });
        } catch {}
      }
    }
  });
}

function createTray() {
  try {
    const iconPath = path.join(__dirname, 'build', 'icon.png');
    if (!fs.existsSync(iconPath)) return;
    tray = new Tray(iconPath);
    const menu = Menu.buildFromTemplate([
      { label: 'Open Teacher Desk', click: () => { if (mainWindow) { mainWindow.show(); mainWindow.focus(); } } },
      { type: 'separator' },
      { label: 'Quit', click: () => { isQuitting = true; app.quit(); } },
    ]);
    tray.setToolTip('Teacher Desk');
    tray.setContextMenu(menu);
    tray.on('click', () => { if (mainWindow) { mainWindow.show(); mainWindow.focus(); } });
  } catch (err) {
    console.warn('Tray init failed:', err.message);
  }
}

app.on('before-quit', () => { isQuitting = true; });

app.whenReady().then(() => {
  if (!Database) {
    dialog.showErrorBox(
      'Teacher Desk — startup error',
      'Failed to load the local database engine (better-sqlite3).\n\n' +
      (dbLoadError ? String(dbLoadError && dbLoadError.message || dbLoadError) : '') +
      '\n\nPlease reinstall Teacher Desk. If the problem persists, contact support.'
    );
    isQuitting = true;
    app.exit(1);
    return;
  }
  try {
    openDb();
  } catch (err) {
    dialog.showErrorBox(
      'Teacher Desk — database error',
      'Could not open the Teacher Desk database file.\n\n' +
      `Path: ${dbPath}\n\n${err && err.message ? err.message : String(err)}\n\n` +
      'Make sure the folder is writable, then try again.'
    );
    isQuitting = true;
    app.exit(1);
    return;
  }
  runAutoBackup();
  startAutoBackupScheduler();
  createWindow();
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
    else if (mainWindow) { mainWindow.show(); mainWindow.focus(); }
  });
});

app.on('window-all-closed', (e) => {
  if (!isQuitting) e.preventDefault();
});

// --- IPC handlers ---

function rowsToObjects(rows) { return rows; }

ipcMain.handle('notes:list', () => {
  return db.prepare('SELECT * FROM notes ORDER BY z ASC, created_at ASC').all();
});

ipcMain.handle('notes:create', (_e, note) => {
  const id = note.id || cryptoRandomId();
  const maxZ = (db.prepare('SELECT COALESCE(MAX(z),0) AS m FROM notes').get().m) || 0;
  const now = Date.now();
  db.prepare(`INSERT INTO notes(id,title,body,color,font_size,x,y,width,height,z,created_at,updated_at)
              VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    id,
    note.title || '',
    note.body || '',
    note.color || 'yellow',
    note.font_size || 'medium',
    note.x ?? 40,
    note.y ?? 40,
    note.width ?? 240,
    note.height ?? 220,
    maxZ + 1,
    now,
    now
  );
  return db.prepare('SELECT * FROM notes WHERE id = ?').get(id);
});

ipcMain.handle('notes:update', (_e, note) => {
  const fields = ['title','body','color','font_size','x','y','width','height','z'];
  const sets = [];
  const values = [];
  for (const f of fields) {
    if (Object.prototype.hasOwnProperty.call(note, f)) {
      sets.push(`${f} = ?`);
      values.push(note[f]);
    }
  }
  if (sets.length === 0) return null;
  sets.push('updated_at = ?');
  values.push(Date.now());
  values.push(note.id);
  db.prepare(`UPDATE notes SET ${sets.join(', ')} WHERE id = ?`).run(...values);
  return db.prepare('SELECT * FROM notes WHERE id = ?').get(note.id);
});

ipcMain.handle('notes:delete', (_e, id) => {
  db.prepare('DELETE FROM notes WHERE id = ?').run(id);
  return true;
});

ipcMain.handle('notes:bringToFront', (_e, id) => {
  const maxZ = (db.prepare('SELECT COALESCE(MAX(z),0) AS m FROM notes').get().m) || 0;
  db.prepare('UPDATE notes SET z = ?, updated_at = ? WHERE id = ?').run(maxZ + 1, Date.now(), id);
  return db.prepare('SELECT * FROM notes WHERE id = ?').get(id);
});

ipcMain.handle('tasks:list', () => {
  const tasks = db.prepare('SELECT * FROM tasks ORDER BY completed ASC, due_at ASC NULLS LAST, created_at DESC').all();
  const subs = db.prepare('SELECT * FROM subtasks ORDER BY sort_order ASC, id ASC').all();
  const byTask = {};
  for (const s of subs) {
    if (!byTask[s.task_id]) byTask[s.task_id] = [];
    byTask[s.task_id].push(s);
  }
  return tasks.map(t => ({ ...t, subtasks: byTask[t.id] || [] }));
});

ipcMain.handle('tasks:create', (_e, t) => {
  const id = t.id || cryptoRandomId();
  const now = Date.now();
  db.prepare(`INSERT INTO tasks(id,title,description,priority,category,due_at,created_at,updated_at)
              VALUES (?,?,?,?,?,?,?,?)`).run(
    id,
    t.title,
    t.description || '',
    t.priority || 'normal',
    t.category || '',
    t.due_at || null,
    now, now
  );
  if (Array.isArray(t.subtasks)) {
    let order = 0;
    for (const s of t.subtasks) {
      db.prepare('INSERT INTO subtasks(id,task_id,title,completed,sort_order) VALUES(?,?,?,?,?)')
        .run(cryptoRandomId(), id, s.title || '', s.completed ? 1 : 0, order++);
    }
  }
  return getTask(id);
});

ipcMain.handle('tasks:update', (_e, t) => {
  const fields = ['title','description','priority','category','due_at','completed','completed_at','reminder_fired'];
  const sets = []; const values = [];
  for (const f of fields) {
    if (Object.prototype.hasOwnProperty.call(t, f)) {
      sets.push(`${f} = ?`); values.push(t[f]);
    }
  }
  if (sets.length) {
    sets.push('updated_at = ?'); values.push(Date.now());
    values.push(t.id);
    db.prepare(`UPDATE tasks SET ${sets.join(', ')} WHERE id = ?`).run(...values);
  }
  if (Array.isArray(t.subtasks)) {
    db.prepare('DELETE FROM subtasks WHERE task_id = ?').run(t.id);
    let order = 0;
    for (const s of t.subtasks) {
      db.prepare('INSERT INTO subtasks(id,task_id,title,completed,sort_order) VALUES(?,?,?,?,?)')
        .run(s.id || cryptoRandomId(), t.id, s.title || '', s.completed ? 1 : 0, order++);
    }
  }
  return getTask(t.id);
});

ipcMain.handle('tasks:delete', (_e, id) => {
  db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
  return true;
});

function getTask(id) {
  const t = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  if (!t) return null;
  t.subtasks = db.prepare('SELECT * FROM subtasks WHERE task_id = ? ORDER BY sort_order ASC').all(id);
  return t;
}

ipcMain.handle('settings:get', (_e, key, fallback) => getSetting(key, fallback));
ipcMain.handle('settings:set', (_e, key, value) => { setSetting(key, value); return true; });

ipcMain.handle('podium:set', (_e, enabled) => {
  setSetting('podiumMode', !!enabled);
  if (mainWindow) {
    try { mainWindow.setContentProtection(!!enabled); } catch {}
  }
  return !!enabled;
});

ipcMain.handle('notify', (_e, { title, body }) => {
  try {
    if (Notification.isSupported()) {
      const n = new Notification({ title: title || 'Teacher Desk', body: body || '' });
      n.show();
      return true;
    }
  } catch {}
  return false;
});

ipcMain.handle('backup:export', async () => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Export Teacher Desk Backup',
    defaultPath: `teacher-desk-${new Date().toISOString().slice(0,10)}.tdbackup`,
    filters: [{ name: 'Teacher Desk Backup', extensions: ['tdbackup'] }],
  });
  if (result.canceled || !result.filePath) return { ok: false };
  try {
    db.pragma('wal_checkpoint(TRUNCATE)');
    fs.copyFileSync(dbPath, result.filePath);
    return { ok: true, path: result.filePath };
  } catch (e) { return { ok: false, error: e.message }; }
});

ipcMain.handle('backup:import', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Import Teacher Desk Backup',
    filters: [{ name: 'Teacher Desk Backup', extensions: ['tdbackup','db'] }],
    properties: ['openFile'],
  });
  if (result.canceled || !result.filePaths[0]) return { ok: false };
  try {
    if (db) db.close();
    fs.copyFileSync(result.filePaths[0], dbPath);
    openDb();
    return { ok: true };
  } catch (e) {
    try { openDb(); } catch {}
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('app:openDataFolder', () => {
  shell.openPath(userDataDir);
  return true;
});

ipcMain.handle('app:getVersion', () => app.getVersion());

ipcMain.handle('backup:listAuto', () => {
  try {
    const files = listAutoBackupFiles().map(f => ({
      name: f.name, date: f.date, size: f.size, mtime: f.mtime,
    }));
    return { ok: true, dir: backupsDir, files };
  } catch (e) {
    return { ok: false, error: e.message, dir: backupsDir, files: [] };
  }
});

ipcMain.handle('backup:lastStatus', () => {
  try {
    const failure = getSetting('lastBackupFailure', null);
    return { ok: true, lastFailure: failure || null };
  } catch (e) {
    return { ok: false, error: e.message, lastFailure: null };
  }
});

ipcMain.handle('backup:openAutoFolder', () => {
  try {
    ensureBackupsDir();
    shell.openPath(backupsDir);
    return { ok: true, dir: backupsDir };
  } catch (e) { return { ok: false, error: e.message }; }
});

ipcMain.handle('backup:restoreAuto', async (_e, name) => {
  if (!name || typeof name !== 'string' || !AUTO_BACKUP_RE.test(name)) {
    return { ok: false, error: 'Invalid backup name' };
  }
  const source = path.join(backupsDir, name);
  if (!fs.existsSync(source)) return { ok: false, error: 'Backup not found' };

  const confirm = await dialog.showMessageBox(mainWindow, {
    type: 'warning',
    buttons: ['Cancel', 'Restore'],
    defaultId: 0,
    cancelId: 0,
    title: 'Restore from backup',
    message: `Restore Teacher Desk from "${name}"?`,
    detail: 'Your current notes and tasks will be replaced. A safety copy of your current data will be saved first.',
  });
  if (confirm.response !== 1) return { ok: false, canceled: true };

  try {
    if (db) {
      try { db.pragma('wal_checkpoint(TRUNCATE)'); } catch {}
      db.close();
      db = null;
    }
    ensureBackupsDir();
    if (fs.existsSync(dbPath)) {
      const safety = path.join(backupsDir, `teacher-desk-prerestore-${Date.now()}.db`);
      try { fs.copyFileSync(dbPath, safety); } catch {}
      rotatePreRestoreBackups(3);
    }
    fs.copyFileSync(source, dbPath);
    openDb();
    return { ok: true };
  } catch (e) {
    try { openDb(); } catch {}
    return { ok: false, error: e.message };
  }
});

function cryptoRandomId() {
  return 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
}
