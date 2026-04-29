// Main entry point — wires up tabs, language bootstrap, then mounts each view.

import { storage } from './storage.js';
import { setLang, applyDom, t } from './i18n.js';
import { initNotes, refreshNotesUI } from './notes.js';
import { initTasks, refreshTasksUI } from './tasks.js';
import { initSettings, setLangChangeHandler, refreshSettingsUI } from './settings.js';

function switchView(name) {
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.view === name));
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === `view-${name}`));
}

function bindTabs() {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => switchView(tab.dataset.view));
  });
}

async function boot() {
  // Bootstrap language before render
  const lang = await storage.settings.get('language', 'en');
  setLang(lang);
  applyDom();

  bindTabs();
  await initSettings();
  await initNotes();
  await initTasks();

  setLangChangeHandler(() => {
    applyDom();
    refreshNotesUI();
    refreshTasksUI();
    refreshSettingsUI();
  });

  // Default view
  switchView('notes');
}

window.addEventListener('DOMContentLoaded', boot);
