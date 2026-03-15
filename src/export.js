import { S } from './state.js';
import { bbox } from './geometry.js';
import jsPDF from 'jspdf';

function hexToRgb(hex) {
  if (!hex || hex === 'none') return null;
  hex = hex.replace('#', '');
  return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
}

export function exportPDF() {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

  for (const s of S.shapes) {
    const fillRgb   = hexToRgb(s.fill);
    const strokeRgb = hexToRgb(s.stroke);
    if (fillRgb)   doc.setFillColor(...fillRgb);   else doc.setFillColor(255, 255, 255);
    if (strokeRgb) doc.setDrawColor(...strokeRgb); else doc.setDrawColor(0, 0, 0);
    if (s.sw > 0)  doc.setLineWidth(s.sw);         else doc.setLineWidth(0.01);
    const style = (s.fill !== 'none' && fillRgb) ? (s.sw > 0 ? 'FD' : 'F') : 'S';

    if (s.type === 'rect') {
      doc.rect(s.x, s.y, s.w, s.h, style);
    } else if (s.type === 'ellipse') {
      doc.ellipse(s.x + s.w / 2, s.y + s.h / 2, s.w / 2, s.h / 2, style);
    } else if (s.type === 'polygon') {
      const cx = s.x + s.w / 2, cy = s.y + s.h / 2, rx = s.w / 2, ry = s.h / 2, n = s.sides;
      const pts = [];
      for (let i = 0; i < n; i++) {
        const angle = (2 * Math.PI * i / n) - Math.PI / 2;
        pts.push([cx + rx * Math.cos(angle), cy + ry * Math.sin(angle)]);
      }
      doc.lines(pts.slice(1).map((pt, i) => [pt[0] - pts[i][0], pt[1] - pts[i][1]]), pts[0][0], pts[0][1], [1, 1], style, true);
    } else if (s.type === 'line') {
      if (strokeRgb) doc.setDrawColor(...strokeRgb);
      doc.setLineWidth(s.sw || 0.3);
      doc.line(s.x1, s.y1, s.x2, s.y2);
    } else if (s.type === 'path') {
      if (strokeRgb) doc.setDrawColor(...strokeRgb);
      doc.setLineWidth(s.sw || 0.3);
      if (s.pts && s.pts.length >= 2) {
        doc.lines(
          s.pts.slice(1).map((pt, i) => [pt.x - s.pts[i].x, pt.y - s.pts[i].y]),
          s.pts[0].x, s.pts[0].y, [1, 1], 'S', false
        );
      }
    } else if (s.type === 'text') {
      const rgb = hexToRgb(s.fill);
      if (rgb) doc.setTextColor(...rgb);
      doc.setFontSize(s.fs * 2.835);
      doc.text(s.text, s.x, s.y);
    }
  }

  for (const s of S.shapes) {
    if (s.partNum == null) continue;
    const b = bbox(s);
    doc.setFillColor(26, 26, 26);
    doc.circle(b.x + 2.5, b.y + 2.5, 2.5, 'F');
    doc.setTextColor(250, 249, 247);
    doc.setFontSize(6);
    doc.text(String(s.partNum), b.x + 2.5, b.y + 3.2, { align: 'center' });
  }

  doc.save('design.pdf');
}
