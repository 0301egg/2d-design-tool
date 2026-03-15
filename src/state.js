export const PHI     = 1.6180339887498948;
export const A4W     = 210;  // mm
export const A4H     = 297;  // mm
export const SNAP    = 0.1;  // mm
export const PHI_TOL = 0.04;

export const S = {
  tool: 'select',
  shapes: [],
  groups: [],
  selected: [],
  nextId: 1,
  nextPart: 1,
  vb: { x: -15, y: -15, w: 240, h: 327 },
  mouse: { x: 0, y: 0 },
  spaceDown: false,
  shiftDown: false,
  clipboard: [],
  isDraw: false,
  drawP0: null,
  pathPts: [],
  isDrag: false,
  dragP0: null,
  dragOrigins: {},
  isResize: false,
  resizeHandle: '',
  resizeBbox0: null,
  resizeShapes0: [],
  isPan: false,
  panP0: null,
  panVb0: null,
  bgColor: '#ffffff',
  showGrid: true,
  history: [],
  histIdx: -1,
};

export function uid() { return 's' + (S.nextId++); }
export function gid() { return 'g' + (S.nextId++); }
export function sn(v) { return Math.round(v / SNAP) * SNAP; }
export function fmt(v) { return (+v.toFixed(1)).toString(); }
export function fmt2(v) { return (isNaN(v) || !isFinite(v)) ? '—' : v.toFixed(3); }
export function findShape(id) { return S.shapes.find(s => s.id === id) || null; }
export function findGroup(id) { return S.groups.find(g => g.id === id) || null; }

export function goldenCheck(w, h) {
  if (!w || !h || w < 0 || h < 0) return null;
  const r = w / h;
  if (Math.abs(r - PHI) / PHI < PHI_TOL)       return { ratio: r, label: 'w/h ≈ φ' };
  if (Math.abs(r - 1/PHI) / (1/PHI) < PHI_TOL) return { ratio: r, label: 'h/w ≈ φ' };
  return null;
}
