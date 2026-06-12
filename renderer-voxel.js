// renderer-voxel.js — blocky voxel style: extruded land/park slabs, cube
// trees and square pins over the same rotatable axonometric plan.
import { createSvgRenderer } from './svg-renderer-core.js';

const BASE_ROT = -30;
const SQUASH = 0.55;
const COS = Math.cos((37.77 * Math.PI) / 180);
const SCALE = 8000;
const REF = { lng: -122.44, lat: 37.77 };

function makeProject(rotDeg, squash = SQUASH) {
  const rot = ((BASE_ROT + rotDeg) * Math.PI) / 180;
  const CR = Math.cos(rot), SR = Math.sin(rot);
  return (lng, lat) => {
    const px = (lng - REF.lng) * COS * SCALE;
    const py = (REF.lat - lat) * SCALE;
    return [px * CR - py * SR, (px * SR + py * CR) * squash];
  };
}

export function createVoxelRenderer(stage, callbacks) {
  return createSvgRenderer(stage, callbacks, {
    makeProject,
    baseTilt: SQUASH,
    iso: true,
    voxel: true,
    rotatable: true,
    marin: false, // open water above the Golden Gate
    background: 'linear-gradient(180deg, #6fb0c6 0%, #5b9cb4 100%)',
    palette: {
      land: '#ecdfb4', landSide: '#c6b183',
      marin: '#d9d3a0', marinSide: '#b0a877',
      parkFills: ['#6cb04e', '#76b657', '#63a847', '#7fbb60', '#70b252', '#5fa343'],
      parkStroke: '#4a7c36', parkSide: '#487534',
      treeFills: ['#3f7a2e', '#4c8a39', '#5c9a46'], treeSides: ['#2e5c21', '#244c19'],
      pathCasing: '#c2a05e', pathFill: '#f2e3b6',
      bridge: '#d9543a', bridgeDark: '#a83d2a',
    },
  });
}
