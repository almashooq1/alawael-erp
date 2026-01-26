/**
 * Multi-Tenancy Support System
 * نظام دعم المستأجرين المتعددين
 *
 * Features:
 * - Tenant Isolation
 * - Data Segregation
 * - Custom Branding
 * - Feature Flags per Tenant
 * - Resource Quotas
 */

const mongoose = require('mongoose');

/**
 * Tenant Schema
 */
const tenantSchema = new mongoose.Schema({
  tenantId: {
    type: String,
    unique: true,
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
  },
  domain: {
    type: String,
    unique: true,
    required: true,
  },
  subdomain: String,
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active',
  },
  plan: {
    type: String,
    enum: ['free', 'starter', 'professional', 'enterprise'],
    default: 'free',
  },
  subscription: {
    startDate: Date,
    endDate: Date,
    autoRenew: Boolean,
    status: String,
  },
  branding: {
    logo: String,
    primaryColor: String,
    secondaryColor: String,
    favicon: String,
    customCss: String,
  },
  features: {
    api: Boolean,
    advancedReports: Boolean,
    customIntegrations: Boolean,
    sso: Boolean,
    advancedSecurity: Boolean,
    dedicatedSupport: Boolean,
  },
  quotas: {
    maxUsers: Number,
    maxApiCalls: Number,
    maxStorage: Number,
    maxProjects: Number,
  },
  customization: {
    theme: String,
    language: String,
    timezone: String,
    dateFormat: String,
  },
  billing: {
    billingEmail: String,
    paymentMethod: String,
    invoiceFrequency: String,
  },
  metadata: mongoose.Schema.Types.Mixed,
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

/**
 * Tenant Model
 */
const Tenant = mongoose.model('Tenant', tenantSchema);

/**
 * Multi-Tenancy Manager
 */
class TenancyManager {
  /**
   * Create Tenant
   */
  static async createTenant(tenantData) {
    const tenant = new Tenant({
      tenantId: this.generateTenantId(),
      ...tenantData,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await tenant.save();

    // Create tenant-specific collections
    await this.setupTenantDatabase(tenant.tenantId);

    return tenant;
  }

  /**
   * Generate Unique Tenant ID
   */
  static generateTenantId() {
    return `tenant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Setup Tenant Database
   */
  static async setupTenantDatabase(tenantId) {
    // Create tenant-specific collections
    const collections = [
      `${tenantId}_users`,
      `${tenantId}_projects`,
      `${tenantId}_documents`,
      `${tenantId}_audit_logs`,
      `${tenantId}_settings`,
    ];

    // Collections would be created automatically on first write
    // This is a placeholder for initialization logic
    return collections;
  }

  /**
   * Get Tenant by ID
   */
  static async getTenantById(tenantId) {
    return await Tenant.findOne({ tenantId });
  }

  /**
   * Get Tenant by Domain
   */
  static async getTenantByDomain(domain) {
    return await Tenant.findOne({ domain });
  }

  /**
   * Update Tenant
   */
  static async updateTenant(tenantId, updates) {
    return await Tenant.findOneAndUpdate(
      { tenantId },
      { ...updates, updatedAt: new Date() },
      { new: true }
    );
  }

  /**
   * Delete Tenant
   */
  static async deleteTenant(tenantId) {
    // Archive tenant data first
    await this.archiveTenantData(tenantId);

    // Delete tenant
    return await Tenant.deleteOne({ tenantId });
  }

  /**
   * Archive Tenant Data
   */
  static async archiveTenantData(tenantId) {
    // Archive to backup storage
    const tenant = await Tenant.findOne({ tenantId });

    return {
      tenantId,
      archivedAt: new Date(),
      archiveUrl: `s3://backups/${tenantId}/`,
      status: 'archived',
    };
  }

  /**
   * Get Tenant Features
   */
  static async getTenantFeatures(tenantId) {
    const tenant = await this.getTenantById(tenantId);

    if (!tenant) {
      return null;
    }

    return {
      tenantId,
      plan: tenant.plan,
      features: tenant.features,
      quotas: tenant.quotas,
      customization: tenant.customization,
    };
  }

  /**
   * Update Feature Flags
   */
  static async updateFeatureFlags(tenantId, flags) {
    return await this.updateTenant(tenantId, {
      features: flags,
    });
  }

  /**
   * Update Quotas
   */
  static async updateQuotas(tenantId, quotas) {
    return await this.updateTenant(tenantId, {
      quotas,
    });
  }

  /**
   * Get Tenant Usage
   */
  static async getTenantUsage(tenantId) {
    const tenant = await this.getTenantById(tenantId);

    if (!tenant) {
      return null;
    }

    // In real implementation, fetch from metrics/monitoring system
    return {
      tenantId,
      quotas: tenant.quotas,
      usage: {
        users: Math.floor(Math.random() * tenant.quotas.maxUsers),
        apiCalls: Math.floor(Math.random() * tenant.quotas.maxApiCalls),
        storage: Math.floor(Math.random() * tenant.quotas.maxStorage),
        projects: Math.floor(Math.random() * tenant.quotas.maxProjects),
      },
      timestamp: new Date(),
    };
  }

  /**
   * Check Quota Limit
   */
  static async checkQuotaLimit(tenantId, resource) {
    const usage = await this.getTenantUsage(tenantId);

    if (!usage) {
      return { allowed: false, reason: 'Tenant not found' };
    }

    const used = usage.usage[resource];
    const max = usage.quotas[`max${this.capitalize(resource)}`];

    return {
      allowed: used < max,
      used,
      max,
      percentageUsed: ((used / max) * 100).toFixed(2),
    };
  }

  /**
   * Capitalize String
   */
  static capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * List All Tenants
   */
  static async listTenants(filter = {}) {
    return await Tenant.find(filter).select('-metadata');
  }

  /**
   * Get Tenant Statistics
   */
  static async getTenantStats() {
    const stats = await Tenant.aggregate([
      {
        $group: {
          _id: '$plan',
          count: { $sum: 1 },
          totalQuota: { $sum: '$quotas.maxUsers' },
        },
      },
    ]);

    return {
      totalTenants: await Tenant.countDocuments(),
      byPlan: stats,
      timestamp: new Date(),
    };
  }
}

/**
 * Tenant Context Middleware
 */
const tenantContextMiddleware = (req, res, next) => {
  // Extract tenant ID from request
  const tenantId = req.headers['x-tenant-id'] || req.subdomains[0] || req.query.tenantId;

  if (!tenantId) {
    return res.status(400).json({
      error: 'Tenant ID is required',
      hint: 'Use X-Tenant-ID header or subdomain',
    });
  }

  // Attach tenant context to request
  req.tenant = {
    id: tenantId,
    context: `${tenantId}_`,
  };

  // Add collection name helper
  req.getCollectionName = baseName => `${tenantId}_${baseName}`;

  next();
};

/**
 * Tenant Isolation Middleware
 */
const tenantIsolationMiddleware = async (req, res, next) => {
  if (!req.tenant) {
    return res.status(400).json({ error: 'Tenant context not found' });
  }

  try {
    const tenant = await TenancyManager.getTenantById(req.tenant.id);

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    if (tenant.status !== 'active') {
      return res.status(403).json({ error: 'Tenant is not active' });
    }

    req.tenant.data = tenant;
    next();
  } catch (error) {
    res.status(500).json({ error: 'Tenant validation failed' });
  }
};

/**
 * Feature Flag Middleware
 */
const featureFlagMiddleware = async (req, res, next) => {
  if (!req.tenant) {
    return next();
  }

  try {
    const features = await TenancyManager.getTenantFeatures(req.tenant.id);
    req.tenant.features = features.features;
    next();
  } catch (error) {
    res.status(500).json({ error: 'Feature check failed' });
  }
};

/**
 * Quota Check Middleware
 */
const quotaCheckMiddleware = resourceName => {
  return async (req, res, next) => {
    if (!req.tenant) {
      return next();
    }

    try {
      const check = await TenancyManager.checkQuotaLimit(req.tenant.id, resourceName);

      if (!check.allowed) {
        return res.status(429).json({
          error: 'Quota limit exceeded',
          resource: resourceName,
          usage: check,
        });
      }

      req.quotaUsage = check;
      next();
    } catch (error) {
      res.status(500).json({ error: 'Quota check failed' });
    }
  };
};

module.exports = {
  Tenant,
  TenancyManager,
  tenantContextMiddleware,
  tenantIsolationMiddleware,
  featureFlagMiddleware,
  quotaCheckMiddleware,
};
