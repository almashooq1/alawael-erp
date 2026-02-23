/**
 * Audit Trail System - نظام تتبع التدقيق
 * Comprehensive Audit Logging for Alawael ERP
 */

const mongoose = require('mongoose');

/**
 * Audit Log Schema
 */
const AuditLogSchema = new mongoose.Schema({
  // Event Identity
  auditId: { type: String, required: true, unique: true },
  
  // Who performed the action
  actor: {
    userId: { type: String, index: true },
    email: String,
    name: String,
    role: String,
    ip: String,
    userAgent: String,
  },
  
  // What action was performed
  action: {
    type: { type: String, required: true, index: true },
    category: { type: String, index: true },
    description: String,
    status: { type: String, enum: ['success', 'failure', 'pending'], default: 'success' },
  },
  
  // What was affected
  resource: {
    type: { type: String, required: true, index: true },
    id: { type: String, required: true, index: true },
    name: String,
  },
  
  // Where it happened
  context: {
    tenantId: { type: String, index: true },
    organizationId: String,
    departmentId: String,
    module: String,
    route: String,
    method: String,
  },
  
  // Changes made
  changes: {
    before: mongoose.Schema.Types.Mixed,
    after: mongoose.Schema.Types.Mixed,
    diff: mongoose.Schema.Types.Mixed,
  },
  
  // When it happened
  timestamp: { type: Date, default: Date.now, index: true },
  
  // Additional metadata
  metadata: {
    correlationId: String,
    requestId: String,
    sessionId: String,
    duration: Number,
    errorMessage: String,
    additionalData: mongoose.Schema.Types.Mixed,
  },
  
  // Retention
  retentionPeriod: { type: Number, default: 2555 }, // 7 years in days
  expiresAt: { type: Date, index: { expires: '0s' } },
}, {
  collection: 'audit_logs',
  timestamps: false,
});

// Compound indexes
AuditLogSchema.index({ 'actor.userId': 1, timestamp: -1 });
AuditLogSchema.index({ 'resource.type': 1, 'resource.id': 1, timestamp: -1 });
AuditLogSchema.index({ 'action.type': 1, timestamp: -1 });
AuditLogSchema.index({ 'context.tenantId': 1, timestamp: -1 });

// Set expiration
AuditLogSchema.pre('save', function(next) {
  if (!this.expiresAt) {
    this.expiresAt = new Date(Date.now() + this.retentionPeriod * 24 * 60 * 60 * 1000);
  }
  next();
});

/**
 * Audit Action Types
 */
const AuditActionTypes = {
  // Authentication
  AUTH_LOGIN: 'auth.login',
  AUTH_LOGOUT: 'auth.logout',
  AUTH_PASSWORD_CHANGE: 'auth.password_change',
  AUTH_PASSWORD_RESET: 'auth.password_reset',
  AUTH_MFA_ENABLE: 'auth.mfa_enable',
  AUTH_MFA_DISABLE: 'auth.mfa_disable',
  
  // User Management
  USER_CREATE: 'user.create',
  USER_UPDATE: 'user.update',
  USER_DELETE: 'user.delete',
  USER_ROLE_CHANGE: 'user.role_change',
  USER_PERMISSION_CHANGE: 'user.permission_change',
  
  // Employee Management
  EMPLOYEE_HIRE: 'employee.hire',
  EMPLOYEE_TERMINATE: 'employee.terminate',
  EMPLOYEE_PROMOTE: 'employee.promote',
  EMPLOYEE_TRANSFER: 'employee.transfer',
  
  // Financial
  INVOICE_CREATE: 'invoice.create',
  INVOICE_UPDATE: 'invoice.update',
  INVOICE_DELETE: 'invoice.delete',
  INVOICE_APPROVE: 'invoice.approve',
  PAYMENT_CREATE: 'payment.create',
  PAYMENT_APPROVE: 'payment.approve',
  BUDGET_ALLOCATE: 'budget.allocate',
  
  // Inventory
  STOCK_ADD: 'stock.add',
  STOCK_REMOVE: 'stock.remove',
  STOCK_TRANSFER: 'stock.transfer',
  INVENTORY_ADJUST: 'inventory.adjust',
  
  // System
  SETTINGS_CHANGE: 'settings.change',
  BACKUP_CREATE: 'backup.create',
  BACKUP_RESTORE: 'backup.restore',
  EXPORT_DATA: 'export.data',
  IMPORT_DATA: 'import.data',
  
  // Security
  SECURITY_ALERT: 'security.alert',
  ACCESS_DENIED: 'access.denied',
  SUSPICIOUS_ACTIVITY: 'security.suspicious',
};

/**
 * Audit Categories
 */
const AuditCategories = {
  AUTHENTICATION: 'authentication',
  USER_MANAGEMENT: 'user_management',
  HR: 'hr',
  FINANCE: 'finance',
  INVENTORY: 'inventory',
  SYSTEM: 'system',
  SECURITY: 'security',
  COMPLIANCE: 'compliance',
};

/**
 * Audit Manager Class
 */
class AuditManager {
  constructor() {
    this.AuditLog = null;
    this.buffer = [];
    this.flushInterval = null;
    this.bufferSize = 100;
    this.bufferTimeout = 5000; // 5 seconds
  }
  
  /**
   * Initialize Audit Manager
   */
  initialize(connection) {
    this.AuditLog = connection.model('AuditLog', AuditLogSchema);
    
    // Start buffer flush interval
    this.startBufferFlush();
    
    console.log('✅ Audit Manager initialized');
  }
  
  /**
   * Log audit event
   */
  async log(event) {
    const auditId = this.generateAuditId();
    
    const auditLog = {
      auditId,
      actor: {
        userId: event.userId,
        email: event.userEmail,
        name: event.userName,
        role: event.userRole,
        ip: event.ip,
        userAgent: event.userAgent,
      },
      action: {
        type: event.action,
        category: event.category || this.getCategory(event.action),
        description: event.description,
        status: event.status || 'success',
      },
      resource: {
        type: event.resourceType,
        id: event.resourceId,
        name: event.resourceName,
      },
      context: {
        tenantId: event.tenantId,
        organizationId: event.organizationId,
        departmentId: event.departmentId,
        module: event.module,
        route: event.route,
        method: event.method,
      },
      changes: {
        before: event.before,
        after: event.after,
        diff: event.diff || this.calculateDiff(event.before, event.after),
      },
      timestamp: new Date(),
      metadata: {
        correlationId: event.correlationId,
        requestId: event.requestId,
        sessionId: event.sessionId,
        duration: event.duration,
        errorMessage: event.errorMessage,
        additionalData: event.metadata,
      },
      retentionPeriod: event.retentionPeriod || 2555,
    };
    
    // Add to buffer
    this.buffer.push(auditLog);
    
    // Flush if buffer is full
    if (this.buffer.length >= this.bufferSize) {
      await this.flush();
    }
    
    return auditId;
  }
  
  /**
   * Log with immediate save
   */
  async logImmediate(event) {
    const auditId = await this.log(event);
    await this.flush();
    return auditId;
  }
  
  /**
   * Start buffer flush interval
   */
  startBufferFlush() {
    this.flushInterval = setInterval(() => {
      this.flush();
    }, this.bufferTimeout);
  }
  
  /**
   * Flush buffer to database
   */
  async flush() {
    if (this.buffer.length === 0) return;
    
    const toInsert = [...this.buffer];
    this.buffer = [];
    
    try {
      await this.AuditLog.insertMany(toInsert, { ordered: false });
    } catch (error) {
      console.error('Audit flush error:', error);
      // Re-add failed items to buffer
      this.buffer = [...toInsert, ...this.buffer];
    }
  }
  
  /**
   * Generate audit ID
   */
  generateAuditId() {
    const crypto = require('crypto');
    return `aud_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
  }
  
  /**
   * Get category from action
   */
  getCategory(action) {
    const prefix = action.split('.')[0];
    return AuditCategories[prefix.toUpperCase()] || 'system';
  }
  
  /**
   * Calculate diff between before and after
   */
  calculateDiff(before, after) {
    if (!before || !after) return null;
    
    const diff = {};
    const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
    
    for (const key of allKeys) {
      if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
        diff[key] = {
          from: before[key],
          to: after[key],
        };
      }
    }
    
    return Object.keys(diff).length > 0 ? diff : null;
  }
  
  /**
   * Query audit logs
   */
  async query(options = {}) {
    const {
      userId,
      action,
      resourceType,
      resourceId,
      tenantId,
      status,
      startDate,
      endDate,
      limit = 100,
      skip = 0,
      sort = { timestamp: -1 },
    } = options;
    
    const query = {};
    
    if (userId) query['actor.userId'] = userId;
    if (action) query['action.type'] = action;
    if (resourceType) query['resource.type'] = resourceType;
    if (resourceId) query['resource.id'] = resourceId;
    if (tenantId) query['context.tenantId'] = tenantId;
    if (status) query['action.status'] = status;
    
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }
    
    return this.AuditLog.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit);
  }
  
  /**
   * Get audit log by ID
   */
  async getById(auditId) {
    return this.AuditLog.findOne({ auditId });
  }
  
  /**
   * Get user activity
   */
  async getUserActivity(userId, options = {}) {
    const { limit = 50, startDate, endDate } = options;
    
    return this.query({
      userId,
      startDate,
      endDate,
      limit,
      sort: { timestamp: -1 },
    });
  }
  
  /**
   * Get resource history
   */
  async getResourceHistory(resourceType, resourceId, options = {}) {
    const { limit = 100 } = options;
    
    return this.query({
      resourceType,
      resourceId,
      limit,
      sort: { timestamp: -1 },
    });
  }
  
  /**
   * Get audit statistics
   */
  async getStats(options = {}) {
    const { tenantId, startDate, endDate } = options;
    
    const match = {};
    if (tenantId) match['context.tenantId'] = tenantId;
    if (startDate || endDate) {
      match.timestamp = {};
      if (startDate) match.timestamp.$gte = new Date(startDate);
      if (endDate) match.timestamp.$lte = new Date(endDate);
    }
    
    const [byAction, byStatus, byUser, total] = await Promise.all([
      this.AuditLog.aggregate([
        { $match: match },
        { $group: { _id: '$action.type', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      this.AuditLog.aggregate([
        { $match: match },
        { $group: { _id: '$action.status', count: { $sum: 1 } } },
      ]),
      this.AuditLog.aggregate([
        { $match: match },
        { $group: { _id: '$actor.userId', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      this.AuditLog.countDocuments(match),
    ]);
    
    return {
      total,
      byAction,
      byStatus,
      byUser,
    };
  }
  
  /**
   * Export audit logs
   */
  async export(options = {}) {
    const logs = await this.query({ ...options, limit: 10000 });
    
    return logs.map(log => ({
      AuditID: log.auditId,
      Timestamp: log.timestamp.toISOString(),
      User: log.actor.email || log.actor.userId,
      Action: log.action.type,
      Resource: `${log.resource.type}:${log.resource.id}`,
      Status: log.action.status,
      Description: log.action.description,
      Changes: log.changes.diff ? JSON.stringify(log.changes.diff) : '',
      IP: log.actor.ip,
    }));
  }
  
  /**
   * Close audit manager
   */
  async close() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    await this.flush();
  }
}

// Singleton instance
const auditManager = new AuditManager();

/**
 * Audit Middleware for Express
 */
const auditMiddleware = (options = {}) => {
  const {
    excludePaths = ['/health', '/metrics', '/favicon.ico'],
    includeBody = false,
    includeResponse = false,
  } = options;
  
  return async (req, res, next) => {
    // Skip excluded paths
    if (excludePaths.some(path => req.path.startsWith(path))) {
      return next();
    }
    
    const startTime = Date.now();
    
    // Store original end
    const originalEnd = res.end;
    const chunks = [];
    
    // Override res.end to capture response
    res.end = function(chunk, encoding) {
      if (chunk && includeResponse) {
        chunks.push(Buffer.from(chunk));
      }
      
      const duration = Date.now() - startTime;
      
      // Log audit event
      auditManager.log({
        userId: req.user?.id,
        userEmail: req.user?.email,
        userName: req.user?.name,
        userRole: req.user?.role,
        ip: req.ip,
        userAgent: req.get('user-agent'),
        action: `${req.method.toLowerCase()}.${req.path.split('/')[1] || 'unknown'}`,
        category: 'system',
        description: `${req.method} ${req.path}`,
        status: res.statusCode < 400 ? 'success' : 'failure',
        resourceType: 'api',
        resourceId: req.params?.id || 'unknown',
        tenantId: req.tenant?.tenantId,
        route: req.path,
        method: req.method,
        duration,
        metadata: includeBody ? { body: req.body } : undefined,
      }).catch(console.error);
      
      originalEnd.apply(res, arguments);
    };
    
    next();
  };
};

/**
 * Audit Decorator for Functions
 */
const audit = (action, options = {}) => {
  return function(target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function(...args) {
      const startTime = Date.now();
      let result;
      let error;
      
      try {
        result = await originalMethod.apply(this, args);
        return result;
      } catch (e) {
        error = e;
        throw e;
      } finally {
        await auditManager.log({
          ...options,
          action,
          status: error ? 'failure' : 'success',
          duration: Date.now() - startTime,
          errorMessage: error?.message,
        }).catch(console.error);
      }
    };
    
    return descriptor;
  };
};

module.exports = {
  AuditManager,
  auditManager,
  AuditLogSchema,
  AuditActionTypes,
  AuditCategories,
  auditMiddleware,
  audit,
};