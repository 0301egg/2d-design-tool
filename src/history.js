import { S } from './state.js';

export function saveHistory() {
  const snap = JSON.stringify({ shapes: S.shapes, groups: S.groups, nextId: S.nextId, nextPart: S.nextPart });
  S.history = S.history.slice(0, S.histIdx + 1);
  S.history.push(snap);
  if (S.history.length > 60) S.history.shift();
  S.histIdx = S.history.length - 1;
}

export function undoSnap() {
  if (S.histIdx <= 0) return false;
  S.histIdx--;
  const d = JSON.parse(S.history[S.histIdx]);
  S.shapes = d.shapes; S.groups = d.groups; S.nextId = d.nextId; S.nextPart = d.nextPart;
  S.selected = [];
  return true;
}

export function redoSnap() {
  if (S.histIdx >= S.history.length - 1) return false;
  S.histIdx++;
  const d = JSON.parse(S.history[S.histIdx]);
  S.shapes = d.shapes; S.groups = d.groups; S.nextId = d.nextId; S.nextPart = d.nextPart;
  S.selected = [];
  return true;
}
