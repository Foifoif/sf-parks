// app.js — SF Parks Explorer shell: owns UI chrome, app state, and the
// style toggle that swaps renderers. All renderers consume the same
// parks-data model and implement: focusPark(id, animate), showOverview(animate),
// clearPoi(), destroy().
import { PARKS } from './parks-data.js';
import { POI_COLOR } from './svg-renderer-core.js';
import { createIsometricRenderer } from './renderer-isometric.js';
import { createLeafletRenderer } from './renderer-leaflet.js';
import { createVoxelRenderer } from './renderer-voxel.js';

const RENDERERS = {
  iso: { create: createIsometricRenderer, label: 'Isometric' },
  map: { create: createLeafletRenderer, label: 'Real map' },
  voxel: { create: createVoxelRenderer, label: 'Voxel' },
};
const POI_LABELS = {
  entrance: 'Entrance', landmark: 'Landmark', museum: 'Museum', viewpoint: 'Viewpoint',
  nature: 'Nature', amenity: 'Amenity', beach: 'Beach', playground: 'Playground',
};
const TAG_LABELS = {
  views: 'Views', picnic: 'Picnic', beach: 'Beach', hike: 'Hiking', museums: 'Museums',
  family: 'Family', gardens: 'Gardens', history: 'History', dogs: 'Dog-friendly',
  events: 'Events', nature: 'Nature', food: 'Food nearby',
};

const stage = document.getElementById('stage');
const panel = document.getElementById('panel');
const panelBody = document.getElementById('panel-body');
const panelClose = document.getElementById('panel-close');
const backBtn = document.getElementById('back-btn');
const headerSub = document.getElementById('header-sub');
const toggleEl = document.getElementById('style-toggle');
const HEADER_HINT = `${PARKS.length} parks · tap one or browse the list`;
headerSub.textContent = HEADER_HINT;

let style = localStorage.getItem('sfparks-style');
if (!RENDERERS[style]) style = 'iso';
let renderer = null;
let mode = 'overview';
let focusedId = null;

/* ---------- panel ---------- */
let panelShowsPoi = false;
function showParkPanel(park) {
  panelShowsPoi = false;
  renderer.clearPoi();
  const tagChips = (park.tags || [])
    .map(t => `<span class="chip tag-chip">${TAG_LABELS[t] || t}</span>`)
    .join(' ');
  panelBody.innerHTML = `
    <div class="chip-row">
      ${park.mustSee ? '<span class="chip must-see-chip">★ Must-see</span>' : ''}
      <span class="chip park-chip">${park.size}</span>
      <span class="chip area-chip">${park.area || ''}</span>
    </div>
    <h2>${park.name}</h2>
    <p>${park.description}</p>
    ${tagChips ? `<div class="chip-row tags">${tagChips}</div>` : ''}
    <p class="hint">Tap a pin to learn about a spot inside the park · ${(park.pois || []).length} spots</p>`;
  panel.classList.add('open');
}
function showPoiPanel(park, poi) {
  panelShowsPoi = true;
  const c = POI_COLOR[poi.type] || '#c0653f';
  panelBody.innerHTML = `
    <div class="chip" style="background:${c}1f;color:${c}">${POI_LABELS[poi.type] || poi.type}</div>
    <h2>${poi.name}</h2>
    <p>${poi.description}</p>
    <p class="hint">in ${park.name}</p>`;
  panel.classList.add('open');
}
function closePanel() { panel.classList.remove('open'); }

/* ---------- renderer lifecycle ---------- */
const callbacks = {
  onPark(park) {
    mode = 'park';
    focusedId = park.id;
    document.body.classList.add('park-mode');
    headerSub.textContent = park.name;
    browseEl.classList.remove('open');
    browseBtn.classList.remove('open');
    showParkPanel(park);
  },
  onPoi(park, poi) { showPoiPanel(park, poi); },
  onBackgroundClick() { showExitConfirm(); },
};

/* ---------- exit confirmation ---------- */
const confirmEl = document.getElementById('confirm');
const confirmPark = document.getElementById('confirm-park');
function showExitConfirm() {
  if (mode !== 'park' || !focusedId) return;
  const park = PARKS.find(p => p.id === focusedId);
  confirmPark.textContent = park ? park.name : 'this park';
  confirmEl.hidden = false;
}
function hideExitConfirm() { confirmEl.hidden = true; }
document.getElementById('confirm-stay').addEventListener('click', hideExitConfirm);
document.getElementById('confirm-exit').addEventListener('click', () => {
  hideExitConfirm();
  backToOverview();
});
confirmEl.addEventListener('click', e => { if (e.target === confirmEl) hideExitConfirm(); });

function setStyle(s, persistView = true) {
  if (!RENDERERS[s] || (renderer && s === style)) return;
  if (renderer) renderer.destroy();
  style = s;
  localStorage.setItem('sfparks-style', s);
  renderer = RENDERERS[s].create(stage, callbacks);
  // restore the current view in the new style (style persists across transitions)
  if (persistView && mode === 'park' && focusedId) renderer.focusPark(focusedId, false);
  for (const btn of toggleEl.querySelectorAll('button')) {
    btn.classList.toggle('active', btn.dataset.style === style);
  }
}

/* ---------- chrome wiring ---------- */
for (const [key, def] of Object.entries(RENDERERS)) {
  const btn = document.createElement('button');
  btn.dataset.style = key;
  btn.textContent = def.label;
  btn.addEventListener('click', () => setStyle(key));
  toggleEl.appendChild(btn);
}

/* ---------- browse list ---------- */
const browseBtn = document.getElementById('browse-btn');
const browseEl = document.getElementById('browse');
const browseList = document.getElementById('browse-list');
const browseFilters = document.getElementById('browse-filters');
let activeTag = null;

function goToPark(park) {
  browseEl.classList.remove('open');
  browseBtn.classList.remove('open');
  renderer.focusPark(park.id);
  callbacks.onPark(park);
}

const ALL_TAGS = [...new Set(PARKS.flatMap(p => p.tags || []))];
for (const tag of ALL_TAGS) {
  const b = document.createElement('button');
  b.className = 'filter-chip';
  b.dataset.tag = tag;
  b.textContent = TAG_LABELS[tag] || tag;
  b.addEventListener('click', () => {
    activeTag = activeTag === tag ? null : tag;
    for (const x of browseFilters.children) x.classList.toggle('active', x.dataset.tag === activeTag);
    renderBrowseList();
  });
  browseFilters.appendChild(b);
}

function renderBrowseList() {
  const match = p => !activeTag || (p.tags || []).includes(activeTag);
  const must = PARKS.filter(p => p.mustSee && match(p));
  const more = PARKS.filter(p => !p.mustSee && match(p)).sort((a, b) => a.name.localeCompare(b.name));
  browseList.innerHTML = '';
  const section = (title, parks) => {
    if (!parks.length) return;
    const h = document.createElement('div');
    h.className = 'browse-section';
    h.textContent = title;
    browseList.appendChild(h);
    for (const park of parks) {
      const row = document.createElement('button');
      row.className = 'browse-row';
      row.innerHTML = `<span class="b-name">${park.mustSee ? '★ ' : ''}${park.name}</span><span class="b-area">${park.area || ''}</span>`;
      row.addEventListener('click', () => goToPark(park));
      browseList.appendChild(row);
    }
  };
  section('Must-see classics', must);
  section('More to explore', more);
  if (!must.length && !more.length) browseList.innerHTML = '<div class="browse-empty">No parks match this filter.</div>';
}
renderBrowseList();

browseBtn.addEventListener('click', () => {
  const open = browseEl.classList.toggle('open');
  browseBtn.classList.toggle('open', open);
});

function backToOverview() {
  if (mode !== 'park') return;
  mode = 'overview';
  focusedId = null;
  document.body.classList.remove('park-mode');
  headerSub.textContent = HEADER_HINT;
  closePanel();
  renderer.showOverview();
}
backBtn.addEventListener('click', backToOverview);
panelClose.addEventListener('click', () => {
  if (mode === 'park' && focusedId && panelShowsPoi) {
    const park = PARKS.find(p => p.id === focusedId);
    showParkPanel(park); // close POI popup back to park info
  } else closePanel();
});
window.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (!confirmEl.hidden) hideExitConfirm();
  else backToOverview();
});

/* ---------- boot ---------- */
const first = style;
style = null; // force setStyle to run
setStyle(first, false);
