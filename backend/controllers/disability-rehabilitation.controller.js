/**
 * Disability Rehabilitation Controller
 * متحكم نظام تأهيل ذوي الإعاقة
 *
 * @module controllers/disability-rehabilitation
 * @description معالجة طلبات API لنظام التأهيل
 * @version 1.0.0
 * @date 2026-01-19
 */

const rehabilitationService = require('../services/disability-rehabilitation.service');

class DisabilityRehabilitationController {
  /**
   * @route   POST /api/v1/disability-rehabilitation/programs
   * @desc    إنشاء برنامج تأهيل جديد
   * @access  Private
   */
  async createProgram(req, res) {
    try {
      if (!req.headers.authorization) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      if (!req.body?.program_info?.name_ar || !req.body?.program_info?.name_en) {
        return res.status(400).json({
          success: false,
          message: 'بيانات البرنامج غير مكتملة',
        });
      }

      const programData = req.body;
      const createdBy = {
        userId: req.user?.id || req.user?._id || 'test-user',
        name: req.user?.name || req.user?.full_name || 'Test User',
      };

      const result = await rehabilitationService.createProgram(programData, createdBy);
      if (!result.success) {
        const statusCode = result.code === 'VALIDATION_FAILED' ? 400 : 404;
        return res.status(statusCode).json(result);
      }
      return res.status(201).json(result);
    } catch (error) {
      console.error('Error in createProgram:', error);
      return res.status(500).json({
        success: false,
        message: 'حدث خطأ أثناء إنشاء برنامج التأهيل',
        error: error.message,
      });
    }
  }

  /**
   * @route   GET /api/v1/disability-rehabilitation/programs/:id
   * @desc    الحصول على برنامج محدد
   * @access  Private
   */
  async getProgramById(req, res) {
    try {
      const { id } = req.params;
      const result = await rehabilitationService.getProgramById(id);

      if (!result.success) {
        return res.status(404).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      console.error('Error in getProgramById:', error);
      return res.status(500).json({
        success: false,
        message: 'حدث خطأ أثناء جلب بيانات البرنامج',
        error: error.message,
      });
    }
  }

  /**
   * @route   GET /api/v1/disability-rehabilitation/programs
   * @desc    الحصول على جميع البرامج مع الفلترة
   * @access  Private
   */
  async getAllPrograms(req, res) {
    try {
      const filters = {
        disability_type: req.query.disability_type,
        status: req.query.status,
        beneficiary_id: req.query.beneficiary_id,
        severity: req.query.severity,
        date_from: req.query.date_from,
        date_to: req.query.date_to,
        search: req.query.search,
      };

      const pagination = {
        page: req.query.page || 1,
        limit: req.query.limit || 20,
        sort: req.query.sort || '-createdAt',
      };

      const result = await rehabilitationService.getAllPrograms(filters, pagination);

      return res.status(200).json(result);
    } catch (error) {
      console.error('Error in getAllPrograms:', error);
      return res.status(500).json({
        success: false,
        message: 'حدث خطأ أثناء جلب قائمة البرامج',
        error: error.message,
      });
    }
  }

  /**
   * @route   PUT /api/v1/disability-rehabilitation/programs/:id
   * @desc    تحديث برنامج التأهيل
   * @access  Private
   */
  async updateProgram(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const updatedBy = {
        userId: req.user.id || req.user._id,
        name: req.user.name || req.user.full_name,
      };

      const result = await rehabilitationService.updateProgram(id, updateData, updatedBy);

      if (!result.success) {
        return res.status(404).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      console.error('Error in updateProgram:', error);
      return res.status(500).json({
        success: false,
        message: 'حدث خطأ أثناء تحديث البرنامج',
        error: error.message,
      });
    }
  }

  /**
   * @route   POST /api/v1/disability-rehabilitation/programs/:id/sessions
   * @desc    إضافة جلسة جديدة
   * @access  Private
   */
  async addSession(req, res) {
    try {
      const { id } = req.params;
      const sessionData = req.body;
      const addedBy = {
        userId: req.user.id || req.user._id,
        name: req.user.name || req.user.full_name,
      };

      const result = await rehabilitationService.addSession(id, sessionData, addedBy);

      if (!result.success) {
        return res.status(404).json(result);
      }

      return res.status(201).json(result);
    } catch (error) {
      console.error('Error in addSession:', error);
      return res.status(500).json({
        success: false,
        message: 'حدث خطأ أثناء إضافة الجلسة',
        error: error.message,
      });
    }
  }

  /**
   * @route   PUT /api/v1/disability-rehabilitation/programs/:id/goals/:goalId
   * @desc    تحديث حالة هدف
   * @access  Private
   */
  async updateGoalStatus(req, res) {
    try {
      const { id, goalId } = req.params;
      const { status, progress } = req.body;
      const updatedBy = {
        userId: req.user.id || req.user._id,
        name: req.user.name || req.user.full_name,
      };

      const result = await rehabilitationService.updateGoalStatus(
        id,
        goalId,
        status,
        progress,
        updatedBy
      );

      if (!result.success) {
        return res.status(404).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      console.error('Error in updateGoalStatus:', error);
      return res.status(500).json({
        success: false,
        message: 'حدث خطأ أثناء تحديث حالة الهدف',
        error: error.message,
      });
    }
  }

  /**
   * @route   POST /api/v1/disability-rehabilitation/programs/:id/assessments
   * @desc    إضافة تقييم
   * @access  Private
   */
  async addAssessment(req, res) {
    try {
      const { id } = req.params;
      const assessmentData = req.body;
      const addedBy = {
        userId: req.user.id || req.user._id,
        name: req.user.name || req.user.full_name,
      };

      const result = await rehabilitationService.addAssessment(id, assessmentData, addedBy);

      if (!result.success) {
        return res.status(404).json(result);
      }

      return res.status(201).json(result);
    } catch (error) {
      console.error('Error in addAssessment:', error);
      return res.status(500).json({
        success: false,
        message: 'حدث خطأ أثناء إضافة التقييم',
        error: error.message,
      });
    }
  }

  /**
   * @route   PUT /api/v1/disability-rehabilitation/programs/:id/complete
   * @desc    إنهاء البرنامج
   * @access  Private
   */
  async completeProgram(req, res) {
    try {
      const { id } = req.params;
      const { completion_notes } = req.body;
      const completedBy = {
        userId: req.user.id || req.user._id,
        name: req.user.name || req.user.full_name,
      };

      const result = await rehabilitationService.completeProgram(id, completion_notes, completedBy);

      if (!result.success) {
        return res.status(404).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      console.error('Error in completeProgram:', error);
      return res.status(500).json({
        success: false,
        message: 'حدث خطأ أثناء إنهاء البرنامج',
        error: error.message,
      });
    }
  }

  /**
   * @route   DELETE /api/v1/disability-rehabilitation/programs/:id
   * @desc    حذف برنامج (soft delete)
   * @access  Private
   */
  async deleteProgram(req, res) {
    try {
      const { id } = req.params;
      const deletedBy = {
        userId: req.user.id || req.user._id,
        name: req.user.name || req.user.full_name,
      };

      const result = await rehabilitationService.deleteProgram(id, deletedBy);

      if (!result.success) {
        return res.status(404).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      console.error('Error in deleteProgram:', error);
      return res.status(500).json({
        success: false,
        message: 'حدث خطأ أثناء حذف البرنامج',
        error: error.message,
      });
    }
  }

  /**
   * @route   GET /api/v1/disability-rehabilitation/statistics
   * @desc    إحصائيات عامة
   * @access  Private
   */
  async getStatistics(req, res) {
    try {
      const filters = {
        date_from: req.query.date_from,
        date_to: req.query.date_to,
      };

      const result = await rehabilitationService.getStatistics(filters);

      return res.status(200).json(result);
    } catch (error) {
      console.error('Error in getStatistics:', error);
      return res.status(500).json({
        success: false,
        message: 'حدث خطأ أثناء جلب الإحصائيات',
        error: error.message,
      });
    }
  }

  /**
   * @route   GET /api/v1/disability-rehabilitation/performance/:year/:month
   * @desc    تقرير الأداء الشهري
   * @access  Private
   */
  async getMonthlyPerformance(req, res) {
    try {
      const { year, month } = req.params;

      const result = await rehabilitationService.getMonthlyPerformance(
        parseInt(year),
        parseInt(month)
      );

      return res.status(200).json(result);
    } catch (error) {
      console.error('Error in getMonthlyPerformance:', error);
      return res.status(500).json({
        success: false,
        message: 'حدث خطأ أثناء جلب تقرير الأداء',
        error: error.message,
      });
    }
  }

  /**
   * @route   GET /api/v1/disability-rehabilitation/beneficiary/:beneficiaryId/programs
   * @desc    الحصول على برامج المستفيد
   * @access  Private
   */
  async getBeneficiaryPrograms(req, res) {
    try {
      const { beneficiaryId } = req.params;

      const result = await rehabilitationService.getBeneficiaryPrograms(beneficiaryId);

      return res.status(200).json(result);
    } catch (error) {
      console.error('Error in getBeneficiaryPrograms:', error);
      return res.status(500).json({
        success: false,
        message: 'حدث خطأ أثناء جلب برامج المستفيد',
        error: error.message,
      });
    }
  }

  /**
   * @route   GET /api/v1/disability-rehabilitation/programs/:id/report
   * @desc    تقرير تفصيلي عن برنامج
   * @access  Private
   */
  async getDetailedReport(req, res) {
    try {
      const { id } = req.params;

      const result = await rehabilitationService.getDetailedReport(id);

      if (!result.success) {
        return res.status(404).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      console.error('Error in getDetailedReport:', error);
      return res.status(500).json({
        success: false,
        message: 'حدث خطأ أثناء إنشاء التقرير',
        error: error.message,
      });
    }
  }
}

module.exports = new DisabilityRehabilitationController();
