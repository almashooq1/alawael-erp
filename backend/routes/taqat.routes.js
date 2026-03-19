/**
 * مسارات منصة طاقات - توظيف ذوي الإعاقة
 * Taqat Platform Routes - Employment for People with Disabilities
 *
 * @module routes/taqat
 */

const express = require('express');
const router = express.Router();
const { authenticateToken, authorize } = require('../middleware/auth');
const taqatService = require('../services/taqat.service');

const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const TAQAT_ROLES = ['admin', 'hr_manager', 'hr', 'social_worker', 'rehabilitation_specialist'];

// ============================================================
// الباحثون عن عمل — Job Seekers
// ============================================================

router.post(
  '/job-seekers',
  authenticateToken,
  authorize(TAQAT_ROLES),
  asyncHandler(async (req, res) => {
    const seeker = await taqatService.createJobSeeker(req.body, req.user._id || req.user.id);
    res.status(201).json({ success: true, data: seeker, message: 'تم تسجيل الباحث عن عمل بنجاح' });
  })
);

router.put(
  '/job-seekers/:id',
  authenticateToken,
  authorize(TAQAT_ROLES),
  asyncHandler(async (req, res) => {
    const seeker = await taqatService.updateJobSeeker(
      req.params.id,
      req.body,
      req.user._id || req.user.id
    );
    res.json({ success: true, data: seeker });
  })
);

router.get(
  '/job-seekers',
  authenticateToken,
  authorize(TAQAT_ROLES),
  asyncHandler(async (req, res) => {
    const { page, limit, ...filters } = req.query;
    const result = await taqatService.getJobSeekers(
      filters,
      parseInt(page) || 1,
      parseInt(limit) || 20
    );
    res.json({ success: true, data: result });
  })
);

router.get(
  '/job-seekers/:id',
  authenticateToken,
  authorize(TAQAT_ROLES),
  asyncHandler(async (req, res) => {
    const seeker = await taqatService.getJobSeekerById(req.params.id);
    res.json({ success: true, data: seeker });
  })
);

router.post(
  '/job-seekers/:id/assess-readiness',
  authenticateToken,
  authorize(TAQAT_ROLES),
  asyncHandler(async (req, res) => {
    const seeker = await taqatService.assessEmploymentReadiness(
      req.params.id,
      req.body,
      req.user._id || req.user.id
    );
    res.json({ success: true, data: seeker, message: 'تم تقييم الجاهزية الوظيفية' });
  })
);

router.get(
  '/job-seekers/:id/match-jobs',
  authenticateToken,
  authorize(TAQAT_ROLES),
  asyncHandler(async (req, res) => {
    const matches = await taqatService.matchJobsToSeeker(req.params.id);
    res.json({ success: true, data: matches });
  })
);

// ============================================================
// الفرص الوظيفية — Job Opportunities
// ============================================================

router.post(
  '/job-opportunities',
  authenticateToken,
  authorize(['admin', 'hr_manager', 'hr']),
  asyncHandler(async (req, res) => {
    const job = await taqatService.createJobOpportunity(req.body, req.user._id || req.user.id);
    res.status(201).json({ success: true, data: job, message: 'تم إنشاء الفرصة الوظيفية بنجاح' });
  })
);

router.put(
  '/job-opportunities/:id',
  authenticateToken,
  authorize(['admin', 'hr_manager', 'hr']),
  asyncHandler(async (req, res) => {
    const job = await taqatService.updateJobOpportunity(
      req.params.id,
      req.body,
      req.user._id || req.user.id
    );
    res.json({ success: true, data: job });
  })
);

router.get(
  '/job-opportunities',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { page, limit, ...filters } = req.query;
    const result = await taqatService.getJobOpportunities(
      filters,
      parseInt(page) || 1,
      parseInt(limit) || 20
    );
    res.json({ success: true, data: result });
  })
);

// ============================================================
// طلبات التوظيف — Applications
// ============================================================

router.post(
  '/applications',
  authenticateToken,
  authorize(TAQAT_ROLES),
  asyncHandler(async (req, res) => {
    const { seekerId, jobId, ...appData } = req.body;
    const application = await taqatService.submitApplication(
      seekerId,
      jobId,
      appData,
      req.user._id || req.user.id
    );
    res.status(201).json({ success: true, data: application, message: 'تم تقديم الطلب بنجاح' });
  })
);

router.put(
  '/applications/:id/status',
  authenticateToken,
  authorize(['admin', 'hr_manager', 'hr']),
  asyncHandler(async (req, res) => {
    const { status, notes } = req.body;
    const application = await taqatService.updateApplicationStatus(
      req.params.id,
      status,
      notes,
      req.user._id || req.user.id
    );
    res.json({ success: true, data: application, message: 'تم تحديث حالة الطلب' });
  })
);

router.get(
  '/applications',
  authenticateToken,
  authorize(TAQAT_ROLES),
  asyncHandler(async (req, res) => {
    const { page, limit, ...filters } = req.query;
    const result = await taqatService.getApplications(
      filters,
      parseInt(page) || 1,
      parseInt(limit) || 20
    );
    res.json({ success: true, data: result });
  })
);

// ============================================================
// برامج التدريب — Training Programs
// ============================================================

router.post(
  '/training-programs',
  authenticateToken,
  authorize(['admin', 'hr_manager']),
  asyncHandler(async (req, res) => {
    const program = await taqatService.createTrainingProgram(req.body, req.user._id || req.user.id);
    res.status(201).json({ success: true, data: program });
  })
);

router.get(
  '/training-programs',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const programs = await taqatService.getTrainingPrograms(req.query);
    res.json({ success: true, data: programs });
  })
);

// ============================================================
// الإحصائيات ولوحة التحكم — Stats & Dashboard
// ============================================================

router.get(
  '/dashboard',
  authenticateToken,
  authorize(TAQAT_ROLES),
  asyncHandler(async (req, res) => {
    const stats = await taqatService.getDashboardStats();
    res.json({ success: true, data: stats });
  })
);

router.get(
  '/stats',
  authenticateToken,
  authorize(TAQAT_ROLES),
  asyncHandler(async (req, res) => {
    const stats = await taqatService.getDashboardStats();
    res.json({ success: true, data: stats });
  })
);

router.post(
  '/stats/generate',
  authenticateToken,
  authorize(['admin', 'hr_manager']),
  asyncHandler(async (req, res) => {
    const { period, periodType } = req.body;
    const stats = await taqatService.generateEmploymentStats(period, periodType || 'monthly');
    res.json({ success: true, data: stats });
  })
);

module.exports = router;
