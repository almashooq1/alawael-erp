/**
 * gov-integrations.routes.js — Saudi government integrations control panel.
 *
 * Mount at /api/admin/gov-integrations. Distinct from the existing
 * integrations.routes.js which handles webhooks/Zapier.
 *
 * Endpoints:
 *   GET  /status                       — config + health for all gov adapters
 *   POST /:provider/test-connection    — run a live connectivity check
 *   POST /:provider/verify-sample      — run a sample verification
 *
 * Providers: gosi, scfhs, absher, qiwa, nafath.
 */

'use strict';

const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const safeError = require('../utils/safeError');

const gosi = require('../services/gosiAdapter');
const scfhs = require('../services/scfhsAdapter');
const absher = require('../services/absherAdapter');
const qiwa = require('../services/qiwaAdapter');
const nafathAdapter = require('../services/nafathAdapter');
const fatoora = require('../services/fatooraAdapter');
const muqeem = require('../services/muqeemAdapter');
const nphies = require('../services/nphiesAdapter');

router.use(authenticateToken);

const ADMIN = ['admin', 'superadmin', 'super_admin'];
const READ = [...ADMIN, 'manager', 'hr_manager'];

function configFor(adapter, name) {
  if (typeof adapter.getConfig === 'function') return adapter.getConfig();
  return { provider: name, mode: adapter.MODE || 'unknown', configured: true };
}

async function testFor(adapter) {
  if (typeof adapter.testConnection === 'function') return adapter.testConnection();
  return { ok: true, mode: adapter.MODE || 'unknown', message: 'لا يدعم اختبار الاتصال' };
}

// SCFHS adapter lacks getConfig/testConnection — wrap.
const scfhsWrapped = {
  MODE: scfhs.MODE,
  getConfig: () => ({
    provider: 'scfhs',
    mode: scfhs.MODE || 'mock',
    configured: scfhs.MODE === 'mock' ? true : Boolean(process.env.SCFHS_API_KEY),
    missing: scfhs.MODE === 'live' && !process.env.SCFHS_API_KEY ? ['SCFHS_API_KEY'] : undefined,
  }),
  testConnection: async () => {
    if (scfhs.MODE !== 'live')
      return { ok: true, mode: 'mock', message: 'وضع المحاكاة — لا يوجد اتصال شبكي' };
    try {
      const start = Date.now();
      const r = await scfhs.verify({ licenseNumber: '12345' });
      const misconfigured = r.status === 'unknown' && r.message?.includes('غير مُكوَّن');
      return {
        ok: !misconfigured,
        mode: 'live',
        latencyMs: Date.now() - start,
        error: misconfigured ? r.message : undefined,
      };
    } catch (e) {
      return { ok: false, mode: 'live', error: e?.message };
    }
  },
};

// Nafath — synthesize config + test from env + adapter mode.
const nafathWrapped = {
  MODE: nafathAdapter.MODE,
  getConfig: () => {
    const missing = [];
    if (nafathAdapter.MODE === 'live') {
      if (!process.env.NAFATH_BASE_URL) missing.push('NAFATH_BASE_URL');
      if (!process.env.NAFATH_APP_ID) missing.push('NAFATH_APP_ID');
      if (!process.env.NAFATH_SERVICE_ID) missing.push('NAFATH_SERVICE_ID');
    }
    return {
      provider: 'nafath',
      mode: nafathAdapter.MODE || 'mock',
      configured: nafathAdapter.MODE === 'mock' ? true : missing.length === 0,
      missing: missing.length ? missing : undefined,
    };
  },
  testConnection: async () => {
    if (nafathAdapter.MODE !== 'live')
      return { ok: true, mode: 'mock', message: 'وضع المحاكاة — لا يوجد اتصال شبكي' };
    const ok =
      Boolean(process.env.NAFATH_BASE_URL) &&
      Boolean(process.env.NAFATH_APP_ID) &&
      Boolean(process.env.NAFATH_SERVICE_ID);
    return {
      ok,
      mode: 'live',
      message: ok ? 'المتغيرات مُكوَّنة — الاختبار الفعلي يتطلب طلب تحقق حقيقي' : 'متغيرات ناقصة',
    };
  },
};

// Nphies has different API shape — wrap to match.
const nphiesWrapped = {
  MODE: nphies.MODE,
  getConfig: () => nphies.getConfig(),
  testConnection: () => nphies.testConnection(),
};

const ADAPTERS = {
  gosi,
  scfhs: scfhsWrapped,
  absher,
  qiwa,
  nafath: nafathWrapped,
  fatoora,
  muqeem,
  nphies: nphiesWrapped,
};

// ── GET /status ──────────────────────────────────────────────────────────
router.get('/status', requireRole(READ), async (req, res) => {
  try {
    const providers = Object.keys(ADAPTERS);
    const out = {};
    for (const p of providers) {
      out[p] = configFor(ADAPTERS[p], p);
    }
    res.json({ success: true, providers: out });
  } catch (err) {
    return safeError(res, err, 'gov-integrations.status');
  }
});

// ── POST /:provider/test-connection ──────────────────────────────────────
router.post('/:provider/test-connection', requireRole(ADMIN), async (req, res) => {
  try {
    const key = String(req.params.provider).toLowerCase();
    const adapter = ADAPTERS[key];
    if (!adapter) return res.status(404).json({ success: false, message: 'مزود غير معروف' });
    const result = await testFor(adapter);
    res.json({ success: true, provider: key, ...result });
  } catch (err) {
    return safeError(res, err, 'gov-integrations.test');
  }
});

// ── POST /:provider/verify-sample ────────────────────────────────────────
router.post('/:provider/verify-sample', requireRole(ADMIN), async (req, res) => {
  try {
    const key = String(req.params.provider).toLowerCase();
    const { nationalId, licenseNumber } = req.body || {};
    if (!nationalId && !licenseNumber)
      return res.status(400).json({ success: false, message: 'nationalId أو licenseNumber مطلوب' });

    let result;
    switch (key) {
      case 'gosi':
        result = await gosi.verify({ nationalId });
        break;
      case 'scfhs':
        result = await scfhs.verify({ licenseNumber, nationalId });
        break;
      case 'absher':
        result = await absher.verify({ nationalId });
        break;
      case 'qiwa':
        result = await qiwa.verify({ nationalId });
        break;
      case 'muqeem':
        result = await muqeem.verify({
          iqamaNumber: req.body?.iqamaNumber || nationalId,
        });
        break;
      case 'nphies':
        result = await nphies.checkEligibility({
          memberId: req.body?.memberId || nationalId,
          insurerId: req.body?.insurerId,
        });
        break;
      default:
        return res
          .status(400)
          .json({ success: false, message: 'هذا المزود لا يدعم العيّنة المباشرة' });
    }
    res.json({ success: true, provider: key, result });
  } catch (err) {
    return safeError(res, err, 'gov-integrations.verifySample');
  }
});

module.exports = router;
