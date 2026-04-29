// Tasks: CRUD, grouping, in-app reminders

import { storage } from './storage.js';
import { t, getLang } from './i18n.js';

let tasks = [];
let editingId = null;
let reminderTimer = null;

export async function initTasks() {
  await reload();
  bindToolbar();
  bindModal();
  startReminderLoop();
}

async function reload() {
  tasks = await storage.tasks.list();
  render();
}

function bindToolbar() {
  document.getElementById('newTaskBtn').addEventListener('click', () => openModal(null));
  document.getElementById('taskSearch').addEventListener('input', render);
  document.getElementById('taskFilterPriority').addEventListener('change', render);
}

function escape(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function fmtDue(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const lang = getLang() === 'ar' ? 'ar' : 'en';
  return d.toLocaleString(lang, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function startOfDay(ts) {
  const d = new Date(ts); d.setHours(0,0,0,0); return d.getTime();
}

function groupTasks(list) {
  const today0 = startOfDay(Date.now());
  const tomorrow0 = today0 + 86400000;
  const groups = { overdue: [], today: [], upcoming: [], noDate: [], completed: [] };
  for (const t of list) {
    if (t.completed) { groups.completed.push(t); continue; }
    if (!t.due_at) { groups.noDate.push(t); continue; }
    if (t.due_at < today0) groups.overdue.push(t);
    else if (t.due_at < tomorrow0) groups.today.push(t);
    else groups.upcoming.push(t);
  }
  return groups;
}

function render() {
  const search = document.getElementById('taskSearch').value.trim().toLowerCase();
  const prio = document.getElementById('taskFilterPriority').value;
  let list = tasks.slice();
  if (search) list = list.filter(t =>
    (t.title||'').toLowerCase().includes(search) ||
    (t.description||'').toLowerCase().includes(search) ||
    (t.category||'').toLowerCase().includes(search)
  );
  if (prio) list = list.filter(t => t.priority === prio);

  const g = groupTasks(list);
  const root = document.getElementById('taskGroups');
  root.innerHTML = '';
  const order = [
    ['overdue',   t('tasks.overdue')],
    ['today',     t('tasks.today')],
    ['upcoming',  t('tasks.upcoming')],
    ['noDate',    t('tasks.noDate')],
    ['completed', t('tasks.completed')],
  ];
  let any = false;
  for (const [k, label] of order) {
    if (!g[k].length) continue;
    any = true;
    const group = document.createElement('div');
    group.className = 'task-group';
    group.innerHTML = `<h3>${escape(label)} <span class="muted">(${g[k].length})</span></h3>`;
    for (const task of g[k]) group.appendChild(renderRow(task, k));
    root.appendChild(group);
  }
  if (!any) {
    root.innerHTML = `<div class="muted" style="text-align:center;padding:40px;">${escape(t('tasks.empty'))}</div>`;
  }
}

function renderRow(task, group) {
  const overdue = group === 'overdue';
  const row = document.createElement('div');
  row.className = `task-row ${task.completed ? 'completed' : ''} ${overdue ? 'overdue' : ''}`;
  row.dataset.id = task.id;
  const prio = task.priority || 'normal';
  const subs = task.subtasks || [];
  row.innerHTML = `
    <input class="task-check" type="checkbox" ${task.completed ? 'checked' : ''} />
    <div class="task-main">
      <div class="task-title">${escape(task.title)}</div>
      ${task.description ? `<div class="muted" style="font-size:12px;margin-top:2px">${escape(task.description)}</div>` : ''}
      <div class="task-meta">
        <span class="pill ${prio}">${escape(t('tasks.' + prio))}</span>
        ${task.category ? `<span class="pill">${escape(task.category)}</span>` : ''}
        ${task.due_at ? `<span class="pill due ${overdue?'overdue':''}">${escape(t('tasks.dueLabel'))}: ${escape(fmtDue(task.due_at))}</span>` : ''}
      </div>
      ${subs.length ? `<div class="subtasks">${subs.map(s =>
        `<div class="subtask ${s.completed?'done':''}">
           <input type="checkbox" data-sub="${s.id}" ${s.completed?'checked':''}/>
           <span>${escape(s.title)}</span>
         </div>`).join('')}</div>` : ''}
    </div>
    <div class="task-actions">
      <button class="icon-btn" data-act="edit" title="${escape(t('common.edit'))}">✎</button>
      <button class="icon-btn danger" data-act="del" title="${escape(t('common.delete'))}">🗑</button>
    </div>
  `;
  row.querySelector('.task-check').addEventListener('change', async (e) => {
    const completed = e.target.checked ? 1 : 0;
    await storage.tasks.update({
      id: task.id, completed,
      completed_at: completed ? Date.now() : null,
      reminder_fired: completed ? 1 : task.reminder_fired,
    });
    await reload();
  });
  row.querySelector('[data-act="edit"]').addEventListener('click', () => openModal(task));
  row.querySelector('[data-act="del"]').addEventListener('click', async () => {
    if (confirm('Delete this task?')) { await storage.tasks.delete(task.id); await reload(); }
  });
  row.querySelectorAll('[data-sub]').forEach(cb => {
    cb.addEventListener('change', async (e) => {
      const subId = cb.getAttribute('data-sub');
      const newSubs = subs.map(s => s.id === subId ? { ...s, completed: cb.checked ? 1 : 0 } : s);
      await storage.tasks.update({ id: task.id, subtasks: newSubs });
      await reload();
    });
  });
  return row;
}

// --- Modal ---

function bindModal() {
  document.getElementById('taskCancel').addEventListener('click', closeModal);
  document.getElementById('taskSave').addEventListener('click', saveModal);
  document.getElementById('addSubtask').addEventListener('click', () => addSubtaskInput('', false));
  document.getElementById('taskModal').addEventListener('click', (e) => {
    if (e.target.id === 'taskModal') closeModal();
  });
}

function openModal(task) {
  editingId = task ? task.id : null;
  document.getElementById('taskModalTitle').textContent = task ? t('common.edit') : t('tasks.new');
  document.getElementById('taskTitle').value = task ? task.title : '';
  document.getElementById('taskDesc').value = task ? task.description || '' : '';
  document.getElementById('taskPriority').value = task ? task.priority || 'normal' : 'normal';
  document.getElementById('taskCategory').value = task ? task.category || '' : '';
  if (task && task.due_at) {
    const d = new Date(task.due_at);
    document.getElementById('taskDueDate').value =
      `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    document.getElementById('taskDueTime').value =
      `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  } else {
    document.getElementById('taskDueDate').value = '';
    document.getElementById('taskDueTime').value = '';
  }
  document.getElementById('subtaskList').innerHTML = '';
  if (task && task.subtasks) for (const s of task.subtasks) addSubtaskInput(s.title, !!s.completed, s.id);
  document.getElementById('taskModal').classList.remove('hidden');
  document.getElementById('taskTitle').focus();
}

function closeModal() {
  document.getElementById('taskModal').classList.add('hidden');
  editingId = null;
}

function addSubtaskInput(title, completed, id) {
  const list = document.getElementById('subtaskList');
  const row = document.createElement('div');
  row.className = 'subtask-input';
  if (id) row.dataset.id = id;
  row.innerHTML = `
    <input type="checkbox" ${completed?'checked':''} />
    <input type="text" value="${escape(title || '')}" placeholder="Sub-task" />
    <button class="remove" type="button" title="Remove">✕</button>
  `;
  row.querySelector('.remove').addEventListener('click', () => row.remove());
  list.appendChild(row);
}

async function saveModal() {
  const title = document.getElementById('taskTitle').value.trim();
  if (!title) { document.getElementById('taskTitle').focus(); return; }
  const description = document.getElementById('taskDesc').value.trim();
  const priority = document.getElementById('taskPriority').value;
  const category = document.getElementById('taskCategory').value.trim();
  const date = document.getElementById('taskDueDate').value;
  const time = document.getElementById('taskDueTime').value;
  let due_at = null;
  if (date) {
    const dt = new Date(`${date}T${time || '09:00'}:00`);
    if (!isNaN(dt.getTime())) due_at = dt.getTime();
  }
  const subtasks = Array.from(document.querySelectorAll('#subtaskList .subtask-input')).map(row => ({
    id: row.dataset.id || undefined,
    title: row.querySelector('input[type="text"]').value.trim(),
    completed: row.querySelector('input[type="checkbox"]').checked ? 1 : 0,
  })).filter(s => s.title);

  if (editingId) {
    // If due_at changed, reset reminder_fired
    const existing = tasks.find(t => t.id === editingId);
    const reminder_fired = (existing && existing.due_at !== due_at) ? 0 : (existing?.reminder_fired || 0);
    await storage.tasks.update({ id: editingId, title, description, priority, category, due_at, subtasks, reminder_fired });
  } else {
    await storage.tasks.create({ title, description, priority, category, due_at, subtasks });
  }
  closeModal();
  await reload();
}

// --- Reminder loop ---

function startReminderLoop() {
  clearInterval(reminderTimer);
  reminderTimer = setInterval(checkReminders, 20000); // every 20 sec
  setTimeout(checkReminders, 2000);
}

async function checkReminders() {
  const now = Date.now();
  const soundOn = await storage.settings.get('reminderSound', true);
  let fired = false;
  for (const task of tasks) {
    if (task.completed || task.reminder_fired || !task.due_at) continue;
    if (task.due_at <= now) {
      await storage.tasks.update({ id: task.id, reminder_fired: 1 });
      fireReminder(task, soundOn);
      fired = true;
    }
  }
  if (fired) await reload();
}

function fireReminder(task, soundOn) {
  storage.notify({ title: t('tasks.reminderTitle'), body: task.title });
  if (soundOn) playSound();
  // Pulse the row
  setTimeout(() => {
    const row = document.querySelector(`.task-row[data-id="${task.id}"]`);
    if (row) {
      row.classList.add('pulsing');
      setTimeout(() => row.classList.remove('pulsing'), 4500);
    }
  }, 400);
}

let audioCtx = null;
function playSound() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const t0 = audioCtx.currentTime;
    [880, 660, 880].forEach((freq, i) => {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(freq, t0 + i*0.18);
      g.gain.setValueAtTime(0, t0 + i*0.18);
      g.gain.linearRampToValueAtTime(0.18, t0 + i*0.18 + 0.02);
      g.gain.linearRampToValueAtTime(0, t0 + i*0.18 + 0.16);
      o.connect(g); g.connect(audioCtx.destination);
      o.start(t0 + i*0.18); o.stop(t0 + i*0.18 + 0.18);
    });
  } catch {}
}

export function refreshTasksUI() {
  document.getElementById('taskSearch').placeholder = t('tasks.search');
  render();
}
