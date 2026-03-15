import { S, uid, gid, sn, findShape, findGroup } from './state.js';
import { renderAll, renderSelection } from './render.js';
import { saveHistory, undoSnap, redoSnap } from './history.js';
import { updatePanel } from './panel.js';

export function undo() {
  if (undoSnap()) { renderAll(); updatePanel(); }
}

export function redo() {
  if (redoSnap()) { renderAll(); updatePanel(); }
}

export function copySelected() {
  if (!S.selected.length) return;
  S.clipboard = [];
  for (const id of S.selected) {
    const sh = findShape(id);
    if (sh && !sh.groupId) { S.clipboard.push({ kind: 'shape', data: JSON.parse(JSON.stringify(sh)) }); continue; }
    const g = findGroup(id);
    if (g) S.clipboard.push({
      kind: 'group',
      group: JSON.parse(JSON.stringify(g)),
      shapes: g.shapeIds.map(sid => findShape(sid)).filter(Boolean).map(s => JSON.parse(JSON.stringify(s))),
    });
  }
}

export function pasteCopied() {
  if (!S.clipboard.length) return;
  saveHistory();
  const off = 5;
  const newSel = [];
  for (const item of S.clipboard) {
    if (item.kind === 'group') {
      const newShapes = item.shapes.map(s => {
        const ns = { ...s, id: uid(), groupId: null };
        if (ns.type === 'line')      { ns.x1 += off; ns.y1 += off; ns.x2 += off; ns.y2 += off; }
        else if (ns.type === 'path') { ns.pts = ns.pts.map(pt => ({ x: pt.x + off, y: pt.y + off })); }
        else                         { ns.x += off; ns.y += off; }
        S.shapes.push(ns); return ns;
      });
      const ng = { ...item.group, id: gid(), shapeIds: newShapes.map(s => s.id) };
      for (const ns of newShapes) ns.groupId = ng.id;
      S.groups.push(ng); newSel.push(ng.id);
    } else {
      const ns = { ...item.data, id: uid(), groupId: null };
      if (ns.type === 'line')      { ns.x1 += off; ns.y1 += off; ns.x2 += off; ns.y2 += off; }
      else if (ns.type === 'path') { ns.pts = ns.pts.map(pt => ({ x: pt.x + off, y: pt.y + off })); }
      else                         { ns.x += off; ns.y += off; }
      S.shapes.push(ns); newSel.push(ns.id);
    }
  }
  S.selected = newSel;
  renderAll(); updatePanel();
}

export function cutSelected() {
  if (!S.selected.length) return;
  copySelected();
  saveHistory();
  for (const id of S.selected) {
    const g = findGroup(id);
    if (g) {
      for (const sid of g.shapeIds) { const s = findShape(sid); if (s) s.groupId = null; }
      S.groups = S.groups.filter(x => x.id !== id);
    } else {
      S.shapes = S.shapes.filter(s => s.id !== id);
    }
  }
  S.selected = []; renderAll(); updatePanel();
}

export function deleteSelected() {
  if (!S.selected.length) return;
  saveHistory();
  for (const id of S.selected) {
    const g = findGroup(id);
    if (g) {
      for (const sid of g.shapeIds) { const s = findShape(sid); if (s) s.groupId = null; }
      S.groups = S.groups.filter(x => x.id !== id);
    } else {
      S.shapes = S.shapes.filter(s => s.id !== id);
    }
  }
  S.selected = []; renderAll(); updatePanel();
}

export function groupSelected() {
  const shapeIds = S.selected.filter(id => findShape(id));
  if (shapeIds.length < 2) { alert('2つ以上の図形を選択してください'); return; }
  saveHistory();
  const g = { id: gid(), shapeIds, partNum: null, notes: '' };
  for (const id of shapeIds) { const s = findShape(id); if (s) s.groupId = g.id; }
  S.groups.push(g);
  S.selected = [g.id];
  renderAll(); updatePanel();
}

export function ungroupSelected() {
  saveHistory();
  const newSel = [];
  for (const id of S.selected) {
    const g = findGroup(id); if (!g) continue;
    for (const sid of g.shapeIds) { const s = findShape(sid); if (s) { s.groupId = null; newSel.push(s.id); } }
    S.groups = S.groups.filter(x => x.id !== id);
  }
  S.selected = newSel;
  renderAll(); updatePanel();
}

export function assignPart() {
  if (!S.selected.length) return;
  saveHistory();
  for (const id of S.selected) {
    const s = findShape(id); if (s && s.partNum == null) { s.partNum = S.nextPart++; continue; }
    const g = findGroup(id); if (g && g.partNum == null) { g.partNum = S.nextPart++; }
  }
  renderAll(); updatePanel();
}

export function selectAll() {
  S.selected = [
    ...S.shapes.filter(s => !s.groupId).map(s => s.id),
    ...S.groups.map(g => g.id),
  ];
  renderSelection(); updatePanel();
}
