import { S, uid, sn, fmt, goldenCheck } from '../state.js';
import { el, layerPreview, zoom } from '../canvas.js';
import { polyPoints, smoothPath } from '../geometry.js';
import { renderAll } from '../render.js';
import { saveHistory } from '../history.js';
import { updatePanel } from '../panel.js';

export function startDraw(p) {
  S.isDraw = true;
  S.drawP0 = { x: sn(p.x), y: sn(p.y) };
  S.pathPts = [{ x: p.x, y: p.y }];
  layerPreview.innerHTML = '';
}

export function updateDraw(p) {
  if (!S.isDraw) return;
  if (S.tool === 'path') {
    const last = S.pathPts[S.pathPts.length - 1];
    const dist = Math.hypot(p.x - last.x, p.y - last.y);
    if (dist > 0.3) S.pathPts.push({ x: p.x, y: p.y });
    layerPreview.innerHTML = '';
    if (S.pathPts.length >= 2) {
      el('path', { d: smoothPath(S.pathPts), fill: 'none', stroke: '#2563eb', 'stroke-width': 0.4 }, layerPreview);
    }
    return;
  }
  const x0 = S.drawP0.x, y0 = S.drawP0.y;
  const x1 = sn(p.x), y1 = sn(p.y);
  const minX = Math.min(x0, x1), minY = Math.min(y0, y1);
  const w = Math.abs(x1 - x0), h = Math.abs(y1 - y0);
  layerPreview.innerHTML = '';
  const previewAttr = { fill: 'rgba(37,99,235,0.07)', stroke: '#2563eb', 'stroke-width': 0.3, 'stroke-dasharray': '2,1.2' };
  let e;
  if (S.tool === 'rect')     e = el('rect',    { x: minX, y: minY, width: w, height: h, ...previewAttr });
  if (S.tool === 'triangle') e = el('polygon', { points: polyPoints(minX, minY, w, h, 3), ...previewAttr });
  if (S.tool === 'pentagon') e = el('polygon', { points: polyPoints(minX, minY, w, h, 5), ...previewAttr });
  if (S.tool === 'ellipse') {
    const side = Math.min(w, h);
    const ex = x1 >= x0 ? x0 : x0 - side;
    const ey = y1 >= y0 ? y0 : y0 - side;
    e = el('ellipse', { cx: ex + side / 2, cy: ey + side / 2, rx: side / 2, ry: side / 2, ...previewAttr });
  }
  if (S.tool === 'line') e = el('line', { x1: x0, y1: y0, x2: x1, y2: y1, stroke: '#2563eb', 'stroke-width': 0.4 });
  if (e) layerPreview.appendChild(e);

  const dispW = S.tool === 'ellipse' ? Math.min(w, h) : w;
  const dispH = S.tool === 'ellipse' ? Math.min(w, h) : h;
  const showDim = S.tool !== 'line' && (dispW > 0 || dispH > 0);
  if (showDim) {
    const gld = (S.tool === 'rect' || S.tool === 'triangle' || S.tool === 'pentagon') ? goldenCheck(dispW, dispH) : null;
    const z = zoom();
    const t = el('text', {
      x: minX + w / 2, y: minY - 2 / z,
      'font-size': 3 / z, fill: gld ? '#b8860b' : '#2563eb',
      'text-anchor': 'middle', 'font-family': 'sans-serif', 'font-weight': '400',
      'pointer-events': 'none',
    }, layerPreview);
    t.textContent = S.tool === 'ellipse'
      ? `⌀ ${fmt(dispW)} mm`
      : `${fmt(dispW)} × ${fmt(dispH)} mm` + (gld ? '  ✦φ' : '');
  }
  const stSize = document.getElementById('st-size');
  if (stSize) stSize.textContent = (dispW > 0 || dispH > 0)
    ? (S.tool === 'ellipse' ? `⌀ ${fmt(dispW)} mm` : `${fmt(dispW)} × ${fmt(dispH)} mm`)
    : '—';
}

export function endDraw(p) {
  if (!S.isDraw) return;
  S.isDraw = false;
  layerPreview.innerHTML = '';

  if (S.tool === 'path') {
    const last = S.pathPts[S.pathPts.length - 1];
    if (Math.hypot(p.x - last.x, p.y - last.y) > 0.3) S.pathPts.push({ x: p.x, y: p.y });
    if (S.pathPts.length >= 2) {
      saveHistory();
      const def = { fill: 'none', stroke: '#2c2c2c', sw: 0.5, partNum: null, notes: '', groupId: null };
      const s = { ...def, id: uid(), type: 'path', pts: S.pathPts.map(pt => ({ x: sn(pt.x), y: sn(pt.y) })) };
      S.shapes.push(s); S.selected = [s.id]; renderAll(); updatePanel();
      document.dispatchEvent(new CustomEvent('set-tool', { detail: 'select' }));
    }
    S.pathPts = [];
    return;
  }

  const x0 = S.drawP0.x, y0 = S.drawP0.y;
  const x1 = sn(p.x), y1 = sn(p.y);
  const minX = Math.min(x0, x1), minY = Math.min(y0, y1);
  const w = Math.abs(x1 - x0), h = Math.abs(y1 - y0);
  saveHistory();
  const def = { fill: '#ffffff', stroke: '#2c2c2c', sw: 0.5, partNum: null, notes: '', groupId: null };
  let s;
  if (w < 0.2 && h < 0.2) {
    const dw = 30;
    if (S.tool === 'rect')     s = { ...def, id: uid(), type: 'rect',    x: sn(x0 - dw / 2), y: sn(y0 - 10), w: dw, h: 20 };
    if (S.tool === 'ellipse')  s = { ...def, id: uid(), type: 'ellipse', x: sn(x0 - 10),     y: sn(y0 - 10), w: 20, h: 20 };
    if (S.tool === 'triangle') s = { ...def, id: uid(), type: 'polygon', x: sn(x0 - 15), y: sn(y0 - 13), w: 30, h: 26, sides: 3 };
    if (S.tool === 'pentagon') s = { ...def, id: uid(), type: 'polygon', x: sn(x0 - 15), y: sn(y0 - 15), w: 30, h: 30, sides: 5 };
    if (S.tool === 'line')     s = { ...def, id: uid(), type: 'line', x1: sn(x0 - dw / 2), y1: y0, x2: sn(x0 + dw / 2), y2: y0, fill: 'none' };
  } else {
    if (S.tool === 'rect')     s = { ...def, id: uid(), type: 'rect',    x: minX, y: minY, w, h };
    if (S.tool === 'triangle') s = { ...def, id: uid(), type: 'polygon', x: minX, y: minY, w, h, sides: 3 };
    if (S.tool === 'pentagon') s = { ...def, id: uid(), type: 'polygon', x: minX, y: minY, w, h, sides: 5 };
    if (S.tool === 'ellipse') {
      const side = Math.min(w, h);
      const ex = x1 >= x0 ? x0 : x0 - side;
      const ey = y1 >= y0 ? y0 : y0 - side;
      s = { ...def, id: uid(), type: 'ellipse', x: ex, y: ey, w: side, h: side };
    }
    if (S.tool === 'line') s = { ...def, id: uid(), type: 'line', x1: x0, y1: y0, x2: x1, y2: y1, fill: 'none' };
  }
  if (s) {
    S.shapes.push(s); S.selected = [s.id]; renderAll(); updatePanel();
    document.dispatchEvent(new CustomEvent('set-tool', { detail: 'select' }));
  }
}

export function placeText(p) {
  const text = prompt('テキストを入力:', '');
  if (!text) return;
  saveHistory();
  const s = { id: uid(), type: 'text', x: sn(p.x), y: sn(p.y), text, fs: 6,
              fill: '#2c2c2c', stroke: 'none', sw: 0, partNum: null, notes: '', groupId: null };
  S.shapes.push(s);
  S.selected = [s.id];
  renderAll(); updatePanel();
}
