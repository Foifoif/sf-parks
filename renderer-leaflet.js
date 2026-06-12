// renderer-leaflet.js — real map base: Leaflet + OpenStreetMap tiles with the
// park boundaries, paths and POIs from the shared data model overlaid.
// Expects the global `L` from the Leaflet CDN script in index.html.
import { PARKS } from './parks-data.js';
import { FEATURE_FILL, POI_COLOR } from './svg-renderer-core.js';

const CITY_BOUNDS = [[37.702, -122.522], [37.836, -122.352]];

const uvToLatLng = (park, u, v) => [
  park.bbox.lat0 + v * (park.bbox.lat1 - park.bbox.lat0),
  park.bbox.lng0 + u * (park.bbox.lng1 - park.bbox.lng0),
];

function focusPadding() {
  // leave room for the info panel: right card on desktop, bottom sheet on mobile
  if (window.innerWidth >= 720) return { paddingTopLeft: [40, 60], paddingBottomRight: [380, 40] };
  return { paddingTopLeft: [24, 90], paddingBottomRight: [24, Math.round(window.innerHeight * 0.42)] };
}

export function createLeafletRenderer(stage, callbacks) {
  const div = document.createElement('div');
  div.className = 'leaflet-stage';
  stage.appendChild(div);

  const map = L.map(div, { zoomControl: false, zoomSnap: 0.25 });
  L.control.zoom({ position: 'bottomright' }).addTo(map);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);

  const registry = new Map();
  let mode = 'overview';
  let focusedId = null;
  let selectedPoiMarker = null;

  const PARK_STYLE = { color: '#3e7a2e', weight: 2, fillColor: '#67a84f', fillOpacity: 0.55, bubblingMouseEvents: false };
  const PARK_DIM = { fillOpacity: 0.2, weight: 1 };
  const PARK_ACTIVE = { fillOpacity: 0.25, weight: 3, color: '#2c5e1f' };

  for (const park of PARKS) {
    const poly = L.polygon(park.boundary.map(([u, v]) => uvToLatLng(park, u, v)), PARK_STYLE).addTo(map);
    poly.bindTooltip(park.name, {
      permanent: true, direction: 'center',
      className: 'lf-park-label' + (park.mustSee ? '' : ' lf-park-minor'),
    });
    poly.on('click', () => {
      focusPark(park.id);
      callbacks.onPark && callbacks.onPark(park);
    });
    registry.set(park.id, { park, poly, detail: null });
  }

  function buildDetail(entry) {
    const { park } = entry;
    const group = L.layerGroup();
    for (const f of park.features || []) {
      L.polygon(f.points.map(([u, v]) => uvToLatLng(park, u, v)), {
        color: f.type === 'lake' ? '#4d87a0' : 'transparent', weight: 1,
        fillColor: FEATURE_FILL[f.type] || '#b5d294', fillOpacity: 0.8, interactive: false,
      }).addTo(group);
    }
    for (const p of park.paths || []) {
      L.polyline(p.points.map(([u, v]) => uvToLatLng(park, u, v)), {
        color: '#a87f3f', weight: 4, opacity: 0.8, dashArray: '6 6', interactive: false,
      }).addTo(group);
    }
    (park.pois || []).forEach((poi, i) => {
      const color = POI_COLOR[poi.type] || '#c0653f';
      const m = L.circleMarker(uvToLatLng(park, ...poi.uv), {
        radius: 8, color: '#ffffff', weight: 2.5, fillColor: color, fillOpacity: 1,
        bubblingMouseEvents: false,
      }).addTo(group);
      m.bindTooltip(poi.name.replace(/\s*\(.*\)$/, ''), {
        permanent: true, direction: i % 2 === 0 ? 'top' : 'bottom',
        offset: [0, i % 2 === 0 ? -8 : 8], className: 'lf-poi-label',
      });
      m.on('click', () => {
        if (selectedPoiMarker) selectedPoiMarker.setStyle({ color: '#ffffff', weight: 2.5 });
        selectedPoiMarker = m;
        m.setStyle({ color: '#2c3a2e', weight: 3.5 });
        callbacks.onPoi && callbacks.onPoi(park, poi);
      });
    });
    return group;
  }

  function focusPark(id, animate = true) {
    const entry = registry.get(id);
    if (!entry) return;
    if (focusedId && focusedId !== id) hideDetail(focusedId);
    focusedId = id;
    mode = 'park';
    if (!entry.detail) entry.detail = buildDetail(entry);
    entry.detail.addTo(map);
    for (const [pid, e2] of registry) {
      e2.poly.setStyle(pid === id ? { ...PARK_STYLE, ...PARK_ACTIVE } : { ...PARK_STYLE, ...PARK_DIM });
      const tt = e2.poly.getTooltip();
      if (tt) tt.getElement() && tt.getElement().classList.toggle('lf-dim', pid !== id);
    }
    map.fitBounds(entry.poly.getBounds(), { ...focusPadding(), animate, duration: 0.9 });
  }
  function hideDetail(id) {
    const entry = registry.get(id);
    if (entry && entry.detail) map.removeLayer(entry.detail);
  }
  function showOverview(animate = true) {
    if (focusedId) hideDetail(focusedId);
    if (selectedPoiMarker) { selectedPoiMarker.setStyle({ color: '#ffffff', weight: 2.5 }); selectedPoiMarker = null; }
    mode = 'overview';
    focusedId = null;
    for (const [, e2] of registry) {
      e2.poly.setStyle(PARK_STYLE);
      const tt = e2.poly.getTooltip();
      if (tt && tt.getElement()) tt.getElement().classList.remove('lf-dim');
    }
    map.fitBounds(CITY_BOUNDS, { animate, duration: 0.9 });
  }
  function clearPoi() {
    if (selectedPoiMarker) { selectedPoiMarker.setStyle({ color: '#ffffff', weight: 2.5 }); selectedPoiMarker = null; }
  }

  map.on('click', () => {
    if (mode === 'park' && callbacks.onBackgroundClick) callbacks.onBackgroundClick();
  });

  function onResize() {
    map.invalidateSize();
    if (mode === 'park' && focusedId) {
      map.fitBounds(registry.get(focusedId).poly.getBounds(), { ...focusPadding(), animate: false });
    }
  }
  window.addEventListener('resize', onResize);

  showOverview(false);

  return {
    focusPark,
    showOverview,
    clearPoi,
    destroy() {
      window.removeEventListener('resize', onResize);
      map.remove();
      div.remove();
    },
  };
}
