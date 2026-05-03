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

module.exports = router;
