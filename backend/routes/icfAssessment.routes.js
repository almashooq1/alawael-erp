/**
 * ICF Functional Assessment Routes — مسارات التقييم الوظيفي ICF
 *
 * نظام التقييم الوظيفي وفق التصنيف الدولي للأداء الوظيفي (ICF) — WHO
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * Endpoints:
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * CRUD:
 *   POST   /                                         — إنشاء تقييم ICF
 *   GET    /                                         — قائمة التقييمات (فلاتر + بحث)
 *   GET    /statistics                               — إحصائيات عامة
 *   GET    /domain-distribution                      — توزيع الدرجات حسب المجال
 *   GET    /codes                                    — بحث رموز ICF
 *   GET    /codes/tree/:component                    — شجرة رموز ICF
 *   GET    /benchmarks                               — قائمة المعايير المرجعية
 *   POST   /benchmarks                               — إنشاء معيار مرجعي
 *   POST   /benchmarks/import                        — استيراد معايير بالجملة
 *   GET    /:id                                      — تفاصيل تقييم
 *   PUT    /:id                                      — تحديث تقييم
 *   DELETE /:id                                      — حذف تقييم
 *   PATCH  /:id/status                               — تغيير حالة
 *
 * Comparison & Timeline:
 *   GET    /:id/compare                              — مقارنة مع تقييم سابق
 *   GET    /beneficiary/:beneficiaryId/timeline      — خط زمني لمستفيد
 *
 * Benchmarking:
 *   GET    /:id/benchmark                            — مقارنة بالمعايير الدولية
 *
 * Reports:
 *   GET    /:id/report                                          — تقرير شامل
 *   GET    /beneficiary/:beneficiaryId/comparative-report       — تقرير مقارن دوري
 *   GET    /organization-report                                 — تقرير مؤسسي
 */

const express = require('express');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const router = express.Router();
const ICFAssessmentController = require('../controllers/icfAssessment.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

/* ─── Helper ───────────────────────────────────────────────────────────────── */

const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/* ═══════════════════════════════════════════════════════════════════════════ *
 *  Static routes MUST come before parametric /:id routes
 * ═══════════════════════════════════════════════════════════════════════════ */

// ── Statistics (إحصائيات) ──────────────────────────────────────────────────
router.get('/statistics', authenticateToken, requireBranchAccess, asyncHandler(ICFAssessmentController.statistics));
router.get(
  '/domain-distribution',
  authenticateToken, requireBranchAccess, requireBranchAccess,
  asyncHandler(ICFAssessmentController.domainDistribution)
);

// ── ICF Code Reference (مرجع رموز ICF) ────────────────────────────────────
router.get('/codes', authenticateToken, requireBranchAccess, asyncHandler(ICFAssessmentController.searchCodes));
router.get(
  '/codes/tree/:component',
  authenticateToken, requireBranchAccess, requireBranchAccess,
  asyncHandler(ICFAssessmentController.codeTree)
);

// ── Benchmarks Management (إدارة المعايير) ────────────────────────────────
router.get('/benchmarks', authenticateToken, requireBranchAccess, asyncHandler(ICFAssessmentController.listBenchmarks));
router.post(
  '/benchmarks',
  authenticateToken, requireBranchAccess, requireBranchAccess,
  asyncHandler(ICFAssessmentController.createBenchmark)
);
router.post(
  '/benchmarks/import',
  authenticateToken, requireBranchAccess, requireBranchAccess,
  asyncHandler(ICFAssessmentController.importBenchmarks)
);

// ── Organization Report (تقرير مؤسسي) ─────────────────────────────────────
router.get(
  '/organization-report',
  authenticateToken, requireBranchAccess, requireBranchAccess,
  asyncHandler(ICFAssessmentController.organizationReport)
);

// ── Beneficiary Timeline & Comparative Report ─────────────────────────────
router.get(
  '/beneficiary/:beneficiaryId/timeline',
  authenticateToken, requireBranchAccess, requireBranchAccess,
  asyncHandler(ICFAssessmentController.timeline)
);
router.get(
  '/beneficiary/:beneficiaryId/comparative-report',
  authenticateToken, requireBranchAccess, requireBranchAccess,
  asyncHandler(ICFAssessmentController.comparativeReport)
);

/* ═══════════════════════════════════════════════════════════════════════════ *
 *  CRUD Routes
 * ═══════════════════════════════════════════════════════════════════════════ */

router.post('/', authenticateToken, requireBranchAccess, asyncHandler(ICFAssessmentController.create));
router.get('/', authenticateToken, requireBranchAccess, asyncHandler(ICFAssessmentController.list));
router.get('/:id', authenticateToken, requireBranchAccess, asyncHandler(ICFAssessmentController.getById));
router.put('/:id', authenticateToken, requireBranchAccess, asyncHandler(ICFAssessmentController.update));
router.delete('/:id', authenticateToken, requireBranchAccess, asyncHandler(ICFAssessmentController.delete));

// ── Status Change ─────────────────────────────────────────────────────────
router.patch('/:id/status', authenticateToken, requireBranchAccess, asyncHandler(ICFAssessmentController.changeStatus));

// ── Comparison ────────────────────────────────────────────────────────────
router.get('/:id/compare', authenticateToken, requireBranchAccess, asyncHandler(ICFAssessmentController.compare));

// ── Benchmarking ──────────────────────────────────────────────────────────
router.get('/:id/benchmark', authenticateToken, requireBranchAccess, asyncHandler(ICFAssessmentController.benchmark));

// ── Reports ───────────────────────────────────────────────────────────────
router.get('/:id/report', authenticateToken, requireBranchAccess, asyncHandler(ICFAssessmentController.getReport));

module.exports = router;
