/**
 * Integration Routes - Government, Insurance, Laboratory
 *
 * This router exposes all three external system integrations via REST API:
 * - Government Services (Identity, Health Records, Compliance)
 * - Insurance (Eligibility, Claims, Provider Network)
 * - Laboratory (Orders, Results, Format Support)
 *
 * BASE: /api/integrations
 */

const express = require('express');
const router = express.Router();
const pino = require('pino');

// Logger
const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: { colorize: true },
  },
});

// Initialize connectors from environment
let integrations = null;

const getIntegrationManager = () => {
  if (!integrations) {
    // Return a mock manager for now (connectors can be fully implemented later)
    integrations = {
      gov: {
        verifyCitizen: async (nationalId, fullName, dateOfBirth) => ({
          success: true,
          citizenId: nationalId,
          status: 'verified',
          timestamp: new Date().toISOString(),
        }),
        requestConsent: async (citizenId, consentType, scope) => ({
          success: true,
          consentToken: `token-${Date.now()}`,
          expiresIn: 3600,
        }),
        getCitizenHealthRecords: async (nationalId, consentToken) => ({
          success: true,
          records: [],
        }),
        reportIncident: async (incidentType, description, severity) => ({
          success: true,
          incidentId: `INC-${Date.now()}`,
        }),
      },
      insurance: {
        verifyEligibility: async (policyNumber, patientId, serviceType) => ({
          success: true,
          eligible: true,
          coverage: 100,
        }),
        submitClaim: async (patientId, policyNumber, serviceDetails) => ({
          success: true,
          claimId: `CLM-${Date.now()}`,
        }),
        trackClaim: async (claimId) => ({
          success: true,
          status: 'pending',
        }),
        verifyProvider: async (providerId, insurerId) => ({
          success: true,
          inNetwork: true,
        }),
        registerWebhook: async (events) => ({
          success: true,
          webhookId: `WH-${Date.now()}`,
        }),
        handleWebhookEvent: async (body, signature) => ({ success: true }),
      },
      lab: {
        submitOrder: async (orderId, patientId, tests, priority) => ({
          success: true,
          orderId,
          status: 'received',
        }),
        getResults: async (orderId) => ({
          success: true,
          results: [],
        }),
        trackOrder: async (orderId) => ({
          success: true,
          status: 'pending',
        }),
        cancelOrder: async (orderId, reason) => ({
          success: true,
        }),
        reconcilePendingOrders: async () => ({
          success: true,
          reconciled: 0,
        }),
      },
      healthCheck: async () => ({
        government: { status: 'ok' },
        insurance: { status: 'ok' },
        lab: { status: 'ok' },
      }),
      getMetrics: () => ({
        requestCount: 0,
        errorCount: 0,
        avgResponseTime: 0,
      }),
      resetMetrics: () => {},
      startBackgroundTasks: () => {},
      stopBackgroundTasks: () => {},
    };
  }
  return integrations;
};

// ============================================================================
// HEALTH CHECK ENDPOINTS
// ============================================================================

/**
 * GET /api/integrations/health
 * Check health of all three connectors
 */
router.get('/health', async (req, res) => {
  try {
    const manager = getIntegrationManager();
    const health = await manager.healthCheck();

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      health,
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(500).json({
      success: false,
      error: 'Health check failed',
      message: error.message,
    });
  }
});

/**
 * GET /api/integrations/metrics
 * Get performance metrics from all connectors
 */
router.get('/metrics', async (req, res) => {
  try {
    const manager = getIntegrationManager();
    const metrics = manager.getMetrics();

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      metrics,
    });
  } catch (error) {
    logger.error('Metrics fetch failed:', error);
    res.status(500).json({
      success: false,
      error: 'Metrics fetch failed',
      message: error.message,
    });
  }
});

/**
 * POST /api/integrations/reset-metrics
 * Reset performance metrics counters
 */
router.post('/reset-metrics', (req, res) => {
  try {
    const manager = getIntegrationManager();
    manager.resetMetrics();

    res.json({
      success: true,
      message: 'Metrics reset successfully',
    });
  } catch (error) {
    logger.error('Metrics reset failed:', error);
    res.status(500).json({
      success: false,
      error: 'Metrics reset failed',
      message: error.message,
    });
  }
});

// ============================================================================
// GOVERNMENT INTEGRATION ENDPOINTS
// ============================================================================

/**
 * POST /api/integrations/government/verify-citizen
 * Verify citizen identity with government systems
 *
 * Body:
 *   - nationalId: string (e.g., "1234567890")
 *   - fullName: string (e.g., "محمد علي محمد")
 *   - dateOfBirth: string (ISO date)
 */
router.post('/government/verify-citizen', async (req, res) => {
  try {
    const { nationalId, fullName, dateOfBirth } = req.body;

    if (!nationalId || !fullName || !dateOfBirth) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: nationalId, fullName, dateOfBirth',
      });
    }

    const manager = getIntegrationManager();
    const result = await manager.gov.verifyCitizen(nationalId, fullName, dateOfBirth);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Citizen verification failed:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: 'Citizen verification failed',
      message: error.message,
    });
  }
});

/**
 * POST /api/integrations/government/request-consent
 * Request citizen consent for data access
 *
 * Body:
 *   - citizenId: string
 *   - consentType: string (e.g., "health-data")
 *   - scope: string[] (e.g., ["medical", "financial"])
 */
router.post('/government/request-consent', async (req, res) => {
  try {
    const { citizenId, consentType, scope } = req.body;

    if (!citizenId || !consentType || !scope) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: citizenId, consentType, scope',
      });
    }

    const manager = getIntegrationManager();
    const result = await manager.gov.requestConsent(citizenId, consentType, scope);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Consent request failed:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: 'Consent request failed',
      message: error.message,
    });
  }
});

/**
 * GET /api/integrations/government/health-records/:nationalId
 * Retrieve citizen health records
 *
 * Query:
 *   - consentToken: string (from requestConsent)
 */
router.get('/government/health-records/:nationalId', async (req, res) => {
  try {
    const { nationalId } = req.params;
    const { consentToken } = req.query;

    if (!consentToken) {
      return res.status(400).json({
        success: false,
        error: 'Missing required query parameter: consentToken',
      });
    }

    const manager = getIntegrationManager();
    const result = await manager.gov.getCitizenHealthRecords(nationalId, consentToken);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Health records retrieval failed:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: 'Health records retrieval failed',
      message: error.message,
    });
  }
});

/**
 * POST /api/integrations/government/report-incident
 * Report compliance incident
 *
 * Body:
 *   - incidentType: string
 *   - description: string
 *   - severity: string ('low', 'medium', 'high', 'critical')
 */
router.post('/government/report-incident', async (req, res) => {
  try {
    const { incidentType, description, severity } = req.body;

    if (!incidentType || !description || !severity) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: incidentType, description, severity',
      });
    }

    const manager = getIntegrationManager();
    const result = await manager.gov.reportIncident(incidentType, description, severity);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Incident report failed:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: 'Incident report failed',
      message: error.message,
    });
  }
});

// ============================================================================
// INSURANCE INTEGRATION ENDPOINTS
// ============================================================================

/**
 * POST /api/integrations/insurance/verify-eligibility
 * Check insurance coverage eligibility
 *
 * Body:
 *   - policyNumber: string
 *   - patientId: string
 *   - serviceType: string
 */
router.post('/insurance/verify-eligibility', async (req, res) => {
  try {
    const { policyNumber, patientId, serviceType } = req.body;

    if (!policyNumber || !patientId || !serviceType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: policyNumber, patientId, serviceType',
      });
    }

    const manager = getIntegrationManager();
    const result = await manager.insurance.verifyEligibility(policyNumber, patientId, serviceType);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Eligibility verification failed:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: 'Eligibility verification failed',
      message: error.message,
    });
  }
});

/**
 * POST /api/integrations/insurance/submit-claim
 * Submit insurance claim
 *
 * Body:
 *   - patientId: string
 *   - policyNumber: string
 *   - serviceDetails: object
 *     - type: 'service' | 'pharmacy' | 'lab'
 *     - code: string
 *     - description: string
 *     - date: ISO date
 *     - provider: string
 *     - grossAmount: number
 *     - copayAmount: number
 *     - documents: string[] (base64 encoded PDFs)
 */
router.post('/insurance/submit-claim', async (req, res) => {
  try {
    const { patientId, policyNumber, serviceDetails } = req.body;

    if (!patientId || !policyNumber || !serviceDetails) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: patientId, policyNumber, serviceDetails',
      });
    }

    const manager = getIntegrationManager();
    const result = await manager.insurance.submitClaim(patientId, policyNumber, serviceDetails);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Claim submission failed:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: 'Claim submission failed',
      message: error.message,
    });
  }
});

/**
 * GET /api/integrations/insurance/claim/:claimId
 * Track insurance claim status
 */
router.get('/insurance/claim/:claimId', async (req, res) => {
  try {
    const { claimId } = req.params;

    const manager = getIntegrationManager();
    const result = await manager.insurance.trackClaim(claimId);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Claim tracking failed:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: 'Claim tracking failed',
      message: error.message,
    });
  }
});

/**
 * POST /api/integrations/insurance/verify-provider
 * Verify provider is in-network
 *
 * Body:
 *   - providerId: string
 *   - insurerId: string
 */
router.post('/insurance/verify-provider', async (req, res) => {
  try {
    const { providerId, insurerId } = req.body;

    if (!providerId || !insurerId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: providerId, insurerId',
      });
    }

    const manager = getIntegrationManager();
    const result = await manager.insurance.verifyProvider(providerId, insurerId);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Provider verification failed:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: 'Provider verification failed',
      message: error.message,
    });
  }
});

/**
 * POST /api/integrations/insurance/register-webhook
 * Register for insurance webhook notifications
 *
 * Body:
 *   - events: string[] (e.g., ['claim.approved', 'claim.rejected', 'claim.pending'])
 */
router.post('/insurance/register-webhook', async (req, res) => {
  try {
    const { events } = req.body;

    if (!events || !Array.isArray(events)) {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid required field: events (array)',
      });
    }

    const manager = getIntegrationManager();
    const result = await manager.insurance.registerWebhook(events);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Webhook registration failed:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: 'Webhook registration failed',
      message: error.message,
    });
  }
});

/**
 * POST /api/integrations/insurance/webhook
 * Handle incoming insurance webhook events
 */
router.post('/insurance/webhook', async (req, res) => {
  try {
    const signature = req.headers['x-signature'];

    const manager = getIntegrationManager();
    await manager.insurance.handleWebhookEvent(req.body, signature);

    res.sendStatus(200);
  } catch (error) {
    logger.error('Webhook handling failed:', error);
    res.status(400).json({
      success: false,
      error: 'Webhook handling failed',
      message: error.message,
    });
  }
});

// ============================================================================
// LABORATORY INTEGRATION ENDPOINTS
// ============================================================================

/**
 * POST /api/integrations/lab/submit-order
 * Submit laboratory test order
 *
 * Body:
 *   - orderId: string (e.g., 'ORD-2026-001')
 *   - patientId: string
 *   - tests: array of test objects
 *     - code: string (e.g., '03020')
 *     - name: string (e.g., 'Complete Blood Count')
 *     - specimen: string
 *   - priority: 'normal' | 'urgent'
 */
router.post('/lab/submit-order', async (req, res) => {
  try {
    const { orderId, patientId, tests, priority = 'normal' } = req.body;

    if (!orderId || !patientId || !tests || !Array.isArray(tests)) {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid required fields: orderId, patientId, tests (array)',
      });
    }

    const manager = getIntegrationManager();
    const result = await manager.lab.submitOrder(orderId, patientId, tests, priority);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Lab order submission failed:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: 'Lab order submission failed',
      message: error.message,
    });
  }
});

/**
 * GET /api/integrations/lab/results/:orderId
 * Retrieve laboratory test results
 *
 * Query (optional):
 *   - format: 'json' | 'hl7' | 'fhir'
 */
router.get('/lab/results/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { format = 'json' } = req.query;

    if (!['json', 'hl7', 'fhir'].includes(format)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid format. Must be: json, hl7, or fhir',
      });
    }

    const manager = getIntegrationManager();
    const originalResult = await manager.lab.getResults(orderId);

    // Convert format if needed
    let result = originalResult;
    if (format === 'hl7' && manager.lab.convertToHL7) {
      result = manager.lab.convertToHL7(originalResult);
    } else if (format === 'fhir' && manager.lab.convertToFHIR) {
      result = manager.lab.convertToFHIR(originalResult);
    }

    res.json({
      success: true,
      format,
      data: result,
    });
  } catch (error) {
    logger.error('Results retrieval failed:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: 'Results retrieval failed',
      message: error.message,
    });
  }
});

/**
 * GET /api/integrations/lab/order/:orderId
 * Track laboratory order status
 */
router.get('/lab/order/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;

    const manager = getIntegrationManager();
    const result = await manager.lab.trackOrder(orderId);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Order tracking failed:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: 'Order tracking failed',
      message: error.message,
    });
  }
});

/**
 * POST /api/integrations/lab/cancel-order
 * Cancel pending laboratory order
 *
 * Body:
 *   - orderId: string
 *   - reason: string (optional)
 */
router.post('/lab/cancel-order', async (req, res) => {
  try {
    const { orderId, reason } = req.body;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: orderId',
      });
    }

    const manager = getIntegrationManager();
    const result = await manager.lab.cancelOrder(orderId, reason);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Order cancellation failed:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: 'Order cancellation failed',
      message: error.message,
    });
  }
});

/**
 * POST /api/integrations/lab/reconcile
 * Manually trigger reconciliation of pending orders
 */
router.post('/lab/reconcile', async (req, res) => {
  try {
    const manager = getIntegrationManager();
    const result = await manager.lab.reconcilePendingOrders();

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Reconciliation failed:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: 'Reconciliation failed',
      message: error.message,
    });
  }
});

// ============================================================================
// BACKGROUND TASKS MANAGEMENT
// ============================================================================

/**
 * POST /api/integrations/start-background-tasks
 * Start background health checks and reconciliation
 */
router.post('/start-background-tasks', (req, res) => {
  try {
    const manager = getIntegrationManager();
    manager.startBackgroundTasks();

    res.json({
      success: true,
      message: 'Background tasks started successfully',
    });
  } catch (error) {
    logger.error('Background tasks start failed:', error);
    res.status(500).json({
      success: false,
      error: 'Background tasks start failed',
      message: error.message,
    });
  }
});

/**
 * POST /api/integrations/stop-background-tasks
 * Stop background health checks and reconciliation
 */
router.post('/stop-background-tasks', (req, res) => {
  try {
    const manager = getIntegrationManager();
    manager.stopBackgroundTasks();

    res.json({
      success: true,
      message: 'Background tasks stopped successfully',
    });
  } catch (error) {
    logger.error('Background tasks stop failed:', error);
    res.status(500).json({
      success: false,
      error: 'Background tasks stop failed',
      message: error.message,
    });
  }
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

// Catch-all for integration errors (must be registered last)
router.use((error, req, res, next) => {
  logger.error('Integration route error:', error);
  res.status(error.statusCode || 500).json({
    success: false,
    error: 'Integration service error',
    message: error.message,
  });
});

module.exports = router;
