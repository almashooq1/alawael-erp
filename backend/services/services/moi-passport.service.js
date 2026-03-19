/**
 * MOI Passport Integration Service - خدمة تكامل الجوازات
 * Advanced, Professional & Comprehensive Passport Integration System
 * Version: 3.0.0
 * Last Updated: February 2026
 * Status: Production Ready
 */

const axios = require('axios');
const EventEmitter = require('events');
const Logger = require('../utils/logger');
const crypto = require('crypto');

class MOIPassportService extends EventEmitter {
  constructor(config = {}) {
    super();
    
    // Configuration
    this.config = {
      apiBaseUrl: process.env.JAWAZAT_API_BASE_URL || 'https://api.gdp.gov.sa/v1',
      apiKey: process.env.JAWAZAT_API_KEY,
      apiSecret: process.env.JAWAZAT_API_SECRET,
      webhookUrl: process.env.JAWAZAT_WEBHOOK_URL,
      timeout: parseInt(process.env.JAWAZAT_TIMEOUT || '30000'),
      retryAttempts: parseInt(process.env.JAWAZAT_RETRY_ATTEMPTS || '3'),
      retryDelay: parseInt(process.env.JAWAZAT_RETRY_DELAY || '1000'),
      maxCacheSize: parseInt(process.env.PASSPORT_CACHE_SIZE || '10000'),
      cacheTTL: parseInt(process.env.PASSPORT_CACHE_TTL || '3600000'), // 1 hour
      enableEncryption: process.env.PASSPORT_ENABLE_ENCRYPTION === 'true',
      ...config,
    };

    // Data storage
    this.cache = new Map();
    this.requestQueue = [];
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalCacheHits: 0,
      averageResponseTime: 0,
      requestTimes: [],
    };
    this.errorLog = [];
    this.auditLog = [];
    
    // Rate limiting
    this.rateLimiter = new Map();
    this.requestMetrics = new Map();

    // Validation rules
    this.validationRules = {
      passport: {
        minLength: 6,
        maxLength: 10,
        pattern: /^[A-Z0-9]+$/,
      },
      nationalId: {
        minLength: 10,
        maxLength: 10,
        pattern: /^[0-9]{10}$/,
      },
      iqama: {
        minLength: 10,
        maxLength: 10,
        pattern: /^[0-9]{10}$/,
      },
      visaNumber: {
        minLength: 10,
        maxLength: 15,
        pattern: /^[0-9]+$/,
      },
    };

    this._initializeMetrics();
    Logger.info('✅ MOI Passport Service initialized successfully');
  }

  /**
   * Initialize metrics
   */
  _initializeMetrics() {
    this.metricsInterval = setInterval(() => {
      if (this.metrics.requestTimes.length > 0) {
        const sum = this.metrics.requestTimes.reduce((a, b) => a + b, 0);
        this.metrics.averageResponseTime = Math.round(sum / this.metrics.requestTimes.length);
        // Keep only last 1000 measurements
        if (this.metrics.requestTimes.length > 1000) {
          this.metrics.requestTimes = this.metrics.requestTimes.slice(-1000);
        }
      }
    }, 60000); // Update every minute
  }

  /**
   * Apply rate limiting
   */
  _checkRateLimit(userId) {
    const key = `ratelimit:${userId}`;
    const now = Date.now();
    const windowStart = now - 3600000; // 1 hour window

    if (!this.rateLimiter.has(key)) {
      this.rateLimiter.set(key, []);
    }

    const requests = this.rateLimiter.get(key);
    const recentRequests = requests.filter((time) => time > windowStart);

    // 100 requests per hour per user
    if (recentRequests.length >= 100) {
      throw new Error('Rate limit exceeded: Maximum 100 requests per hour');
    }

    recentRequests.push(now);
    this.rateLimiter.set(key, recentRequests);
    return true;
  }

  /**
   * Validate input data
   */
  _validateInput(data, type) {
    if (!data) {
      throw new Error(`${type} is required`);
    }

    const rules = this.validationRules[type];
    if (!rules) {
      throw new Error(`Unknown validation type: ${type}`);
    }

    const stringData = String(data).trim();

    if (stringData.length < rules.minLength || stringData.length > rules.maxLength) {
      throw new Error(
        `${type} must be between ${rules.minLength} and ${rules.maxLength} characters`
      );
    }

    if (!rules.pattern.test(stringData)) {
      throw new Error(`${type} format is invalid`);
    }

    return stringData;
  }

  /**
   * Generate cache key
   */
  _generateCacheKey(endpoint, params) {
    const paramsStr = JSON.stringify(params);
    return crypto
      .createHash('md5')
      .update(`${endpoint}:${paramsStr}`)
      .digest('hex');
  }

  /**
   * Get from cache
   */
  _getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      this.metrics.totalCacheHits++;
      this.emit('cache:hit', { key });
      return cached.data;
    }

    if (cached && cached.expiresAt <= Date.now()) {
      this.cache.delete(key);
    }

    return null;
  }

  /**
   * Set cache with expiration
   */
  _setCache(key, data, ttl = null) {
    if (this.cache.size >= this.config.maxCacheSize) {
      // Remove oldest item
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    const expiresAt = Date.now() + (ttl || this.config.cacheTTL);
    this.cache.set(key, { data, expiresAt, createdAt: Date.now() });
    this.emit('cache:set', { key, ttl });
  }

  /**
   * Clear cache
   */
  clearCache(pattern = null) {
    if (!pattern) {
      this.cache.clear();
      Logger.info('Cache cleared completely');
      return { success: true, message: 'Cache cleared' };
    }

    let cleared = 0;
    for (const [key] of this.cache) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
        cleared++;
      }
    }

    Logger.info(`Cache cleared: ${cleared} items removed`);
    return { success: true, cleared };
  }

  /**
   * Encrypt sensitive data
   */
  _encryptData(data) {
    if (!this.config.enableEncryption) return data;

    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(
        'aes-256-cbc',
        Buffer.from(this.config.apiSecret || 'default-secret', 'utf-8').slice(0, 32),
        iv
      );

      let encrypted = cipher.update(JSON.stringify(data), 'utf-8', 'hex');
      encrypted += cipher.final('hex');

      return {
        encrypted: true,
        data: encrypted,
        iv: iv.toString('hex'),
      };
    } catch (error) {
      Logger.error('Data encryption failed:', error);
      return data;
    }
  }

  /**
   * Decrypt sensitive data
   */
  _decryptData(encryptedData) {
    if (!this.config.enableEncryption || !encryptedData.encrypted) {
      return encryptedData;
    }

    try {
      const decipher = crypto.createDecipheriv(
        'aes-256-cbc',
        Buffer.from(this.config.apiSecret || 'default-secret', 'utf-8').slice(0, 32),
        Buffer.from(encryptedData.iv, 'hex')
      );

      let decrypted = decipher.update(encryptedData.data, 'hex', 'utf-8');
      decrypted += decipher.final('utf-8');

      return JSON.parse(decrypted);
    } catch (error) {
      Logger.error('Data decryption failed:', error);
      return encryptedData;
    }
  }

  /**
   * Make API request with retry logic
   */
  async _makeRequest(endpoint, method = 'GET', data = null, options = {}) {
    const startTime = Date.now();
    let lastError = null;

    for (let attempt = 0; attempt < this.config.retryAttempts; attempt++) {
      try {
        const url = `${this.config.apiBaseUrl}${endpoint}`;
        const headers = {
          'Content-Type': 'application/json',
          'X-API-Key': this.config.apiKey,
          'X-Request-ID': crypto.randomUUID(),
          'User-Agent': 'MOI-Passport-Service/3.0.0',
          ...options.headers,
        };

        const config = {
          method,
          url,
          headers,
          timeout: this.config.timeout,
        };

        if (data) {
          config.data = data;
        }

        const response = await axios(config);
        const responsetime = Date.now() - startTime;

        // Log metrics
        this.metrics.requestTimes.push(responsetime);
        this.metrics.totalRequests++;
        this.metrics.successfulRequests++;

        this.emit('request:success', {
          endpoint,
          statusCode: response.status,
          responseTime: responsetime,
        });

        return response.data;
      } catch (error) {
        lastError = error;

        if (attempt < this.config.retryAttempts - 1) {
          // Exponential backoff
          const delay = this.config.retryDelay * Math.pow(2, attempt);
          await this._sleep(delay);
        }
      }
    }

    // All retries failed
    this.metrics.failedRequests++;
    this.metrics.totalRequests++;

    const errorInfo = {
      endpoint,
      error: lastError?.message,
      timestamp: new Date(),
      retries: this.config.retryAttempts,
    };

    this.errorLog.push(errorInfo);
    this.emit('request:failure', errorInfo);

    throw lastError;
  }

  /**
   * Sleep utility
   */
  _sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 🔍 Verify Passport Number
   */
  async verifyPassport(passportNumber, userId) {
    const startTime = Date.now();

    try {
      // Validate input
      const validatedPassport = this._validateInput(passportNumber, 'passport');
      this._checkRateLimit(userId);

      // Check cache
      const cacheKey = this._generateCacheKey('verify-passport', { passportNumber });
      const cachedResult = this._getFromCache(cacheKey);

      if (cachedResult) {
        return {
          success: true,
          data: cachedResult,
          source: 'cache',
          responseTime: Date.now() - startTime,
        };
      }

      // Make API request
      const response = await this._makeRequest('/passports/verify', 'POST', {
        passportNumber: validatedPassport,
      });

      // Validate response
      if (!response || !response.data) {
        throw new Error('Invalid API response format');
      }

      const result = {
        passportNumber: response.data.passportNumber,
        fullNameArabic: response.data.fullNameAr,
        fullNameEnglish: response.data.fullNameEn,
        nationality: response.data.nationality,
        dateOfBirth: response.data.dateOfBirth,
        gender: response.data.gender,
        issueDate: response.data.issueDate,
        expiryDate: response.data.expiryDate,
        status: response.data.status, // valid, expired, lost, cancelled
        issuingAuthority: 'General Directorate of Passports',
        verificationDate: new Date(),
      };

      // Cache the result
      this._setCache(cacheKey, result);

      // Log audit trail
      this._addAuditLog('PASSPORT_VERIFY', userId, {
        passportNumber: validatedPassport,
        status: 'success',
      });

      this.emit('passport:verified', result);

      return {
        success: true,
        data: result,
        source: 'api',
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      this._addAuditLog('PASSPORT_VERIFY', userId, {
        passportNumber,
        status: 'failed',
        error: error.message,
      });

      Logger.error('Passport verification failed:', error);
      throw {
        success: false,
        error: error.message,
        type: 'PASSPORT_VERIFICATION_ERROR',
        timestamp: new Date(),
      };
    }
  }

  /**
   * 🆔 Verify National ID
   */
  async verifyNationalId(nationalId, userId) {
    const startTime = Date.now();

    try {
      const validatedId = this._validateInput(nationalId, 'nationalId');
      this._checkRateLimit(userId);

      const cacheKey = this._generateCacheKey('verify-national-id', { nationalId });
      const cachedResult = this._getFromCache(cacheKey);

      if (cachedResult) {
        return {
          success: true,
          data: cachedResult,
          source: 'cache',
          responseTime: Date.now() - startTime,
        };
      }

      const response = await this._makeRequest('/national-ids/verify', 'POST', {
        nationalId: validatedId,
      });

      const result = {
        nationalId: response.data.nationalId,
        fullNameArabic: response.data.fullNameAr,
        fullNameEnglish: response.data.fullNameEn,
        birthDate: response.data.birthDate,
        gender: response.data.gender,
        nationality: 'Saudi Arabia',
        issueDate: response.data.issueDate,
        expiryDate: response.data.expiryDate,
        status: response.data.status,
        verificationDate: new Date(),
      };

      this._setCache(cacheKey, result);

      this._addAuditLog('NATIONAL_ID_VERIFY', userId, {
        nationalId: validatedId,
        status: 'success',
      });

      this.emit('national-id:verified', result);

      return {
        success: true,
        data: result,
        source: 'api',
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      this._addAuditLog('NATIONAL_ID_VERIFY', userId, {
        nationalId,
        status: 'failed',
        error: error.message,
      });

      Logger.error('National ID verification failed:', error);
      throw {
        success: false,
        error: error.message,
        type: 'NATIONAL_ID_VERIFICATION_ERROR',
        timestamp: new Date(),
      };
    }
  }

  /**
   * 🏠 Verify Iqama (Residency)
   */
  async verifyIqama(iqamaNumber, userId) {
    const startTime = Date.now();

    try {
      const validatedIqama = this._validateInput(iqamaNumber, 'iqama');
      this._checkRateLimit(userId);

      const cacheKey = this._generateCacheKey('verify-iqama', { iqamaNumber });
      const cachedResult = this._getFromCache(cacheKey);

      if (cachedResult) {
        return {
          success: true,
          data: cachedResult,
          source: 'cache',
          responseTime: Date.now() - startTime,
        };
      }

      const response = await this._makeRequest('/iqamas/verify', 'POST', {
        iqamaNumber: validatedIqama,
      });

      const result = {
        iqamaNumber: response.data.iqamaNumber,
        fullNameArabic: response.data.fullNameAr,
        fullNameEnglish: response.data.fullNameEn,
        nationality: response.data.nationality,
        dateOfBirth: response.data.birthDate,
        sponsorName: response.data.sponsorName,
        sponsorNumber: response.data.sponsorNumber,
        sponsorNationality: response.data.sponsorNationality,
        issueDate: response.data.issueDate,
        expiryDate: response.data.expiryDate,
        status: response.data.status, // valid, expired, cancelled, revoked
        occupationCode: response.data.occupationCode,
        occupationName: response.data.occupationName,
        verificationDate: new Date(),
      };

      this._setCache(cacheKey, result);

      this._addAuditLog('IQAMA_VERIFY', userId, {
        iqamaNumber: validatedIqama,
        status: 'success',
      });

      this.emit('iqama:verified', result);

      return {
        success: true,
        data: result,
        source: 'api',
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      this._addAuditLog('IQAMA_VERIFY', userId, {
        iqamaNumber,
        status: 'failed',
        error: error.message,
      });

      Logger.error('Iqama verification failed:', error);
      throw {
        success: false,
        error: error.message,
        type: 'IQAMA_VERIFICATION_ERROR',
        timestamp: new Date(),
      };
    }
  }

  /**
   * 📋 Request Exit/Re-entry Visa
   */
  async requestExitReentryVisa(iqamaNumber, visaType = 'multiple', duration = 90, userId) {
    const startTime = Date.now();

    try {
      const validatedIqama = this._validateInput(iqamaNumber, 'iqama');
      this._checkRateLimit(userId);

      if (!['single', 'multiple'].includes(visaType)) {
        throw new Error('Visa type must be "single" or "multiple"');
      }

      if (duration < 1 || duration > 365) {
        throw new Error('Duration must be between 1 and 365 days');
      }

      const response = await this._makeRequest('/exit-reentry/request', 'POST', {
        iqamaNumber: validatedIqama,
        visaType,
        duration,
        requestDate: new Date(),
      });

      const result = {
        requestId: response.data.requestId,
        iqamaNumber: validatedIqama,
        visaType,
        duration,
        status: 'pending', // pending, approved, rejected, collected
        expiryDate: new Date(Date.now() + duration * 86400000),
        createdDate: new Date(),
        estimatedCollectionDate: new Date(Date.now() + 2 * 86400000),
      };

      this._addAuditLog('EXIT_REENTRY_REQUEST', userId, {
        iqamaNumber: validatedIqama,
        requestId: result.requestId,
        status: 'success',
      });

      this.emit('exit-reentry:requested', result);

      return {
        success: true,
        data: result,
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      this._addAuditLog('EXIT_REENTRY_REQUEST', userId, {
        iqamaNumber,
        status: 'failed',
        error: error.message,
      });

      Logger.error('Exit/Re-entry request failed:', error);
      throw {
        success: false,
        error: error.message,
        type: 'EXIT_REENTRY_REQUEST_ERROR',
        timestamp: new Date(),
      };
    }
  }

  /**
   * 👤 Get Complete Traveler Profile
   */
  async getTravelerProfile(iqamaNumber, userId) {
    try {
      const validatedIqama = this._validateInput(iqamaNumber, 'iqama');
      this._checkRateLimit(userId);

      const cacheKey = this._generateCacheKey('traveler-profile', { iqamaNumber });
      const cachedResult = this._getFromCache(cacheKey);

      if (cachedResult) {
        return {
          success: true,
          data: cachedResult,
          source: 'cache',
        };
      }

      const response = await this._makeRequest(`/travelers/${validatedIqama}`, 'GET');

      const profile = {
        iqamaNumber: response.data.iqamaNumber,
        personalInfo: {
          fullNameAr: response.data.fullNameAr,
          fullNameEn: response.data.fullNameEn,
          dateOfBirth: response.data.dateOfBirth,
          gender: response.data.gender,
          nationality: response.data.nationality,
        },
        documentInfo: {
          passport: response.data.passportNumber,
          passportExpiry: response.data.passportExpiry,
          iqama: response.data.iqamaNumber,
          iqamaExpiry: response.data.iqamaExpiry,
          nationalId: response.data.nationalId,
        },
        travelHistory: response.data.travelHistory || [],
        currentVisa: response.data.currentVisa || null,
        exitBans: response.data.exitBans || [],
        flaggedStatus: response.data.flagged || false,
      };

      this._setCache(cacheKey, profile, this.config.cacheTTL * 2);
      this._addAuditLog('GET_TRAVELER_PROFILE', userId, { iqamaNumber: validatedIqama });

      return {
        success: true,
        data: profile,
      };
    } catch (error) {
      Logger.error('Failed to get traveler profile:', error);
      throw {
        success: false,
        error: error.message,
        type: 'TRAVELER_PROFILE_ERROR',
      };
    }
  }

  /**
   * 📊 Get Service Metrics
   */
  getMetrics() {
    return {
      totalRequests: this.metrics.totalRequests,
      successfulRequests: this.metrics.successfulRequests,
      failedRequests: this.metrics.failedRequests,
      successRate: this.metrics.totalRequests > 0 
        ? ((this.metrics.successfulRequests / this.metrics.totalRequests) * 100).toFixed(2) + '%'
        : '0%',
      totalCacheHits: this.metrics.totalCacheHits,
      cacheSize: this.cache.size,
      maxCacheSize: this.config.maxCacheSize,
      cacheUtilization: ((this.cache.size / this.config.maxCacheSize) * 100).toFixed(2) + '%',
      averageResponseTime: this.metrics.averageResponseTime + 'ms',
      errorLogSize: this.errorLog.length,
      auditLogSize: this.auditLog.length,
    };
  }

  /**
   * 📝 Add audit log entry
   */
  _addAuditLog(action, userId, details) {
    const entry = {
      id: crypto.randomUUID(),
      action,
      userId,
      details,
      timestamp: new Date(),
      ipAddress: details.ipAddress || 'unknown',
    };

    this.auditLog.push(entry);

    // Keep only last 10000 logs
    if (this.auditLog.length > 10000) {
      this.auditLog = this.auditLog.slice(-10000);
    }

    this.emit('audit:logged', entry);
  }

  /**
   * 📜 Get audit log
   */
  getAuditLog(filters = {}) {
    let logs = this.auditLog;

    if (filters.action) {
      logs = logs.filter((l) => l.action === filters.action);
    }

    if (filters.userId) {
      logs = logs.filter((l) => l.userId === filters.userId);
    }

    if (filters.startDate && filters.endDate) {
      logs = logs.filter((l) => l.timestamp >= filters.startDate && l.timestamp <= filters.endDate);
    }

    return logs.slice(Math.max(0, logs.length - (filters.limit || 100)));
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const startTime = Date.now();
      const response = await axios.get(`${this.config.apiBaseUrl}/health`, {
        timeout: 5000,
        headers: {
          'X-API-Key': this.config.apiKey,
        },
      });

      return {
        status: 'healthy',
        apiResponse: response.status === 200,
        responseTime: Date.now() - startTime,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Cleanup and destroy
   */
  destroy() {
    clearInterval(this.metricsInterval);
    this.cache.clear();
    this.requestQueue = [];
    this.rateLimiter.clear();
    this.removeAllListeners();
    Logger.info('MOI Passport Service destroyed');
  }
}

module.exports = MOIPassportService;
