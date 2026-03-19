/**
 * Tenant Resolver Service
 * خدمة حل الالتزامات
 * 
 * المسؤوليات:
 * - حل الالتزامات من الطلبات
 * - عزل بيانات الالتزام
 * - إدارة سياق الالتزام
 * - التحقق من وصول الالتزام
 */

const { EventEmitter } = require('events');
const Logger = require('../utils/logger');

class TenantResolverService extends EventEmitter {
  constructor() {
    super();
    this.logger = Logger;

    // Context storage (tenant-request mapping)
    this.requestContext = new Map();

    // Tenant cache
    this.tenantCache = new Map();

    // Cache TTL: 5 minutes
    this.cacheTTL = 5 * 60 * 1000;
  }

  /**
   * Resolve tenant from request
   * حل الالتزام من الطلب
   * 
   * Tries to resolve tenant from:
   * 1. X-Tenant-ID header
   * 2. Subdomain
   * 3. User's primary tenant
   * 
   * @param {Object} req - Express request
   * @returns {Object} Tenant or null
   */
  resolveTenant(req) {
    try {
      let tenant = null;

      // 1. Check X-Tenant-ID header
      const headerTenantId = req.headers['x-tenant-id'];
      if (headerTenantId) {
        tenant = this._getCachedOrFetch('id', headerTenantId);
        if (tenant && this._canUserAccessTenant(req.user?.id, tenant.id)) {
          return tenant;
        }
      }

      // 2. Check subdomain
      const subdomain = this._extractSubdomain(req);
      if (subdomain && subdomain !== 'www' && subdomain !== 'api') {
        tenant = this._getCachedOrFetch('subdomain', subdomain);
        if (tenant && this._canUserAccessTenant(req.user?.id, tenant.id)) {
          return tenant;
        }
      }

      // 3. Check hostname-based routing
      const hostname = req.hostname;
      tenant = this._resolveTenantFromHostname(hostname);
      if (tenant && this._canUserAccessTenant(req.user?.id, tenant.id)) {
        return tenant;
      }

      // 4. Use user's primary tenant
      if (req.user?.id) {
        const userTenants = tenantService.getUserTenants(req.user.id);
        if (userTenants.length > 0) {
          return userTenants[0]; // Primary tenant
        }
      }

      return null;
    } catch (error) {
      this.logger.error(`Error resolving tenant: ${error.message}`);
      return null;
    }
  }

  /**
   * Extract subdomain from request
   * استخراج النطاق الفرعي من الطلب
   * 
   * @private
   */
  _extractSubdomain(req) {
    try {
      const hostname = req.hostname;
      const parts = hostname.split('.');

      // localhost:3000 has no subdomain
      if (parts.length <= 1 || hostname.includes(':')) {
        return null;
      }

      // For example.com, return 'example'
      // For tenant.example.com, return 'tenant'
      return parts[0];
    } catch (error) {
      return null;
    }
  }

  /**
   * Resolve tenant from hostname
   * حل الالتزام من اسم المضيف
   * 
   * @private
   */
  _resolveTenantFromHostname(hostname) {
    try {
      // Check if it's a tenant subdomain
      const tenants = tenantService.getAllTenants();
      return tenants.find(t => t.subdomain === hostname);
    } catch (error) {
      return null;
    }
  }

  /**
   * Get cached or fetch tenant
   * الحصول على الالتزام المخزن مؤقتًا أو جلبه
   * 
   * @private
   */
  _getCachedOrFetch(type, value) {
    try {
      const cacheKey = `${type}:${value}`;

      // Check cache
      const cached = this.tenantCache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        return cached.tenant;
      }

      // Fetch from service
      let tenant;
      if (type === 'id') {
        tenant = tenantService.getTenant(value);
      } else if (type === 'subdomain') {
        tenant = tenantService.getTenantBySlug(value);
      }

      // Cache result
      if (tenant) {
        this.tenantCache.set(cacheKey, {
          tenant,
          expiresAt: Date.now() + this.cacheTTL
        });
      }

      return tenant;
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if user can access tenant
   * التحقق من إمكانية وصول المستخدم للالتزام
   * 
   * @private
   */
  _canUserAccessTenant(userId, tenantId) {
    try {
      if (!userId) return false;

      const users = tenantService.tenantUsers.get(tenantId);
      return users ? users.has(userId) : false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Set request tenant context
   * تعيين سياق الالتزام للطلب
   * 
   * @param {Object} req - Express request
   * @param {Object} tenant - Tenant object
   */
  setTenantContext(req, tenant) {
    try {
      const requestId = req.id || `${Date.now()}-${Math.random()}`;

      req.tenant = tenant;
      req.tenantId = tenant?.id;

      this.requestContext.set(requestId, {
        tenantId: tenant?.id,
        userId: req.user?.id,
        timestamp: new Date(),
        method: req.method,
        path: req.path
      });

      this.emit('tenant:context_set', { requestId, tenantId: tenant?.id });
    } catch (error) {
      this.logger.error(`Error setting tenant context: ${error.message}`);
    }
  }

  /**
   * Build tenant-scoped query
   * بناء استعلام نطاقه الالتزام
   * 
   * Automatically adds tenantId filter to MongoDB queries
   * 
   * @param {String} tenantId - Tenant ID
   * @param {Object} baseQuery - Base query
   * @returns {Object} Tenant-scoped query
   */
  buildTenantQuery(tenantId, baseQuery = {}) {
    try {
      return {
        ...baseQuery,
        tenantId: tenantId
      };
    } catch (error) {
      this.logger.error(`Error building tenant query: ${error.message}`);
      return baseQuery;
    }
  }

  /**
   * Validate tenant access
   * التحقق من وصول الالتزام
   * 
   * @param {Object} req - Express request
   * @returns {Boolean} Can access
   */
  canAccessTenant(req) {
    try {
      const tenant = req.tenant;
      const userId = req.user?.id;

      if (!tenant || !userId) {
        return false;
      }

      if (tenant.status !== 'active') {
        return false;
      }

      // Check if user belongs to tenant
      const users = tenantService.tenantUsers.get(tenant.id);
      if (!users || !users.has(userId)) {
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error(`Error validating tenant access: ${error.message}`);
      return false;
    }
  }

  /**
   * Get tenant resources
   * الحصول على موارد الالتزام
   * 
   * Returns all resources (filtered by tenant)
   * 
   * @param {String} tenantId - Tenant ID
   * @param {String} resourceType - Resource type
   * @param {Object} filters - Filters
   * @returns {Array} Resources
   */
  getTenantResources(tenantId, resourceType, filters = {}) {
    try {
      const tenantQuery = this.buildTenantQuery(tenantId, filters);

      // This would be called on actual database queries
      // For now, return structured query
      return {
        tenantId,
        resourceType,
        query: tenantQuery
      };
    } catch (error) {
      this.logger.error(`Error getting tenant resources: ${error.message}`);
      return [];
    }
  }

  /**
   * Check quota
   * التحقق من الحصة
   * 
   * @param {String} tenantId - Tenant ID
   * @param {String} quotaType - quota type (users, storage, api)
   * @returns {Boolean} Within quota
   */
  checkQuota(tenantId, quotaType = 'api') {
    try {
      const quota = tenantService.getTenantQuota(tenantId);
      if (!quota) return false;

      switch (quotaType) {
        case 'users':
          return quota.usedUsers < quota.maxUsers;
        case 'storage':
          return quota.usedStorage < quota.storageGB;
        case 'api':
          return quota.usedApiCalls < quota.apiCallsPerDay;
        default:
          return true;
      }
    } catch (error) {
      this.logger.error(`Error checking quota: ${error.message}`);
      return false;
    }
  }

  /**
   * Get tenant user role
   * الحصول على دور مستخدم الالتزام
   * 
   * @param {String} tenantId - Tenant ID
   * @param {String} userId - User ID
   * @returns {String} User role
   */
  getTenantUserRole(tenantId, userId) {
    try {
      const users = tenantService.tenantUsers.get(tenantId);
      if (!users) return null;

      const userData = users.get(userId);
      return userData ? userData.role : null;
    } catch (error) {
      this.logger.error(`Error getting user role: ${error.message}`);
      return null;
    }
  }

  /**
   * Check tenant permission
   * التحقق من إذن الالتزام
   * 
   * @param {String} tenantId - Tenant ID
   * @param {String} userId - User ID
   * @param {String} permission - Permission
   * @returns {Boolean} Has permission
   */
  hasTenantPermission(tenantId, userId, permission) {
    try {
      const role = this.getTenantUserRole(tenantId, userId);
      if (!role) return false;

      // Role-based permission mapping
      const rolePermissions = {
        owner: ['*'],
        admin: ['read', 'write', 'delete', 'manage_users'],
        manager: ['read', 'write', 'manage_own_data'],
        member: ['read', 'write_own_data'],
        viewer: ['read']
      };

      const permissions = rolePermissions[role] || [];
      return permissions.includes('*') || permissions.includes(permission);
    } catch (error) {
      this.logger.error(`Error checking permission: ${error.message}`);
      return false;
    }
  }

  /**
   * Clear expired cache
   * تنظيف الذاكرة المؤقتة المنتهية الصلاحية
   * 
   * @private
   */
  clearExpiredCache() {
    try {
      const now = Date.now();
      const toDelete = [];

      this.tenantCache.forEach((value, key) => {
        if (value.expiresAt <= now) {
          toDelete.push(key);
        }
      });

      toDelete.forEach(key => this.tenantCache.delete(key));

      if (toDelete.length > 0) {
        this.logger.info(`Cleared ${toDelete.length} expired tenant cache entries`);
      }
    } catch (error) {
      this.logger.error(`Error clearing cache: ${error.message}`);
    }
  }

  /**
   * Start cache cleanup interval
   * بدء فترة تنظيف الذاكرة المؤقتة
   */
  startCacheCleanup() {
    setInterval(() => {
      this.clearExpiredCache();
    }, 60 * 1000); // Every minute
  }

  /**
   * Get statistics
   * الحصول على الإحصائيات
   * 
   * @returns {Object} Statistics
   */
  getStatistics() {
    return {
      cachedTenants: this.tenantCache.size,
      requestContexts: this.requestContext.size,
      cacheHitRate: this._calculateCacheHitRate()
    };
  }

  /**
   * Calculate cache hit rate
   * حساب معدل الإصابة في الذاكرة المؤقتة
   * 
   * @private
   */
  _calculateCacheHitRate() {
    // Placeholder - would track hits/misses in production
    return '0.00%';
  }
}

module.exports = new TenantResolverService();
