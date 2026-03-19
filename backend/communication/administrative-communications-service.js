/* eslint-disable no-unused-vars */
/**
 * Administrative Communications Service - خدمة الاتصالات الإدارية
 * نظام متكامل للاتصالات الإدارية والمراسلات الرسمية
 * Supported by Alawael ERP System
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;
const logger = require('../utils/logger');
const { escapeRegex } = require('../utils/sanitize');

// ==================== Enums ====================
const CorrespondenceType = {
  INTERNAL_MEMO: 'internal_memo', // مذكرة داخلية
  OFFICIAL_LETTER: 'official_letter', // خطاب رسمي
  CIRCULAR: 'circular', // تعميم
  DECISION: 'decision', // قرار
  REPORT: 'report', // تقرير
  REQUEST: 'request', // طلب
  RESPONSE: 'response', // رد
  NOTIFICATION: 'notification', // إشعار
  CONTRACT: 'contract', // عقد
  INVITATION: 'invitation', // دعوة
  MINUTES: 'minutes', // محضر
};

const Priority = {
  URGENT: 'urgent', // عاجل
  HIGH: 'high', // مهم جداً
  NORMAL: 'normal', // عادي
  LOW: 'low', // قليل الأهمية
};

const Status = {
  DRAFT: 'draft', // مسودة
  PENDING_REVIEW: 'pending_review', // قيد المراجعة
  PENDING_APPROVAL: 'pending_approval', // قيد الاعتماد
  APPROVED: 'approved', // معتمد
  REJECTED: 'rejected', // مرفوض
  SENT: 'sent', // مرسل
  RECEIVED: 'received', // مستلم
  IN_PROGRESS: 'in_progress', // قيد التنفيذ
  COMPLETED: 'completed', // مكتمل
  ARCHIVED: 'archived', // مؤرشف
  CANCELLED: 'cancelled', // ملغي
};

const ConfidentialityLevel = {
  PUBLIC: 'public', // عام
  INTERNAL: 'internal', // داخلي
  CONFIDENTIAL: 'confidential', // سري
  HIGHLY_CONFIDENTIAL: 'highly_confidential', // سري للغاية
};

const SenderType = {
  INTERNAL: 'internal', // جهة داخلية
  EXTERNAL: 'external', // جهة خارجية
  GOVERNMENT: 'government', // جهة حكومية
  PRIVATE: 'private', // قطاع خاص
};

// ==================== Models ====================

// نموذج المراسلة
const CorrespondenceSchema = new Schema(
  {
    // رقم المراسلة (تلقائي)
    referenceNumber: {
      type: String,
      unique: true,
      required: true,
    },

    // رقم المراسلة الخارجي (للمراسلات الواردة)
    externalReferenceNumber: {
      type: String,
    },

    // نوع المراسلة
    type: {
      type: String,
      enum: Object.values(CorrespondenceType),
      required: true,
    },

    // الموضوع
    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },

    // المحتوى
    content: {
      type: String,
      required: true,
    },

    // الملخص
    summary: {
      type: String,
      maxlength: 1000,
    },

    // الأولوية
    priority: {
      type: String,
      enum: Object.values(Priority),
      default: Priority.NORMAL,
    },

    // الحالة
    status: {
      type: String,
      enum: Object.values(Status),
      default: Status.DRAFT,
    },

    // مستوى السرية
    confidentiality: {
      type: String,
      enum: Object.values(ConfidentialityLevel),
      default: ConfidentialityLevel.INTERNAL,
    },

    // الجهة المرسلة
    sender: {
      type: {
        type: String,
        enum: Object.values(SenderType),
        required: true,
      },
      entityId: {
        type: Schema.Types.ObjectId,
        refPath: 'sender.entityModel',
      },
      entityModel: {
        type: String,
        enum: ['Branch', 'Department', 'User', 'ExternalEntity'],
      },
      name: {
        type: String,
        required: true,
      },
      nameAr: String,
      contactPerson: String,
      phone: String,
      email: String,
      address: String,
    },

    // الجهة المستلمة
    recipients: [
      {
        type: {
          type: String,
          enum: Object.values(SenderType),
        },
        entityId: {
          type: Schema.Types.ObjectId,
          refPath: 'recipients.entityModel',
        },
        entityModel: {
          type: String,
          enum: ['Branch', 'Department', 'User', 'ExternalEntity'],
        },
        name: {
          type: String,
          required: true,
        },
        nameAr: String,
        contactPerson: String,
        phone: String,
        email: String,
        isPrimary: {
          type: Boolean,
          default: false,
        },
        status: {
          type: String,
          enum: Object.values(Status),
          default: Status.SENT,
        },
        receivedAt: Date,
        readAt: Date,
        responseDeadline: Date,
      },
    ],

    // نسخة إلى (CC)
    carbonCopy: [
      {
        entityId: {
          type: Schema.Types.ObjectId,
        },
        name: String,
        nameAr: String,
        type: {
          type: String,
          enum: ['branch', 'department', 'user', 'external'],
        },
      },
    ],

    // المرفقات
    attachments: [
      {
        fileName: {
          type: String,
          required: true,
        },
        originalName: String,
        filePath: String,
        fileSize: Number,
        mimeType: String,
        uploadedBy: {
          type: Schema.Types.ObjectId,
          ref: 'User',
        },
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
        description: String,
        isConfidential: {
          type: Boolean,
          default: false,
        },
      },
    ],

    // سلسلة المراسلات (للردود)
    parentCorrespondence: {
      type: Schema.Types.ObjectId,
      ref: 'Correspondence',
    },

    // المراسلات المرتبطة
    relatedCorrespondences: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Correspondence',
      },
    ],

    // المسار والاعتمادات
    approvalWorkflow: {
      workflowId: {
        type: Schema.Types.ObjectId,
        ref: 'Workflow',
      },
      currentStep: Number,
      totalSteps: Number,
      approvals: [
        {
          stepNumber: Number,
          approverId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
          },
          approverName: String,
          status: {
            type: String,
            enum: ['pending', 'approved', 'rejected', 'delegated'],
            default: 'pending',
          },
          comments: String,
          actionDate: Date,
          delegatedTo: {
            type: Schema.Types.ObjectId,
            ref: 'User',
          },
        },
      ],
      isCompleted: {
        type: Boolean,
        default: false,
      },
    },

    // التوجيهات
    directives: [
      {
        fromUserId: {
          type: Schema.Types.ObjectId,
          ref: 'User',
        },
        fromUserName: String,
        toUserId: {
          type: Schema.Types.ObjectId,
          ref: 'User',
        },
        toUserName: String,
        directive: String,
        deadline: Date,
        priority: {
          type: String,
          enum: Object.values(Priority),
        },
        status: {
          type: String,
          enum: ['pending', 'in_progress', 'completed'],
          default: 'pending',
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // الكلمات المفتاحية
    keywords: [String],

    // التصنيف
    category: {
      mainCategory: String,
      subCategory: String,
      tags: [String],
    },

    // التواريخ
    dateSent: Date,
    dateReceived: Date,
    dueDate: Date,
    validUntil: Date,

    // معلومات إضافية
    metadata: {
      language: {
        type: String,
        default: 'ar',
      },
      pages: Number,
      version: {
        type: Number,
        default: 1,
      },
      templateUsed: String,
      generatedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    },

    // معلومات الأرشفة
    archiveInfo: {
      isArchived: {
        type: Boolean,
        default: false,
      },
      archivedAt: Date,
      archivedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
      archiveLocation: String,
      retentionPeriod: Number, // بالأيام
      destructionDate: Date,
    },

    // معلومات التتبع
    tracking: {
      lastAction: String,
      lastActionDate: Date,
      lastActionBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
      reminderSent: {
        type: Boolean,
        default: false,
      },
      reminderSentAt: Date,
      escalations: [
        {
          escalatedTo: {
            type: Schema.Types.ObjectId,
            ref: 'User',
          },
          escalatedAt: Date,
          reason: String,
        },
      ],
    },

    // إنشاء وتحديث
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    collection: 'correspondences',
  }
);

// Indexes (referenceNumber already indexed via unique: true in schema)
CorrespondenceSchema.index({ type: 1, status: 1 });
CorrespondenceSchema.index({ 'sender.entityId': 1 });
CorrespondenceSchema.index({ 'recipients.entityId': 1 });
CorrespondenceSchema.index({ createdAt: -1 });
CorrespondenceSchema.index({ dueDate: 1 });
CorrespondenceSchema.index({ keywords: 1 });

// نموذج الجهات الخارجية
const ExternalEntitySchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    nameAr: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['government', 'private', 'non_profit', 'international'],
      required: true,
    },
    // للجهات الحكومية السعودية
    governmentInfo: {
      ministryName: String,
      departmentName: String,
      region: String,
      city: String,
    },
    contactInfo: {
      phone: String,
      fax: String,
      email: String,
      website: String,
      poBox: String,
      postalCode: String,
    },
    address: {
      street: String,
      city: String,
      region: String,
      country: {
        type: String,
        default: 'Saudi Arabia',
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    notes: String,
  },
  {
    timestamps: true,
    collection: 'external_entities',
  }
);

// نموذج قوالب المراسلات
const CorrespondenceTemplateSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    nameAr: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: Object.values(CorrespondenceType),
      required: true,
    },
    subject: String,
    content: {
      type: String,
      required: true,
    },
    placeholders: [
      {
        name: String,
        description: String,
        defaultValue: String,
      },
    ],
    headerTemplate: String,
    footerTemplate: String,
    style: {
      fontFamily: String,
      fontSize: Number,
      direction: {
        type: String,
        default: 'rtl',
      },
      textAlign: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    category: String,
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    collection: 'correspondence_templates',
  }
);

// نموذج الإجراءات
const CorrespondenceActionSchema = new Schema(
  {
    correspondenceId: {
      type: Schema.Types.ObjectId,
      ref: 'Correspondence',
      required: true,
    },
    actionType: {
      type: String,
      enum: [
        'create',
        'edit',
        'send',
        'receive',
        'approve',
        'reject',
        'forward',
        'delegate',
        'archive',
        'restore',
        'add_note',
        'attach_file',
        'change_status',
        'set_deadline',
        'reminder',
      ],
      required: true,
    },
    description: String,
    fromStatus: String,
    toStatus: String,
    performedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    performedAt: {
      type: Date,
      default: Date.now,
    },
    notes: String,
    metadata: Schema.Types.Mixed,
  },
  {
    timestamps: true,
    collection: 'correspondence_actions',
  }
);

CorrespondenceActionSchema.index({ correspondenceId: 1, performedAt: -1 });

// Create Models
const Correspondence = mongoose.model('Correspondence', CorrespondenceSchema);
const ExternalEntity = mongoose.model('ExternalEntity', ExternalEntitySchema);
const CorrespondenceTemplate = mongoose.model(
  'CorrespondenceTemplate',
  CorrespondenceTemplateSchema
);
const CorrespondenceAction = mongoose.model('CorrespondenceAction', CorrespondenceActionSchema);

// ==================== Service Class ====================

class AdministrativeCommunicationsService {
  constructor() {
    this.currentYear = new Date().getFullYear();
    this.sequenceCounters = {};
  }

  /**
   * تهيئة الخدمة
   */
  async initialize(connection) {
    this.connection = connection;
    logger.info('✅ Administrative Communications Service initialized');
  }

  /**
   * توليد رقم مرجعي فريد
   */
  async generateReferenceNumber(type, branchCode = 'HQ') {
    const prefix = this.getReferencePrefix(type);
    const year = this.currentYear;
    const counter = await this.getNextCounter(`${prefix}-${year}`);
    const sequence = counter.toString().padStart(6, '0');
    return `${branchCode}/${prefix}/${year}/${sequence}`;
  }

  /**
   * الحصول على بادئة الرقم المرجعي
   */
  getReferencePrefix(type) {
    const prefixes = {
      [CorrespondenceType.INTERNAL_MEMO]: 'MEMO',
      [CorrespondenceType.OFFICIAL_LETTER]: 'LETTER',
      [CorrespondenceType.CIRCULAR]: 'CIRC',
      [CorrespondenceType.DECISION]: 'DEC',
      [CorrespondenceType.REPORT]: 'RPT',
      [CorrespondenceType.REQUEST]: 'REQ',
      [CorrespondenceType.RESPONSE]: 'RES',
      [CorrespondenceType.NOTIFICATION]: 'NOTIF',
      [CorrespondenceType.CONTRACT]: 'CON',
      [CorrespondenceType.INVITATION]: 'INV',
      [CorrespondenceType.MINUTES]: 'MIN',
    };
    return prefixes[type] || 'CORR';
  }

  /**
   * الحصول على الرقم التسلسلي التالي
   */
  async getNextCounter(key) {
    const Counter = this.connection.model('Counter');
    const result = await Counter.findOneAndUpdate(
      { _id: key },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    return result.seq;
  }

  /**
   * إنشاء مراسلة جديدة
   */
  async createCorrespondence(data, userId) {
    const referenceNumber = await this.generateReferenceNumber(data.type, data.branchCode || 'HQ');

    const correspondence = new Correspondence({
      referenceNumber,
      type: data.type,
      subject: data.subject,
      content: data.content,
      summary: data.summary,
      priority: data.priority || Priority.NORMAL,
      confidentiality: data.confidentiality || ConfidentialityLevel.INTERNAL,
      sender: data.sender,
      recipients: data.recipients,
      carbonCopy: data.carbonCopy,
      parentCorrespondence: data.parentCorrespondence,
      relatedCorrespondences: data.relatedCorrespondences,
      keywords: data.keywords,
      category: data.category,
      dueDate: data.dueDate,
      validUntil: data.validUntil,
      metadata: data.metadata,
      createdBy: userId,
    });

    await correspondence.save();

    // تسجيل الإجراء
    await this.logAction(correspondence._id, 'create', userId, 'تم إنشاء المراسلة');

    return correspondence;
  }

  /**
   * تحديث مراسلة
   */
  async updateCorrespondence(id, data, userId) {
    const correspondence = await Correspondence.findById(id);
    if (!correspondence) {
      throw new Error('المراسلة غير موجودة');
    }

    // التحقق من إمكانية التعديل
    if (![Status.DRAFT, Status.PENDING_REVIEW].includes(correspondence.status)) {
      throw new Error('لا يمكن تعديل المراسلة في حالتها الحالية');
    }

    const updateData = { ...data, updatedBy: userId };
    Object.assign(correspondence, updateData);
    await correspondence.save();

    await this.logAction(id, 'edit', userId, 'تم تحديث المراسلة');

    return correspondence;
  }

  /**
   * إرسال مراسلة
   */
  async sendCorrespondence(id, userId) {
    const correspondence = await Correspondence.findById(id);
    if (!correspondence) {
      throw new Error('المراسلة غير موجودة');
    }

    if (correspondence.status === Status.SENT) {
      throw new Error('المراسلة مرسلة بالفعل');
    }

    correspondence.status = Status.SENT;
    correspondence.dateSent = new Date();
    correspondence.updatedBy = userId;
    await correspondence.save();

    // تحديث حالة المستلمين
    correspondence.recipients.forEach(recipient => {
      recipient.status = Status.SENT;
    });
    await correspondence.save();

    await this.logAction(id, 'send', userId, 'تم إرسال المراسلة');

    // إرسال إشعارات للمستلمين
    await this.notifyRecipients(correspondence);

    return correspondence;
  }

  /**
   * استلام مراسلة
   */
  async receiveCorrespondence(id, recipientId, userId) {
    const correspondence = await Correspondence.findById(id);
    if (!correspondence) {
      throw new Error('المراسلة غير موجودة');
    }

    const recipient = correspondence.recipients.id(recipientId);
    if (!recipient) {
      throw new Error('المستلم غير موجود');
    }

    recipient.status = Status.RECEIVED;
    recipient.receivedAt = new Date();
    correspondence.status = Status.RECEIVED;
    correspondence.dateReceived = new Date();
    correspondence.updatedBy = userId;
    await correspondence.save();

    await this.logAction(id, 'receive', userId, 'تم استلام المراسلة');

    return correspondence;
  }

  /**
   * الموافقة على مراسلة
   */
  async approveCorrespondence(id, userId, comments = '') {
    const correspondence = await Correspondence.findById(id);
    if (!correspondence) {
      throw new Error('المراسلة غير موجودة');
    }

    if (correspondence.approvalWorkflow && correspondence.approvalWorkflow.workflowId) {
      // معالجة سير العمل
      return this.processApprovalWorkflow(id, userId, 'approved', comments);
    }

    correspondence.status = Status.APPROVED;
    correspondence.updatedBy = userId;
    await correspondence.save();

    await this.logAction(id, 'approve', userId, comments || 'تمت الموافقة على المراسلة');

    return correspondence;
  }

  /**
   * رفض مراسلة
   */
  async rejectCorrespondence(id, userId, reason = '') {
    const correspondence = await Correspondence.findById(id);
    if (!correspondence) {
      throw new Error('المراسلة غير موجودة');
    }

    if (correspondence.approvalWorkflow && correspondence.approvalWorkflow.workflowId) {
      return this.processApprovalWorkflow(id, userId, 'rejected', reason);
    }

    correspondence.status = Status.REJECTED;
    correspondence.updatedBy = userId;
    await correspondence.save();

    await this.logAction(id, 'reject', userId, reason || 'تم رفض المراسلة');

    return correspondence;
  }

  /**
   * معالجة سير عمل الموافقات
   */
  async processApprovalWorkflow(id, userId, action, comments = '') {
    const correspondence = await Correspondence.findById(id);
    if (!correspondence) {
      throw new Error('المراسلة غير موجودة');
    }

    const workflow = correspondence.approvalWorkflow;
    const currentStep = workflow.currentStep || 0;

    // العثور على موافقة المستخدم الحالي
    const approvalIndex = workflow.approvals.findIndex(
      a => a.approverId.toString() === userId.toString() && a.status === 'pending'
    );

    if (approvalIndex === -1) {
      throw new Error('لا يوجد طلب موافقة معلق لهذا المستخدم');
    }

    const approval = workflow.approvals[approvalIndex];
    approval.status = action;
    approval.comments = comments;
    approval.actionDate = new Date();

    if (action === 'rejected') {
      correspondence.status = Status.REJECTED;
      workflow.isCompleted = true;
    } else {
      // الانتقال للخطوة التالية
      workflow.currentStep = currentStep + 1;

      if (workflow.currentStep >= workflow.totalSteps) {
        workflow.isCompleted = true;
        correspondence.status = Status.APPROVED;
      }
    }

    correspondence.updatedBy = userId;
    await correspondence.save();

    await this.logAction(
      id,
      action === 'approved' ? 'approve' : 'reject',
      userId,
      comments || `تم ${action === 'approved' ? 'الموافقة على' : 'رفض'} المراسلة`
    );

    return correspondence;
  }

  /**
   * توجيه مراسلة
   */
  async addDirective(id, directiveData, userId) {
    const correspondence = await Correspondence.findById(id);
    if (!correspondence) {
      throw new Error('المراسلة غير موجودة');
    }

    correspondence.directives.push({
      fromUserId: userId,
      fromUserName: directiveData.fromUserName,
      toUserId: directiveData.toUserId,
      toUserName: directiveData.toUserName,
      directive: directiveData.directive,
      deadline: directiveData.deadline,
      priority: directiveData.priority,
      status: 'pending',
    });

    correspondence.updatedBy = userId;
    await correspondence.save();

    await this.logAction(id, 'add_note', userId, `توجيه: ${directiveData.directive}`);

    return correspondence;
  }

  /**
   * إضافة مرفق
   */
  async addAttachment(id, attachmentData, userId) {
    const correspondence = await Correspondence.findById(id);
    if (!correspondence) {
      throw new Error('المراسلة غير موجودة');
    }

    correspondence.attachments.push({
      ...attachmentData,
      uploadedBy: userId,
      uploadedAt: new Date(),
    });

    correspondence.updatedBy = userId;
    await correspondence.save();

    await this.logAction(id, 'attach_file', userId, `إضافة مرفق: ${attachmentData.fileName}`);

    return correspondence;
  }

  /**
   * أرشفة مراسلة
   */
  async archiveCorrespondence(id, archiveData, userId) {
    const correspondence = await Correspondence.findById(id);
    if (!correspondence) {
      throw new Error('المراسلة غير موجودة');
    }

    correspondence.status = Status.ARCHIVED;
    correspondence.archiveInfo = {
      isArchived: true,
      archivedAt: new Date(),
      archivedBy: userId,
      archiveLocation: archiveData.archiveLocation,
      retentionPeriod: archiveData.retentionPeriod,
      destructionDate: archiveData.retentionPeriod
        ? new Date(Date.now() + archiveData.retentionPeriod * 24 * 60 * 60 * 1000)
        : null,
    };

    correspondence.updatedBy = userId;
    await correspondence.save();

    await this.logAction(id, 'archive', userId, 'تم أرشفة المراسلة');

    return correspondence;
  }

  /**
   * البحث في المراسلات
   */
  async searchCorrespondences(options = {}) {
    const {
      query,
      type,
      status,
      priority,
      confidentiality,
      senderId,
      recipientId,
      dateFrom,
      dateTo,
      dueDateFrom,
      dueDateTo,
      keywords,
      page = 1,
      limit = 20,
      sort = { createdAt: -1 },
    } = options;

    const filter = {};

    if (query) {
      filter.$or = [
        { referenceNumber: { $regex: escapeRegex(query), $options: 'i' } },
        { subject: { $regex: escapeRegex(query), $options: 'i' } },
        { content: { $regex: escapeRegex(query), $options: 'i' } },
        { 'sender.name': { $regex: escapeRegex(query), $options: 'i' } },
      ];
    }

    if (type) filter.type = type;
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (confidentiality) filter.confidentiality = confidentiality;
    if (senderId) filter['sender.entityId'] = senderId;
    if (recipientId) filter['recipients.entityId'] = recipientId;

    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }

    if (dueDateFrom || dueDateTo) {
      filter.dueDate = {};
      if (dueDateFrom) filter.dueDate.$gte = new Date(dueDateFrom);
      if (dueDateTo) filter.dueDate.$lte = new Date(dueDateTo);
    }

    if (keywords && keywords.length > 0) {
      filter.keywords = { $in: keywords };
    }

    const skip = (page - 1) * limit;

    const [results, total] = await Promise.all([
      Correspondence.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('createdBy', 'name nameAr')
        .populate('sender.entityId')
        .populate('recipients.entityId'),
      Correspondence.countDocuments(filter),
    ]);

    return {
      results,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * الحصول على إحصائيات المراسلات
   */
  async getStatistics(options = {}) {
    const { dateFrom, dateTo, branchId } = options;

    const matchStage = {};
    if (dateFrom || dateTo) {
      matchStage.createdAt = {};
      if (dateFrom) matchStage.createdAt.$gte = new Date(dateFrom);
      if (dateTo) matchStage.createdAt.$lte = new Date(dateTo);
    }

    const [totalByType, totalByStatus, totalByPriority, overdueCount, pendingApprovals] =
      await Promise.all([
        Correspondence.aggregate([
          { $match: matchStage },
          { $group: { _id: '$type', count: { $sum: 1 } } },
        ]),
        Correspondence.aggregate([
          { $match: matchStage },
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),
        Correspondence.aggregate([
          { $match: matchStage },
          { $group: { _id: '$priority', count: { $sum: 1 } } },
        ]),
        Correspondence.countDocuments({
          ...matchStage,
          dueDate: { $lt: new Date() },
          status: { $nin: [Status.COMPLETED, Status.ARCHIVED, Status.CANCELLED] },
        }),
        Correspondence.countDocuments({
          ...matchStage,
          status: Status.PENDING_APPROVAL,
        }),
      ]);

    return {
      byType: this.arrayToObject(totalByType),
      byStatus: this.arrayToObject(totalByStatus),
      byPriority: this.arrayToObject(totalByPriority),
      overdueCount,
      pendingApprovals,
    };
  }

  /**
   * تسجيل إجراء
   */
  async logAction(correspondenceId, actionType, userId, description = '', metadata = {}) {
    const action = new CorrespondenceAction({
      correspondenceId,
      actionType,
      description,
      performedBy: userId,
      performedAt: new Date(),
      metadata,
    });

    await action.save();
    return action;
  }

  /**
   * إرسال إشعارات للمستلمين
   */
  async notifyRecipients(correspondence) {
    // التكامل مع خدمة الإشعارات
    const notifications = correspondence.recipients.map(recipient => ({
      recipient: recipient.entityId || recipient.name,
      type: 'new_correspondence',
      title: 'مراسلة جديدة',
      message: `لديك مراسلة جديدة: ${correspondence.subject}`,
      data: {
        correspondenceId: correspondence._id,
        referenceNumber: correspondence.referenceNumber,
        priority: correspondence.priority,
      },
    }));

    // يمكن التكامل مع notification-center هنا
    return notifications;
  }

  /**
   * الحصول على قوالب المراسلات
   */
  async getTemplates(type = null) {
    const filter = { isActive: true };
    if (type) filter.type = type;
    return CorrespondenceTemplate.find(filter);
  }

  /**
   * إنشاء قالب جديد
   */
  async createTemplate(templateData, userId) {
    const template = new CorrespondenceTemplate({
      ...templateData,
      createdBy: userId,
    });
    await template.save();
    return template;
  }

  /**
   * تطبيق قالب على مراسلة
   */
  async applyTemplate(templateId, placeholders = {}) {
    const template = await CorrespondenceTemplate.findById(templateId);
    if (!template) {
      throw new Error('القالب غير موجود');
    }

    let content = template.content;
    for (const [key, value] of Object.entries(placeholders)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      content = content.replace(regex, value);
    }

    return {
      subject: template.subject,
      content,
      type: template.type,
      style: template.style,
    };
  }

  /**
   * إضافة جهة خارجية
   */
  async createExternalEntity(entityData) {
    const entity = new ExternalEntity(entityData);
    await entity.save();
    return entity;
  }

  /**
   * البحث في الجهات الخارجية
   */
  async searchExternalEntities(query = '', type = null) {
    const filter = { isActive: true };

    if (query) {
      filter.$or = [
        { name: { $regex: escapeRegex(query), $options: 'i' } },
        { nameAr: { $regex: escapeRegex(query), $options: 'i' } },
      ];
    }

    if (type) filter.type = type;

    return ExternalEntity.find(filter).limit(50);
  }

  /**
   * الحصول على تاريخ المراسلات (سلسلة المراسلات)
   */
  async getCorrespondenceThread(id) {
    const correspondence = await Correspondence.findById(id)
      .populate('parentCorrespondence')
      .populate('relatedCorrespondences');

    // البحث عن الردود
    const replies = await Correspondence.find({ parentCorrespondence: id }).sort({ createdAt: 1 });

    return {
      current: correspondence,
      parent: correspondence.parentCorrespondence,
      related: correspondence.relatedCorrespondences,
      replies,
    };
  }

  /**
   * تحويل مصفوفة إلى كائن
   */
  arrayToObject(arr) {
    const obj = {};
    arr.forEach(item => {
      obj[item._id] = item.count;
    });
    return obj;
  }

  /**
   * الحصول على المراسلات المتأخرة
   */
  async getOverdueCorrespondences(daysThreshold = 0) {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - daysThreshold);

    return Correspondence.find({
      dueDate: { $lt: thresholdDate },
      status: { $nin: [Status.COMPLETED, Status.ARCHIVED, Status.CANCELLED] },
    })
      .sort({ dueDate: 1 })
      .populate('createdBy', 'name nameAr');
  }

  /**
   * إرسال تذكيرات
   */
  async sendReminders() {
    const upcomingDue = await Correspondence.find({
      dueDate: {
        $gte: new Date(),
        $lte: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 أيام
      },
      status: { $nin: [Status.COMPLETED, Status.ARCHIVED, Status.CANCELLED] },
      'tracking.reminderSent': false,
    });

    for (const corr of upcomingDue) {
      // إرسال تذكير
      await this.notifyRecipients({
        ...corr.toObject(),
        _id: corr._id,
        subject: `تذكير: ${corr.subject}`,
      });

      corr.tracking.reminderSent = true;
      corr.tracking.reminderSentAt = new Date();
      await corr.save();
    }

    return upcomingDue.length;
  }
}

// ==================== Export ====================

const adminCommService = new AdministrativeCommunicationsService();

module.exports = {
  // Service
  AdministrativeCommunicationsService,
  adminCommService,

  // Models
  Correspondence,
  ExternalEntity,
  CorrespondenceTemplate,
  CorrespondenceAction,

  // Enums
  CorrespondenceType,
  Priority,
  Status,
  ConfidentialityLevel,
  SenderType,

  // Schemas
  CorrespondenceSchema,
  ExternalEntitySchema,
  CorrespondenceTemplateSchema,
  CorrespondenceActionSchema,
};
