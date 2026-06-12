// renderer-flat.js — flat illustrated vector style (clean 2D poster map, north up).
// Thin wrapper around the shared SVG core with a plain equirectangular projection.
import { createSvgRenderer } from './svg-renderer-core.js';

const COS = Math.cos((37.77 * Math.PI) / 180);
const SCALE = 8000;
const REF = { lng: -122.44, lat: 37.77 };

function project(lng, lat) {
  return [(lng - REF.lng) * COS * SCALE, (REF.lat - lat) * SCALE];
}

export function createFlatRenderer(stage, callbacks) {
  return createSvgRenderer(stage, callbacks, {
    project,
    iso: false,
    background: 'linear-gradient(180deg, #cfe7ee 0%, #b7d9e4 100%)',
    palette: {
      land: '#f9f3e3', landStroke: '#e3d2a9',
      marin: '#e4e0b8', marinStroke: '#cfc996',
      parkFills: ['#7db95e', '#86bd68', '#79b561', '#8cc06e', '#82ba64', '#76b25c'],
      parkStroke: '#4e8a3c',
      treeFills: ['#54923f', '#62a04b', '#4a8538'],
      pathCasing: '#d3b176', pathFill: '#fdf3d3',
      bridge: '#d9543a',
    },
  });
}
