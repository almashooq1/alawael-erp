/**
 * Tenant Service
 * خدمة الالتزامات
 * 
 * المسؤوليات:
 * - إدارة الالتزامات
 * - إنشاء ومعالجة الالتزامات
 * - إدارة بيانات الالتزام
 * - تتبع استخدام الموارد
 */

const { EventEmitter } = require('events');
const { v4: uuidv4 } = require('uuid');
const Logger = require('../utils/logger');

class TenantService extends EventEmitter {
  constructor() {
    super();
    this.logger = Logger;

    // Tenant storage
    this.tenants = new Map();

    // Tenant-user mapping
    this.tenantUsers = new Map();

    // Tenant settings
    this.tenantSettings = new Map();

    // Tenant quotas
    this.tenantQuotas = new Map();

    // Tenant status tracking
    this.tenantStatus = new Map();

    // Statistics
    this.stats = {
      totalTenants: 0,
      activeTenants: 0,
      suspendedTenants: 0,
      totalUsers: 0,
      totalStorage: 0
    };

    this._initializeDefaults();
  }

  /**
   * Initialize default settings
   * تهيئة الإعدادات الافتراضية
   * 
   * @private
   */
  _initializeDefaults() {
    // Default quota plans
    this.quotaPlans = new Map([
      ['starter', {
        name: 'Starter Plan',
        maxUsers: 10,
        storageGB: 10,
        apiCallsPerDay: 10000,
        monthlyPrice: 29,
        features: ['basic_access', 'limited_api', 'community_support']
      }],
      ['professional', {
        name: 'Professional Plan',
        maxUsers: 100,
        storageGB: 100,
        apiCallsPerDay: 100000,
        monthlyPrice: 99,
        features: ['full_access', 'advanced_api', 'email_support', 'sso']
      }],
      ['enterprise', {
        name: 'Enterprise Plan',
        maxUsers: 10000,
        storageGB: 10000,
        apiCallsPerDay: 10000000,
        monthlyPrice: 999,
        features: ['full_access', 'unlimited_api', 'priority_support', 'sso', 'custom_features', 'dedicated_infrastructure']
      }]
    ]);
  }

  /**
   * Create a new tenant
   * إنشاء التزام جديد
   * 
   * @param {Object} tenantData - Tenant data
   * @returns {Object} Created tenant
   */
  createTenant(tenantData) {
    try {
      const {
        name,
        slug,
        email,
        planType = 'starter',
        subdomain,
        metadata = {}
      } = tenantData;

      if (!name || !slug || !email) {
        throw new Error('Name, slug, and email are required');
      }

      // Check duplicate slug
      if (Array.from(this.tenants.values()).some(t => t.slug === slug)) {
        throw new Error(`Tenant slug already exists: ${slug}`);
      }

      const tenantId = `tenant-${uuidv4()}`;
      const plan = this.quotaPlans.get(planType);

      if (!plan) {
        throw new Error(`Unknown plan type: ${planType}`);
      }

      const tenant = {
        id: tenantId,
        name,
        slug,
        email,
        planType,
        subdomain: subdomain || `${slug}.app`,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {
          ...metadata,
          createdBy: metadata.userId,
          timezone: metadata.timezone || 'UTC',
          language: metadata.language || 'en'
        }
      };

      this.tenants.set(tenantId, tenant);
      this.tenantSettings.set(tenantId, this._defaultSettings());
      this.tenantQuotas.set(tenantId, {
        ...plan,
        usedStorage: 0,
        usedUsers: 0,
        usedApiCalls: 0,
        lastResetDate: new Date()
      });
      this.tenantStatus.set(tenantId, {
        isActive: true,
        lastActivityDate: new Date(),
        loginCount: 0,
        failedLoginCount: 0
      });

      this.stats.totalTenants++;
      this.stats.activeTenants++;

      this.emit('tenant:created', { tenantId, tenant });
      this.logger.info(`Tenant created: ${tenantId} (${name})`);

      return tenant;
    } catch (error) {
      this.logger.error(`Error creating tenant: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get default tenant settings
   * الحصول على إعدادات الالتزام الافتراضية
   * 
   * @private
   */
  _defaultSettings() {
    return {
      brandingColor: '#3498db',
      logo: null,
      favicon: null,
      emailFrom: 'noreply@app.local',
      smtpEnabled: false,
      twoFactorRequired: false,
      passwordPolicy: {
        minLength: 8,
        requireUppercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
        expiryDays: 90
      },
      sessionTimeout: 3600, // 1 hour
      dataRetention: 365, // 1 year
      backupEnabled: true,
      auditLoggingEnabled: true,
      apiRateLimitEnabled: true
    };
  }

  /**
   * Get tenant by ID
   * الحصول على الالتزام حسب الهوية
   * 
   * @param {String} tenantId - Tenant ID
   * @returns {Object} Tenant
   */
  getTenant(tenantId) {
    try {
      return this.tenants.get(tenantId);
    } catch (error) {
      this.logger.error(`Error getting tenant: ${error.message}`);
      return null;
    }
  }

  /**
   * Get tenant by slug
   * الحصول على الالتزام حسب الخاصية
   * 
   * @param {String} slug - Tenant slug
   * @returns {Object} Tenant
   */
  getTenantBySlug(slug) {
    try {
      return Array.from(this.tenants.values()).find(t => t.slug === slug);
    } catch (error) {
      this.logger.error(`Error getting tenant by slug: ${error.message}`);
      return null;
    }
  }

  /**
   * Update tenant
   * تحديث الالتزام
   * 
   * @param {String} tenantId - Tenant ID
   * @param {Object} updates - Updates
   */
  updateTenant(tenantId, updates) {
    try {
      const tenant = this.tenants.get(tenantId);
      if (!tenant) throw new Error(`Tenant not found: ${tenantId}`);

      Object.assign(tenant, updates);
      tenant.updatedAt = new Date();

      this.emit('tenant:updated', { tenantId, updates });
      this.logger.info(`Tenant updated: ${tenantId}`);
    } catch (error) {
      this.logger.error(`Error updating tenant: ${error.message}`);
      throw error;
    }
  }

  /**
   * Suspend tenant
   * إيقاف الالتزام
   * 
   * @param {String} tenantId - Tenant ID
   * @param {String} reason - Suspension reason
   */
  suspendTenant(tenantId, reason) {
    try {
      const tenant = this.tenants.get(tenantId);
      if (!tenant) throw new Error(`Tenant not found: ${tenantId}`);

      tenant.status = 'suspended';
      tenant.suspensionReason = reason;
      tenant.suspendedAt = new Date();

      this.stats.activeTenants--;
      this.stats.suspendedTenants++;

      this.emit('tenant:suspended', { tenantId, reason });
      this.logger.warn(`Tenant suspended: ${tenantId} - ${reason}`);
    } catch (error) {
      this.logger.error(`Error suspending tenant: ${error.message}`);
      throw error;
    }
  }

  /**
   * Reactivate tenant
   * إعادة تفعيل الالتزام
   * 
   * @param {String} tenantId - Tenant ID
   */
  reactivateTenant(tenantId) {
    try {
      const tenant = this.tenants.get(tenantId);
      if (!tenant) throw new Error(`Tenant not found: ${tenantId}`);

      tenant.status = 'active';
      tenant.suspensionReason = null;
      tenant.suspendedAt = null;

      this.stats.activeTenants++;
      this.stats.suspendedTenants--;

      this.emit('tenant:reactivated', { tenantId });
      this.logger.info(`Tenant reactivated: ${tenantId}`);
    } catch (error) {
      this.logger.error(`Error reactivating tenant: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete tenant
   * حذف الالتزام
   * 
   * @param {String} tenantId - Tenant ID
   */
  deleteTenant(tenantId) {
    try {
      const tenant = this.tenants.get(tenantId);
      if (!tenant) throw new Error(`Tenant not found: ${tenantId}`);

      // Archive tenant data
      tenant.archivedAt = new Date();
      tenant.status = 'archived';

      this.stats.totalTenants--;
      if (tenant.status === 'active') {
        this.stats.activeTenants--;
      }

      this.emit('tenant:archived', { tenantId });
      this.logger.info(`Tenant archived: ${tenantId}`);
    } catch (error) {
      this.logger.error(`Error deleting tenant: ${error.message}`);
      throw error;
    }
  }

  /**
   * Add user to tenant
   * إضافة مستخدم للالتزام
   * 
   * @param {String} tenantId - Tenant ID
   * @param {String} userId - User ID
   * @param {String} role - User role in tenant
   */
  addUserToTenant(tenantId, userId, role = 'member') {
    try {
      const tenant = this.tenants.get(tenantId);
      if (!tenant) throw new Error(`Tenant not found: ${tenantId}`);

      const quota = this.tenantQuotas.get(tenantId);
      if (quota.usedUsers >= quota.maxUsers) {
        throw new Error(`User limit reached for tenant: ${tenantId}`);
      }

      if (!this.tenantUsers.has(tenantId)) {
        this.tenantUsers.set(tenantId, new Map());
      }

      this.tenantUsers.get(tenantId).set(userId, {
        role,
        addedAt: new Date(),
        lastActivity: new Date()
      });

      quota.usedUsers++;
      this.stats.totalUsers++;

      this.emit('tenant:user_added', { tenantId, userId, role });
      this.logger.info(`User ${userId} added to tenant ${tenantId}`);
    } catch (error) {
      this.logger.error(`Error adding user to tenant: ${error.message}`);
      throw error;
    }
  }

  /**
   * Remove user from tenant
   * إزالة مستخدم من الالتزام
   * 
   * @param {String} tenantId - Tenant ID
   * @param {String} userId - User ID
   */
  removeUserFromTenant(tenantId, userId) {
    try {
      const users = this.tenantUsers.get(tenantId);
      if (!users || !users.has(userId)) {
        throw new Error(`User not found in tenant: ${tenantId}`);
      }

      users.delete(userId);

      const quota = this.tenantQuotas.get(tenantId);
      if (quota) {
        quota.usedUsers--;
        this.stats.totalUsers--;
      }

      this.emit('tenant:user_removed', { tenantId, userId });
      this.logger.info(`User ${userId} removed from tenant ${tenantId}`);
    } catch (error) {
      this.logger.error(`Error removing user from tenant: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get tenant users
   * الحصول على مستخدمي الالتزام
   * 
   * @param {String} tenantId - Tenant ID
   * @returns {Array} Users
   */
  getTenantUsers(tenantId) {
    try {
      const users = this.tenantUsers.get(tenantId) || new Map();
      return Array.from(users.entries()).map(([userId, data]) => ({
        userId,
        ...data
      }));
    } catch (error) {
      this.logger.error(`Error getting tenant users: ${error.message}`);
      return [];
    }
  }

  /**
   * Get user tenants
   * الحصول على التزامات المستخدم
   * 
   * @param {String} userId - User ID
   * @returns {Array} Tenants
   */
  getUserTenants(userId) {
    try {
      const userTenants = [];
      this.tenantUsers.forEach((users, tenantId) => {
        if (users.has(userId)) {
          const tenant = this.tenants.get(tenantId);
          userTenants.push({
            ...tenant,
            role: users.get(userId).role
          });
        }
      });
      return userTenants;
    } catch (error) {
      this.logger.error(`Error getting user tenants: ${error.message}`);
      return [];
    }
  }

  /**
   * Update tenant settings
   * تحديث إعدادات الالتزام
   * 
   * @param {String} tenantId - Tenant ID
   * @param {Object} settings - Settings
   */
  updateTenantSettings(tenantId, settings) {
    try {
      const tenant = this.tenants.get(tenantId);
      if (!tenant) throw new Error(`Tenant not found: ${tenantId}`);

      const currentSettings = this.tenantSettings.get(tenantId);
      Object.assign(currentSettings, settings);

      this.emit('tenant:settings_updated', { tenantId, settings });
      this.logger.info(`Tenant settings updated: ${tenantId}`);
    } catch (error) {
      this.logger.error(`Error updating tenant settings: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get tenant settings
   * الحصول على إعدادات الالتزام
   * 
   * @param {String} tenantId - Tenant ID
   * @returns {Object} Settings
   */
  getTenantSettings(tenantId) {
    try {
      return this.tenantSettings.get(tenantId);
    } catch (error) {
      this.logger.error(`Error getting tenant settings: ${error.message}`);
      return null;
    }
  }

  /**
   * Get tenant quota usage
   * الحصول على استخدام حصة الالتزام
   * 
   * @param {String} tenantId - Tenant ID
   * @returns {Object} Quota info
   */
  getTenantQuota(tenantId) {
    try {
      const quota = this.tenantQuotas.get(tenantId);
      if (!quota) return null;

      return {
        ...quota,
        userUsagePercent: (quota.usedUsers / quota.maxUsers * 100).toFixed(2),
        storageUsagePercent: (quota.usedStorage / quota.storageGB * 100).toFixed(2),
        apiUsagePercent: (quota.usedApiCalls / quota.apiCallsPerDay * 100).toFixed(2)
      };
    } catch (error) {
      this.logger.error(`Error getting tenant quota: ${error.message}`);
      return null;
    }
  }

  /**
   * Record API call
   * تسجيل استدعاء واجهة برمجية
   * 
   * @param {String} tenantId - Tenant ID
   */
  recordApiCall(tenantId) {
    try {
      const quota = this.tenantQuotas.get(tenantId);
      if (quota) {
        quota.usedApiCalls++;
      }
    } catch (error) {
      this.logger.error(`Error recording API call: ${error.message}`);
    }
  }

  /**
   * Record storage usage
   * تسجيل استخدام التخزين
   * 
   * @param {String} tenantId - Tenant ID
   * @param {Number} sizeGB - Size in GB
   */
  recordStorageUsage(tenantId, sizeGB) {
    try {
      const quota = this.tenantQuotas.get(tenantId);
      if (quota) {
        quota.usedStorage += sizeGB;
      }
    } catch (error) {
      this.logger.error(`Error recording storage usage: ${error.message}`);
    }
  }

  /**
   * Get all tenants
   * الحصول على جميع الالتزامات
   * 
   * @param {Object} filters - Filters
   * @returns {Array} Tenants
   */
  getAllTenants(filters = {}) {
    try {
      let tenants = Array.from(this.tenants.values());

      if (filters.status) {
        tenants = tenants.filter(t => t.status === filters.status);
      }

      if (filters.planType) {
        tenants = tenants.filter(t => t.planType === filters.planType);
      }

      if (filters.search) {
        const search = filters.search.toLowerCase();
        tenants = tenants.filter(
          t =>
            t.name.toLowerCase().includes(search) ||
            t.slug.toLowerCase().includes(search) ||
            t.email.toLowerCase().includes(search)
        );
      }

      return tenants;
    } catch (error) {
      this.logger.error(`Error getting all tenants: ${error.message}`);
      return [];
    }
  }

  /**
   * Get statistics
   * الحصول على الإحصائيات
   * 
   * @returns {Object} Statistics
   */
  getStatistics() {
    return {
      totalTenants: this.tenants.size,
      activeTenants: Array.from(this.tenants.values()).filter(t => t.status === 'active').length,
      suspendedTenants: Array.from(this.tenants.values()).filter(t => t.status === 'suspended').length,
      archivedTenants: Array.from(this.tenants.values()).filter(t => t.status === 'archived').length,
      totalUsers: this._countAllUsers(),
      averageUsersPerTenant: this._calculateAverageUsers(),
      planDistribution: this._getPlanDistribution()
    };
  }

  /**
   * Count all users across tenants
   * عد جميع المستخدمين في جميع الالتزامات
   * 
   * @private
   */
  _countAllUsers() {
    let count = 0;
    this.tenantUsers.forEach(users => {
      count += users.size;
    });
    return count;
  }

  /**
   * Calculate average users per tenant
   * حساب متوسط المستخدمين لكل التزام
   * 
   * @private
   */
  _calculateAverageUsers() {
    const totalUsers = this._countAllUsers();
    return this.tenants.size > 0 ? (totalUsers / this.tenants.size).toFixed(2) : 0;
  }

  /**
   * Get plan distribution
   * الحصول على توزيع الخطط
   * 
   * @private
   */
  _getPlanDistribution() {
    const distribution = {};
    this.tenants.forEach(tenant => {
      distribution[tenant.planType] = (distribution[tenant.planType] || 0) + 1;
    });
    return distribution;
  }
}

module.exports = new TenantService();
