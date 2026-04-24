/**
 * dashboardSnapshotRenderer.service.js — renders a dashboard
 * payload as HTML / plain-text / Markdown snapshots for scheduled
 * delivery (Phase 18 Commit 5).
 *
 * No PDF generation here — the renderer ships HTML that existing
 * email infrastructure can embed directly, plus a plain-text
 * fallback for SMS + terse Arabic markdown for WhatsApp. Teams that
 * want a PDF wire the HTML output into a headless renderer at the
 * notification layer, not here.
 *
 * Pure functions: `(payload) → { html, text, markdown, subject }`.
 */

'use strict';

function fmtValue(kpi) {
  if (kpi.value === null || kpi.value === undefined) return '—';
  const v = kpi.value;
  switch (kpi.unit) {
    case 'percent':
      return `${Number(v).toFixed(1)}%`;
    case 'currency_sar':
      return `${new Intl.NumberFormat('en-US').format(Math.round(v))} SAR`;
    case 'days':
      return `${Number(v).toFixed(1)} days`;
    case 'hours':
      return `${Number(v).toFixed(1)} h`;
    default:
      return String(v);
  }
}

function fmtDelta(delta) {
  if (typeof delta !== 'number' || Number.isNaN(delta)) return '';
  const sign = delta >= 0 ? '+' : '';
  return `${sign}${(delta * 100).toFixed(1)}%`;
}

function classBadge(classification) {
  switch (classification) {
    case 'red':
      return '🔴';
    case 'amber':
      return '🟠';
    case 'green':
      return '🟢';
    default:
      return '⚪';
  }
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderSubject(payload) {
  const d = payload.dashboard || {};
  return `[Dashboard] ${d.titleEn || d.titleAr || d.id} — ${payload.asOf || 'now'}`;
}

function renderHtml(payload) {
  const d = payload.dashboard || {};
  const heroes = payload.heroKpis || [];
  const narrative = payload.narrative || null;

  const kpiRows = heroes
    .map(k => {
      const badge = classBadge(k.classification);
      const delta = fmtDelta(k.delta);
      const nameAr = escapeHtml(k.nameAr || k.id);
      const nameEn = escapeHtml(k.nameEn || '');
      return `<tr>
  <td style="padding:8px 12px;font-size:14px;">${badge} <strong>${nameAr}</strong><br/><small style="color:#6b7280">${nameEn}</small></td>
  <td style="padding:8px 12px;font-size:14px;text-align:right;">${escapeHtml(fmtValue(k))}</td>
  <td style="padding:8px 12px;font-size:12px;text-align:right;color:${k.delta == null ? '#9ca3af' : k.delta >= 0 ? '#059669' : '#dc2626'};">${escapeHtml(delta)}</td>
</tr>`;
    })
    .join('\n');

  const narrativeBlock = narrative
    ? `<div style="margin-top:20px;padding:14px;border:1px solid #e5e7eb;background:#f9fafb;border-radius:6px;">
  <strong style="font-size:14px;">${escapeHtml(narrative.headlineAr)}</strong>
  <p style="margin:6px 0 0;color:#4b5563;font-size:12px;">${escapeHtml(narrative.headlineEn)}</p>
  ${(narrative.paragraphsAr || [])
    .map(p => `<p style="font-size:13px;margin:6px 0;color:#374151;">${escapeHtml(p)}</p>`)
    .join('')}
  <p style="margin-top:8px;font-size:11px;color:#6b7280;">Confidence: ${escapeHtml(narrative.confidence)}${narrative.source === 'llm' ? ' · AI-generated' : ''}</p>
</div>`
    : '';

  return `<!doctype html>
<html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>${escapeHtml(renderSubject(payload))}</title></head>
<body style="font-family:system-ui,Arial,sans-serif;color:#111827;background:#fff;margin:0;padding:24px;">
<h1 style="margin:0 0 4px;font-size:20px;">${escapeHtml(d.titleAr || d.id)}</h1>
<p style="margin:0 0 16px;color:#6b7280;font-size:13px;">${escapeHtml(d.titleEn || '')} · ${escapeHtml(payload.asOf || '')}</p>
<table style="border-collapse:collapse;width:100%;border:1px solid #e5e7eb;">
  <thead><tr style="background:#f3f4f6;"><th style="padding:8px 12px;text-align:right;font-size:12px;color:#374151;">المؤشر</th><th style="padding:8px 12px;text-align:right;font-size:12px;color:#374151;">القيمة</th><th style="padding:8px 12px;text-align:right;font-size:12px;color:#374151;">Δ</th></tr></thead>
  <tbody>${kpiRows}</tbody>
</table>
${narrativeBlock}
</body></html>`;
}

function renderText(payload) {
  const d = payload.dashboard || {};
  const heroes = payload.heroKpis || [];
  const narrative = payload.narrative || null;
  const lines = [];
  lines.push(`${d.titleAr || d.id}`);
  if (d.titleEn) lines.push(d.titleEn);
  lines.push(`As of: ${payload.asOf || 'now'}`);
  lines.push('---');
  for (const k of heroes) {
    const badge = classBadge(k.classification);
    lines.push(`${badge} ${k.nameAr || k.id}: ${fmtValue(k)} ${fmtDelta(k.delta)}`.trim());
  }
  if (narrative) {
    lines.push('');
    lines.push(narrative.headlineAr);
    for (const p of narrative.paragraphsAr || []) lines.push(p);
  }
  return lines.join('\n');
}

function renderMarkdown(payload) {
  const d = payload.dashboard || {};
  const heroes = payload.heroKpis || [];
  const narrative = payload.narrative || null;
  const lines = [];
  lines.push(`## ${d.titleAr || d.id}`);
  if (d.titleEn) lines.push(`*${d.titleEn}*`);
  lines.push(`_As of: ${payload.asOf || 'now'}_`);
  lines.push('');
  lines.push('| المؤشر | القيمة | Δ |');
  lines.push('|---|---:|---:|');
  for (const k of heroes) {
    const badge = classBadge(k.classification);
    lines.push(`| ${badge} ${k.nameAr || k.id} | ${fmtValue(k)} | ${fmtDelta(k.delta) || '—'} |`);
  }
  if (narrative) {
    lines.push('');
    lines.push(`**${narrative.headlineAr}**`);
    for (const p of narrative.paragraphsAr || []) lines.push(p);
  }
  return lines.join('\n');
}

function render(payload) {
  return {
    subject: renderSubject(payload),
    html: renderHtml(payload),
    text: renderText(payload),
    markdown: renderMarkdown(payload),
  };
}

module.exports = { render, renderHtml, renderText, renderMarkdown, renderSubject };
