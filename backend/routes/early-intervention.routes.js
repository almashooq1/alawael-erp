/**
 * Early Intervention System Routes — مسارات نظام التدخل المبكر
 *
 * Endpoints:
 *   /children          – إدارة ملفات الأطفال (0–3 سنوات)
 *   /screenings        – الفحص والكشف المبكر
 *   /milestones        – تتبع المعالم التنموية
 *   /ifsps             – خطط الخدمات الأسرية الفردية (IFSP)
 *   /referrals         – الإحالات المبكرة والربط بالمستشفيات
 *   /dashboard         – لوحة المعلومات والتحليلات
 */

const express = require('express');
const { safeError } = require('../utils/safeError');
const router = express.Router();
const { validationResult } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth');
const earlyInterventionService = require('../services/earlyIntervention.service');
const logger = require('../utils/logger');

const {
  validateCreateChild,
  validateUpdateChild,
  validateGetChildren,
  validateCreateScreening,
  validateUpdateScreening,
  validateGetScreenings,
  validateCreateMilestone,
  validateUpdateMilestone,
  validateGetMilestones,
  validateCreateIFSP,
  validateUpdateIFSP,
  validateGetIFSPs,
  validateAddIFSPReview,
  validateUpdateGoalProgress,
  validateCreateReferral,
  validateUpdateReferral,
  validateGetReferrals,
  validateUpdateReferralStatus,
  validateAddCommunication,
  mongoIdParam,
} = require('../validators/earlyIntervention.validator');

// ── Validation middleware ──
const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'خطأ في البيانات المدخلة',
      errors: errors.array(),
    });
  }
  next();
};

// ── Allowed roles ──
const EIS_ROLES = [
  'admin',
  'super_admin',
  'early_intervention_specialist',
  'therapist',
  'doctor',
  'pediatrician',
  'nurse',
  'service_coordinator',
  'social_worker',
  'psychologist',
  'case_manager',
  'rehabilitation_specialist',
];

const EIS_ADMIN_ROLES = ['admin', 'super_admin', 'service_coordinator'];

// ═══════════════════════════════════════════════════════════════════════════════
// CHILDREN — ملفات الأطفال
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /children — تسجيل طفل جديد
 */
router.post(
  '/children',
  authenticate,
  authorize(EIS_ROLES),
  validateCreateChild,
  handleValidation,
  async (req, res) => {
    try {
      const child = await earlyInterventionService.createChild(req.body, req.user.id);
      res.status(201).json({
        success: true,
        message: 'تم تسجيل الطفل بنجاح',
        data: child,
      });
    } catch (error) {
      logger.error('[EIS] Error creating child:', error);
      res.status(400).json({ success: false, message: safeError(error) });
    }
  }
);

/**
 * GET /children — قائمة الأطفال المسجلين
 */
router.get(
  '/children',
  authenticate,
  authorize(EIS_ROLES),
  validateGetChildren,
  handleValidation,
  async (req, res) => {
    try {
      const filters = {
        status: req.query.status,
        eligibilityStatus: req.query.eligibilityStatus,
        disabilityType: req.query.disabilityType,
        gender: req.query.gender,
        search: req.query.search,
        referralSource: req.query.referralSource,
        primaryCoordinator: req.query.primaryCoordinator,
        organization: req.query.organization,
        ageMinMonths: req.query.ageMinMonths,
        ageMaxMonths: req.query.ageMaxMonths,
      };
      const pagination = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
        sortBy: req.query.sortBy || 'createdAt',
        sortOrder: req.query.sortOrder === 'asc' ? 1 : -1,
      };

      const result = await earlyInterventionService.getChildren(filters, pagination);
      res.json({ success: true, message: 'تم جلب قائمة الأطفال بنجاح', ...result });
    } catch (error) {
      logger.error('[EIS] Error fetching children:', error);
      res.status(500).json({ success: false, message: 'خطأ في جلب البيانات' });
    }
  }
);

/**
 * GET /children/:id — تفاصيل طفل
 */
router.get(
  '/children/:id',
  authenticate,
  authorize(EIS_ROLES),
  mongoIdParam('id'),
  handleValidation,
  async (req, res) => {
    try {
      const child = await earlyInterventionService.getChildById(req.params.id);
      res.json({ success: true, data: child });
    } catch (error) {
      logger.error('[EIS] Error fetching child:', error);
      res.status(404).json({ success: false, message: safeError(error) });
    }
  }
);

/**
 * GET /children/:id/full-profile — الملف الكامل للطفل (يشمل الفحوصات والمعالم والخطط والإحالات)
 */
router.get(
  '/children/:id/full-profile',
  authenticate,
  authorize(EIS_ROLES),
  mongoIdParam('id'),
  handleValidation,
  async (req, res) => {
    try {
      const profile = await earlyInterventionService.getChildFullProfile(req.params.id);
      res.json({ success: true, message: 'تم جلب الملف الكامل بنجاح', data: profile });
    } catch (error) {
      logger.error('[EIS] Error fetching full profile:', error);
      res.status(404).json({ success: false, message: safeError(error) });
    }
  }
);

/**
 * PUT /children/:id — تحديث ملف طفل
 */
router.put(
  '/children/:id',
  authenticate,
  authorize(EIS_ROLES),
  validateUpdateChild,
  handleValidation,
  async (req, res) => {
    try {
      const child = await earlyInterventionService.updateChild(
        req.params.id,
        req.body,
        req.user.id
      );
      res.json({ success: true, message: 'تم تحديث ملف الطفل بنجاح', data: child });
    } catch (error) {
      logger.error('[EIS] Error updating child:', error);
      res.status(400).json({ success: false, message: safeError(error) });
    }
  }
);

/**
 * DELETE /children/:id — حذف ملف طفل
 */
router.delete(
  '/children/:id',
  authenticate,
  authorize(EIS_ADMIN_ROLES),
  mongoIdParam('id'),
  handleValidation,
  async (req, res) => {
    try {
      await earlyInterventionService.deleteChild(req.params.id);
      res.json({ success: true, message: 'تم حذف ملف الطفل بنجاح' });
    } catch (error) {
      logger.error('[EIS] Error deleting child:', error);
      res.status(400).json({ success: false, message: safeError(error) });
    }
  }
);

/**
 * POST /children/:id/initialize-milestones — إنشاء المعالم القياسية للطفل
 */
router.post(
  '/children/:id/initialize-milestones',
  authenticate,
  authorize(EIS_ROLES),
  mongoIdParam('id'),
  handleValidation,
  async (req, res) => {
    try {
      const milestones = await earlyInterventionService.initializeMilestonesForChild(
        req.params.id,
        req.user.id
      );
      res.status(201).json({
        success: true,
        message: `تم إنشاء ${milestones.length} معلم تنموي بنجاح`,
        data: milestones,
      });
    } catch (error) {
      logger.error('[EIS] Error initializing milestones:', error);
      res.status(400).json({ success: false, message: safeError(error) });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════════
// SCREENINGS — الفحص والكشف المبكر
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /screenings — إنشاء فحص جديد
 */
router.post(
  '/screenings',
  authenticate,
  authorize(EIS_ROLES),
  validateCreateScreening,
  handleValidation,
  async (req, res) => {
    try {
      const screening = await earlyInterventionService.createScreening(req.body, req.user.id);
      res.status(201).json({
        success: true,
        message: 'تم إنشاء سجل الفحص بنجاح',
        data: screening,
      });
    } catch (error) {
      logger.error('[EIS] Error creating screening:', error);
      res.status(400).json({ success: false, message: safeError(error) });
    }
  }
);

/**
 * GET /screenings — قائمة الفحوصات
 */
router.get(
  '/screenings',
  authenticate,
  authorize(EIS_ROLES),
  validateGetScreenings,
  handleValidation,
  async (req, res) => {
    try {
      const filters = {
        child: req.query.child,
        status: req.query.status,
        overallResult: req.query.overallResult,
        screener: req.query.screener,
        screeningType: req.query.screeningType,
        organization: req.query.organization,
        dateFrom: req.query.dateFrom,
        dateTo: req.query.dateTo,
      };
      const pagination = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
        sortBy: req.query.sortBy || 'screeningDate',
        sortOrder: req.query.sortOrder === 'asc' ? 1 : -1,
      };

      const result = await earlyInterventionService.getScreenings(filters, pagination);
      res.json({ success: true, message: 'تم جلب قائمة الفحوصات بنجاح', ...result });
    } catch (error) {
      logger.error('[EIS] Error fetching screenings:', error);
      res.status(500).json({ success: false, message: 'خطأ في جلب البيانات' });
    }
  }
);

/**
 * GET /screenings/:id — تفاصيل فحص
 */
router.get(
  '/screenings/:id',
  authenticate,
  authorize(EIS_ROLES),
  mongoIdParam('id'),
  handleValidation,
  async (req, res) => {
    try {
      const screening = await earlyInterventionService.getScreeningById(req.params.id);
      res.json({ success: true, data: screening });
    } catch (error) {
      logger.error('[EIS] Error fetching screening:', error);
      res.status(404).json({ success: false, message: safeError(error) });
    }
  }
);

/**
 * GET /screenings/child/:childId — فحوصات طفل معين
 */
router.get(
  '/screenings/child/:childId',
  authenticate,
  authorize(EIS_ROLES),
  mongoIdParam('childId'),
  handleValidation,
  async (req, res) => {
    try {
      const result = await earlyInterventionService.getScreeningsByChild(req.params.childId, {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
      });
      res.json({ success: true, ...result });
    } catch (error) {
      logger.error('[EIS] Error fetching child screenings:', error);
      res.status(500).json({ success: false, message: 'خطأ في جلب البيانات' });
    }
  }
);

/**
 * PUT /screenings/:id — تحديث فحص
 */
router.put(
  '/screenings/:id',
  authenticate,
  authorize(EIS_ROLES),
  validateUpdateScreening,
  handleValidation,
  async (req, res) => {
    try {
      const screening = await earlyInterventionService.updateScreening(
        req.params.id,
        req.body,
        req.user.id
      );
      res.json({ success: true, message: 'تم تحديث الفحص بنجاح', data: screening });
    } catch (error) {
      logger.error('[EIS] Error updating screening:', error);
      res.status(400).json({ success: false, message: safeError(error) });
    }
  }
);

/**
 * DELETE /screenings/:id — حذف فحص
 */
router.delete(
  '/screenings/:id',
  authenticate,
  authorize(EIS_ADMIN_ROLES),
  mongoIdParam('id'),
  handleValidation,
  async (req, res) => {
    try {
      await earlyInterventionService.deleteScreening(req.params.id);
      res.json({ success: true, message: 'تم حذف الفحص بنجاح' });
    } catch (error) {
      logger.error('[EIS] Error deleting screening:', error);
      res.status(400).json({ success: false, message: safeError(error) });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════════
// MILESTONES — المعالم التنموية
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /milestones — إضافة معلم تنموي
 */
router.post(
  '/milestones',
  authenticate,
  authorize(EIS_ROLES),
  validateCreateMilestone,
  handleValidation,
  async (req, res) => {
    try {
      const milestone = await earlyInterventionService.createMilestone(req.body, req.user.id);
      res.status(201).json({
        success: true,
        message: 'تم إضافة المعلم التنموي بنجاح',
        data: milestone,
      });
    } catch (error) {
      logger.error('[EIS] Error creating milestone:', error);
      res.status(400).json({ success: false, message: safeError(error) });
    }
  }
);

/**
 * GET /milestones — قائمة المعالم التنموية
 */
router.get(
  '/milestones',
  authenticate,
  authorize(EIS_ROLES),
  validateGetMilestones,
  handleValidation,
  async (req, res) => {
    try {
      const filters = {
        child: req.query.child,
        domain: req.query.domain,
        status: req.query.status,
        isDelayed: req.query.isDelayed,
        delaySeverity: req.query.delaySeverity,
      };
      const pagination = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 50,
        sortBy: req.query.sortBy || 'expectedAgeMonths',
        sortOrder: req.query.sortOrder === 'desc' ? -1 : 1,
      };

      const result = await earlyInterventionService.getMilestones(filters, pagination);
      res.json({ success: true, message: 'تم جلب المعالم التنموية بنجاح', ...result });
    } catch (error) {
      logger.error('[EIS] Error fetching milestones:', error);
      res.status(500).json({ success: false, message: 'خطأ في جلب البيانات' });
    }
  }
);

/**
 * GET /milestones/:id — تفاصيل معلم
 */
router.get(
  '/milestones/:id',
  authenticate,
  authorize(EIS_ROLES),
  mongoIdParam('id'),
  handleValidation,
  async (req, res) => {
    try {
      const milestone = await earlyInterventionService.getMilestoneById(req.params.id);
      res.json({ success: true, data: milestone });
    } catch (error) {
      logger.error('[EIS] Error fetching milestone:', error);
      res.status(404).json({ success: false, message: safeError(error) });
    }
  }
);

/**
 * GET /milestones/child/:childId — معالم طفل معين
 */
router.get(
  '/milestones/child/:childId',
  authenticate,
  authorize(EIS_ROLES),
  mongoIdParam('childId'),
  handleValidation,
  async (req, res) => {
    try {
      const milestones = await earlyInterventionService.getMilestonesByChild(req.params.childId);
      res.json({ success: true, data: milestones });
    } catch (error) {
      logger.error('[EIS] Error fetching child milestones:', error);
      res.status(500).json({ success: false, message: 'خطأ في جلب البيانات' });
    }
  }
);

/**
 * GET /milestones/child/:childId/report — تقرير المعالم التنموية
 */
router.get(
  '/milestones/child/:childId/report',
  authenticate,
  authorize(EIS_ROLES),
  mongoIdParam('childId'),
  handleValidation,
  async (req, res) => {
    try {
      const report = await earlyInterventionService.getMilestoneReport(req.params.childId);
      res.json({ success: true, message: 'تم إنشاء تقرير المعالم التنموية', data: report });
    } catch (error) {
      logger.error('[EIS] Error generating milestone report:', error);
      res.status(500).json({ success: false, message: 'خطأ في إنشاء التقرير' });
    }
  }
);

/**
 * PUT /milestones/:id — تحديث معلم تنموي
 */
router.put(
  '/milestones/:id',
  authenticate,
  authorize(EIS_ROLES),
  validateUpdateMilestone,
  handleValidation,
  async (req, res) => {
    try {
      const milestone = await earlyInterventionService.updateMilestone(
        req.params.id,
        req.body,
        req.user.id
      );
      res.json({ success: true, message: 'تم تحديث المعلم التنموي بنجاح', data: milestone });
    } catch (error) {
      logger.error('[EIS] Error updating milestone:', error);
      res.status(400).json({ success: false, message: safeError(error) });
    }
  }
);

/**
 * DELETE /milestones/:id — حذف معلم تنموي
 */
router.delete(
  '/milestones/:id',
  authenticate,
  authorize(EIS_ADMIN_ROLES),
  mongoIdParam('id'),
  handleValidation,
  async (req, res) => {
    try {
      await earlyInterventionService.deleteMilestone(req.params.id);
      res.json({ success: true, message: 'تم حذف المعلم التنموي بنجاح' });
    } catch (error) {
      logger.error('[EIS] Error deleting milestone:', error);
      res.status(400).json({ success: false, message: safeError(error) });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════════
// IFSPS — خطط الخدمات الأسرية الفردية
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /ifsps — إنشاء خطة IFSP جديدة
 */
router.post(
  '/ifsps',
  authenticate,
  authorize(EIS_ROLES),
  validateCreateIFSP,
  handleValidation,
  async (req, res) => {
    try {
      const ifsp = await earlyInterventionService.createIFSP(req.body, req.user.id);
      res.status(201).json({
        success: true,
        message: 'تم إنشاء خطة IFSP بنجاح',
        data: ifsp,
      });
    } catch (error) {
      logger.error('[EIS] Error creating IFSP:', error);
      res.status(400).json({ success: false, message: safeError(error) });
    }
  }
);

/**
 * GET /ifsps — قائمة الخطط
 */
router.get(
  '/ifsps',
  authenticate,
  authorize(EIS_ROLES),
  validateGetIFSPs,
  handleValidation,
  async (req, res) => {
    try {
      const filters = {
        child: req.query.child,
        status: req.query.status,
        planType: req.query.planType,
        serviceCoordinator: req.query.serviceCoordinator,
        organization: req.query.organization,
        dateFrom: req.query.dateFrom,
        dateTo: req.query.dateTo,
      };
      const pagination = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
        sortBy: req.query.sortBy || 'createdAt',
        sortOrder: req.query.sortOrder === 'asc' ? 1 : -1,
      };

      const result = await earlyInterventionService.getIFSPs(filters, pagination);
      res.json({ success: true, message: 'تم جلب قائمة الخطط بنجاح', ...result });
    } catch (error) {
      logger.error('[EIS] Error fetching IFSPs:', error);
      res.status(500).json({ success: false, message: 'خطأ في جلب البيانات' });
    }
  }
);

/**
 * GET /ifsps/:id — تفاصيل خطة IFSP
 */
router.get(
  '/ifsps/:id',
  authenticate,
  authorize(EIS_ROLES),
  mongoIdParam('id'),
  handleValidation,
  async (req, res) => {
    try {
      const ifsp = await earlyInterventionService.getIFSPById(req.params.id);
      res.json({ success: true, data: ifsp });
    } catch (error) {
      logger.error('[EIS] Error fetching IFSP:', error);
      res.status(404).json({ success: false, message: safeError(error) });
    }
  }
);

/**
 * GET /ifsps/child/:childId — خطط طفل معين
 */
router.get(
  '/ifsps/child/:childId',
  authenticate,
  authorize(EIS_ROLES),
  mongoIdParam('childId'),
  handleValidation,
  async (req, res) => {
    try {
      const ifsps = await earlyInterventionService.getIFSPsByChild(req.params.childId);
      res.json({ success: true, data: ifsps });
    } catch (error) {
      logger.error('[EIS] Error fetching child IFSPs:', error);
      res.status(500).json({ success: false, message: 'خطأ في جلب البيانات' });
    }
  }
);

/**
 * PUT /ifsps/:id — تحديث خطة IFSP
 */
router.put(
  '/ifsps/:id',
  authenticate,
  authorize(EIS_ROLES),
  validateUpdateIFSP,
  handleValidation,
  async (req, res) => {
    try {
      const ifsp = await earlyInterventionService.updateIFSP(req.params.id, req.body, req.user.id);
      res.json({ success: true, message: 'تم تحديث خطة IFSP بنجاح', data: ifsp });
    } catch (error) {
      logger.error('[EIS] Error updating IFSP:', error);
      res.status(400).json({ success: false, message: safeError(error) });
    }
  }
);

/**
 * DELETE /ifsps/:id — حذف خطة IFSP
 */
router.delete(
  '/ifsps/:id',
  authenticate,
  authorize(EIS_ADMIN_ROLES),
  mongoIdParam('id'),
  handleValidation,
  async (req, res) => {
    try {
      await earlyInterventionService.deleteIFSP(req.params.id);
      res.json({ success: true, message: 'تم حذف خطة IFSP بنجاح' });
    } catch (error) {
      logger.error('[EIS] Error deleting IFSP:', error);
      res.status(400).json({ success: false, message: safeError(error) });
    }
  }
);

/**
 * POST /ifsps/:id/reviews — إضافة مراجعة لخطة IFSP
 */
router.post(
  '/ifsps/:id/reviews',
  authenticate,
  authorize(EIS_ROLES),
  validateAddIFSPReview,
  handleValidation,
  async (req, res) => {
    try {
      const ifsp = await earlyInterventionService.addIFSPReview(
        req.params.id,
        req.body,
        req.user.id
      );
      res.status(201).json({
        success: true,
        message: 'تم إضافة المراجعة بنجاح',
        data: ifsp,
      });
    } catch (error) {
      logger.error('[EIS] Error adding IFSP review:', error);
      res.status(400).json({ success: false, message: safeError(error) });
    }
  }
);

/**
 * PUT /ifsps/:id/goals/:goalId/progress — تحديث تقدم هدف
 */
router.put(
  '/ifsps/:id/goals/:goalId/progress',
  authenticate,
  authorize(EIS_ROLES),
  validateUpdateGoalProgress,
  handleValidation,
  async (req, res) => {
    try {
      const ifsp = await earlyInterventionService.updateIFSPGoalProgress(
        req.params.id,
        req.params.goalId,
        req.body,
        req.user.id
      );
      res.json({ success: true, message: 'تم تحديث تقدم الهدف بنجاح', data: ifsp });
    } catch (error) {
      logger.error('[EIS] Error updating goal progress:', error);
      res.status(400).json({ success: false, message: safeError(error) });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════════
// REFERRALS — الإحالات المبكرة
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /referrals — إنشاء إحالة جديدة
 */
router.post(
  '/referrals',
  authenticate,
  authorize(EIS_ROLES),
  validateCreateReferral,
  handleValidation,
  async (req, res) => {
    try {
      const referral = await earlyInterventionService.createReferral(req.body, req.user.id);
      res.status(201).json({
        success: true,
        message: 'تم إنشاء الإحالة بنجاح',
        data: referral,
      });
    } catch (error) {
      logger.error('[EIS] Error creating referral:', error);
      res.status(400).json({ success: false, message: safeError(error) });
    }
  }
);

/**
 * GET /referrals — قائمة الإحالات
 */
router.get(
  '/referrals',
  authenticate,
  authorize(EIS_ROLES),
  validateGetReferrals,
  handleValidation,
  async (req, res) => {
    try {
      const filters = {
        child: req.query.child,
        status: req.query.status,
        referralDirection: req.query.referralDirection,
        sourceType: req.query.sourceType,
        urgency: req.query.urgency,
        organization: req.query.organization,
        search: req.query.search,
        dateFrom: req.query.dateFrom,
        dateTo: req.query.dateTo,
      };
      const pagination = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
        sortBy: req.query.sortBy || 'referralDate',
        sortOrder: req.query.sortOrder === 'asc' ? 1 : -1,
      };

      const result = await earlyInterventionService.getReferrals(filters, pagination);
      res.json({ success: true, message: 'تم جلب قائمة الإحالات بنجاح', ...result });
    } catch (error) {
      logger.error('[EIS] Error fetching referrals:', error);
      res.status(500).json({ success: false, message: 'خطأ في جلب البيانات' });
    }
  }
);

/**
 * GET /referrals/:id — تفاصيل إحالة
 */
router.get(
  '/referrals/:id',
  authenticate,
  authorize(EIS_ROLES),
  mongoIdParam('id'),
  handleValidation,
  async (req, res) => {
    try {
      const referral = await earlyInterventionService.getReferralById(req.params.id);
      res.json({ success: true, data: referral });
    } catch (error) {
      logger.error('[EIS] Error fetching referral:', error);
      res.status(404).json({ success: false, message: safeError(error) });
    }
  }
);

/**
 * GET /referrals/child/:childId — إحالات طفل معين
 */
router.get(
  '/referrals/child/:childId',
  authenticate,
  authorize(EIS_ROLES),
  mongoIdParam('childId'),
  handleValidation,
  async (req, res) => {
    try {
      const referrals = await earlyInterventionService.getReferralsByChild(req.params.childId);
      res.json({ success: true, data: referrals });
    } catch (error) {
      logger.error('[EIS] Error fetching child referrals:', error);
      res.status(500).json({ success: false, message: 'خطأ في جلب البيانات' });
    }
  }
);

/**
 * PUT /referrals/:id — تحديث إحالة
 */
router.put(
  '/referrals/:id',
  authenticate,
  authorize(EIS_ROLES),
  validateUpdateReferral,
  handleValidation,
  async (req, res) => {
    try {
      const referral = await earlyInterventionService.updateReferral(
        req.params.id,
        req.body,
        req.user.id
      );
      res.json({ success: true, message: 'تم تحديث الإحالة بنجاح', data: referral });
    } catch (error) {
      logger.error('[EIS] Error updating referral:', error);
      res.status(400).json({ success: false, message: safeError(error) });
    }
  }
);

/**
 * DELETE /referrals/:id — حذف إحالة
 */
router.delete(
  '/referrals/:id',
  authenticate,
  authorize(EIS_ADMIN_ROLES),
  mongoIdParam('id'),
  handleValidation,
  async (req, res) => {
    try {
      await earlyInterventionService.deleteReferral(req.params.id);
      res.json({ success: true, message: 'تم حذف الإحالة بنجاح' });
    } catch (error) {
      logger.error('[EIS] Error deleting referral:', error);
      res.status(400).json({ success: false, message: safeError(error) });
    }
  }
);

/**
 * PATCH /referrals/:id/status — تحديث حالة الإحالة
 */
router.patch(
  '/referrals/:id/status',
  authenticate,
  authorize(EIS_ROLES),
  validateUpdateReferralStatus,
  handleValidation,
  async (req, res) => {
    try {
      const referral = await earlyInterventionService.updateReferralStatus(
        req.params.id,
        req.body.status,
        req.user.id
      );
      res.json({ success: true, message: 'تم تحديث حالة الإحالة بنجاح', data: referral });
    } catch (error) {
      logger.error('[EIS] Error updating referral status:', error);
      res.status(400).json({ success: false, message: safeError(error) });
    }
  }
);

/**
 * POST /referrals/:id/communications — إضافة سجل تواصل للإحالة
 */
router.post(
  '/referrals/:id/communications',
  authenticate,
  authorize(EIS_ROLES),
  validateAddCommunication,
  handleValidation,
  async (req, res) => {
    try {
      const referral = await earlyInterventionService.addReferralCommunication(
        req.params.id,
        req.body,
        req.user.id
      );
      res.status(201).json({
        success: true,
        message: 'تم إضافة سجل التواصل بنجاح',
        data: referral,
      });
    } catch (error) {
      logger.error('[EIS] Error adding communication:', error);
      res.status(400).json({ success: false, message: safeError(error) });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD — لوحة المعلومات
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /dashboard — إحصائيات نظام التدخل المبكر
 */
router.get('/dashboard', authenticate, authorize(EIS_ROLES), async (req, res) => {
  try {
    const stats = await earlyInterventionService.getDashboardStats(req.query.organization);
    res.json({
      success: true,
      message: 'تم جلب إحصائيات لوحة المعلومات بنجاح',
      data: stats,
    });
  } catch (error) {
    logger.error('[EIS] Error fetching dashboard:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب الإحصائيات' });
  }
});

module.exports = router;
