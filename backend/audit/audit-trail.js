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
