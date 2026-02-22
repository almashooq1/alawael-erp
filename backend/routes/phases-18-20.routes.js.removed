// Phases 18-20: Enterprise API Routes
// Multi-Tenant Management, Integrations, Compliance & White-Label

const express = require('express');
const router = express.Router();

// Import managers
const { TenantManager, TenantMiddleware } = require('../utils/multi-tenant');
const { WebhookDispatcher, ThirdPartyIntegration } = require('../utils/integrations');
const {
  ComplianceManager,
  SSO_Manager,
  WhiteLabelManager,
} = require('../utils/enterprise-compliance');

// Initialize managers
const tenantManager = new TenantManager();
const tenantMiddleware = new TenantMiddleware(tenantManager);
const webhookDispatcher = new WebhookDispatcher();
const integrationManager = new ThirdPartyIntegration();
const complianceManager = new ComplianceManager();
const ssoManager = new SSO_Manager();
const whiteLabelManager = new WhiteLabelManager();

// ==================== PHASE 18: MULTI-TENANT ROUTES ====================

/**
 * POST /api/v18/tenants
 * Create new tenant
 */
router.post('/v18/tenants', (req, res) => {
  try {
    const { name, email, plan, domain, industry, maxUsers, storageLimit, apiCallsLimit } = req.body;

    const result = tenantManager.createTenant({
      name,
      email,
      plan,
      domain,
      industry,
      maxUsers: maxUsers || 100,
      storageLimit: storageLimit || 10 * 1024 * 1024 * 1024, // 10GB
      apiCallsLimit: apiCallsLimit || 100000,
    });

    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/v18/tenants/:tenantId
 * Get tenant details
 */
router.get('/v18/tenants/:tenantId', (req, res) => {
  try {
    const tenant = tenantManager.getTenant(req.params.tenantId);
    res.json(tenant);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

/**
 * PUT /api/v18/tenants/:tenantId/settings
 * Update tenant settings
 */
router.put('/v18/tenants/:tenantId/settings', (req, res) => {
  try {
    const result = tenantManager.updateTenantSettings(req.params.tenantId, req.body);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * PUT /api/v18/tenants/:tenantId/branding
 * Update tenant branding
 */
router.put('/v18/tenants/:tenantId/branding', (req, res) => {
  try {
    const result = tenantManager.updateTenantBranding(req.params.tenantId, req.body);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/v18/tenants/:tenantId/roles
 * Create custom role
 */
router.post('/v18/tenants/:tenantId/roles', (req, res) => {
  try {
    const role = tenantManager.createRole(req.params.tenantId, req.body);
    res.status(201).json(role);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/v18/tenants/:tenantId/users
 * Add user to tenant
 */
router.post('/v18/tenants/:tenantId/users', (req, res) => {
  try {
    const user = tenantManager.addUserToTenant(req.params.tenantId, req.body);
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/v18/tenants/:tenantId/api-keys
 * Generate API key
 */
router.post('/v18/tenants/:tenantId/api-keys', (req, res) => {
  try {
    const apiKey = tenantManager.generateApiKey(req.params.tenantId, req.body);
    res.status(201).json(apiKey);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/v18/tenants/:tenantId/webhooks
 * Setup webhook
 */
router.post('/v18/tenants/:tenantId/webhooks', (req, res) => {
  try {
    const webhook = tenantManager.setupWebhook(req.params.tenantId, req.body);
    res.status(201).json(webhook);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/v18/tenants/:tenantId/usage
 * Get tenant usage statistics
 */
router.get('/v18/tenants/:tenantId/usage', (req, res) => {
  try {
    const stats = tenantManager.getUsageStats(req.params.tenantId);
    res.json(stats);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/v18/tenants/:tenantId/audit-log
 * Get audit log
 */
router.get('/v18/tenants/:tenantId/audit-log', (req, res) => {
  try {
    const limit = req.query.limit || 100;
    const log = tenantManager.getAuditLog(req.params.tenantId, limit);
    res.json(log);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * DELETE /api/v18/tenants/:tenantId
 * Delete tenant (soft delete)
 */
router.delete('/v18/tenants/:tenantId', (req, res) => {
  try {
    const result = tenantManager.deleteTenant(req.params.tenantId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ==================== PHASE 19: INTEGRATION ROUTES ====================

/**
 * POST /api/v19/integrations
 * Register third-party integration
 */
router.post('/v19/integrations', (req, res) => {
  try {
    const result = integrationManager.registerIntegration(req.body);
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/v19/integrations
 * List all integrations
 */
router.get('/v19/integrations', (req, res) => {
  try {
    const integrations = integrationManager.listIntegrations();
    res.json(integrations);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/v19/integrations/:integrationId/sync
 * Sync data from integration
 */
router.post('/v19/integrations/:integrationId/sync', async (req, res) => {
  try {
    const result = await integrationManager.syncData(req.params.integrationId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/v19/integrations/:integrationId/push
 * Push data to integration
 */
router.post('/v19/integrations/:integrationId/push', async (req, res) => {
  try {
    const result = await integrationManager.pushData(req.params.integrationId, req.body.data);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * DELETE /api/v19/integrations/:integrationId
 * Disconnect integration
 */
router.delete('/v19/integrations/:integrationId', (req, res) => {
  try {
    const result = integrationManager.disconnectIntegration(req.params.integrationId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/v19/webhooks
 * Register webhook
 */
router.post('/v19/webhooks', (req, res) => {
  try {
    const { tenantId, url, events, secret, headers } = req.body;
    const result = webhookDispatcher.registerWebhook(tenantId, {
      url,
      events,
      secret,
      headers,
    });
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/v19/webhooks/:webhookId/logs
 * Get webhook delivery logs
 */
router.get('/v19/webhooks/:webhookId/logs', (req, res) => {
  try {
    const limit = req.query.limit || 100;
    const logs = webhookDispatcher.getDeliveryLog(req.params.webhookId, limit);
    res.json(logs);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * DELETE /api/v19/webhooks/:webhookId
 * Delete webhook
 */
router.delete('/v19/webhooks/:webhookId', (req, res) => {
  try {
    const result = webhookDispatcher.deleteWebhook(req.params.webhookId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ==================== PHASE 20: COMPLIANCE & WHITE-LABEL ROUTES ====================

/**
 * POST /api/v20/compliance/policy
 * Initialize compliance policy
 */
router.post('/v20/compliance/policy', (req, res) => {
  try {
    const result = complianceManager.initializeCompliancePolicy(req.body.tenantId, req.body);
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/v20/compliance/consent
 * Record user consent (GDPR)
 */
router.post('/v20/compliance/consent', (req, res) => {
  try {
    const { tenantId, userId, consentData } = req.body;
    const consent = complianceManager.recordConsent(tenantId, userId, consentData);
    res.status(201).json(consent);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/v20/compliance/consent/withdraw
 * Withdraw consent (GDPR)
 */
router.post('/v20/compliance/consent/withdraw', (req, res) => {
  try {
    const { tenantId, userId, consentType } = req.body;
    const result = complianceManager.withdrawConsent(tenantId, userId, consentType);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/v20/compliance/data-export
 * Export user data (GDPR Right to Data Portability)
 */
router.post('/v20/compliance/data-export', (req, res) => {
  try {
    const { tenantId, userId } = req.body;
    const exported = complianceManager.exportUserData(tenantId, userId);
    res.json(exported);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/v20/compliance/data-delete
 * Delete user data (GDPR Right to be Forgotten)
 */
router.post('/v20/compliance/data-delete', (req, res) => {
  try {
    const { tenantId, userId } = req.body;
    const result = complianceManager.deleteUserData(tenantId, userId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/v20/compliance/audit-log
 * Get compliance audit log
 */
router.get('/v20/compliance/audit-log', (req, res) => {
  try {
    const { tenantId, startDate, endDate, eventType, limit } = req.query;
    const log = complianceManager.getAuditLog(tenantId, {
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      eventType,
      limit: limit || 1000,
    });
    res.json(log);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/v20/compliance/report
 * Generate compliance report
 */
router.get('/v20/compliance/report', (req, res) => {
  try {
    const { tenantId } = req.query;
    const report = complianceManager.generateComplianceReport(tenantId);
    res.json(report);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/v20/sso/configure
 * Configure SSO provider
 */
router.post('/v20/sso/configure', (req, res) => {
  try {
    const result = ssoManager.configureSSO(req.body.tenantId, req.body);
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/v20/sso/authenticate
 * Authenticate via SSO
 */
router.post('/v20/sso/authenticate', (req, res) => {
  try {
    const { tenantId, provider, token } = req.body;
    const result = ssoManager.authenticateSSO(tenantId, provider, token);
    res.json(result);
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

/**
 * POST /api/v20/sso/logout
 * Logout SSO session
 */
router.post('/v20/sso/logout', (req, res) => {
  try {
    const { sessionId } = req.body;
    const result = ssoManager.logoutSession(sessionId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/v20/white-label/configure
 * Configure white-label branding
 */
router.post('/v20/white-label/configure', (req, res) => {
  try {
    const result = whiteLabelManager.createWhiteLabel(req.body.tenantId, req.body);
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/v20/white-label/:tenantId
 * Get white-label configuration
 */
router.get('/v20/white-label/:tenantId', (req, res) => {
  try {
    const config = whiteLabelManager.getWhiteLabel(req.params.tenantId);
    if (!config) {
      return res.status(404).json({ error: 'White-label configuration not found' });
    }
    res.json(config);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * PUT /api/v20/white-label/:tenantId
 * Update white-label configuration
 */
router.put('/v20/white-label/:tenantId', (req, res) => {
  try {
    const result = whiteLabelManager.updateWhiteLabel(req.params.tenantId, req.body);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
