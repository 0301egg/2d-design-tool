import { S, findShape, findGroup } from './state.js';
import { zoom } from './canvas.js';

export function polyPoints(x, y, w, h, n) {
  const cx = x + w / 2, cy = y + h / 2;
  const rx = w / 2, ry = h / 2;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const angle = (2 * Math.PI * i / n) - Math.PI / 2;
    pts.push(`${cx + rx * Math.cos(angle)},${cy + ry * Math.sin(angle)}`);
  }
  return pts.join(' ');
}

export function smoothPath(pts) {
  if (!pts || pts.length < 2) return '';
  if (pts.length === 2) return `M ${pts[0].x},${pts[0].y} L ${pts[1].x},${pts[1].y}`;
  let d = `M ${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
  }
  return d;
}

export function bbox(shape) {
  if (shape.type === 'rect' || shape.type === 'ellipse' || shape.type === 'polygon')
    return { x: shape.x, y: shape.y, w: shape.w, h: shape.h };
  if (shape.type === 'line') {
    const x = Math.min(shape.x1, shape.x2), y = Math.min(shape.y1, shape.y2);
    return { x, y, w: Math.abs(shape.x2 - shape.x1), h: Math.abs(shape.y2 - shape.y1) };
  }
  if (shape.type === 'text')
    return { x: shape.x, y: shape.y - shape.fs * 0.8, w: shape.text.length * shape.fs * 0.55, h: shape.fs };
  if (shape.type === 'path') {
    if (!shape.pts || !shape.pts.length) return { x: 0, y: 0, w: 0, h: 0 };
    const xs = shape.pts.map(p => p.x), ys = shape.pts.map(p => p.y);
    const x = Math.min(...xs), y = Math.min(...ys);
    return { x, y, w: Math.max(Math.max(...xs) - x, 0.1), h: Math.max(Math.max(...ys) - y, 0.1) };
  }
  return { x: 0, y: 0, w: 0, h: 0 };
}

export function groupBbox(grp) {
  const bs = grp.shapeIds.map(id => bbox(findShape(id))).filter(Boolean);
  if (!bs.length) return { x: 0, y: 0, w: 0, h: 0 };
  const x  = Math.min(...bs.map(b => b.x));
  const y  = Math.min(...bs.map(b => b.y));
  const x2 = Math.max(...bs.map(b => b.x + b.w));
  const y2 = Math.max(...bs.map(b => b.y + b.h));
  return { x, y, w: x2 - x, h: y2 - y };
}

export function selectionBbox() {
  const bs = S.selected.map(id => {
    const s = findShape(id); if (s) return bbox(s);
    const g = findGroup(id); if (g) return groupBbox(g);
  }).filter(Boolean);
  if (!bs.length) return null;
  const x  = Math.min(...bs.map(b => b.x));
  const y  = Math.min(...bs.map(b => b.y));
  const x2 = Math.max(...bs.map(b => b.x + b.w));
  const y2 = Math.max(...bs.map(b => b.y + b.h));
  return { x, y, w: x2 - x, h: y2 - y };
}

export function hitTest(x, y) {
  for (let i = S.shapes.length - 1; i >= 0; i--) {
    const s = S.shapes[i];
    if (s.groupId) continue;
    const b = bbox(s);
    const pad = 1.5 / zoom();
    if (x >= b.x - pad && x <= b.x + b.w + pad && y >= b.y - pad && y <= b.y + b.h + pad)
      return { kind: 'shape', id: s.id };
  }
  for (let i = S.groups.length - 1; i >= 0; i--) {
    const g = S.groups[i];
    const b = groupBbox(g);
    const pad = 1.5 / zoom();
    if (x >= b.x - pad && x <= b.x + b.w + pad && y >= b.y - pad && y <= b.y + b.h + pad)
      return { kind: 'group', id: g.id };
  }
  return null;
}
