/* eslint-disable no-unused-vars */
/**
 * Electronic Directives Service - نظام التوجيه الإلكتروني
 * Advanced directive management system for administrative communications
 */

const crypto = require('crypto');
const mongoose = require('mongoose');
const { Schema } = mongoose;
const logger = require('../utils/logger');
const { escapeRegex } = require('../utils/sanitize');

// ============================================
// Schema Definitions
// ============================================

/**
 * Directive Schema - مخطط التوجيه
 */
const DirectiveSchema = new Schema(
  {
    // Reference
    referenceNumber: {
      type: String,
      unique: true,
      required: true,
    },

    // Type
    type: {
      type: String,
      enum: [
        'instruction', // تعليمات
        'circular', // تعميم
        'decision', // قرار
        'memo', // مذكرة
        'urgent_notice', // إشعار عاجل
        'policy_update', // تحديث سياسة
        'procedure_change', // تغيير إجراء
      ],
      required: true,
      index: true,
    },

    // Content
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
    },
    summary: {
      type: String,
      maxlength: 500,
    },

    // Priority
    priority: {
      type: String,
      enum: ['critical', 'urgent', 'high', 'normal', 'low'],
      default: 'normal',
      index: true,
    },

    // Sender
    issuedBy: {
      type: {
        type: String,
        enum: ['admin', 'department_head', 'manager', 'board', 'system'],
      },
      userId: { type: Schema.Types.ObjectId, ref: 'User' },
      name: String,
      position: String,
    },

    // Recipients
    recipients: [
      {
        type: {
          type: String,
          enum: ['all', 'department', 'branch', 'role', 'specific'],
        },
        targetId: { type: Schema.Types.ObjectId },
        name: String,
        readStatus: {
          read: { type: Boolean, default: false },
          readAt: Date,
        },
        acknowledgment: {
          required: { type: Boolean, default: false },
          acknowledged: { type: Boolean, default: false },
          acknowledgedAt: Date,
          response: String,
        },
      },
    ],

    // Status
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'issued', 'delivered', 'expired', 'cancelled'],
      default: 'draft',
      index: true,
    },

    // Dates
    issuedAt: Date,
    effectiveFrom: {
      type: Date,
      required: true,
      index: true,
    },
    effectiveUntil: Date,

    // Requirements
    requiresAcknowledgment: {
      type: Boolean,
      default: false,
    },
    acknowledgmentDeadline: Date,
    requiresAction: {
      type: Boolean,
      default: false,
    },
    actionDeadline: Date,

    // Actions
    requiredActions: [
      {
        description: String,
        deadline: Date,
        assignee: { type: Schema.Types.ObjectId, ref: 'User' },
        status: {
          type: String,
          enum: ['pending', 'in_progress', 'completed', 'overdue'],
          default: 'pending',
        },
        completedAt: Date,
        notes: String,
      },
    ],

    // Attachments
    attachments: [
      {
        filename: String,
        originalName: String,
        mimeType: String,
        size: Number,
        path: String,
        uploadedAt: { type: Date, default: Date.now },
        uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      },
    ],

    // Tags & Categories
    tags: [String],
    categories: [String],

    // Expiration
    autoExpire: {
      type: Boolean,
      default: false,
    },

    // Audit
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: Date,

    // Delivery tracking
    deliveryStats: {
      totalRecipients: { type: Number, default: 0 },
      delivered: { type: Number, default: 0 },
      read: { type: Number, default: 0 },
      acknowledged: { type: Number, default: 0 },
      actionsCompleted: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
    collection: 'electronic_directives',
  }
);

// Indexes
DirectiveSchema.index({ type: 1, status: 1 });
DirectiveSchema.index({ priority: 1, effectiveFrom: 1 });
DirectiveSchema.index({ 'recipients.targetId': 1, status: 1 });
DirectiveSchema.index({ issuedAt: -1 });

/**
 * DirectiveAcknowledgment Schema - مخطط الإقرار
 */
const DirectiveAcknowledgmentSchema = new Schema(
  {
    directiveId: {
      type: Schema.Types.ObjectId,
      ref: 'Directive',
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Acknowledgment details
    acknowledgedAt: {
      type: Date,
      default: Date.now,
    },

    // Response
    response: {
      type: String,
      maxlength: 1000,
    },

    // Device/IP info
    deviceInfo: {
      ipAddress: String,
      userAgent: String,
      deviceId: String,
    },

    // Location (if applicable)
    location: {
      coordinates: [Number],
      name: String,
    },
  },
  {
    timestamps: true,
    collection: 'directive_acknowledgments',
  }
);

// Compound index
DirectiveAcknowledgmentSchema.index({ directiveId: 1, userId: 1 }, { unique: true });

// Create models
const Directive = mongoose.models.Directive || mongoose.model('Directive', DirectiveSchema);
const DirectiveAcknowledgment =
  mongoose.models.DirectiveAcknowledgment ||
  mongoose.model('DirectiveAcknowledgment', DirectiveAcknowledgmentSchema);

// ============================================
// Service Class
// ============================================

class ElectronicDirectivesService {
  constructor() {
    this.models = { Directive, DirectiveAcknowledgment };
  }

  /**
   * Initialize service
   */
  async initialize(connection) {
    if (connection) {
      this.Directive = connection.model('Directive', DirectiveSchema);
      this.DirectiveAcknowledgment = connection.model(
        'DirectiveAcknowledgment',
        DirectiveAcknowledgmentSchema
      );
    } else {
      this.Directive = Directive;
      this.DirectiveAcknowledgment = DirectiveAcknowledgment;
    }
    logger.info('✅ Electronic Directives Service initialized');
  }

  /**
   * Generate reference number
   */
  generateReferenceNumber(type) {
    const typeCodes = {
      instruction: 'INS',
      circular: 'CIR',
      decision: 'DEC',
      memo: 'MEM',
      urgent_notice: 'URN',
      policy_update: 'POL',
      procedure_change: 'PRC',
    };
    const code = typeCodes[type] || 'DIR';
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const sequence = crypto.randomInt(9999).toString().padStart(4, '0');
    return `${code}-${year}${month}-${sequence}`;
  }

  /**
   * Create a new directive
   */
  async createDirective(data, userId) {
    const referenceNumber = this.generateReferenceNumber(data.type);

    const directive = new this.Directive({
      ...data,
      referenceNumber,
      createdBy: userId,
      status: 'draft',
    });

    await directive.save();
    return directive;
  }

  /**
   * Issue a directive
   */
  async issueDirective(directiveId, userId) {
    const directive = await this.Directive.findById(directiveId);
    if (!directive) {
      throw new Error('Directive not found');
    }

    directive.status = 'issued';
    directive.issuedAt = new Date();
    directive.issuedBy.userId = userId;
    directive.deliveryStats.totalRecipients = directive.recipients.length;

    await directive.save();

    // @todo [P2] Send notifications to recipients via NotificationService

    return directive;
  }

  /**
   * Get directives for a recipient
   */
  async getDirectivesForRecipient(recipientId, options = {}) {
    const { page = 1, limit = 20, status, type, priority } = options;
    const skip = (page - 1) * limit;

    const query = {
      status: { $in: ['issued', 'delivered'] },
      $or: [{ 'recipients.type': 'all' }, { 'recipients.targetId': recipientId }],
    };

    if (status) query.status = status;
    if (type) query.type = type;
    if (priority) query.priority = priority;

    const [data, total] = await Promise.all([
      this.Directive.find(query).sort({ priority: -1, effectiveFrom: -1 }).skip(skip).limit(limit),
      this.Directive.countDocuments(query),
    ]);

    return { data, total, page, pages: Math.ceil(total / limit) };
  }

  /**
   * Mark directive as read
   */
  async markAsRead(directiveId, recipientId) {
    const directive = await this.Directive.findById(directiveId);
    if (!directive) {
      throw new Error('Directive not found');
    }

    const recipient = directive.recipients.find(r => r.targetId?.toString() === recipientId);

    if (recipient) {
      recipient.readStatus.read = true;
      recipient.readStatus.readAt = new Date();
      directive.deliveryStats.read += 1;
      await directive.save();
    }

    return directive;
  }

  /**
   * Acknowledge a directive
   */
  async acknowledgeDirective(directiveId, userId, data = {}) {
    const directive = await this.Directive.findById(directiveId);
    if (!directive) {
      throw new Error('Directive not found');
    }

    // Create acknowledgment record
    const acknowledgment = new this.DirectiveAcknowledgment({
      directiveId,
      userId,
      response: data.response,
      deviceInfo: data.deviceInfo,
      location: data.location,
    });

    await acknowledgment.save();

    // Update directive
    const recipient = directive.recipients.find(r => r.targetId?.toString() === userId);

    if (recipient) {
      recipient.acknowledgment.acknowledged = true;
      recipient.acknowledgment.acknowledgedAt = new Date();
      if (data.response) {
        recipient.acknowledgment.response = data.response;
      }
      directive.deliveryStats.acknowledged += 1;
    }

    await directive.save();
    return { directive, acknowledgment };
  }

  /**
   * Add required action to directive
   */
  async addRequiredAction(directiveId, actionData) {
    const directive = await this.Directive.findById(directiveId);
    if (!directive) {
      throw new Error('Directive not found');
    }

    directive.requiredActions.push(actionData);
    directive.requiresAction = true;

    await directive.save();
    return directive;
  }

  /**
   * Complete an action
   */
  async completeAction(directiveId, actionIndex, userId, notes) {
    const directive = await this.Directive.findById(directiveId);
    if (!directive) {
      throw new Error('Directive not found');
    }

    const action = directive.requiredActions[actionIndex];
    if (action) {
      action.status = 'completed';
      action.completedAt = new Date();
      action.notes = notes;
      directive.deliveryStats.actionsCompleted += 1;
    }

    await directive.save();
    return directive;
  }

  /**
   * Get directive statistics
   */
  async getStatistics(dateRange = {}) {
    const { startDate, endDate } = dateRange;
    const matchQuery = {};

    if (startDate || endDate) {
      matchQuery.createdAt = {};
      if (startDate) matchQuery.createdAt.$gte = new Date(startDate);
      if (endDate) matchQuery.createdAt.$lte = new Date(endDate);
    }

    const stats = await this.Directive.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          byType: { $push: '$type' },
          byPriority: { $push: '$priority' },
          byStatus: { $push: '$status' },
          totalRead: { $sum: '$deliveryStats.read' },
          totalAcknowledged: { $sum: '$deliveryStats.acknowledged' },
        },
      },
    ]);

    const typeCounts = {};
    const priorityCounts = {};
    const statusCounts = {};

    if (stats.length > 0) {
      stats[0].byType.forEach(t => (typeCounts[t] = (typeCounts[t] || 0) + 1));
      stats[0].byPriority.forEach(p => (priorityCounts[p] = (priorityCounts[p] || 0) + 1));
      stats[0].byStatus.forEach(s => (statusCounts[s] = (statusCounts[s] || 0) + 1));
    }

    return {
      total: stats[0]?.total || 0,
      byType: typeCounts,
      byPriority: priorityCounts,
      byStatus: statusCounts,
      engagement: {
        totalRead: stats[0]?.totalRead || 0,
        totalAcknowledged: stats[0]?.totalAcknowledged || 0,
      },
    };
  }

  /**
   * Get overdue actions
   */
  async getOverdueActions() {
    const now = new Date();

    return this.Directive.find({
      status: { $in: ['issued', 'delivered'] },
      'requiredActions.status': { $ne: 'completed' },
      'requiredActions.deadline': { $lt: now },
    }).select('referenceNumber subject requiredActions');
  }

  /**
   * Cancel a directive
   */
  async cancelDirective(directiveId, userId, reason) {
    const directive = await this.Directive.findById(directiveId);
    if (!directive) {
      throw new Error('Directive not found');
    }

    directive.status = 'cancelled';
    directive.updatedBy = userId;
    directive.updatedAt = new Date();

    // Add cancellation note
    if (!directive.notes) directive.notes = [];
    directive.notes.push({
      text: `Cancelled: ${reason}`,
      date: new Date(),
      userId,
    });

    await directive.save();
    return directive;
  }

  /**
   * Search directives
   */
  async searchDirectives(query, options = {}) {
    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const searchQuery = {
      $or: [
        { subject: { $regex: escapeRegex(query), $options: 'i' } },
        { content: { $regex: escapeRegex(query), $options: 'i' } },
        { referenceNumber: { $regex: escapeRegex(query), $options: 'i' } },
        { tags: { $in: [new RegExp(escapeRegex(query), 'i')] } },
      ],
    };

    const [data, total] = await Promise.all([
      this.Directive.find(searchQuery).sort({ createdAt: -1 }).skip(skip).limit(limit),
      this.Directive.countDocuments(searchQuery),
    ]);

    return { data, total, page, pages: Math.ceil(total / limit) };
  }
}

// Export
const directivesService = new ElectronicDirectivesService();

module.exports = {
  ElectronicDirectivesService,
  directivesService,
  Directive,
  DirectiveAcknowledgment,
};
