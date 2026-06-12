// svg-renderer-core.js — shared SVG scene logic for the illustrated renderers.
// Parameterized by projection + theme so the isometric and voxel styles share
// one implementation. Consumes the renderer-agnostic parks-data model.
//
// opts:
//   makeProject(rotDeg) -> (lng,lat)=>[x,y]   rotatable projection factory
//   project              (lng,lat)=>[x,y]     fixed projection (if not rotatable)
//   iso     bool   2.5D decorations (shadows, trunks, pin stems, bridge towers)
//   voxel   bool   blocky cubes/slabs instead of soft shapes (implies iso-ish depth)
//   rotatable bool show rotate control, allow setRotation
//   background css, palette {}
import { PARKS, CITY } from './parks-data.js';

/* ============================= utilities ============================= */
const NS = 'http://www.w3.org/2000/svg';
function el(tag, attrs = {}, parent) {
  const n = document.createElementNS(NS, tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(n);
  return n;
}
const polyD = (pts, close = true) =>
  'M' + pts.map(p => `${p[0].toFixed(2)},${p[1].toFixed(2)}`).join('L') + (close ? 'Z' : '');
function smoothD(pts) {
  if (pts.length < 3) return polyD(pts, false);
  let d = `M${pts[0][0].toFixed(2)},${pts[0][1].toFixed(2)}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
    d += `Q${pts[i][0].toFixed(2)},${pts[i][1].toFixed(2)} ${mx.toFixed(2)},${my.toFixed(2)}`;
  }
  const last = pts[pts.length - 1];
  d += `L${last[0].toFixed(2)},${last[1].toFixed(2)}`;
  return d;
}
function bboxOf(pts) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}
function centroid(pts) {
  let x = 0, y = 0;
  for (const p of pts) { x += p[0]; y += p[1]; }
  return [x / pts.length, y / pts.length];
}
function inPoly(u, v, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > v) !== (yj > v) && u < ((xj - xi) * (v - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
const easeInOutCubic = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// de-collision: when two labels overlap, nudge the upper one up and the lower one down.
function decollideLabels(records) {
  for (let pass = 0; pass < 6; pass++) {
    let moved = false;
    for (let i = 0; i < records.length; i++) {
      for (let j = i + 1; j < records.length; j++) {
        const a = records[i], b = records[j];
        const ay = a.py + +a.t.getAttribute('y'), by = b.py + +b.t.getAttribute('y');
        const dx = Math.abs(a.px - b.px), dy = Math.abs(ay - by);
        const gap = Math.max(a.fs, b.fs) * 1.3;
        if (dx < (a.w + b.w) / 2 && dy < gap) {
          const need = (gap - dy) / 2 + 0.05;
          const upper = ay <= by ? a : b, lower = upper === a ? b : a;
          upper.t.setAttribute('y', +upper.t.getAttribute('y') - need);
          lower.t.setAttribute('y', +lower.t.getAttribute('y') + need);
          moved = true;
        }
      }
    }
    if (!moved) break;
  }
}

/* ============================= palette ============================= */
export const FEATURE_FILL = { lake: '#7fb6c9', marsh: '#a9c9a2', sand: '#ecd9a8', meadow: '#b5d294' };
export const POI_COLOR = {
  entrance: '#8a7f6d', landmark: '#c0653f', museum: '#9a5fa8', viewpoint: '#3f7fc0',
  nature: '#4f8a4f', amenity: '#c9962f', beach: '#c9a23f', playground: '#3f9142',
  tennis: '#2e8b8b',
};
// ground-level markers (no pin stem): playgrounds are lil green bubbles,
// tennis courts get a tiny court icon
export const GROUND_POI = new Set(['playground', 'tennis']);

/* ============================= factory ============================= */
export function createSvgRenderer(stage, callbacks, opts) {
  const { iso = true, voxel = false } = opts;
  const pal = Object.assign({
    land: '#f1e7d2', landStroke: '#d8c69e', landSide: '#cdb98c',
    marin: '#d8d4a8', marinStroke: '#c2bd8a', marinSide: '#b3ad7d',
    shadow: 'rgba(35,60,70,0.18)',
    parkFills: ['#8fbc73', '#97b97a', '#9cc47e', '#8cb878', '#98c07c', '#8caf7d'],
    parkStroke: '#5e8a4f', parkSide: '#557a40',
    treeFills: ['#4f7c3e', '#5d8f49', '#6fa055'], treeSides: ['#3a612c', '#2f5224'],
    trunk: '#7a5a38',
    pathCasing: '#caa86a', pathFill: '#efe2bd',
    bridge: '#c64f38', bridgeDark: '#a83d2a',
  }, opts.palette || {});

  let rotation = opts.initialRotation || 0;
  let proj = opts.makeProject ? opts.makeProject(rotation) : opts.project;
  const parkPoint = (park, u, v) => {
    const b = park.bbox;
    return proj(b.lng0 + u * (b.lng1 - b.lng0), b.lat0 + v * (b.lat1 - b.lat0));
  };

  const svg = el('svg', { class: 'map-svg', preserveAspectRatio: 'xMidYMid meet' });
  svg.style.background = opts.background || '#aacfdb';
  stage.appendChild(svg);
  const world = el('g', {}, svg);

  /* ---- voxel helpers ---- */
  let nx = [1, 0], ny = [0, 1]; // unit screen vectors of plan east / plan north
  function computeBasis() {
    const p0 = proj(-122.46, 37.76), pe = proj(-122.459, 37.76), pn = proj(-122.46, 37.761);
    const vx = [pe[0] - p0[0], pe[1] - p0[1]], vy = [pn[0] - p0[0], pn[1] - p0[1]];
    const lx = Math.hypot(...vx) || 1, ly = Math.hypot(...vy) || 1;
    nx = [vx[0] / lx, vx[1] / lx];
    ny = [vy[0] / ly, vy[1] / ly];
  }
  // axis-aligned (in plan space) cube whose base center sits at (x, y)
  function cube(g, x, y, s, h, top, faceL, faceR) {
    const ax = [nx[0] * s / 2, nx[1] * s / 2], ay = [ny[0] * s / 2, ny[1] * s / 2];
    const c = [
      [x - ax[0] - ay[0], y - ax[1] - ay[1]], [x + ax[0] - ay[0], y + ax[1] - ay[1]],
      [x + ax[0] + ay[0], y + ax[1] + ay[1]], [x - ax[0] + ay[0], y - ax[1] + ay[1]],
    ];
    let bi = 0;
    for (let i = 1; i < 4; i++) if (c[i][1] > c[bi][1]) bi = i;
    const b = c[bi], p = c[(bi + 3) % 4], n = c[(bi + 1) % 4];
    const t = q => [q[0], q[1] - h];
    const quad = (q1, q2, fill) => el('path', {
      d: `M${t(q1)[0].toFixed(2)},${t(q1)[1].toFixed(2)}L${t(q2)[0].toFixed(2)},${t(q2)[1].toFixed(2)}L${q2[0].toFixed(2)},${q2[1].toFixed(2)}L${q1[0].toFixed(2)},${q1[1].toFixed(2)}Z`,
      fill,
    }, g);
    quad(p, b, faceL);
    quad(b, n, faceR);
    el('path', { d: polyD(c.map(t)), fill: top }, g);
  }
  // extruded walls under a polygon's downward-facing edges
  function addWalls(g, pts, depth, fill) {
    let area2 = 0;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      area2 += a[0] * b[1] - b[0] * a[1];
    }
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      const ex = b[0] - a[0], ey = b[1] - a[1];
      const nyOut = area2 > 0 ? -ex : ex;
      if (nyOut > 0.001) {
        el('path', {
          d: `M${a[0].toFixed(2)},${a[1].toFixed(2)}L${b[0].toFixed(2)},${b[1].toFixed(2)}L${b[0].toFixed(2)},${(b[1] + depth).toFixed(2)}L${a[0].toFixed(2)},${(a[1] + depth).toFixed(2)}Z`,
          fill,
        }, g);
      }
    }
  }

  /* ---- scene state ---- */
  const registry = new Map();
  let mode = 'overview';
  let focusedId = null;
  let selectedPoiEl = null;
  let cityPts = [], marinPts = [];
  let detailG = null, labelsG = null;

  function buildScene() {
    while (world.firstChild) world.firstChild.remove();
    registry.clear();
    selectedPoiEl = null;
    if (voxel) computeBasis();

    const decorG = el('g', {}, world);
    const parksG = el('g', {}, world);
    detailG = el('g', {}, world);
    labelsG = el('g', { 'pointer-events': 'none' }, world);

    /* city landmass + Marin + bridge */
    cityPts = CITY.outline.map(([lng, lat]) => proj(lng, lat));
    marinPts = CITY.marin.map(([lng, lat]) => proj(lng, lat));
    if (voxel) {
      addWalls(decorG, cityPts, 10, pal.landSide);
      addWalls(decorG, marinPts, 10, pal.marinSide);
    } else if (iso) {
      el('path', { d: polyD(cityPts.map(([x, y]) => [x + 7, y + 11])), fill: pal.shadow }, decorG);
      el('path', { d: polyD(marinPts.map(([x, y]) => [x + 7, y + 11])), fill: pal.shadow }, decorG);
    }
    el('path', { d: polyD(cityPts), fill: pal.land, stroke: pal.landStroke, 'stroke-width': voxel ? 0 : 2 }, decorG);
    el('path', { d: polyD(marinPts), fill: pal.marin, stroke: pal.marinStroke, 'stroke-width': voxel ? 0 : 2 }, decorG);
    {
      const a = proj(...CITY.goldenGateBridge.from);
      const b = proj(...CITY.goldenGateBridge.to);
      el('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: pal.bridge, 'stroke-width': 5, 'stroke-linecap': voxel ? 'butt' : 'round' }, decorG);
      if (iso || voxel) {
        for (const t of [0.3, 0.7]) {
          const x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t;
          el('line', { x1: x, y1: y + 3, x2: x, y2: y - 16, stroke: pal.bridgeDark, 'stroke-width': 4, 'stroke-linecap': voxel ? 'butt' : 'round' }, decorG);
        }
        if (!voxel) {
          const midX = (a[0] + b[0]) / 2, midY = (a[1] + b[1]) / 2;
          el('path', { d: `M${a[0]},${a[1] - 2} Q${midX},${midY - 22} ${b[0]},${b[1] - 2}`, fill: 'none', stroke: pal.bridge, 'stroke-width': 1.6 }, decorG);
        }
      }
    }

    /* parks */
    PARKS.forEach((park, idx) => {
      const pts = park.boundary.map(([u, v]) => parkPoint(park, u, v));
      const bb = bboxOf(pts);
      const g = el('g', { class: 'park', 'data-id': park.id }, parksG);
      if (voxel) addWalls(g, pts, 4, pal.parkSide);
      else if (iso) el('path', { d: polyD(pts.map(([x, y]) => [x + 2.5, y + 4])), fill: 'rgba(40,70,45,0.25)' }, g);
      el('path', { d: polyD(pts), fill: pal.parkFills[idx % pal.parkFills.length], stroke: pal.parkStroke, 'stroke-width': voxel ? 0 : 1.4, class: 'park-shape' }, g);

      const rnd = mulberry32(hashStr(park.id));
      const area = bb.w * bb.h;
      const count = Math.max(6, Math.min(80, Math.round(area / 55)));
      const treesG = el('g', { 'pointer-events': 'none' }, g);
      let tries = 0, placed = 0;
      while (placed < count && tries < count * 14) {
        tries++;
        const u = rnd(), v = rnd();
        if (!inPoly(u, v, park.boundary)) continue;
        const [x, y] = parkPoint(park, u, v);
        const s = (0.6 + rnd() * 0.7) * Math.min(6, Math.max(1.2, Math.sqrt(area) / 16));
        const fi = Math.floor(rnd() * pal.treeFills.length);
        const fill = pal.treeFills[fi];
        if (voxel) {
          cube(treesG, x, y, s * 1.25, s * 1.15, fill, pal.treeSides[0], pal.treeSides[1]);
        } else if (iso) {
          el('ellipse', { cx: x + s * 0.35, cy: y + s * 0.3, rx: s * 0.8, ry: s * 0.35, fill: 'rgba(35,60,35,0.25)' }, treesG);
          el('line', { x1: x, y1: y, x2: x, y2: y - s * 0.9, stroke: pal.trunk, 'stroke-width': Math.max(0.5, s * 0.18) }, treesG);
          el('circle', { cx: x, cy: y - s * 1.1, r: s * 0.62, fill }, treesG);
        } else {
          el('circle', { cx: x, cy: y, r: s * 0.62, fill, stroke: 'rgba(40,70,40,0.35)', 'stroke-width': s * 0.1 }, treesG);
        }
        placed++;
      }

      const [cx, cy] = centroid(pts);
      const small = area < 700;
      const badges = [];
      if (small) {
        badges.push([el('circle', { cx, cy, r: 13, fill: 'rgba(143,188,115,0.45)', stroke: pal.parkStroke, 'stroke-width': 1.2, 'stroke-dasharray': '3 3', class: 'park-badge' }, g), 14]);
        badges.push([el('circle', { cx, cy, r: 4.5, fill: '#4f7c3e', class: 'park-badge' }, g), 5]);
      }
      const labelEl = el('text', {
        x: cx, y: small ? cy + 26 : cy + 4,
        class: 'park-label' + (park.mustSee ? '' : ' minor'),
        'text-anchor': 'middle', 'pointer-events': 'none',
      }, labelsG);
      labelEl.textContent = park.name;

      g.addEventListener('click', e => {
        e.stopPropagation();
        focusPark(park.id);
        callbacks.onPark && callbacks.onPark(park);
      });
      registry.set(park.id, { park, g, pts, bb, detail: null, labelEl, labelPos: { cx, cy, small }, badges });
    });
  }

  /* ---- lazy detail layer ---- */
  function buildDetail(entry) {
    const { park, bb } = entry;
    const dg = el('g', { class: 'detail', 'data-for': park.id }, detailG);
    const unit = Math.max(bb.w, bb.h);

    for (const f of park.features || []) {
      const fp = f.points.map(([u, v]) => parkPoint(park, u, v));
      el('path', {
        d: polyD(fp), fill: FEATURE_FILL[f.type] || '#b5d294',
        stroke: f.type === 'lake' ? '#5b94a8' : 'none', 'stroke-width': unit * 0.004,
        'pointer-events': 'none',
      }, dg);
    }
    const pathD = voxel ? pp => polyD(pp, false) : smoothD;
    for (const p of park.paths || []) {
      const pp = p.points.map(([u, v]) => parkPoint(park, u, v));
      el('path', { d: pathD(pp), fill: 'none', stroke: pal.pathCasing, 'stroke-width': unit * 0.016, 'stroke-linecap': 'round', 'pointer-events': 'none', opacity: 0.55 }, dg);
      el('path', { d: pathD(pp), fill: 'none', stroke: pal.pathFill, 'stroke-width': unit * 0.009, 'stroke-linecap': 'round', 'pointer-events': 'none' }, dg);
    }
    const tv = parkVB(entry);
    const pxPerUnit = Math.min(svg.clientWidth / tv.w, svg.clientHeight / tv.h) || 1;
    const ms = 11 / pxPerUnit;
    const fsPx = 13 / pxPerUnit;

    const placedPois = (park.pois || []).map(poi => ({ poi, pt: parkPoint(park, ...poi.uv) }));
    const xOrder = [...placedPois].sort((a, b) => a.pt[0] - b.pt[0]);
    const sideOf = new Map(xOrder.map((p, i) => [p.poi.id, i % 2 === 1]));
    const labelRecords = [];
    for (const { poi, pt: [x, y] } of placedPois) {
      const color = POI_COLOR[poi.type] || '#c0653f';
      const ground = GROUND_POI.has(poi.type);
      const pg = el('g', { class: 'poi', 'data-poi': poi.id, transform: `translate(${x},${y})` }, dg);
      if (ground && poi.type === 'playground') {
        // small green bubble cluster
        if (iso || voxel) el('ellipse', { cx: ms * 0.12, cy: ms * 0.28, rx: ms * 0.7, ry: ms * 0.26, fill: 'rgba(40,40,40,0.22)' }, pg);
        el('circle', { cx: 0, cy: 0, r: ms * 0.52, fill: color, stroke: '#fff8ec', 'stroke-width': ms * 0.12, class: 'poi-head' }, pg);
        el('circle', { cx: ms * 0.58, cy: ms * 0.2, r: ms * 0.3, fill: color, stroke: '#fff8ec', 'stroke-width': ms * 0.1, class: 'poi-head' }, pg);
        el('circle', { cx: -ms * 0.52, cy: ms * 0.24, r: ms * 0.24, fill: color, stroke: '#fff8ec', 'stroke-width': ms * 0.1, class: 'poi-head' }, pg);
        el('circle', { cx: 0, cy: 0, r: ms * 1.3, fill: 'transparent' }, pg);
      } else if (ground) {
        // tiny tennis court
        const cw = ms * 1.5, ch = ms * 0.95;
        if (iso || voxel) el('ellipse', { cx: ms * 0.1, cy: ms * 0.3, rx: cw * 0.55, ry: ms * 0.26, fill: 'rgba(40,40,40,0.22)' }, pg);
        el('rect', { x: -cw / 2, y: -ch / 2, width: cw, height: ch, rx: ms * 0.1, fill: color, stroke: '#fff8ec', 'stroke-width': ms * 0.12, class: 'poi-head' }, pg);
        el('line', { x1: 0, y1: -ch / 2 + ms * 0.08, x2: 0, y2: ch / 2 - ms * 0.08, stroke: '#fff8ec', 'stroke-width': ms * 0.09 }, pg);
        el('circle', { cx: 0, cy: 0, r: ms * 1.3, fill: 'transparent' }, pg);
      } else if (voxel) {
        el('line', { x1: 0, y1: 0, x2: 0, y2: -ms * 1.5, stroke: color, 'stroke-width': ms * 0.24 }, pg);
        el('rect', { x: -ms * 0.6, y: -ms * 2.52, width: ms * 1.2, height: ms * 1.2, fill: color, stroke: '#fff8ec', 'stroke-width': ms * 0.14, class: 'poi-head' }, pg);
        el('circle', { cx: 0, cy: -ms * 1.4, r: ms * 1.5, fill: 'transparent' }, pg);
      } else if (iso) {
        el('ellipse', { cx: 0, cy: 0, rx: ms * 0.55, ry: ms * 0.24, fill: 'rgba(40,40,40,0.3)' }, pg);
        el('line', { x1: 0, y1: 0, x2: 0, y2: -ms * 1.5, stroke: color, 'stroke-width': ms * 0.22 }, pg);
        el('circle', { cx: 0, cy: -ms * 1.9, r: ms * 0.62, fill: color, stroke: '#fff8ec', 'stroke-width': ms * 0.14, class: 'poi-head' }, pg);
        el('circle', { cx: 0, cy: -ms * 1.4, r: ms * 1.5, fill: 'transparent' }, pg);
      } else {
        el('circle', { cx: 0, cy: 0, r: ms * 0.62, fill: color, stroke: '#ffffff', 'stroke-width': ms * 0.18, class: 'poi-head' }, pg);
        el('circle', { cx: 0, cy: 0, r: ms * 1.4, fill: 'transparent' }, pg);
      }
      const below = sideOf.get(poi.id);
      const baseY = ground
        ? (below ? ms * 1.7 : -ms * 1.2)
        : (iso || voxel) ? (below ? ms * 1.3 : -ms * 3.0) : (below ? ms * 1.7 : -ms * 1.2);
      const label = poi.name.replace(/\s*\(.*\)$/, '');
      const t = el('text', { x: 0, y: baseY, 'text-anchor': 'middle', class: 'poi-label', 'pointer-events': 'none' }, pg);
      t.textContent = label;
      t.setAttribute('font-size', fsPx);
      labelRecords.push({ t, px: x, py: y, fs: fsPx, w: label.length * fsPx * 0.56, below });
      pg.addEventListener('click', e => {
        e.stopPropagation();
        selectPoi(pg);
        callbacks.onPoi && callbacks.onPoi(park, poi);
      });
    }
    decollideLabels(labelRecords);
    dg.style.display = 'none';
    return dg;
  }

  /* ---- camera ---- */
  let vb = { x: 0, y: 0, w: 100, h: 100 };
  let animId = null;
  function setVB(o) {
    vb = o;
    svg.setAttribute('viewBox', `${o.x.toFixed(2)} ${o.y.toFixed(2)} ${o.w.toFixed(2)} ${o.h.toFixed(2)}`);
  }
  function tweenVB(to, dur = 950) {
    if (animId) cancelAnimationFrame(animId);
    const from = { ...vb };
    const t0 = performance.now();
    function step(now) {
      const t = Math.min(1, (now - t0) / dur);
      const k = easeInOutCubic(t);
      setVB({
        x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k,
        w: from.w + (to.w - from.w) * k, h: from.h + (to.h - from.h) * k,
      });
      if (t < 1) animId = requestAnimationFrame(step);
      else animId = null;
    }
    animId = requestAnimationFrame(step);
  }
  function overviewVB() {
    const all = bboxOf([...cityPts, ...marinPts]);
    const pad = Math.max(all.w, all.h) * 0.07;
    return { x: all.x - pad, y: all.y - pad, w: all.w + pad * 2, h: all.h + pad * 2 };
  }
  function parkVB(entry) {
    const { bb } = entry;
    const pad = Math.max(bb.w, bb.h) * 0.1 + Math.min(bb.w, bb.h) * 0.45;
    let x = bb.x - pad, y = bb.y - pad, w = bb.w + pad * 2, h = bb.h + pad * 2;
    if (window.innerWidth >= 720) w *= 1.55;
    else h *= 1.75;
    return { x, y, w, h };
  }

  /* ---- modes ---- */
  function focusPark(id, animate = true) {
    const entry = registry.get(id);
    if (!entry) return;
    if (focusedId && focusedId !== id) hideDetail(focusedId);
    focusedId = id;
    mode = 'park';
    if (!entry.detail) entry.detail = buildDetail(entry);
    entry.detail.style.display = '';
    requestAnimationFrame(() => entry.detail.classList.add('visible'));
    svg.classList.add('focused');
    for (const [pid, e2] of registry) e2.g.classList.toggle('active', pid === id);
    if (animate) tweenVB(parkVB(entry));
    else setVB(parkVB(entry));
  }
  function hideDetail(id) {
    const entry = registry.get(id);
    if (entry && entry.detail) {
      entry.detail.classList.remove('visible');
      entry.detail.style.display = 'none';
    }
  }
  function showOverview(animate = true) {
    if (focusedId) hideDetail(focusedId);
    if (selectedPoiEl) { selectedPoiEl.classList.remove('selected'); selectedPoiEl = null; }
    mode = 'overview';
    focusedId = null;
    svg.classList.remove('focused');
    for (const [, e2] of registry) e2.g.classList.remove('active');
    if (animate) tweenVB(overviewVB());
    else setVB(overviewVB());
  }
  function selectPoi(pg) {
    if (selectedPoiEl) selectedPoiEl.classList.remove('selected');
    selectedPoiEl = pg;
    pg.classList.add('selected');
  }
  function clearPoi() {
    if (selectedPoiEl) { selectedPoiEl.classList.remove('selected'); selectedPoiEl = null; }
  }

  /* ---- rotation ---- */
  function setRotation(deg) {
    if (!opts.makeProject) return;
    rotation = deg;
    proj = opts.makeProject(rotation);
    const wasFocused = mode === 'park' ? focusedId : null;
    buildScene();
    updateOverviewScale();
    if (wasFocused) focusPark(wasFocused, false);
    else setVB(overviewVB());
  }
  let rotateCtl = null;
  if (opts.rotatable && opts.makeProject) {
    rotateCtl = document.createElement('div');
    rotateCtl.className = 'rotate-ctl';
    const mk = (txt, d, label) => {
      const b = document.createElement('button');
      b.textContent = txt;
      b.title = label;
      b.setAttribute('aria-label', label);
      b.addEventListener('click', () => setRotation(rotation + d));
      rotateCtl.appendChild(b);
    };
    mk('⟲', -15, 'Rotate left');
    mk('⟳', 15, 'Rotate right');
    stage.appendChild(rotateCtl);
  }

  /* ---- drag to pan ---- */
  let dragPointer = null, dragMoved = false, dragFrom = null, dragOrigin = null;
  svg.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    dragPointer = e.pointerId;
    dragMoved = false;
    dragFrom = [e.clientX, e.clientY];
    dragOrigin = { ...vb };
  });
  svg.addEventListener('pointermove', e => {
    if (dragPointer === null || e.pointerId !== dragPointer) return;
    const dx = e.clientX - dragFrom[0], dy = e.clientY - dragFrom[1];
    if (!dragMoved) {
      if (Math.hypot(dx, dy) < 5) return; // still a click, not a drag
      dragMoved = true;
      if (animId) { cancelAnimationFrame(animId); animId = null; }
      try { svg.setPointerCapture(dragPointer); } catch (_) { /* pointer gone */ }
      svg.classList.add('dragging');
    }
    const upp = Math.max(dragOrigin.w / (svg.clientWidth || 1), dragOrigin.h / (svg.clientHeight || 1));
    setVB({ x: dragOrigin.x - dx * upp, y: dragOrigin.y - dy * upp, w: dragOrigin.w, h: dragOrigin.h });
  });
  function endDrag(e) {
    if (dragPointer === null || (e && e.pointerId !== dragPointer)) return;
    dragPointer = null;
    svg.classList.remove('dragging');
    // dragMoved stays true until the synthetic click fires, so we can swallow it
  }
  svg.addEventListener('pointerup', endDrag);
  svg.addEventListener('pointercancel', endDrag);
  // swallow the click that follows a drag so it doesn't select a park / exit the view
  svg.addEventListener('click', e => {
    if (dragMoved) { e.stopImmediatePropagation(); e.preventDefault(); dragMoved = false; }
  }, true);

  /* ---- background click (exit prompt) ---- */
  svg.addEventListener('click', () => {
    if (mode === 'park' && callbacks.onBackgroundClick) callbacks.onBackgroundClick();
  });

  /* ---- overview label/badge scaling ---- */
  function updateOverviewScale() {
    const o = overviewVB();
    const k = Math.min(svg.clientWidth / o.w, svg.clientHeight / o.h) || 1;
    const records = [];
    for (const [, entry] of registry) {
      const major = !!entry.park.mustSee;
      const fs = (major ? 13 : 9) / k;
      entry.labelEl.setAttribute('font-size', fs);
      const { cx, cy, small } = entry.labelPos;
      entry.labelEl.setAttribute('y', small ? cy + (major ? 24 : 17) / k : cy + 4 / k);
      const badgeScale = major ? 1 : 0.72;
      for (const [c, basePx] of entry.badges) c.setAttribute('r', (basePx * badgeScale) / k);
      records.push({ t: entry.labelEl, px: cx, py: 0, fs, w: entry.park.name.length * fs * 0.6 });
    }
    decollideLabels(records);
  }

  function onResize() {
    updateOverviewScale();
    if (mode === 'park' && focusedId) {
      const entry = registry.get(focusedId);
      if (entry.detail) { entry.detail.remove(); entry.detail = null; }
      entry.detail = buildDetail(entry);
      entry.detail.style.display = '';
      entry.detail.classList.add('visible');
      setVB(parkVB(entry));
    } else setVB(overviewVB());
  }
  window.addEventListener('resize', onResize);

  buildScene();
  updateOverviewScale();
  setVB(overviewVB());

  return {
    focusPark,
    showOverview,
    clearPoi,
    destroy() {
      if (animId) cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
      if (rotateCtl) rotateCtl.remove();
      svg.remove();
    },
  };
}
