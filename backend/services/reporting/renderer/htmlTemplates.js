/**
 * htmlTemplates.js — per-report HTML template registry + generic
 * fallback for the reporting renderer.
 *
 * Phase 10 Commit 3.
 *
 * Each template is a **function** of `(doc, ctx)` returning
 * `{ subject, bodyHtml, bodyText }`. No external template engine: we
 * use tagged template literals with an `h()` helper that escapes
 * interpolated values, and we build the full HTML inline. This keeps
 * templates type-checked (plain JS), fast (no runtime compilation),
 * and avoids adding Handlebars/Mustache as dependencies.
 *
 * ctx provides translator + formatters + recipient + locale — see the
 * renderer orchestrator for its exact shape.
 *
 * Templates by reportId:
 *   - ben.progress.weekly        → renderFamilyUpdate (real)
 *   - ben.progress.monthly       → renderFamilyUpdate (real)
 *   - ben.goal.achievement       → renderDisciplineReportCard (real)
 *   - ben.irp.snapshot           → renderIrpSnapshot (real)
 *   - ben.discharge.summary      → renderDischargeSummary (real)
 *   - ben.review.compliance      → renderReviewCompliance (real)
 *   - <any other>                → renderGeneric (fallback)
 */

'use strict';

const { escapeHtml } = require('./formatters');

// ─── Tiny template helpers ────────────────────────────────────────

/** `h` tag: escapes interpolated values, leaves literal HTML alone. */
function h(strings, ...values) {
  let out = '';
  for (let i = 0; i < strings.length; i++) {
    out += strings[i];
    if (i < values.length) {
      const v = values[i];
      if (Array.isArray(v)) out += v.join('');
      else if (v == null) out += '';
      else out += escapeHtml(v);
    }
  }
  return out;
}

/** `raw` tag: leaves interpolated values untouched — for composing HTML from other templates. */
function raw(strings, ...values) {
  let out = '';
  for (let i = 0; i < strings.length; i++) {
    out += strings[i];
    if (i < values.length) {
      const v = values[i];
      if (Array.isArray(v)) out += v.join('');
      else if (v == null) out += '';
      else out += String(v);
    }
  }
  return out;
}

function htmlShell({ locale, confidentiality, title, bodyHtml, footerHtml }) {
  const dir = locale === 'en' ? 'ltr' : 'rtl';
  const lang = locale === 'en' ? 'en' : 'ar';
  const font =
    locale === 'ar'
      ? '"Segoe UI", "Tahoma", "Arial", sans-serif'
      : '"Segoe UI", "Helvetica Neue", "Arial", sans-serif';
  const bannerConfidential =
    confidentiality === 'confidential' || confidentiality === 'restricted'
      ? `<div class="rb-banner rb-banner-${escapeHtml(confidentiality)}">${escapeHtml(confidentiality === 'confidential' ? 'Confidential — do not redistribute' : 'Restricted')}</div>`
      : '';
  return raw`<!doctype html>
<html lang="${lang}" dir="${dir}">
<head>
<meta charset="utf-8">
<title>${escapeHtml(title || '')}</title>
<style>
  body { font-family: ${font}; color: #1a1a1a; line-height: 1.55; margin: 24px; }
  .rb-wrap { max-width: 760px; margin: 0 auto; }
  .rb-banner { padding: 8px 12px; border-radius: 4px; font-size: 12px; margin-bottom: 16px; }
  .rb-banner-confidential { background: #b91c1c; color: #fff; }
  .rb-banner-restricted { background: #b45309; color: #fff; }
  h1 { font-size: 22px; margin: 0 0 4px 0; }
  h2 { font-size: 16px; margin: 16px 0 8px 0; color: #374151; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
  .rb-meta { color: #6b7280; font-size: 13px; margin-bottom: 16px; }
  table { border-collapse: collapse; width: 100%; font-size: 14px; }
  th, td { text-align: ${dir === 'rtl' ? 'right' : 'left'}; padding: 6px 8px; border-bottom: 1px solid #f1f5f9; }
  th { background: #f8fafc; font-weight: 600; }
  .rb-list { margin: 0; padding-inline-start: 20px; }
  .rb-footer { margin-top: 24px; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 12px; }
  .rb-kpi { display: inline-block; margin: 4px 8px 4px 0; padding: 6px 10px; background: #f1f5f9; border-radius: 4px; font-size: 13px; }
  .rb-trend-improving { color: #166534; }
  .rb-trend-declining { color: #b91c1c; }
  .rb-trend-stable { color: #374151; }
</style>
</head>
<body><div class="rb-wrap">${bannerConfidential}${bodyHtml}${footerHtml || ''}</div></body>
</html>`;
}

// ─── Generic fallback template ────────────────────────────────────

function renderGeneric(doc, ctx) {
  const { report, t, getReportKey, locale, formatters, recipient } = ctx;
  const f = formatters;
  const subject = t(getReportKey(report.id, 'subject'), locale, {
    beneficiaryName:
      (recipient && recipient.beneficiaryName) ||
      (doc && doc.beneficiary && doc.beneficiary.fullName) ||
      '',
    period: f.formatPeriodKey(doc && doc.periodKey, { locale }),
  });
  const headline = t(getReportKey(report.id, 'headline'), locale);

  const metaRows = [
    [t('common.period', locale), f.formatPeriodKey(doc && doc.periodKey, { locale })],
    [t('common.generatedAt', locale), f.formatDate(doc && doc.generatedAt, { locale })],
  ]
    .filter(([, v]) => v && v !== '—')
    .map(([k, v]) => h`<div class="rb-kpi"><strong>${k}:</strong> ${v}</div>`)
    .join('');

  // Try to surface any "summary" block the builder produced.
  const summary = (doc && doc.summary) || {};
  const items = Array.isArray(summary.items) ? summary.items : [];
  const itemsHtml = items.length
    ? raw`<ul class="rb-list">${items.map(i => h`<li>${typeof i === 'string' ? i : JSON.stringify(i)}</li>`).join('')}</ul>`
    : h`<p>${t('common.no_data', locale)}</p>`;

  const stubNotice =
    doc && doc.status === 'stub' ? h`<p><em>${t('stub.placeholder_notice', locale)}</em></p>` : '';

  const bodyHtml = raw`
    <h1>${h`${headline}`}</h1>
    <div class="rb-meta">${metaRows}</div>
    ${stubNotice}
    <h2>${h`${t('common.no_data', locale) === (items.length ? '' : t('common.no_data', locale)) ? 'Summary' : 'Summary'}`}</h2>
    ${itemsHtml}
  `;

  const bodyText = [
    headline,
    `${t('common.period', locale)}: ${f.formatPeriodKey(doc && doc.periodKey, { locale })}`,
    items.length
      ? items.map(i => `- ${typeof i === 'string' ? i : JSON.stringify(i)}`).join('\n')
      : t('common.no_data', locale),
  ].join('\n\n');

  const footerHtml = h`<div class="rb-footer">${t('common.farewell', locale)}</div>`;

  return {
    subject,
    bodyHtml: htmlShell({
      locale,
      confidentiality: report.confidentiality,
      title: subject,
      bodyHtml,
      footerHtml,
    }),
    bodyText,
  };
}

// ─── Real builders' templates ─────────────────────────────────────

function renderFamilyUpdate(doc, ctx) {
  const { report, t, getReportKey, locale, formatters, recipient } = ctx;
  const f = formatters;
  const subject = t(getReportKey(report.id, 'subject'), locale, {
    beneficiaryName:
      (doc && doc.beneficiary && doc.beneficiary.fullName) ||
      (recipient && recipient.beneficiaryName) ||
      '',
  });
  const greetingName =
    (recipient && (recipient.fullName || recipient.name)) || (doc && doc.guardianName) || '';

  const highlights = Array.isArray(doc && doc.highlights) ? doc.highlights : [];
  const concerns = Array.isArray(doc && doc.concerns) ? doc.concerns : [];
  const trendKey =
    doc && doc.overallTrend === 'improving'
      ? 'reports.ben.progress.weekly.trend_improving'
      : doc && doc.overallTrend === 'declining'
        ? 'reports.ben.progress.weekly.trend_declining'
        : 'reports.ben.progress.weekly.trend_stable';
  const trendText = t(trendKey.split('.'), locale);
  const trendClass =
    doc && doc.overallTrend === 'improving'
      ? 'rb-trend-improving'
      : doc && doc.overallTrend === 'declining'
        ? 'rb-trend-declining'
        : 'rb-trend-stable';

  const bodyHtml = raw`
    <h1>${h`${t(getReportKey(report.id, 'headline'), locale)}`}</h1>
    <div class="rb-meta">${h`${t('common.greeting_guardian', locale, { name: greetingName })}`}</div>
    <div class="rb-meta">
      <span class="rb-kpi"><strong>${h`${t('common.beneficiary', locale)}`}:</strong> ${h`${(doc && doc.beneficiary && doc.beneficiary.fullName) || ''}`}</span>
      <span class="rb-kpi"><strong>${h`${t('common.period', locale)}`}:</strong> ${h`${f.formatPeriodKey(doc && doc.periodKey, { locale })}`}</span>
      <span class="rb-kpi ${trendClass}"><strong>${h`${t(getReportKey(report.id, 'overall_trend'), locale)}`}:</strong> ${h`${trendText}`}</span>
    </div>
    <h2>${h`${t(getReportKey(report.id, 'highlights_header'), locale)}`}</h2>
    ${
      highlights.length
        ? raw`<ul class="rb-list">${highlights.map(x => h`<li>${typeof x === 'string' ? x : x.text || ''}</li>`).join('')}</ul>`
        : h`<p>${t('common.no_data', locale)}</p>`
    }
    <h2>${h`${t(getReportKey(report.id, 'concerns_header'), locale)}`}</h2>
    ${
      concerns.length
        ? raw`<ul class="rb-list">${concerns.map(x => h`<li>${typeof x === 'string' ? x : x.text || ''}</li>`).join('')}</ul>`
        : h`<p>${t('common.no_data', locale)}</p>`
    }
  `;

  const bodyText = [
    t(getReportKey(report.id, 'headline'), locale),
    t('common.greeting_guardian', locale, { name: greetingName }),
    `${t('common.beneficiary', locale)}: ${(doc && doc.beneficiary && doc.beneficiary.fullName) || ''}`,
    `${t('common.period', locale)}: ${f.formatPeriodKey(doc && doc.periodKey, { locale })}`,
    `${t(getReportKey(report.id, 'overall_trend'), locale)}: ${trendText}`,
    '',
    `${t(getReportKey(report.id, 'highlights_header'), locale)}:`,
    highlights.length
      ? highlights.map(x => `- ${typeof x === 'string' ? x : x.text || ''}`).join('\n')
      : t('common.no_data', locale),
    '',
    `${t(getReportKey(report.id, 'concerns_header'), locale)}:`,
    concerns.length
      ? concerns.map(x => `- ${typeof x === 'string' ? x : x.text || ''}`).join('\n')
      : t('common.no_data', locale),
  ].join('\n');

  return {
    subject,
    bodyHtml: htmlShell({
      locale,
      confidentiality: report.confidentiality,
      title: subject,
      bodyHtml,
      footerHtml: h`<div class="rb-footer">${t('common.farewell', locale)}</div>`,
    }),
    bodyText,
  };
}

function renderDisciplineReportCard(doc, ctx) {
  const { report, t, getReportKey, locale, formatters } = ctx;
  const f = formatters;
  const disciplines = Array.isArray(doc && doc.disciplines) ? doc.disciplines : [];
  const subject = t(getReportKey(report.id, 'subject'), locale, {
    beneficiaryName: (doc && doc.beneficiary && doc.beneficiary.fullName) || '',
  });

  const rows = disciplines
    .map(
      d =>
        h`<tr>
          <td>${d.disciplineId || d.name || ''}</td>
          <td>${f.formatNumber(d.goalsAchieved, { locale })}</td>
          <td>${f.formatNumber(d.goalsInProgress, { locale })}</td>
          <td>${f.formatNumber(d.goalsNotStarted, { locale })}</td>
          <td>${f.formatPercent(d.achievementRate, { locale })}</td>
        </tr>`
    )
    .join('');

  const bodyHtml = raw`
    <h1>${h`${t(getReportKey(report.id, 'headline'), locale)}`}</h1>
    <div class="rb-meta">
      <span class="rb-kpi"><strong>${h`${t('common.beneficiary', locale)}`}:</strong> ${h`${(doc && doc.beneficiary && doc.beneficiary.fullName) || ''}`}</span>
      <span class="rb-kpi"><strong>${h`${t('common.period', locale)}`}:</strong> ${h`${f.formatPeriodKey(doc && doc.periodKey, { locale })}`}</span>
    </div>
    <table>
      <thead>
        <tr>
          <th>${h`${t(getReportKey(report.id, 'discipline_header'), locale)}`}</th>
          <th>${h`${t(getReportKey(report.id, 'achieved'), locale)}`}</th>
          <th>${h`${t(getReportKey(report.id, 'in_progress'), locale)}`}</th>
          <th>${h`${t(getReportKey(report.id, 'not_started'), locale)}`}</th>
          <th>%</th>
        </tr>
      </thead>
      <tbody>${rows || h`<tr><td colspan="5">${t('common.no_data', locale)}</td></tr>`}</tbody>
    </table>
  `;

  const bodyText = [
    t(getReportKey(report.id, 'headline'), locale),
    `${t('common.beneficiary', locale)}: ${(doc && doc.beneficiary && doc.beneficiary.fullName) || ''}`,
    `${t('common.period', locale)}: ${f.formatPeriodKey(doc && doc.periodKey, { locale })}`,
    ...disciplines.map(
      d =>
        `- ${d.disciplineId || d.name}: ${f.formatNumber(d.goalsAchieved, { locale })}/${f.formatNumber(d.goalsInProgress, { locale })}/${f.formatNumber(d.goalsNotStarted, { locale })} (${f.formatPercent(d.achievementRate, { locale })})`
    ),
  ].join('\n');

  return {
    subject,
    bodyHtml: htmlShell({
      locale,
      confidentiality: report.confidentiality,
      title: subject,
      bodyHtml,
      footerHtml: h`<div class="rb-footer">${t('common.farewell', locale)}</div>`,
    }),
    bodyText,
  };
}

// Thin specializations that reuse renderGeneric today — each real
// builder gets its own template as Phase-10-C7 delivers them.
function renderIrpSnapshot(doc, ctx) {
  return renderGeneric(doc, ctx);
}
function renderDischargeSummary(doc, ctx) {
  return renderGeneric(doc, ctx);
}
function renderReviewCompliance(doc, ctx) {
  return renderGeneric(doc, ctx);
}

// ─── Registry ─────────────────────────────────────────────────────

const REGISTRY = {
  'ben.progress.weekly': renderFamilyUpdate,
  'ben.progress.monthly': renderFamilyUpdate,
  'ben.goal.achievement': renderDisciplineReportCard,
  'ben.irp.snapshot': renderIrpSnapshot,
  'ben.discharge.summary': renderDischargeSummary,
  'ben.review.compliance': renderReviewCompliance,
};

function pickTemplate(reportId) {
  return REGISTRY[reportId] || renderGeneric;
}

module.exports = {
  pickTemplate,
  renderGeneric,
  renderFamilyUpdate,
  renderDisciplineReportCard,
  renderIrpSnapshot,
  renderDischargeSummary,
  renderReviewCompliance,
  htmlShell,
  h,
  raw,
};
