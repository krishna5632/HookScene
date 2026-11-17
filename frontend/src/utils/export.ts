import { Promo, Dataset } from '../types';

export function getHookText(p: Promo): string {
  if (typeof p.hook === 'string') return p.hook;
  return p.hook?.text || '';
}

export function getCliffText(p: Promo): string {
  if (typeof p.cliffhanger === 'string') return p.cliffhanger;
  return p.cliffhanger?.text || '';
}

export function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = (sec % 60).toFixed(2);
  return `${m.toString().padStart(2, '0')}:${parseFloat(s) < 10 ? '0' : ''}${s}`;
}

export function downloadBlob(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportMarkdown(data: Dataset): string {
  const all = [...(data.promos || []), ...(data.montages || [])];
  let md = `# ${data.show} — Ranked Promo Package\n\n`;
  md += `Extracted by HookScene Studio AI.\n\n`;

  all.forEach((p) => {
    const isM = p.kind === 'montage';
    const s0 = p.segments[0];
    const sEnd = p.segments[p.segments.length - 1];
    md += `## #${p.rank} [${isM ? 'Montage' : 'Single'}] Ep ${s0.episode} (${fmtTime(s0.start)} – ${fmtTime(sEnd.end)} · ${p.duration.toFixed(1)}s)\n\n`;
    md += `- **Hook**: "${getHookText(p)}"\n`;
    md += `- **Cliffhanger**: "${getCliffText(p)}"\n`;
    if (p.open_question) md += `- **Open Tension**: ${p.open_question}\n`;
    if (p.why) md += `- **Commercial Angle**: ${p.why}\n`;
    md += `\n`;
  });

  return md;
}

export function exportCsv(data: Dataset): string {
  const all = [...(data.promos || []), ...(data.montages || [])];
  const headers = ['Rank', 'Kind', 'Episode', 'Start_Sec', 'End_Sec', 'Duration_Sec', 'Hook', 'Cliffhanger', 'Attention_Hold'];
  const rows = all.map((p) => {
    const s0 = p.segments[0];
    const sEnd = p.segments[p.segments.length - 1];
    return [
      p.rank,
      p.kind || 'single',
      s0.episode,
      s0.start.toFixed(2),
      sEnd.end.toFixed(2),
      p.duration.toFixed(1),
      `"${getHookText(p).replace(/"/g, '""')}"`,
      `"${getCliffText(p).replace(/"/g, '""')}"`,
      ((p.attention?.hold || 0.8) * 100).toFixed(0) + '%',
    ].join(',');
  });
  return [headers.join(','), ...rows].join('\n');
}

export function exportEdl(data: Dataset): string {
  const all = [...(data.promos || []), ...(data.montages || [])];
  let edl = `TITLE: ${data.show}\nFCM: NON-DROP FRAME\n\n`;
  all.forEach((p, idx) => {
    const s0 = p.segments[0];
    const sEnd = p.segments[p.segments.length - 1];
    const i = (idx + 1).toString().padStart(3, '0');
    edl += `${i}  AX       V     C        ${fmtTime(s0.start).replace('.', ':')}:00 ${fmtTime(sEnd.end).replace('.', ':')}:00 00:00:00:00 ${fmtTime(p.duration).replace('.', ':')}:00\n`;
    edl += `* FROM CLIP: EP_${s0.episode}_PROMO_${p.rank}\n\n`;
  });
  return edl;
}
