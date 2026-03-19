/**
 * Traffic Accident Controller - تحكم الحوادث المرورية
 * معالج طلبات API لتقارير الحوادث المرورية
 */

const trafficAccidentService = require('../services/trafficAccidentService');
const logger = require('../utils/logger');

class TrafficAccidentController {
  /**
   * CREATE - إنشاء تقرير حادث جديد
   */
  async createAccidentReport(req, res) {
    try {
      const { accidentData } = req.body;
      const userId = req.user?.id || req.userId;

      if (!accidentData) {
        return res.status(400).json({
          success: false,
          message: 'بيانات الحادث مطلوبة'
        });
      }

      const report = await trafficAccidentService.createAccidentReport(
        accidentData,
        userId
      );

      res.status(201).json({
        success: true,
        message: 'تم إنشاء التقرير بنجاح',
        data: report
      });
    } catch (error) {
      logger.error('Error creating accident report', {
        error: error.message
      });
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * GET ALL - الحصول على جميع التقارير
   */
  async getAllReports(req, res) {
    try {
      const {
        status,
        severity,
        city,
        priority,
        startDate,
        endDate,
        page = 1,
        limit = 20
      } = req.query;

      const filters = {
        status,
        severity,
        city,
        priority,
        startDate,
        endDate
      };

      // Remove undefined filters
      Object.keys(filters).forEach(key =>
        filters[key] === undefined && delete filters[key]
      );

      const result = await trafficAccidentService.getAllReports(
        filters,
        parseInt(page),
        parseInt(limit)
      );

      res.status(200).json({
        success: true,
        ...result
      });
    } catch (error) {
      logger.error('Error fetching accident reports', {
        error: error.message
      });
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * GET ONE - الحصول على تقرير محدد
   */
  async getReportById(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id || req.userId;

      const report = await trafficAccidentService.getReportById(id);

      // Record view history
      await trafficAccidentService.recordViewHistory(id, userId);

      res.status(200).json({
        success: true,
        data: report
      });
    } catch (error) {
      logger.error('Error fetching accident report', {
        error: error.message
      });
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * UPDATE - تحديث تقرير الحادث
   */
  async updateAccidentReport(req, res) {
    try {
      const { id } = req.params;
      const { updateData } = req.body;
      const userId = req.user?.id || req.userId;

      if (!updateData) {
        return res.status(400).json({
          success: false,
          message: 'بيانات التحديث مطلوبة'
        });
      }

      const report = await trafficAccidentService.updateAccidentReport(
        id,
        updateData,
        userId
      );

      res.status(200).json({
        success: true,
        message: 'تم تحديث التقرير بنجاح',
        data: report
      });
    } catch (error) {
      logger.error('Error updating accident report', {
        error: error.message
      });
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * DELETE - حذف/أرشفة تقرير
   */
  async deleteAccidentReport(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const userId = req.user?.id || req.userId;

      const result = await trafficAccidentService.deleteAccidentReport(
        id,
        userId,
        reason
      );

      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      logger.error('Error deleting accident report', {
        error: error.message
      });
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * UPDATE STATUS - تحديث حالة التقرير
   */
  async updateReportStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;
      const userId = req.user?.id || req.userId;

      if (!status) {
        return res.status(400).json({
          success: false,
          message: 'الحالة مطلوبة'
        });
      }

      const report = await trafficAccidentService.updateReportStatus(
        id,
        status,
        userId,
        notes
      );

      res.status(200).json({
        success: true,
        message: 'تم تحديث الحالة بنجاح',
        data: report
      });
    } catch (error) {
      logger.error('Error updating report status', {
        error: error.message
      });
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * START INVESTIGATION - بدء التحقيق
   */
  async startInvestigation(req, res) {
    try {
      const { id } = req.params;
      const { investigatingOfficerId } = req.body;
      const userId = req.user?.id || req.userId;

      if (!investigatingOfficerId) {
        return res.status(400).json({
          success: false,
          message: 'معرف المحقق مطلوب'
        });
      }

      const report = await trafficAccidentService.startInvestigation(
        id,
        investigatingOfficerId,
        userId
      );

      res.status(200).json({
        success: true,
        message: 'تم بدء التحقيق بنجاح',
        data: report
      });
    } catch (error) {
      logger.error('Error starting investigation', {
        error: error.message
      });
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * COMPLETE INVESTIGATION - إكمال التحقيق
   */
  async completeInvestigation(req, res) {
    try {
      const { id } = req.params;
      const { findings, rootCause, contributingFactors, recommendations, primaryCause } = req.body;
      const userId = req.user?.id || req.userId;

      if (!findings || !rootCause) {
        return res.status(400).json({
          success: false,
          message: 'النتائج والسبب الأساسي مطلوبان'
        });
      }

      const report = await trafficAccidentService.completeInvestigation(
        id,
        { findings, rootCause, contributingFactors, recommendations, primaryCause },
        userId
      );

      res.status(200).json({
        success: true,
        message: 'تم إكمال التحقيق بنجاح',
        data: report
      });
    } catch (error) {
      logger.error('Error completing investigation', {
        error: error.message
      });
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * ADD COMMENT - إضافة تعليق
   */
  async addComment(req, res) {
    try {
      const { id } = req.params;
      const { comment, attachments } = req.body;
      const userId = req.user?.id || req.userId;
      const userName = req.user?.name || 'Unknown';

      if (!comment) {
        return res.status(400).json({
          success: false,
          message: 'التعليق مطلوب'
        });
      }

      const report = await trafficAccidentService.addComment(
        id,
        userId,
        userName,
        comment,
        attachments
      );

      res.status(200).json({
        success: true,
        message: 'تم إضافة التعليق بنجاح',
        data: report
      });
    } catch (error) {
      logger.error('Error adding comment', { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * ADD WITNESS - إضافة شاهد
   */
  async addWitness(req, res) {
    try {
      const { id } = req.params;
      const witnessData = req.body;
      const userId = req.user?.id || req.userId;

      if (!witnessData.name || !witnessData.phone) {
        return res.status(400).json({
          success: false,
          message: 'الاسم والهاتف مطلوبان'
        });
      }

      const report = await trafficAccidentService.addWitness(
        id,
        witnessData,
        userId
      );

      res.status(200).json({
        success: true,
        message: 'تم إضافة الشاهد بنجاح',
        data: report
      });
    } catch (error) {
      logger.error('Error adding witness', { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * ADD ATTACHMENT - إضافة مرفق
   */
  async addAttachment(req, res) {
    try {
      const { id } = req.params;
      const { fileName, fileUrl, fileType } = req.body;
      const userId = req.user?.id || req.userId;

      if (!fileName || !fileUrl) {
        return res.status(400).json({
          success: false,
          message: 'اسم الملف والرابط مطلوبان'
        });
      }

      const report = await trafficAccidentService.addAttachment(
        id,
        { fileName, fileUrl, fileType },
        userId
      );

      res.status(200).json({
        success: true,
        message: 'تم إضافة المرفق بنجاح',
        data: report
      });
    } catch (error) {
      logger.error('Error adding attachment', { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * ADD INSURANCE INFO - إضافة معلومات التأمين
   */
  async addInsuranceInfo(req, res) {
    try {
      const { id, vehicleIndex } = req.params;
      const insuranceData = req.body;
      const userId = req.user?.id || req.userId;

      const report = await trafficAccidentService.addInsuranceInfo(
        id,
        parseInt(vehicleIndex),
        insuranceData,
        userId
      );

      res.status(200).json({
        success: true,
        message: 'تم إضافة معلومات التأمين بنجاح',
        data: report
      });
    } catch (error) {
      logger.error('Error adding insurance info', { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * DETERMINE LIABILITY - تحديد المسؤولية
   */
  async determineLiability(req, res) {
    try {
      const { id } = req.params;
      const {
        primaryResponsiblePartyId,
        responsibilityPercentage,
        determination
      } = req.body;
      const userId = req.user?.id || req.userId;

      const report = await trafficAccidentService.determineLiability(
        id,
        primaryResponsiblePartyId,
        responsibilityPercentage,
        determination,
        userId
      );

      res.status(200).json({
        success: true,
        message: 'تم تحديد المسؤولية بنجاح',
        data: report
      });
    } catch (error) {
      logger.error('Error determining liability', { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * CLOSE REPORT - إغلاق التقرير
   */
  async closeReport(req, res) {
    try {
      const { id } = req.params;
      const conclusionData = req.body;
      const userId = req.user?.id || req.userId;

      const report = await trafficAccidentService.closeReport(
        id,
        conclusionData,
        userId
      );

      res.status(200).json({
        success: true,
        message: 'تم إغلاق التقرير بنجاح',
        data: report
      });
    } catch (error) {
      logger.error('Error closing report', { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * STATISTICS - الحصول على الإحصائيات
   */
  async getStatistics(req, res) {
    try {
      const { startDate, endDate, city, severity, status } = req.query;

      const filters = {};
      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;
      if (city) filters.city = city;
      if (severity) filters.severity = severity;
      if (status) filters.status = status;

      const statistics = await trafficAccidentService.getStatistics(filters);

      res.status(200).json({
        success: true,
        data: statistics
      });
    } catch (error) {
      logger.error('Error fetching statistics', { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * SEARCH - البحث المتقدم
   */
  async searchReports(req, res) {
    try {
      const { q, severity, status, page = 1, limit = 20 } = req.query;

      if (!q) {
        return res.status(400).json({
          success: false,
          message: 'معيار البحث مطلوب'
        });
      }

      const filters = {};
      if (severity) filters.severity = severity;
      if (status) filters.status = status;

      const result = await trafficAccidentService.searchReports(
        q,
        filters,
        parseInt(page),
        parseInt(limit)
      );

      res.status(200).json({
        success: true,
        ...result
      });
    } catch (error) {
      logger.error('Error searching reports', { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * NEARBY ACCIDENTS - الحوادث القريبة
   */
  async getNearbyAccidents(req, res) {
    try {
      const { latitude, longitude, maxDistance = 5000 } = req.query;

      if (!latitude || !longitude) {
        return res.status(400).json({
          success: false,
          message: 'الإحداثيات (latitude, longitude) مطلوبة'
        });
      }

      const accidents = await trafficAccidentService.getNearbyAccidents(
        parseFloat(latitude),
        parseFloat(longitude),
        parseInt(maxDistance)
      );

      res.status(200).json({
        success: true,
        data: accidents
      });
    } catch (error) {
      logger.error('Error fetching nearby accidents', {
        error: error.message
      });
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * OVERDUE FOLLOW-UPS - المتابعات المتأخرة
   */
  async getOverdueFollowUps(req, res) {
    try {
      const { daysThreshold = 30 } = req.query;

      const reports = await trafficAccidentService.getOverdueFollowUps(
        parseInt(daysThreshold)
      );

      res.status(200).json({
        success: true,
        count: reports.length,
        data: reports
      });
    } catch (error) {
      logger.error('Error fetching overdue follow-ups', {
        error: error.message
      });
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * UPDATE DAMAGE INFO - تحديث معلومات الضرر
   */
  async updateDamageInfo(req, res) {
    try {
      const { id, vehicleIndex } = req.params;
      const damageData = req.body;
      const userId = req.user?.id || req.userId;

      const report = await trafficAccidentService.updateDamageInfo(
        id,
        parseInt(vehicleIndex),
        damageData,
        userId
      );

      res.status(200).json({
        success: true,
        message: 'تم تحديث معلومات الضرر بنجاح',
        data: report
      });
    } catch (error) {
      logger.error('Error updating damage info', { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * EXPORT PDF - تصدير PDF
   */
  async exportPDF(req, res) {
    try {
      const { id } = req.params;

      const pdfDoc = await trafficAccidentService.generatePDFReport(id, true);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="accident-report-${id}.pdf"`
      );

      pdfDoc.pipe(res);
      pdfDoc.end();
    } catch (error) {
      logger.error('Error exporting PDF', { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * EXPORT EXCEL - تصدير Excel
   */
  async exportExcel(req, res) {
    try {
      const { startDate, endDate, city, severity } = req.query;

      const filters = {};
      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;
      if (city) filters.city = city;
      if (severity) filters.severity = severity;

      const workbook = await trafficAccidentService.generateExcelReport(
        filters
      );

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="accident-reports.xlsx"'
      );

      workbook.write(res);
      res.end();
    } catch (error) {
      logger.error('Error exporting Excel', { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = new TrafficAccidentController();
