// Phase 18: Multi-Tenant Enterprise System
// Advanced SaaS Architecture with Tenant Isolation

class TenantManager {
  constructor() {
    this.tenants = new Map();
    this.tenantSettings = new Map();
    this.dataStores = new Map();
  }

  /**
   * Create a new tenant
   * @param {Object} tenantInfo - Tenant information
   * @returns {Object} Tenant creation response
   */
  createTenant(tenantInfo) {
    const { name, email, plan, domain, industry, maxUsers, storageLimit, apiCallsLimit } =
      tenantInfo;

    // Validate tenant info
    if (!name || !email || !plan) {
      throw new Error('Missing required tenant information');
    }

    const tenantId = `tenant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create isolated tenant data store
    const tenantStore = {
      tenantId,
      name,
      email,
      plan,
      domain,
      industry,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
      maxUsers,
      storageLimit,
      apiCallsLimit,
      currentUsers: 0,
      storageUsed: 0,
      apiCallsUsed: 0,
      customBranding: {
        logo: null,
        colors: {
          primary: '#0066cc',
          secondary: '#333333',
        },
        customDomain: domain,
        faviconUrl: null,
      },
      settings: {
        timezone: 'UTC',
        language: 'en',
        dateFormat: 'MM/DD/YYYY',
        currency: 'USD',
        features: {
          analytics: true,
          workflows: true,
          chatbot: true,
          api: true,
          webhooks: plan !== 'starter',
        },
      },
      administrators: [
        {
          userId: `admin_${tenantId}`,
          email,
          role: 'super_admin',
          permissions: ['*'],
        },
      ],
      roles: this._initializeDefaultRoles(),
      dataCollections: new Map(),
      apiKeys: [],
      webhooks: [],
      auditLog: [],
    };

    // Store tenant
    this.tenants.set(tenantId, tenantStore);
    this.tenantSettings.set(tenantId, tenantStore.settings);
    this.dataStores.set(tenantId, new Map());

    // Record audit log
    this._logAudit(tenantId, 'tenant_created', {
      tenantName: name,
      plan,
    });

    return {
      success: true,
      tenantId,
      message: `Tenant '${name}' created successfully`,
      tenant: this._sanitizeTenant(tenantStore),
    };
  }

  /**
   * Initialize default roles for tenant
   * @returns {Array} Default roles
   */
  _initializeDefaultRoles() {
    return [
      {
        id: 'super_admin',
        name: 'Super Administrator',
        permissions: ['*'],
        description: 'Full access to all features',
      },
      {
        id: 'admin',
        name: 'Administrator',
        permissions: [
          'user_management',
          'role_management',
          'settings',
          'billing',
          'audit_logs',
          'analytics',
        ],
        description: 'Administrative access',
      },
      {
        id: 'manager',
        name: 'Manager',
        permissions: ['user_view', 'data_management', 'report_generation', 'analytics'],
        description: 'Management level access',
      },
      {
        id: 'user',
        name: 'Standard User',
        permissions: ['data_view', 'data_create', 'data_edit_own', 'report_view'],
        description: 'Standard user access',
      },
      {
        id: 'viewer',
        name: 'Viewer',
        permissions: ['data_view', 'report_view'],
        description: 'Read-only access',
      },
    ];
  }

  /**
   * Get tenant details
   * @param {String} tenantId - Tenant ID
   * @returns {Object} Tenant information
   */
  getTenant(tenantId) {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      throw new Error(`Tenant ${tenantId} not found`);
    }
    return this._sanitizeTenant(tenant);
  }

  /**
   * Update tenant settings
   * @param {String} tenantId - Tenant ID
   * @param {Object} updates - Settings updates
   * @returns {Object} Updated tenant
   */
  updateTenantSettings(tenantId, updates) {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      throw new Error(`Tenant ${tenantId} not found`);
    }

    // Merge settings updates
    tenant.settings = { ...tenant.settings, ...updates };
    tenant.updatedAt = new Date();

    this._logAudit(tenantId, 'settings_updated', {
      updatedFields: Object.keys(updates),
    });

    return this._sanitizeTenant(tenant);
  }

  /**
   * Update tenant branding
   * @param {String} tenantId - Tenant ID
   * @param {Object} branding - Branding settings
   * @returns {Object} Updated tenant
   */
  updateTenantBranding(tenantId, branding) {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      throw new Error(`Tenant ${tenantId} not found`);
    }

    tenant.customBranding = {
      ...tenant.customBranding,
      ...branding,
    };
    tenant.updatedAt = new Date();

    this._logAudit(tenantId, 'branding_updated', branding);

    return this._sanitizeTenant(tenant);
  }

  /**
   * Create tenant-specific role
   * @param {String} tenantId - Tenant ID
   * @param {Object} roleInfo - Role information
   * @returns {Object} Created role
   */
  createRole(tenantId, roleInfo) {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      throw new Error(`Tenant ${tenantId} not found`);
    }

    const { name, permissions, description } = roleInfo;
    const roleId = `role_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const role = {
      id: roleId,
      name,
      permissions,
      description,
      createdAt: new Date(),
      isCustom: true,
    };

    tenant.roles.push(role);
    this._logAudit(tenantId, 'role_created', { roleId, name });

    return role;
  }

  /**
   * Add user to tenant
   * @param {String} tenantId - Tenant ID
   * @param {Object} userData - User information
   * @returns {Object} Added user
   */
  addUserToTenant(tenantId, userData) {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      throw new Error(`Tenant ${tenantId} not found`);
    }

    // Check user limit
    if (tenant.currentUsers >= tenant.maxUsers) {
      throw new Error(`User limit (${tenant.maxUsers}) reached for this tenant`);
    }

    const { email, role, firstName, lastName } = userData;
    const userId = `user_${tenantId}_${Date.now()}`;

    const user = {
      userId,
      tenantId,
      email,
      firstName,
      lastName,
      role,
      status: 'active',
      createdAt: new Date(),
      lastLogin: null,
      loginCount: 0,
      preferences: {
        theme: 'light',
        notifications: true,
        language: tenant.settings.language,
      },
    };

    tenant.currentUsers++;
    this._logAudit(tenantId, 'user_added', {
      userId,
      email,
      role,
    });

    return user;
  }

  /**
   * Generate API key for tenant
   * @param {String} tenantId - Tenant ID
   * @param {Object} keyInfo - API key information
   * @returns {Object} Generated API key
   */
  generateApiKey(tenantId, keyInfo) {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      throw new Error(`Tenant ${tenantId} not found`);
    }

    const { name, scope } = keyInfo;
    const apiKey = `sk_${tenantId}_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
    const hashedKey = this._hashKey(apiKey);

    const keyRecord = {
      id: `key_${Date.now()}`,
      name,
      apiKey: hashedKey,
      scope: scope || ['read', 'write'],
      status: 'active',
      createdAt: new Date(),
      lastUsed: null,
      callsCount: 0,
    };

    tenant.apiKeys.push(keyRecord);
    this._logAudit(tenantId, 'api_key_generated', { keyName: name });

    return {
      id: keyRecord.id,
      apiKey, // Only return full key once
      name,
      scope,
      createdAt: keyRecord.createdAt,
    };
  }

  /**
   * Set up webhook for tenant
   * @param {String} tenantId - Tenant ID
   * @param {Object} webhookInfo - Webhook information
   * @returns {Object} Created webhook
   */
  setupWebhook(tenantId, webhookInfo) {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      throw new Error(`Tenant ${tenantId} not found`);
    }

    // Check if webhooks are enabled for plan
    if (!tenant.settings.features.webhooks) {
      throw new Error('Webhooks not available for this plan');
    }

    const { url, events, active, headers } = webhookInfo;
    const webhookId = `webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const webhook = {
      id: webhookId,
      url,
      events,
      active: active !== false,
      headers: headers || {},
      createdAt: new Date(),
      lastTriggered: null,
      deliveryAttempts: 0,
      failedAttempts: 0,
    };

    tenant.webhooks.push(webhook);
    this._logAudit(tenantId, 'webhook_created', {
      webhookId,
      url,
      events,
    });

    return webhook;
  }

  /**
   * Create isolated data collection for tenant
   * @param {String} tenantId - Tenant ID
   * @param {String} collectionName - Collection name
   * @returns {Object} Created collection
   */
  createTenantDataCollection(tenantId, collectionName) {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      throw new Error(`Tenant ${tenantId} not found`);
    }

    const dataStore = this.dataStores.get(tenantId);
    if (dataStore.has(collectionName)) {
      throw new Error(`Collection ${collectionName} already exists`);
    }

    const collection = {
      name: collectionName,
      documents: new Map(),
      indexes: [],
      createdAt: new Date(),
      documentCount: 0,
    };

    dataStore.set(collectionName, collection);
    tenant.dataCollections.set(collectionName, collection);

    this._logAudit(tenantId, 'collection_created', {
      collectionName,
    });

    return {
      collectionName,
      createdAt: collection.createdAt,
    };
  }

  /**
   * Insert document to tenant collection
   * @param {String} tenantId - Tenant ID
   * @param {String} collectionName - Collection name
   * @param {Object} document - Document to insert
   * @returns {Object} Inserted document
   */
  insertDocument(tenantId, collectionName, document) {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      throw new Error(`Tenant ${tenantId} not found`);
    }

    const dataStore = this.dataStores.get(tenantId);
    const collection = dataStore.get(collectionName);
    if (!collection) {
      throw new Error(`Collection ${collectionName} not found`);
    }

    // Check storage limit
    const estimatedSize = JSON.stringify(document).length;
    if (tenant.storageUsed + estimatedSize > tenant.storageLimit) {
      throw new Error('Storage limit exceeded');
    }

    const docId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const doc = {
      _id: docId,
      ...document,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    collection.documents.set(docId, doc);
    collection.documentCount++;
    tenant.storageUsed += estimatedSize;

    this._logAudit(tenantId, 'document_created', {
      collectionName,
      docId,
    });

    return doc;
  }

  /**
   * Query tenant documents
   * @param {String} tenantId - Tenant ID
   * @param {String} collectionName - Collection name
   * @param {Object} filter - Query filter
   * @returns {Array} Matching documents
   */
  queryDocuments(tenantId, collectionName, filter = {}) {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      throw new Error(`Tenant ${tenantId} not found`);
    }

    const dataStore = this.dataStores.get(tenantId);
    const collection = dataStore.get(collectionName);
    if (!collection) {
      throw new Error(`Collection ${collectionName} not found`);
    }

    // Filter documents
    const results = Array.from(collection.documents.values()).filter(doc => {
      return Object.entries(filter).every(([key, value]) => {
        if (typeof value === 'object' && value !== null) {
          // Handle operators like $gt, $lt, etc.
          return this._evaluateOperator(doc[key], value);
        }
        return doc[key] === value;
      });
    });

    return results;
  }

  /**
   * Evaluate query operators
   * @private
   * @param {*} value - Document value
   * @param {Object} operator - Operator object
   * @returns {Boolean}
   */
  _evaluateOperator(value, operator) {
    if (operator.$gt) return value > operator.$gt;
    if (operator.$gte) return value >= operator.$gte;
    if (operator.$lt) return value < operator.$lt;
    if (operator.$lte) return value <= operator.$lte;
    if (operator.$eq) return value === operator.$eq;
    if (operator.$ne) return value !== operator.$ne;
    if (operator.$in) return operator.$in.includes(value);
    if (operator.$nin) return !operator.$nin.includes(value);
    return true;
  }

  /**
   * Get tenant usage statistics
   * @param {String} tenantId - Tenant ID
   * @returns {Object} Usage statistics
   */
  getUsageStats(tenantId) {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      throw new Error(`Tenant ${tenantId} not found`);
    }

    return {
      tenantId,
      plan: tenant.plan,
      users: {
        current: tenant.currentUsers,
        limit: tenant.maxUsers,
        usage: ((tenant.currentUsers / tenant.maxUsers) * 100).toFixed(2) + '%',
      },
      storage: {
        used: tenant.storageUsed,
        limit: tenant.storageLimit,
        usage: ((tenant.storageUsed / tenant.storageLimit) * 100).toFixed(2) + '%',
      },
      apiCalls: {
        used: tenant.apiCallsUsed,
        limit: tenant.apiCallsLimit,
        usage: ((tenant.apiCallsUsed / tenant.apiCallsLimit) * 100).toFixed(2) + '%',
      },
      collections: tenant.dataCollections.size,
      webhooks: tenant.webhooks.length,
      apiKeys: tenant.apiKeys.length,
    };
  }

  /**
   * Get audit log for tenant
   * @param {String} tenantId - Tenant ID
   * @param {Number} limit - Result limit
   * @returns {Array} Audit log entries
   */
  getAuditLog(tenantId, limit = 100) {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      throw new Error(`Tenant ${tenantId} not found`);
    }

    return tenant.auditLog.slice(-limit).reverse();
  }

  /**
   * Log audit event
   * @private
   * @param {String} tenantId - Tenant ID
   * @param {String} eventType - Event type
   * @param {Object} details - Event details
   */
  _logAudit(tenantId, eventType, details) {
    const tenant = this.tenants.get(tenantId);
    if (tenant) {
      tenant.auditLog.push({
        timestamp: new Date(),
        eventType,
        details,
        tenantId,
      });
    }
  }

  /**
   * Hash API key
   * @private
   * @param {String} key - API key
   * @returns {String} Hashed key
   */
  _hashKey(key) {
    // Simplified hash - in production use crypto
    return key.substring(0, 10) + '...' + key.substring(key.length - 10);
  }

  /**
   * Sanitize tenant data
   * @private
   * @param {Object} tenant - Tenant object
   * @returns {Object} Sanitized tenant
   */
  _sanitizeTenant(tenant) {
    return {
      tenantId: tenant.tenantId,
      name: tenant.name,
      plan: tenant.plan,
      status: tenant.status,
      createdAt: tenant.createdAt,
      customBranding: tenant.customBranding,
      settings: tenant.settings,
      maxUsers: tenant.maxUsers,
      currentUsers: tenant.currentUsers,
      storageLimit: tenant.storageLimit,
      apiCallsLimit: tenant.apiCallsLimit,
    };
  }

  /**
   * Delete tenant (soft delete)
   * @param {String} tenantId - Tenant ID
   * @returns {Object} Deletion response
   */
  deleteTenant(tenantId) {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      throw new Error(`Tenant ${tenantId} not found`);
    }

    tenant.status = 'deleted';
    tenant.updatedAt = new Date();

    this._logAudit(tenantId, 'tenant_deleted', {
      deletedAt: new Date(),
    });

    return {
      success: true,
      message: `Tenant ${tenantId} marked as deleted`,
      deletedAt: new Date(),
    };
  }

  /**
   * Suspend tenant
   * @param {String} tenantId - Tenant ID
   * @param {String} reason - Suspension reason
   * @returns {Object} Suspension response
   */
  suspendTenant(tenantId, reason) {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      throw new Error(`Tenant ${tenantId} not found`);
    }

    tenant.status = 'suspended';
    tenant.suspensionReason = reason;
    tenant.updatedAt = new Date();

    this._logAudit(tenantId, 'tenant_suspended', {
      reason,
      suspendedAt: new Date(),
    });

    return {
      success: true,
      message: `Tenant ${tenantId} suspended: ${reason}`,
      suspendedAt: new Date(),
    };
  }

  /**
   * List all tenants (for admin)
   * @param {Object} filters - Filter options
   * @returns {Array} Tenant list
   */
  listTenants(filters = {}) {
    const { status = 'active', plan = null, limit = 100 } = filters;

    let tenants = Array.from(this.tenants.values());

    if (status) {
      tenants = tenants.filter(t => t.status === status);
    }

    if (plan) {
      tenants = tenants.filter(t => t.plan === plan);
    }

    return tenants.map(t => this._sanitizeTenant(t)).slice(0, limit);
  }
}

// Tenant Middleware for request isolation
class TenantMiddleware {
  constructor(tenantManager) {
    this.tenantManager = tenantManager;
  }

  /**
   * Middleware to extract and validate tenant from request
   * @returns {Function} Middleware function
   */
  extractTenantMiddleware() {
    return (req, res, next) => {
      // Get tenant from header, subdomain, or body
      const tenantId = req.headers['x-tenant-id'] || req.subdomains[0] || req.body?.tenantId;

      if (!tenantId) {
        return res.status(400).json({
          error: 'Tenant ID required',
          message: 'Provide tenant ID via x-tenant-id header or subdomain',
        });
      }

      try {
        const tenant = this.tenantManager.getTenant(tenantId);
        req.tenant = tenant;
        req.tenantId = tenantId;
        next();
      } catch (error) {
        return res.status(404).json({
          error: 'Tenant not found',
          message: error.message,
        });
      }
    };
  }

  /**
   * Isolate data to tenant
   * @returns {Function} Middleware function
   */
  tenantDataIsolationMiddleware() {
    return (req, res, next) => {
      const originalQuery = req.query;
      const originalBody = req.body;

      // Automatically add tenantId to queries and mutations
      req.query = { ...originalQuery, tenantId: req.tenantId };
      req.body = { ...originalBody, tenantId: req.tenantId };

      // Override res.json to add tenant context
      const originalJson = res.json;
      res.json = function (data) {
        return originalJson.call(this, {
          ...data,
          tenantId: req.tenantId,
          timestamp: new Date().toISOString(),
        });
      };

      next();
    };
  }

  /**
   * Rate limiting per tenant
   * @returns {Function} Middleware function
   */
  tenantRateLimitMiddleware() {
    const requests = new Map();

    return (req, res, next) => {
      const tenantId = req.tenantId;
      const now = Date.now();
      const windowStart = now - 60000; // 1 minute window

      if (!requests.has(tenantId)) {
        requests.set(tenantId, []);
      }

      const tenantRequests = requests.get(tenantId);
      const recentRequests = tenantRequests.filter(time => time > windowStart);

      // Get rate limit from tenant plan
      const tenant = this.tenantManager.getTenant(tenantId);
      const rateLimit = this._getRateLimitForPlan(tenant.plan);

      if (recentRequests.length >= rateLimit) {
        return res.status(429).json({
          error: 'Rate limit exceeded',
          retryAfter: Math.ceil((recentRequests[0] + 60000 - now) / 1000),
          limit: rateLimit,
          window: '1 minute',
        });
      }

      recentRequests.push(now);
      requests.set(tenantId, recentRequests);

      next();
    };
  }

  /**
   * Get rate limit for plan
   * @private
   * @param {String} plan - Plan type
   * @returns {Number} Requests per minute
   */
  _getRateLimitForPlan(plan) {
    const limits = {
      starter: 100,
      professional: 1000,
      enterprise: 10000,
    };
    return limits[plan] || 100;
  }
}

module.exports = {
  TenantManager,
  TenantMiddleware,
};
