/**
 * ALAWAEL ERP - PHASE 20: RISK MANAGEMENT & COMPLIANCE ROUTES
 * REST API endpoints for risk identification, compliance tracking, audit management
 */

const express = require('express');

module.exports = (riskManagementService) => {
  const router = express.Router();

  // ═══════════════════════════════════════════════════════════════════════════
  // RISK IDENTIFICATION & ASSESSMENT endpoints
  // ═══════════════════════════════════════════════════════════════════════════

  // POST /identify - Identify new risk
  router.post('/identify', (req, res) => {
    try {
      const { name, category, description, owner, source, monitoringFrequency } = req.body;

      if (!name || !category || !description) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: name, category, description',
        });
      }

      const risk = riskManagementService.identifyRisk({
        name,
        category,
        description,
        owner: owner || null,
        source: source || 'internal',
        monitoringFrequency: monitoringFrequency || 'monthly',
      });

      res.status(201).json({
        success: true,
        message: 'Risk identified successfully',
        data: risk,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  // POST /assess - Assess risk (likelihood, impact)
  router.post('/:riskId/assess', (req, res) => {
    try {
      const { riskId } = req.params;
      const { likelihood, impact, assessedBy, assumptions, constraints, notes } = req.body;

      if (likelihood === undefined || impact === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: likelihood, impact',
        });
      }

      const assessment = riskManagementService.assessRisk(riskId, {
        likelihood,
        impact,
        assessedBy: assessedBy || 'system',
        assumptions: assumptions || [],
        constraints: constraints || [],
        notes: notes || '',
      });

      res.status(201).json({
        success: true,
        message: 'Risk assessed successfully',
        data: assessment,
      });
    } catch (error) {
      res.status(error.message === 'Risk not found' ? 404 : 500).json({
        success: false,
        message: error.message,
      });
    }
  });

  // POST /mitigation - Define mitigation strategy
  router.post('/:riskId/mitigation', (req, res) => {
    try {
      const { riskId } = req.params;
      const { strategy, description, owner, targetDate, actions, cost } = req.body;

      if (!strategy || !owner) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: strategy, owner',
        });
      }

      const mitigation = riskManagementService.defineMitigation(riskId, {
        strategy,
        description: description || '',
        owner,
        targetDate: targetDate ? new Date(targetDate) : null,
        actions: actions || [],
        cost: cost || null,
      });

      res.status(201).json({
        success: true,
        message: 'Mitigation strategy defined',
        data: mitigation,
      });
    } catch (error) {
      res.status(error.message === 'Risk not found' ? 404 : 500).json({
        success: false,
        message: error.message,
      });
    }
  });

  // PATCH /mitigation/:id/status - Update mitigation status
  router.patch('/mitigation/:mitigationId/status', (req, res) => {
    try {
      const { mitigationId } = req.params;
      const { status, effectiveness } = req.body;

      const updated = riskManagementService.updateMitigationStatus(mitigationId, {
        status,
        effectiveness: effectiveness || null,
      });

      res.json({
        success: true,
        message: 'Mitigation status updated',
        data: updated,
      });
    } catch (error) {
      res.status(error.message === 'Mitigation not found' ? 404 : 500).json({
        success: false,
        message: error.message,
      });
    }
  });

  // GET /matrix - Get risk matrix
  router.get('/matrix/:department?', (req, res) => {
    try {
      const { department } = req.params;
      const matrix = riskManagementService.getRiskMatrix(department || null);

      res.json({
        success: true,
        message: 'Risk matrix retrieved',
        data: matrix,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPLIANCE MANAGEMENT endpoints
  // ═══════════════════════════════════════════════════════════════════════════

  // POST /compliance/framework - Register compliance framework
  router.post('/compliance/framework', (req, res) => {
    try {
      const { name, type, description, requirements, applicableAreas, owner } = req.body;

      if (!name || !requirements) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: name, requirements',
        });
      }

      const framework = riskManagementService.registerComplianceFramework({
        name,
        type: type || 'regulatory',
        description: description || '',
        requirements,
        applicableAreas: applicableAreas || [],
        owner: owner || null,
      });

      res.status(201).json({
        success: true,
        message: 'Compliance framework registered',
        data: framework,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  // POST /compliance/check - Conduct compliance check
  router.post('/compliance/check', (req, res) => {
    try {
      const { frameworkId, area, assessor, requirements, complianceStatus, findings } = req.body;

      if (!frameworkId || !area || !assessor) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: frameworkId, area, assessor',
        });
      }

      const check = riskManagementService.conductComplianceCheck({
        frameworkId,
        area,
        assessor,
        requirements: requirements || [],
        complianceStatus: complianceStatus || 'pending',
        findings: findings || [],
      });

      res.status(201).json({
        success: true,
        message: 'Compliance check conducted',
        data: check,
      });
    } catch (error) {
      res.status(error.message === 'Framework not found' ? 404 : 500).json({
        success: false,
        message: error.message,
      });
    }
  });

  // POST /compliance/violation - Report violation
  router.post('/compliance/violation', (req, res) => {
    try {
      const { frameworkId, description, severity, reportedBy, evidenceLinks } = req.body;

      if (!frameworkId || !description || !severity) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: frameworkId, description, severity',
        });
      }

      const violation = riskManagementService.reportViolation({
        frameworkId,
        description,
        severity,
        reportedBy: reportedBy || 'system',
        evidenceLinks: evidenceLinks || [],
      });

      res.status(201).json({
        success: true,
        message: 'Violation reported',
        data: violation,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  // PATCH /compliance/violation/:id - Close violation
  router.patch('/compliance/violation/:violationId', (req, res) => {
    try {
      const { violationId } = req.params;
      const { root_cause, correctiveAction } = req.body;

      const closed = riskManagementService.closeViolation(violationId, {
        root_cause,
        correctiveAction,
      });

      res.json({
        success: true,
        message: 'Violation closed',
        data: closed,
      });
    } catch (error) {
      res.status(error.message === 'Violation not found' ? 404 : 500).json({
        success: false,
        message: error.message,
      });
    }
  });

  // GET /compliance/status/:frameworkId - Get compliance status
  router.get('/compliance/status/:frameworkId', (req, res) => {
    try {
      const { frameworkId } = req.params;
      const status = riskManagementService.getComplianceStatus(frameworkId);

      res.json({
        success: true,
        message: 'Compliance status retrieved',
        data: status,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INTERNAL CONTROLS & TESTING endpoints
  // ═══════════════════════════════════════════════════════════════════════════

  // POST /control - Define internal control
  router.post('/control', (req, res) => {
    try {
      const { name, objective, type, owner, frequency, documentationLinks } = req.body;

      if (!name || !objective || !owner) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: name, objective, owner',
        });
      }

      const control = riskManagementService.defineControl({
        name,
        objective,
        type: type || 'detective',
        owner,
        frequency: frequency || 'monthly',
        documentationLinks: documentationLinks || [],
      });

      res.status(201).json({
        success: true,
        message: 'Control defined',
        data: control,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  // POST /control/:id/test - Test control
  router.post('/control/:controlId/test', (req, res) => {
    try {
      const { controlId } = req.params;
      const { testResult, testedBy, observations, evidence } = req.body;

      if (testResult === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Missing required field: testResult',
        });
      }

      const test = riskManagementService.testControl(controlId, {
        testResult,
        testedBy: testedBy || 'system',
        observations: observations || '',
        evidence: evidence || [],
      });

      res.status(201).json({
        success: true,
        message: 'Control tested',
        data: test,
      });
    } catch (error) {
      res.status(error.message === 'Control not found' ? 404 : 500).json({
        success: false,
        message: error.message,
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INCIDENT & ISSUE MANAGEMENT endpoints
  // ═══════════════════════════════════════════════════════════════════════════

  // POST /incident - Report incident
  router.post('/incident', (req, res) => {
    try {
      const { title, description, severity, type, reportedBy, impactAssessment } = req.body;

      if (!title || !description || !severity) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: title, description, severity',
        });
      }

      const incident = riskManagementService.reportIncident({
        title,
        description,
        severity,
        type: type || 'operational',
        reportedBy: reportedBy || 'system',
        impactAssessment: impactAssessment || {},
      });

      res.status(201).json({
        success: true,
        message: 'Incident reported',
        data: incident,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  // PATCH /incident/:id/status - Update incident status
  router.patch('/incident/:incidentId/status', (req, res) => {
    try {
      const { incidentId } = req.params;
      const { status, investigation, rootCause, remediation } = req.body;

      const updated = riskManagementService.updateIncidentStatus(incidentId, {
        status,
        investigation: investigation || null,
        rootCause: rootCause || null,
        remediation: remediation || null,
      });

      res.json({
        success: true,
        message: 'Incident status updated',
        data: updated,
      });
    } catch (error) {
      res.status(error.message === 'Incident not found' ? 404 : 500).json({
        success: false,
        message: error.message,
      });
    }
  });

  // POST /incident/:id/escalate - Escalate incident
  router.post('/incident/:incidentId/escalate', (req, res) => {
    try {
      const { incidentId } = req.params;
      const { escalatedTo, reason, priority } = req.body;

      const escalation = riskManagementService.escalateIncident(incidentId, {
        escalatedTo,
        reason,
        priority: priority || 'high',
      });

      res.status(201).json({
        success: true,
        message: 'Incident escalated',
        data: escalation,
      });
    } catch (error) {
      res.status(error.message === 'Incident not found' ? 404 : 500).json({
        success: false,
        message: error.message,
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // REPORTING & ANALYTICS endpoints
  // ═══════════════════════════════════════════════════════════════════════════

  // POST /report/risk - Generate risk report
  router.post('/report/risk', (req, res) => {
    try {
      const { period, generatedBy } = req.body;

      if (!period) {
        return res.status(400).json({
          success: false,
          message: 'Missing required field: period',
        });
      }

      const report = riskManagementService.generateRiskReport({
        period,
        generatedBy: generatedBy || 'system',
      });

      res.status(201).json({
        success: true,
        message: 'Risk report generated',
        data: report,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  // POST /report/compliance - Generate compliance report
  router.post('/report/compliance', (req, res) => {
    try {
      const { frameworkId, generatedBy } = req.body;

      if (!frameworkId) {
        return res.status(400).json({
          success: false,
          message: 'Missing required field: frameworkId',
        });
      }

      const report = riskManagementService.generateComplianceReport({
        frameworkId,
        generatedBy: generatedBy || 'system',
      });

      res.status(201).json({
        success: true,
        message: 'Compliance report generated',
        data: report,
      });
    } catch (error) {
      res.status(error.message === 'Framework not found' ? 404 : 500).json({
        success: false,
        message: error.message,
      });
    }
  });

  // GET /dashboard/risk - Get risk dashboard data
  router.get('/dashboard/risk', (req, res) => {
    try {
      const data = riskManagementService.getRiskDashboardData();

      res.json({
        success: true,
        message: 'Risk dashboard data retrieved',
        data,
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
