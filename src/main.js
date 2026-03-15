import './style.css';
import { S } from './state.js';
import { svg, layerPreview, toMM, applyVb, applyBgColor, applyGrid } from './canvas.js';
import { hitTest } from './geometry.js';
import { renderAll, renderSelection } from './render.js';
import { loadState, persist } from './persist.js';
import { saveHistory } from './history.js';
import { updatePanel, updatePanelCoords } from './panel.js';
import { startDraw, updateDraw, endDraw, placeText } from './tools/draw.js';
import { startDrag, updateDrag, endDrag } from './tools/drag.js';
import { startResize, updateResize, endResize } from './tools/resize.js';
import {
  undo, redo, copySelected, pasteCopied, cutSelected, deleteSelected,
  groupSelected, ungroupSelected, assignPart, selectAll,
} from './actions.js';
import { exportPDF } from './export.js';

const sn = v => Math.round(v / 0.1) * 0.1;
const fmt = v => (+v.toFixed(1)).toString();

// ── Draw-tool dropdown ─────────────────────────────────────────────
const drawPanel   = document.getElementById('draw-panel');
const btnDrawTool = document.getElementById('btn-draw-tool');
const DRAW_TOOLS  = new Set(['rect', 'ellipse', 'triangle', 'pentagon', 'line', 'path', 'text']);
const DRAW_ICONS  = {
  rect: '□ 四角形', ellipse: '○ 真円', triangle: '△ 三角形',
  pentagon: '⬠ 五角形', line: '／ 直線', path: '〜 流線形', text: 'T テキスト',
};

btnDrawTool.addEventListener('click', e => {
  e.stopPropagation();
  const isOpen = drawPanel.classList.contains('open');
  if (isOpen) { drawPanel.classList.remove('open'); return; }
  const r = btnDrawTool.getBoundingClientRect();
  drawPanel.style.top  = (r.bottom + 4) + 'px';
  drawPanel.style.left = r.left + 'px';
  drawPanel.classList.add('open');
});
document.addEventListener('mousedown', e => {
  if (!drawPanel.contains(e.target) && e.target !== btnDrawTool) drawPanel.classList.remove('open');
});
document.querySelectorAll('[data-tool]').forEach(btn => {
  btn.addEventListener('click', () => {
    setTool(btn.dataset.tool);
    drawPanel.classList.remove('open');
  });
});

// listen for set-tool events dispatched by draw.js after completing a shape
document.addEventListener('set-tool', e => setTool(e.detail));

// ── Tool setter ────────────────────────────────────────────────────
function setTool(t) {
  S.tool = t;
  document.querySelectorAll('[data-tool]').forEach(b => b.classList.toggle('active', b.dataset.tool === t));
  ca.className = t === 'select' ? 'cursor-default' : 'cursor-cross';
  const names = { select: '選択', rect: '四角形', ellipse: '楕円', triangle: '三角形', pentagon: '五角形', line: '直線', path: '流線形', text: 'テキスト' };
  document.getElementById('st-tool').textContent = `ツール: ${names[t] || t}`;
  const isDraw = DRAW_TOOLS.has(t);
  btnDrawTool.classList.toggle('active', isDraw);
  btnDrawTool.textContent = isDraw ? DRAW_ICONS[t] : '図形の描画';
}

// ── Canvas events ──────────────────────────────────────────────────
const ca = document.getElementById('canvas-area');

ca.addEventListener('mousedown', e => {
  if (e.button !== 0 && e.button !== 1) return;
  const mm = toMM(e.clientX, e.clientY);
  if (e.button === 1 || S.spaceDown) {
    S.isPan = true; S.panP0 = { x: e.clientX, y: e.clientY }; S.panVb0 = { ...S.vb };
    ca.className = 'cursor-grabbing'; e.preventDefault(); return;
  }
  if (S.tool === 'select') {
    const hit = hitTest(mm.x, mm.y);
    if (hit) {
      if (!e.shiftKey) S.selected = S.selected.includes(hit.id) ? S.selected : [hit.id];
      else S.selected = S.selected.includes(hit.id) ? S.selected.filter(x => x !== hit.id) : [...S.selected, hit.id];
      renderSelection(); updatePanel();
      if (!e.shiftKey) startDrag(mm);
    } else {
      S.selected = []; renderSelection(); updatePanel();
    }
  } else if (S.tool === 'text') {
    placeText(mm);
  } else {
    startDraw(mm);
  }
});

// shape-selected is dispatched by render.js when clicking a shape element directly
document.addEventListener('shape-selected', e => {
  const { clientX, clientY, shiftKey } = e.detail;
  const mm = toMM(clientX, clientY);
  if (!shiftKey) startDrag(mm);
  updatePanel();
});

// start-resize is dispatched by render.js resize handles
document.addEventListener('start-resize', e => {
  const { handle, event } = e.detail;
  startResize(handle, event);
});

ca.addEventListener('mousemove', e => {
  const mm = toMM(e.clientX, e.clientY);
  S.mouse = mm;
  const stPos = document.getElementById('st-pos');
  if (stPos) stPos.textContent = `${fmt(mm.x)} mm, ${fmt(mm.y)} mm`;
  if (S.isPan) {
    const r = svg.getBoundingClientRect();
    const dx = (e.clientX - S.panP0.x) / r.width  * S.vb.w;
    const dy = (e.clientY - S.panP0.y) / r.height * S.vb.h;
    S.vb.x = S.panVb0.x - dx; S.vb.y = S.panVb0.y - dy;
    applyVb(); return;
  }
  if (S.isDraw)   updateDraw(mm);
  if (S.isDrag)   updateDrag(mm);
  if (S.isResize) updateResize(mm);
});

ca.addEventListener('mouseup', e => {
  if (S.isPan) {
    S.isPan = false;
    ca.className = S.spaceDown ? 'cursor-grab' : (S.tool === 'select' ? 'cursor-default' : 'cursor-cross');
    return;
  }
  const mm = toMM(e.clientX, e.clientY);
  if (S.isDraw)   endDraw(mm);
  if (S.isDrag)   endDrag();
  if (S.isResize) endResize();
});

ca.addEventListener('mouseleave', () => {
  if (S.isDraw) { S.isDraw = false; layerPreview.innerHTML = ''; S.pathPts = []; }
  if (S.isPan)  S.isPan = false;
});

ca.addEventListener('wheel', e => {
  e.preventDefault();
  const mm = toMM(e.clientX, e.clientY);
  const f = e.deltaY > 0 ? 1.12 : 0.89;
  S.vb.x = mm.x - (mm.x - S.vb.x) * f;
  S.vb.y = mm.y - (mm.y - S.vb.y) * f;
  S.vb.w *= f; S.vb.h *= f;
  applyVb();
}, { passive: false });

// ── Keyboard ───────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  S.shiftDown = e.shiftKey;
  if (e.key === ' ' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
    S.spaceDown = true; ca.className = 'cursor-grab'; e.preventDefault(); return;
  }
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  if (!e.ctrlKey) {
    if (e.key === 'v' || e.key === 'V') setTool('select');
    if (e.key === 'r' || e.key === 'R') setTool('rect');
    if (e.key === 'e' || e.key === 'E') setTool('ellipse');
    if (e.key === '3') setTool('triangle');
    if (e.key === '5') setTool('pentagon');
    if (e.key === 'l' || e.key === 'L') setTool('line');
    if (e.key === 'f' || e.key === 'F') setTool('path');
    if (e.key === 't' || e.key === 'T') setTool('text');
  }
  if (e.ctrlKey && e.key === 'z') { e.preventDefault(); undo(); }
  if (e.ctrlKey && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) { e.preventDefault(); redo(); }
  if (e.ctrlKey && !e.shiftKey && e.key === 'g') { e.preventDefault(); groupSelected(); }
  if (e.ctrlKey &&  e.shiftKey && e.key === 'G') { e.preventDefault(); ungroupSelected(); }
  if (e.ctrlKey && e.key === 'p') { e.preventDefault(); exportPDF(); }
  if (e.ctrlKey && e.key === 'a') { e.preventDefault(); selectAll(); }
  if (e.ctrlKey && e.key === 'c') { copySelected(); }
  if (e.ctrlKey && e.key === 'v') { e.preventDefault(); pasteCopied(); }
  if (e.ctrlKey && e.key === 'd') { e.preventDefault(); copySelected(); pasteCopied(); }
  if (e.ctrlKey && e.key === 'x') { e.preventDefault(); cutSelected(); }
  if ((e.key === 'Delete' || e.key === 'Backspace') && S.selected.length) {
    e.preventDefault(); deleteSelected();
  }
  if (e.key === 'Escape') { S.selected = []; renderSelection(); updatePanel(); }
  if ((e.key === 'g' || e.key === 'G') && !e.ctrlKey) {
    S.showGrid = !S.showGrid; applyGrid(); persist();
  }
  if (e.key === 'Tab') {
    e.preventDefault();
    const all = [
      ...S.shapes.filter(s => !s.groupId).map(s => s.id),
      ...S.groups.map(g => g.id),
    ];
    if (!all.length) return;
    const cur = S.selected[0];
    const idx = all.indexOf(cur);
    const next = e.shiftKey
      ? all[(idx - 1 + all.length) % all.length]
      : all[(idx + 1) % all.length];
    S.selected = [next]; renderSelection(); updatePanel();
  }
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key) && S.selected.length) {
    e.preventDefault();
    const step = e.shiftKey ? 1 : 0.1;
    const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
    const dy = e.key === 'ArrowUp'   ? -step : e.key === 'ArrowDown'  ? step : 0;
    saveHistory();
    for (const id of S.selected) {
      const sh = S.shapes.find(s => s.id === id);
      if (sh) {
        if (sh.type === 'line')      { sh.x1 = sn(sh.x1 + dx); sh.y1 = sn(sh.y1 + dy); sh.x2 = sn(sh.x2 + dx); sh.y2 = sn(sh.y2 + dy); }
        else if (sh.type === 'path') { sh.pts = sh.pts.map(pt => ({ x: sn(pt.x + dx), y: sn(pt.y + dy) })); }
        else                         { sh.x = sn(sh.x + dx); sh.y = sn(sh.y + dy); }
      }
      const g = S.groups.find(g => g.id === id);
      if (g) for (const sid of g.shapeIds) {
        const s = S.shapes.find(s => s.id === sid); if (!s) continue;
        if (s.type === 'line')      { s.x1 = sn(s.x1 + dx); s.y1 = sn(s.y1 + dy); s.x2 = sn(s.x2 + dx); s.y2 = sn(s.y2 + dy); }
        else if (s.type === 'path') { s.pts = s.pts.map(pt => ({ x: sn(pt.x + dx), y: sn(pt.y + dy) })); }
        else                        { s.x = sn(s.x + dx); s.y = sn(s.y + dy); }
      }
    }
    renderAll(); updatePanelCoords();
  }
});

document.addEventListener('keyup', e => {
  S.shiftDown = e.shiftKey;
  if (e.key === ' ') {
    S.spaceDown = false;
    ca.className = S.tool === 'select' ? 'cursor-default' : 'cursor-cross';
  }
});

// ── Keyboard shortcut modal ────────────────────────────────────────
const kbdModal = document.getElementById('kbd-modal');
const openKbd  = () => kbdModal.classList.add('open');
const closeKbd = () => kbdModal.classList.remove('open');
document.getElementById('btn-kbd').addEventListener('click', openKbd);
document.getElementById('kbd-close').addEventListener('click', closeKbd);
kbdModal.addEventListener('mousedown', e => { if (e.target === kbdModal) closeKbd(); });
document.addEventListener('keydown', e => {
  if (e.key === '?' || e.key === '/') {
    if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') { e.preventDefault(); openKbd(); }
  }
  if (e.key === 'Escape') closeKbd();
}, true);

// ── Toolbar buttons ────────────────────────────────────────────────
document.getElementById('btn-grid').addEventListener('click', () => { S.showGrid = !S.showGrid; applyGrid(); persist(); });
document.getElementById('btn-undo').addEventListener('click', undo);
document.getElementById('btn-redo').addEventListener('click', redo);
document.getElementById('btn-group').addEventListener('click', groupSelected);
document.getElementById('btn-ungroup').addEventListener('click', ungroupSelected);
document.getElementById('btn-part').addEventListener('click', assignPart);
document.getElementById('btn-pdf').addEventListener('click', exportPDF);
document.getElementById('btn-clear').addEventListener('click', () => {
  if (!confirm('すべてクリアしますか？')) return;
  S.shapes = []; S.groups = []; S.selected = []; S.nextPart = 1;
  renderAll(); updatePanel();
});

// ── Init ────────────────────────────────────────────────────────────
loadState();
saveHistory();
applyVb();
applyBgColor();
applyGrid();
renderAll();
updatePanel();
