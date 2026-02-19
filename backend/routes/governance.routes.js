/**
 * ALAWAEL ERP - GOVERNANCE & COMPLIANCE ROUTES
 * Phase 15 - Governance & Compliance API
 * 
 * Endpoints for audit trails, compliance tracking, and data governance
 */

const express = require('express');
const router = express.Router();
const governanceService = require('../services/governance.service');
const { authenticateToken } = require('../middleware/auth');

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * AUDIT LOGGING ENDPOINTS
 */

/**
 * POST /api/v1/governance/audit
 * Log an audit event
 */
router.post('/audit', async (req, res) => {
  try {
    const { userId, action, resource, resourceId, changes, ipAddress, userAgent } = req.body;

    // Validate required fields
    if (!userId || !action || !resource) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: userId, action, resource',
      });
    }

    const auditLog = await governanceService.logAuditEvent({
      userId,
      action,
      resource,
      resourceId,
      changes,
      ipAddress: ipAddress || req.ip,
      userAgent: userAgent || req.get('user-agent'),
    });

    res.status(201).json({
      success: true,
      message: 'Audit event logged successfully',
      data: auditLog,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/v1/governance/audit-trail
 * Retrieve audit trail with filters
 */
router.get('/audit-trail', async (req, res) => {
  try {
    const { userId, resource, startDate, endDate, limit, skip } = req.query;

    const auditTrail = await governanceService.getAuditTrail({
      userId,
      resource,
      startDate,
      endDate,
      limit: parseInt(limit) || 100,
      skip: parseInt(skip) || 0,
    });

    res.json({
      success: true,
      message: 'Audit trail retrieved successfully',
      data: auditTrail,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/v1/governance/activity/:userId
 * Get user activity report
 */
router.get('/activity/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { timeRange = 'month' } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required',
      });
    }

    const report = await governanceService.getUserActivityReport(userId, timeRange);

    res.json({
      success: true,
      message: 'User activity report generated',
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
 * COMPLIANCE TRACKING ENDPOINTS
 */

/**
 * POST /api/v1/governance/compliance-event
 * Track a compliance event
 */
router.post('/compliance-event', async (req, res) => {
  try {
    const { regulation, eventType, resourceId, description, severity } = req.body;

    if (!regulation || !eventType) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: regulation, eventType',
      });
    }

    const event = await governanceService.trackComplianceEvent({
      regulation,
      eventType,
      resourceId,
      description,
      severity,
    });

    res.status(201).json({
      success: true,
      message: 'Compliance event tracked',
      data: event,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/v1/governance/compliance/gdpr/:dataSubjectId
 * Check GDPR compliance status
 */
router.get('/compliance/gdpr/:dataSubjectId', async (req, res) => {
  try {
    const { dataSubjectId } = req.params;

    if (!dataSubjectId) {
      return res.status(400).json({
        success: false,
        message: 'Data subject ID is required',
      });
    }

    const compliance = await governanceService.checkGDPRCompliance(dataSubjectId);

    res.json({
      success: true,
      message: 'GDPR compliance check completed',
      data: compliance,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/v1/governance/compliance/hipaa/:patientId
 * Check HIPAA compliance status
 */
router.get('/compliance/hipaa/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;

    if (!patientId) {
      return res.status(400).json({
        success: false,
        message: 'Patient ID is required',
      });
    }

    const compliance = await governanceService.checkHIPAACompliance(patientId);

    res.json({
      success: true,
      message: 'HIPAA compliance check completed',
      data: compliance,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/v1/governance/compliance/pci-dss
 * Check PCI-DSS compliance status
 */
router.get('/compliance/pci-dss', async (req, res) => {
  try {
    const compliance = await governanceService.checkPCIDSSCompliance();

    res.json({
      success: true,
      message: 'PCI-DSS compliance check completed',
      data: compliance,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * DATA GOVERNANCE ENDPOINTS
 */

/**
 * POST /api/v1/governance/policy
 * Create a governance policy
 */
router.post('/policy', async (req, res) => {
  try {
    const { policyName, category, rules, owner, approvalRequired } = req.body;

    if (!policyName || !category) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: policyName, category',
      });
    }

    const policy = await governanceService.createGovernancePolicy({
      policyName,
      category,
      rules,
      owner,
      approvalRequired,
    });

    res.status(201).json({
      success: true,
      message: 'Governance policy created',
      data: policy,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/v1/governance/policies
 * Retrieve governance policies
 */
router.get('/policies', async (req, res) => {
  try {
    const { category } = req.query;

    const policies = await governanceService.getGovernancePolicies(category);

    res.json({
      success: true,
      message: 'Governance policies retrieved',
      data: policies,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /api/v1/governance/data-classification
 * Apply data classification
 */
router.post('/data-classification', async (req, res) => {
  try {
    const { dataId, classification } = req.body;

    if (!dataId || !classification) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: dataId, classification',
      });
    }

    const result = await governanceService.enforceDataClassification(dataId, classification);

    res.json({
      success: true,
      message: 'Data classification enforced',
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * DATA RETENTION ENDPOINTS
 */

/**
 * POST /api/v1/governance/retention-policy
 * Set data retention policy
 */
router.post('/retention-policy', async (req, res) => {
  try {
    const { resourceType, retentionDays } = req.body;

    if (!resourceType || !retentionDays) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: resourceType, retentionDays',
      });
    }

    const policy = await governanceService.setDataRetentionPolicy(resourceType, retentionDays);

    res.status(201).json({
      success: true,
      message: 'Data retention policy set',
      data: policy,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/v1/governance/retention-policies
 * Get data retention policies
 */
router.get('/retention-policies', async (req, res) => {
  try {
    const policies = await governanceService.getDataRetentionPolicies();

    res.json({
      success: true,
      message: 'Data retention policies retrieved',
      data: policies,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /api/v1/governance/schedule-purge
 * Schedule data purge
 */
router.post('/schedule-purge', async (req, res) => {
  try {
    const { resourceType, olderThanDays } = req.body;

    if (!resourceType || !olderThanDays) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: resourceType, olderThanDays',
      });
    }

    const schedule = await governanceService.scheduleDataPurge(resourceType, olderThanDays);

    res.status(201).json({
      success: true,
      message: 'Data purge scheduled',
      data: schedule,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * ACCESS CONTROL AUDIT ENDPOINTS
 */

/**
 * POST /api/v1/governance/access-audit
 * Audit access control decision
 */
router.post('/access-audit', async (req, res) => {
  try {
    const { userId, resource, action, accessGranted, reason } = req.body;

    if (!userId || !resource) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: userId, resource',
      });
    }

    const log = await governanceService.auditAccessControl({
      userId,
      resource,
      action,
      accessGranted,
      reason,
    });

    res.status(201).json({
      success: true,
      message: 'Access control audited',
      data: log,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/v1/governance/access-report
 * Get access control report
 */
router.get('/access-report', async (req, res) => {
  try {
    const { userId } = req.query;

    const report = await governanceService.getAccessControlReport(userId);

    res.json({
      success: true,
      message: 'Access control report generated',
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
 * PUT /api/v1/governance/access-audit/:logId
 * Review access control decision
 */
router.put('/access-audit/:logId', async (req, res) => {
  try {
    const { logId } = req.params;
    const { approved, notes } = req.body;

    if (!logId || typeof approved !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: logId, approved',
      });
    }

    const updatedLog = await governanceService.reviewAccessControl(logId, approved, notes);

    res.json({
      success: true,
      message: 'Access control review completed',
      data: updatedLog,
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

/**
 * GET /api/v1/governance/compliance-report
 * Generate compliance report
 */
router.get('/compliance-report', async (req, res) => {
  try {
    const { timeRange = 'month' } = req.query;

    const report = await governanceService.generateComplianceReport(timeRange);

    res.json({
      success: true,
      message: 'Compliance report generated',
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
 * GET /api/v1/governance/audit-report
 * Generate audit report
 */
router.get('/audit-report', async (req, res) => {
  try {
    const { timeRange = 'month' } = req.query;

    const report = await governanceService.generateAuditReport(timeRange);

    res.json({
      success: true,
      message: 'Audit report generated',
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
 * HEALTH CHECK
 */

router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    service: 'governance',
    timestamp: new Date(),
  });
});

module.exports = router;
