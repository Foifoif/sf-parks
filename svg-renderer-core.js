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
import { PARKS, CITY, PARK_ELEVATION } from './parks-data.js';

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
// ground-level markers (no pin stem): tennis courts get a tiny court icon.
// Playgrounds render as normal pins (just green).
export const GROUND_POI = new Set(['tennis']);

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
  const baseTilt = opts.baseTilt || 0.6;
  let tilt = baseTilt; // y-squash: smaller = more oblique ("look underneath"), 1 = top-down
  let heightK = 1; // extrusion-height multiplier derived from tilt
  function computeHeightK() {
    heightK = Math.min(2.2, Math.max(0.06, (1 - tilt) / (1 - baseTilt)));
  }
  computeHeightK();
  let proj = opts.makeProject ? opts.makeProject(rotation, tilt) : opts.project;
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

  /* ---- decorative ocean life (illustrated style) ---- */
  function addSeaLife(g) {
    const sg = el('g', { class: 'sea-life', 'pointer-events': 'none' }, g);
    // outer g carries the position (attribute transform), inner g carries the
    // CSS bob animation so the two transforms don't clobber each other
    const placed = (lng, lat, s, cls = 'bob') => {
      const [x, y] = proj(lng, lat);
      const og = el('g', { transform: `translate(${x.toFixed(1)},${y.toFixed(1)}) scale(${s})` }, sg);
      return el('g', { class: cls }, og);
    };
    /* waves */
    const WAVES = [
      [-122.532, 37.762], [-122.547, 37.792], [-122.522, 37.728], [-122.553, 37.718],
      [-122.515, 37.81], [-122.468, 37.827], [-122.49, 37.846], [-122.44, 37.852],
      [-122.395, 37.838], [-122.355, 37.8], [-122.358, 37.755], [-122.372, 37.72],
      [-122.542, 37.842], [-122.341, 37.772],
    ];
    WAVES.forEach(([lng, lat], i) => {
      const [x, y] = proj(lng, lat);
      const s = 9 + (i % 3) * 3;
      el('path', {
        d: `M${(x - s).toFixed(1)},${y.toFixed(1)} q${s * 0.5},${-s * 0.45} ${s},0 q${s * 0.5},${s * 0.45} ${s},0`,
        fill: 'none', stroke: 'rgba(255,255,255,0.5)', 'stroke-width': 2,
        'stroke-linecap': 'round', class: 'wave', style: `animation-delay:${(i % 5) * -0.9}s`,
      }, sg);
    });
    /* sea lions hauled out on a rock */
    const seaLionRock = (lng, lat, s) => {
      const rg = placed(lng, lat, s);
      el('ellipse', { cx: 0, cy: 0.35, rx: 2.4, ry: 0.9, fill: '#9aa3a8' }, rg);
      el('ellipse', { cx: -0.5, cy: 0.05, rx: 1.4, ry: 0.5, fill: '#aab3b8' }, rg);
      const lion = (ox, oy, flip) => {
        const lg = el('g', { transform: `translate(${ox},${oy}) scale(${flip ? -1 : 1},1)` }, rg);
        el('ellipse', { cx: 0, cy: 0, rx: 1.15, ry: 0.5, fill: '#7c5a40' }, lg);
        el('path', { d: 'M0.75,-0.25 Q1.15,-1.05 1.6,-0.65 Q1.7,-0.25 1.2,-0.05Z', fill: '#7c5a40' }, lg);
        el('circle', { cx: 1.45, cy: -0.62, r: 0.09, fill: '#3a2a1c' }, lg);
        el('path', { d: 'M-1.05,-0.1 Q-1.7,-0.65 -1.95,-0.1 Q-1.55,0.35 -1.0,0.25Z', fill: '#6b4c35' }, lg);
      };
      lion(-0.7, -0.5, false);
      lion(0.85, -0.32, true);
    };
    seaLionRock(-122.5175, 37.7815, 4.5); // Seal Rocks, off Lands End
    seaLionRock(-122.4085, 37.8135, 4);   // Pier 39
    /* crabs */
    const crab = (lng, lat, s) => {
      const cg = placed(lng, lat, s);
      for (const side of [-1, 1]) {
        el('circle', { cx: side * 1.2, cy: -0.55, r: 0.42, fill: '#c95b3f' }, cg);
        for (const ly of [-0.05, 0.3, 0.6]) {
          el('line', { x1: side * 0.7, y1: ly, x2: side * 1.45, y2: ly + 0.35, stroke: '#c95b3f', 'stroke-width': 0.16 }, cg);
        }
      }
      el('ellipse', { cx: 0, cy: 0, rx: 0.95, ry: 0.7, fill: '#d96a4b' }, cg);
      el('circle', { cx: -0.28, cy: -0.32, r: 0.1, fill: '#5a2d1e' }, cg);
      el('circle', { cx: 0.28, cy: -0.32, r: 0.1, fill: '#5a2d1e' }, cg);
    };
    crab(-122.537, 37.748, 3.2); // Dungeness grounds off Ocean Beach
    crab(-122.419, 37.822, 2.8); // Fisherman's Wharf
    /* urchins */
    const urchin = (lng, lat, s) => {
      const ug = placed(lng, lat, s);
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        el('line', { x1: 0, y1: 0, x2: (Math.cos(a) * 1.05).toFixed(2), y2: (Math.sin(a) * 1.05).toFixed(2), stroke: '#5a3e8a', 'stroke-width': 0.15 }, ug);
      }
      el('circle', { cx: 0, cy: 0, r: 0.62, fill: '#6b4a9e' }, ug);
    };
    urchin(-122.528, 37.771, 2.6); // tide pools below Lands End
    urchin(-122.525, 37.706, 2.4); // south Ocean Beach
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
    const showMarin = opts.marin !== false;
    marinPts = showMarin ? CITY.marin.map(([lng, lat]) => proj(lng, lat)) : [];
    if (voxel) {
      addWalls(decorG, cityPts, 10 * heightK, pal.landSide);
      if (showMarin) addWalls(decorG, marinPts, 10 * heightK, pal.marinSide);
    } else if (iso) {
      el('path', { d: polyD(cityPts.map(([x, y]) => [x + 7, y + 11])), fill: pal.shadow }, decorG);
      if (showMarin) el('path', { d: polyD(marinPts.map(([x, y]) => [x + 7, y + 11])), fill: pal.shadow }, decorG);
    }
    el('path', { d: polyD(cityPts), fill: pal.land, stroke: pal.landStroke, 'stroke-width': voxel ? 0 : 2 }, decorG);
    if (showMarin) el('path', { d: polyD(marinPts), fill: pal.marin, stroke: pal.marinStroke, 'stroke-width': voxel ? 0 : 2 }, decorG);
    if (opts.seaLife) addSeaLife(decorG);
    {
      const a = proj(...CITY.goldenGateBridge.from);
      const b = proj(...CITY.goldenGateBridge.to);
      el('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: pal.bridge, 'stroke-width': 5, 'stroke-linecap': voxel ? 'butt' : 'round' }, decorG);
      if (iso || voxel) {
        for (const t of [0.3, 0.7]) {
          const x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t;
          el('line', { x1: x, y1: y + 3, x2: x, y2: y - 16 * heightK, stroke: pal.bridgeDark, 'stroke-width': 4, 'stroke-linecap': voxel ? 'butt' : 'round' }, decorG);
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
      // voxel: extrude each park to its real-world elevation (stepped terrain look)
      const elevH = voxel ? (PARK_ELEVATION[park.id] || 0) * 0.075 * heightK : 0;
      const topPts = elevH ? pts.map(([x, y]) => [x, y - elevH]) : pts;
      const g = el('g', { class: 'park', 'data-id': park.id }, parksG);
      if (voxel) addWalls(g, topPts, elevH + 4 * heightK, pal.parkSide);
      else if (iso) el('path', { d: polyD(pts.map(([x, y]) => [x + 2.5, y + 4])), fill: 'rgba(40,70,45,0.25)' }, g);
      el('path', { d: polyD(topPts), fill: pal.parkFills[idx % pal.parkFills.length], stroke: pal.parkStroke, 'stroke-width': voxel ? 0 : 1.4, class: 'park-shape' }, g);

      const area = bb.w * bb.h;
      if (!voxel) { // voxel overview shows clean elevation instead of tree blocks
        const rnd = mulberry32(hashStr(park.id));
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
          if (iso) {
            el('ellipse', { cx: x + s * 0.35, cy: y + s * 0.3, rx: s * 0.8, ry: s * 0.35, fill: 'rgba(35,60,35,0.25)' }, treesG);
            el('line', { x1: x, y1: y, x2: x, y2: y - s * 0.9 * heightK, stroke: pal.trunk, 'stroke-width': Math.max(0.5, s * 0.18) }, treesG);
            el('circle', { cx: x, cy: y - s * 1.1 * heightK, r: s * 0.62, fill }, treesG);
          } else {
            el('circle', { cx: x, cy: y, r: s * 0.62, fill, stroke: 'rgba(40,70,40,0.35)', 'stroke-width': s * 0.1 }, treesG);
          }
          placed++;
        }
      }

      const [cx, cy] = centroid(topPts);
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
      registry.set(park.id, { park, g, pts, bb, elevH, detail: null, labelEl, labelPos: { cx, cy, small }, badges });
    });
  }

  /* ---- lazy detail layer ---- */
  function buildDetail(entry) {
    const { park, bb } = entry;
    const dg = el('g', { class: 'detail', 'data-for': park.id }, detailG);
    // voxel: lift the detail layer onto the park's elevated top face
    if (entry.elevH) dg.setAttribute('transform', `translate(0 ${-entry.elevH})`);
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
      if (ground) {
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
    if (entry.elevH) { y -= entry.elevH; h += entry.elevH; }
    if (window.innerWidth >= 720) w *= 1.55;
    else h *= 1.75;
    return { x, y, w, h };
  }
  /* gentle zoom around the center of the current view */
  let zoom = 1;
  function baseVB() {
    if (mode === 'park' && focusedId && registry.has(focusedId)) return parkVB(registry.get(focusedId));
    return overviewVB();
  }
  function zoomedVB(b) {
    if (zoom === 1) return b;
    const w = b.w / zoom, h = b.h / zoom;
    return { x: b.x + (b.w - w) / 2, y: b.y + (b.h - h) / 2, w, h };
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
    if (animate) zoom = 1;
    if (animate) tweenVB(zoomedVB(parkVB(entry)));
    else setVB(zoomedVB(parkVB(entry)));
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
    if (animate) zoom = 1;
    if (animate) tweenVB(zoomedVB(overviewVB()));
    else setVB(zoomedVB(overviewVB()));
  }
  function selectPoi(pg) {
    if (selectedPoiEl) selectedPoiEl.classList.remove('selected');
    selectedPoiEl = pg;
    pg.classList.add('selected');
  }
  function clearPoi() {
    if (selectedPoiEl) { selectedPoiEl.classList.remove('selected'); selectedPoiEl = null; }
  }

  /* ---- rotation + tilt ---- */
  function applyView(rot, t) {
    if (!opts.makeProject) return;
    rotation = rot;
    tilt = Math.min(0.95, Math.max(0.22, t));
    computeHeightK();
    proj = opts.makeProject(rotation, tilt);
    const wasFocused = mode === 'park' ? focusedId : null;
    buildScene();
    updateOverviewScale();
    if (wasFocused) focusPark(wasFocused, false);
    else setVB(zoomedVB(overviewVB()));
  }
  const setRotation = deg => applyView(deg, tilt);
  // rAF-throttled rebuild so orbit-dragging stays smooth
  let pendingView = null;
  function requestView(rot, t) {
    const scheduled = !!pendingView;
    pendingView = [rot, t];
    if (scheduled) return;
    requestAnimationFrame(() => {
      const [r, tt] = pendingView;
      pendingView = null;
      applyView(r, tt);
    });
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

  /* ---- turntable camera ----
     The city sits on an axle at its center: dragging spins it (horizontal →
     rotation, vertical → tilt), the wheel / pinch zooms a little. No panning —
     the camera always stays centered on the city (or the focused park). */
  const dist2 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const pointers = new Map(); // pointerId -> [x, y]
  let orbit = null; // { id, x, y } active spin pointer
  let pinch = null; // { d0, z0 } two-finger zoom
  let dragMoved = false; // swallow the click that follows a gesture
  svg.addEventListener('contextmenu', e => e.preventDefault());
  svg.addEventListener('pointerdown', e => {
    pointers.set(e.pointerId, [e.clientX, e.clientY]);
    if (pointers.size === 2 && opts.makeProject) {
      const [a, b] = [...pointers.values()];
      pinch = { d0: Math.max(20, dist2(a, b)), z0: zoom };
      orbit = null;
      dragMoved = true;
      return;
    }
    if (e.pointerType === 'mouse' && e.button !== 0 && e.button !== 2) return;
    if (!opts.makeProject) return;
    orbit = { id: e.pointerId, x: e.clientX, y: e.clientY, rot: rotation, tilt };
    dragMoved = false;
  });
  svg.addEventListener('pointermove', e => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, [e.clientX, e.clientY]);
    if (pinch) {
      const [a, b] = [...pointers.values()];
      zoom = Math.min(2.2, Math.max(0.75, pinch.z0 * (dist2(a, b) / pinch.d0)));
      if (animId) { cancelAnimationFrame(animId); animId = null; }
      setVB(zoomedVB(baseVB()));
      return;
    }
    if (!orbit || e.pointerId !== orbit.id) return;
    const dx = e.clientX - orbit.x, dy = e.clientY - orbit.y;
    if (!dragMoved) {
      if (Math.hypot(dx, dy) < 5) return; // still a click, not a spin
      dragMoved = true;
      if (animId) { cancelAnimationFrame(animId); animId = null; }
      try { svg.setPointerCapture(orbit.id); } catch (_) { /* pointer gone */ }
      svg.classList.add('dragging');
    }
    orbit.x = e.clientX; orbit.y = e.clientY;
    orbit.rot += dx * 0.3;
    orbit.tilt = Math.min(0.95, Math.max(0.22, orbit.tilt + dy * 0.0045));
    requestView(orbit.rot, orbit.tilt);
  });
  function endDrag(e) {
    if (e) pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = null;
    if (orbit && e && e.pointerId === orbit.id) orbit = null;
    if (!orbit) svg.classList.remove('dragging');
    // dragMoved stays true until the synthetic click fires, so we can swallow it
  }
  svg.addEventListener('pointerup', endDrag);
  svg.addEventListener('pointercancel', endDrag);
  svg.addEventListener('wheel', e => {
    e.preventDefault();
    zoom = Math.min(2.2, Math.max(0.75, zoom * Math.exp(-e.deltaY * 0.0014)));
    if (animId) { cancelAnimationFrame(animId); animId = null; }
    setVB(zoomedVB(baseVB()));
  }, { passive: false });
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
      setVB(zoomedVB(parkVB(entry)));
    } else setVB(zoomedVB(overviewVB()));
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
