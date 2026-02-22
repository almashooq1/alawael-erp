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

// Import connectors
const { GovernmentConnector } = require('./integrations/government-connector');
const { InsuranceConnector } = require('./integrations/insurance-connector');
const { LabConnector } = require('./integrations/lab-connector');
const { IntegrationManager } = require('./integrations/integration-manager');

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
    integrations = new IntegrationManager({
      logLevel: process.env.LOG_LEVEL || 'info',
      government: {
        baseURL: process.env.GOV_API_URL || 'https://api.gov.sa',
        clientId: process.env.GOV_CLIENT_ID,
        clientSecret: process.env.GOV_CLIENT_SECRET,
      },
      insurance: {
        baseURL: process.env.INSURANCE_API_URL || 'https://api.insurance.sa',
        apiKey: process.env.INSURANCE_API_KEY,
        clientId: process.env.INSURANCE_CLIENT_ID,
        clientSecret: process.env.INSURANCE_CLIENT_SECRET,
        webhookUrl: process.env.INSURANCE_WEBHOOK_URL,
      },
      lab: {
        baseURL: process.env.LAB_API_URL || 'https://api.labs.sa',
        apiKey: process.env.LAB_API_KEY,
        format: process.env.LAB_FORMAT || 'json', // 'json', 'hl7', 'fhir'
        clientCert: process.env.LAB_CLIENT_CERT,
        clientKey: process.env.LAB_CLIENT_KEY,
      },
    });
  }
  return integrations;
};

// Root endpoint to advertise available integration routes
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Integrations service is online',
    endpoints: [
      '/api/integrations/health',
      '/api/integrations/metrics',
      '/api/integrations/reset-metrics',
      '/api/integrations/government/*',
      '/api/integrations/insurance/*',
      '/api/integrations/lab/*',
    ],
  });
});

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

class IntegrationService {
  /**
   * Google Drive Integration
   */
  async uploadToGoogleDrive(file, userId) {
    try {
      const accessToken = await this.getGoogleAccessToken(userId);

      const response = await axios.post(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=media',
        file,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': file.mimetype,
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('Google Drive upload error:', error);
      throw error;
    }
  }

  /**
   * Get Google Access Token
   */
  async getGoogleAccessToken(userId) {
    // Get stored refresh token and exchange for access token
    // Implementation depends on stored credentials
    return 'access_token';
  }

  /**
   * Stripe Payment Integration
   */
  async processPayment(userId, amount, description) {
    try {
      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: 'usd',
        metadata: {
          userId,
          description,
        },
      });

      return paymentIntent;
    } catch (error) {
      console.error('Payment processing error:', error);
      throw error;
    }
  }

  /**
   * Confirm Payment
   */
  async confirmPayment(paymentIntentId, paymentMethodId) {
    try {
      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

      const confirmed = await stripe.paymentIntents.confirm(paymentIntentId, {
        payment_method: paymentMethodId,
      });

      return confirmed;
    } catch (error) {
      console.error('Payment confirmation error:', error);
      throw error;
    }
  }

  /**
   * Zoom Meeting Integration
   */
  async createZoomMeeting(sessionData) {
    try {
      const zoomToken = await this.getZoomAccessToken();

      const response = await axios.post(
        'https://api.zoom.us/v2/users/me/meetings',
        {
          topic: sessionData.topic,
          type: 1, // Instant meeting
          start_time: sessionData.startTime,
          duration: sessionData.duration,
          settings: {
            host_video: true,
            participant_video: true,
            join_before_host: false,
            mute_upon_entry: true,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${zoomToken}`,
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('Zoom meeting creation error:', error);
      throw error;
    }
  }

  /**
   * Get Zoom Access Token
   */
  async getZoomAccessToken() {
    try {
      const response = await axios.post(`https://zoom.us/oauth/token`, null, {
        params: {
          grant_type: 'client_credentials',
          client_id: process.env.ZOOM_CLIENT_ID,
          client_secret: process.env.ZOOM_CLIENT_SECRET,
        },
      });

      return response.data.access_token;
    } catch (error) {
      console.error('Zoom token error:', error);
      throw error;
    }
  }

  /**
   * Send SMS via Twilio
   */
  async sendSMS(phoneNumber, message) {
    try {
      const twilio = require('twilio')(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );

      const result = await twilio.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phoneNumber,
      });

      return result;
    } catch (error) {
      console.error('SMS sending error:', error);
      throw error;
    }
  }

  /**
   * Send WhatsApp Message via Twilio
   */
  async sendWhatsApp(phoneNumber, message) {
    try {
      const twilio = require('twilio')(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );

      const result = await twilio.messages.create({
        from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
        body: message,
        to: `whatsapp:${phoneNumber}`,
      });

      return result;
    } catch (error) {
      console.error('WhatsApp sending error:', error);
      throw error;
    }
  }

  /**
   * Email Integration (SendGrid)
   */
  async sendEmail(email, subject, content) {
    try {
      const sgMail = require('@sendgrid/mail');
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);

      const msg = {
        to: email,
        from: process.env.SENDGRID_FROM_EMAIL,
        subject,
        html: content,
      };

      await sgMail.send(msg);
      return true;
    } catch (error) {
      console.error('Email sending error:', error);
      throw error;
    }
  }

  /**
   * Google Calendar Integration
   */
  async addEventToCalendar(userId, event) {
    try {
      const accessToken = await this.getGoogleAccessToken(userId);

      const response = await axios.post(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events',
        {
          summary: event.title,
          description: event.description,
          start: {
            dateTime: event.startTime,
          },
          end: {
            dateTime: event.endTime,
          },
          reminders: {
            useDefault: false,
            overrides: [
              { method: 'email', minutes: 24 * 60 },
              { method: 'popup', minutes: 10 },
            ],
          },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('Calendar event error:', error);
      throw error;
    }
  }

  /**
   * YouTube Integration - Get therapy videos
   */
  async getTherapyVideos(query) {
    try {
      const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
        params: {
          q: query,
          type: 'video',
          part: 'snippet',
          maxResults: 10,
          key: process.env.YOUTUBE_API_KEY,
        },
      });

      return response.data.items;
    } catch (error) {
      console.error('YouTube search error:', error);
      throw error;
    }
  }
}

// Routes
const integrationService = new IntegrationService();

/**
 * Upload file to Google Drive
 * POST /api/integrations/google-drive/upload
 */
router.post('/google-drive/upload', authenticate, async (req, res) => {
  try {
    const { file } = req.body;
    const result = await integrationService.uploadToGoogleDrive(file, req.user.id);

    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Create payment intent
 * POST /api/integrations/payment/create-intent
 */
router.post('/payment/create-intent', authenticate, async (req, res) => {
  try {
    const { amount, description } = req.body;

    const paymentIntent = await integrationService.processPayment(req.user.id, amount, description);

    res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Confirm payment
 * POST /api/integrations/payment/confirm
 */
router.post('/payment/confirm', authenticate, async (req, res) => {
  try {
    const { paymentIntentId, paymentMethodId } = req.body;

    const confirmed = await integrationService.confirmPayment(paymentIntentId, paymentMethodId);

    if (confirmed.status === 'succeeded') {
      res.json({
        success: true,
        message: 'تم الدفع بنجاح',
      });
    } else {
      res.status(400).json({
        error: 'فشل الدفع',
        status: confirmed.status,
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Create Zoom meeting
 * POST /api/integrations/zoom/create-meeting
 */
router.post('/zoom/create-meeting', authenticate, async (req, res) => {
  try {
    const { topic, duration } = req.body;

    const meeting = await integrationService.createZoomMeeting({
      topic,
      duration: duration || 60,
      startTime: new Date().toISOString(),
    });

    res.json({
      success: true,
      meeting: {
        id: meeting.id,
        joinUrl: meeting.join_url,
        startTime: meeting.start_time,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Send SMS
 * POST /api/integrations/sms/send
 */
router.post('/sms/send', authenticate, async (req, res) => {
  try {
    const { phoneNumber, message } = req.body;

    const result = await integrationService.sendSMS(phoneNumber, message);

    res.json({
      success: true,
      message: 'تم إرسال الرسالة',
      sid: result.sid,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Send WhatsApp
 * POST /api/integrations/whatsapp/send
 */
router.post('/whatsapp/send', authenticate, async (req, res) => {
  try {
    const { phoneNumber, message } = req.body;

    const result = await integrationService.sendWhatsApp(phoneNumber, message);

    res.json({
      success: true,
      message: 'تم إرسال الرسالة',
      sid: result.sid,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Send Email
 * POST /api/integrations/email/send
 */
router.post('/email/send', authenticate, async (req, res) => {
  try {
    const { email, subject, content } = req.body;

    await integrationService.sendEmail(email, subject, content);

    res.json({ success: true, message: 'تم إرسال البريد' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Add calendar event
 * POST /api/integrations/calendar/add-event
 */
router.post('/calendar/add-event', authenticate, async (req, res) => {
  try {
    const { title, description, startTime, endTime } = req.body;

    const event = await integrationService.addEventToCalendar(req.user.id, {
      title,
      description,
      startTime,
      endTime,
    });

    res.json({
      success: true,
      event,
      message: 'تم إضافة الحدث إلى التقويم',
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get therapy videos
 * GET /api/integrations/youtube/videos
 */
router.get('/youtube/videos', async (req, res) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({ error: 'يرجى إدخال بحث' });
    }

    const videos = await integrationService.getTherapyVideos(query);

    res.json({
      success: true,
      data: videos,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
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
