import { S, A4W } from './state.js';

export const NS = 'http://www.w3.org/2000/svg';
export const svg          = document.getElementById('svg-canvas');
export const layerShapes  = document.getElementById('layer-shapes');
export const layerPreview = document.getElementById('layer-preview');
export const layerSel     = document.getElementById('layer-sel');
export const layerParts   = document.getElementById('layer-parts');

export function el(tag, attrs = {}, parent = null) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (parent) parent.appendChild(e);
  return e;
}

export function zoom() { return svg.clientWidth / S.vb.w; }

export function toMM(cx, cy) {
  const r = svg.getBoundingClientRect();
  return {
    x: S.vb.x + (cx - r.left) / r.width  * S.vb.w,
    y: S.vb.y + (cy - r.top)  / r.height * S.vb.h,
  };
}

export function applyVb() {
  svg.setAttribute('viewBox', `${S.vb.x} ${S.vb.y} ${S.vb.w} ${S.vb.h}`);
  const z = Math.round(A4W / S.vb.w * 100);
  document.getElementById('st-zoom').textContent = `ズーム: ${z}%`;
}

export function applyBgColor() {
  document.getElementById('page').setAttribute('fill', S.bgColor);
}

export function applyGrid() {
  const gridEl = document.getElementById('grid');
  if (gridEl) gridEl.style.display = S.showGrid ? '' : 'none';
  const btn = document.getElementById('btn-grid');
  if (btn) btn.classList.toggle('active', S.showGrid);
}
