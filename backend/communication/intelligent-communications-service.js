/* eslint-disable no-unused-vars */
/**
 * Intelligent Communications Service - خدمة الاتصالات الذكية
 * نظام متكامل وشامل للاتصالات الإدارية
 * Integrates AI, workflow, analytics, and government integrations
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;
const axios = require('axios');
const crypto = require('crypto');
const moment = require('moment');
const mongoosePaginate = require('mongoose-paginate-v2');
const logger = require('../utils/logger');

// ============================================
// Configuration
// ============================================
const config = {
  // Government Integration
  government: {
    absher: {
      baseUrl: process.env.ABSHER_API_URL || 'https://api.absher.sa',
      apiKey: process.env.ABSHER_API_KEY,
      enabled: process.env.ABSHER_ENABLED === 'true',
    },
    moi: {
      baseUrl: process.env.MOI_API_URL || 'https://api.moi.gov.sa',
      apiKey: process.env.MOI_API_KEY,
      enabled: process.env.MOI_ENABLED === 'true',
    },
    post: {
      baseUrl: process.env.SAUDI_POST_API_URL || 'https://api.sp.com.sa',
      apiKey: process.env.SAUDI_POST_API_KEY,
      enabled: process.env.SAUDI_POST_ENABLED === 'true',
    },
  },
  // AI Integration
  ai: {
    enabled: process.env.AI_CLASSIFICATION_ENABLED === 'true',
    model: process.env.AI_MODEL || 'gpt-4',
    apiKey: process.env.OPENAI_API_KEY,
  },
  // Notifications
  notifications: {
    email: process.env.EMAIL_NOTIFICATIONS_ENABLED === 'true',
    sms: process.env.SMS_NOTIFICATIONS_ENABLED === 'true',
    push: process.env.PUSH_NOTIFICATIONS_ENABLED === 'true',
  },
};

// ============================================
// Enums and Constants
// ============================================
const CorrespondenceType = {
  INTERNAL: 'internal',
  EXTERNAL: 'external',
  INCOMING: 'incoming',
  OUTGOING: 'outgoing',
  CIRCULAR: 'circular',
  DECISION: 'decision',
  DIRECTIVE: 'directive',
  MEMO: 'memo',
  REPORT: 'report',
  CONTRACT: 'contract',
  INVOICE: 'invoice',
  COMPLAINT: 'complaint',
  REQUEST: 'request',
};

const Priority = {
  CRITICAL: 'critical', // حرج - يتطلب إجراء فوري
  URGENT: 'urgent', // عاجل - خلال 24 ساعة
  HIGH: 'high', // مرتفع - خلال 3 أيام
  NORMAL: 'normal', // عادي - خلال 7 أيام
  LOW: 'low', // منخفض - خلال 14 يوم
};

const Status = {
  DRAFT: 'draft',
  PENDING_REVIEW: 'pending_review',
  PENDING_APPROVAL: 'pending_approval',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  SENT: 'sent',
  DELIVERED: 'delivered',
  READ: 'read',
  ACTION_REQUIRED: 'action_required',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  ARCHIVED: 'archived',
  CANCELLED: 'cancelled',
};

const ConfidentialityLevel = {
  PUBLIC: 'public', // عام
  INTERNAL: 'internal', // داخلي
  CONFIDENTIAL: 'confidential', // سري
  HIGHLY_CONFIDENTIAL: 'highly_confidential', // سري للغاية
  TOP_SECRET: 'top_secret', // سري جداً
};

// ============================================
// Schemas
// ============================================

// Attachment Schema with OCR and Classification
const AttachmentSchema = new Schema(
  {
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    path: { type: String, required: true },
    hash: { type: String, index: true },

    // Classification
    category: {
      type: String,
      enum: ['document', 'image', 'video', 'audio', 'spreadsheet', 'presentation', 'other'],
      default: 'document',
    },

    // OCR Results
    ocr: {
      performed: { type: Boolean, default: false },
      text: { type: String },
      language: { type: String },
      confidence: { type: Number },
      performedAt: { type: Date },
      performedBy: { type: String },
    },

    // AI Analysis
    aiAnalysis: {
      summarized: { type: Boolean, default: false },
      summary: { type: String },
      keywords: [{ type: String }],
      entities: [
        {
          type: { type: String },
          value: { type: String },
          confidence: { type: Number },
        },
      ],
      sentiment: {
        score: { type: Number },
        label: { type: String, enum: ['positive', 'negative', 'neutral'] },
      },
      classification: {
        category: { type: String },
        subcategory: { type: String },
        confidence: { type: Number },
      },
    },

    // Security
    encrypted: { type: Boolean, default: false },
    encryptionKey: { type: String },
    virusScanned: { type: Boolean, default: false },
    virusScanResult: { type: String },

    // Metadata
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    uploadedAt: { type: Date, default: Date.now },
    version: { type: Number, default: 1 },
    previousVersions: [
      {
        path: { type: String },
        uploadedAt: { type: Date },
        uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      },
    ],
  },
  { timestamps: true }
);

// Recipient Schema with Tracking
const RecipientSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    externalEntity: { type: Schema.Types.ObjectId, ref: 'ExternalEntity' },

    // Contact Info (for external recipients)
    name: { type: String },
    email: { type: String },
    phone: { type: String },
    address: { type: String },
    nationalId: { type: String }, // للجهات الحكومية

    // Role in this correspondence
    role: {
      type: String,
      enum: ['to', 'cc', 'bcc', 'for_information', 'for_action'],
      default: 'to',
    },

    // Action Required
    actionRequired: {
      type: {
        type: String,
        enum: ['review', 'approve', 'acknowledge', 'respond', 'execute', 'none'],
      },
      deadline: { type: Date },
      instructions: { type: String },
    },

    // Tracking
    status: {
      type: String,
      enum: ['pending', 'notified', 'delivered', 'read', 'acknowledged', 'actioned', 'completed'],
      default: 'pending',
    },

    // Timestamps
    notifiedAt: { type: Date },
    deliveredAt: { type: Date },
    readAt: { type: Date },
    acknowledgedAt: { type: Date },
    actionedAt: { type: Date },
    completedAt: { type: Date },

    // Response
    response: {
      content: { type: String },
      attachments: [AttachmentSchema],
      respondedAt: { type: Date },
    },

    // Digital Signature
    digitalSignature: {
      signed: { type: Boolean, default: false },
      signatureHash: { type: String },
      signedAt: { type: Date },
      certificate: { type: String },
      verified: { type: Boolean, default: false },
    },

    // Geo-location (for mobile acknowledgment)
    location: {
      latitude: { type: Number },
      longitude: { type: Number },
      timestamp: { type: Date },
    },
  },
  { _id: true }
);

// Timeline Entry Schema
const TimelineEntrySchema = new Schema(
  {
    action: {
      type: String,
      required: true,
      enum: [
        'created',
        'updated',
        'reviewed',
        'approved',
        'rejected',
        'sent',
        'delivered',
        'read',
        'acknowledged',
        'forwarded',
        'actioned',
        'completed',
        'archived',
        'restored',
        'cancelled',
        'commented',
        'attachment_added',
        'attachment_removed',
        'priority_changed',
        'status_changed',
        'assigned',
        'delegated',
        'escalated',
        'reminder_sent',
      ],
    },
    description: { type: String },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    performedAt: { type: Date, default: Date.now },

    // Additional Data
    metadata: {
      oldValue: { type: Schema.Types.Mixed },
      newValue: { type: Schema.Types.Mixed },
      notes: { type: String },
      systemGenerated: { type: Boolean, default: false },
    },

    // IP and Device Info
    deviceInfo: {
      ipAddress: { type: String },
      userAgent: { type: String },
      deviceType: { type: String },
      location: {
        latitude: { type: Number },
        longitude: { type: Number },
        city: { type: String },
        country: { type: String },
      },
    },
  },
  { _id: true }
);

// Main Correspondence Schema
const CorrespondenceSchema = new Schema(
  {
    // Reference
    referenceNumber: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },
    parentReference: { type: String, index: true }, // للردود والتحويلات
    relatedReferences: [{ type: String }], // مراجع مرتبطة

    // Classification
    type: {
      type: String,
      enum: Object.values(CorrespondenceType),
      required: true,
      index: true,
    },
    subType: { type: String },
    category: { type: String, index: true },
    tags: [{ type: String, index: true }],

    // Priority and Urgency
    priority: {
      type: String,
      enum: Object.values(Priority),
      default: Priority.NORMAL,
      index: true,
    },
    confidentiality: {
      type: String,
      enum: Object.values(ConfidentialityLevel),
      default: ConfidentialityLevel.INTERNAL,
      index: true,
    },

    // Content
    subject: {
      type: String,
      required: true,
      maxlength: 500,
      text: true,
    },
    content: {
      type: String,
      required: true,
      text: true,
    },
    htmlContent: { type: String },
    summary: { type: String, maxlength: 1000 },

    // Sender
    sender: {
      user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
      department: { type: Schema.Types.ObjectId, ref: 'Department' },
      branch: { type: Schema.Types.ObjectId, ref: 'Branch' },
      onBehalfOf: { type: Schema.Types.ObjectId, ref: 'User' }, // بالنيابة عن
      position: { type: String },
    },

    // Recipients
    recipients: [RecipientSchema],

    // External Entity (for external correspondence)
    externalEntity: {
      entity: { type: Schema.Types.ObjectId, ref: 'ExternalEntity' },
      contactPerson: { type: String },
      contactEmail: { type: String },
      contactPhone: { type: String },
      trackingNumber: { type: String }, // رقم التتبع البريدي
      deliveryMethod: {
        type: {
          type: String,
          enum: ['email', 'post', 'hand_delivery', 'fax', 'government_portal'],
        },
        details: { type: String },
      },
    },

    // Status and Workflow
    status: {
      type: String,
      enum: Object.values(Status),
      default: Status.DRAFT,
      index: true,
    },
    workflowStage: {
      type: String,
      enum: [
        'initiation',
        'review',
        'approval',
        'dispatch',
        'delivery',
        'action',
        'completion',
        'archival',
      ],
      default: 'initiation',
    },
    workflowId: { type: Schema.Types.ObjectId, ref: 'Workflow' },

    // Approval Chain
    approvalChain: [
      {
        approver: { type: Schema.Types.ObjectId, ref: 'User' },
        order: { type: Number, required: true },
        type: { type: String, enum: ['sequential', 'parallel'], default: 'sequential' },
        status: {
          type: String,
          enum: ['pending', 'approved', 'rejected', 'skipped', 'delegated'],
          default: 'pending',
        },
        decision: {
          approved: { type: Boolean },
          comments: { type: String },
          decidedAt: { type: Date },
        },
        delegatedTo: { type: Schema.Types.ObjectId, ref: 'User' },
        deadline: { type: Date },
        remindersSent: { type: Number, default: 0 },
      },
    ],

    // Dates
    date: { type: Date, default: Date.now, index: true },
    dueDate: { type: Date, index: true },
    validFrom: { type: Date },
    validUntil: { type: Date },

    // Attachments
    attachments: [AttachmentSchema],

    // AI Analysis
    aiAnalysis: {
      classified: { type: Boolean, default: false },
      classification: {
        type: { type: String },
        category: { type: String },
        subcategory: { type: String },
        confidence: { type: Number },
      },
      keywords: [{ type: String }],
      entities: [
        {
          type: { type: String },
          value: { type: String },
          confidence: { type: Number },
        },
      ],
      sentiment: {
        score: { type: Number },
        label: { type: String },
      },
      urgencyPrediction: {
        score: { type: Number },
        factors: [{ type: String }],
      },
      suggestedActions: [
        {
          action: { type: String },
          confidence: { type: Number },
          reason: { type: String },
        },
      ],
      similarCorrespondences: [
        {
          reference: { type: String },
          similarity: { type: Number },
        },
      ],
      analyzedAt: { type: Date },
    },

    // Response and Follow-up
    responseRequired: { type: Boolean, default: false },
    responseDeadline: { type: Date },
    responseTo: { type: Schema.Types.ObjectId, ref: 'Correspondence' },
    responses: [{ type: Schema.Types.ObjectId, ref: 'Correspondence' }],

    // Follow-up Actions
    actions: [
      {
        title: { type: String, required: true },
        description: { type: String },
        assignee: { type: Schema.Types.ObjectId, ref: 'User' },
        status: {
          type: String,
          enum: ['pending', 'in_progress', 'completed', 'cancelled'],
          default: 'pending',
        },
        priority: { type: String, enum: Object.values(Priority), default: Priority.NORMAL },
        dueDate: { type: Date },
        completedAt: { type: Date },
        completedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        notes: { type: String },
        attachments: [AttachmentSchema],
      },
    ],

    // Escalation
    escalation: {
      escalated: { type: Boolean, default: false },
      escalatedTo: { type: Schema.Types.ObjectId, ref: 'User' },
      escalatedAt: { type: Date },
      reason: { type: String },
      level: { type: Number, default: 0 },
    },

    // Timeline
    timeline: [TimelineEntrySchema],

    // Comments and Notes
    comments: [
      {
        user: { type: Schema.Types.ObjectId, ref: 'User' },
        content: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
        isPrivate: { type: Boolean, default: false },
        attachments: [AttachmentSchema],
      },
    ],

    // Statistics
    statistics: {
      viewCount: { type: Number, default: 0 },
      editCount: { type: Number, default: 0 },
      forwardCount: { type: Number, default: 0 },
      printCount: { type: Number, default: 0 },
      downloadCount: { type: Number, default: 0 },
      lastViewedAt: { type: Date },
    },

    // Archival
    archival: {
      archived: { type: Boolean, default: false },
      archivedAt: { type: Date },
      archivedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      retentionPeriod: { type: Number }, // in days
      destructionDate: { type: Date },
      archiveLocation: { type: String },
      archiveReference: { type: String },
    },

    // Audit
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    deletedAt: { type: Date },
    deletedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    collection: 'correspondences',
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for Performance
CorrespondenceSchema.index({ referenceNumber: 1 });
CorrespondenceSchema.index({ 'sender.user': 1, date: -1 });
CorrespondenceSchema.index({ status: 1, priority: 1 });
CorrespondenceSchema.index({ type: 1, date: -1 });
CorrespondenceSchema.index({ 'recipients.user': 1, 'recipients.status': 1 });
CorrespondenceSchema.index({ dueDate: 1, status: 1 });
CorrespondenceSchema.index({ 'approvalChain.approver': 1, 'approvalChain.status': 1 });
CorrespondenceSchema.index({ subject: 'text', content: 'text', tags: 'text' });
CorrespondenceSchema.index({ createdAt: -1 });

// Virtual for overdue status
CorrespondenceSchema.virtual('isOverdue').get(function () {
  if (!this.dueDate) return false;
  if ([Status.COMPLETED, Status.ARCHIVED, Status.CANCELLED].includes(this.status)) return false;
  return new Date() > this.dueDate;
});

// Virtual for days remaining
CorrespondenceSchema.virtual('daysRemaining').get(function () {
  if (!this.dueDate) return null;
  if ([Status.COMPLETED, Status.ARCHIVED, Status.CANCELLED].includes(this.status)) return null;
  const diff = moment(this.dueDate).diff(moment(), 'days');
  return diff;
});

// Paginate Plugin
CorrespondenceSchema.plugin(mongoosePaginate);

// ============================================
// External Entity Schema
// ============================================
const ExternalEntitySchema = new Schema(
  {
    // Basic Info
    name: { type: String, required: true, index: true },
    nameAr: { type: String },
    shortName: { type: String },
    code: { type: String, unique: true, sparse: true },

    // Type
    type: {
      type: String,
      enum: ['government', 'private', 'non_profit', 'international', 'other'],
      required: true,
    },

    // Government Specific
    government: {
      ministry: { type: String },
      department: { type: String },
      sector: { type: String },
      level: { type: String, enum: ['federal', 'state', 'local'] },
    },

    // Contact Info
    contact: {
      email: { type: String },
      phone: { type: String },
      fax: { type: String },
      website: { type: String },
      address: {
        street: { type: String },
        city: { type: String },
        state: { type: String },
        postalCode: { type: String },
        country: { type: String, default: 'Saudi Arabia' },
      },
    },

    // Location
    location: {
      latitude: { type: Number },
      longitude: { type: Number },
    },

    // Integration
    integration: {
      enabled: { type: Boolean, default: false },
      type: { type: String, enum: ['api', 'email', 'portal', 'edi', 'none'] },
      apiUrl: { type: String },
      apiKey: { type: String },
      username: { type: String },
      lastSync: { type: Date },
      syncStatus: { type: String },
    },

    // Contacts
    contacts: [
      {
        name: { type: String },
        position: { type: String },
        email: { type: String },
        phone: { type: String },
        mobile: { type: String },
        isPrimary: { type: Boolean, default: false },
      },
    ],

    // Statistics
    statistics: {
      totalCorrespondences: { type: Number, default: 0 },
      incomingCount: { type: Number, default: 0 },
      outgoingCount: { type: Number, default: 0 },
      lastCorrespondenceAt: { type: Date },
      averageResponseTime: { type: Number }, // in hours
    },

    // Status
    active: { type: Boolean, default: true },
    notes: { type: String },

    // Audit
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    collection: 'external_entities',
  }
);

// ============================================
// Template Schema
// ============================================
const CorrespondenceTemplateSchema = new Schema(
  {
    name: { type: String, required: true },
    nameAr: { type: String },
    code: { type: String, unique: true },

    // Classification
    type: {
      type: String,
      enum: Object.values(CorrespondenceType),
      required: true,
    },
    category: { type: String },

    // Content
    subject: { type: String, required: true },
    content: { type: String, required: true },
    htmlContent: { type: String },

    // Variables
    variables: [
      {
        name: { type: String, required: true },
        type: { type: String, enum: ['text', 'number', 'date', 'user', 'department', 'custom'] },
        defaultValue: { type: String },
        required: { type: Boolean, default: false },
        description: { type: String },
      },
    ],

    // Settings
    settings: {
      defaultPriority: { type: String, enum: Object.values(Priority), default: Priority.NORMAL },
      defaultConfidentiality: {
        type: String,
        enum: Object.values(ConfidentialityLevel),
        default: ConfidentialityLevel.INTERNAL,
      },
      requireApproval: { type: Boolean, default: false },
      approvalWorkflow: { type: Schema.Types.ObjectId, ref: 'Workflow' },
      autoNumbering: { type: Boolean, default: true },
      numberingPrefix: { type: String },
      responseRequired: { type: Boolean, default: false },
      defaultDueDays: { type: Number },
    },

    // Attachments
    defaultAttachments: [
      {
        name: { type: String },
        required: { type: Boolean, default: false },
        description: { type: String },
      },
    ],

    // Recipients
    defaultRecipients: [
      {
        type: { type: String, enum: ['user', 'role', 'department', 'external'] },
        reference: { type: Schema.Types.ObjectId },
        role: { type: String, enum: ['to', 'cc', 'bcc', 'for_information', 'for_action'] },
      },
    ],

    // Usage
    usage: {
      department: { type: Schema.Types.ObjectId, ref: 'Department' },
      branch: { type: Schema.Types.ObjectId, ref: 'Branch' },
      roles: [{ type: String }],
      users: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    },

    // Statistics
    statistics: {
      usageCount: { type: Number, default: 0 },
      lastUsedAt: { type: Date },
    },

    // Status
    active: { type: Boolean, default: true },

    // Audit
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    collection: 'correspondence_templates',
  }
);

// ============================================
// Models
// ============================================
const Correspondence =
  mongoose.models.Correspondence || mongoose.model('Correspondence', CorrespondenceSchema);
const ExternalEntity =
  mongoose.models.ExternalEntity || mongoose.model('ExternalEntity', ExternalEntitySchema);
const CorrespondenceTemplate =
  mongoose.models.CorrespondenceTemplate ||
  mongoose.model('CorrespondenceTemplate', CorrespondenceTemplateSchema);

// ============================================
// Intelligent Communications Service Class
// ============================================
class IntelligentCommunicationsService {
  constructor() {
    this.Correspondence = Correspondence;
    this.ExternalEntity = ExternalEntity;
    this.Template = CorrespondenceTemplate;
    this.config = config;

    // Queue for background processing
    this.processingQueue = [];
    this.isProcessing = false;
  }

  // ============================================
  // Reference Number Generation
  // ============================================

  /**
   * Generate unique reference number
   */
  async generateReferenceNumber(type, department, options = {}) {
    const year = moment().format('YYYY');
    const month = moment().format('MM');

    // Get prefix based on type
    const prefixes = {
      [CorrespondenceType.INTERNAL]: 'INT',
      [CorrespondenceType.EXTERNAL]: 'EXT',
      [CorrespondenceType.INCOMING]: 'INC',
      [CorrespondenceType.OUTGOING]: 'OUT',
      [CorrespondenceType.CIRCULAR]: 'CIR',
      [CorrespondenceType.DECISION]: 'DEC',
      [CorrespondenceType.DIRECTIVE]: 'DIR',
      [CorrespondenceType.MEMO]: 'MEM',
      [CorrespondenceType.REPORT]: 'RPT',
      [CorrespondenceType.CONTRACT]: 'CON',
      [CorrespondenceType.INVOICE]: 'INV',
      [CorrespondenceType.COMPLAINT]: 'CMP',
      [CorrespondenceType.REQUEST]: 'REQ',
    };

    const prefix = prefixes[type] || 'COR';

    // Get department code
    let deptCode = 'GEN';
    if (department) {
      const dept = await mongoose.model('Department').findById(department).select('code');
      if (dept && dept.code) deptCode = dept.code.substring(0, 3).toUpperCase();
    }

    // Get sequence number
    const count = await Correspondence.countDocuments({
      type,
      createdAt: {
        $gte: moment().startOf('year').toDate(),
        $lte: moment().endOf('year').toDate(),
      },
    });

    const sequence = (count + 1).toString().padStart(6, '0');

    // Generate reference
    let reference = `${prefix}-${deptCode}-${year}-${sequence}`;

    // Add suffix if provided
    if (options.suffix) {
      reference += `-${options.suffix}`;
    }

    // Ensure uniqueness
    let exists = await Correspondence.findOne({ referenceNumber: reference });
    let attempts = 0;
    while (exists && attempts < 100) {
      const newSequence = (count + attempts + 1).toString().padStart(6, '0');
      reference = `${prefix}-${deptCode}-${year}-${newSequence}`;
      if (options.suffix) reference += `-${options.suffix}`;
      exists = await Correspondence.findOne({ referenceNumber: reference });
      attempts++;
    }

    return reference;
  }

  // ============================================
  // Create Operations
  // ============================================

  /**
   * Create new correspondence with intelligent processing
   */
  async createCorrespondence(data, userId, options = {}) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Generate reference number
      if (!data.referenceNumber) {
        data.referenceNumber = await this.generateReferenceNumber(
          data.type,
          data.sender?.department,
          options
        );
      }

      // Create correspondence
      const correspondence = new Correspondence({
        ...data,
        createdBy: userId,
        status: data.status || Status.DRAFT,
      });

      // Add timeline entry
      correspondence.timeline.push({
        action: 'created',
        performedBy: userId,
        metadata: {
          newValue: {
            status: correspondence.status,
            referenceNumber: correspondence.referenceNumber,
          },
        },
      });

      // Set default due date based on priority
      if (!correspondence.dueDate && correspondence.priority) {
        const dueDays = {
          [Priority.CRITICAL]: 1,
          [Priority.URGENT]: 3,
          [Priority.HIGH]: 7,
          [Priority.NORMAL]: 14,
          [Priority.LOW]: 30,
        };
        correspondence.dueDate = moment().add(dueDays[correspondence.priority], 'days').toDate();
      }

      // Trigger AI analysis
      if (config.ai.enabled && options.analyze !== false) {
        this.queueForAnalysis(correspondence);
      }

      await correspondence.save({ session });

      // Log activity
      await this.logActivity(correspondence._id, 'created', userId, {
        referenceNumber: correspondence.referenceNumber,
        type: correspondence.type,
        subject: correspondence.subject,
      });

      await session.commitTransaction();

      // Process async tasks
      this.processAsyncTasks(correspondence, 'create');

      return correspondence;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Create from template
   */
  async createFromTemplate(templateId, data, userId) {
    const template = await this.Template.findById(templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    // Replace variables in content
    let content = template.content;
    let subject = template.subject;

    if (data.variables) {
      for (const [key, value] of Object.entries(data.variables)) {
        const regex = new RegExp(`{{${key}}}`, 'g');
        content = content.replace(regex, value);
        subject = subject.replace(regex, value);
      }
    }

    // Build correspondence data
    const correspondenceData = {
      type: template.type,
      category: template.category,
      subject,
      content,
      priority: data.priority || template.settings.defaultPriority,
      confidentiality: data.confidentiality || template.settings.defaultConfidentiality,
      responseRequired: template.settings.responseRequired,
      sender: data.sender,
      recipients: data.recipients || [],
      attachments: data.attachments || [],
      ...data,
    };

    // Generate reference with template prefix
    if (template.settings.numberingPrefix) {
      correspondenceData.referenceNumber = await this.generateReferenceNumber(
        template.type,
        data.sender?.department,
        { suffix: template.settings.numberingPrefix }
      );
    }

    // Set default due date
    if (template.settings.defaultDueDays && !correspondenceData.dueDate) {
      correspondenceData.dueDate = moment().add(template.settings.defaultDueDays, 'days').toDate();
    }

    // Update template statistics
    await this.Template.findByIdAndUpdate(templateId, {
      $inc: { 'statistics.usageCount': 1 },
      $set: { 'statistics.lastUsedAt': new Date() },
    });

    return this.createCorrespondence(correspondenceData, userId);
  }

  // ============================================
  // AI and Intelligence Features
  // ============================================

  /**
   * Analyze correspondence with AI
   */
  async analyzeWithAI(correspondence) {
    if (!config.ai.enabled || !config.ai.apiKey) {
      return null;
    }

    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: config.ai.model,
          messages: [
            {
              role: 'system',
              content: `أنت مساعد ذكي لتصنيف وتحليل المراسلات الإدارية السعودية.
              قم بتحليل المراسلة وتقديم:
              1. التصنيف المناسب
              2. الكلمات المفتاحية
              3. مستوى الأهمية
              4. الإجراءات المقترحة
              5. تحليل المشاعر
              بتنسيق JSON.`,
            },
            {
              role: 'user',
              content: `الموضوع: ${correspondence.subject}\n\nالمحتوى: ${correspondence.content}`,
            },
          ],
          response_format: { type: 'json_object' },
        },
        {
          headers: {
            Authorization: `Bearer ${config.ai.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const analysis = JSON.parse(response.data.choices[0].message.content);

      // Update correspondence with AI analysis
      correspondence.aiAnalysis = {
        classified: true,
        classification: {
          type: analysis.classification?.type || correspondence.type,
          category: analysis.classification?.category,
          subcategory: analysis.classification?.subcategory,
          confidence: analysis.classification?.confidence || 0.8,
        },
        keywords: analysis.keywords || [],
        entities: analysis.entities || [],
        sentiment: {
          score: analysis.sentiment?.score || 0,
          label: analysis.sentiment?.label || 'neutral',
        },
        urgencyPrediction: {
          score: analysis.urgency?.score || 0.5,
          factors: analysis.urgency?.factors || [],
        },
        suggestedActions: analysis.suggestedActions || [],
        analyzedAt: new Date(),
      };

      // Adjust priority if AI suggests higher urgency
      if (analysis.urgency?.score > 0.8 && correspondence.priority === Priority.NORMAL) {
        correspondence.priority = Priority.HIGH;
        correspondence.timeline.push({
          action: 'priority_changed',
          performedBy: null,
          metadata: {
            oldValue: Priority.NORMAL,
            newValue: Priority.HIGH,
            notes: 'تم التعديل تلقائياً بناءً على تحليل الذكاء الاصطناعي',
            systemGenerated: true,
          },
        });
      }

      await correspondence.save();

      return correspondence.aiAnalysis;
    } catch (error) {
      logger.error('AI Analysis Error:', error.message);
      return null;
    }
  }

  /**
   * Find similar correspondences
   */
  async findSimilar(correspondenceId, limit = 5) {
    const correspondence = await Correspondence.findById(correspondenceId);
    if (!correspondence) {
      throw new Error('Correspondence not found');
    }

    // Use text search to find similar
    const similar = await Correspondence.find(
      {
        $text: { $search: correspondence.subject + ' ' + correspondence.content },
        _id: { $ne: correspondenceId },
      },
      { score: { $meta: 'textScore' } }
    )
      .sort({ score: { $meta: 'textScore' } })
      .limit(limit)
      .select('referenceNumber subject type status date');

    return similar;
  }

  /**
   * Queue for background AI analysis
   */
  queueForAnalysis(correspondence) {
    this.processingQueue.push({
      type: 'ai_analysis',
      correspondenceId: correspondence._id,
      priority:
        correspondence.priority === Priority.CRITICAL || correspondence.priority === Priority.URGENT
          ? 1
          : 2,
    });

    this.startProcessing();
  }

  /**
   * Start background processing
   */
  async startProcessing() {
    if (this.isProcessing) return;

    this.isProcessing = true;

    while (this.processingQueue.length > 0) {
      // Sort by priority
      this.processingQueue.sort((a, b) => a.priority - b.priority);

      const task = this.processingQueue.shift();

      try {
        const correspondence = await Correspondence.findById(task.correspondenceId);
        if (correspondence) {
          switch (task.type) {
            case 'ai_analysis':
              await this.analyzeWithAI(correspondence);
              break;
            case 'similar_search': {
              const similar = await this.findSimilar(task.correspondenceId);
              correspondence.aiAnalysis.similarCorrespondences = similar.map(s => ({
                reference: s.referenceNumber,
                similarity: s._doc.score || 0.5,
              }));
              await correspondence.save();
              break;
            }
          }
        }
      } catch (error) {
        logger.error(`Background task error: ${error.message}`);
      }
    }

    this.isProcessing = false;
  }

  // ============================================
  // Workflow Operations
  // ============================================

  /**
   * Submit for review
   */
  async submitForReview(id, userId) {
    const correspondence = await Correspondence.findById(id);
    if (!correspondence) {
      throw new Error('Correspondence not found');
    }

    if (correspondence.status !== Status.DRAFT) {
      throw new Error('Only draft correspondence can be submitted for review');
    }

    correspondence.status = Status.PENDING_REVIEW;
    correspondence.workflowStage = 'review';

    correspondence.timeline.push({
      action: 'status_changed',
      performedBy: userId,
      metadata: {
        oldValue: Status.DRAFT,
        newValue: Status.PENDING_REVIEW,
      },
    });

    await correspondence.save();

    // Notify reviewers
    await this.notifyReviewers(correspondence);

    return correspondence;
  }

  /**
   * Approve correspondence
   */
  async approve(id, userId, comments = '') {
    const correspondence = await Correspondence.findById(id);
    if (!correspondence) {
      throw new Error('Correspondence not found');
    }

    if (
      correspondence.status !== Status.PENDING_REVIEW &&
      correspondence.status !== Status.PENDING_APPROVAL
    ) {
      throw new Error('Invalid status for approval');
    }

    // Check if in approval chain
    const approvalIndex = correspondence.approvalChain.findIndex(
      a => a.approver.toString() === userId.toString() && a.status === 'pending'
    );

    if (approvalIndex >= 0) {
      // Update approval chain
      correspondence.approvalChain[approvalIndex].status = 'approved';
      correspondence.approvalChain[approvalIndex].decision = {
        approved: true,
        comments,
        decidedAt: new Date(),
      };

      // Check if all sequential approvals are done
      const allApproved = correspondence.approvalChain
        .filter(
          a =>
            a.type === 'sequential' || a.order <= correspondence.approvalChain[approvalIndex].order
        )
        .every(a => a.status === 'approved');

      if (allApproved) {
        correspondence.status = Status.APPROVED;
        correspondence.workflowStage = 'dispatch';
      }
    } else {
      // Direct approval
      correspondence.status = Status.APPROVED;
      correspondence.workflowStage = 'dispatch';
    }

    correspondence.timeline.push({
      action: 'approved',
      performedBy: userId,
      metadata: { notes: comments },
    });

    await correspondence.save();

    return correspondence;
  }

  /**
   * Reject correspondence
   */
  async reject(id, userId, reason) {
    const correspondence = await Correspondence.findById(id);
    if (!correspondence) {
      throw new Error('Correspondence not found');
    }

    // Update approval chain
    const approvalIndex = correspondence.approvalChain.findIndex(
      a => a.approver.toString() === userId.toString() && a.status === 'pending'
    );

    if (approvalIndex >= 0) {
      correspondence.approvalChain[approvalIndex].status = 'rejected';
      correspondence.approvalChain[approvalIndex].decision = {
        approved: false,
        comments: reason,
        decidedAt: new Date(),
      };
    }

    correspondence.status = Status.REJECTED;

    correspondence.timeline.push({
      action: 'rejected',
      performedBy: userId,
      metadata: { notes: reason },
    });

    await correspondence.save();

    // Notify sender
    await this.notifySender(correspondence, 'rejected', reason);

    return correspondence;
  }

  /**
   * Send correspondence
   */
  async send(id, userId, options = {}) {
    const correspondence = await Correspondence.findById(id);
    if (!correspondence) {
      throw new Error('Correspondence not found');
    }

    if (correspondence.status !== Status.APPROVED && correspondence.status !== Status.DRAFT) {
      throw new Error('Invalid status for sending');
    }

    correspondence.status = Status.SENT;
    correspondence.workflowStage = 'delivery';

    // Update recipients
    correspondence.recipients.forEach(recipient => {
      recipient.status = 'notified';
      recipient.notifiedAt = new Date();
    });

    correspondence.timeline.push({
      action: 'sent',
      performedBy: userId,
    });

    await correspondence.save();

    // Send notifications
    await this.sendNotifications(correspondence, options);

    return correspondence;
  }

  // ============================================
  // Recipient Actions
  // ============================================

  /**
   * Mark as read
   */
  async markAsRead(id, userId) {
    const correspondence = await Correspondence.findById(id);
    if (!correspondence) {
      throw new Error('Correspondence not found');
    }

    const recipientIndex = correspondence.recipients.findIndex(
      r => r.user && r.user.toString() === userId.toString()
    );

    if (recipientIndex < 0) {
      throw new Error('User is not a recipient');
    }

    correspondence.recipients[recipientIndex].status = 'read';
    correspondence.recipients[recipientIndex].readAt = new Date();

    correspondence.timeline.push({
      action: 'read',
      performedBy: userId,
    });

    correspondence.statistics.viewCount += 1;
    correspondence.statistics.lastViewedAt = new Date();

    await correspondence.save();

    return correspondence;
  }

  /**
   * Acknowledge receipt
   */
  async acknowledge(id, userId, data = {}) {
    const correspondence = await Correspondence.findById(id);
    if (!correspondence) {
      throw new Error('Correspondence not found');
    }

    const recipientIndex = correspondence.recipients.findIndex(
      r => r.user && r.user.toString() === userId.toString()
    );

    if (recipientIndex < 0) {
      throw new Error('User is not a recipient');
    }

    correspondence.recipients[recipientIndex].status = 'acknowledged';
    correspondence.recipients[recipientIndex].acknowledgedAt = new Date();

    // Add digital signature if provided
    if (data.signature) {
      correspondence.recipients[recipientIndex].digitalSignature = {
        signed: true,
        signatureHash: crypto.createHash('sha256').update(data.signature).digest('hex'),
        signedAt: new Date(),
        verified: false,
      };
    }

    // Add location if provided
    if (data.location) {
      correspondence.recipients[recipientIndex].location = {
        ...data.location,
        timestamp: new Date(),
      };
    }

    correspondence.timeline.push({
      action: 'acknowledged',
      performedBy: userId,
      deviceInfo: {
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
    });

    await correspondence.save();

    return correspondence;
  }

  /**
   * Forward correspondence
   */
  async forward(id, userId, data) {
    const original = await Correspondence.findById(id);
    if (!original) {
      throw new Error('Original correspondence not found');
    }

    // Create new correspondence based on original
    const forwarded = await this.createCorrespondence(
      {
        type: original.type,
        subject: `محول: ${original.subject}`,
        content: original.content,
        priority: data.priority || original.priority,
        confidentiality: original.confidentiality,
        parentReference: original.referenceNumber,
        relatedReferences: [...original.relatedReferences, original.referenceNumber],
        sender: {
          user: userId,
          department: data.senderDepartment,
        },
        recipients: data.recipients,
        attachments: original.attachments,
        responseTo: original._id,
      },
      userId
    );

    // Update original
    original.forwardCount += 1;
    original.timeline.push({
      action: 'forwarded',
      performedBy: userId,
      metadata: {
        newValue: forwarded.referenceNumber,
      },
    });

    await original.save();

    return forwarded;
  }

  // ============================================
  // Action Management
  // ============================================

  /**
   * Add action item
   */
  async addAction(id, actionData, userId) {
    const correspondence = await Correspondence.findById(id);
    if (!correspondence) {
      throw new Error('Correspondence not found');
    }

    correspondence.actions.push({
      ...actionData,
      status: 'pending',
    });

    correspondence.timeline.push({
      action: 'action_added',
      performedBy: userId,
      metadata: { notes: actionData.title },
    });

    // Check if should change status
    if (correspondence.status === Status.SENT || correspondence.status === Status.DELIVERED) {
      correspondence.status = Status.ACTION_REQUIRED;
    }

    await correspondence.save();

    // Notify assignee
    if (actionData.assignee) {
      await this.notifyAssignee(correspondence, actionData.assignee, actionData);
    }

    return correspondence;
  }

  /**
   * Complete action
   */
  async completeAction(id, actionIndex, data, userId) {
    const correspondence = await Correspondence.findById(id);
    if (!correspondence) {
      throw new Error('Correspondence not found');
    }

    if (!correspondence.actions[actionIndex]) {
      throw new Error('Action not found');
    }

    correspondence.actions[actionIndex].status = 'completed';
    correspondence.actions[actionIndex].completedAt = new Date();
    correspondence.actions[actionIndex].completedBy = userId;
    correspondence.actions[actionIndex].notes = data.notes;

    if (data.attachments) {
      correspondence.actions[actionIndex].attachments = data.attachments;
    }

    correspondence.timeline.push({
      action: 'action_completed',
      performedBy: userId,
      metadata: {
        oldValue: correspondence.actions[actionIndex].title,
        notes: data.notes,
      },
    });

    // Check if all actions are completed
    const allCompleted = correspondence.actions.every(a => a.status === 'completed');
    if (allCompleted) {
      correspondence.status = Status.COMPLETED;
      correspondence.workflowStage = 'completion';
    }

    await correspondence.save();

    return correspondence;
  }

  // ============================================
  // Escalation
  // ============================================

  /**
   * Escalate correspondence
   */
  async escalate(id, userId, reason) {
    const correspondence = await Correspondence.findById(id);
    if (!correspondence) {
      throw new Error('Correspondence not found');
    }

    // Find escalation target (manager of current level)
    const escalationUser = await this.findEscalationTarget(correspondence);

    correspondence.escalation = {
      escalated: true,
      escalatedTo: escalationUser._id,
      escalatedAt: new Date(),
      reason,
      level: (correspondence.escalation?.level || 0) + 1,
    };

    correspondence.timeline.push({
      action: 'escalated',
      performedBy: userId,
      metadata: {
        notes: reason,
        newValue: escalationUser._id,
      },
    });

    // Increase priority
    const priorityOrder = [
      Priority.LOW,
      Priority.NORMAL,
      Priority.HIGH,
      Priority.URGENT,
      Priority.CRITICAL,
    ];
    const currentIndex = priorityOrder.indexOf(correspondence.priority);
    if (currentIndex < priorityOrder.length - 1) {
      correspondence.priority = priorityOrder[currentIndex + 1];
    }

    await correspondence.save();

    // Notify escalation target
    await this.notifyEscalation(correspondence, escalationUser, reason);

    return correspondence;
  }

  /**
   * Find escalation target
   */
  async findEscalationTarget(correspondence) {
    // Logic to find appropriate escalation target
    // This would typically be the manager of the current handler
    const User = mongoose.model('User');
    const currentHandler = correspondence.sender.user;

    const handler = await User.findById(currentHandler).populate('manager');
    if (handler && handler.manager) {
      return handler.manager;
    }

    // Default to admin if no manager found
    return await User.findOne({ role: 'admin' });
  }

  // ============================================
  // Search and Query
  // ============================================

  /**
   * Advanced search
   */
  async search(query, options = {}) {
    const { page = 1, limit = 20, sort = { createdAt: -1 }, fields } = options;

    const searchQuery = {};

    // Text search
    if (query.search) {
      searchQuery.$text = { $search: query.search };
    }

    // Filters
    if (query.type) searchQuery.type = query.type;
    if (query.status) searchQuery.status = query.status;
    if (query.priority) searchQuery.priority = query.priority;
    if (query.confidentiality) searchQuery.confidentiality = query.confidentiality;
    if (query.category) searchQuery.category = query.category;

    // Date range
    if (query.startDate || query.endDate) {
      searchQuery.date = {};
      if (query.startDate) searchQuery.date.$gte = new Date(query.startDate);
      if (query.endDate) searchQuery.date.$lte = new Date(query.endDate);
    }

    // Sender
    if (query.sender) {
      searchQuery['sender.user'] = query.sender;
    }

    // Recipient
    if (query.recipient) {
      searchQuery['recipients.user'] = query.recipient;
    }

    // Tags
    if (query.tags) {
      searchQuery.tags = { $in: Array.isArray(query.tags) ? query.tags : [query.tags] };
    }

    // Department
    if (query.department) {
      searchQuery['sender.department'] = query.department;
    }

    // External entity
    if (query.externalEntity) {
      searchQuery['externalEntity.entity'] = query.externalEntity;
    }

    // Overdue
    if (query.overdue === true) {
      searchQuery.dueDate = { $lt: new Date() };
      searchQuery.status = { $nin: [Status.COMPLETED, Status.ARCHIVED, Status.CANCELLED] };
    }

    // Exclude deleted
    searchQuery.deletedAt = null;

    // Build selection
    const selection = fields ? fields.split(',').join(' ') : '';

    const result = await Correspondence.paginate(searchQuery, {
      page: parseInt(page),
      limit: parseInt(limit),
      sort,
      select: selection,
      populate: [
        { path: 'sender.user', select: 'name email' },
        { path: 'sender.department', select: 'name' },
        { path: 'recipients.user', select: 'name email' },
        { path: 'externalEntity.entity', select: 'name' },
      ],
    });

    return result;
  }

  /**
   * Get dashboard statistics
   */
  async getStatistics(options = {}) {
    const { startDate, endDate, department, user } = options;

    const matchQuery = {};

    if (startDate || endDate) {
      matchQuery.createdAt = {};
      if (startDate) matchQuery.createdAt.$gte = new Date(startDate);
      if (endDate) matchQuery.createdAt.$lte = new Date(endDate);
    }

    if (department) {
      matchQuery['sender.department'] = mongoose.Types.ObjectId(department);
    }

    if (user) {
      matchQuery.$or = [
        { 'sender.user': mongoose.Types.ObjectId(user) },
        { 'recipients.user': mongoose.Types.ObjectId(user) },
      ];
    }

    const stats = await Correspondence.aggregate([
      { $match: matchQuery },
      {
        $facet: {
          byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
          byType: [{ $group: { _id: '$type', count: { $sum: 1 } } }],
          byPriority: [{ $group: { _id: '$priority', count: { $sum: 1 } } }],
          overdue: [
            {
              $match: {
                dueDate: { $lt: new Date() },
                status: { $nin: [Status.COMPLETED, Status.ARCHIVED, Status.CANCELLED] },
              },
            },
            { $count: 'total' },
          ],
          total: [{ $count: 'total' }],
          avgResponseTime: [
            {
              $match: {
                'recipients.acknowledgedAt': { $exists: true },
              },
            },
            {
              $project: {
                responseTime: {
                  $subtract: ['$recipients.acknowledgedAt', '$createdAt'],
                },
              },
            },
            {
              $group: {
                _id: null,
                avgTime: { $avg: '$responseTime' },
              },
            },
          ],
          dailyTrend: [
            {
              $group: {
                _id: {
                  $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
                },
                count: { $sum: 1 },
              },
            },
            { $sort: { _id: -1 } },
            { $limit: 30 },
          ],
        },
      },
    ]);

    return stats[0];
  }

  /**
   * Get overdue items
   */
  async getOverdue(options = {}) {
    const { page = 1, limit = 20, user } = options;

    const query = {
      dueDate: { $lt: new Date() },
      status: { $nin: [Status.COMPLETED, Status.ARCHIVED, Status.CANCELLED] },
    };

    if (user) {
      query.$or = [
        { 'sender.user': user },
        { 'recipients.user': user },
        { 'actions.assignee': user },
      ];
    }

    return Correspondence.paginate(query, {
      page,
      limit,
      sort: { dueDate: 1 },
      populate: [
        { path: 'sender.user', select: 'name email' },
        { path: 'recipients.user', select: 'name email' },
      ],
    });
  }

  // ============================================
  // Notifications
  // ============================================

  /**
   * Send notifications
   */
  async sendNotifications(correspondence, options = {}) {
    const notificationPromises = [];

    for (const recipient of correspondence.recipients) {
      if (!recipient.user) continue;

      const User = mongoose.model('User');
      const user = await User.findById(recipient.user);

      if (!user) continue;

      const notification = {
        title: `مراسلة جديدة: ${correspondence.subject}`,
        body: `مرجع: ${correspondence.referenceNumber}`,
        data: {
          correspondenceId: correspondence._id.toString(),
          type: 'correspondence',
          action: recipient.actionRequired?.type || 'view',
        },
      };

      // Email notification
      if (config.notifications.email && user.email) {
        notificationPromises.push(
          this.sendEmailNotification(user.email, correspondence, notification)
        );
      }

      // SMS notification
      if (config.notifications.sms && user.phone && correspondence.priority === Priority.CRITICAL) {
        notificationPromises.push(
          this.sendSMSNotification(user.phone, correspondence, notification)
        );
      }

      // Push notification
      if (config.notifications.push) {
        notificationPromises.push(this.sendPushNotification(user._id, notification));
      }
    }

    await Promise.allSettled(notificationPromises);
  }

  /**
   * Notify reviewers
   */
  async notifyReviewers(correspondence) {
    // Implementation for notifying reviewers
    const notification = {
      title: 'طلب مراجعة',
      body: `يرجى مراجعة المراسلة: ${correspondence.subject}`,
      data: {
        correspondenceId: correspondence._id.toString(),
        type: 'review_request',
      },
    };

    // Get reviewers based on workflow rules
    // This would be implemented based on organization's review process
  }

  /**
   * Notify sender
   */
  async notifySender(correspondence, event, data) {
    if (!correspondence.sender.user) return;

    const User = mongoose.model('User');
    const sender = await User.findById(correspondence.sender.user);

    if (!sender) return;

    const notifications = {
      rejected: {
        title: 'تم رفض المراسلة',
        body: `تم رفض المراسلة: ${correspondence.subject}. السبب: ${data}`,
      },
      approved: {
        title: 'تم اعتماد المراسلة',
        body: `تم اعتماد المراسلة: ${correspondence.subject}`,
      },
    };

    const notification = notifications[event];
    if (notification && sender.email) {
      await this.sendEmailNotification(sender.email, correspondence, notification);
    }
  }

  /**
   * Notify assignee
   */
  async notifyAssignee(correspondence, assigneeId, action) {
    const User = mongoose.model('User');
    const assignee = await User.findById(assigneeId);

    if (!assignee) return;

    const notification = {
      title: `إجراء مطلوب: ${action.title}`,
      body: `في المراسلة: ${correspondence.subject}`,
      data: {
        correspondenceId: correspondence._id.toString(),
        type: 'action_required',
        actionId: action._id?.toString(),
      },
    };

    if (assignee.email) {
      await this.sendEmailNotification(assignee.email, correspondence, notification);
    }
  }

  /**
   * Notify escalation
   */
  async notifyEscalation(correspondence, escalationUser, reason) {
    const notification = {
      title: 'تصعيد مراسلة',
      body: `تم تصعيد المراسلة: ${correspondence.subject}. السبب: ${reason}`,
      data: {
        correspondenceId: correspondence._id.toString(),
        type: 'escalation',
      },
    };

    if (escalationUser.email) {
      await this.sendEmailNotification(escalationUser.email, correspondence, notification);
    }
  }

  /**
   * Send email notification
   */
  async sendEmailNotification(email, correspondence, notification) {
    // Integration with email service
    const { emailService } = require('./email-service');

    try {
      await emailService.send({
        to: email,
        subject: notification.title,
        template: 'correspondence-notification',
        data: {
          ...notification,
          correspondence,
        },
      });
    } catch (error) {
      logger.error('Email notification error:', error.message);
    }
  }

  /**
   * Send SMS notification
   */
  async sendSMSNotification(phone, correspondence, notification) {
    // Integration with SMS service
    const { smsService } = require('./sms-service');

    try {
      await smsService.send({
        to: phone,
        message: `${notification.title}\n${notification.body}`,
      });
    } catch (error) {
      logger.error('SMS notification error:', error.message);
    }
  }

  /**
   * Send push notification
   */
  async sendPushNotification(userId, notification) {
    // Integration with push notification service
    // This would integrate with FCM, APNs, or other push services
  }

  // ============================================
  // Government Integrations
  // ============================================

  /**
   * Send to government entity
   */
  async sendToGovernmentEntity(correspondenceId, entityId) {
    const correspondence = await Correspondence.findById(correspondenceId);
    const entity = await ExternalEntity.findById(entityId);

    if (!correspondence || !entity) {
      throw new Error('Correspondence or entity not found');
    }

    if (!entity.integration?.enabled) {
      throw new Error('Entity integration not enabled');
    }

    switch (entity.integration.type) {
      case 'api':
        return this.sendViaGovernmentAPI(correspondence, entity);
      case 'portal':
        return this.sendViaPortal(correspondence, entity);
      default:
        throw new Error(`Unsupported integration type: ${entity.integration.type}`);
    }
  }

  /**
   * Send via government API
   */
  async sendViaGovernmentAPI(correspondence, entity) {
    try {
      const response = await axios.post(
        entity.integration.apiUrl,
        {
          referenceNumber: correspondence.referenceNumber,
          subject: correspondence.subject,
          content: correspondence.content,
          sender: {
            name: correspondence.sender.user.name,
            department: correspondence.sender.department?.name,
          },
          attachments: correspondence.attachments.map(a => ({
            filename: a.filename,
            content: a.path,
          })),
        },
        {
          headers: {
            Authorization: `Bearer ${entity.integration.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      // Update tracking
      correspondence.externalEntity.trackingNumber = response.data.trackingNumber;
      correspondence.timeline.push({
        action: 'sent',
        metadata: {
          notes: `Sent to ${entity.name} via API`,
          newValue: response.data.trackingNumber,
        },
        systemGenerated: true,
      });

      await correspondence.save();

      return response.data;
    } catch (error) {
      logger.error('Government API error:', error.message);
      throw new Error('فشل الإرسال إلى الجهة الحكومية');
    }
  }

  /**
   * Send via government portal
   */
  async sendViaPortal(correspondence, entity) {
    // Implementation for portal-based submission
    // This would involve browser automation or specific portal APIs
  }

  /**
   * Track with Saudi Post
   */
  async trackWithSaudiPost(trackingNumber) {
    if (!config.government.post.enabled) {
      throw new Error('Saudi Post integration not enabled');
    }

    try {
      const response = await axios.get(
        `${config.government.post.baseUrl}/track/${trackingNumber}`,
        {
          headers: {
            Authorization: `Bearer ${config.government.post.apiKey}`,
          },
        }
      );

      return response.data;
    } catch (error) {
      logger.error('Saudi Post tracking error:', error.message);
      throw new Error('فشل تتبع الشحنة');
    }
  }

  // ============================================
  // Reporting
  // ============================================

  /**
   * Generate report
   */
  async generateReport(reportType, options = {}) {
    switch (reportType) {
      case 'summary':
        return this.generateSummaryReport(options);
      case 'detailed':
        return this.generateDetailedReport(options);
      case 'performance':
        return this.generatePerformanceReport(options);
      case 'overdue':
        return this.generateOverdueReport(options);
      default:
        throw new Error(`Unknown report type: ${reportType}`);
    }
  }

  /**
   * Generate summary report
   */
  async generateSummaryReport(options) {
    const stats = await this.getStatistics(options);

    return {
      title: 'تقرير ملخص المراسلات',
      period: {
        start: options.startDate,
        end: options.endDate,
      },
      summary: {
        total: stats.total[0]?.total || 0,
        byStatus: stats.byStatus.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        byType: stats.byType.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        byPriority: stats.byPriority.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        overdue: stats.overdue[0]?.total || 0,
        averageResponseTime: stats.avgResponseTime[0]?.avgTime
          ? Math.round(stats.avgResponseTime[0].avgTime / (1000 * 60 * 60)) // in hours
          : null,
      },
      trend: stats.dailyTrend,
      generatedAt: new Date(),
    };
  }

  /**
   * Generate detailed report
   */
  async generateDetailedReport(options) {
    const { startDate, endDate, department } = options;

    const query = {};
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    if (department) {
      query['sender.department'] = department;
    }

    const correspondences = await Correspondence.find(query)
      .populate('sender.user', 'name email')
      .populate('sender.department', 'name')
      .sort({ createdAt: -1 });

    return {
      title: 'تقرير تفصيلي للمراسلات',
      period: {
        start: startDate,
        end: endDate,
      },
      correspondences: correspondences.map(c => ({
        referenceNumber: c.referenceNumber,
        subject: c.subject,
        type: c.type,
        status: c.status,
        priority: c.priority,
        sender: c.sender.user?.name,
        department: c.sender.department?.name,
        date: c.date,
        dueDate: c.dueDate,
        isOverdue: c.isOverdue,
        daysRemaining: c.daysRemaining,
        recipientCount: c.recipients.length,
        attachmentCount: c.attachments.length,
      })),
      generatedAt: new Date(),
    };
  }

  /**
   * Generate performance report
   */
  async generatePerformanceReport(options) {
    const stats = await this.getStatistics(options);

    // Calculate KPIs
    const total = stats.total[0]?.total || 0;
    const completed = stats.byStatus.find(s => s._id === Status.COMPLETED)?.count || 0;
    const overdue = stats.overdue[0]?.total || 0;

    return {
      title: 'تقرير أداء المراسلات',
      period: {
        start: options.startDate,
        end: options.endDate,
      },
      kpis: {
        completionRate: total > 0 ? ((completed / total) * 100).toFixed(2) : 0,
        overdueRate: total > 0 ? ((overdue / total) * 100).toFixed(2) : 0,
        averageResponseTime: stats.avgResponseTime[0]?.avgTime
          ? Math.round(stats.avgResponseTime[0].avgTime / (1000 * 60 * 60))
          : null,
      },
      distribution: {
        byStatus: stats.byStatus,
        byPriority: stats.byPriority,
        byType: stats.byType,
      },
      trend: stats.dailyTrend,
      generatedAt: new Date(),
    };
  }

  /**
   * Generate overdue report
   */
  async generateOverdueReport(options) {
    const overdue = await this.getOverdue({ limit: 1000, ...options });

    // Group by responsible party
    const byResponsible = {};
    for (const item of overdue.docs) {
      const responsible = item.sender.user?.name || 'غير محدد';
      if (!byResponsible[responsible]) {
        byResponsible[responsible] = [];
      }
      byResponsible[responsible].push(item);
    }

    return {
      title: 'تقرير المراسلات المتأخرة',
      generatedAt: new Date(),
      totalOverdue: overdue.totalDocs,
      byResponsible,
      details: overdue.docs.map(c => ({
        referenceNumber: c.referenceNumber,
        subject: c.subject,
        dueDate: c.dueDate,
        daysOverdue: Math.abs(c.daysRemaining),
        priority: c.priority,
        status: c.status,
        responsible: c.sender.user?.name,
      })),
    };
  }

  // ============================================
  // Helper Methods
  // ============================================

  /**
   * Log activity
   */
  async logActivity(correspondenceId, action, userId, metadata = {}) {
    // Implementation for activity logging
    // This could log to a separate collection or external service
  }

  /**
   * Process async tasks
   */
  processAsyncTasks(correspondence, event) {
    // Queue background tasks
    if (event === 'create' && config.ai.enabled) {
      this.queueForAnalysis(correspondence);
    }
  }

  /**
   * Add comment
   */
  async addComment(id, userId, content, isPrivate = false) {
    const correspondence = await Correspondence.findById(id);
    if (!correspondence) {
      throw new Error('Correspondence not found');
    }

    correspondence.comments.push({
      user: userId,
      content,
      isPrivate,
    });

    correspondence.timeline.push({
      action: 'commented',
      performedBy: userId,
      metadata: { notes: content.substring(0, 100) },
    });

    await correspondence.save();

    return correspondence;
  }

  /**
   * Archive correspondence
   */
  async archive(id, userId, options = {}) {
    const correspondence = await Correspondence.findById(id);
    if (!correspondence) {
      throw new Error('Correspondence not found');
    }

    correspondence.archival = {
      archived: true,
      archivedAt: new Date(),
      archivedBy: userId,
      retentionPeriod: options.retentionPeriod,
      destructionDate: options.retentionPeriod
        ? moment().add(options.retentionPeriod, 'days').toDate()
        : null,
      archiveLocation: options.location,
      archiveReference: options.reference,
    };

    correspondence.status = Status.ARCHIVED;

    correspondence.timeline.push({
      action: 'archived',
      performedBy: userId,
      metadata: { notes: options.notes },
    });

    await correspondence.save();

    return correspondence;
  }
}

// ============================================
// Export
// ============================================
const intelligentCommService = new IntelligentCommunicationsService();

module.exports = {
  IntelligentCommunicationsService,
  intelligentCommService,
  Correspondence,
  ExternalEntity,
  CorrespondenceTemplate,
  CorrespondenceType,
  Priority,
  Status,
  ConfidentialityLevel,
};
