// renderer-isometric.js — 2.5D illustrated style: equirectangular plan rotated
// and y-squashed, with drop shadows, tree trunks and pin stems for depth.
// Rotatable: the user rotation is added to the base -18° plan rotation.
import { createSvgRenderer } from './svg-renderer-core.js';

const BASE_ROT = -18;
const SQUASH = 0.6;
const COS = Math.cos((37.77 * Math.PI) / 180);
const SCALE = 8000;
const REF = { lng: -122.44, lat: 37.77 };

function makeProject(rotDeg) {
  const rot = ((BASE_ROT + rotDeg) * Math.PI) / 180;
  const CR = Math.cos(rot), SR = Math.sin(rot);
  return (lng, lat) => {
    const px = (lng - REF.lng) * COS * SCALE;
    const py = (REF.lat - lat) * SCALE;
    return [px * CR - py * SR, (px * SR + py * CR) * SQUASH];
  };
}

export function createIsometricRenderer(stage, callbacks) {
  return createSvgRenderer(stage, callbacks, {
    makeProject,
    iso: true,
    rotatable: true,
    background: 'radial-gradient(120% 90% at 30% 20%, #bcdce6 0%, #aacfdb 55%, #93bfce 100%)',
  });
}
