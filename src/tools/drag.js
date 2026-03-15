import { S, sn, findShape, findGroup } from '../state.js';
import { renderShapes, renderSelection } from '../render.js';
import { persist } from '../persist.js';
import { updatePanelCoords } from '../panel.js';

export function startDrag(p) {
  S.isDrag = true;
  S.dragP0 = { ...p };
  S.dragOrigins = {};
  for (const id of S.selected) {
    const sh = findShape(id);
    if (sh) {
      S.dragOrigins[id] = sh.type === 'line'
        ? { x1: sh.x1, y1: sh.y1, x2: sh.x2, y2: sh.y2 }
        : sh.type === 'path'
        ? { pts: sh.pts.map(pt => ({ ...pt })) }
        : { x: sh.x, y: sh.y };
      continue;
    }
    const g = findGroup(id);
    if (g) {
      S.dragOrigins[id] = {};
      for (const sid of g.shapeIds) {
        const s = findShape(sid); if (!s) continue;
        S.dragOrigins[id][sid] = s.type === 'line'
          ? { x1: s.x1, y1: s.y1, x2: s.x2, y2: s.y2 }
          : s.type === 'path'
          ? { pts: s.pts.map(pt => ({ ...pt })) }
          : { x: s.x, y: s.y };
      }
    }
  }
}

export function updateDrag(p) {
  if (!S.isDrag) return;
  let dx = p.x - S.dragP0.x, dy = p.y - S.dragP0.y;
  if (S.shiftDown) {
    if (Math.abs(dx) >= Math.abs(dy)) dy = 0; else dx = 0;
  }
  for (const id of S.selected) {
    const sh = findShape(id);
    if (sh) {
      const o = S.dragOrigins[id];
      if (sh.type === 'line')      { sh.x1 = o.x1 + dx; sh.y1 = o.y1 + dy; sh.x2 = o.x2 + dx; sh.y2 = o.y2 + dy; }
      else if (sh.type === 'path') { sh.pts = o.pts.map(pt => ({ x: pt.x + dx, y: pt.y + dy })); }
      else                         { sh.x = o.x + dx; sh.y = o.y + dy; }
      continue;
    }
    const g = findGroup(id);
    if (g) {
      const og = S.dragOrigins[id];
      for (const sid of g.shapeIds) {
        const s = findShape(sid); if (!s) continue;
        const o = og[sid];
        if (s.type === 'line')      { s.x1 = o.x1 + dx; s.y1 = o.y1 + dy; s.x2 = o.x2 + dx; s.y2 = o.y2 + dy; }
        else if (s.type === 'path') { s.pts = o.pts.map(pt => ({ x: pt.x + dx, y: pt.y + dy })); }
        else                        { s.x = o.x + dx; s.y = o.y + dy; }
      }
    }
  }
  renderShapes(); renderSelection(); updatePanelCoords();
}

export function endDrag() {
  if (!S.isDrag) return;
  S.isDrag = false;
  for (const id of S.selected) {
    const sh = findShape(id);
    if (sh) {
      if (sh.type === 'line')      { sh.x1 = sn(sh.x1); sh.y1 = sn(sh.y1); sh.x2 = sn(sh.x2); sh.y2 = sn(sh.y2); }
      else if (sh.type === 'path') { sh.pts = sh.pts.map(pt => ({ x: sn(pt.x), y: sn(pt.y) })); }
      else                         { sh.x = sn(sh.x); sh.y = sn(sh.y); }
    }
    const g = findGroup(id);
    if (g) for (const sid of g.shapeIds) {
      const s = findShape(sid); if (!s) continue;
      if (s.type === 'line')      { s.x1 = sn(s.x1); s.y1 = sn(s.y1); s.x2 = sn(s.x2); s.y2 = sn(s.y2); }
      else if (s.type === 'path') { s.pts = s.pts.map(pt => ({ x: sn(pt.x), y: sn(pt.y) })); }
      else                        { s.x = sn(s.x); s.y = sn(s.y); }
    }
  }
  renderShapes(); renderSelection();
  persist();
}
