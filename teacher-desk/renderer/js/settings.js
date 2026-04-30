// Settings page logic

import { storage } from './storage.js';
import { setLang, t, applyDom } from './i18n.js';

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

  await refreshAutoBackups();

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
}

async function refreshAutoBackups() {
  const pathEl = document.getElementById('autoBackupPath');
  const listEl = document.getElementById('autoBackupList');
  if (!pathEl || !listEl) return;

  if (!storage.isElectron) {
    pathEl.textContent = t('settings.autoBackupWebOnly');
    listEl.innerHTML = `<p class="muted">${t('settings.autoBackupWebOnly')}</p>`;
    return;
  }

  let res = { ok: false, dir: '', files: [] };
  try { res = await storage.backup.listAuto(); } catch {}

  pathEl.textContent = res.dir || '—';

  const files = (res && res.files) || [];
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
