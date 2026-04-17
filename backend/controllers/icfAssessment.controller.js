/**
 * ICF Functional Assessment Controller — وحدة التحكم للتقييم الوظيفي ICF
 *
 * معالجات HTTP لجميع عمليات التقييم الوظيفي وفق التصنيف الدولي ICF
 */

const ICFAssessmentService = require('../services/icfAssessment.service');
const ICFReportService = require('../services/icfReport.service');
const logger = require('../utils/logger');
const safeError = require('../utils/safeError');

class ICFAssessmentController {
  /* ═══════════════════════════════════════════════════════════════════════ *
   *  CRUD — العمليات الأساسية
   * ═══════════════════════════════════════════════════════════════════════ */

  /**
   * POST /api/icf-assessments
   * إنشاء تقييم ICF جديد
   */
  static async create(req, res) {
    try {
      const userId = req.user?.id || req.user?._id;
      const assessment = await ICFAssessmentService.create(req.body, userId);
      res.status(201).json({
        success: true,
        message: 'تم إنشاء التقييم الوظيفي ICF بنجاح',
        data: assessment,
      });
    } catch (err) {
      logger.error('ICF create error:', err.message);
      res.status(400).json({
        success: false,
        message: 'خطأ في إنشاء التقييم',
        error: safeError(err),
      });
    }
  }

  /**
   * GET /api/icf-assessments
   * قائمة التقييمات مع فلاتر
   */
  static async list(req, res) {
    try {
      const {
        page,
        limit,
        sort,
        beneficiaryId,
        assessorId,
        assessmentType,
        status,
        icfVersion,
        organization,
        programId,
        fromDate,
        toDate,
        minScore,
        maxScore,
        severity,
        search,
      } = req.query;

      const result = await ICFAssessmentService.list(
        {
          beneficiaryId,
          assessorId,
          assessmentType,
          status,
          icfVersion,
          organization,
          programId,
          fromDate,
          toDate,
          minScore,
          maxScore,
          severity,
          search,
        },
        { page, limit, sort }
      );

      res.json({ success: true, ...result });
    } catch (err) {
      safeError(res, err, 'ICF list error');
    }
  }

  /**
   * GET /api/icf-assessments/:id
   * جلب تقييم واحد بالتفصيل
   */
  static async getById(req, res) {
    try {
      const assessment = await ICFAssessmentService.getById(req.params.id);
      res.json({ success: true, data: assessment });
    } catch (err) {
      const status = err.message.includes('غير موجود') ? 404 : 500;
      res.status(status).json({ success: false, message: safeError(err) });
    }
  }

  /**
   * PUT /api/icf-assessments/:id
   * تحديث تقييم
   */
  static async update(req, res) {
    try {
      const userId = req.user?.id || req.user?._id;
      const assessment = await ICFAssessmentService.update(req.params.id, req.body, userId);
      res.json({
        success: true,
        message: 'تم تحديث التقييم بنجاح',
        data: assessment,
      });
    } catch (err) {
      const status = err.message.includes('غير موجود') ? 404 : 400;
      res.status(status).json({ success: false, message: safeError(err) });
    }
  }

  /**
   * DELETE /api/icf-assessments/:id
   * حذف تقييم (Soft Delete)
   */
  static async delete(req, res) {
    try {
      const userId = req.user?.id || req.user?._id;
      await ICFAssessmentService.delete(req.params.id, userId);
      res.json({ success: true, message: 'تم حذف التقييم بنجاح' });
    } catch (err) {
      const status = err.message.includes('غير موجود') ? 404 : 500;
      res.status(status).json({ success: false, message: safeError(err) });
    }
  }

  /**
   * PATCH /api/icf-assessments/:id/status
   * تغيير حالة التقييم
   */
  static async changeStatus(req, res) {
    try {
      const userId = req.user?.id || req.user?._id;
      const { status, notes } = req.body;
      const assessment = await ICFAssessmentService.changeStatus(
        req.params.id,
        status,
        userId,
        notes
      );
      res.json({
        success: true,
        message: `تم تغيير الحالة إلى ${status}`,
        data: { status: assessment.status },
      });
    } catch (err) {
      res.status(400).json({ success: false, message: safeError(err) });
    }
  }

  /* ═══════════════════════════════════════════════════════════════════════ *
   *  Comparison & Timeline — المقارنة والمتابعة الزمنية
   * ═══════════════════════════════════════════════════════════════════════ */

  /**
   * GET /api/icf-assessments/:id/compare
   * مقارنة مع تقييم سابق
   */
  static async compare(req, res) {
    try {
      const result = await ICFAssessmentService.compareWithPrevious(req.params.id);
      res.json({ success: true, data: result });
    } catch (err) {
      res.status(400).json({ success: false, message: safeError(err) });
    }
  }

  /**
   * GET /api/icf-assessments/beneficiary/:beneficiaryId/timeline
   * خط زمني لتقييمات مستفيد
   */
  static async timeline(req, res) {
    try {
      const result = await ICFAssessmentService.getBeneficiaryTimeline(req.params.beneficiaryId);
      res.json({ success: true, data: result });
    } catch (err) {
      safeError(res, err, 'icfAssessment');
    }
  }

  /* ═══════════════════════════════════════════════════════════════════════ *
   *  Benchmarking — المعايرة الدولية
   * ═══════════════════════════════════════════════════════════════════════ */

  /**
   * GET /api/icf-assessments/:id/benchmark
   * مقارنة بالمعايير الدولية
   */
  static async benchmark(req, res) {
    try {
      const population = req.query.population || 'general';
      const result = await ICFAssessmentService.benchmarkAssessment(req.params.id, population);
      res.json({ success: true, data: result });
    } catch (err) {
      res.status(400).json({ success: false, message: safeError(err) });
    }
  }

  /* ═══════════════════════════════════════════════════════════════════════ *
   *  Statistics — الإحصائيات
   * ═══════════════════════════════════════════════════════════════════════ */

  /**
   * GET /api/icf-assessments/statistics
   * إحصائيات عامة
   */
  static async statistics(req, res) {
    try {
      const { organization, fromDate, toDate } = req.query;
      const result = await ICFAssessmentService.getStatistics({
        organization,
        fromDate,
        toDate,
      });
      res.json({ success: true, data: result });
    } catch (err) {
      safeError(res, err, 'icfAssessment');
    }
  }

  /**
   * GET /api/icf-assessments/domain-distribution
   * توزيع الدرجات حسب المجالات
   */
  static async domainDistribution(req, res) {
    try {
      const result = await ICFAssessmentService.getDomainDistribution(req.query);
      res.json({ success: true, data: result });
    } catch (err) {
      safeError(res, err, 'icfAssessment');
    }
  }

  /* ═══════════════════════════════════════════════════════════════════════ *
   *  ICF Code Reference — مرجع الرموز
   * ═══════════════════════════════════════════════════════════════════════ */

  /**
   * GET /api/icf-assessments/codes
   * البحث في رموز ICF
   */
  static async searchCodes(req, res) {
    try {
      const codes = await ICFAssessmentService.searchCodes(req.query);
      res.json({ success: true, data: codes });
    } catch (err) {
      safeError(res, err, 'icfAssessment');
    }
  }

  /**
   * GET /api/icf-assessments/codes/tree/:component
   * شجرة رموز ICF
   */
  static async codeTree(req, res) {
    try {
      const tree = await ICFAssessmentService.getCodeTree(req.params.component);
      res.json({ success: true, data: tree });
    } catch (err) {
      safeError(res, err, 'icfAssessment');
    }
  }

  /* ═══════════════════════════════════════════════════════════════════════ *
   *  Benchmarks Management — إدارة المعايير
   * ═══════════════════════════════════════════════════════════════════════ */

  /**
   * GET /api/icf-assessments/benchmarks
   * قائمة المعايير المرجعية
   */
  static async listBenchmarks(req, res) {
    try {
      const data = await ICFAssessmentService.listBenchmarks(req.query);
      res.json({ success: true, data });
    } catch (err) {
      safeError(res, err, 'icfAssessment');
    }
  }

  /**
   * POST /api/icf-assessments/benchmarks
   * إنشاء معيار مرجعي
   */
  static async createBenchmark(req, res) {
    try {
      const data = await ICFAssessmentService.createBenchmark(req.body);
      res.status(201).json({ success: true, data });
    } catch (err) {
      res.status(400).json({ success: false, message: safeError(err) });
    }
  }

  /**
   * POST /api/icf-assessments/benchmarks/import
   * استيراد معايير مرجعية بالجملة
   */
  static async importBenchmarks(req, res) {
    try {
      const result = await ICFAssessmentService.importBenchmarks(req.body.benchmarks || []);
      res.json({
        success: true,
        message: 'تم استيراد المعايير بنجاح',
        data: result,
      });
    } catch (err) {
      res.status(400).json({ success: false, message: safeError(err) });
    }
  }

  /* ═══════════════════════════════════════════════════════════════════════ *
   *  Reports — التقارير
   * ═══════════════════════════════════════════════════════════════════════ */

  /**
   * GET /api/icf-assessments/:id/report
   * تقرير تقييم ICF شامل
   */
  static async getReport(req, res) {
    try {
      const format = req.query.format || 'json';
      const report = await ICFReportService.generateFullReport(req.params.id);

      if (format === 'json') {
        res.json({ success: true, data: report });
      } else {
        // PDF / HTML could be generated here
        res.json({ success: true, data: report });
      }
    } catch (err) {
      res.status(400).json({ success: false, message: safeError(err) });
    }
  }

  /**
   * GET /api/icf-assessments/beneficiary/:beneficiaryId/comparative-report
   * تقرير مقارن دوري لمستفيد
   */
  static async comparativeReport(req, res) {
    try {
      const report = await ICFReportService.generateComparativeReport(
        req.params.beneficiaryId,
        req.query
      );
      res.json({ success: true, data: report });
    } catch (err) {
      res.status(400).json({ success: false, message: safeError(err) });
    }
  }

  /**
   * GET /api/icf-assessments/organization-report
   * تقرير مؤسسي شامل
   */
  static async organizationReport(req, res) {
    try {
      const report = await ICFReportService.generateOrganizationReport(req.query);
      res.json({ success: true, data: report });
    } catch (err) {
      safeError(res, err, 'icfAssessment');
    }
  }
}

module.exports = ICFAssessmentController;
