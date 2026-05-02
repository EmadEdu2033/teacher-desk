// Settings page logic

import { storage } from './storage.js';
import { setLang, t, applyDom, getLang } from './i18n.js';

let onLangChange = null;
export function setLangChangeHandler(fn) { onLangChange = fn; }

export async function initSettings() {
  // Load current values
  const lang   = await storage.settings.get('language', 'en');
  const theme  = await storage.settings.get('theme', 'system');
  const podium = await storage.settings.get('podiumMode', false);
  const sound  = await storage.settings.get('reminderSound', true);

  document.getElementById('settingLanguage').value = lang;
  document.getElementById('settingTheme').value = theme;
  document.getElementById('settingPodium').checked = !!podium;
  document.getElementById('settingSound').checked = !!sound;

  applyTheme(theme);
  setPodiumUI(!!podium);

  // Bind
  document.getElementById('settingLanguage').addEventListener('change', async (e) => {
    const v = e.target.value;
    await storage.settings.set('language', v);
    setLang(v);
    setLangToggleUI(v);
    if (onLangChange) onLangChange();
  });
  document.getElementById('settingTheme').addEventListener('change', async (e) => {
    const v = e.target.value;
    await storage.settings.set('theme', v);
    applyTheme(v);
  });
  document.getElementById('settingPodium').addEventListener('change', async (e) => {
    const on = e.target.checked;
    await storage.podium.set(on);
    await storage.settings.set('podiumMode', on);
    setPodiumUI(on);
    showToast(t(on ? 'toast.podiumOn' : 'toast.podiumOff'));
  });
  document.getElementById('settingSound').addEventListener('change', async (e) => {
    await storage.settings.set('reminderSound', e.target.checked);
  });

  document.getElementById('exportBtn').addEventListener('click', async () => {
    const r = await storage.backup.export();
    if (r && r.ok) showToast(t('toast.exported')); else if (r && r.error) showToast(t('toast.error'));
  });
  document.getElementById('importBtn').addEventListener('click', async () => {
    if (!confirm(t('settings.confirmImport'))) return;
    const r = await storage.backup.import();
    if (r && r.ok) { showToast(t('toast.imported')); setTimeout(() => location.reload(), 800); }
    else if (r && r.error) showToast(t('toast.error'));
  });
  document.getElementById('dataFolderBtn').addEventListener('click', () => storage.openDataFolder());

  document.getElementById('openBackupsBtn').addEventListener('click', async () => {
    await storage.backup.openAutoFolder();
  });

  document.getElementById('backupNowBtn').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    try {
      const r = storage.backup.runAutoNow ? await storage.backup.runAutoNow() : { ok: false };
      if (r && r.ok) {
        showToast(t('toast.backupNowSuccess'));
        await refreshAutoBackups();
      } else {
        // Keep user-facing copy translated; log raw errors for diagnostics.
        if (r && r.error) console.warn('Manual backup failed:', r.error);
        showToast(t('toast.backupNowFailed'));
        await refreshAutoBackups();
      }
    } catch (err) {
      console.warn('Manual backup failed:', err);
      showToast(t('toast.backupNowFailed'));
    } finally {
      btn.disabled = false;
    }
  });

  await refreshAutoBackups();
  await refreshAboutVersion();

  // Podium quick-toggle in toolbar
  document.getElementById('podiumToggle').addEventListener('click', async () => {
    const cb = document.getElementById('settingPodium');
    cb.checked = !cb.checked;
    cb.dispatchEvent(new Event('change'));
  });

  // Theme quick-toggle in toolbar (sun ↔ moon).
  // Always flips between explicit light and dark — never "system" — so a click
  // gives a deterministic visible result.
  const themeBtn = document.getElementById('themeToggle');
  if (themeBtn) {
    themeBtn.addEventListener('click', async () => {
      const current = document.documentElement.getAttribute('data-theme') || 'light';
      const next = current === 'dark' ? 'light' : 'dark';
      await storage.settings.set('theme', next);
      applyTheme(next);
      // Keep the Settings dropdown in sync if it's already mounted.
      const sel = document.getElementById('settingTheme');
      if (sel) sel.value = next;
    });
  }

  // Language quick-toggle in toolbar (EN ↔ AR).
  // Mirrors the dark-mode toggle pattern: persists, swaps language, syncs the
  // Settings dropdown, and refreshes the rest of the UI via onLangChange.
  setLangToggleUI(lang);
  const langBtn = document.getElementById('langToggle');
  if (langBtn) {
    langBtn.addEventListener('click', async () => {
      const current = document.documentElement.getAttribute('lang') || 'en';
      const next = current === 'ar' ? 'en' : 'ar';
      await storage.settings.set('language', next);
      setLang(next);
      setLangToggleUI(next);
      const sel = document.getElementById('settingLanguage');
      if (sel) sel.value = next;
      if (onLangChange) onLangChange();
    });
  }
}

// Show the OPPOSITE language on the button — i.e. what you'll switch TO.
function setLangToggleUI(lang) {
  const btn = document.getElementById('langToggle');
  if (!btn) return;
  const label = btn.querySelector('.lang-toggle-label');
  if (lang === 'ar') {
    if (label) label.textContent = t('lang.shortEn');
    btn.title = t('lang.toggleToEn');
    btn.setAttribute('aria-label', t('lang.toggleToEn'));
  } else {
    if (label) label.textContent = t('lang.shortAr');
    btn.title = t('lang.toggleToAr');
    btn.setAttribute('aria-label', t('lang.toggleToAr'));
  }
}

function applyTheme(mode) {
  let theme = mode;
  if (mode === 'system') {
    theme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  document.documentElement.setAttribute('data-theme', theme);
}

function setPodiumUI(on) {
  const btn = document.getElementById('podiumToggle');
  const lab = btn.querySelector('.podium-label');
  const ico = btn.querySelector('.podium-icon');
  btn.classList.toggle('on', on);
  lab.textContent = t(on ? 'podium.on' : 'podium.off');
  ico.textContent = on ? '🛡' : '👁';
}

let toastTimer = null;
export function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), 2400);
}

export function refreshSettingsUI() {
  setPodiumUI(document.getElementById('settingPodium').checked);
  // Re-render the Automatic Backups section so the "Last backup …" status
  // line and the snapshot row labels pick up the newly active language.
  refreshAutoBackups();
  refreshAboutVersion();
}

let cachedAppVersion = null;

async function refreshAboutVersion() {
  const el = document.getElementById('aboutVersion');
  if (!el) return;
  if (cachedAppVersion == null) {
    try {
      cachedAppVersion = (await storage.getVersion()) || '';
    } catch {
      cachedAppVersion = '';
    }
  }
  if (cachedAppVersion) {
    // Once we have the real version, drop the loading placeholder key so the
    // i18n DOM walker doesn't overwrite our text on language switches.
    el.removeAttribute('data-i18n');
    el.textContent = t('about.version').replace('{version}', cachedAppVersion);
  } else {
    el.setAttribute('data-i18n', 'about.versionLoading');
    el.textContent = t('about.versionLoading');
  }
}

async function refreshAutoBackups() {
  const pathEl = document.getElementById('autoBackupPath');
  const listEl = document.getElementById('autoBackupList');
  const statusEl = document.getElementById('autoBackupStatus');
  const failureEl = document.getElementById('autoBackupFailure');
  if (!pathEl || !listEl) return;

  if (!storage.isElectron) {
    pathEl.textContent = t('settings.autoBackupWebOnly');
    listEl.innerHTML = `<p class="muted">${t('settings.autoBackupWebOnly')}</p>`;
    if (statusEl) { statusEl.classList.add('hidden'); statusEl.textContent = ''; statusEl.classList.remove('warn'); }
    if (failureEl) { failureEl.classList.add('hidden'); failureEl.textContent = ''; }
    return;
  }

  let res = { ok: false, dir: '', files: [] };
  try { res = await storage.backup.listAuto(); } catch {}

  let lastFailure = null;
  if (storage.backup.lastStatus) {
    try {
      const s = await storage.backup.lastStatus();
      lastFailure = (s && s.lastFailure) || null;
    } catch {}
  }

  pathEl.textContent = res.dir || '—';

  const files = (res && res.files) || [];
  renderBackupFailure(failureEl, lastFailure);
  renderBackupStatus(statusEl, files);

  if (files.length === 0) {
    listEl.innerHTML = `<p class="muted">${t('settings.autoBackupEmpty')}</p>`;
    return;
  }

  listEl.innerHTML = '';
  for (const f of files) {
    const row = document.createElement('div');
    row.className = 'auto-backup-item';

    const meta = document.createElement('div');
    meta.className = 'meta';
    const name = document.createElement('span');
    name.className = 'name';
    name.textContent = f.date || f.name;
    const sub = document.createElement('span');
    sub.className = 'sub';
    sub.textContent = `${f.name} · ${formatBytes(f.size)}`;
    meta.appendChild(name);
    meta.appendChild(sub);

    const btn = document.createElement('button');
    btn.className = 'ghost-btn small';
    btn.textContent = t('settings.restore');
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      const r = await storage.backup.restoreAuto(f.name);
      if (r && r.ok) {
        showToast(t('toast.imported'));
        setTimeout(() => location.reload(), 800);
      } else if (r && r.canceled) {
        btn.disabled = false;
      } else {
        showToast((r && r.error) || t('toast.error'));
        btn.disabled = false;
      }
    });

    row.appendChild(meta);
    row.appendChild(btn);
    listEl.appendChild(row);
  }
}

function formatBytes(n) {
  if (!n || n < 1024) return `${n || 0} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

const STALE_BACKUP_DAYS = 2;

function renderBackupFailure(failureEl, lastFailure) {
  if (!failureEl) return;
  if (!lastFailure || !lastFailure.at) {
    failureEl.classList.add('hidden');
    failureEl.textContent = '';
    return;
  }

  const when = formatBackupWhen({ mtime: lastFailure.at });
  const reason = (lastFailure.reason && String(lastFailure.reason).trim())
    || t('settings.backupFailedUnknownReason');

  failureEl.innerHTML = '';

  const title = document.createElement('strong');
  title.className = 'backup-failure-title';
  title.textContent = t('settings.backupFailedTitle');
  failureEl.appendChild(title);

  const detail = document.createElement('div');
  detail.className = 'backup-failure-detail';
  detail.textContent = t('settings.backupFailedDetail')
    .replace('{when}', when)
    .replace('{reason}', reason);
  failureEl.appendChild(detail);

  const hint = document.createElement('div');
  hint.className = 'backup-failure-hint';
  hint.textContent = t('settings.backupFailedHint');
  failureEl.appendChild(hint);

  failureEl.classList.remove('hidden');
}

function renderBackupStatus(statusEl, files) {
  if (!statusEl) return;
  statusEl.classList.remove('warn');
  if (!files || files.length === 0) {
    // The list area already explains the empty state; keep the status row hidden.
    statusEl.textContent = '';
    statusEl.classList.add('hidden');
    return;
  }

  const latest = pickLatestBackup(files);
  const when = formatBackupWhen(latest);
  const stale = backupAgeInDays(latest) > STALE_BACKUP_DAYS;

  let text = t('settings.backupStatusLast').replace('{when}', when);
  if (stale) {
    text += ' ' + t('settings.backupStatusWarn');
    statusEl.classList.add('warn');
  }
  statusEl.textContent = text;
  statusEl.classList.remove('hidden');
}

function pickLatestBackup(files) {
  return files.reduce((best, f) => {
    const ft = backupTimestamp(f);
    const bt = best ? backupTimestamp(best) : -Infinity;
    return ft > bt ? f : best;
  }, null);
}

function backupTimestamp(f) {
  if (!f) return 0;
  if (typeof f.mtime === 'number' && f.mtime > 0) return f.mtime;
  if (f.date) {
    const t = Date.parse(`${f.date}T00:00:00`);
    return Number.isFinite(t) ? t : 0;
  }
  return 0;
}

function startOfDay(ts) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function backupAgeInDays(file, now = Date.now()) {
  const ts = backupTimestamp(file);
  if (!ts) return Infinity;
  const diff = startOfDay(now) - startOfDay(ts);
  return Math.max(0, Math.round(diff / 86400000));
}

function formatBackupWhen(file, now = new Date()) {
  const ts = backupTimestamp(file);
  const locale = getLang() === 'ar' ? 'ar-EG' : 'en-US';
  const time = ts
    ? new Date(ts).toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' })
    : '';
  const days = backupAgeInDays(file, now.getTime());

  if (days === 0) return t('settings.backupTimeToday').replace('{time}', time);
  if (days === 1) return t('settings.backupTimeYesterday').replace('{time}', time);
  if (days < 7) {
    return t('settings.backupTimeDaysAgo')
      .replace('{n}', String(days))
      .replace('{time}', time);
  }
  const dateStr = ts
    ? new Date(ts).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' })
    : (file && file.date) || '';
  return t('settings.backupTimeOn').replace('{date}', dateStr).replace('{time}', time);
}
