/**
 * Government Integration Connector
 * نظام التكامل مع الجهات الحكومية
 *
 * الميزات:
 * - OAuth2 / JWT Authentication
 * - Retry logic with exponential backoff
 * - Circuit breaker pattern
 * - Request/Response audit logging
 * - Error handling & fallback
 */

const axios = require('axios');
const crypto = require('crypto');
const EventEmitter = require('events');

class GovernmentConnector extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      baseURL: config.baseURL || process.env.GOV_API_URL || 'https://api.gov.sa',
      clientId: config.clientId || process.env.GOV_CLIENT_ID,
      clientSecret: config.clientSecret || process.env.GOV_CLIENT_SECRET,
      timeout: config.timeout || 30000,
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 1000,
      circuitBreakerThreshold: config.circuitBreakerThreshold || 5,
      circuitBreakerTimeout: config.circuitBreakerTimeout || 60000,
      ...config,
    };

    this.accessToken = null;
    this.tokenExpiry = null;
    this.circuitBreakerState = 'closed'; // closed, open, half-open
    this.failureCount = 0;
    this.lastFailureTime = null;

    this.validateConfig();
    this.setupAxios();
  }

  /**
   * Validate required configuration
   */
  validateConfig() {
    const required = ['clientId', 'clientSecret'];
    for (const key of required) {
      if (!this.config[key]) {
        throw new Error(`Missing required config: ${key}`);
      }
    }
  }

  /**
   * Setup axios instance with interceptors
   */
  setupAxios() {
    this.client = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'AlAwael-ERP/1.0',
      },
    });

    // Request interceptor: add auth token
    this.client.interceptors.request.use(
      async config => {
        if (!this.accessToken || this.isTokenExpired()) {
          await this.refreshAccessToken();
        }
        config.headers.Authorization = `Bearer ${this.accessToken}`;
        return config;
      },
      error => Promise.reject(error)
    );

    // Response interceptor: audit logging
    this.client.interceptors.response.use(
      response => {
        this.logRequest(response.config, response.status, 'success');
        this.resetCircuitBreaker();
        return response;
      },
      error => {
        this.logRequest(error.config, error.response?.status, 'error', error.message);
        this.handleCircuitBreaker(error);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Get or refresh access token (OAuth2)
   */
  async refreshAccessToken() {
    try {
      const response = await axios.post(`${this.config.baseURL}/oauth/token`, {
        grant_type: 'client_credentials',
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
      });

      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + response.data.expires_in * 1000;
      this.emit('token-refreshed', { expiresIn: response.data.expires_in });
      return this.accessToken;
    } catch (error) {
      this.emit('token-error', { error: error.message });
      throw new Error(`Failed to refresh government API token: ${error.message}`);
    }
  }

  /**
   * Check if token is expired
   */
  isTokenExpired() {
    return !this.tokenExpiry || Date.now() > this.tokenExpiry - 60000; // 1 min buffer
  }

  /**
   * Verify citizen identity
   */
  async verifyCitizen(nationalId, fullName, dateOfBirth) {
    const payload = {
      nationalId,
      fullName,
      dob: dateOfBirth,
      timestamp: new Date().toISOString(),
    };

    return this.executeWithRetry(
      () => this.client.post('/citizen/verify', payload),
      'VERIFY_CITIZEN'
    );
  }

  /**
   * Request government consent/approval
   */
  async requestConsent(citizenId, consentType, scope) {
    const payload = {
      citizenId,
      consentType, // 'health-data', 'financial', etc.
      scope,
      requestedAt: new Date().toISOString(),
    };

    return this.executeWithRetry(
      () => this.client.post('/consent/request', payload),
      'REQUEST_CONSENT'
    );
  }

  /**
   * Retrieve citizen health records
   */
  async getCitizenHealthRecords(nationalId, consentToken) {
    return this.executeWithRetry(
      () =>
        this.client.get(`/health/records/${nationalId}`, {
          headers: { 'X-Consent-Token': consentToken },
        }),
      'GET_HEALTH_RECORDS'
    );
  }

  /**
   * Report incident to government
   */
  async reportIncident(incidentType, description, severity) {
    const payload = {
      type: incidentType,
      description,
      severity, // 'low', 'medium', 'high', 'critical'
      reportedAt: new Date().toISOString(),
      signature: this.generateSignature({ incidentType, description, severity }),
    };

    return this.executeWithRetry(
      () => this.client.post('/incidents/report', payload),
      'REPORT_INCIDENT'
    );
  }

  /**
   * Execute request with retry logic
   */
  async executeWithRetry(fn, operationName, retries = 0) {
    if (this.circuitBreakerState === 'open') {
      if (Date.now() - this.lastFailureTime > this.config.circuitBreakerTimeout) {
        this.circuitBreakerState = 'half-open';
      } else {
        throw new Error(`Circuit breaker is open for operation: ${operationName}`);
      }
    }

    try {
      const response = await fn();
      return {
        success: true,
        data: response.data,
        status: response.status,
      };
    } catch (error) {
      if (retries < this.config.maxRetries) {
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
   * Circuit breaker state management
   */
  handleCircuitBreaker(error) {
    if (error.response && error.response.status >= 500) {
      this.failureCount++;
      this.lastFailureTime = Date.now();

      if (this.failureCount >= this.config.circuitBreakerThreshold) {
        this.circuitBreakerState = 'open';
        this.emit('circuit-breaker-opened', { threshold: this.config.circuitBreakerThreshold });
      }
    }
  }

  /**
   * Reset circuit breaker on success
   */
  resetCircuitBreaker() {
    if (this.circuitBreakerState === 'half-open') {
      this.circuitBreakerState = 'closed';
      this.failureCount = 0;
      this.emit('circuit-breaker-closed');
    }
  }

  /**
   * Generate HMAC signature for requests
   */
  generateSignature(payload) {
    const message = JSON.stringify(payload);
    return crypto.createHmac('sha256', this.config.clientSecret).update(message).digest('hex');
  }

  /**
   * Audit log for compliance
   */
  logRequest(config, status, result, error = null) {
    const log = {
      timestamp: new Date().toISOString(),
      method: config?.method?.toUpperCase(),
      path: config?.url,
      status,
      result,
      error,
      // Mask sensitive data
      headers: this.maskSensitiveHeaders(config?.headers),
    };

    // Send to audit service (TODO: implement audit queue)
    this.emit('audit-log', log);
    console.log('[GOV-CONNECTOR]', JSON.stringify(log));
  }

  /**
   * Mask sensitive data in headers
   */
  maskSensitiveHeaders(headers = {}) {
    const masked = { ...headers };
    if (masked.Authorization) {
      masked.Authorization = 'Bearer ' + masked.Authorization.substring(7, 20) + '...';
    }
    return masked;
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

module.exports = GovernmentConnector;
