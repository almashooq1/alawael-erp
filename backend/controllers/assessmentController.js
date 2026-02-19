/**
 * Assessment Controller
 * 
 * معالجات الطلبات HTTP لنظام التقييمات
 */

const AssessmentService = require('../services/assessmentService');

class AssessmentController {
  /**
   * إنشاء تقييم جديد
   * POST /api/assessments
   */
  static async createAssessment(req, res) {
    try {
      const userId = req.user?.id || 'system';
      const assessment = await AssessmentService.createAssessment(req.body, userId);

      res.status(201).json({
        success: true,
        message: 'تم إنشاء التقييم بنجاح',
        data: assessment,
      });
    } catch (err) {
      res.status(400).json({
        success: false,
        message: 'خطأ في إنشاء التقييم',
        error: err.message,
      });
    }
  }

  /**
   * جلب التقييمات
   * GET /api/assessments
   */
  static async getAssessments(req, res) {
    try {
      const filters = {
        caseId: req.query.caseId,
        beneficiaryId: req.query.beneficiaryId,
        assessmentType: req.query.type,
        status: req.query.status,
        assessor: req.query.assessor,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
      };

      const pagination = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 10,
      };

      const result = await AssessmentService.getAssessments(filters, pagination);

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: 'خطأ في جلب التقييمات',
        error: err.message,
      });
    }
  }

  /**
   * جلب تقييم واحد
   * GET /api/assessments/:id
   */
  static async getAssessmentById(req, res) {
    try {
      const assessment = await AssessmentService.getAssessmentById(req.params.id);

      res.json({
        success: true,
        data: assessment,
      });
    } catch (err) {
      res.status(404).json({
        success: false,
        message: 'التقييم غير موجود',
        error: err.message,
      });
    }
  }

  /**
   * تحديث التقييم
   * PUT /api/assessments/:id
   */
  static async updateAssessment(req, res) {
    try {
      const userId = req.user?.id || 'system';
      const assessment = await AssessmentService.updateAssessment(req.params.id, req.body, userId);

      res.json({
        success: true,
        message: 'تم تحديث التقييم بنجاح',
        data: assessment,
      });
    } catch (err) {
      res.status(400).json({
        success: false,
        message: 'خطأ في تحديث التقييم',
        error: err.message,
      });
    }
  }

  /**
   * الموافقة على التقييم
   * POST /api/assessments/:id/approve
   */
  static async approveAssessment(req, res) {
    try {
      const userId = req.user?.id || 'system';
      const assessment = await AssessmentService.approveAssessment(
        req.params.id,
        userId,
        req.body.notes || ''
      );

      res.json({
        success: true,
        message: 'تم الموافقة على التقييم',
        data: assessment,
      });
    } catch (err) {
      res.status(400).json({
        success: false,
        message: 'خطأ في الموافقة على التقييم',
        error: err.message,
      });
    }
  }

  /**
   * رفض التقييم
   * POST /api/assessments/:id/reject
   */
  static async rejectAssessment(req, res) {
    try {
      const userId = req.user?.id || 'system';
      const assessment = await AssessmentService.rejectAssessment(
        req.params.id,
        userId,
        req.body.reason || ''
      );

      res.json({
        success: true,
        message: 'تم رفض التقييم',
        data: assessment,
      });
    } catch (err) {
      res.status(400).json({
        success: false,
        message: 'خطأ في رفض التقييم',
        error: err.message,
      });
    }
  }

  /**
   * أرشفة التقييم
   * POST /api/assessments/:id/archive
   */
  static async archiveAssessment(req, res) {
    try {
      const assessment = await AssessmentService.archiveAssessment(req.params.id);

      res.json({
        success: true,
        message: 'تم أرشفة التقييم',
        data: assessment,
      });
    } catch (err) {
      res.status(400).json({
        success: false,
        message: 'خطأ في أرشفة التقييم',
        error: err.message,
      });
    }
  }

  /**
   * حذف التقييم
   * DELETE /api/assessments/:id
   */
  static async deleteAssessment(req, res) {
    try {
      await AssessmentService.deleteAssessment(req.params.id);

      res.json({
        success: true,
        message: 'تم حذف التقييم',
      });
    } catch (err) {
      res.status(400).json({
        success: false,
        message: 'خطأ في حذف التقييم',
        error: err.message,
      });
    }
  }

  /**
   * الحصول على الإحصائيات
   * GET /api/assessments/statistics
   */
  static async getStatistics(req, res) {
    try {
      const filters = {
        caseId: req.query.caseId,
      };

      const stats = await AssessmentService.getStatistics(filters);

      res.json({
        success: true,
        data: stats,
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: 'خطأ في حساب الإحصائيات',
        error: err.message,
      });
    }
  }

  /**
   * البحث المتقدم
   * GET /api/assessments/search
   */
  static async advancedSearch(req, res) {
    try {
      const assessments = await AssessmentService.advancedSearch(req.query);

      res.json({
        success: true,
        data: assessments,
      });
    } catch (err) {
      res.status(400).json({
        success: false,
        message: 'خطأ في البحث',
        error: err.message,
      });
    }
  }

  /**
   * التقييمات المعلقة
   * GET /api/assessments/pending
   */
  static async getPendingAssessments(req, res) {
    try {
      const assessments = await AssessmentService.getPendingAssessments();

      res.json({
        success: true,
        data: assessments,
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: 'خطأ في جلب التقييمات المعلقة',
        error: err.message,
      });
    }
  }

  /**
   * التقييمات حسب النوع
   * GET /api/assessments/type/:type
   */
  static async getAssessmentsByType(req, res) {
    try {
      const assessments = await AssessmentService.getAssessmentsByType(req.params.type);

      res.json({
        success: true,
        data: assessments,
      });
    } catch (err) {
      res.status(400).json({
        success: false,
        message: 'خطأ في جلب التقييمات',
        error: err.message,
      });
    }
  }
}

module.exports = AssessmentController;
