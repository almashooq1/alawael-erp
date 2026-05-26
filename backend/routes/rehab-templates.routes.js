/**
 * Rehab Program Templates Routes
 * Base: /api/v1/rehab-templates (also /api/rehab-templates via dualMount)
 */

'use strict';

const express = require('express');
const {
  matchProgramTemplates,
  buildCustomPlan,
  listTemplates,
  getTemplate,
} = require('../rehabilitation-services/rehab-program-templates');
const { bodyScopedBeneficiaryGuard } = require('../middleware/assertBranchMatch');

const router = express.Router();
// W442: defense-in-depth. `beneficiary` here is normally a context
// object (diagnosis/age) but the guard auto-skips non-ObjectId values,
// so applying it costs nothing AND protects against future regressions
// if a caller starts passing a Beneficiary ObjectId reference.
router.use(bodyScopedBeneficiaryGuard);

const ok = (res, data, meta = {}) => res.json({ success: true, ...meta, data });
const fail = (res, message, status = 400) => res.status(status).json({ success: false, message });

// GET /rehab-templates — list all templates (summary)
router.get('/', (_req, res) => {
  try {
    ok(res, { templates: listTemplates() });
  } catch (err) {
    fail(res, err.message, 500);
  }
});

// GET /rehab-templates/:key — full template detail
router.get('/:key', (req, res) => {
  const t = getTemplate(req.params.key);
  if (!t) return fail(res, `القالب '${req.params.key}' غير موجود`, 404);
  return ok(res, { template: t });
});

// POST /rehab-templates/match — suggest templates for a beneficiary
// Body: { diagnosis, age, functionalLevel? }
router.post('/match', (req, res) => {
  const { diagnosis, age } = req.body || {};
  if (!diagnosis || age === undefined) {
    return fail(res, 'diagnosis و age مطلوبان');
  }
  try {
    const matched = matchProgramTemplates(req.body);
    return ok(res, { count: matched.length, templates: matched });
  } catch (err) {
    return fail(res, err.message, 500);
  }
});

// POST /rehab-templates/:key/build-plan — build a customised session plan
// Body: { beneficiary, startDate? }
router.post('/:key/build-plan', (req, res) => {
  const { beneficiary, startDate } = req.body || {};
  if (!beneficiary) return fail(res, 'beneficiary مطلوب');
  try {
    const plan = buildCustomPlan(
      req.params.key,
      beneficiary,
      startDate ? new Date(startDate) : undefined
    );
    if (plan.error) return fail(res, plan.error, 404);
    return ok(res, { plan });
  } catch (err) {
    return fail(res, err.message, 500);
  }
});

module.exports = router;
