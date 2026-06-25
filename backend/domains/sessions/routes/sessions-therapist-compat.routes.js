/**
 * Sessions Therapist Portal Compatibility Router
 * ═══════════════════════════════════════════════════════════════════════════
 * Phase 8 surface unification: absorbs the legacy
 * `/api/v1/therapist/sessions/*` and `/api/v1/therapist/schedule/*` surfaces
 * into the DDD Sessions domain under `/api/v1/sessions/therapist/*`.
 *
 * This router delegates to TherapistPortalService which operates on the
 * legacy TherapySession read/schedule model. It is intentionally thin:
 * business logic stays in the service; branch isolation is enforced via
 * effectiveBranchScope() for list queries and branchScopedResourceParam()
 * for resource endpoints (W269/W1152).
 *
 * Mounted under `/api/v1/sessions/therapist` by the sessions domain, *before*
 * the generic secure router, so these specific paths are not swallowed by
 * `/:sessionId`.
 */

'use strict';

const express = require('express');
const router = express.Router();
const {
  branchScopedResourceParam,
  effectiveBranchScope,
} = require('../../../middleware/assertBranchMatch');
const svc = require('../../../services/therapistPortal.service');

const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const therapistId = req => req.user?.id || req.user?._id;

function branchQuery(req, base = {}) {
  const branchId = effectiveBranchScope(req);
  return branchId ? { ...base, branchId } : base;
}

// W269/W1152 — scope every :sessionId resource to the therapist's branch.
router.param(
  'sessionId',
  branchScopedResourceParam({
    modelName: 'TherapySession',
    label: 'therapySession',
    loadModel: () => require('../../../models/TherapySession'),
  })
);

// ═══════════════════════════════════════════════════════════════════════════
//  الجدول والمواعيد — Schedule
// ═══════════════════════════════════════════════════════════════════════════

router.get(
  '/schedule',
  wrap(async (req, res) => {
    const data = await svc.getSchedule(therapistId(req), branchQuery(req, req.query));
    res.json({ success: true, data });
  })
);

router.post(
  '/schedule',
  wrap(async (req, res) => {
    const data = await svc.addScheduleSession(therapistId(req), {
      ...req.body,
      ...branchQuery(req),
    });
    res.status(201).json({ success: true, data });
  })
);

router.put(
  '/schedule/:sessionId',
  wrap(async (req, res) => {
    const data = await svc.updateScheduleSession(therapistId(req), req.params.sessionId, req.body);
    if (!data) return res.status(404).json({ success: false, error: 'الجلسة غير موجودة' });
    res.json({ success: true, data });
  })
);

router.delete(
  '/schedule/:sessionId',
  wrap(async (req, res) => {
    const deleted = await svc.deleteScheduleSession(therapistId(req), req.params.sessionId);
    if (!deleted) return res.status(404).json({ success: false, error: 'الجلسة غير موجودة' });
    res.json({ success: true, message: 'تم الحذف' });
  })
);

// ═══════════════════════════════════════════════════════════════════════════
//  الجلسات العلاجية — Sessions
// ═══════════════════════════════════════════════════════════════════════════

router.get(
  '/sessions',
  wrap(async (req, res) => {
    const result = await svc.getSessions(therapistId(req), branchQuery(req, req.query));
    res.json({
      success: true,
      data: result.sessions,
      total: result.total,
      page: result.page,
      limit: result.limit,
    });
  })
);

router.post(
  '/sessions',
  wrap(async (req, res) => {
    const data = await svc.saveSessionReport(therapistId(req), {
      ...req.body,
      ...branchQuery(req),
    });
    if (!data) return res.status(404).json({ success: false, error: 'الجلسة غير موجودة' });
    res.status(201).json({ success: true, data });
  })
);

router.get(
  '/sessions/:sessionId',
  wrap(async (req, res) => {
    const data = await svc.getSessionById(therapistId(req), req.params.sessionId);
    if (!data) return res.status(404).json({ success: false, error: 'الجلسة غير موجودة' });
    res.json({ success: true, data });
  })
);

router.put(
  '/sessions/:sessionId',
  wrap(async (req, res) => {
    const data = await svc.updateSession(therapistId(req), req.params.sessionId, req.body);
    if (!data) return res.status(404).json({ success: false, error: 'الجلسة غير موجودة' });
    res.json({ success: true, data });
  })
);

router.delete(
  '/sessions/:sessionId',
  wrap(async (req, res) => {
    const deleted = await svc.deleteSession(therapistId(req), req.params.sessionId);
    if (!deleted) return res.status(404).json({ success: false, error: 'الجلسة غير موجودة' });
    res.json({ success: true, message: 'تم الحذف' });
  })
);

// ═══════════════════════════════════════════════════════════════════════════
//  التوثيق السريري — Session Documentation (SOAP)
// ═══════════════════════════════════════════════════════════════════════════

router.get(
  '/sessions/:sessionId/documentation',
  wrap(async (req, res) => {
    const data = await svc.getSessionDocumentation(therapistId(req), req.params.sessionId);
    res.json({ success: true, data: data || null });
  })
);

router.post(
  '/sessions/:sessionId/documentation',
  wrap(async (req, res) => {
    const data = await svc.createSessionDocumentation(
      therapistId(req),
      req.params.sessionId,
      req.body
    );
    res.status(201).json({ success: true, data });
  })
);

// ═══════════════════════════════════════════════════════════════════════════
//  Error handler
// ═══════════════════════════════════════════════════════════════════════════

router.use((err, _req, res, _next) => {
  const status = err.status || 500;
  const message = err.message || 'خطأ في بوابة المعالج';
  res.status(status).json({ success: false, error: message });
});

module.exports = router;
