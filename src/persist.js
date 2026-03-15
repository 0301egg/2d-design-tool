import { S, fmt } from './state.js';
import { bbox } from './geometry.js';

export function persist() {
  localStorage.setItem('2d-tool', JSON.stringify({
    shapes: S.shapes, groups: S.groups,
    nextId: S.nextId, nextPart: S.nextPart,
    bgColor: S.bgColor, showGrid: S.showGrid,
  }));
  // Save parts list for parts.html
  const parts = [];
  for (const g of S.groups)
    if (g.partNum != null) parts.push({ num: g.partNum, label: `グループ (${g.shapeIds.length}図形)`, notes: g.notes || '' });
  for (const s of S.shapes)
    if (s.partNum != null && !s.groupId) {
      const b = bbox(s);
      const typeLabel = s.type === 'polygon'
        ? (s.sides === 3 ? '三角形' : s.sides === 5 ? '五角形' : '多角形')
        : ({ rect: '四角形', ellipse: '楕円', line: '直線', path: '流線形', text: 'テキスト' }[s.type] || s.type);
      parts.push({ num: s.partNum, label: `${typeLabel} ${fmt(b.w)}×${fmt(b.h)}mm`, notes: s.notes || '' });
    }
  parts.sort((a, b) => a.num - b.num);
  localStorage.setItem('2d-parts', JSON.stringify(parts));
}

export function loadState() {
  try {
    const d = JSON.parse(localStorage.getItem('2d-tool') || 'null');
    if (d) {
      S.shapes = d.shapes || [];
      S.groups = d.groups || [];
      S.nextId = d.nextId || 1;
      S.nextPart = d.nextPart || 1;
      if (d.bgColor) S.bgColor = d.bgColor;
      if (d.showGrid !== undefined) S.showGrid = d.showGrid;
    }
  } catch (e) {}
}
