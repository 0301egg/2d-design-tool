import { S, fmt, fmt2, sn, findShape, findGroup, goldenCheck, PHI } from './state.js';
import { bbox, groupBbox, selectionBbox } from './geometry.js';
import { renderAll, renderShapes } from './render.js';
import { persist } from './persist.js';
import { saveHistory } from './history.js';
import { applyBgColor } from './canvas.js';

export function updatePanel() {
  const panel = document.getElementById('props-panel');
  if (!S.selected.length) {
    panel.innerHTML = `
      <div class="p-section">
        <div class="p-title">キャンバス設定</div>
        <div class="p-row">
          <span class="p-lbl-wide">背景色</span>
          <input class="p-in" type="color" id="pi-bg-color" value="${S.bgColor}">
        </div>
      </div>
      <div class="p-empty" style="flex:1">図形を選択してください</div>
    `;
    document.getElementById('pi-bg-color')?.addEventListener('input', e => {
      S.bgColor = e.target.value; applyBgColor(); persist();
    });
    return;
  }
  const id  = S.selected[0];
  const sh  = findShape(id);
  const grp = findGroup(id);
  const item = sh || grp;
  if (!item) { panel.innerHTML = '<div class="p-empty">—</div>'; return; }
  const b   = sh ? bbox(sh) : groupBbox(grp);
  const gld = goldenCheck(b.w, b.h);
  const label = grp
    ? 'グループ'
    : ({ rect: '四角形', ellipse: '楕円',
        polygon: sh.sides === 3 ? '三角形' : sh.sides === 5 ? '五角形' : '多角形',
        line: '直線', path: '流線形', text: 'テキスト' }[sh.type] || sh.type);

  let colorSection = '';
  if (sh && (sh.type === 'rect' || sh.type === 'ellipse' || sh.type === 'polygon' || sh.type === 'path')) {
    colorSection = `<div class="p-section">
      <div class="p-title">スタイル</div>
      <div class="p-row">
        <span class="p-lbl">塗</span>
        <input class="p-in" type="color" id="pi-fill" value="${sh.fill === 'none' ? '#ffffff' : sh.fill}" ${sh.fill === 'none' ? 'disabled' : ''} style="${sh.fill === 'none' ? 'opacity:0.35' : ''}">
        <label style="display:flex;align-items:center;gap:2px;font-size:10px;color:var(--accent);cursor:pointer;white-space:nowrap">
          <input type="checkbox" id="pi-fill-none" ${sh.fill === 'none' ? 'checked' : ''}> なし
        </label>
      </div>
      <div class="p-row">
        <span class="p-lbl">線</span>
        <input class="p-in" type="color" id="pi-stroke" value="${sh.stroke === 'none' ? '#000000' : sh.stroke}">
        <input class="p-in" id="pi-sw" type="number" value="${sh.sw}" min="0" max="5" step="0.1" style="width:44px">
        <span class="p-unit">mm</span>
      </div>
    </div>`;
  } else if (sh && sh.type === 'line') {
    colorSection = `<div class="p-section">
      <div class="p-title">スタイル</div>
      <div class="p-row">
        <span class="p-lbl">線色</span>
        <input class="p-in" type="color" id="pi-stroke" value="${sh.stroke === 'none' ? '#000000' : sh.stroke}">
        <input class="p-in" id="pi-sw" type="number" value="${sh.sw}" min="0" max="5" step="0.1" style="width:44px">
        <span class="p-unit">mm</span>
      </div>
    </div>`;
  } else if (sh && sh.type === 'text') {
    colorSection = `<div class="p-section">
      <div class="p-title">スタイル</div>
      <div class="p-row">
        <span class="p-lbl">色</span>
        <input class="p-in" type="color" id="pi-fill" value="${sh.fill === 'none' ? '#000000' : sh.fill}">
        <span class="p-lbl" style="width:auto;margin-left:6px">サイズ</span>
        <input class="p-in" id="pi-fs" type="number" value="${sh.fs}" min="1" max="50" step="0.5" style="width:44px">
        <span class="p-unit">mm</span>
      </div>
    </div>`;
  }

  const showGolden = (sh && (sh.type === 'rect' || sh.type === 'ellipse' || sh.type === 'polygon')) || grp;
  const goldenSection = showGolden ? `<div class="p-section">
    <div class="p-title">黄金比  φ = 1.618…</div>
    <div class="p-row">
      <span class="p-lbl-wide">W / H</span>
      <span id="golden-ratio-val" style="font-size:11px;font-weight:400;color:${gld ? 'var(--gold)' : '#aaa'}">${fmt2(b.w / b.h)}${gld ? '  ✦' : ''}</span>
    </div>
    <div class="p-row" style="flex-wrap:wrap;gap:3px">
      <button class="p-small-btn" id="btn-phi-wh" title="幅を高さ×φに変更">W = H×φ</button>
      <button class="p-small-btn" id="btn-phi-hw" title="高さを幅×φに変更">H = W×φ</button>
      <button class="p-small-btn" id="btn-phi-wd" title="幅を高さ÷φに変更">W = H÷φ</button>
      <button class="p-small-btn" id="btn-phi-hd" title="高さを幅÷φに変更">H = W÷φ</button>
    </div>
  </div>` : '';

  panel.innerHTML = `
    <div class="p-section">
      <div class="p-title">${label}</div>
      <div class="p-row"><span class="p-lbl">X</span>
        <input class="p-in" id="pi-x" type="number" value="${fmt(b.x)}" step="0.1"><span class="p-unit">mm</span></div>
      <div class="p-row"><span class="p-lbl">Y</span>
        <input class="p-in" id="pi-y" type="number" value="${fmt(b.y)}" step="0.1"><span class="p-unit">mm</span></div>
      <div class="p-row"><span class="p-lbl">W</span>
        <input class="p-in" id="pi-w" type="number" value="${fmt(b.w)}" step="0.1" min="0.1"><span class="p-unit">mm</span></div>
      <div class="p-row"><span class="p-lbl">H</span>
        <input class="p-in" id="pi-h" type="number" value="${fmt(b.h)}" step="0.1" min="0.1"><span class="p-unit">mm</span></div>
    </div>
    ${colorSection}
    ${goldenSection}
    <div class="p-section">
      <div class="p-title">部品</div>
      <div class="p-row">
        ${item.partNum != null
          ? `<span class="p-num-badge">${item.partNum}</span>`
          : `<span class="p-num-none">—</span>`}
        <button class="p-small-btn" id="pi-assign">${item.partNum != null ? '番号リセット' : '番号を割り当て'}</button>
      </div>
      <div class="p-row" style="flex-direction:column;align-items:stretch;gap:4px;margin-top:4px;">
        <span class="p-lbl-wide">メモ</span>
        <textarea class="p-in" id="pi-notes" rows="4" placeholder="根拠・仕様・メモ...">${item.notes || ''}</textarea>
      </div>
    </div>
  `;

  function numInput(elId, apply) {
    const e = document.getElementById(elId);
    if (!e) return;
    e.addEventListener('change', () => {
      const v = parseFloat(e.value);
      if (isNaN(v)) return;
      saveHistory(); apply(v); renderAll(); updatePanel();
    });
  }
  numInput('pi-x', v => { if (sh) sh.x = v; });
  numInput('pi-y', v => { if (sh) sh.y = v; });
  numInput('pi-w', v => { if (sh && (sh.type === 'rect' || sh.type === 'ellipse' || sh.type === 'polygon')) sh.w = v; });
  numInput('pi-h', v => { if (sh && (sh.type === 'rect' || sh.type === 'ellipse' || sh.type === 'polygon')) sh.h = v; });
  numInput('pi-sw', v => { if (sh) { sh.sw = v; renderAll(); persist(); } });
  numInput('pi-fs', v => { if (sh && sh.type === 'text') { sh.fs = v; renderAll(); persist(); } });

  const fillEl = document.getElementById('pi-fill');
  if (fillEl) fillEl.addEventListener('input', () => { if (sh) { sh.fill = fillEl.value; renderShapes(); persist(); } });
  const strokeEl = document.getElementById('pi-stroke');
  if (strokeEl) strokeEl.addEventListener('input', () => { if (sh) { sh.stroke = strokeEl.value; renderShapes(); persist(); } });

  const fillNoneEl = document.getElementById('pi-fill-none');
  if (fillNoneEl) fillNoneEl.addEventListener('change', () => {
    if (!sh) return;
    sh.fill = fillNoneEl.checked ? 'none' : (document.getElementById('pi-fill')?.value || '#ffffff');
    renderShapes(); persist(); updatePanel();
  });

  document.getElementById('pi-notes')?.addEventListener('input', e => { item.notes = e.target.value; persist(); });
  document.getElementById('pi-assign')?.addEventListener('click', () => {
    saveHistory();
    if (item.partNum != null) { item.partNum = null; } else { item.partNum = S.nextPart++; }
    renderAll(); updatePanel(); persist();
  });

  const phiSnap = (fn) => () => {
    if (!sh || (sh.type !== 'rect' && sh.type !== 'ellipse' && sh.type !== 'polygon')) return;
    saveHistory(); fn(); renderAll(); updatePanel();
  };
  document.getElementById('btn-phi-wh')?.addEventListener('click', phiSnap(() => { sh.w = sn(sh.h * PHI); }));
  document.getElementById('btn-phi-hw')?.addEventListener('click', phiSnap(() => { sh.h = sn(sh.w * PHI); }));
  document.getElementById('btn-phi-wd')?.addEventListener('click', phiSnap(() => { sh.w = sn(sh.h / PHI); }));
  document.getElementById('btn-phi-hd')?.addEventListener('click', phiSnap(() => { sh.h = sn(sh.w / PHI); }));
}

export function updatePanelCoords() {
  if (!S.selected.length) return;
  const b = selectionBbox();
  if (!b) return;
  const setVal = (id, v) => { const e = document.getElementById(id); if (e) e.value = fmt(v); };
  setVal('pi-x', b.x); setVal('pi-y', b.y); setVal('pi-w', b.w); setVal('pi-h', b.h);
  document.getElementById('st-size').textContent = `${fmt(b.w)} × ${fmt(b.h)} mm`;
}
