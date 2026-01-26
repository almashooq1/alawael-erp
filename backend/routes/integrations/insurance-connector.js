/**
 * Insurance Integration Connector
 * نظام التكامل مع شركات التأمين
 *
 * الميزات:
 * - Eligibility verification
 * - Claims submission & tracking
 * - Provider network verification
 * - Webhook support for claim updates
 * - Idempotency keys for safety
 */

const axios = require('axios');
const crypto = require('crypto');
const EventEmitter = require('events');

class InsuranceConnector extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      baseURL: config.baseURL || process.env.INSURANCE_API_URL || 'https://api.insurance.sa',
      apiKey: config.apiKey || process.env.INSURANCE_API_KEY,
      clientId: config.clientId || process.env.INSURANCE_CLIENT_ID,
      clientSecret: config.clientSecret || process.env.INSURANCE_CLIENT_SECRET,
      timeout: config.timeout || 30000,
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 1000,
      webhookUrl: config.webhookUrl || process.env.INSURANCE_WEBHOOK_URL,
      ...config,
    };

    this.setupAxios();
  }

  /**
   * Setup axios with authentication
   */
  setupAxios() {
    this.client = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.config.apiKey,
        'User-Agent': 'AlAwael-ERP/1.0',
      },
    });

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      response => response,
      error => {
        this.logError(error);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Verify patient eligibility with insurance
   */
  async verifyEligibility(policyNumber, patientId, serviceType) {
    const idempotencyKey = this.generateIdempotencyKey({
      policyNumber,
      patientId,
      serviceType,
    });

    const payload = {
      policyNumber,
      patientId,
      serviceType, // 'rehabilitation', 'therapy', 'assessment', etc.
      verificationDate: new Date().toISOString(),
    };

    return this.executeWithRetry(
      () =>
        this.client.post('/eligibility/verify', payload, {
          headers: { 'Idempotency-Key': idempotencyKey },
        }),
      'VERIFY_ELIGIBILITY'
    );
  }

  /**
   * Submit insurance claim
   */
  async submitClaim(patientId, policyNumber, serviceDetails) {
    const idempotencyKey = this.generateIdempotencyKey({
      patientId,
      policyNumber,
      serviceDetails,
    });

    const payload = {
      patientId,
      policyNumber,
      claimType: serviceDetails.type || 'service',
      service: {
        code: serviceDetails.code,
        description: serviceDetails.description,
        date: serviceDetails.date,
        provider: serviceDetails.provider,
      },
      amount: {
        gross: serviceDetails.grossAmount,
        copay: serviceDetails.copayAmount,
        net:
          serviceDetails.netAmount ||
          serviceDetails.grossAmount - (serviceDetails.copayAmount || 0),
      },
      attachments: serviceDetails.documents || [],
      submittedAt: new Date().toISOString(),
    };

    return this.executeWithRetry(
      () =>
        this.client.post('/claims/submit', payload, {
          headers: { 'Idempotency-Key': idempotencyKey },
        }),
      'SUBMIT_CLAIM'
    );
  }

  /**
   * Track claim status
   */
  async trackClaim(claimId) {
    return this.executeWithRetry(() => this.client.get(`/claims/${claimId}/status`), 'TRACK_CLAIM');
  }

  /**
   * Verify provider is in network
   */
  async verifyProvider(providerId, insurerId) {
    return this.executeWithRetry(
      () => this.client.get(`/providers/${providerId}/network/${insurerId}`),
      'VERIFY_PROVIDER'
    );
  }

  /**
   * Register webhook for claim status updates
   */
  async registerWebhook(events = ['claim.approved', 'claim.rejected', 'claim.pending']) {
    if (!this.config.webhookUrl) {
      throw new Error('Webhook URL not configured');
    }

    const payload = {
      url: this.config.webhookUrl,
      events,
      active: true,
      retryPolicy: {
        maxRetries: 3,
        retryInterval: 300, // 5 minutes
      },
    };

    return this.executeWithRetry(
      () => this.client.post('/webhooks/register', payload),
      'REGISTER_WEBHOOK'
    );
  }

  /**
   * Handle webhook from insurance provider
   */
  async handleWebhookEvent(payload, signature) {
    // Verify signature
    if (!this.verifyWebhookSignature(payload, signature)) {
      throw new Error('Invalid webhook signature');
    }

    const event = payload.event;
    const data = payload.data;

    this.emit('webhook-received', { event, data });

    // Route to appropriate handler
    switch (event) {
      case 'claim.approved':
        return this.handleClaimApproved(data);
      case 'claim.rejected':
        return this.handleClaimRejected(data);
      case 'claim.pending':
        return this.handleClaimPending(data);
      default:
        console.warn(`Unknown webhook event: ${event}`);
    }
  }

  /**
   * Handle approved claim
   */
  async handleClaimApproved(data) {
    this.emit('claim-approved', {
      claimId: data.claimId,
      approvalAmount: data.approvedAmount,
      approvalDate: data.approvalDate,
      referenceNumber: data.referenceNumber,
    });
  }

  /**
   * Handle rejected claim
   */
  async handleClaimRejected(data) {
    this.emit('claim-rejected', {
      claimId: data.claimId,
      reason: data.rejectionReason,
      rejectionDate: data.rejectionDate,
      appealDeadline: data.appealDeadline,
    });
  }

  /**
   * Handle pending claim
   */
  async handleClaimPending(data) {
    this.emit('claim-pending', {
      claimId: data.claimId,
      reason: data.pendingReason,
      estimatedResolutionDate: data.estimatedResolutionDate,
    });
  }

  /**
   * Execute with retry logic
   */
  async executeWithRetry(fn, operationName, retries = 0) {
    try {
      const response = await fn();
      return {
        success: true,
        data: response.data,
        status: response.status,
      };
    } catch (error) {
      if (retries < this.config.maxRetries && this.isRetryable(error)) {
        const delay = this.config.retryDelay * Math.pow(2, retries) + Math.random() * 1000;
        this.emit('retry', { operation: operationName, attempt: retries + 1, delay });
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.executeWithRetry(fn, operationName, retries + 1);
      }

      this.emit('operation-failed', { operation: operationName, error: error.message });
      return {
        success: false,
        error: error.message,
        status: error.response?.status,
      };
    }
  }

  /**
   * Determine if error is retryable
   */
  isRetryable(error) {
    // Retry on network errors or 5xx
    return !error.response || (error.response.status >= 500 && error.response.status < 600);
  }

  /**
   * Generate idempotency key
   */
  generateIdempotencyKey(payload) {
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(payload) + Date.now())
      .digest('hex');
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload, signature) {
    const expectedSignature = crypto
      .createHmac('sha256', this.config.clientSecret)
      .update(JSON.stringify(payload))
      .digest('hex');

    return signature === expectedSignature;
  }

  /**
   * Log errors (masked PII)
   */
  logError(error) {
    const log = {
      timestamp: new Date().toISOString(),
      status: error.response?.status,
      message: error.message,
      endpoint: error.config?.url,
    };
    this.emit('error-logged', log);
    console.error('[INSURANCE-CONNECTOR]', JSON.stringify(log));
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const response = await this.client.get('/health', { timeout: 5000 });
      return { healthy: true, status: response.status };
    } catch (error) {
      return { healthy: false, error: error.message };
    }
  }
}

module.exports = InsuranceConnector;
