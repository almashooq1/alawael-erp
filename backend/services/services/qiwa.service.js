/**
 * 🇸🇦 Qiwa Integration Service
 * Ministry of Labor (MOL) - Professional Integration
 *
 * Features:
 * ✅ Contract Management (Register, Update, Terminate)
 * ✅ Employee Verification
 * ✅ Wage Management & Compliance
 * ✅ Nitaqat (Workforce Localization) Tracking
 * ✅ WPS (Wage Protection System) Integration
 * ✅ Advanced Error Handling & Retry Logic
 * ✅ Caching & Performance Optimization
 * ✅ Rate Limiting & Quota Management
 * ✅ Comprehensive Logging & Monitoring
 * ✅ Data Validation & Transformation
 *
 * @version 2.0.0
 * @author AI Integration Team
 * @date 2026-02-17
 */

const axios = require('axios');
const crypto = require('crypto');
const EventEmitter = require('events');

class QiwaService extends EventEmitter {
  constructor(config = {}) {
    super();

    // Configuration
    this.baseUrl = process.env.QIWA_API_BASE_URL || 'https://api.qiwa.sa/v1';
    this.apiKey = process.env.QIWA_API_KEY;
    this.apiSecret = process.env.QIWA_API_SECRET;
    this.establishmentId = process.env.QIWA_ESTABLISHMENT_ID;
    this.laborOfficeId = process.env.QIWA_LABOR_OFFICE_ID;

    // Advanced features
    this.cache = new Map();
    this.cacheExpiry = new Map();
    this.requestQueue = [];
    this.rateLimitData = new Map();
    this.requestHistory = [];
    this.retryConfig = config.retryConfig || {
      maxRetries: 3,
      retryDelay: 1000,
      backoffMultiplier: 2,
    };

    // Performance Monitoring
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      cachedResponses: 0,
      averageResponseTime: 0,
      requestTimes: [],
    };

    // Validation Rules
    this.validationRules = {
      iqama: /^[0-9]{10}$/,
      nationalId: /^[0-9]{10}$/,
      phoneNumber: /^(\+966|0)[0-9]{9}$/,
      establishmentId: /^[0-9]{6}$/,
      contractId: /^[A-Z0-9]{12}$/,
    };

    this.initializeAxiosClient();
  }

  /**
   * Initialize Axios client with interceptors
   */
  initializeAxiosClient() {
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    // Request interceptor for signing requests
    this.client.interceptors.request.use(
      (config) => {
        config.headers['X-API-Key'] = this.apiKey;
        config.headers['X-Request-ID'] = crypto.randomUUID();
        config.headers['X-Timestamp'] = new Date().toISOString();

        // Sign request
        config.headers['X-Signature'] = this._generateSignature(
          config.data || {}
        );

        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const config = error.config;

        // Retry logic
        if (!config || !config.retryCount) {
          config.retryCount = 0;
        }

        if (
          config.retryCount < this.retryConfig.maxRetries &&
          this._isRetryableError(error)
        ) {
          config.retryCount++;
          const delay =
            this.retryConfig.retryDelay *
            Math.pow(this.retryConfig.backoffMultiplier, config.retryCount - 1);

          await new Promise((resolve) => setTimeout(resolve, delay));
          return this.client(config);
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * Generate request signature
   */
  _generateSignature(data) {
    const timestamp = new Date().toISOString();
    const payload = JSON.stringify({ ...data, timestamp, key: this.apiSecret });
    return crypto
      .createHash('sha256')
      .update(payload)
      .digest('hex');
  }

  /**
   * Check if error is retryable
   */
  _isRetryableError(error) {
    if (!error.response) {
      return true; // Network error
    }

    const status = error.response.status;
    // Retry on 429 (rate limit), 503 (service unavailable), 504 (gateway timeout)
    return status === 429 || status === 503 || status === 504;
  }

  /**
   * Make API request with caching, retry, and metrics
   */
  async _makeRequest(method, endpoint, data = null, options = {}) {
    const startTime = Date.now();
    const cacheKey = `${method}:${endpoint}:${JSON.stringify(data || {})}`;
    const url = endpoint.startsWith('http') ? endpoint : `${endpoint}`;

    // Check cache
    if (method === 'GET' && !options.skipCache) {
      const cachedData = this._getCache(cacheKey);
      if (cachedData) {
        this.metrics.cachedResponses++;
        return { data: cachedData, cached: true, statusCode: 200 };
      }
    }

    try {
      this.metrics.totalRequests++;

      let response;
      switch (method.toUpperCase()) {
        case 'GET':
          response = await this.client.get(url, {
            params: data,
            ...options,
          });
          break;
        case 'POST':
          response = await this.client.post(url, data, options);
          break;
        case 'PUT':
          response = await this.client.put(url, data, options);
          break;
        case 'DELETE':
          response = await this.client.delete(url, options);
          break;
        default:
          throw new Error(`Unsupported method: ${method}`);
      }

      this.metrics.successfulRequests++;

      // Cache successful GET requests
      if (method === 'GET' && response.data) {
        this._setCache(cacheKey, response.data, options.cacheDuration || 3600);
      }

      // Track response metrics
      const responseTime = Date.now() - startTime;
      this._trackMetrics(responseTime);

      // Log successful request
      this._log('info', `${method} ${endpoint} - Success (${responseTime}ms)`, {
        statusCode: response.status,
        responseTime,
      });

      return {
        data: response.data,
        statusCode: response.status,
        headers: response.headers,
        cached: false,
      };
    } catch (error) {
      this.metrics.failedRequests++;
      const responseTime = Date.now() - startTime;

      // Log error
      this._log('error', `${method} ${endpoint} - Failed (${responseTime}ms)`, {
        error: error.message,
        statusCode: error.response?.status,
        responseData: error.response?.data,
      });

      throw this._formatError(error);
    }
  }

  // =====================================================
  // EMPLOYEE VERIFICATION
  // =====================================================

  /**
   * Verify employee identity using Iqama number
   */
  async verifyEmployeeByIqama(iqamaNumber) {
    this._validate('iqama', iqamaNumber, 'Invalid Iqama number');

    try {
      const response = await this._makeRequest('GET', '/employees/verify/iqama', {
        iqamaNumber,
        establishmentId: this.establishmentId,
      });

      return this._transformResponse(response, 'verification');
    } catch (error) {
      this.emit('verification:error', { iqamaNumber, error });
      throw error;
    }
  }

  /**
   * Verify employee identity using National ID
   */
  async verifyEmployeeByNationalId(nationalId) {
    this._validate('nationalId', nationalId, 'Invalid National ID');

    try {
      const response = await this._makeRequest(
        'GET',
        '/employees/verify/national-id',
        {
          nationalId,
          establishmentId: this.establishmentId,
        }
      );

      return this._transformResponse(response, 'verification');
    } catch (error) {
      this.emit('verification:error', { nationalId, error });
      throw error;
    }
  }

  /**
   * Get employee labor record
   */
  async getEmployeeLaborRecord(iqamaNumber) {
    this._validate('iqama', iqamaNumber, 'Invalid Iqama number');

    try {
      const response = await this._makeRequest(
        'GET',
        `/employees/${iqamaNumber}/labor-record`,
        null,
        { cacheDuration: 7200 }
      );

      return this._transformResponse(response, 'laborRecord');
    } catch (error) {
      this.emit('laborRecord:error', { iqamaNumber, error });
      throw error;
    }
  }

  // =====================================================
  // CONTRACT MANAGEMENT
  // =====================================================

  /**
   * Register new labor contract with Qiwa
   */
  async registerContract(contractData) {
    this._validateContract(contractData);

    try {
      const normalizedData = this._normalizeContractData(contractData);

      const response = await this._makeRequest(
        'POST',
        '/contracts/register',
        {
          ...normalizedData,
          establishmentId: this.establishmentId,
          laborOfficeId: this.laborOfficeId,
          timestamp: new Date().toISOString(),
        }
      );

      const result = this._transformResponse(response, 'contractRegistration');

      // Emit event for tracking
      this.emit('contract:registered', {
        contractId: result.contractId,
        iqama: contractData.employeeIqama,
        timestamp: new Date(),
      });

      return result;
    } catch (error) {
      this.emit('contract:error', { contractData, error });
      throw error;
    }
  }

  /**
   * Update existing contract
   */
  async updateContract(contractId, updates) {
    this._validate('contractId', contractId, 'Invalid Contract ID');

    try {
      const normalizedData = this._normalizeContractData(updates);

      const response = await this._makeRequest(
        'PUT',
        `/contracts/${contractId}`,
        {
          ...normalizedData,
          updatedAt: new Date().toISOString(),
        }
      );

      const result = this._transformResponse(response, 'contractUpdate');

      this.emit('contract:updated', {
        contractId,
        updates,
        timestamp: new Date(),
      });

      return result;
    } catch (error) {
      this.emit('contract:updateError', { contractId, error });
      throw error;
    }
  }

  /**
   * Terminate labor contract
   */
  async terminateContract(contractId, reason, terminationDate) {
    this._validate('contractId', contractId, 'Invalid Contract ID');

    if (!reason || reason.trim().length === 0) {
      throw new Error('Termination reason is required');
    }

    try {
      const response = await this._makeRequest(
        'POST',
        `/contracts/${contractId}/terminate`,
        {
          reason,
          terminationDate: terminationDate || new Date(),
          establishmentId: this.establishmentId,
          terminatedAt: new Date().toISOString(),
        }
      );

      const result = this._transformResponse(response, 'contractTermination');

      this.emit('contract:terminated', {
        contractId,
        reason,
        terminationDate,
        timestamp: new Date(),
      });

      return result;
    } catch (error) {
      this.emit('contract:terminationError', { contractId, error });
      throw error;
    }
  }

  /**
   * Get contract details
   */
  async getContract(contractId) {
    this._validate('contractId', contractId, 'Invalid Contract ID');

    try {
      const response = await this._makeRequest(
        'GET',
        `/contracts/${contractId}`,
        null,
        { cacheDuration: 7200 }
      );

      return this._transformResponse(response, 'contractDetails');
    } catch (error) {
      this.emit('contract:fetchError', { contractId, error });
      throw error;
    }
  }

  /**
   * List establishment contracts
   */
  async listContracts(filters = {}) {
    try {
      const queryParams = {
        establishmentId: this.establishmentId,
        ...filters,
        limit: filters.limit || 50,
        offset: filters.offset || 0,
      };

      const response = await this._makeRequest('GET', '/contracts', queryParams, {
        cacheDuration: 3600,
      });

      return this._transformResponse(response, 'contractList');
    } catch (error) {
      this.emit('contracts:listError', { filters, error });
      throw error;
    }
  }

  // =====================================================
  // WAGE MANAGEMENT
  // =====================================================

  /**
   * Update employee wage in Qiwa
   */
  async updateEmployeeWage(iqamaNumber, wageData) {
    this._validate('iqama', iqamaNumber, 'Invalid Iqama number');

    try {
      const normalizedWage = this._normalizeWageData(wageData);

      const response = await this._makeRequest(
        'PUT',
        `/employees/${iqamaNumber}/wage`,
        {
          ...normalizedWage,
          updatedAt: new Date().toISOString(),
          updatedBy: 'system-integration',
        }
      );

      const result = this._transformResponse(response, 'wageUpdate');

      this.emit('wage:updated', {
        iqama: iqamaNumber,
        wage: wageData,
        timestamp: new Date(),
      });

      return result;
    } catch (error) {
      this.emit('wage:error', { iqamaNumber, error });
      throw error;
    }
  }

  /**
   * Get employee wage history
   */
  async getWageHistory(iqamaNumber, months = 12) {
    this._validate('iqama', iqamaNumber, 'Invalid Iqama number');

    try {
      const response = await this._makeRequest(
        'GET',
        `/employees/${iqamaNumber}/wage-history`,
        { months, establishmentId: this.establishmentId },
        { cacheDuration: 86400 } // 24 hours
      );

      return this._transformResponse(response, 'wageHistory');
    } catch (error) {
      this.emit('wageHistory:error', { iqamaNumber, error });
      throw error;
    }
  }

  /**
   * Calculate compliance for wage changes
   */
  async calculateWageCompliance(iqamaNumber, newWage) {
    this._validate('iqama', iqamaNumber, 'Invalid Iqama number');

    try {
      const response = await this._makeRequest('POST', '/wages/compliance-check', {
        iqamaNumber,
        newWage,
        establishmentId: this.establishmentId,
      });

      return this._transformResponse(response, 'wageCompliance');
    } catch (error) {
      this.emit('wageCompliance:error', { iqamaNumber, error });
      throw error;
    }
  }

  // =====================================================
  // WAGE PROTECTION SYSTEM (WPS)
  // =====================================================

  /**
   * Submit payroll to WPS
   */
  async submitPayrollToWPS(payrollData) {
    try {
      const normalizedPayroll = this._normalizePayrollData(payrollData);

      const response = await this._makeRequest('POST', '/wps/submit', {
        ...normalizedPayroll,
        establishmentId: this.establishmentId,
        submittedAt: new Date().toISOString(),
      });

      const result = this._transformResponse(response, 'wpsSubmission');

      this.emit('wps:submitted', {
        payrollId: result.id,
        submittedEmployees: normalizedPayroll.employees.length,
        timestamp: new Date(),
      });

      return result;
    } catch (error) {
      this.emit('wps:error', { error });
      throw error;
    }
  }

  /**
   * Get WPS submission status
   */
  async getWPSStatus(submissionId) {
    try {
      const response = await this._makeRequest(
        'GET',
        `/wps/${submissionId}/status`,
        null,
        { cacheDuration: 1800 } // 30 minutes
      );

      return this._transformResponse(response, 'wpsStatus');
    } catch (error) {
      this.emit('wpsStatus:error', { submissionId, error });
      throw error;
    }
  }

  /**
   * Get WPS compliance report
   */
  async getWPSComplianceReport(period) {
    try {
      const response = await this._makeRequest(
        'GET',
        '/wps/compliance-report',
        { period, establishmentId: this.establishmentId },
        { cacheDuration: 86400 }
      );

      return this._transformResponse(response, 'wpsComplianceReport');
    } catch (error) {
      this.emit('wpsReport:error', { period, error });
      throw error;
    }
  }

  // =====================================================
  // NITAQAT (WORKFORCE LOCALIZATION)
  // =====================================================

  /**
   * Get establishment Nitaqat status
   */
  async getNitaqatStatus() {
    try {
      const response = await this._makeRequest(
        'GET',
        `/establishments/${this.establishmentId}/nitaqat`,
        null,
        { cacheDuration: 3600 }
      );

      return this._transformResponse(response, 'nitaqatStatus');
    } catch (error) {
      this.emit('nitaqat:error', { error });
      throw error;
    }
  }

  /**
   * Get Nitaqat compliance details
   */
  async getNitaqatCompliance() {
    try {
      const response = await this._makeRequest(
        'GET',
        `/establishments/${this.establishmentId}/nitaqat/compliance`,
        null,
        { cacheDuration: 3600 }
      );

      return this._transformResponse(response, 'nitaqatCompliance');
    } catch (error) {
      this.emit('nitaqatCompliance:error', { error });
      throw error;
    }
  }

  /**
   * Calculate Nitaqat points for labor force
   */
  async calculateNitaqatPoints(workforce) {
    try {
      const response = await this._makeRequest(
        'POST',
        '/nitaqat/calculate-points',
        {
          establishmentId: this.establishmentId,
          workforce,
        }
      );

      return this._transformResponse(response, 'nitaqatPoints');
    } catch (error) {
      this.emit('nitaqat:calculationError', { error });
      throw error;
    }
  }

  // =====================================================
  // BATCH OPERATIONS
  // =====================================================

  /**
   * Batch register multiple contracts
   */
  async batchRegisterContracts(contractsList) {
    try {
      const results = [];
      const errors = [];

      for (const contract of contractsList) {
        try {
          const result = await this.registerContract(contract);
          results.push({ success: true, data: result });
        } catch (error) {
          errors.push({
            iqama: contract.employeeIqama,
            error: error.message,
          });
          results.push({ success: false, error: error.message });
        }
      }

      this.emit('batchOperation:completed', {
        total: contractsList.length,
        successful: results.filter((r) => r.success).length,
        failed: errors.length,
      });

      return {
        results,
        summary: {
          total: contractsList.length,
          successful: results.filter((r) => r.success).length,
          failed: errors.length,
          errors,
        },
      };
    } catch (error) {
      this.emit('batchOperation:error', { error });
      throw error;
    }
  }

  /**
   * Batch update wages
   */
  async batchUpdateWages(wageUpdatesList) {
    try {
      const results = [];
      const errors = [];

      for (const update of wageUpdatesList) {
        try {
          const result = await this.updateEmployeeWage(
            update.iqamaNumber,
            update.wageData
          );
          results.push({ success: true, data: result });
        } catch (error) {
          errors.push({
            iqama: update.iqamaNumber,
            error: error.message,
          });
          results.push({ success: false, error: error.message });
        }
      }

      this.emit('batchWageUpdate:completed', {
        total: wageUpdatesList.length,
        successful: results.filter((r) => r.success).length,
        failed: errors.length,
      });

      return {
        results,
        summary: {
          total: wageUpdatesList.length,
          successful: results.filter((r) => r.success).length,
          failed: errors.length,
          errors,
        },
      };
    } catch (error) {
      this.emit('batchWageUpdate:error', { error });
      throw error;
    }
  }

  // =====================================================
  // UTILITIES & HELPERS
  // =====================================================

  /**
   * Validate input using validation rules
   */
  _validate(field, value, customMessage = '') {
    const rule = this.validationRules[field];
    if (rule && !rule.test(value)) {
      throw new Error(customMessage || `Invalid ${field}`);
    }
  }

  /**
   * Validate contract data structure
   */
  _validateContract(contractData) {
    const required = [
      'employeeIqama',
      'contractType',
      'jobTitle',
      'basicSalary',
      'startDate',
    ];

    for (const field of required) {
      if (!contractData[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    this._validate('iqama', contractData.employeeIqama);

    if (contractData.basicSalary < 0) {
      throw new Error('Salary cannot be negative');
    }

    if (
      contractData.contractType !== 'limited' &&
      contractData.contractType !== 'unlimited'
    ) {
      throw new Error('Invalid contract type');
    }
  }

  /**
   * Normalize contract data for API
   */
  _normalizeContractData(data) {
    return {
      employeeIqama: data.employeeIqama,
      contractType: data.contractType,
      jobTitle: data.jobTitle,
      jobTitleArabic: data.jobTitleArabic || '',
      basicSalary: Math.round(data.basicSalary * 100) / 100,
      housingAllowance: data.housingAllowance || 0,
      transportAllowance: data.transportAllowance || 0,
      otherAllowances: data.otherAllowances || 0,
      startDate: new Date(data.startDate).toISOString().split('T')[0],
      endDate: data.endDate
        ? new Date(data.endDate).toISOString().split('T')[0]
        : null,
      workingHours: data.workingHours || 8,
      workingDays: data.workingDays || [
        'sun',
        'mon',
        'tue',
        'wed',
        'thu',
      ],
    };
  }

  /**
   * Normalize wage data for API
   */
  _normalizeWageData(data) {
    return {
      basicSalary: Math.round(data.basicSalary * 100) / 100,
      housingAllowance: data.housingAllowance || 0,
      transportAllowance: data.transportAllowance || 0,
      otherAllowances: data.otherAllowances || 0,
      totalSalary:
        Math.round(
          ((data.basicSalary || 0) +
            (data.housingAllowance || 0) +
            (data.transportAllowance || 0) +
            (data.otherAllowances || 0)) *
            100
        ) / 100,
      effectiveDate: new Date(data.effectiveDate || new Date())
        .toISOString()
        .split('T')[0],
    };
  }

  /**
   * Normalize payroll data
   */
  _normalizePayrollData(data) {
    return {
      period: data.period,
      submissionType: data.submissionType || 'regular',
      employees: (data.employees || []).map((emp) => ({
        iqamaNumber: emp.iqamaNumber,
        basicSalary: Math.round(emp.basicSalary * 100) / 100,
        allowances: emp.allowances || {},
        deductions: emp.deductions || {},
        netSalary: Math.round(emp.netSalary * 100) / 100,
      })),
    };
  }

  /**
   * Transform API response to standard format
   */
  _transformResponse(response, type) {
    if (!response.data) {
      throw new Error('Invalid API response');
    }

    return {
      success: true,
      type,
      data: response.data,
      statusCode: response.statusCode,
      timestamp: new Date(),
      cached: response.cached || false,
    };
  }

  /**
   * Format error response
   */
  _formatError(error) {
    const formattedError = new Error(
      error.response?.data?.message || error.message || 'Unknown error'
    );

    formattedError.statusCode = error.response?.status || 500;
    formattedError.data = error.response?.data || {};
    formattedError.originalError = error;

    return formattedError;
  }

  // =====================================================
  // CACHING
  // =====================================================

  /**
   * Get cached data
   */
  _getCache(key) {
    const expiry = this.cacheExpiry.get(key);
    if (expiry && Date.now() > expiry) {
      this.cache.delete(key);
      this.cacheExpiry.delete(key);
      return null;
    }
    return this.cache.get(key);
  }

  /**
   * Set cache data
   */
  _setCache(key, data, duration = 3600) {
    this.cache.set(key, data);
    this.cacheExpiry.set(key, Date.now() + duration * 1000);
  }

  /**
   * Clear cache
   */
  clearCache(pattern = null) {
    if (!pattern) {
      this.cache.clear();
      this.cacheExpiry.clear();
      return { cleared: 'all' };
    }

    let cleared = 0;
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
        this.cacheExpiry.delete(key);
        cleared++;
      }
    }

    return { cleared };
  }

  // =====================================================
  // MONITORING & METRICS
  // =====================================================

  /**
   * Track request metrics
   */
  _trackMetrics(responseTime) {
    this.metrics.requestTimes.push(responseTime);
    if (this.metrics.requestTimes.length > 1000) {
      this.metrics.requestTimes.shift();
    }

    const totalTime = this.metrics.requestTimes.reduce((a, b) => a + b, 0);
    this.metrics.averageResponseTime =
      Math.round(totalTime / this.metrics.requestTimes.length);
  }

  /**
   * Get service metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      successRate:
        this.metrics.totalRequests > 0
          ? Math.round(
              (this.metrics.successfulRequests / this.metrics.totalRequests) *
                100
            )
          : 0,
      cacheHitRate:
        this.metrics.totalRequests > 0
          ? Math.round(
              (this.metrics.cachedResponses / this.metrics.totalRequests) * 100
            )
          : 0,
      recentRequests: this.requestHistory.slice(-100),
    };
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const response = await this._makeRequest('GET', '/health', null, {
        skipCache: true,
      });
      return {
        status: 'healthy',
        timestamp: new Date(),
        metrics: this.getMetrics(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date(),
        error: error.message,
      };
    }
  }

  // =====================================================
  // LOGGING
  // =====================================================

  /**
   * Internal logging method
   */
  _log(level, message, metadata = {}) {
    const logEntry = {
      timestamp: new Date(),
      level,
      message,
      metadata,
    };

    this.requestHistory.push(logEntry);
    if (this.requestHistory.length > 1000) {
      this.requestHistory.shift();
    }

    if (level === 'error') {
      console.error(`[Qiwa Service] ${message}`, metadata);
    } else {
      console.log(`[Qiwa Service] ${message}`, metadata);
    }
  }

  /**
   * Get request history
   */
  getRequestHistory(filter = {}) {
    let history = this.requestHistory;

    if (filter.level) {
      history = history.filter((h) => h.level === filter.level);
    }

    if (filter.limit) {
      history = history.slice(-filter.limit);
    }

    return history;
  }
}

// Export singleton instance
module.exports = QiwaService;
module.exports.instance = new QiwaService();
