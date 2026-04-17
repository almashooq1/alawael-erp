/**
 * @module controllers/independentLiving.controller
 * @description متحكم نظام الانتقال للحياة المستقلة
 * يتعامل مع طلبات HTTP لتقييمات ADL، خطط التدريب، تتبع التقدم، والإسكان المدعوم
 */

const IndependentLivingService = require('../services/independentLiving.service');
const logger = require('../utils/logger');
const safeError = require('../utils/safeError');

class IndependentLivingController {
  // ═══════════════════════════════════════════════════════
  //  تقييم مهارات الحياة اليومية (ADL)
  // ═══════════════════════════════════════════════════════

  /**
   * @route   POST /api/independent-living/assessments
   * @desc    إنشاء تقييم ADL جديد
   * @access  Private (therapist, supervisor, admin)
   */
  static async createAssessment(req, res) {
    try {
      const data = { ...req.body, assessor: req.user._id || req.user.id };
      const assessment = await IndependentLivingService.createAssessment(data);
      res.status(201).json({
        success: true,
        message: 'تم إنشاء تقييم مهارات الحياة اليومية بنجاح',
        data: assessment,
      });
    } catch (error) {
      logger.error('Error creating ADL assessment:', error);
      if (error.name === 'ValidationError') {
        return res.status(400).json({
          success: false,
          message: 'خطأ في بيانات التقييم',
          error: safeError(error),
        });
      }
      safeError(res, error, 'independentLiving');
    }
  }

  /**
   * @route   GET /api/independent-living/assessments
   * @desc    جلب تقييمات ADL مع فلترة وترقيم
   * @access  Private
   */
  static async getAssessments(req, res) {
    try {
      const result = await IndependentLivingService.getAssessments(req.query);
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      safeError(res, error, 'fetching ADL assessments');
    }
  }

  /**
   * @route   GET /api/independent-living/assessments/:id
   * @desc    جلب تقييم ADL بالتفصيل
   * @access  Private
   */
  static async getAssessmentById(req, res) {
    try {
      const assessment = await IndependentLivingService.getAssessmentById(req.params.id);
      if (!assessment) {
        return res.status(404).json({
          success: false,
          message: 'التقييم غير موجود',
        });
      }
      res.json({
        success: true,
        data: assessment,
      });
    } catch (error) {
      safeError(res, error, 'fetching ADL assessment');
    }
  }

  /**
   * @route   PUT /api/independent-living/assessments/:id
   * @desc    تحديث تقييم ADL
   * @access  Private (therapist, supervisor, admin)
   */
  static async updateAssessment(req, res) {
    try {
      const assessment = await IndependentLivingService.updateAssessment(req.params.id, req.body);
      if (!assessment) {
        return res.status(404).json({
          success: false,
          message: 'التقييم غير موجود',
        });
      }
      res.json({
        success: true,
        message: 'تم تحديث التقييم بنجاح',
        data: assessment,
      });
    } catch (error) {
      safeError(res, error, 'updating ADL assessment');
    }
  }

  /**
   * @route   DELETE /api/independent-living/assessments/:id
   * @desc    حذف تقييم ADL
   * @access  Private (admin)
   */
  static async deleteAssessment(req, res) {
    try {
      const result = await IndependentLivingService.deleteAssessment(req.params.id);
      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'التقييم غير موجود',
        });
      }
      res.json({
        success: true,
        message: 'تم حذف التقييم بنجاح',
      });
    } catch (error) {
      safeError(res, error, 'deleting ADL assessment');
    }
  }

  /**
   * @route   POST /api/independent-living/assessments/:id/review
   * @desc    مراجعة تقييم ADL
   * @access  Private (supervisor, admin)
   */
  static async reviewAssessment(req, res) {
    try {
      const reviewerId = req.user._id || req.user.id;
      const assessment = await IndependentLivingService.reviewAssessment(
        req.params.id,
        reviewerId,
        req.body.reviewNotes
      );
      if (!assessment) {
        return res.status(404).json({
          success: false,
          message: 'التقييم غير موجود',
        });
      }
      res.json({
        success: true,
        message: 'تمت مراجعة التقييم بنجاح',
        data: assessment,
      });
    } catch (error) {
      safeError(res, error, 'reviewing ADL assessment');
    }
  }

  /**
   * @route   GET /api/independent-living/assessments/compare/:beneficiaryId
   * @desc    مقارنة تقييمات مستفيد عبر الزمن
   * @access  Private
   */
  static async compareAssessments(req, res) {
    try {
      const result = await IndependentLivingService.compareAssessments(req.params.beneficiaryId);
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      safeError(res, error, 'comparing assessments');
    }
  }

  // ═══════════════════════════════════════════════════════
  //  خطط التدريب الفردية
  // ═══════════════════════════════════════════════════════

  /**
   * @route   POST /api/independent-living/plans
   * @desc    إنشاء خطة تدريب فردية
   * @access  Private (therapist, supervisor, admin)
   */
  static async createPlan(req, res) {
    try {
      const data = { ...req.body, createdBy: req.user._id || req.user.id };
      const plan = await IndependentLivingService.createPlan(data);
      res.status(201).json({
        success: true,
        message: 'تم إنشاء خطة التدريب بنجاح',
        data: plan,
      });
    } catch (error) {
      logger.error('Error creating training plan:', error);
      if (error.name === 'ValidationError') {
        return res.status(400).json({
          success: false,
          message: 'خطأ في بيانات الخطة',
          error: safeError(error),
        });
      }
      safeError(res, error, 'independentLiving');
    }
  }

  /**
   * @route   GET /api/independent-living/plans
   * @desc    جلب خطط التدريب
   * @access  Private
   */
  static async getPlans(req, res) {
    try {
      const result = await IndependentLivingService.getPlans(req.query);
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      safeError(res, error, 'fetching training plans');
    }
  }

  /**
   * @route   GET /api/independent-living/plans/:id
   * @desc    جلب خطة تدريب بالتفصيل
   * @access  Private
   */
  static async getPlanById(req, res) {
    try {
      const plan = await IndependentLivingService.getPlanById(req.params.id);
      if (!plan) {
        return res.status(404).json({
          success: false,
          message: 'خطة التدريب غير موجودة',
        });
      }
      res.json({
        success: true,
        data: plan,
      });
    } catch (error) {
      safeError(res, error, 'fetching training plan');
    }
  }

  /**
   * @route   PUT /api/independent-living/plans/:id
   * @desc    تحديث خطة تدريب
   * @access  Private (therapist, supervisor, admin)
   */
  static async updatePlan(req, res) {
    try {
      const plan = await IndependentLivingService.updatePlan(req.params.id, req.body);
      if (!plan) {
        return res.status(404).json({
          success: false,
          message: 'خطة التدريب غير موجودة',
        });
      }
      res.json({
        success: true,
        message: 'تم تحديث خطة التدريب بنجاح',
        data: plan,
      });
    } catch (error) {
      safeError(res, error, 'updating training plan');
    }
  }

  /**
   * @route   DELETE /api/independent-living/plans/:id
   * @desc    حذف خطة تدريب
   * @access  Private (admin)
   */
  static async deletePlan(req, res) {
    try {
      const result = await IndependentLivingService.deletePlan(req.params.id);
      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'خطة التدريب غير موجودة',
        });
      }
      res.json({
        success: true,
        message: 'تم حذف خطة التدريب بنجاح',
      });
    } catch (error) {
      safeError(res, error, 'deleting training plan');
    }
  }

  /**
   * @route   POST /api/independent-living/plans/:id/sessions
   * @desc    إضافة جلسة تدريب لخطة
   * @access  Private (trainer, therapist, supervisor, admin)
   */
  static async addSession(req, res) {
    try {
      const sessionData = { ...req.body, trainer: req.body.trainer || req.user._id || req.user.id };
      const plan = await IndependentLivingService.addSession(req.params.id, sessionData);
      if (!plan) {
        return res.status(404).json({
          success: false,
          message: 'خطة التدريب غير موجودة',
        });
      }
      res.status(201).json({
        success: true,
        message: 'تم إضافة جلسة التدريب بنجاح',
        data: plan,
      });
    } catch (error) {
      safeError(res, error, 'adding training session');
    }
  }

  /**
   * @route   PUT /api/independent-living/plans/:planId/goals/:goalId
   * @desc    تحديث هدف تدريبي
   * @access  Private (trainer, therapist, supervisor, admin)
   */
  static async updateGoal(req, res) {
    try {
      const plan = await IndependentLivingService.updateGoal(
        req.params.planId,
        req.params.goalId,
        req.body
      );
      if (!plan) {
        return res.status(404).json({
          success: false,
          message: 'الخطة أو الهدف غير موجود',
        });
      }
      res.json({
        success: true,
        message: 'تم تحديث الهدف التدريبي بنجاح',
        data: plan,
      });
    } catch (error) {
      safeError(res, error, 'updating training goal');
    }
  }

  /**
   * @route   POST /api/independent-living/plans/:id/reviews
   * @desc    إضافة مراجعة لخطة تدريب
   * @access  Private (supervisor, admin)
   */
  static async addPlanReview(req, res) {
    try {
      const reviewData = { ...req.body, reviewer: req.user._id || req.user.id };
      const plan = await IndependentLivingService.addPlanReview(req.params.id, reviewData);
      if (!plan) {
        return res.status(404).json({
          success: false,
          message: 'خطة التدريب غير موجودة',
        });
      }
      res.status(201).json({
        success: true,
        message: 'تمت إضافة المراجعة بنجاح',
        data: plan,
      });
    } catch (error) {
      safeError(res, error, 'adding plan review');
    }
  }

  // ═══════════════════════════════════════════════════════
  //  تتبع التقدم نحو الاستقلالية
  // ═══════════════════════════════════════════════════════

  /**
   * @route   POST /api/independent-living/progress
   * @desc    تسجيل تقدم فترة جديدة
   * @access  Private (therapist, supervisor, admin)
   */
  static async recordProgress(req, res) {
    try {
      const data = { ...req.body, recordedBy: req.user._id || req.user.id };
      const progress = await IndependentLivingService.recordProgress(data);
      res.status(201).json({
        success: true,
        message: 'تم تسجيل التقدم بنجاح',
        data: progress,
      });
    } catch (error) {
      logger.error('Error recording progress:', error);
      if (error.name === 'ValidationError') {
        return res.status(400).json({
          success: false,
          message: 'خطأ في بيانات التقدم',
          error: safeError(error),
        });
      }
      safeError(res, error, 'independentLiving');
    }
  }

  /**
   * @route   GET /api/independent-living/progress
   * @desc    جلب سجلات التقدم
   * @access  Private
   */
  static async getProgressRecords(req, res) {
    try {
      const result = await IndependentLivingService.getProgressRecords(req.query);
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      safeError(res, error, 'fetching progress records');
    }
  }

  /**
   * @route   GET /api/independent-living/progress/:id
   * @desc    جلب سجل تقدم بالتفصيل
   * @access  Private
   */
  static async getProgressById(req, res) {
    try {
      const progress = await IndependentLivingService.getProgressById(req.params.id);
      if (!progress) {
        return res.status(404).json({
          success: false,
          message: 'سجل التقدم غير موجود',
        });
      }
      res.json({
        success: true,
        data: progress,
      });
    } catch (error) {
      safeError(res, error, 'fetching progress record');
    }
  }

  /**
   * @route   PUT /api/independent-living/progress/:id
   * @desc    تحديث سجل تقدم
   * @access  Private (therapist, supervisor, admin)
   */
  static async updateProgress(req, res) {
    try {
      const progress = await IndependentLivingService.updateProgress(req.params.id, req.body);
      if (!progress) {
        return res.status(404).json({
          success: false,
          message: 'سجل التقدم غير موجود',
        });
      }
      res.json({
        success: true,
        message: 'تم تحديث سجل التقدم بنجاح',
        data: progress,
      });
    } catch (error) {
      safeError(res, error, 'updating progress record');
    }
  }

  /**
   * @route   DELETE /api/independent-living/progress/:id
   * @desc    حذف سجل تقدم
   * @access  Private (admin)
   */
  static async deleteProgress(req, res) {
    try {
      const result = await IndependentLivingService.deleteProgress(req.params.id);
      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'سجل التقدم غير موجود',
        });
      }
      res.json({
        success: true,
        message: 'تم حذف سجل التقدم بنجاح',
      });
    } catch (error) {
      safeError(res, error, 'deleting progress record');
    }
  }

  /**
   * @route   GET /api/independent-living/progress/timeline/:beneficiaryId
   * @desc    منحنى تقدم مستفيد
   * @access  Private
   */
  static async getProgressTimeline(req, res) {
    try {
      const result = await IndependentLivingService.getProgressTimeline(
        req.params.beneficiaryId,
        req.query.planId
      );
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      safeError(res, error, 'fetching progress timeline');
    }
  }

  // ═══════════════════════════════════════════════════════
  //  برامج الإسكان المدعوم
  // ═══════════════════════════════════════════════════════

  /**
   * @route   POST /api/independent-living/housing
   * @desc    إنشاء برنامج إسكان مدعوم
   * @access  Private (supervisor, admin)
   */
  static async createHousingProgram(req, res) {
    try {
      const program = await IndependentLivingService.createHousingProgram(req.body);
      res.status(201).json({
        success: true,
        message: 'تم إنشاء برنامج الإسكان المدعوم بنجاح',
        data: program,
      });
    } catch (error) {
      logger.error('Error creating housing program:', error);
      if (error.name === 'ValidationError') {
        return res.status(400).json({
          success: false,
          message: 'خطأ في بيانات البرنامج',
          error: safeError(error),
        });
      }
      safeError(res, error, 'independentLiving');
    }
  }

  /**
   * @route   GET /api/independent-living/housing
   * @desc    جلب برامج الإسكان
   * @access  Private
   */
  static async getHousingPrograms(req, res) {
    try {
      const result = await IndependentLivingService.getHousingPrograms(req.query);
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      safeError(res, error, 'fetching housing programs');
    }
  }

  /**
   * @route   GET /api/independent-living/housing/:id
   * @desc    جلب برنامج إسكان بالتفصيل
   * @access  Private
   */
  static async getHousingProgramById(req, res) {
    try {
      const program = await IndependentLivingService.getHousingProgramById(req.params.id);
      if (!program) {
        return res.status(404).json({
          success: false,
          message: 'برنامج الإسكان غير موجود',
        });
      }
      res.json({
        success: true,
        data: program,
      });
    } catch (error) {
      safeError(res, error, 'fetching housing program');
    }
  }

  /**
   * @route   PUT /api/independent-living/housing/:id
   * @desc    تحديث برنامج إسكان
   * @access  Private (supervisor, admin)
   */
  static async updateHousingProgram(req, res) {
    try {
      const program = await IndependentLivingService.updateHousingProgram(req.params.id, req.body);
      if (!program) {
        return res.status(404).json({
          success: false,
          message: 'برنامج الإسكان غير موجود',
        });
      }
      res.json({
        success: true,
        message: 'تم تحديث برنامج الإسكان بنجاح',
        data: program,
      });
    } catch (error) {
      safeError(res, error, 'updating housing program');
    }
  }

  /**
   * @route   DELETE /api/independent-living/housing/:id
   * @desc    حذف برنامج إسكان
   * @access  Private (admin)
   */
  static async deleteHousingProgram(req, res) {
    try {
      const result = await IndependentLivingService.deleteHousingProgram(req.params.id);
      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'برنامج الإسكان غير موجود',
        });
      }
      res.json({
        success: true,
        message: 'تم حذف برنامج الإسكان بنجاح',
      });
    } catch (error) {
      safeError(res, error, 'deleting housing program');
    }
  }

  /**
   * @route   POST /api/independent-living/housing/:id/readiness
   * @desc    إضافة تقييم جاهزية سكن
   * @access  Private (therapist, supervisor, admin)
   */
  static async addReadinessAssessment(req, res) {
    try {
      const assessmentData = { ...req.body, assessedBy: req.user._id || req.user.id };
      const program = await IndependentLivingService.addReadinessAssessment(
        req.params.id,
        assessmentData
      );
      if (!program) {
        return res.status(404).json({
          success: false,
          message: 'برنامج الإسكان غير موجود',
        });
      }
      res.status(201).json({
        success: true,
        message: 'تم إضافة تقييم الجاهزية بنجاح',
        data: program,
      });
    } catch (error) {
      safeError(res, error, 'adding readiness assessment');
    }
  }

  /**
   * @route   POST /api/independent-living/housing/:id/home-visits
   * @desc    إضافة زيارة منزلية
   * @access  Private (supervisor, social_worker, admin)
   */
  static async addHomeVisit(req, res) {
    try {
      const visitData = { ...req.body, visitor: req.body.visitor || req.user._id || req.user.id };
      const program = await IndependentLivingService.addHomeVisit(req.params.id, visitData);
      if (!program) {
        return res.status(404).json({
          success: false,
          message: 'برنامج الإسكان غير موجود',
        });
      }
      res.status(201).json({
        success: true,
        message: 'تم إضافة الزيارة المنزلية بنجاح',
        data: program,
      });
    } catch (error) {
      safeError(res, error, 'adding home visit');
    }
  }

  /**
   * @route   POST /api/independent-living/housing/:id/satisfaction
   * @desc    إضافة استبيان رضا المستفيد
   * @access  Private
   */
  static async addSatisfactionSurvey(req, res) {
    try {
      const program = await IndependentLivingService.addSatisfactionSurvey(req.params.id, req.body);
      if (!program) {
        return res.status(404).json({
          success: false,
          message: 'برنامج الإسكان غير موجود',
        });
      }
      res.status(201).json({
        success: true,
        message: 'تم تسجيل استبيان الرضا بنجاح',
        data: program,
      });
    } catch (error) {
      safeError(res, error, 'adding satisfaction survey');
    }
  }

  // ═══════════════════════════════════════════════════════
  //  الإحصائيات والتقارير
  // ═══════════════════════════════════════════════════════

  /**
   * @route   GET /api/independent-living/dashboard
   * @desc    لوحة معلومات نظام الحياة المستقلة
   * @access  Private (supervisor, admin)
   */
  static async getDashboard(req, res) {
    try {
      const stats = await IndependentLivingService.getDashboardStats();
      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      safeError(res, error, 'fetching dashboard stats');
    }
  }

  /**
   * @route   GET /api/independent-living/reports/beneficiary/:beneficiaryId
   * @desc    تقرير شامل لمستفيد
   * @access  Private
   */
  static async getBeneficiaryReport(req, res) {
    try {
      const report = await IndependentLivingService.getBeneficiaryReport(req.params.beneficiaryId);
      res.json({
        success: true,
        data: report,
      });
    } catch (error) {
      safeError(res, error, 'fetching beneficiary report');
    }
  }
}

module.exports = IndependentLivingController;
