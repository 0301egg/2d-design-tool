import { S, fmt, findShape, findGroup } from './state.js';
import { el, zoom, layerShapes, layerPreview, layerSel, layerParts } from './canvas.js';
import { bbox, groupBbox, selectionBbox, polyPoints, smoothPath } from './geometry.js';
import { persist } from './persist.js';

const HIDS = ['nw','n','ne','e','se','s','sw','w'];
const HCURSORS = { nw:'nw-resize', n:'n-resize', ne:'ne-resize', e:'e-resize',
                   se:'se-resize', s:'s-resize', sw:'sw-resize', w:'w-resize' };

function handlePositions(b) {
  return {
    nw:[b.x,b.y], n:[b.x+b.w/2,b.y], ne:[b.x+b.w,b.y],
    e:[b.x+b.w,b.y+b.h/2], se:[b.x+b.w,b.y+b.h],
    s:[b.x+b.w/2,b.y+b.h], sw:[b.x,b.y+b.h], w:[b.x,b.y+b.h/2],
  };
}

export function makeShapeEl(s) {
  let e;
  const common = { fill: s.fill, stroke: s.stroke, 'stroke-width': s.sw };
  if (s.type === 'rect') {
    const hitFill = (s.fill === 'none' || !s.fill) ? 'transparent' : s.fill;
    e = el('rect', { x: s.x, y: s.y, width: s.w, height: s.h, ...common, fill: hitFill });
  } else if (s.type === 'ellipse') {
    const hitFill = (s.fill === 'none' || !s.fill) ? 'transparent' : s.fill;
    e = el('ellipse', { cx: s.x + s.w/2, cy: s.y + s.h/2, rx: s.w/2, ry: s.h/2, ...common, fill: hitFill });
  } else if (s.type === 'polygon') {
    const hitFill = (s.fill === 'none' || !s.fill) ? 'transparent' : s.fill;
    e = el('polygon', { points: polyPoints(s.x, s.y, s.w, s.h, s.sides), ...common, fill: hitFill });
  } else if (s.type === 'line') {
    e = el('line', { x1: s.x1, y1: s.y1, x2: s.x2, y2: s.y2, stroke: s.stroke, 'stroke-width': s.sw });
  } else if (s.type === 'path') {
    const hitFill = (s.fill === 'none' || !s.fill) ? 'transparent' : s.fill;
    e = el('path', { d: smoothPath(s.pts), ...common, fill: hitFill });
  } else if (s.type === 'text') {
    e = el('text', { x: s.x, y: s.y, 'font-size': s.fs, fill: s.fill,
      'font-family': 'sans-serif', 'font-weight': '300' });
    e.textContent = s.text;
  }
  if (e) {
    e.dataset.id = s.id;
    e.style.cursor = 'pointer';
    e.addEventListener('mousedown', ev => {
      if (S.tool !== 'select') return;
      ev.stopPropagation();
      const targetId = s.groupId || s.id;
      if (!ev.shiftKey) {
        S.selected = [targetId];
      } else {
        S.selected = S.selected.includes(targetId)
          ? S.selected.filter(x => x !== targetId)
          : [...S.selected, targetId];
      }
      renderSelection();
      // updatePanel/startDrag はメインから呼ばれるので import を避けイベントで通知
      document.dispatchEvent(new CustomEvent('shape-selected', {
        detail: { clientX: ev.clientX, clientY: ev.clientY, shiftKey: ev.shiftKey },
      }));
    });
  }
  return e;
}

export function renderShapes() {
  layerShapes.innerHTML = '';
  for (const s of S.shapes) {
    const e = makeShapeEl(s);
    if (e) layerShapes.appendChild(e);
  }
  renderPartLabels();
}

export function renderPartLabels() {
  layerParts.innerHTML = '';
  const labeled = [];
  for (const g of S.groups)
    if (g.partNum != null) labeled.push({ num: g.partNum, b: groupBbox(g) });
  for (const s of S.shapes)
    if (s.partNum != null && !s.groupId) labeled.push({ num: s.partNum, b: bbox(s) });
  for (const { num, b } of labeled) {
    const cx = b.x + 2.5, cy = b.y + 2.5;
    el('circle', { cx, cy, r: 2.5, fill: '#1a1a1a' }, layerParts);
    const t = el('text', { x: cx, y: cy,
      'font-size': 2.8, fill: 'white',
      'text-anchor': 'middle', 'dominant-baseline': 'central',
      'font-family': 'sans-serif', 'font-weight': '600',
      'pointer-events': 'none' }, layerParts);
    t.textContent = num;
  }
}

export function renderSelection() {
  layerSel.innerHTML = '';
  if (!S.selected.length) return;
  const b = selectionBbox();
  if (!b) return;
  const z = zoom();
  const hs = 14 / z;

  el('rect', {
    x: b.x - 0.4/z, y: b.y - 0.4/z,
    width: b.w + 0.8/z, height: b.h + 0.8/z,
    fill: 'none', stroke: '#2563eb', 'stroke-width': 1/z,
    'stroke-dasharray': `${3/z},${2/z}`,
  }, layerSel);

  const dimStyle = { 'font-size': 3/z, fill: '#2563eb', 'font-family': 'sans-serif', 'font-weight': '400', 'pointer-events': 'none' };
  const tw = el('text', { ...dimStyle, x: b.x + b.w/2, y: b.y - 2/z, 'text-anchor': 'middle' }, layerSel);
  tw.textContent = `${fmt(b.w)} mm`;
  const th = el('text', { ...dimStyle, x: b.x + b.w + 2/z, y: b.y + b.h/2, 'dominant-baseline': 'middle' }, layerSel);
  th.textContent = `${fmt(b.h)} mm`;

  const hPos = handlePositions(b);
  for (const hid of HIDS) {
    const [hx, hy] = hPos[hid];
    const h = el('rect', {
      x: hx - hs/2, y: hy - hs/2, width: hs, height: hs,
      fill: 'white', stroke: '#2563eb', 'stroke-width': 0.8/z,
      style: `cursor:${HCURSORS[hid]}`,
      'data-handle': hid,
    }, layerSel);
    h.addEventListener('mousedown', e => {
      e.stopPropagation();
      document.dispatchEvent(new CustomEvent('start-resize', { detail: { handle: hid, event: e } }));
    });
  }
}

export function renderAll() {
  renderShapes();
  renderSelection();
  persist();
}
