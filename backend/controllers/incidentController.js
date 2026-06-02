// backend/controllers/incidentController.js
// معالجات الحوادث
// Incident Management Controllers

const incidentService = require('../services/incidentService');
const { validationResult } = require('express-validator');
const logger = require('../utils/logger');
const safeError = require('../utils/safeError');

// W277i Pass 2 — incident audit-chain wiring.
//
// Tamper-evident ledger over every lifecycle mutation. Late-bound via
// `req.app._incidentAuditChainService` so:
//   (a) the chain service can be wired AFTER controller-module-load
//       (app.js startup order), and
//   (b) if the chain isn't wired (test env, mis-config), the
//       controller still works — chain writes degrade to a logger
//       warning instead of breaking the API.
//
// Fire-and-forget: the chain write is awaited but its failure does
// NOT propagate up. This keeps the API response time bounded by the
// primary DB write only.
async function _appendAudit(req, action, payload, subjectId, branchId) {
  try {
    const svc = req && req.app && req.app._incidentAuditChainService;
    if (!svc) return;
    const actorId = (req.user && (req.user._id || req.user.id)) || null;
    const actorRole = (req.user && req.user.role) || null;
    const result = await svc.append({
      action,
      actorId,
      actorRole,
      subjectId,
      branchId,
      payload: payload || {},
    });
    if (result && result.ok === false) {
      logger.warn(`[incident-audit-chain] append ${action} returned ${result.reason}`);
    }
    // W278c — real-time dashboard publisher. After the chain write
    // succeeds, broadcast a system alert via the existing socket.io
    // emitter (server.js + utils/socketEmitter.js). Severity tier
    // determines client-side rendering: HIGH_PRIORITY_ACTIONS surface
    // as red banners requiring acknowledgement; everything else as
    // a quiet feed entry.
    //
    // Fire-and-forget: socket failure (emitter not yet initialized,
    // no listeners) does NOT propagate — primary API + audit chain
    // are both already done.
    _publishToSocket(action, { actorId, actorRole, subjectId, branchId, payload });
  } catch (err) {
    // Never propagate — audit failure should not 500 the request.
    logger.warn(`[incident-audit-chain] append ${action} threw: ${err && err.message}`);
  }
}

// W278c — channel publisher. Hooked from _appendAudit above. The
// socket.io emitter is loaded lazily (after server.js initializes
// it; this controller is required earlier in startup).
const HIGH_PRIORITY_ACTIONS = new Set([
  'incident-escalated', // severity bumped, executive review
  'incident-resolved', // anchors CAPA chain
  'incident-closed', // locks the record
  'incident-archived', // cold-storage move
  'incident-deleted', // irreversible removal
]);
function _publishToSocket(action, ctx) {
  try {
    // Lazy require to dodge circular-import + late-bind to emitter.
    const socketEmitter = require('../utils/socketEmitter');
    if (typeof socketEmitter.emitSystemAlert !== 'function') return;
    const severity = HIGH_PRIORITY_ACTIONS.has(action) ? 'warning' : 'info';
    socketEmitter.emitSystemAlert({
      title: `Incident lifecycle: ${action}`,
      message: `Subject ${ctx.subjectId || '(unknown)'} — ${action}`,
      severity,
      metadata: {
        kind: 'incident-audit',
        action,
        actorId: ctx.actorId,
        actorRole: ctx.actorRole,
        subjectId: ctx.subjectId,
        branchId: ctx.branchId,
        payload: ctx.payload,
        emittedAt: new Date().toISOString(),
      },
    });
  } catch {
    // Emitter not wired yet OR wrong env — silent. Audit chain is the
    // durable record; this socket emit is just a live convenience.
  }
}

class IncidentController {
  // 1. إنشاء حادثة
  async createIncident(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const incident = await incidentService.createIncident(req.body, req.user._id);

      await _appendAudit(
        req,
        'incident-created',
        {
          incidentNumber: incident && incident.incidentNumber,
          type: incident && incident.type,
          severity: incident && incident.severity,
        },
        incident && incident._id,
        incident && incident.branchId
      );

      res.status(201).json({
        success: true,
        message: 'تم إنشاء الحادثة بنجاح',
        data: incident,
      });
    } catch (error) {
      safeError(res, error, 'in createIncident');
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
        searchText: search || null,
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
        pagination: result.pagination,
      });
    } catch (error) {
      safeError(res, error, 'in getAllIncidents');
    }
  }

  // 3. الحصول على حادثة بواسطة ID
  async getIncidentById(req, res) {
    try {
      const incident = await incidentService.getIncidentById(req.params.id);

      res.status(200).json({
        success: true,
        data: incident,
      });
    } catch (error) {
      logger.error('Error in getIncidentById', { error: error.message });
      res.status(404).json({
        success: false,
        message: 'حدث خطأ داخلي',
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

      const incident = await incidentService.updateIncident(req.params.id, req.body, req.user._id);

      await _appendAudit(
        req,
        'incident-updated',
        { changedFields: Object.keys(req.body || {}) },
        incident && incident._id,
        incident && incident.branchId
      );

      res.status(200).json({
        success: true,
        message: 'تم تحديث الحادثة بنجاح',
        data: incident,
      });
    } catch (error) {
      safeError(res, error, 'in updateIncident');
    }
  }

  // 5. حذف حادثة
  async deleteIncident(req, res) {
    try {
      const result = await incidentService.deleteIncident(req.params.id, req.user._id);

      await _appendAudit(req, 'incident-deleted', { result }, req.params.id, null);

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      safeError(res, error, 'in deleteIncident');
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

      await _appendAudit(
        req,
        'incident-status-changed',
        { to: status, notes: notes || null },
        incident && incident._id,
        incident && incident.branchId
      );

      res.status(200).json({
        success: true,
        message: `تم تحديث حالة الحادثة إلى ${status}`,
        data: incident,
      });
    } catch (error) {
      safeError(res, error, 'in updateStatus');
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

      await _appendAudit(
        req,
        'incident-assigned',
        { assignedToIds, teamLeadId },
        incident && incident._id,
        incident && incident.branchId
      );

      res.status(200).json({
        success: true,
        message: 'تم إسناد الحادثة بنجاح',
        data: incident,
      });
    } catch (error) {
      safeError(res, error, 'in assignIncident');
    }
  }

  // 8. إضافة مستجيب
  async addResponder(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const incident = await incidentService.addResponder(req.params.id, req.body, req.user._id);

      await _appendAudit(
        req,
        'incident-responder-added',
        { responder: req.body },
        incident && incident._id,
        incident && incident.branchId
      );

      res.status(200).json({
        success: true,
        message: 'تم إضافة المستجيب بنجاح',
        data: incident,
      });
    } catch (error) {
      safeError(res, error, 'in addResponder');
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

      await _appendAudit(
        req,
        'incident-escalated',
        { escalation: req.body },
        incident && incident._id,
        incident && incident.branchId
      );

      res.status(200).json({
        success: true,
        message: 'تم تصعيد الحادثة بنجاح',
        data: incident,
      });
    } catch (error) {
      safeError(res, error, 'in escalateIncident');
    }
  }

  // 10. إضافة تعليق
  async addComment(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const incident = await incidentService.addComment(req.params.id, req.body, req.user._id);

      res.status(200).json({
        success: true,
        message: 'تم إضافة التعليق بنجاح',
        data: incident,
      });
    } catch (error) {
      safeError(res, error, 'in addComment');
    }
  }

  // 11. إضافة مرفق
  async addAttachment(req, res) {
    try {
      const { description, attachmentType } = req.body;

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'يجب تحميل ملف',
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
          attachmentType,
        },
        req.user._id
      );

      res.status(200).json({
        success: true,
        message: 'تم تحميل المرفق بنجاح',
        data: incident,
      });
    } catch (error) {
      safeError(res, error, 'in addAttachment');
    }
  }

  // 12. حل الحادثة
  async resolveIncident(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const incident = await incidentService.resolveIncident(req.params.id, req.body, req.user._id);

      await _appendAudit(
        req,
        'incident-resolved',
        { resolution: req.body },
        incident && incident._id,
        incident && incident.branchId
      );

      res.status(200).json({
        success: true,
        message: 'تم حل الحادثة بنجاح',
        data: incident,
      });
    } catch (error) {
      safeError(res, error, 'in resolveIncident');
    }
  }

  // 13. إغلاق الحادثة
  async closeIncident(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const incident = await incidentService.closeIncident(req.params.id, req.body, req.user._id);

      await _appendAudit(
        req,
        'incident-closed',
        { closure: req.body },
        incident && incident._id,
        incident && incident.branchId
      );

      res.status(200).json({
        success: true,
        message: 'تم إغلاق الحادثة بنجاح',
        data: incident,
      });
    } catch (error) {
      safeError(res, error, 'in closeIncident');
    }
  }

  // 14. توليد تقرير
  async generateReport(req, res) {
    try {
      const report = await incidentService.generateIncidentReport(req.params.id);

      res.status(200).json({
        success: true,
        data: report,
      });
    } catch (error) {
      safeError(res, error, 'in generateReport');
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
          end: new Date(endDate),
        };
      }

      const statistics = await incidentService.getIncidentStatistics(filters);

      res.status(200).json({
        success: true,
        data: statistics,
      });
    } catch (error) {
      safeError(res, error, 'in getStatistics');
    }
  }

  // 16. البحث المتقدم
  async searchIncidents(req, res) {
    try {
      const { q, page = 1, limit = 20, severity, status, category } = req.query;

      if (!q) {
        return res.status(400).json({
          success: false,
          message: 'يجب إدخال نص البحث',
        });
      }

      const filters = {
        severity: severity || null,
        status: status || null,
        category: category || null,
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
        pagination: result.pagination,
      });
    } catch (error) {
      safeError(res, error, 'in searchIncidents');
    }
  }

  // 17. أرشفة الحادثة
  async archiveIncident(req, res) {
    try {
      const incident = await incidentService.archiveIncident(req.params.id, req.user._id);

      await _appendAudit(
        req,
        'incident-archived',
        {},
        incident && incident._id,
        incident && incident.branchId
      );

      res.status(200).json({
        success: true,
        message: 'تم أرشفة الحادثة بنجاح',
        data: incident,
      });
    } catch (error) {
      safeError(res, error, 'in archiveIncident');
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
        data: incidents,
      });
    } catch (error) {
      safeError(res, error, 'in getRelatedIncidents');
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
        count: result.pagination.total,
      });
    } catch (error) {
      safeError(res, error, 'in getPendingIncidents');
    }
  }

  // 20. الحوادث الحرجة
  async getCriticalIncidents(req, res) {
    try {
      const result = await incidentService.getAllIncidents({ severity: 'CRITICAL' }, 1, 20);

      res.status(200).json({
        success: true,
        data: result.incidents,
        count: result.pagination.total,
      });
    } catch (error) {
      safeError(res, error, 'in getCriticalIncidents');
    }
  }

  // 21. الحصول على سلسلة التدقيق (audit chain) للحادثة + verify
  // W277i Pass 2 — read-only forensic view + integrity verification.
  // Returns the per-incident chain entries (filtered by subjectId)
  // and the verifier result over the WHOLE chain (because tamper
  // anywhere upstream invalidates this incident's trail too).
  async getAuditChain(req, res) {
    try {
      const svc = req.app && req.app._incidentAuditChainService;
      if (!svc) {
        return res.status(503).json({
          success: false,
          message: 'سلسلة التدقيق غير مُهيّأة على هذا الخادم',
          reason: 'AUDIT_CHAIN_NOT_WIRED',
        });
      }
      const [entriesResult, verifyResult] = await Promise.all([
        svc.listEntries({ subjectId: req.params.id, limit: 500 }),
        svc.verify({}),
      ]);
      return res.status(200).json({
        success: true,
        data: {
          entries: (entriesResult && entriesResult.entries) || [],
          integrity: verifyResult,
        },
      });
    } catch (error) {
      safeError(res, error, 'in getAuditChain');
    }
  }
}

module.exports = new IncidentController();
