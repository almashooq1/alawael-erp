/**
 * Multi-Tenancy System - نظام متعدد المستأجرين
 * Enterprise Multi-Tenancy for Alawael ERP
 */

const mongoose = require('mongoose');

/**
 * Tenant Configuration
 */
const tenantConfig = {
  // Tenant isolation strategy
  strategy: 'database', // 'database', 'schema', or 'collection'
  
  // Default tenant settings
  defaults: {
    timezone: 'Asia/Riyadh',
    locale: 'ar-SA',
    currency: 'SAR',
    dateFormat: 'DD/MM/YYYY',
  },
  
  // Tenant limits
  limits: {
    maxUsers: 100,
    maxStorage: 10737418240, // 10GB
    maxApiCalls: 100000,
  },
};

/**
 * Tenant Schema
 */
const TenantSchema = new mongoose.Schema({
  // Tenant Identity
  tenantId: { type: String, required: true, unique: true },
  slug: { type: String, required: true, unique: true },
  name: {
    ar: { type: String, required: true },
    en: { type: String },
  },
  
  // Database Configuration
  database: {
    name: { type: String, required: true },
    connectionString: String,
    prefix: { type: String, default: 'tenant_' },
  },
  
  // Status
  status: {
    type: String,
    enum: ['active', 'suspended', 'trial', 'deleted'],
    default: 'trial',
  },
  
  // Plan
  plan: {
    type: String,
    enum: ['free', 'basic', 'professional', 'enterprise'],
    default: 'free',
  },
  
  // Settings
  settings: {
    timezone: { type: String, default: 'Asia/Riyadh' },
    locale: { type: String, default: 'ar-SA' },
    currency: { type: String, default: 'SAR' },
    dateFormat: { type: String, default: 'DD/MM/YYYY' },
    workingHours: {
      start: { type: String, default: '08:00' },
      end: { type: String, default: '17:00' },
    },
    workingDays: [{ type: Number, default: [0, 1, 2, 3, 4] }], // Sunday to Thursday
  },
  
  // Branding
  branding: {
    logo: String,
    primaryColor: { type: String, default: '#1a73e8' },
    secondaryColor: { type: String, default: '#34a853' },
    customDomain: String,
  },
  
  // Limits
  limits: {
    maxUsers: { type: Number, default: 100 },
    maxStorage: { type: Number, default: 10737418240 }, // 10GB
    maxApiCalls: { type: Number, default: 100000 },
    features: [String],
  },
  
  // Usage
  usage: {
    users: { type: Number, default: 0 },
    storage: { type: Number, default: 0 },
    apiCalls: { type: Number, default: 0 },
    lastReset: { type: Date, default: Date.now },
  },
  
  // Billing
  billing: {
    customerId: String,
    subscriptionId: String,
    paymentMethod: String,
    billingCycle: { type: String, enum: ['monthly', 'yearly'] },
    nextBillingDate: Date,
  },
  
  // Admin
  adminUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
  // Metadata
  metadata: {
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    createdBy: String,
    trialEndsAt: Date,
  },
});

/**
 * Tenant Manager Class
 */
class TenantManager {
  constructor() {
    this.connections = new Map();
    this.currentTenant = null;
    this.Tenant = null;
  }
  
  /**
   * Initialize Tenant Manager
   */
  initialize(connection) {
    this.connection = connection;
    this.Tenant = connection.model('Tenant', TenantSchema);
    console.log('✅ Tenant Manager initialized');
  }
  
  /**
   * Create new tenant
   */
  async createTenant(data) {
    const tenantId = this.generateTenantId();
    const slug = data.slug || this.generateSlug(data.name.en || data.name.ar);
    
    const tenant = new this.Tenant({
      tenantId,
      slug,
      name: data.name,
      database: {
        name: `tenant_${tenantId}`,
        prefix: 'tenant_',
      },
      status: data.status || 'trial',
      plan: data.plan || 'free',
      settings: { ...tenantConfig.defaults, ...data.settings },
      branding: data.branding || {},
      limits: { ...tenantConfig.limits, ...data.limits },
      metadata: {
        createdAt: new Date(),
        createdBy: data.createdBy,
        trialEndsAt: data.trialDays ? new Date(Date.now() + data.trialDays * 86400000) : null,
      },
    });
    
    await tenant.save();
    
    // Create tenant database
    await this.createTenantDatabase(tenant);
    
    console.log(`✅ Tenant created: ${tenantId}`);
    
    return tenant;
  }
  
  /**
   * Get tenant by ID
   */
  async getTenant(tenantId) {
    return this.Tenant.findOne({ tenantId });
  }
  
  /**
   * Get tenant by slug
   */
  async getTenantBySlug(slug) {
    return this.Tenant.findOne({ slug });
  }
  
  /**
   * Create tenant database
   */
  async createTenantDatabase(tenant) {
    const dbName = tenant.database.name;
    const connectionString = this.buildConnectionString(dbName);
    
    const connection = mongoose.createConnection(connectionString);
    
    this.connections.set(tenant.tenantId, connection);
    
    // Initialize tenant schemas
    this.initializeTenantSchemas(connection);
    
    tenant.database.connectionString = connectionString;
    await tenant.save();
    
    console.log(`✅ Tenant database created: ${dbName}`);
    
    return connection;
  }
  
  /**
   * Get tenant connection
   */
  async getTenantConnection(tenantId) {
    if (this.connections.has(tenantId)) {
      return this.connections.get(tenantId);
    }
    
    const tenant = await this.getTenant(tenantId);
    if (!tenant) {
      throw new Error('Tenant not found');
    }
    
    const connection = mongoose.createConnection(tenant.database.connectionString);
    this.connections.set(tenantId, connection);
    
    return connection;
  }
  
  /**
   * Initialize tenant schemas
   */
  initializeTenantSchemas(connection) {
    // Import tenant-specific models
    // These will be created in the tenant's database
    
    const UserSchema = new mongoose.Schema({
      email: { type: String, required: true, unique: true },
      password: { type: String, required: true },
      name: { first: String, last: String },
      role: { type: String, default: 'user' },
      active: { type: Boolean, default: true },
    }, { timestamps: true });
    
    connection.model('User', UserSchema);
    
    // Add more tenant models as needed
  }
  
  /**
   * Build connection string
   */
  buildConnectionString(dbName) {
    const { MONGODB_HOST, MONGODB_PORT, MONGODB_USER, MONGODB_PASSWORD } = process.env;
    
    if (MONGODB_USER && MONGODB_PASSWORD) {
      return `mongodb://${MONGODB_USER}:${MONGODB_PASSWORD}@${MONGODB_HOST}:${MONGODB_PORT}/${dbName}`;
    }
    
    return `mongodb://${MONGODB_HOST || 'localhost'}:${MONGODB_PORT || 27017}/${dbName}`;
  }
  
  /**
   * Generate tenant ID
   */
  generateTenantId() {
    const crypto = require('crypto');
    return `ten_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }
  
  /**
   * Generate slug
   */
  generateSlug(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
  
  /**
   * Update tenant usage
   */
  async updateUsage(tenantId, usage) {
    const tenant = await this.getTenant(tenantId);
    if (!tenant) return;
    
    for (const [key, value] of Object.entries(usage)) {
      if (tenant.usage[key] !== undefined) {
        tenant.usage[key] += value;
      }
    }
    
    await tenant.save();
  }
  
  /**
   * Check tenant limits
   */
  async checkLimit(tenantId, resource) {
    const tenant = await this.getTenant(tenantId);
    if (!tenant) return { exceeded: true };
    
    const usage = tenant.usage[resource] || 0;
    const limit = tenant.limits[`max${resource.charAt(0).toUpperCase() + resource.slice(1)}`];
    
    return {
      exceeded: usage >= limit,
      usage,
      limit,
      remaining: limit - usage,
    };
  }
  
  /**
   * Suspend tenant
   */
  async suspendTenant(tenantId, reason) {
    const tenant = await this.getTenant(tenantId);
    if (!tenant) return;
    
    tenant.status = 'suspended';
    tenant.metadata.suspendedAt = new Date();
    tenant.metadata.suspensionReason = reason;
    
    await tenant.save();
    
    // Close connection
    if (this.connections.has(tenantId)) {
      await this.connections.get(tenantId).close();
      this.connections.delete(tenantId);
    }
    
    console.log(`⚠️ Tenant suspended: ${tenantId}`);
  }
  
  /**
   * Activate tenant
   */
  async activateTenant(tenantId) {
    const tenant = await this.getTenant(tenantId);
    if (!tenant) return;
    
    tenant.status = 'active';
    tenant.metadata.activatedAt = new Date();
    
    await tenant.save();
    
    // Reconnect
    await this.getTenantConnection(tenantId);
    
    console.log(`✅ Tenant activated: ${tenantId}`);
  }
  
  /**
   * Delete tenant
   */
  async deleteTenant(tenantId) {
    const tenant = await this.getTenant(tenantId);
    if (!tenant) return;
    
    // Close connection
    if (this.connections.has(tenantId)) {
      await this.connections.get(tenantId).close();
      this.connections.delete(tenantId);
    }
    
    // Drop database
    if (tenant.database.connectionString) {
      const tempConn = mongoose.createConnection(tenant.database.connectionString);
      await tempConn.dropDatabase();
      await tempConn.close();
    }
    
    // Mark as deleted
    tenant.status = 'deleted';
    tenant.metadata.deletedAt = new Date();
    await tenant.save();
    
    console.log(`🗑️ Tenant deleted: ${tenantId}`);
  }
  
  /**
   * Get all tenants
   */
  async getAllTenants(options = {}) {
    const { status, plan, limit = 100, skip = 0 } = options;
    
    const query = {};
    if (status) query.status = status;
    if (plan) query.plan = plan;
    
    return this.Tenant.find(query)
      .skip(skip)
      .limit(limit)
      .sort({ 'metadata.createdAt': -1 });
  }
  
  /**
   * Get tenant statistics
   */
  async getStats() {
    const total = await this.Tenant.countDocuments();
    const active = await this.Tenant.countDocuments({ status: 'active' });
    const trial = await this.Tenant.countDocuments({ status: 'trial' });
    const suspended = await this.Tenant.countDocuments({ status: 'suspended' });
    
    const byPlan = await this.Tenant.aggregate([
      { $group: { _id: '$plan', count: { $sum: 1 } } },
    ]);
    
    return {
      total,
      active,
      trial,
      suspended,
      byPlan,
      connections: this.connections.size,
    };
  }
}

// Singleton instance
const tenantManager = new TenantManager();

/**
 * Tenant Middleware
 */
const tenantMiddleware = (options = {}) => {
  const {
    header = 'X-Tenant-ID',
    query = 'tenant',
    required = true,
  } = options;
  
  return async (req, res, next) => {
    // Get tenant ID from various sources
    const tenantId = req.get(header) || 
                     req.query[query] || 
                     req.subdomain ||
                     req.user?.tenantId;
    
    if (!tenantId) {
      if (required) {
        return res.status(400).json({
          success: false,
          code: 'TENANT_REQUIRED',
          message: 'Tenant identifier is required',
        });
      }
      return next();
    }
    
    try {
      const tenant = await tenantManager.getTenant(tenantId);
      
      if (!tenant) {
        return res.status(404).json({
          success: false,
          code: 'TENANT_NOT_FOUND',
          message: 'Tenant not found',
        });
      }
      
      if (tenant.status === 'suspended') {
        return res.status(403).json({
          success: false,
          code: 'TENANT_SUSPENDED',
          message: 'Tenant account is suspended',
        });
      }
      
      // Attach tenant to request
      req.tenant = tenant;
      req.tenantConnection = await tenantManager.getTenantConnection(tenantId);
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Tenant-aware Model Factory
 */
const createTenantModel = (name, schema) => {
  return (tenantConnection) => {
    return tenantConnection.model(name, schema);
  };
};

module.exports = {
  TenantManager,
  tenantManager,
  TenantSchema,
  tenantMiddleware,
  createTenantModel,
  tenantConfig,
};