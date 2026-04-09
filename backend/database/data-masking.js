/**
 * Dynamic Data Masking - Al-Awael ERP
 * نظام إخفاء البيانات الديناميكي
 *
 * Features:
 *  - Role-based field masking at read-time
 *  - Configurable masking strategies (partial, full, hash, redact)
 *  - Per-model masking rules via decorator/config
 *  - GDPR/PDPA anonymization for exports
 *  - Mongoose plugin for transparent masking
 *  - Preserve data integrity on write (never mask stored data)
 *  - Bulk anonymization for data exports
 *  - Audit log integration for masked access
 */

'use strict';

const crypto = require('crypto');
const logger = require('../utils/logger');

// ══════════════════════════════════════════════════════════════════
// Masking Strategies
// ══════════════════════════════════════════════════════════════════
const STRATEGIES = {
  /** Show first/last chars: Ahmed -> A***d */
  partial(value, opts = {}) {
    if (!value) return value;
    const str = String(value);
    if (str.length <= 2) return '*'.repeat(str.length);
    const show = opts.showChars || 1;
    const start = str.slice(0, show);
    const end = opts.showEnd !== false ? str.slice(-show) : '';
    const masked = '*'.repeat(Math.max(str.length - show * 2, 3));
    return `${start}${masked}${end}`;
  },

  /** Full mask: Ahmed -> ***** */
  full(value) {
    if (!value) return value;
    return '*'.repeat(String(value).length);
  },

  /** Replace with fixed text */
  redact(_value, opts = {}) {
    return opts.replacement || '[REDACTED]';
  },

  /** Hash the value (irreversible) */
  hash(value) {
    if (!value) return value;
    return crypto.createHash('sha256').update(String(value)).digest('hex').slice(0, 12);
  },

  /** Email mask: user@domain.com -> u***@d***.com */
  email(value) {
    if (!value || !String(value).includes('@')) return STRATEGIES.partial(value);
    const [local, domain] = String(value).split('@');
    const maskedLocal =
      local.length > 1 ? local[0] + '*'.repeat(Math.min(local.length - 1, 5)) : '*';
    const domainParts = domain.split('.');
    const maskedDomain = domainParts[0][0] + '*'.repeat(3) + '.' + domainParts.slice(1).join('.');
    return `${maskedLocal}@${maskedDomain}`;
  },

  /** Phone mask: 0512345678 -> 051****678 */
  phone(value) {
    if (!value) return value;
    const str = String(value).replace(/\s/g, '');
    if (str.length < 6) return '*'.repeat(str.length);
    return str.slice(0, 3) + '*'.repeat(str.length - 6) + str.slice(-3);
  },

  /** National ID mask: 1234567890 -> 12******90 */
  nationalId(value) {
    if (!value) return value;
    const str = String(value);
    if (str.length < 4) return '*'.repeat(str.length);
    return str.slice(0, 2) + '*'.repeat(str.length - 4) + str.slice(-2);
  },

  /** IBAN mask: SA12345678901234567890 -> SA**************7890 */
  iban(value) {
    if (!value) return value;
    const str = String(value);
    return str.slice(0, 2) + '*'.repeat(Math.max(str.length - 6, 4)) + str.slice(-4);
  },

  /** Date to year only: 1990-05-15 -> 1990-**-** */
  datePartial(value) {
    if (!value) return value;
    try {
      const d = new Date(value);
      return `${d.getFullYear()}-**-**`;
    } catch {
      return '[DATE]';
    }
  },

  /** Monetary partial: 15000.50 -> *****0.50 */
  monetary(value) {
    if (value === null || value === undefined) return value;
    const str = String(value);
    const dot = str.indexOf('.');
    if (dot === -1) return '*'.repeat(Math.max(str.length - 1, 1)) + str.slice(-1);
    return '*'.repeat(dot) + str.slice(dot);
  },

  /** IP mask: 192.168.1.100 -> 192.168.*.* */
  ip(value) {
    if (!value) return value;
    const parts = String(value).split('.');
    if (parts.length !== 4) return STRATEGIES.partial(value);
    return `${parts[0]}.${parts[1]}.*.*`;
  },
};

// ══════════════════════════════════════════════════════════════════
// DataMaskingEngine
// ══════════════════════════════════════════════════════════════════
class DataMaskingEngine {
  constructor(options = {}) {
    this._enabled = options.enabled !== false;
    this._rules = new Map(); // modelName -> [{ field, strategy, roles, opts }]
    this._globalRules = []; // Applied to all models
    this._bypassRoles = new Set(options.bypassRoles || ['superAdmin']);
    this._strategies = { ...STRATEGIES, ...(options.customStrategies || {}) };
    this._maskingLog = options.logMasking || false;
  }

  // ────── Rule Configuration ──────

  /**
   * Define masking rules for a model
   * @param {string} modelName
   * @param {Array} rules - [{ field, strategy, roles?, options? }]
   */
  defineRules(modelName, rules) {
    const existing = this._rules.get(modelName) || [];
    for (const rule of rules) {
      existing.push({
        field: rule.field,
        strategy: rule.strategy || 'partial',
        roles: rule.roles ? new Set(rule.roles) : null, // null = mask for everyone except bypass
        options: rule.options || {},
        condition: rule.condition || null,
      });
    }
    this._rules.set(modelName, existing);
    return this;
  }

  /**
   * Add a global rule (applies to matching fields across all models)
   */
  addGlobalRule(rule) {
    this._globalRules.push({
      fieldPattern:
        rule.fieldPattern instanceof RegExp
          ? rule.fieldPattern
          : new RegExp(rule.fieldPattern, 'i'),
      strategy: rule.strategy || 'partial',
      roles: rule.roles ? new Set(rule.roles) : null,
      options: rule.options || {},
    });
    return this;
  }

  /**
   * Register a custom masking strategy
   */
  registerStrategy(name, fn) {
    this._strategies[name] = fn;
    return this;
  }

  // ────── Common Presets ──────

  /**
   * Apply standard PII masking rules
   */
  applyPIIPreset() {
    // Global patterns for common PII fields
    this.addGlobalRule({ fieldPattern: /phone|mobile|tel/i, strategy: 'phone' });
    this.addGlobalRule({ fieldPattern: /email/i, strategy: 'email' });
    this.addGlobalRule({ fieldPattern: /nationalId|national_id/i, strategy: 'nationalId' });
    this.addGlobalRule({ fieldPattern: /iqama|iqamaNumber/i, strategy: 'nationalId' });
    this.addGlobalRule({ fieldPattern: /iban|bankAccount/i, strategy: 'iban' });
    this.addGlobalRule({ fieldPattern: /password|secret|token/i, strategy: 'redact' });
    this.addGlobalRule({
      fieldPattern: /salary|compensation|netPay|grossPay/i,
      strategy: 'monetary',
    });
    this.addGlobalRule({ fieldPattern: /^ip$|ipAddress/i, strategy: 'ip' });
    this.addGlobalRule({ fieldPattern: /dateOfBirth|birthDate|dob/i, strategy: 'datePartial' });

    logger.info('[DataMasking] PII masking preset applied');
    return this;
  }

  // ────── Masking Execution ──────

  /**
   * Mask a single document
   * @param {Object} doc - Document object (plain or Mongoose)
   * @param {string} modelName - Model name for rule lookup
   * @param {Object} context - { role, userId }
   * @returns {Object} Masked document
   */
  maskDocument(doc, modelName, context = {}) {
    if (!this._enabled || !doc) return doc;
    if (this._bypassRoles.has(context.role)) return doc;

    const obj = doc.toObject ? doc.toObject() : { ...doc };
    const rules = this._getApplicableRules(modelName, Object.keys(obj));
    let maskedCount = 0;

    for (const rule of rules) {
      // Check role-based visibility
      if (rule.roles && !rule.roles.has(context.role)) {
        // This role should NOT see masked data (i.e., mask it)
      } else if (rule.roles) {
        continue; // This role is allowed to see unmasked
      }

      // Check condition
      if (rule.condition && !rule.condition(obj, context)) continue;

      // Apply masking
      if (obj[rule.field] !== undefined && obj[rule.field] !== null) {
        const strategy = this._strategies[rule.strategy];
        if (strategy) {
          obj[rule.field] = strategy(obj[rule.field], rule.options);
          maskedCount++;
        }
      }

      // Handle nested fields (dot notation: "address.street")
      if (rule.field.includes('.')) {
        this._maskNestedField(obj, rule.field, rule.strategy, rule.options);
        maskedCount++;
      }
    }

    if (maskedCount > 0) {
      obj._masked = true;
      obj._maskedFields = maskedCount;
    }

    return obj;
  }

  /**
   * Mask an array of documents
   */
  maskMany(docs, modelName, context = {}) {
    if (!this._enabled || !docs?.length) return docs;
    if (this._bypassRoles.has(context.role)) return docs;
    return docs.map(doc => this.maskDocument(doc, modelName, context));
  }

  // ────── Anonymization (for exports) ──────

  /**
   * Fully anonymize documents for data export (GDPR compliance)
   * This replaces all PII with irreversible anonymized values
   */
  anonymize(docs, options = {}) {
    if (!Array.isArray(docs)) docs = [docs];

    const salt = options.salt || crypto.randomBytes(16).toString('hex');
    const piiFields = options.fields || [
      'name',
      'firstName',
      'lastName',
      'fullName',
      'email',
      'phone',
      'mobile',
      'nationalId',
      'iqamaNumber',
      'address',
      'iban',
      'bankAccount',
      'dateOfBirth',
      'ip',
      'userAgent',
    ];

    return docs.map((doc, idx) => {
      const obj = doc.toObject ? doc.toObject() : { ...doc };

      for (const field of piiFields) {
        if (obj[field] !== undefined) {
          obj[field] = this._anonymizeValue(field, obj[field], salt, idx);
        }
      }

      obj._anonymized = true;
      obj._anonymizedAt = new Date();
      return obj;
    });
  }

  _anonymizeValue(field, value, salt, index) {
    if (!value) return value;

    // Generate deterministic but irreversible replacement
    const hash = crypto
      .createHash('sha256')
      .update(`${salt}:${field}:${index}:${String(value)}`)
      .digest('hex');

    if (/email/i.test(field)) return `anon_${hash.slice(0, 8)}@example.com`;
    if (/phone|mobile|tel/i.test(field)) return `050${hash.slice(0, 7)}`;
    if (/name|Name/i.test(field)) return `User_${hash.slice(0, 6)}`;
    if (/address/i.test(field)) return `Address_${hash.slice(0, 8)}`;
    if (/iban/i.test(field)) return `SA${hash.slice(0, 20).toUpperCase()}`;
    if (/date|Date/i.test(field)) return new Date(2000, 0, 1);
    if (/nationalId|iqama/i.test(field)) return hash.slice(0, 10);

    return `[ANONYMIZED_${hash.slice(0, 8)}]`;
  }

  // ────── Mongoose Plugin ──────

  /**
   * Mongoose plugin for automatic response masking
   * Usage: schema.plugin(masking.plugin(), { modelName: 'Employee' })
   */
  plugin() {
    const self = this;

    return function dataMaskingPlugin(schema, pluginOptions = {}) {
      const modelName = pluginOptions.modelName || 'Unknown';

      // Override toJSON to apply masking
      schema.methods.toMaskedJSON = function (context = {}) {
        return self.maskDocument(this, modelName, context);
      };

      // Add static method for bulk masking
      schema.statics.maskResults = function (docs, context = {}) {
        return self.maskMany(docs, modelName, context);
      };

      // Add static method for anonymization
      schema.statics.anonymize = function (docs, options = {}) {
        return self.anonymize(docs, options);
      };
    };
  }

  /**
   * Express middleware to auto-mask response data
   */
  responseMiddleware(modelName) {
    const self = this;
    return (req, res, next) => {
      const originalJson = res.json.bind(res);

      res.json = function (body) {
        if (body && body.data) {
          const context = { role: req.user?.role, userId: req.user?._id };
          if (Array.isArray(body.data)) {
            body.data = self.maskMany(body.data, modelName, context);
          } else if (typeof body.data === 'object') {
            body.data = self.maskDocument(body.data, modelName, context);
          }
        }
        return originalJson(body);
      };

      next();
    };
  }

  // ────── Internal ──────

  _getApplicableRules(modelName, fields) {
    const rules = [];

    // Model-specific rules
    const modelRules = this._rules.get(modelName) || [];
    rules.push(...modelRules);

    // Global rules matching any field
    for (const globalRule of this._globalRules) {
      for (const field of fields) {
        if (globalRule.fieldPattern.test(field)) {
          rules.push({
            field,
            strategy: globalRule.strategy,
            roles: globalRule.roles,
            options: globalRule.options,
          });
        }
      }
    }

    return rules;
  }

  _maskNestedField(obj, path, strategy, options) {
    const parts = path.split('.');
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]]) return;
      current = current[parts[i]];
    }
    const lastKey = parts[parts.length - 1];
    if (current[lastKey] !== undefined) {
      const strategyFn = this._strategies[strategy];
      if (strategyFn) {
        current[lastKey] = strategyFn(current[lastKey], options);
      }
    }
  }

  // ────── Info & Stats ──────

  getRules(modelName) {
    if (modelName) return this._rules.get(modelName) || [];
    const result = {};
    for (const [name, rules] of this._rules) {
      result[name] = rules.map(r => ({
        field: r.field,
        strategy: r.strategy,
        restrictedRoles: r.roles ? [...r.roles] : 'all-except-bypass',
      }));
    }
    return {
      modelRules: result,
      globalRules: this._globalRules.length,
      bypassRoles: [...this._bypassRoles],
      strategies: Object.keys(this._strategies),
    };
  }
}

// Singleton with PII preset
const dataMasking = new DataMaskingEngine();

module.exports = {
  DataMaskingEngine,
  dataMasking,
  STRATEGIES,
};
