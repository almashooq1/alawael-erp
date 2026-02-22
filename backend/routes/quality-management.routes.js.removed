/**
 * ALAWAEL ERP - QUALITY MANAGEMENT ROUTES
 * Phase 18 - Quality Management & Advanced Reporting
 */

const express = require('express');
const router = express.Router();

module.exports = QualityManagementService => {
  if (!QualityManagementService) {
    throw new Error('QualityManagementService is required');
  }

  const service =
    typeof QualityManagementService === 'function'
      ? new QualityManagementService()
      : QualityManagementService;

  /**
   * QUALITY METRICS ENDPOINTS
   */

  // Create quality metric
  router.post('/metrics', (req, res) => {
    try {
      const { name, type, category, targetValue, unit, description, department, owner } = req.body;

      if (!name || !type || !targetValue) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: name, type, targetValue',
        });
      }

      const metric = service.createQualityMetric({
        name,
        type,
        category,
        targetValue,
        unit,
        description,
        department,
        owner,
      });

      res.status(201).json({
        success: true,
        message: 'Quality metric created',
        data: metric,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  // Get quality metrics
  router.get('/metrics', (req, res) => {
    try {
      const { type, department, status } = req.query;
      const metrics = service.getQualityMetrics({
        type,
        department,
        status,
      });

      res.json({
        success: true,
        data: metrics,
        count: metrics.length,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  // Update metric value
  router.patch('/metrics/:id/value', (req, res) => {
    try {
      const { id } = req.params;
      const { value, comments } = req.body;

      if (value === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Value is required',
        });
      }

      const updated = service.updateMetricValue(id, value, comments);

      res.json({
        success: true,
        message: 'Metric value updated',
        data: updated,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  /**
   * DEFECT MANAGEMENT ENDPOINTS
   */

  // Report defect
  router.post('/defects', (req, res) => {
    try {
      const {
        title,
        description,
        severity,
        category,
        reportedBy,
        assignedTo,
        affectedArea,
        processId,
      } = req.body;

      if (!title || !severity) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: title, severity',
        });
      }

      const defect = service.reportDefect({
        title,
        description,
        severity,
        category,
        reportedBy,
        assignedTo,
        affectedArea,
        processId,
      });

      res.status(201).json({
        success: true,
        message: 'Defect reported',
        data: defect,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  // Get defects
  router.get('/defects', (req, res) => {
    try {
      const { status, severity, assignedTo } = req.query;
      const defects = service.getDefects({
        status,
        severity,
        assignedTo,
      });

      res.json({
        success: true,
        data: defects,
        count: defects.length,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  // Update defect status
  router.patch('/defects/:id/status', (req, res) => {
    try {
      const { id } = req.params;
      const { status, resolution } = req.body;

      if (!status) {
        return res.status(400).json({
          success: false,
          message: 'Status is required',
        });
      }

      const updated = service.updateDefectStatus(id, status, resolution);

      res.json({
        success: true,
        message: 'Defect status updated',
        data: updated,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  /**
   * ROOT CAUSE ANALYSIS ENDPOINTS
   */

  // Perform RCA
  router.post('/defects/:id/rca', (req, res) => {
    try {
      const { id } = req.params;
      const { primaryCause, contributingFactors, analysis, analyzedBy } = req.body;

      if (!primaryCause || !analysis) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: primaryCause, analysis',
        });
      }

      const rca = service.performRootCauseAnalysis(id, {
        primaryCause,
        contributingFactors,
        analysis,
        analyzedBy,
      });

      res.status(201).json({
        success: true,
        message: 'Root cause analysis completed',
        data: rca,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  // Create correction action
  router.post('/defects/:id/capa', (req, res) => {
    try {
      const { id } = req.params;
      const { actionType, description, targetDate, owner, expectedBenefit, implementation } =
        req.body;

      if (!actionType || !description) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: actionType, description',
        });
      }

      const action = service.createCorrectionAction(id, {
        actionType,
        description,
        targetDate,
        owner,
        expectedBenefit,
        implementation,
      });

      res.status(201).json({
        success: true,
        message: 'Correction action created',
        data: action,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  /**
   * AUDIT ENDPOINTS
   */

  // Conduct audit
  router.post('/audits', (req, res) => {
    try {
      const { type, processId, department, auditor, auditDate, scope } = req.body;

      if (!type || !auditor || !auditDate) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: type, auditor, auditDate',
        });
      }

      const audit = service.conductAudit({
        type,
        processId,
        department,
        auditor,
        auditDate,
        scope,
      });

      res.status(201).json({
        success: true,
        message: 'Audit initiated',
        data: audit,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  // Add audit finding
  router.post('/audits/:id/findings', (req, res) => {
    try {
      const { id } = req.params;
      const { description, category, severity, evidence } = req.body;

      if (!description || !severity) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: description, severity',
        });
      }

      const finding = service.addAuditFinding(id, {
        description,
        category,
        severity,
        evidence,
      });

      res.status(201).json({
        success: true,
        message: 'Audit finding added',
        data: finding,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  /**
   * REPORTING ENDPOINTS
   */

  // Generate quality report
  router.post('/reports/generate', (req, res) => {
    try {
      const { type, period, metrics, departments, includeDefects, includeAudits, generatedBy } =
        req.body;

      if (!type || !period) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: type, period',
        });
      }

      const report = service.generateQualityReport({
        type,
        period,
        metrics: metrics || [],
        departments: departments || [],
        includeDefects: includeDefects !== false,
        includeAudits: includeAudits !== false,
        generatedBy,
      });

      res.status(201).json({
        success: true,
        message: 'Quality report generated',
        data: report,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  /**
   * DASHBOARD ENDPOINTS
   */

  // Create dashboard
  router.post('/dashboards', (req, res) => {
    try {
      const { name, metrics, targetAudience, customizations } = req.body;

      if (!name) {
        return res.status(400).json({
          success: false,
          message: 'Dashboard name is required',
        });
      }

      const dashboard = service.createQualityDashboard({
        name,
        metrics: metrics || [],
        targetAudience,
        customizations: customizations || {},
      });

      res.status(201).json({
        success: true,
        message: 'Quality dashboard created',
        data: dashboard,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  // Get dashboard data
  router.get('/dashboards/:id/data', (req, res) => {
    try {
      const { id } = req.params;
      const data = service.getQualityDashboardData(id);

      res.json({
        success: true,
        data: data,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  /**
   * ANALYTICS ENDPOINTS
   */

  // Analyze trends
  router.get('/metrics/:id/trends', (req, res) => {
    try {
      const { id } = req.params;
      const { period } = req.query;

      const analysis = service.analyzeTrends(id, period ? parseInt(period) : 90);

      res.json({
        success: true,
        data: analysis,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  /**
   * PROCESS MANAGEMENT ENDPOINTS
   */

  // Define process
  router.post('/processes', (req, res) => {
    try {
      const { name, description, owner, steps, inputs, outputs, kpis } = req.body;

      if (!name || !owner) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: name, owner',
        });
      }

      const process = service.defineProcess({
        name,
        description,
        owner,
        steps,
        inputs,
        outputs,
        kpis,
      });

      res.status(201).json({
        success: true,
        message: 'Process defined',
        data: process,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  return router;
};
