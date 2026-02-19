// backend/controllers/incidentController.js
// معالجات الحوادث
// Incident Management Controllers

const incidentService = require('../services/incidentService');
const { validationResult } = require('express-validator');
const logger = require('../utils/logger');

class IncidentController {
  // 1. إنشاء حادثة
  async createIncident(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const incident = await incidentService.createIncident(
        req.body,
        req.user._id
      );

      res.status(201).json({
        success: true,
        message: 'تم إنشاء الحادثة بنجاح',
        data: incident
      });
    } catch (error) {
      logger.error('Error in createIncident', { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // 2. الحصول على جميع الحوادث
  async getAllIncidents(req, res) {
    try {
      const { page = 1, limit = 20, status, severity, category, priority, search } = req.query;

      const filters = {
        status: status || null,
        severity: severity || null,
        category: category || null,
        priority: priority || null,
        searchText: search || null
      };

      // تنظيف الفلاتر من null
      Object.keys(filters).forEach(key => {
        if (filters[key] === null) {
          delete filters[key];
        }
      });

      const result = await incidentService.getAllIncidents(
        filters,
        parseInt(page),
        parseInt(limit)
      );

      res.status(200).json({
        success: true,
        data: result.incidents,
        pagination: result.pagination
      });
    } catch (error) {
      logger.error('Error in getAllIncidents', { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // 3. الحصول على حادثة بواسطة ID
  async getIncidentById(req, res) {
    try {
      const incident = await incidentService.getIncidentById(req.params.id);

      res.status(200).json({
        success: true,
        data: incident
      });
    } catch (error) {
      logger.error('Error in getIncidentById', { error: error.message });
      res.status(404).json({
        success: false,
        message: error.message
      });
    }
  }

  // 4. تحديث حادثة
  async updateIncident(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const incident = await incidentService.updateIncident(
        req.params.id,
        req.body,
        req.user._id
      );

      res.status(200).json({
        success: true,
        message: 'تم تحديث الحادثة بنجاح',
        data: incident
      });
    } catch (error) {
      logger.error('Error in updateIncident', { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // 5. حذف حادثة
  async deleteIncident(req, res) {
    try {
      const result = await incidentService.deleteIncident(
        req.params.id,
        req.user._id
      );

      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      logger.error('Error in deleteIncident', { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // 6. تحديث حالة الحادثة
  async updateStatus(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { status, notes } = req.body;
      const incident = await incidentService.updateIncidentStatus(
        req.params.id,
        status,
        req.user._id,
        notes
      );

      res.status(200).json({
        success: true,
        message: `تم تحديث حالة الحادثة إلى ${status}`,
        data: incident
      });
    } catch (error) {
      logger.error('Error in updateStatus', { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // 7. إسناد الحادثة
  async assignIncident(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { assignedToIds, teamLeadId } = req.body;
      const incident = await incidentService.assignIncident(
        req.params.id,
        assignedToIds,
        teamLeadId,
        req.user._id
      );

      res.status(200).json({
        success: true,
        message: 'تم إسناد الحادثة بنجاح',
        data: incident
      });
    } catch (error) {
      logger.error('Error in assignIncident', { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // 8. إضافة مستجيب
  async addResponder(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const incident = await incidentService.addResponder(
        req.params.id,
        req.body,
        req.user._id
      );

      res.status(200).json({
        success: true,
        message: 'تم إضافة المستجيب بنجاح',
        data: incident
      });
    } catch (error) {
      logger.error('Error in addResponder', { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // 9. تصعيد الحادثة
  async escalateIncident(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const incident = await incidentService.escalateIncident(
        req.params.id,
        req.body,
        req.user._id
      );

      res.status(200).json({
        success: true,
        message: 'تم تصعيد الحادثة بنجاح',
        data: incident
      });
    } catch (error) {
      logger.error('Error in escalateIncident', { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // 10. إضافة تعليق
  async addComment(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const incident = await incidentService.addComment(
        req.params.id,
        req.body,
        req.user._id
      );

      res.status(200).json({
        success: true,
        message: 'تم إضافة التعليق بنجاح',
        data: incident
      });
    } catch (error) {
      logger.error('Error in addComment', { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // 11. إضافة مرفق
  async addAttachment(req, res) {
    try {
      const { description, attachmentType } = req.body;

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'يجب تحميل ملف'
        });
      }

      const incident = await incidentService.addAttachment(
        req.params.id,
        {
          fileName: req.file.originalname,
          fileUrl: req.file.path,
          fileType: req.file.mimetype,
          fileSize: req.file.size,
          description,
          attachmentType
        },
        req.user._id
      );

      res.status(200).json({
        success: true,
        message: 'تم تحميل المرفق بنجاح',
        data: incident
      });
    } catch (error) {
      logger.error('Error in addAttachment', { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // 12. حل الحادثة
  async resolveIncident(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const incident = await incidentService.resolveIncident(
        req.params.id,
        req.body,
        req.user._id
      );

      res.status(200).json({
        success: true,
        message: 'تم حل الحادثة بنجاح',
        data: incident
      });
    } catch (error) {
      logger.error('Error in resolveIncident', { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // 13. إغلاق الحادثة
  async closeIncident(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const incident = await incidentService.closeIncident(
        req.params.id,
        req.body,
        req.user._id
      );

      res.status(200).json({
        success: true,
        message: 'تم إغلاق الحادثة بنجاح',
        data: incident
      });
    } catch (error) {
      logger.error('Error in closeIncident', { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // 14. توليد تقرير
  async generateReport(req, res) {
    try {
      const report = await incidentService.generateIncidentReport(
        req.params.id
      );

      res.status(200).json({
        success: true,
        data: report
      });
    } catch (error) {
      logger.error('Error in generateReport', { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // 15. الحصول على الإحصائيات
  async getStatistics(req, res) {
    try {
      const { departmentId, startDate, endDate } = req.query;

      const filters = {};
      if (departmentId) {
        filters.departmentId = departmentId;
      }
      if (startDate && endDate) {
        filters.dateRange = {
          start: new Date(startDate),
          end: new Date(endDate)
        };
      }

      const statistics = await incidentService.getIncidentStatistics(filters);

      res.status(200).json({
        success: true,
        data: statistics
      });
    } catch (error) {
      logger.error('Error in getStatistics', { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // 16. البحث المتقدم
  async searchIncidents(req, res) {
    try {
      const { q, page = 1, limit = 20, severity, status, category } = req.query;

      if (!q) {
        return res.status(400).json({
          success: false,
          message: 'يجب إدخال نص البحث'
        });
      }

      const filters = {
        severity: severity || null,
        status: status || null,
        category: category || null
      };

      // تنظيف الفلاتر من null
      Object.keys(filters).forEach(key => {
        if (filters[key] === null) {
          delete filters[key];
        }
      });

      const result = await incidentService.searchIncidents(
        q,
        filters,
        parseInt(page),
        parseInt(limit)
      );

      res.status(200).json({
        success: true,
        data: result.incidents,
        pagination: result.pagination
      });
    } catch (error) {
      logger.error('Error in searchIncidents', { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // 17. أرشفة الحادثة
  async archiveIncident(req, res) {
    try {
      const incident = await incidentService.archiveIncident(
        req.params.id,
        req.user._id
      );

      res.status(200).json({
        success: true,
        message: 'تم أرشفة الحادثة بنجاح',
        data: incident
      });
    } catch (error) {
      logger.error('Error in archiveIncident', { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // 18. الحصول على الحوادث ذات الصلة
  async getRelatedIncidents(req, res) {
    try {
      const incidents = await incidentService.getRelatedIncidents(
        req.params.id,
        req.query.limit || 5
      );

      res.status(200).json({
        success: true,
        data: incidents
      });
    } catch (error) {
      logger.error('Error in getRelatedIncidents', { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // 19. الحوادث المعلقة (Dashboard)
  async getPendingIncidents(req, res) {
    try {
      const { limit = 10 } = req.query;

      const result = await incidentService.getAllIncidents(
        { status: 'INVESTIGATING' },
        1,
        parseInt(limit)
      );

      res.status(200).json({
        success: true,
        data: result.incidents,
        count: result.pagination.total
      });
    } catch (error) {
      logger.error('Error in getPendingIncidents', { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // 20. الحوادث الحرجة
  async getCriticalIncidents(req, res) {
    try {
      const result = await incidentService.getAllIncidents(
        { severity: 'CRITICAL' },
        1,
        20
      );

      res.status(200).json({
        success: true,
        data: result.incidents,
        count: result.pagination.total
      });
    } catch (error) {
      logger.error('Error in getCriticalIncidents', { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = new IncidentController();
