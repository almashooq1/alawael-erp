/**
 * Traffic Accident Reporting Service - خدمة تقارير الحوادث المرورية
 * خدمة شاملة لإدارة تقارير الحوادث المرورية
 */

const TrafficAccidentReport = require('../models/TrafficAccidentReport');
const Driver = require('../models/Driver');
const Vehicle = require('../models/Vehicle');
const logger = require('../utils/logger');
const PDFDocument = require('pdfkit');
const xlsx = require('xlsx');

class TrafficAccidentService {
  /**
   * 1. إنشاء تقرير حادث جديد
   */
  async createAccidentReport(accidentData, userId) {
    try {
      logger.info('Creating new accident report', { userId });

      const report = new TrafficAccidentReport({
        ...accidentData,
        reportedBy: userId,
        auditInfo: {
          createdBy: userId,
          createdAt: new Date()
        }
      });

      report.generateReportNumber();
      report.calculateTotalLoss();

      await report.save();

      logger.info('Accident report created successfully', {
        reportNumber: report.reportNumber,
        userId
      });

      return report;
    } catch (error) {
      logger.error('Error creating accident report', { error: error.message });
      throw error;
    }
  }

  /**
   * 2. الحصول على جميع التقارير
   */
  async getAllReports(filters = {}, page = 1, limit = 20) {
    try {
      const query = { archived: false };

      // Filter by status
      if (filters.status) {
        query.status = filters.status;
      }

      // Filter by severity
      if (filters.severity) {
        query.severity = filters.severity;
      }

      // Filter by date range
      if (filters.startDate || filters.endDate) {
        query['accidentInfo.accidentDateTime'] = {};
        if (filters.startDate) {
          query['accidentInfo.accidentDateTime'].$gte = new Date(
            filters.startDate
          );
        }
        if (filters.endDate) {
          query['accidentInfo.accidentDateTime'].$lte = new Date(
            filters.endDate
          );
        }
      }

      // Filter by location/city
      if (filters.city) {
        query['accidentInfo.location.city'] = filters.city;
      }

      // Filter by priority
      if (filters.priority) {
        query.priority = filters.priority;
      }

      const skip = (page - 1) * limit;
      const total = await TrafficAccidentReport.countDocuments(query);
      const reports = await TrafficAccidentReport.find(query)
        .populate('reportedBy', 'name email')
        .populate('investigation.investigatingOfficer', 'name email')
        .populate('liability.primaryResponsibleParty', 'firstName lastName')
        .sort({ 'accidentInfo.accidentDateTime': -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      return {
        reports,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error fetching accident reports', { error: error.message });
      throw error;
    }
  }

  /**
   * 3. الحصول على تقرير حادث بواسطة ID
   */
  async getReportById(reportId) {
    try {
      const report = await TrafficAccidentReport.findById(reportId)
        .populate('reportedBy', 'name email phone')
        .populate('investigation.investigatingOfficer', 'name email')
        .populate('vehicles.vehicleId')
        .populate('vehicles.driverId', 'firstName lastName email')
        .populate('people.drivers.driverId', 'firstName lastName')
        .populate('comments.userId', 'name email')
        .populate('auditInfo.createdBy', 'name email')
        .populate('auditInfo.lastModifiedBy', 'name email');

      if (!report) {
        throw new Error('التقرير غير موجود');
      }

      return report;
    } catch (error) {
      logger.error('Error fetching accident report', { error: error.message });
      throw error;
    }
  }

  /**
   * 4. تحديث تقرير الحادث
   */
  async updateAccidentReport(reportId, updateData, userId) {
    try {
      logger.info('Updating accident report', { reportId, userId });

      const report = await TrafficAccidentReport.findById(reportId);
      if (!report) {
        throw new Error('التقرير غير موجود');
      }

      // تحديث البيانات المسموحة فقط
      const allowedFields = [
        'accidentInfo',
        'description',
        'vehicles',
        'wounded',
        'deaths',
        'financialImpact',
        'violations'
      ];

      Object.keys(updateData).forEach(key => {
        if (allowedFields.includes(key)) {
          report[key] = updateData[key];
        }
      });

      report.auditInfo.lastModifiedBy = userId;
      report.auditInfo.lastModifiedAt = new Date();
      report.calculateTotalLoss();

      await report.save();

      logger.info('Accident report updated successfully', {
        reportNumber: report.reportNumber
      });

      return report;
    } catch (error) {
      logger.error('Error updating accident report', { error: error.message });
      throw error;
    }
  }

  /**
   * 5. حذف تقرير الحادث (أرشفة لين)
   */
  async deleteAccidentReport(reportId, userId, reason) {
    try {
      logger.info('Deleting accident report', { reportId, userId });

      const report = await TrafficAccidentReport.findById(reportId);
      if (!report) {
        throw new Error('التقرير غير موجود');
      }

      report.archive(userId, reason);
      await report.save();

      logger.info('Accident report archived successfully', {
        reportNumber: report.reportNumber
      });

      return { message: 'تم أرشفة التقرير بنجاح' };
    } catch (error) {
      logger.error('Error deleting accident report', { error: error.message });
      throw error;
    }
  }

  /**
   * 6. تحديث حالة التقرير
   */
  async updateReportStatus(reportId, newStatus, userId, notes = '') {
    try {
      logger.info('Updating report status', { reportId, newStatus, userId });

      const report = await TrafficAccidentReport.findById(reportId);
      if (!report) {
        throw new Error('التقرير غير موجود');
      }

      const oldStatus = report.status;
      report.status = newStatus;

      if (notes) {
        report.comments.push({
          userId,
          userName: 'System',
          comment: `تم تغيير الحالة من ${oldStatus} إلى ${newStatus}: ${notes}`
        });
      }

      report.auditInfo.lastModifiedBy = userId;
      report.auditInfo.lastModifiedAt = new Date();

      await report.save();

      logger.info('Report status updated', {
        reportNumber: report.reportNumber,
        oldStatus,
        newStatus
      });

      return report;
    } catch (error) {
      logger.error('Error updating report status', { error: error.message });
      throw error;
    }
  }

  /**
   * 7. بدء التحقيق
   */
  async startInvestigation(reportId, investigatingOfficerId, userId) {
    try {
      logger.info('Starting investigation', {
        reportId,
        investigatingOfficerId,
        userId
      });

      const report = await TrafficAccidentReport.findById(reportId);
      if (!report) {
        throw new Error('التقرير غير موجود');
      }

      report.markAsUnderInvestigation(investigatingOfficerId);
      report.auditInfo.lastModifiedBy = userId;
      report.auditInfo.lastModifiedAt = new Date();

      await report.save();

      logger.info('Investigation started', {
        reportNumber: report.reportNumber,
        investigatingOfficer: investigatingOfficerId
      });

      return report;
    } catch (error) {
      logger.error('Error starting investigation', { error: error.message });
      throw error;
    }
  }

  /**
   * 8. إكمال التحقيق
   */
  async completeInvestigation(
    reportId,
    investigationResults,
    userId
  ) {
    try {
      logger.info('Completing investigation', { reportId, userId });

      const report = await TrafficAccidentReport.findById(reportId);
      if (!report) {
        throw new Error('التقرير غير موجود');
      }

      const {
        findings,
        rootCause,
        contributingFactors,
        recommendations,
        primaryCause
      } = investigationResults;

      report.completeInvestigation(findings, rootCause, recommendations);
      report.investigation.contributingFactors = contributingFactors;
      report.investigation.primaryCause = primaryCause;
      report.auditInfo.lastModifiedBy = userId;
      report.auditInfo.lastModifiedAt = new Date();

      await report.save();

      logger.info('Investigation completed', {
        reportNumber: report.reportNumber
      });

      return report;
    } catch (error) {
      logger.error('Error completing investigation', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 9. إضافة تعليق
   */
  async addComment(reportId, userId, userName, comment, attachments = []) {
    try {
      logger.info('Adding comment to report', { reportId, userId });

      const report = await TrafficAccidentReport.findById(reportId);
      if (!report) {
        throw new Error('التقرير غير موجود');
      }

      report.comments.push({
        userId,
        userName,
        comment,
        timestamp: new Date(),
        attachments
      });

      await report.save();

      logger.info('Comment added', { reportNumber: report.reportNumber });

      return report;
    } catch (error) {
      logger.error('Error adding comment', { error: error.message });
      throw error;
    }
  }

  /**
   * 10. إضافة الشهود والإفادات
   */
  async addWitness(reportId, witnessData, userId) {
    try {
      logger.info('Adding witness to report', { reportId, userId });

      const report = await TrafficAccidentReport.findById(reportId);
      if (!report) {
        throw new Error('التقرير غير موجود');
      }

      report.witnesses.push({
        ...witnessData,
        contactedAt: new Date()
      });

      report.auditInfo.lastModifiedBy = userId;
      report.auditInfo.lastModifiedAt = new Date();

      await report.save();

      logger.info('Witness added', { reportNumber: report.reportNumber });

      return report;
    } catch (error) {
      logger.error('Error adding witness', { error: error.message });
      throw error;
    }
  }

  /**
   * 11. إضافة مرفقات
   */
  async addAttachment(reportId, attachmentData, userId) {
    try {
      logger.info('Adding attachment to report', { reportId, userId });

      const report = await TrafficAccidentReport.findById(reportId);
      if (!report) {
        throw new Error('التقرير غير موجود');
      }

      report.attachments.push({
        ...attachmentData,
        uploadedAt: new Date(),
        uploadedBy: userId
      });

      report.auditInfo.lastModifiedBy = userId;
      report.auditInfo.lastModifiedAt = new Date();

      await report.save();

      logger.info('Attachment added', { reportNumber: report.reportNumber });

      return report;
    } catch (error) {
      logger.error('Error adding attachment', { error: error.message });
      throw error;
    }
  }

  /**
   * 12. إضافة معلومات التأمين
   */
  async addInsuranceInfo(reportId, vehicleIndex, insuranceData, userId) {
    try {
      logger.info('Adding insurance info', {
        reportId,
        vehicleIndex,
        userId
      });

      const report = await TrafficAccidentReport.findById(reportId);
      if (!report) {
        throw new Error('التقرير غير موجود');
      }

      if (
        !report.vehicles[vehicleIndex] ||
        vehicleIndex < 0 ||
        vehicleIndex >= report.vehicles.length
      ) {
        throw new Error('المركبة غير موجودة');
      }

      report.vehicles[vehicleIndex].insurance = insuranceData;
      report.auditInfo.lastModifiedBy = userId;
      report.auditInfo.lastModifiedAt = new Date();

      await report.save();

      logger.info('Insurance info added', {
        reportNumber: report.reportNumber
      });

      return report;
    } catch (error) {
      logger.error('Error adding insurance info', { error: error.message });
      throw error;
    }
  }

  /**
   * 13. تحديد المسؤولية
   */
  async determineLiability(
    reportId,
    primaryResponsiblePartyId,
    responsibilityPercentage,
    determination,
    userId
  ) {
    try {
      logger.info('Determining liability', { reportId, userId });

      const report = await TrafficAccidentReport.findById(reportId);
      if (!report) {
        throw new Error('التقرير غير موجود');
      }

      report.liability = {
        primaryResponsibleParty: primaryResponsiblePartyId,
        responsibilityPercentage,
        determination
      };

      report.auditInfo.lastModifiedBy = userId;
      report.auditInfo.lastModifiedAt = new Date();

      await report.save();

      logger.info('Liability determined', { reportNumber: report.reportNumber });

      return report;
    } catch (error) {
      logger.error('Error determining liability', { error: error.message });
      throw error;
    }
  }

  /**
   * 14. إغلاق التقرير
   */
  async closeReport(reportId, conclusionData, userId) {
    try {
      logger.info('Closing accident report', { reportId, userId });

      const report = await TrafficAccidentReport.findById(reportId);
      if (!report) {
        throw new Error('التقرير غير موجود');
      }

      report.close();
      report.followUp.status = 'resolved';
      report.auditInfo.lastModifiedBy = userId;
      report.auditInfo.lastModifiedAt = new Date();

      await report.save();

      logger.info('Report closed', { reportNumber: report.reportNumber });

      return report;
    } catch (error) {
      logger.error('Error closing report', { error: error.message });
      throw error;
    }
  }

  /**
   * 15. توليد تقرير PDF
   */
  async generatePDFReport(reportId, includeAttachments = false) {
    try {
      const report = await this.getReportById(reportId);

      const doc = new PDFDocument({
        size: 'A4',
        margin: 50
      });

      // Header
      doc
        .fontSize(20)
        .font('Helvetica-Bold')
        .text('تقرير الحادثة المرورية', { align: 'center' });
      doc.moveDown();

      doc
        .fontSize(12)
        .font('Helvetica')
        .text(`رقم التقرير: ${report.reportNumber}`);
      doc.text(`الحالة: ${report.status}`);
      doc.text(`الشدة: ${report.severity}`);
      doc.text(`تاريخ الحادث: ${report.accidentInfo.accidentDateTime.toLocaleDateString()}`);
      doc.moveDown();

      // Location Info
      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .text('معلومات الموقع');
      doc
        .fontSize(11)
        .font('Helvetica')
        .text(`العنوان: ${report.accidentInfo.location.address}`);
      doc.text(`المدينة: ${report.accidentInfo.location.city}`);
      doc.text(`الوصف: ${report.accidentInfo.description}`);
      doc.moveDown();

      // Vehicles Info
      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .text('المركبات المتورطة');
      report.vehicles.forEach((vehicle, index) => {
        doc
          .fontSize(11)
          .font('Helvetica')
          .text(`مركبة ${index + 1}:`);
        doc.text(`رقم لوحة الترخيص: ${vehicle.plateNumber}`);
        doc.text(`نوع المركبة: ${vehicle.vehicleType}`);
        doc.text(`الضرر: ${vehicle.damage?.type}`);
        doc.moveDown(0.5);
      });

      // Financial Impact
      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .text('التأثير المالي');
      doc
        .fontSize(11)
        .font('Helvetica')
        .text(
          `إجمالي الخسائر: ${report.financialImpact.totalLoss} SAR`
        );
      doc.text(
        `تكاليف الإصلاح: ${report.financialImpact.repairCosts} SAR`
      );
      doc.text(
        `التكاليف الطبية: ${report.financialImpact.medicalCosts} SAR`
      );
      doc.moveDown();

      // Investigation
      if (report.investigation.findings) {
        doc
          .fontSize(14)
          .font('Helvetica-Bold')
          .text('نتائج التحقيق');
        doc
          .fontSize(11)
          .font('Helvetica')
          .text(report.investigation.findings);
        doc.moveDown();
      }

      return doc;
    } catch (error) {
      logger.error('Error generating PDF report', { error: error.message });
      throw error;
    }
  }

  /**
   * 16. توليد تقرير Excel
   */
  async generateExcelReport(filters = {}) {
    try {
      const { reports } = await this.getAllReports(filters, 1, 10000);

      const data = reports.map(report => ({
        'رقم التقرير': report.reportNumber,
        'تاريخ الحادث': report.accidentInfo.accidentDateTime.toLocaleDateString(
          'ar-SA'
        ),
        'الموقع': report.accidentInfo.location.city,
        'الشدة': report.severity,
        'الحالة': report.status,
        'عدد الجرحى': report.totalInjured,
        'الوفيات': report.totalDeaths,
        'إجمالي الخسائر': report.financialImpact.totalLoss,
        'المحقق': report.investigation.investigatingOfficer?.name || 'N/A'
      }));

      const worksheet = xlsx.utils.json_to_ws(data);
      const workbook = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(workbook, worksheet, 'تقارير الحوادث');

      return workbook;
    } catch (error) {
      logger.error('Error generating Excel report', { error: error.message });
      throw error;
    }
  }

  /**
   * 17. الحصول على الإحصائيات
   */
  async getStatistics(filters = {}) {
    try {
      logger.info('Fetching accident statistics', { filters });

      const [
        statistics,
        statusDistribution,
        severityDistribution
      ] = await Promise.all([
        TrafficAccidentReport.getStatistics(filters),
        TrafficAccidentReport.getStatusDistribution(filters),
        TrafficAccidentReport.getSeverityDistribution(filters)
      ]);

      return {
        summary: statistics[0] || {
          totalReports: 0,
          totalInjured: 0,
          totalDeaths: 0,
          totalFinancialLoss: 0
        },
        statusDistribution,
        severityDistribution
      };
    } catch (error) {
      logger.error('Error fetching statistics', { error: error.message });
      throw error;
    }
  }

  /**
   * 18. البحث المتقدم
   */
  async searchReports(searchTerm, filters = {}, page = 1, limit = 20) {
    try {
      const searchRegex = new RegExp(searchTerm, 'i');

      const query = {
        archived: false,
        $or: [
          { reportNumber: searchRegex },
          { 'accidentInfo.description': searchRegex },
          { 'accidentInfo.location.city': searchRegex },
          { 'vehicles.plateNumber': searchRegex }
        ]
      };

      // Apply additional filters
      if (filters.severity) query.severity = filters.severity;
      if (filters.status) query.status = filters.status;

      const skip = (page - 1) * limit;
      const total = await TrafficAccidentReport.countDocuments(query);
      const reports = await TrafficAccidentReport.find(query)
        .skip(skip)
        .limit(limit)
        .lean();

      return {
        reports,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error searching reports', { error: error.message });
      throw error;
    }
  }

  /**
   * 19. الحصول على التقارير القريبة جغرافياً
   */
  async getNearbyAccidents(latitude, longitude, maxDistance = 5000) {
    // maxDistance in meters
    try {
      const accidents = await TrafficAccidentReport.find({
        archived: false,
        'accidentInfo.location.coordinates': {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [longitude, latitude]
            },
            $maxDistance: maxDistance
          }
        }
      })
        .lean();

      return accidents;
    } catch (error) {
      logger.error('Error fetching nearby accidents', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 20. تسجيل مشاهدة التقرير
   */
  async recordViewHistory(reportId, userId) {
    try {
      const report = await TrafficAccidentReport.findById(reportId);
      if (!report) {
        throw new Error('التقرير غير موجود');
      }

      report.recordView(userId);
      await report.save();
    } catch (error) {
      logger.error('Error recording view history', { error: error.message });
    }
  }

  /**
   * 21. الحصول على التقارير المتأخرة في المتابعة
   */
  async getOverdueFollowUps(daysThreshold = 30) {
    try {
      const thresholdDate = new Date();
      thresholdDate.setDate(thresholdDate.getDate() - daysThreshold);

      const overdueReports = await TrafficAccidentReport.find({
        archived: false,
        'followUp.status': 'pending',
        'followUp.nextFollowUpDate': { $lt: new Date() }
      })
        .populate('reportedBy', 'name email')
        .lean();

      return overdueReports;
    } catch (error) {
      logger.error('Error fetching overdue follow-ups', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 22. تحديث معلومات الضرر
   */
  async updateDamageInfo(reportId, vehicleIndex, damageData, userId) {
    try {
      const report = await TrafficAccidentReport.findById(reportId);
      if (!report) {
        throw new Error('التقرير غير موجود');
      }

      if (!report.vehicles[vehicleIndex]) {
        throw new Error('المركبة غير موجودة');
      }

      report.vehicles[vehicleIndex].damage = damageData;
      report.calculateTotalLoss();
      report.auditInfo.lastModifiedBy = userId;
      report.auditInfo.lastModifiedAt = new Date();

      await report.save();

      return report;
    } catch (error) {
      logger.error('Error updating damage info', { error: error.message });
      throw error;
    }
  }

  /**
   * 23. تطبيق مرشح الأرشيف
   */
  async applyArchivalFilter(
    reportIds,
    userId,
    retentionDays = 365
  ) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const result = await TrafficAccidentReport.updateMany(
        {
          _id: { $in: reportIds },
          'accidentInfo.accidentDateTime': { $lt: cutoffDate }
        },
        {
          archived: true,
          archivedAt: new Date(),
          archivedBy: userId,
          archivedReason: 'Automatic archival based on retention policy',
          status: 'archived'
        }
      );

      return result;
    } catch (error) {
      logger.error('Error applying archival filter', { error: error.message });
      throw error;
    }
  }
}

module.exports = new TrafficAccidentService();
