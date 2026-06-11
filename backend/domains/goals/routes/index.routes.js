/**
 * Goals Domain Routes — Index
 *
 * يجمع: أهداف علاجية CRUD + مكتبة المقاييس
 *
 * مثبت على /api/goals و /api/v1/goals
 * - /api/goals/goals/...    ← therapeutic goals CRUD
 * - /api/goals/measures/... ← measures library
 *
 * @module domains/goals/routes/index.routes
 */

const express = require('express');
const router = express.Router();

router.use('/', require('./goals.routes'));
router.use('/', require('./measures.routes'));
router.use('/', require('./golden-thread.routes')); // W1167 — caseload attention triage
router.use('/', require('./supervisor-ops.routes')); // W1170 — documentation backlog
router.use('/', require('./rehab-plan-health.routes')); // per-beneficiary plan-on-track

module.exports = router;
