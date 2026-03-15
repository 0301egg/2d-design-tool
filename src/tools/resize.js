import { S, sn, fmt, findShape, findGroup, goldenCheck, fmt2 } from '../state.js';
import { toMM } from '../canvas.js';
import { selectionBbox } from '../geometry.js';
import { renderShapes, renderSelection } from '../render.js';
import { persist } from '../persist.js';
import { updatePanelCoords } from '../panel.js';

export function startResize(handle, e) {
  S.isResize = true;
  S.resizeHandle = handle;
  S.dragP0 = toMM(e.clientX, e.clientY);
  const b = selectionBbox();
  S.resizeBbox0 = { ...b };
  S.resizeShapes0 = [];
  const shallowCopy = (s) => {
    const c = { ...s };
    if (s.type === 'path' && s.pts) c.pts = s.pts.map(pt => ({ ...pt }));
    return c;
  };
  const collectShapes = (id) => {
    const sh = findShape(id);
    if (sh) { S.resizeShapes0.push(shallowCopy(sh)); return; }
    const g = findGroup(id);
    if (g) g.shapeIds.forEach(sid => { const s = findShape(sid); if (s) S.resizeShapes0.push(shallowCopy(s)); });
  };
  S.selected.forEach(collectShapes);
}

export function updateResize(p) {
  if (!S.isResize) return;
  const b0 = S.resizeBbox0;
  const dx = p.x - S.dragP0.x, dy = p.y - S.dragP0.y;
  let nx = b0.x, ny = b0.y, nw = b0.w, nh = b0.h;
  const h = S.resizeHandle;
  const isCorner = h === 'nw' || h === 'ne' || h === 'se' || h === 'sw';
  if (isCorner) {
    const D2 = b0.w * b0.w + b0.h * b0.h;
    let scale = 1;
    if (h === 'se') scale = ((b0.w + dx) * b0.w + (b0.h + dy) * b0.h) / D2;
    if (h === 'nw') scale = ((b0.w - dx) * b0.w + (b0.h - dy) * b0.h) / D2;
    if (h === 'ne') scale = ((b0.w + dx) * b0.w + (b0.h - dy) * b0.h) / D2;
    if (h === 'sw') scale = ((b0.w - dx) * b0.w + (b0.h + dy) * b0.h) / D2;
    const minScale = 0.1 / Math.min(b0.w, b0.h);
    scale = Math.max(scale, minScale);
    nw = b0.w * scale; nh = b0.h * scale;
    if (h === 'nw') { nx = b0.x + b0.w - nw; ny = b0.y + b0.h - nh; }
    if (h === 'ne') { ny = b0.y + b0.h - nh; }
    if (h === 'sw') { nx = b0.x + b0.w - nw; }
  } else {
    if (h.includes('e')) { nw = Math.max(0.1, b0.w + dx); }
    if (h.includes('w')) { nw = Math.max(0.1, b0.w - dx); nx = b0.x + b0.w - nw; }
    if (h.includes('s')) { nh = Math.max(0.1, b0.h + dy); }
    if (h.includes('n')) { nh = Math.max(0.1, b0.h - dy); ny = b0.y + b0.h - nh; }
  }
  const sx = b0.w > 1e-6 ? nw / b0.w : 1;
  const sy = b0.h > 1e-6 ? nh / b0.h : 1;
  for (const orig of S.resizeShapes0) {
    const s = findShape(orig.id); if (!s) continue;
    if (s.type === 'line') {
      s.x1 = nx + (orig.x1 - b0.x) * sx; s.y1 = ny + (orig.y1 - b0.y) * sy;
      s.x2 = nx + (orig.x2 - b0.x) * sx; s.y2 = ny + (orig.y2 - b0.y) * sy;
    } else if (s.type === 'path') {
      s.pts = orig.pts.map(pt => ({ x: nx + (pt.x - b0.x) * sx, y: ny + (pt.y - b0.y) * sy }));
    } else if (s.type === 'text') {
      s.x = nx + (orig.x - b0.x) * sx; s.y = ny + (orig.y - b0.y) * sy;
      s.fs = orig.fs * ((sx + sy) / 2);
    } else {
      s.x = nx + (orig.x - b0.x) * sx; s.y = ny + (orig.y - b0.y) * sy;
      s.w = orig.w * sx; s.h = orig.h * sy;
    }
  }
  renderShapes(); renderSelection(); updatePanelCoords();
  const gld = goldenCheck(nw, nh);
  const grv = document.getElementById('golden-ratio-val');
  if (grv) { grv.textContent = fmt2(nw / nh) + (gld ? '  ✦' : ''); grv.style.color = gld ? 'var(--gold)' : '#aaa'; }
  const stSize = document.getElementById('st-size');
  if (stSize) stSize.textContent = `${fmt(nw)} × ${fmt(nh)} mm`;
}

export function endResize() {
  if (!S.isResize) return;
  S.isResize = false;
  for (const orig of S.resizeShapes0) {
    const s = findShape(orig.id); if (!s) continue;
    if (s.type === 'line')      { s.x1 = sn(s.x1); s.y1 = sn(s.y1); s.x2 = sn(s.x2); s.y2 = sn(s.y2); }
    else if (s.type === 'path') { s.pts = s.pts.map(pt => ({ x: sn(pt.x), y: sn(pt.y) })); }
    else if (s.type === 'text') { s.x = sn(s.x); s.y = sn(s.y); s.fs = sn(s.fs); }
    else                        { s.x = sn(s.x); s.y = sn(s.y); s.w = sn(s.w); s.h = sn(s.h); }
  }
  renderShapes(); renderSelection();
  persist();
}
