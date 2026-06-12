'use strict';

/**
 * templateRenderer.service.js — W1242 (محرّك عرض القوالب البريدية)
 *
 * Renders intelligence/email-templates.registry.js entries into production
 * email payloads: { subject, html, text }. Owns 100% of the HTML so every
 * template shares ONE polished, email-client-safe layout:
 *
 *  - RTL/Arabic first: dir="rtl" lang="ar", system Arabic font stack.
 *  - Table-based 600px layout (Gmail/Outlook-safe), bulletproof CTA button,
 *    hidden preheader, brand header + compliance footer.
 *  - SMART + SAFE:
 *      • variable CONTRACT enforcement — a render with missing required
 *        variables THROWS (code TEMPLATE_VARS_MISSING) so no half-filled
 *        email ever leaves the system (refuse-to-fabricate);
 *      • every interpolated value is HTML-escaped (user-content injection
 *        can't break layout or smuggle markup);
 *      • automatic plain-text alternative generated from the same blocks
 *        (deliverability + accessibility).
 *
 * Pure module: no transport, no DB. EmailManager/callers pass the rendered
 * payload to their existing send() — this is the formatting layer the 55
 * scattered inline-HTML call sites can converge on.
 */

const {
  getTemplate,
  listTemplates,
  BLOCK_TYPES,
  PANEL_TONES,
} = require('../../intelligence/email-templates.registry');

const BRAND = Object.freeze({
  nameAr: 'مراكز الأوائل للتأهيل',
  primary: '#1B4A8A',
  primaryDark: '#143A6E',
  paper: '#F6F4EF',
  ink: '#2E2A26',
  inkSoft: '#6B5F55',
  line: '#E7DFD2',
  success: '#2F7D4F',
  successBg: '#EAF6EE',
  info: '#1B4A8A',
  infoBg: '#EEF4FB',
  warning: '#9A6B15',
  warningBg: '#FBF3E0',
  danger: '#A6453B',
  dangerBg: '#FBEAEA',
});

const VAR_RE = /\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/g;

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Interpolate {{vars}} into a string. html=true escapes each value. */
function interpolate(str, variables, { html }) {
  return String(str).replace(VAR_RE, (_m, name) => {
    const v = variables[name];
    if (v === undefined || v === null) return '';
    return html ? escapeHtml(v) : String(v);
  });
}

/**
 * Enforce the template's variable contract.
 * @returns {{ok:true}|never} throws Error(code=TEMPLATE_VARS_MISSING) listing gaps.
 */
function validateVariables(template, variables = {}) {
  const missing = [];
  for (const [name, spec] of Object.entries(template.variables || {})) {
    if (!spec.required) continue;
    const v = variables[name];
    if (v === undefined || v === null || String(v).trim() === '') missing.push(name);
  }
  if (missing.length) {
    const err = new Error(
      `TEMPLATE_VARS_MISSING: قالب ${template.key} ينقصه متغيرات إلزامية: ${missing.join(', ')}`
    );
    err.code = 'TEMPLATE_VARS_MISSING';
    err.missing = missing;
    err.statusCode = 422;
    throw err;
  }
  return { ok: true };
}

/* ─────────────────────────── block renderers (HTML) ─────────────────────── */

function toneColors(tone) {
  switch (tone) {
    case 'success':
      return { fg: BRAND.success, bg: BRAND.successBg };
    case 'warning':
      return { fg: BRAND.warning, bg: BRAND.warningBg };
    case 'danger':
      return { fg: BRAND.danger, bg: BRAND.dangerBg };
    default:
      return { fg: BRAND.info, bg: BRAND.infoBg };
  }
}

function renderBlockHtml(block, vars) {
  const P = (s) => interpolate(s, vars, { html: true });
  switch (block.type) {
    case 'greeting':
      return `<p style="margin:0 0 14px;font-size:16px;font-weight:700;color:${BRAND.ink};">${P(block.ar)}</p>`;
    case 'paragraph':
      return `<p style="margin:0 0 14px;font-size:14px;line-height:1.9;color:${BRAND.ink};">${P(block.ar)}</p>`;
    case 'panel': {
      const { fg, bg } = toneColors(block.tone);
      return (
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;">` +
        `<tr><td style="background:${bg};border-right:4px solid ${fg};border-radius:8px;padding:14px 16px;` +
        `font-size:14px;line-height:1.9;color:${BRAND.ink};">${P(block.ar)}</td></tr></table>`
      );
    }
    case 'kv': {
      const rows = (block.rows || [])
        .map((r) => {
          const value = P(r.value);
          if (!value) return '';
          return (
            `<tr>` +
            `<td style="padding:8px 12px;background:${BRAND.paper};border-bottom:1px solid ${BRAND.line};` +
            `font-size:13px;color:${BRAND.inkSoft};white-space:nowrap;">${escapeHtml(r.labelAr)}</td>` +
            `<td style="padding:8px 12px;border-bottom:1px solid ${BRAND.line};font-size:13px;` +
            `font-weight:600;color:${BRAND.ink};">${value}</td></tr>`
          );
        })
        .join('');
      if (!rows) return '';
      return (
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" ` +
        `style="margin:0 0 16px;border:1px solid ${BRAND.line};border-radius:8px;border-collapse:separate;overflow:hidden;">` +
        rows +
        `</table>`
      );
    }
    case 'cta': {
      const url = vars[block.urlVar];
      if (!url) return '';
      const safeUrl = escapeHtml(url);
      return (
        `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:6px auto 18px;">` +
        `<tr><td style="background:${BRAND.primary};border-radius:8px;">` +
        `<a href="${safeUrl}" target="_blank" ` +
        `style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:700;color:#ffffff;` +
        `text-decoration:none;border-radius:8px;">${escapeHtml(block.labelAr)}</a>` +
        `</td></tr></table>`
      );
    }
    case 'divider':
      return `<hr style="border:none;border-top:1px solid ${BRAND.line};margin:18px 0;" />`;
    default:
      return '';
  }
}

/* ─────────────────────────── block renderers (text) ─────────────────────── */

function renderBlockText(block, vars) {
  const P = (s) => interpolate(s, vars, { html: false });
  switch (block.type) {
    case 'greeting':
    case 'paragraph':
      return P(block.ar);
    case 'panel':
      return `» ${P(block.ar)}`;
    case 'kv':
      return (block.rows || [])
        .map((r) => {
          const v = P(r.value);
          return v ? `- ${r.labelAr}: ${v}` : '';
        })
        .filter(Boolean)
        .join('\n');
    case 'cta': {
      const url = vars[block.urlVar];
      return url ? `${block.labelAr}: ${url}` : '';
    }
    case 'divider':
      return '----------------------------------------';
    default:
      return '';
  }
}

/* ─────────────────────────── the shared layout ───────────────────────────── */

function wrapLayout({ bodyHtml, preheader, titleAr }) {
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<title>${escapeHtml(titleAr)}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.paper};">
<span style="display:none!important;visibility:hidden;opacity:0;height:0;width:0;overflow:hidden;mso-hide:all;">${escapeHtml(preheader || '')}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.paper};">
<tr><td align="center" style="padding:24px 12px;">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
    <tr><td style="background:linear-gradient(135deg,${BRAND.primary},${BRAND.primaryDark});background-color:${BRAND.primary};border-radius:12px 12px 0 0;padding:22px 28px;text-align:right;">
      <div style="font-family:'Segoe UI',Tahoma,Arial,sans-serif;font-size:20px;font-weight:800;color:#ffffff;">${escapeHtml(BRAND.nameAr)}</div>
      <div style="font-family:'Segoe UI',Tahoma,Arial,sans-serif;font-size:12px;color:#D7E3F4;margin-top:2px;">${escapeHtml(titleAr)}</div>
    </td></tr>
    <tr><td style="background:#ffffff;padding:28px;border:1px solid ${BRAND.line};border-top:none;font-family:'Segoe UI',Tahoma,Arial,sans-serif;text-align:right;">
      ${bodyHtml}
    </td></tr>
    <tr><td style="background:#ffffff;border:1px solid ${BRAND.line};border-top:1px dashed ${BRAND.line};border-radius:0 0 12px 12px;padding:16px 28px;font-family:'Segoe UI',Tahoma,Arial,sans-serif;text-align:center;">
      <div style="font-size:11px;color:${BRAND.inkSoft};line-height:1.8;">
        هذه رسالة آلية من منصة ${escapeHtml(BRAND.nameAr)} — يرجى عدم الرد عليها مباشرة.<br/>
        © ${year} ${escapeHtml(BRAND.nameAr)}. جميع الحقوق محفوظة.
      </div>
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`;
}

/* ─────────────────────────── public API ──────────────────────────────────── */

/**
 * Render a registry template with real variables.
 * @returns {{key, category, subject, subjectEn, html, text}}
 * @throws Error(code=TEMPLATE_NOT_FOUND|TEMPLATE_VARS_MISSING)
 */
function renderTemplate(key, variables = {}) {
  const template = getTemplate(key);
  if (!template) {
    const err = new Error(`TEMPLATE_NOT_FOUND: لا يوجد قالب بالمفتاح ${key}`);
    err.code = 'TEMPLATE_NOT_FOUND';
    err.statusCode = 404;
    throw err;
  }
  validateVariables(template, variables);

  const subject = interpolate(template.subjectAr, variables, { html: false });
  const subjectEn = template.subjectEn
    ? interpolate(template.subjectEn, variables, { html: false })
    : null;
  const preheader = template.preheaderAr
    ? interpolate(template.preheaderAr, variables, { html: false })
    : '';

  const bodyHtml = template.blocks.map((b) => renderBlockHtml(b, variables)).join('\n');
  const html = wrapLayout({ bodyHtml, preheader, titleAr: template.titleAr });

  const text =
    template.blocks
      .map((b) => renderBlockText(b, variables))
      .filter(Boolean)
      .join('\n\n') + `\n\n—\n${BRAND.nameAr}`;

  return { key: template.key, category: template.category, subject, subjectEn, html, text };
}

/** Render using the registry's sample values (for previews/catalogue). */
function renderSample(key) {
  const template = getTemplate(key);
  if (!template) {
    const err = new Error(`TEMPLATE_NOT_FOUND: ${key}`);
    err.code = 'TEMPLATE_NOT_FOUND';
    err.statusCode = 404;
    throw err;
  }
  const samples = {};
  for (const [name, spec] of Object.entries(template.variables || {})) {
    samples[name] = spec.sample;
  }
  return renderTemplate(key, samples);
}

module.exports = {
  BRAND,
  escapeHtml,
  interpolate,
  validateVariables,
  renderTemplate,
  renderSample,
  listTemplates,
  BLOCK_TYPES,
  PANEL_TONES,
};
