/**
 * Tenant Isolation Service
 * خدمة عزل الالتزامات
 * 
 * المسؤوليات:
 * - فرض عزل البيانات بين الالتزامات
 * - إدارة الفهارس المنفصلة
 * - معالجة النسخ الاحتياطية من الالتزام
 * - تحكم الوصول المتقاطع
 */

const { EventEmitter } = require('events');
const { v4: uuidv4 } = require('uuid');
const Logger = require('../utils/logger');

class TenantIsolationService extends EventEmitter {
  constructor() {
    super();
    this.logger = Logger;

    // Tenant-specific data storage
    this.tenantData = new Map();

    // Tenant-specific indexes
    this.tenantIndexes = new Map();

    // Cross-tenant access logs
    this.crossTenantAccessLog = [];

    // Violation records
    this.violations = [];

    // Statistics
    this.stats = {
      totalDataItems: 0,
      isolationViolations: 0,
      unauthorizedAccesses: 0
    };
  }

  /**
   * Initialize tenant data container
   * تهيئة حاوية بيانات الالتزام
   * 
   * @param {String} tenantId - Tenant ID
   */
  initializeTenantContainer(tenantId) {
    try {
      if (this.tenantData.has(tenantId)) {
        return false; // Already initialized
      }

      this.tenantData.set(tenantId, {
        users: new Map(),
        resources: new Map(),
        documents: new Map(),
        files: new Map(),
        activities: [],
        customData: new Map(),
        createdAt: new Date()
      });

      this.tenantIndexes.set(tenantId, {
        usersByEmail: new Map(),
        resourcesByType: new Map(),
        documentsByName: new Map(),
        createdAt: new Date()
      });

      this.emit('tenant:container_initialized', { tenantId });
      this.logger.info(`Tenant container initialized: ${tenantId}`);

      return true;
    } catch (error) {
      this.logger.error(`Error initializing tenant container: ${error.message}`);
      throw error;
    }
  }

  /**
   * Store tenant data
   * تخزين بيانات الالتزام
   * 
   * Ensures data is stored in tenant-specific container
   * 
   * @param {String} tenantId - Tenant ID
   * @param {String} dataType - Data type (users, resources, documents, etc)
   * @param {String} id - Data ID
   * @param {Object} data - Data object
   */
  storeTenantData(tenantId, dataType, id, data) {
    try {
      const container = this.tenantData.get(tenantId);
      if (!container) {
        throw new Error(`Tenant container not found: ${tenantId}`);
      }

      // Ensure data is tagged with tenant
      const taggedData = {
        ...data,
        tenantId,
        dataType,
        storedAt: new Date()
      };

      // Store in type-specific map
      if (container[dataType]) {
        container[dataType].set(id, taggedData);
      } else {
        container.customData.set(`${dataType}:${id}`, taggedData);
      }

      // Update index if applicable
      this._updateTenantIndex(tenantId, dataType, id, taggedData);

      this.stats.totalDataItems++;
      this.emit('tenant:data_stored', { tenantId, dataType, id });

      return taggedData;
    } catch (error) {
      this.logger.error(`Error storing tenant data: ${error.message}`);
      throw error;
    }
  }

  /**
   * Retrieve tenant data
   * استرجاع بيانات الالتزام
   * 
   * Ensures data belongs to tenant before returning
   * 
   * @param {String} tenantId - Tenant ID
   * @param {String} dataType - Data type
   * @param {String} id - Data ID
   * @returns {Object} Data object
   */
  retrieveTenantData(tenantId, dataType, id) {
    try {
      const container = this.tenantData.get(tenantId);
      if (!container) {
        return null;
      }

      let data;
      if (container[dataType]) {
        data = container[dataType].get(id);
      } else {
        data = container.customData.get(`${dataType}:${id}`);
      }

      // Verify ownership before returning
      if (data && data.tenantId !== tenantId) {
        throw new Error(`Data ownership mismatch: ${id}`);
      }

      return data || null;
    } catch (error) {
      this.logger.error(`Error retrieving tenant data: ${error.message}`);
      return null;
    }
  }

  /**
   * Delete tenant data
   * حذف بيانات الالتزام
   * 
   * @param {String} tenantId - Tenant ID
   * @param {String} dataType - Data type
   * @param {String} id - Data ID
   */
  deleteTenantData(tenantId, dataType, id) {
    try {
      const container = this.tenantData.get(tenantId);
      if (!container) {
        throw new Error(`Tenant container not found: ${tenantId}`);
      }

      let deleted = false;
      if (container[dataType]) {
        deleted = container[dataType].delete(id);
      } else {
        deleted = container.customData.delete(`${dataType}:${id}`);
      }

      if (deleted) {
        this._removeFromTenantIndex(tenantId, dataType, id);
        this.stats.totalDataItems--;
        this.emit('tenant:data_deleted', { tenantId, dataType, id });
      }

      return deleted;
    } catch (error) {
      this.logger.error(`Error deleting tenant data: ${error.message}`);
      throw error;
    }
  }

  /**
   * Query tenant data
   * طلب بيانات الالتزام
   * 
   * @param {String} tenantId - Tenant ID
   * @param {String} dataType - Data type
   * @param {Object} filters - Filters
   * @returns {Array} Matching data
   */
  queryTenantData(tenantId, dataType, filters = {}) {
    try {
      const container = this.tenantData.get(tenantId);
      if (!container) {
        return [];
      }

      let dataMap = container[dataType];
      if (!dataMap) {
        return [];
      }

      let results = Array.from(dataMap.values());

      // Apply filtering
      if (filters.search) {
        const search = filters.search.toLowerCase();
        results = results.filter(item =>
          JSON.stringify(item).toLowerCase().includes(search)
        );
      }

      if (filters.limit) {
        results = results.slice(0, filters.limit);
      }

      return results;
    } catch (error) {
      this.logger.error(`Error querying tenant data: ${error.message}`);
      return [];
    }
  }

  /**
   * Verify cross-tenant access attempt
   * التحقق من محاولة الوصول المتقاطع للالتزام
   * 
   * @param {String} requestedTenantId - Requested tenant ID
   * @param {String} actualTenantId - Actual tenant ID from data
   * @param {String} userId - User ID
   * @returns {Boolean} Access allowed
   */
  verifyCrossTenantAccess(requestedTenantId, actualTenantId, userId) {
    try {
      if (requestedTenantId === actualTenantId) {
        return true; // Same tenant, allowed
      }

      // Cross-tenant access attempt - log and deny
      const violation = {
        id: `violation-${uuidv4()}`,
        timestamp: new Date(),
        requestedTenantId,
        actualTenantId,
        userId,
        severity: 'HIGH'
      };

      this.violations.push(violation);
      this.stats.unauthorizedAccesses++;
      this.stats.isolationViolations++;

      this.emit('tenant:isolation_violation', violation);
      this.logger.warn(
        `Cross-tenant access violation: ${userId} tried to access ${actualTenantId} but is in ${requestedTenantId}`
      );

      return false;
    } catch (error) {
      this.logger.error(`Error verifying cross-tenant access: ${error.message}`);
      return false;
    }
  }

  /**
   * Get tenant isolation report
   * الحصول على تقرير عزل الالتزام
   * 
   * @param {String} tenantId - Tenant ID
   * @returns {Object} Isolation report
   */
  getTenantIsolationReport(tenantId) {
    try {
      const container = this.tenantData.get(tenantId);
      if (!container) {
        return null;
      }

      let totalItems = 0;
      const breakdown = {};

      Object.keys(container).forEach(key => {
        if (key !== 'activities' && key !== 'customData' && container[key] instanceof Map) {
          breakdown[key] = container[key].size;
          totalItems += container[key].size;
        }
      });

      if (container.customData) {
        breakdown.customData = container.customData.size;
        totalItems += container.customData.size;
      }

      return {
        tenantId,
        totalItems,
        breakdown,
        containerCreatedAt: container.createdAt,
        lastModified: new Date()
      };
    } catch (error) {
      this.logger.error(`Error getting isolation report: ${error.message}`);
      return null;
    }
  }

  /**
   * Clean up tenant data
   * تنظيف بيانات الالتزام
   * 
   * Completely removes tenant's data
   * 
   * @param {String} tenantId - Tenant ID
   */
  cleanupTenantData(tenantId) {
    try {
      // Archive before deletion
      const container = this.tenantData.get(tenantId);
      if (container) {
        const archive = {
          tenantId,
          archivedAt: new Date(),
          itemCount: this._countTenantItems(tenantId)
        };

        this.emit('tenant:data_archived', archive);
      }

      // Delete all tenant data
      this.tenantData.delete(tenantId);
      this.tenantIndexes.delete(tenantId);

      // Log cleanup
      const cleanupLog = {
        tenantId,
        action: 'cleanup',
        timestamp: new Date()
      };

      this.crossTenantAccessLog.push(cleanupLog);
      this.logger.info(`Tenant data cleaned up: ${tenantId}`);

      this.emit('tenant:cleanup_complete', { tenantId });
    } catch (error) {
      this.logger.error(`Error cleaning up tenant data: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update tenant index
   * تحديث فهرس الالتزام
   * 
   * @private
   */
  _updateTenantIndex(tenantId, dataType, id, data) {
    try {
      const index = this.tenantIndexes.get(tenantId);
      if (!index) return;

      // Index by email for users
      if (dataType === 'users' && data.email) {
        index.usersByEmail.set(data.email, id);
      }

      // Index by type for resources
      if (dataType === 'resources' && data.resourceType) {
        if (!index.resourcesByType.has(data.resourceType)) {
          index.resourcesByType.set(data.resourceType, []);
        }
        index.resourcesByType.get(data.resourceType).push(id);
      }

      // Index by name for documents
      if (dataType === 'documents' && data.name) {
        index.documentsByName.set(data.name, id);
      }
    } catch (error) {
      this.logger.error(`Error updating tenant index: ${error.message}`);
    }
  }

  /**
   * Remove from tenant index
   * إزالة من فهرس الالتزام
   * 
   * @private
   */
  _removeFromTenantIndex(tenantId, dataType, id) {
    try {
      const index = this.tenantIndexes.get(tenantId);
      if (!index) return;

      // Remove from user index
      if (dataType === 'users') {
        index.usersByEmail.forEach((value, key) => {
          if (value === id) {
            index.usersByEmail.delete(key);
          }
        });
      }

      // Remove from resource index
      if (dataType === 'resources') {
        index.resourcesByType.forEach(list => {
          const idx = list.indexOf(id);
          if (idx > -1) {
            list.splice(idx, 1);
          }
        });
      }
    } catch (error) {
      this.logger.error(`Error removing from index: ${error.message}`);
    }
  }

  /**
   * Count tenant items
   * عد عناصر الالتزام
   * 
   * @private
   */
  _countTenantItems(tenantId) {
    try {
      const container = this.tenantData.get(tenantId);
      if (!container) return 0;

      let count = 0;
      Object.values(container).forEach(map => {
        if (map instanceof Map) {
          count += map.size;
        }
      });

      return count;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get isolation statistics
   * الحصول على إحصائيات العزل
   * 
   * @returns {Object} Statistics
   */
  getStatistics() {
    return {
      totalTenants: this.tenantData.size,
      totalDataItems: this.stats.totalDataItems,
      isolationViolations: this.stats.isolationViolations,
      unauthorizedAccesses: this.stats.unauthorizedAccesses,
      cachedIndexes: this.tenantIndexes.size,
      averageItemsPerTenant: this.tenantData.size > 0
        ? Math.floor(this.stats.totalDataItems / this.tenantData.size)
        : 0
    };
  }
}

module.exports = new TenantIsolationService();
