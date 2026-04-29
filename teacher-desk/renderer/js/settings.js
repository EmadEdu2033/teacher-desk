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

  // Podium quick-toggle in toolbar
  document.getElementById('podiumToggle').addEventListener('click', async () => {
    const cb = document.getElementById('settingPodium');
    cb.checked = !cb.checked;
    cb.dispatchEvent(new Event('change'));
  });
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
