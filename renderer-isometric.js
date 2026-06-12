// renderer-isometric.js — isometric illustrated style (2.5D hand-drawn feel).
// Thin wrapper around the shared SVG core with a rotated + squashed projection.
import { createSvgRenderer } from './svg-renderer-core.js';

const COS = Math.cos((37.77 * Math.PI) / 180);
const SCALE = 8000;
const REF = { lng: -122.44, lat: 37.77 };
const ROT = (-18 * Math.PI) / 180;
const SQUASH = 0.6;
const CR = Math.cos(ROT), SR = Math.sin(ROT);

function project(lng, lat) {
  const px = (lng - REF.lng) * COS * SCALE;
  const py = (REF.lat - lat) * SCALE;
  return [px * CR - py * SR, (px * SR + py * CR) * SQUASH];
}

export function createIsometricRenderer(stage, callbacks) {
  return createSvgRenderer(stage, callbacks, {
    project,
    iso: true,
    background: 'radial-gradient(120% 90% at 30% 20%, #bcdce6 0%, #aacfdb 55%, #93bfce 100%)',
  });
}
