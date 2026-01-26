/**
 * Laboratory Integration Connector
 * نظام التكامل مع المختبرات
 *
 * الميزات:
 * - Order submission (HL7/FHIR & JSON)
 * - Result retrieval & validation
 * - Test tracking
 * - Checksum verification
 * - Signature verification
 * - Reconciliation & retry queues
 */

const axios = require('axios');
const crypto = require('crypto');
const EventEmitter = require('events');

class LabConnector extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      baseURL: config.baseURL || process.env.LAB_API_URL || 'https://api.labs.sa',
      apiKey: config.apiKey || process.env.LAB_API_KEY,
      clientCert: config.clientCert || process.env.LAB_CLIENT_CERT,
      clientKey: config.clientKey || process.env.LAB_CLIENT_KEY,
      format: config.format || 'json', // 'hl7', 'fhir', 'json'
      timeout: config.timeout || 30000,
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 1000,
      checksumAlgorithm: config.checksumAlgorithm || 'sha256',
      ...config,
    };

    this.pendingReconciliation = new Map(); // orderId -> { status, retries }
    this.setupAxios();
  }

  /**
   * Setup axios with certificate-based auth
   */
  setupAxios() {
    const axiosConfig = {
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': this.config.format === 'hl7' ? 'text/plain' : 'application/json',
        'X-API-Key': this.config.apiKey,
        'User-Agent': 'AlAwael-ERP/1.0',
      },
    };

    // Add client certificates if provided
    if (this.config.clientCert && this.config.clientKey) {
      axiosConfig.cert = this.config.clientCert;
      axiosConfig.key = this.config.clientKey;
    }

    this.client = axios.create(axiosConfig);

    // Response interceptor
    this.client.interceptors.response.use(
      response => response,
      error => {
        this.logError(error);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Submit lab order
   */
  async submitOrder(orderId, patientId, tests, priority = 'normal') {
    const payload = {
      orderId,
      patientId,
      tests: tests.map(t => ({
        code: t.code,
        name: t.name,
        specimen: t.specimen || 'serum',
        urgency: priority,
      })),
      priority,
      submittedAt: new Date().toISOString(),
    };

    // Format based on configured format
    let formattedPayload = payload;
    if (this.config.format === 'hl7') {
      formattedPayload = this.convertToHL7(payload);
    } else if (this.config.format === 'fhir') {
      formattedPayload = this.convertToFHIR(payload);
    }

    // Calculate checksum
    const checksum = this.calculateChecksum(formattedPayload);

    try {
      const response = await this.executeWithRetry(
        () =>
          this.client.post('/orders/submit', formattedPayload, {
            headers: { 'X-Checksum': checksum },
          }),
        'SUBMIT_ORDER'
      );

      // Track for reconciliation
      this.pendingReconciliation.set(orderId, {
        status: 'submitted',
        submittedAt: Date.now(),
        retries: 0,
      });

      return response;
    } catch (error) {
      // Add to poison queue for retry
      this.addToPoisonQueue(orderId, 'submit', payload);
      throw error;
    }
  }

  /**
   * Retrieve test results
   */
  async getResults(orderId) {
    try {
      const response = await this.executeWithRetry(
        () => this.client.get(`/orders/${orderId}/results`),
        'GET_RESULTS'
      );

      // Verify signature
      if (response.data.signature) {
        const isValid = this.verifySignature(response.data, response.data.signature);
        if (!isValid) {
          throw new Error('Invalid result signature');
        }
      }

      // Verify checksum
      if (response.data.checksum) {
        const isValid = this.verifyChecksum(response.data, response.data.checksum);
        if (!isValid) {
          throw new Error('Invalid result checksum');
        }
      }

      // Mark as reconciled
      this.pendingReconciliation.delete(orderId);
      this.emit('results-retrieved', { orderId, resultCount: response.data.tests?.length });

      return response;
    } catch (error) {
      // Add to poison queue for retry
      this.addToPoisonQueue(orderId, 'retrieve', {});
      throw error;
    }
  }

  /**
   * Track order status
   */
  async trackOrder(orderId) {
    return this.executeWithRetry(() => this.client.get(`/orders/${orderId}/status`), 'TRACK_ORDER');
  }

  /**
   * Cancel order
   */
  async cancelOrder(orderId, reason) {
    return this.executeWithRetry(
      () =>
        this.client.post(`/orders/${orderId}/cancel`, {
          reason,
          cancelledAt: new Date().toISOString(),
        }),
      'CANCEL_ORDER'
    );
  }

  /**
   * Reconcile pending orders
   */
  async reconcilePendingOrders() {
    const now = Date.now();
    const timeout = 24 * 60 * 60 * 1000; // 24 hours

    for (const [orderId, meta] of this.pendingReconciliation.entries()) {
      // Check timeout
      if (now - meta.submittedAt > timeout) {
        this.emit('reconciliation-timeout', { orderId });
        this.pendingReconciliation.delete(orderId);
        continue;
      }

      // Retry get results
      try {
        await this.getResults(orderId);
      } catch (error) {
        meta.retries++;
        if (meta.retries > this.config.maxRetries) {
          this.emit('reconciliation-failed', { orderId, error: error.message });
          this.pendingReconciliation.delete(orderId);
        }
      }
    }

    return { pendingOrders: this.pendingReconciliation.size };
  }

  /**
   * Convert to HL7 format
   */
  convertToHL7(payload) {
    // Simplified HL7 v2.5 ORM message
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];
    const lines = [
      `MSH|^~\\&|ERP|AlAwael|LAB|${this.config.labId || 'DEFAULT'}|${timestamp}||ORM^O01|${payload.orderId}|P|2.5`,
      `PID|||${payload.patientId}`,
      `ORC|NW|${payload.orderId}|${payload.orderId}|1`,
    ];

    // Add OBR for each test
    payload.tests.forEach((test, idx) => {
      lines.push(`OBR|${idx + 1}|${payload.orderId}|${payload.orderId}|${test.code}`);
    });

    return lines.join('\r');
  }

  /**
   * Convert to FHIR format
   */
  convertToFHIR(payload) {
    return {
      resourceType: 'ServiceRequest',
      id: payload.orderId,
      identifier: [{ value: payload.orderId }],
      status: 'active',
      intent: 'order',
      subject: {
        reference: `Patient/${payload.patientId}`,
      },
      code: {
        coding: payload.tests.map(t => ({
          system: 'http://loinc.org',
          code: t.code,
          display: t.name,
        })),
      },
      authoredOn: new Date().toISOString(),
      priority: payload.priority === 'urgent' ? 'urgent' : 'routine',
    };
  }

  /**
   * Calculate checksum for data integrity
   */
  calculateChecksum(data) {
    const str = typeof data === 'string' ? data : JSON.stringify(data);
    return crypto.createHash(this.config.checksumAlgorithm).update(str).digest('hex');
  }

  /**
   * Verify checksum
   */
  verifyChecksum(data, providedChecksum) {
    const calculated = this.calculateChecksum(data);
    return calculated === providedChecksum;
  }

  /**
   * Verify digital signature
   */
  verifySignature(data, signature) {
    // Simplified: should use asymmetric crypto in production
    const expected = crypto
      .createHmac('sha256', this.config.apiKey)
      .update(JSON.stringify(data))
      .digest('hex');

    return signature === expected;
  }

  /**
   * Execute with retry
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
   * Check if error is retryable
   */
  isRetryable(error) {
    return (
      !error.response ||
      (error.response.status >= 500 && error.response.status < 600) ||
      error.code === 'ECONNREFUSED'
    );
  }

  /**
   * Add to poison queue for later retry
   */
  addToPoisonQueue(orderId, operation, payload) {
    const queueEntry = {
      orderId,
      operation,
      payload,
      timestamp: new Date().toISOString(),
      retryCount: 0,
      nextRetry: Date.now() + this.config.retryDelay,
    };

    this.emit('poison-queue', queueEntry);
    console.warn(`[LAB-CONNECTOR] Added to poison queue:`, queueEntry);
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

module.exports = LabConnector;
