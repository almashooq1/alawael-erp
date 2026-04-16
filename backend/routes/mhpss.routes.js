/**
 * Mental Health & Psychosocial Support Routes
 * مسارات الدعم النفسي والصحة النفسية
 *
 * Base path: /api/mhpss  &  /api/v1/mhpss
 *
 * Endpoints:
 *   ── Dashboard ──
 *   GET    /dashboard                           — لوحة المعلومات الشاملة
 *
 *   ── Counseling Sessions (جلسات الإرشاد) ──
 *   GET    /sessions                            — قائمة الجلسات (مع فلترة وصفحات)
 *   GET    /sessions/stats                      — إحصائيات الجلسات
 *   POST   /sessions                            — إنشاء جلسة جديدة
 *   GET    /sessions/:id                        — تفاصيل جلسة
 *   PUT    /sessions/:id                        — تحديث جلسة
 *   DELETE /sessions/:id                        — حذف جلسة
 *
 *   ── Mental Health Programs (برامج الصحة النفسية) ──
 *   GET    /programs                            — قائمة البرامج
 *   POST   /programs                            — إنشاء برنامج
 *   GET    /programs/:id                        — تفاصيل برنامج
 *   PUT    /programs/:id                        — تحديث برنامج
 *   DELETE /programs/:id                        — حذف برنامج
 *   POST   /programs/:id/enroll                 — تسجيل مستفيد في برنامج
 *   POST   /programs/:id/unenroll               — إلغاء تسجيل مستفيد
 *
 *   ── Psychological Assessments (التقييمات النفسية) ──
 *   GET    /assessments                         — قائمة التقييمات
 *   GET    /assessments/stats                   — إحصائيات التقييمات
 *   POST   /assessments                         — إنشاء تقييم
 *   GET    /assessments/beneficiary/:beneficiaryId — سجل تقييمات مستفيد
 *   GET    /assessments/:id                     — تفاصيل تقييم
 *   PUT    /assessments/:id                     — تحديث تقييم
 *   DELETE /assessments/:id                     — حذف تقييم
 *
 *   ── Crisis Interventions (التدخل في الأزمات) ──
 *   GET    /crises                              — قائمة حالات الأزمات
 *   GET    /crises/stats                        — إحصائيات الأزمات
 *   POST   /crises                              — تسجيل أزمة
 *   GET    /crises/:id                          — تفاصيل أزمة
 *   PUT    /crises/:id                          — تحديث أزمة
 *   DELETE /crises/:id                          — حذف أزمة
 *   POST   /crises/:id/timeline                 — إضافة حدث للجدول الزمني
 *   POST   /crises/:id/follow-up                — إضافة متابعة
 *
 *   ── Support Groups (مجموعات الدعم) ──
 *   GET    /groups                              — قائمة المجموعات
 *   POST   /groups                              — إنشاء مجموعة
 *   GET    /groups/:id                          — تفاصيل مجموعة
 *   PUT    /groups/:id                          — تحديث مجموعة
 *   DELETE /groups/:id                          — حذف مجموعة
 *   POST   /groups/:id/members                  — إضافة عضو
 *   DELETE /groups/:id/members                  — إزالة عضو
 *   POST   /groups/:id/sessions                 — إضافة جلسة مجموعة
 */

const express = require('express');
const router = express.Router();
const controller = require('../controllers/mhpss.controller');
const { authenticate, authorize } = require('../middleware/auth');

const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
// All routes require authentication
router.use(authenticate);
router.use(requireBranchAccess);
// ─── Dashboard ───────────────────────────────────────────────────────────────
router.get('/dashboard', (req, res) => controller.getDashboard(req, res));

// ─── Counseling Sessions ─────────────────────────────────────────────────────
router.get('/sessions', (req, res) => controller.getSessions(req, res));
router.get('/sessions/stats', (req, res) => controller.getSessionStats(req, res));
router.post('/sessions', (req, res) => controller.createSession(req, res));
router.get('/sessions/:id', (req, res) => controller.getSessionById(req, res));
router.put('/sessions/:id', (req, res) => controller.updateSession(req, res));
router.delete('/sessions/:id', authorize(['admin', 'manager', 'psychologist']), (req, res) =>
  controller.deleteSession(req, res)
);

// ─── Mental Health Programs ──────────────────────────────────────────────────
router.get('/programs', (req, res) => controller.getPrograms(req, res));
router.post('/programs', authorize(['admin', 'manager', 'psychologist']), (req, res) =>
  controller.createProgram(req, res)
);
router.get('/programs/:id', (req, res) => controller.getProgramById(req, res));
router.put('/programs/:id', authorize(['admin', 'manager', 'psychologist']), (req, res) =>
  controller.updateProgram(req, res)
);
router.delete('/programs/:id', authorize(['admin', 'manager']), (req, res) =>
  controller.deleteProgram(req, res)
);
router.post('/programs/:id/enroll', (req, res) => controller.enrollInProgram(req, res));
router.post('/programs/:id/unenroll', (req, res) => controller.unenrollFromProgram(req, res));

// ─── Psychological Assessments ───────────────────────────────────────────────
router.get('/assessments', (req, res) => controller.getAssessments(req, res));
router.get('/assessments/stats', (req, res) => controller.getAssessmentStats(req, res));
router.post('/assessments', (req, res) => controller.createAssessment(req, res));
router.get('/assessments/beneficiary/:beneficiaryId', (req, res) =>
  controller.getBeneficiaryAssessmentHistory(req, res)
);
router.get('/assessments/:id', (req, res) => controller.getAssessmentById(req, res));
router.put('/assessments/:id', (req, res) => controller.updateAssessment(req, res));
router.delete('/assessments/:id', authorize(['admin', 'manager', 'psychologist']), (req, res) =>
  controller.deleteAssessment(req, res)
);

// ─── Crisis Interventions ────────────────────────────────────────────────────
router.get('/crises', (req, res) => controller.getCrises(req, res));
router.get('/crises/stats', (req, res) => controller.getCrisisStats(req, res));
router.post('/crises', (req, res) => controller.createCrisis(req, res));
router.get('/crises/:id', (req, res) => controller.getCrisisById(req, res));
router.put('/crises/:id', (req, res) => controller.updateCrisis(req, res));
router.delete('/crises/:id', authorize(['admin', 'manager']), (req, res) =>
  controller.deleteCrisis(req, res)
);
router.post('/crises/:id/timeline', (req, res) => controller.addCrisisTimelineEvent(req, res));
router.post('/crises/:id/follow-up', (req, res) => controller.addCrisisFollowUp(req, res));

// ─── Support Groups ─────────────────────────────────────────────────────────
router.get('/groups', (req, res) => controller.getGroups(req, res));
router.post('/groups', authorize(['admin', 'manager', 'psychologist']), (req, res) =>
  controller.createGroup(req, res)
);
router.get('/groups/:id', (req, res) => controller.getGroupById(req, res));
router.put('/groups/:id', authorize(['admin', 'manager', 'psychologist']), (req, res) =>
  controller.updateGroup(req, res)
);
router.delete('/groups/:id', authorize(['admin', 'manager']), (req, res) =>
  controller.deleteGroup(req, res)
);
router.post('/groups/:id/members', (req, res) => controller.addGroupMember(req, res));
router.delete('/groups/:id/members', (req, res) => controller.removeGroupMember(req, res));
router.post('/groups/:id/sessions', (req, res) => controller.addGroupSession(req, res));

module.exports = router;
