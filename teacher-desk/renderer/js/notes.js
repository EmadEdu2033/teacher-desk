// Sticky notes wall — drag, resize, color, persistence

import { storage } from './storage.js';
import { t } from './i18n.js';

const wallEl = () => document.getElementById('wall');
const surfaceEl = () => document.getElementById('wallSurface');

const view = { tx: 0, ty: 0, scale: 1 };
const SURFACE_OFFSET = 4000; // surface left/top is -4000

let notes = [];
let activeNoteEl = null;

const COLORS = ['yellow','pink','green','blue','purple','orange','white','dark'];

export async function initNotes() {
  await loadAndRender();
  bindWallEvents();
  bindControls();
  bindNewNoteFlow();
  bindContextMenu();
  centerView();
  updateStatus();
}

async function loadAndRender() {
  notes = await storage.notes.list();
  const surf = surfaceEl();
  surf.innerHTML = '';
  for (const n of notes) surf.appendChild(renderNote(n));
}

function renderNote(n) {
  const el = document.createElement('div');
  el.className = `sticky ${n.color || 'yellow'} font-${n.font_size || 'medium'}`;
  el.dataset.id = n.id;
  el.style.left   = `${SURFACE_OFFSET + (n.x || 0)}px`;
  el.style.top    = `${SURFACE_OFFSET + (n.y || 0)}px`;
  el.style.width  = `${n.width || 240}px`;
  el.style.height = `${n.height || 220}px`;
  el.style.zIndex = String(n.z || 1);
  el.style.touchAction = 'none';

  el.innerHTML = `
    <div class="sticky-handle">
      <span class="dots">⋮⋮</span>
      <button class="menu-btn" title="Menu">⋯</button>
    </div>
    <input class="sticky-title" type="text" placeholder="${escape(t('notes.titlePlaceholder'))}" />
    <textarea class="sticky-body" placeholder="${escape(t('notes.bodyPlaceholder'))}"></textarea>
    <div class="resize-handle"></div>
  `;
  el.querySelector('.sticky-title').value = n.title || '';
  el.querySelector('.sticky-body').value  = n.body  || '';

  bindNoteInteractions(el, n);
  return el;
}

function escape(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function bindNoteInteractions(el, n) {
  const titleEl = el.querySelector('.sticky-title');
  const bodyEl  = el.querySelector('.sticky-body');
  const handle  = el.querySelector('.sticky-handle');
  const resize  = el.querySelector('.resize-handle');
  const menuBtn = el.querySelector('.menu-btn');

  // Auto-save on edit
  let saveTimer = null;
  const scheduleSave = () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      await storage.notes.update({ id: n.id, title: titleEl.value, body: bodyEl.value });
      const idx = notes.findIndex(x => x.id === n.id);
      if (idx >= 0) { notes[idx].title = titleEl.value; notes[idx].body = bodyEl.value; }
    }, 250);
  };
  titleEl.addEventListener('input', scheduleSave);
  bodyEl.addEventListener('input', scheduleSave);
  // Don't intercept events while editing text fields
  [titleEl, bodyEl].forEach(inp => {
    inp.addEventListener('pointerdown', e => e.stopPropagation());
  });

  // Drag from handle (mouse + touch via pointer events)
  handle.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (e.target.classList.contains('menu-btn')) return;
    e.preventDefault();
    bringToFront(el, n);
    const startX = e.clientX, startY = e.clientY;
    const startLeft = parseFloat(el.style.left), startTop = parseFloat(el.style.top);
    el.classList.add('dragging');
    handle.setPointerCapture(e.pointerId);

    function onMove(ev) {
      if (ev.pointerId !== e.pointerId) return;
      const dx = (ev.clientX - startX) / view.scale;
      const dy = (ev.clientY - startY) / view.scale;
      el.style.left = `${startLeft + dx}px`;
      el.style.top  = `${startTop + dy}px`;
    }
    function onUp(ev) {
      if (ev.pointerId !== e.pointerId) return;
      handle.removeEventListener('pointermove', onMove);
      handle.removeEventListener('pointerup', onUp);
      handle.removeEventListener('pointercancel', onUp);
      el.classList.remove('dragging');
      const newX = parseFloat(el.style.left) - SURFACE_OFFSET;
      const newY = parseFloat(el.style.top)  - SURFACE_OFFSET;
      storage.notes.update({ id: n.id, x: newX, y: newY });
      const idx = notes.findIndex(x => x.id === n.id);
      if (idx >= 0) { notes[idx].x = newX; notes[idx].y = newY; }
    }
    handle.addEventListener('pointermove', onMove);
    handle.addEventListener('pointerup', onUp);
    handle.addEventListener('pointercancel', onUp);
  });

  // Resize (pointer events)
  resize.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault(); e.stopPropagation();
    bringToFront(el, n);
    const startX = e.clientX, startY = e.clientY;
    const startW = el.offsetWidth, startH = el.offsetHeight;
    resize.setPointerCapture(e.pointerId);
    function onMove(ev) {
      if (ev.pointerId !== e.pointerId) return;
      const dw = (ev.clientX - startX) / view.scale;
      const dh = (ev.clientY - startY) / view.scale;
      el.style.width  = `${Math.max(140, startW + dw)}px`;
      el.style.height = `${Math.max(120, startH + dh)}px`;
    }
    function onUp(ev) {
      if (ev.pointerId !== e.pointerId) return;
      resize.removeEventListener('pointermove', onMove);
      resize.removeEventListener('pointerup', onUp);
      resize.removeEventListener('pointercancel', onUp);
      const w = parseFloat(el.style.width), h = parseFloat(el.style.height);
      storage.notes.update({ id: n.id, width: w, height: h });
      const idx = notes.findIndex(x => x.id === n.id);
      if (idx >= 0) { notes[idx].width = w; notes[idx].height = h; }
    }
    resize.addEventListener('pointermove', onMove);
    resize.addEventListener('pointerup', onUp);
    resize.addEventListener('pointercancel', onUp);
  });

  // Bring to front on click
  el.addEventListener('pointerdown', () => bringToFront(el, n));

  // Menu button & right-click
  menuBtn.addEventListener('click', (e) => { e.stopPropagation(); openMenu(el, n, e.clientX, e.clientY); });
  el.addEventListener('contextmenu', (e) => { e.preventDefault(); openMenu(el, n, e.clientX, e.clientY); });
}

async function bringToFront(el, n) {
  const updated = await storage.notes.bringToFront(n.id);
  if (updated) {
    el.style.zIndex = String(updated.z);
    const idx = notes.findIndex(x => x.id === n.id);
    if (idx >= 0) notes[idx].z = updated.z;
  }
}

// --- Wall pan & zoom ---

function bindWallEvents() {
  const wall = wallEl();
  wall.style.touchAction = 'none';
  let panning = false, panId = null;
  let startX = 0, startY = 0, startTx = 0, startTy = 0;

  wall.addEventListener('pointerdown', (e) => {
    if (e.target !== wall && e.target !== surfaceEl()) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    panning = true; panId = e.pointerId;
    wall.classList.add('panning');
    wall.setPointerCapture(e.pointerId);
    startX = e.clientX; startY = e.clientY;
    startTx = view.tx; startTy = view.ty;
  });
  wall.addEventListener('pointermove', (e) => {
    if (!panning || e.pointerId !== panId) return;
    view.tx = startTx + (e.clientX - startX);
    view.ty = startTy + (e.clientY - startY);
    applyTransform();
  });
  const endPan = (e) => {
    if (!panning || (e && e.pointerId !== panId)) return;
    panning = false; panId = null;
    wall.classList.remove('panning');
  };
  wall.addEventListener('pointerup', endPan);
  wall.addEventListener('pointercancel', endPan);
}

function applyTransform() {
  surfaceEl().style.transform = `translate(${view.tx}px, ${view.ty}px) scale(${view.scale})`;
}

function centerView() {
  const wall = wallEl();
  const r = wall.getBoundingClientRect();
  view.tx = -SURFACE_OFFSET + r.width / 2 - 120;
  view.ty = -SURFACE_OFFSET + r.height / 2 - 110;
  view.scale = 1;
  applyTransform();
}

function fitView() {
  if (notes.length === 0) { centerView(); return; }
  const minX = Math.min(...notes.map(n => n.x));
  const minY = Math.min(...notes.map(n => n.y));
  const maxX = Math.max(...notes.map(n => n.x + (n.width||240)));
  const maxY = Math.max(...notes.map(n => n.y + (n.height||220)));
  const wall = wallEl();
  const r = wall.getBoundingClientRect();
  const w = maxX - minX, h = maxY - minY;
  const margin = 80;
  view.scale = Math.min(1, (r.width - margin*2) / w, (r.height - margin*2) / h);
  view.tx = -SURFACE_OFFSET * view.scale - minX * view.scale + r.width/2 - (w*view.scale)/2;
  view.ty = -SURFACE_OFFSET * view.scale - minY * view.scale + r.height/2 - (h*view.scale)/2;
  applyTransform();
}

function bindControls() {
  document.getElementById('wallFit').addEventListener('click', fitView);
  document.getElementById('wallReset').addEventListener('click', centerView);
}

// --- New note flow ---

function bindNewNoteFlow() {
  const btn = document.getElementById('quickAddNote');
  const popover = document.getElementById('colorPicker');
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    popover.classList.toggle('hidden');
  });
  popover.querySelectorAll('.swatch').forEach(sw => {
    sw.addEventListener('click', async () => {
      popover.classList.add('hidden');
      await createNoteAtCenter(sw.dataset.color);
    });
  });
  document.addEventListener('click', (e) => {
    if (!popover.contains(e.target) && e.target.id !== 'quickAddNote') popover.classList.add('hidden');
  });
}

async function createNoteAtCenter(color) {
  const wall = wallEl();
  const r = wall.getBoundingClientRect();
  // map screen-center to surface coords (undo translate+scale)
  const screenCx = r.width / 2;
  const screenCy = r.height / 2;
  const x = (screenCx - view.tx) / view.scale - SURFACE_OFFSET - 120 + (Math.random()*40 - 20);
  const y = (screenCy - view.ty) / view.scale - SURFACE_OFFSET - 110 + (Math.random()*40 - 20);
  const n = await storage.notes.create({ color, x, y, width: 240, height: 220 });
  notes.push(n);
  const el = renderNote(n);
  surfaceEl().appendChild(el);
  el.querySelector('.sticky-title').focus();
  updateStatus();
}

// --- Context menu ---

function openMenu(el, n, x, y) {
  const menu = document.getElementById('noteMenu');
  menu.classList.remove('hidden');
  // position: clamp inside viewport
  const w = 220, h = 200;
  const px = Math.min(x, window.innerWidth - w - 10);
  const py = Math.min(y, window.innerHeight - h - 10);
  menu.style.left = `${px}px`;
  menu.style.top  = `${py}px`;
  activeNoteEl = el;
  menu.dataset.noteId = n.id;
}

function bindContextMenu() {
  const menu = document.getElementById('noteMenu');
  menu.addEventListener('click', async (e) => {
    const id = menu.dataset.noteId;
    if (!id) return;
    const n = notes.find(x => x.id === id);
    const el = activeNoteEl;
    if (e.target.matches('.swatch')) {
      const color = e.target.dataset.color;
      el.classList.remove(...COLORS); el.classList.add(color);
      await storage.notes.update({ id, color });
      n.color = color;
      menu.classList.add('hidden');
      return;
    }
    const action = e.target.dataset.action;
    if (action === 'bringFront') {
      bringToFront(el, n);
    } else if (action === 'duplicate') {
      const copy = await storage.notes.create({
        color: n.color, x: (n.x||0) + 24, y: (n.y||0) + 24,
        width: n.width, height: n.height, title: n.title, body: n.body,
      });
      notes.push(copy);
      surfaceEl().appendChild(renderNote(copy));
      updateStatus();
    } else if (action === 'delete') {
      if (confirm(t('notes.confirmDelete'))) {
        await storage.notes.delete(id);
        el.remove();
        notes = notes.filter(x => x.id !== id);
        updateStatus();
      }
    } else if (action === 'fontSize') {
      const size = e.target.dataset.size;
      el.classList.remove('font-small','font-medium','font-large');
      el.classList.add(`font-${size}`);
      await storage.notes.update({ id, font_size: size });
      n.font_size = size;
      menu.classList.add('hidden');
      return;
    }
    menu.classList.add('hidden');
  });
  document.addEventListener('click', (e) => {
    if (!menu.contains(e.target) && !e.target.classList.contains('menu-btn')) {
      menu.classList.add('hidden');
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') menu.classList.add('hidden');
  });
}

function updateStatus() {
  const status = document.getElementById('wallStatus');
  status.textContent = notes.length === 0 ? t('wall.empty') : `${notes.length}`;
}

export function refreshNotesUI() {
  updateStatus();
  document.querySelectorAll('.sticky-title').forEach(i => i.placeholder = t('notes.titlePlaceholder'));
  document.querySelectorAll('.sticky-body').forEach(i => i.placeholder = t('notes.bodyPlaceholder'));
}
