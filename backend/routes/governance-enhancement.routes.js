/**
 * AL-AWAEL ERP - GOVERNANCE ENHANCEMENT ROUTES
 * Phase 24 - Enhanced Governance API Endpoints
 */

const express = require('express');
const GovernanceEnhancementService = require('../services/governance-enhancement.service');

const router = express.Router();
const governanceService = new GovernanceEnhancementService();

/**
 * POLICY MANAGEMENT ENDPOINTS
 */

router.post('/policies', (req, res) => {
  try {
    const policy = governanceService.createPolicy(req.body);
    res.status(201).json({ success: true, data: policy });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.get('/policies/:id', (req, res) => {
  try {
    const policy = governanceService.policies.find(p => p.id === req.params.id);
    if (!policy) throw new Error('Policy not found');
    res.json({ success: true, data: policy });
  } catch (error) {
    res.status(404).json({ success: false, error: error.message });
  }
});

router.put('/policies/:id', (req, res) => {
  try {
    const policy = governanceService.updatePolicy(req.params.id, req.body);
    res.json({ success: true, data: policy });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.get('/policies', (req, res) => {
  try {
    const policies = governanceService.listPolicies(req.query);
    res.json({ success: true, data: policies });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.post('/policies/:id/acknowledge', (req, res) => {
  try {
    const acknowledgement = governanceService.acknowledgePolicy(
      req.body.employeeId,
      req.params.id
    );
    res.json({ success: true, data: acknowledgement });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.get('/policies/:id/acknowledgements', (req, res) => {
  try {
    const status = governanceService.getPolicyAcknowledgementStatus(req.params.id);
    res.json({ success: true, data: status });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * COMPLIANCE MONITORING ENDPOINTS
 */

router.post('/compliance/track', (req, res) => {
  try {
    const record = governanceService.trackComplianceActivity(req.body);
    res.status(201).json({ success: true, data: record });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.get('/compliance/report', (req, res) => {
  try {
    const report = governanceService.generateComplianceReport(req.query);
    res.json({ success: true, data: report });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.post('/compliance/violations', (req, res) => {
  try {
    const violation = governanceService.reportViolation(req.body);
    res.status(201).json({ success: true, data: violation });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.get('/compliance/violations', (req, res) => {
  try {
    const violations = governanceService.incidentLog;
    res.json({ success: true, data: violations });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.post('/compliance/retention', (req, res) => {
  try {
    const policy = governanceService.trackDataRetention(req.body);
    res.status(201).json({ success: true, data: policy });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * RISK ASSESSMENT ENDPOINTS
 */

router.post('/risks', (req, res) => {
  try {
    const risk = governanceService.identifyRisk(req.body);
    res.status(201).json({ success: true, data: risk });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.get('/risks/:id', (req, res) => {
  try {
    const risk = governanceService.riskRegister.find(r => r.id === req.params.id);
    if (!risk) throw new Error('Risk not found');
    res.json({ success: true, data: risk });
  } catch (error) {
    res.status(404).json({ success: false, error: error.message });
  }
});

router.put('/risks/:id/score', (req, res) => {
  try {
    const risk = governanceService.scoreRisk(req.params.id, req.body);
    res.json({ success: true, data: risk });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.post('/risks/:id/mitigation', (req, res) => {
  try {
    const plan = governanceService.createMitigationPlan({
      riskId: req.params.id,
      ...req.body,
    });
    res.status(201).json({ success: true, data: plan });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.put('/mitigation/:id/track', (req, res) => {
  try {
    const plan = governanceService.trackMitigation(req.params.id, req.body);
    res.json({ success: true, data: plan });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.post('/risks/:id/escalate', (req, res) => {
  try {
    const escalation = governanceService.escalateRisk(req.params.id, req.body);
    res.json({ success: true, data: escalation });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.get('/risks', (req, res) => {
  try {
    const risks = governanceService.riskRegister;
    res.json({ success: true, data: risks });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * INTERNAL CONTROLS ENDPOINTS
 */

router.post('/controls', (req, res) => {
  try {
    const control = governanceService.defineControl(req.body);
    res.status(201).json({ success: true, data: control });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.get('/controls', (req, res) => {
  try {
    const controls = governanceService.internalControls;
    res.json({ success: true, data: controls });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.post('/controls/segregation', (req, res) => {
  try {
    const segregation = governanceService.segregateDuties(req.body);
    res.status(201).json({ success: true, data: segregation });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.post('/controls/authorization-matrix', (req, res) => {
  try {
    const matrix = governanceService.createAuthorizationMatrix(req.body);
    res.status(201).json({ success: true, data: matrix });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.post('/controls/:id/enforce', (req, res) => {
  try {
    const enforcement = governanceService.enforceControls({
      controlId: req.params.id,
      ...req.body,
    });
    res.json({ success: true, data: enforcement });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.post('/controls/:id/audit', (req, res) => {
  try {
    const result = governanceService.auditControls({
      controlId: req.params.id,
      ...req.body,
    });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * GOVERNANCE REPORTING ENDPOINTS
 */

router.get('/report', (req, res) => {
  try {
    const report = governanceService.getGovernanceReport(req.query.type);
    res.json({ success: true, data: report });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.get('/dashboard', (req, res) => {
  try {
    const report = governanceService.getGovernanceReport('executive');
    res.json({ success: true, data: report });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

module.exports = router;
