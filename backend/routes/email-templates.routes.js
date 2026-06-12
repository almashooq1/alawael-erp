'use strict';

/**
 * email-templates.routes.js — W1242 (واجهة كتالوج القوالب البريدية)
 *
 *   GET  /                     — catalogue (key/title/category/variable contract)
 *   GET  /:key                 — template detail + variable contract + samples
 *   GET  /:key/preview         — rendered SAMPLE (html|text|json via ?format=)
 *   POST /:key/preview         — rendered with caller-supplied variables
 *                                (422 TEMPLATE_VARS_MISSING on contract gaps)
 *   POST /:key/test-send       — ADMIN: render + send to ONE explicit address
 *                                through the existing email facade (mock-mode
 *                                returns skipped:true — safe everywhere)
 *
 * READ-mostly; the only side effect is the explicit admin test-send.
 * Mounted via features.registry dualMountAuth at /api(/v1)/email-templates.
 */

const express = require('express');
const { authenticateToken, requireRole } = require('../middleware/auth');
const renderer = require('../services/email/templateRenderer.service');
const { listTemplates, getTemplate } = require('../intelligence/email-templates.registry');

const router = express.Router();

const READ_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'clinical_supervisor',
  'coordinator',
  'hr',
  'quality',
];
const SEND_ROLES = ['admin', 'superadmin', 'super_admin'];

router.use(authenticateToken);

function catalogueRow(t) {
  return {
    key: t.key,
    titleAr: t.titleAr,
    category: t.category,
    subjectAr: t.subjectAr,
    variables: Object.entries(t.variables || {}).map(([name, spec]) => ({
      name,
      required: !!spec.required,
      labelAr: spec.labelAr,
      sample: spec.sample,
    })),
  };
}

// ── GET / — catalogue ────────────────────────────────────────────────────────
router.get('/', requireRole(READ_ROLES), (_req, res) => {
  res.json({ success: true, data: listTemplates().map(catalogueRow) });
});

// ── GET /:key — detail ───────────────────────────────────────────────────────
router.get('/:key', requireRole(READ_ROLES), (req, res) => {
  const t = getTemplate(req.params.key);
  if (!t) return res.status(404).json({ success: false, message: 'قالب غير موجود' });
  res.json({ success: true, data: catalogueRow(t) });
});

// ── GET /:key/preview — sample render ───────────────────────────────────────
router.get('/:key/preview', requireRole(READ_ROLES), (req, res) => {
  try {
    const rendered = renderer.renderSample(req.params.key);
    const format = String(req.query.format || 'html').toLowerCase();
    if (format === 'json') return res.json({ success: true, data: rendered });
    if (format === 'text') return res.type('text/plain; charset=utf-8').send(rendered.text);
    return res.type('text/html; charset=utf-8').send(rendered.html);
  } catch (err) {
    return res
      .status(err.statusCode || 500)
      .json({ success: false, code: err.code, message: err.message });
  }
});

// ── POST /:key/preview — render with caller variables ───────────────────────
router.post('/:key/preview', requireRole(READ_ROLES), (req, res) => {
  try {
    const variables = req.body && typeof req.body.variables === 'object' ? req.body.variables : {};
    const rendered = renderer.renderTemplate(req.params.key, variables);
    return res.json({ success: true, data: rendered });
  } catch (err) {
    return res
      .status(err.statusCode || 500)
      .json({ success: false, code: err.code, missing: err.missing, message: err.message });
  }
});

// ── POST /:key/test-send — admin smoke (one explicit recipient) ─────────────
router.post('/:key/test-send', requireRole(SEND_ROLES), async (req, res) => {
  try {
    const to = req.body && req.body.to;
    if (!to || !/^[^@\s]+@[^@\s.]+(?:\.[^@\s.]+)+$/.test(String(to)))
      return res.status(400).json({ success: false, message: 'حقل to بريد صالح مطلوب' });

    const variables =
      req.body && typeof req.body.variables === 'object' && req.body.variables !== null
        ? req.body.variables
        : null;
    const rendered = variables
      ? renderer.renderTemplate(req.params.key, variables)
      : renderer.renderSample(req.params.key);

    const { sendEmail } = require('../services/emailService');
    const result = await sendEmail({
      to,
      subject: `[تجربة] ${rendered.subject}`,
      html: rendered.html,
      text: rendered.text,
    });
    return res.json({ success: true, data: { template: rendered.key, to, result } });
  } catch (err) {
    return res
      .status(err.statusCode || 500)
      .json({ success: false, code: err.code, missing: err.missing, message: err.message });
  }
});

module.exports = router;
