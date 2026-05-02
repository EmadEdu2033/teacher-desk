// Storage abstraction: uses Electron IPC + SQLite when available,
// otherwise falls back to localStorage so the renderer can be previewed in a plain browser.

const isElectron = typeof window !== 'undefined' && !!window.td && window.td.isElectron;

const LS_KEYS = {
  notes:   'td_notes',
  tasks:   'td_tasks',
  settings:'td_settings',
};

function lsGet(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
function lsSet(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
function uid() { return 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10); }

// ---- Web fallback impl ----
const web = {
  notes: {
    async list() {
      const arr = lsGet(LS_KEYS.notes, []);
      return arr.sort((a,b) => (a.z||0) - (b.z||0));
    },
    async create(note) {
      const arr = lsGet(LS_KEYS.notes, []);
      const maxZ = arr.reduce((m,n) => Math.max(m, n.z||0), 0);
      const now = Date.now();
      const n = {
        id: note.id || uid(),
        title: note.title || '',
        body: note.body || '',
        color: note.color || 'yellow',
        font_size: note.font_size || 'medium',
        x: note.x ?? 40,
        y: note.y ?? 40,
        width: note.width ?? 240,
        height: note.height ?? 220,
        z: maxZ + 1,
        created_at: now,
        updated_at: now,
      };
      arr.push(n); lsSet(LS_KEYS.notes, arr);
      return n;
    },
    async update(note) {
      const arr = lsGet(LS_KEYS.notes, []);
      const i = arr.findIndex(n => n.id === note.id);
      if (i < 0) return null;
      arr[i] = { ...arr[i], ...note, updated_at: Date.now() };
      lsSet(LS_KEYS.notes, arr);
      return arr[i];
    },
    async delete(id) {
      lsSet(LS_KEYS.notes, lsGet(LS_KEYS.notes, []).filter(n => n.id !== id));
      return true;
    },
    async bringToFront(id) {
      const arr = lsGet(LS_KEYS.notes, []);
      const maxZ = arr.reduce((m,n) => Math.max(m, n.z||0), 0);
      const i = arr.findIndex(n => n.id === id);
      if (i >= 0) { arr[i].z = maxZ + 1; lsSet(LS_KEYS.notes, arr); return arr[i]; }
      return null;
    },
  },
  tasks: {
    async list() {
      return lsGet(LS_KEYS.tasks, []).sort((a,b) => {
        if (a.completed !== b.completed) return a.completed - b.completed;
        return (a.due_at||Infinity) - (b.due_at||Infinity);
      });
    },
    async create(t) {
      const arr = lsGet(LS_KEYS.tasks, []);
      const now = Date.now();
      const task = {
        id: t.id || uid(),
        title: t.title,
        description: t.description || '',
        priority: t.priority || 'normal',
        category: t.category || '',
        due_at: t.due_at || null,
        completed: 0,
        completed_at: null,
        reminder_fired: 0,
        created_at: now, updated_at: now,
        subtasks: (t.subtasks || []).map(s => ({ id: uid(), title: s.title || '', completed: s.completed?1:0 })),
      };
      arr.push(task); lsSet(LS_KEYS.tasks, arr);
      return task;
    },
    async update(t) {
      const arr = lsGet(LS_KEYS.tasks, []);
      const i = arr.findIndex(x => x.id === t.id);
      if (i < 0) return null;
      arr[i] = { ...arr[i], ...t, updated_at: Date.now() };
      if (Array.isArray(t.subtasks)) {
        arr[i].subtasks = t.subtasks.map(s => ({
          id: s.id || uid(),
          title: s.title || '',
          completed: s.completed ? 1 : 0,
        }));
      }
      lsSet(LS_KEYS.tasks, arr);
      return arr[i];
    },
    async delete(id) {
      lsSet(LS_KEYS.tasks, lsGet(LS_KEYS.tasks, []).filter(t => t.id !== id));
      return true;
    },
  },
  settings: {
    async get(key, fallback) {
      const all = lsGet(LS_KEYS.settings, {});
      return (key in all) ? all[key] : fallback;
    },
    async set(key, value) {
      const all = lsGet(LS_KEYS.settings, {});
      all[key] = value; lsSet(LS_KEYS.settings, all);
      return true;
    },
  },
  podium: { async set(_) { return false; } },
  notify: async (msg) => {
    if ('Notification' in window) {
      try {
        if (Notification.permission === 'default') await Notification.requestPermission();
        if (Notification.permission === 'granted') new Notification(msg.title || 'Teacher Desk', { body: msg.body });
      } catch {}
    }
    return true;
  },
  backup: {
    async export() { alert('Backup is only available in the installed Windows app.'); return { ok: false }; },
    async import() { alert('Restore is only available in the installed Windows app.'); return { ok: false }; },
    async listAuto() { return { ok: true, dir: '', files: [] }; },
    async lastStatus() { return { ok: true, lastFailure: null }; },
    async restoreAuto() { alert('Restore is only available in the installed Windows app.'); return { ok: false }; },
    async openAutoFolder() { alert('Backups folder is only available in the installed Windows app.'); return { ok: false }; },
  },
  openDataFolder: async () => false,
  getVersion: async () => null,
  isElectron: false,
};

// ---- Public storage object ----
export const storage = isElectron ? {
  notes: window.td.notes,
  tasks: window.td.tasks,
  settings: window.td.settings,
  podium: window.td.podium,
  notify: window.td.notify,
  backup: window.td.backup,
  openDataFolder: window.td.openDataFolder,
  getVersion: window.td.getVersion,
  isElectron: true,
} : web;
