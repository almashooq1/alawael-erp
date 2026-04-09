'use strict';

/**
 * Document Workflow Engine — محرك سير العمل للمستندات
 * ═══════════════════════════════════════════════════════════════
 * محرك احترافي لإدارة دورة حياة المستندات مع SLA وإشعارات
 * وتتبع المراحل وسجل التدقيق
 */

const EventEmitter = require('events');
const mongoose = require('mongoose');
const logger = require('../../utils/logger');

// ─────────────────────────────────────────────
// تكوين سير العمل
// ─────────────────────────────────────────────

const WORKFLOW_STATUSES = {
  draft: {
    label: 'مسودة',
    labelEn: 'Draft',
    icon: '📝',
    color: '#9CA3AF',
    order: 1,
    allowedTransitions: ['pending_review', 'cancelled'],
  },
  pending_review: {
    label: 'قيد المراجعة',
    labelEn: 'Pending Review',
    icon: '👀',
    color: '#F59E0B',
    order: 2,
    allowedTransitions: ['reviewed', 'revision_required', 'cancelled'],
  },
  reviewed: {
    label: 'تمت المراجعة',
    labelEn: 'Reviewed',
    icon: '📋',
    color: '#3B82F6',
    order: 3,
    allowedTransitions: ['pending_approval', 'revision_required', 'cancelled'],
  },
  revision_required: {
    label: 'يحتاج تعديل',
    labelEn: 'Revision Required',
    icon: '🔄',
    color: '#F97316',
    order: 4,
    allowedTransitions: ['pending_review', 'cancelled'],
  },
  pending_approval: {
    label: 'بانتظار الموافقة',
    labelEn: 'Pending Approval',
    icon: '⏳',
    color: '#8B5CF6',
    order: 5,
    allowedTransitions: ['approved', 'rejected', 'cancelled'],
  },
  approved: {
    label: 'معتمد',
    labelEn: 'Approved',
    icon: '✅',
    color: '#10B981',
    order: 6,
    allowedTransitions: ['published', 'archived'],
  },
  rejected: {
    label: 'مرفوض',
    labelEn: 'Rejected',
    icon: '❌',
    color: '#EF4444',
    order: 7,
    allowedTransitions: ['draft', 'cancelled'],
  },
  published: {
    label: 'منشور',
    labelEn: 'Published',
    icon: '🌐',
    color: '#06B6D4',
    order: 8,
    allowedTransitions: ['archived', 'revision_required'],
  },
  archived: {
    label: 'مؤرشف',
    labelEn: 'Archived',
    icon: '📦',
    color: '#6B7280',
    order: 9,
    allowedTransitions: ['published'],
  },
  cancelled: {
    label: 'ملغي',
    labelEn: 'Cancelled',
    icon: '🚫',
    color: '#374151',
    order: 10,
    allowedTransitions: ['draft'],
  },
};

// قوالب سير العمل
const WORKFLOW_TEMPLATES = {
  simple_approval: {
    name: 'موافقة بسيطة',
    nameEn: 'Simple Approval',
    description: 'سير عمل بسيط: مسودة → مراجعة → موافقة → نشر',
    stages: ['draft', 'pending_review', 'pending_approval', 'approved', 'published'],
    roles: {
      author: { canCreate: true, canEdit: true, canSubmit: true },
      reviewer: { canReview: true },
      approver: { canApprove: true, canReject: true },
    },
    sla: { review: 48, approval: 72 }, // بالساعات
  },
  multi_level_approval: {
    name: 'موافقة متعددة المستويات',
    nameEn: 'Multi-Level Approval',
    description: 'سير عمل متقدم: مسودة → مراجعة → موافقة → اعتماد → نشر',
    stages: ['draft', 'pending_review', 'reviewed', 'pending_approval', 'approved', 'published'],
    roles: {
      author: { canCreate: true, canEdit: true, canSubmit: true },
      reviewer: { canReview: true },
      manager: { canApprove: true },
      director: { canApprove: true, canReject: true },
    },
    sla: { review: 24, approval: 48, finalApproval: 72 },
  },
  document_review: {
    name: 'مراجعة المستندات',
    nameEn: 'Document Review',
    description: 'سير عمل للمراجعة والتدقيق فقط',
    stages: ['draft', 'pending_review', 'reviewed', 'published'],
    roles: {
      author: { canCreate: true, canEdit: true },
      reviewer: { canReview: true, canComment: true },
    },
    sla: { review: 96 },
  },
  contract_approval: {
    name: 'اعتماد العقود',
    nameEn: 'Contract Approval',
    description: 'سير عمل خاص بالعقود مع مراجعة قانونية',
    stages: ['draft', 'pending_review', 'reviewed', 'pending_approval', 'approved', 'published'],
    roles: {
      author: { canCreate: true, canEdit: true },
      legalReviewer: { canReview: true, canComment: true },
      financeReviewer: { canReview: true },
      approver: { canApprove: true, canReject: true },
    },
    sla: { review: 72, legalReview: 120, approval: 96 },
  },
};

// ─────────────────────────────────────────────
// مخطط سير العمل (MongoDB Schema)
// ─────────────────────────────────────────────

const WorkflowInstanceSchema = new mongoose.Schema(
  {
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
      index: true,
    },
    templateId: {
      type: String,
      enum: Object.keys(WORKFLOW_TEMPLATES),
      required: true,
    },
    currentStatus: {
      type: String,
      enum: Object.keys(WORKFLOW_STATUSES),
      default: 'draft',
    },
    previousStatus: String,

    // المسؤولون
    initiatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    participants: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        role: String,
        assignedAt: { type: Date, default: Date.now },
        completedAt: Date,
        action: String,
        comments: String,
      },
    ],

    // SLA والمواعيد
    sla: {
      dueDate: Date,
      warningDate: Date,
      isOverdue: { type: Boolean, default: false },
      escalatedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      escalatedAt: Date,
    },

    // سجل الانتقالات
    transitionHistory: [
      {
        from: String,
        to: String,
        action: {
          type: String,
          enum: [
            'submit',
            'review',
            'approve',
            'reject',
            'revise',
            'publish',
            'archive',
            'cancel',
            'escalate',
            'delegate',
          ],
        },
        performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        performedByName: String,
        comments: String,
        attachments: [String],
        timestamp: { type: Date, default: Date.now },
        metadata: mongoose.Schema.Types.Mixed,
      },
    ],

    // التعليقات والملاحظات
    comments: [
      {
        text: String,
        author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        authorName: String,
        timestamp: { type: Date, default: Date.now },
        isInternal: { type: Boolean, default: false },
      },
    ],

    // بيانات إضافية
    metadata: {
      priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
      category: String,
      estimatedCompletionDate: Date,
      actualCompletionDate: Date,
      completionPercentage: { type: Number, default: 0 },
    },

    isActive: { type: Boolean, default: true },
    completedAt: Date,
  },
  {
    timestamps: true,
    collection: 'workflow_instances',
  }
);

// فهارس
WorkflowInstanceSchema.index({ documentId: 1, isActive: 1 });
WorkflowInstanceSchema.index({ currentStatus: 1, isActive: 1 });
WorkflowInstanceSchema.index({ assignedTo: 1, isActive: 1 });
WorkflowInstanceSchema.index({ 'sla.dueDate': 1, 'sla.isOverdue': 1 });
WorkflowInstanceSchema.index({ initiatedBy: 1, createdAt: -1 });

const WorkflowInstance =
  mongoose.models.WorkflowInstance || mongoose.model('WorkflowInstance', WorkflowInstanceSchema);

// ─────────────────────────────────────────────
// محرك سير العمل
// ─────────────────────────────────────────────

class DocumentWorkflowEngine extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(50);
  }

  /**
   * إنشاء سير عمل جديد
   */
  async createWorkflow(documentId, templateId, initiatedBy, options = {}) {
    try {
      const template = WORKFLOW_TEMPLATES[templateId];
      if (!template) {
        throw new Error(`قالب سير العمل "${templateId}" غير موجود`);
      }

      // فحص وجود سير عمل نشط
      const existing = await WorkflowInstance.findOne({
        documentId,
        isActive: true,
      });

      if (existing) {
        throw new Error('يوجد سير عمل نشط بالفعل لهذا المستند');
      }

      // حساب SLA
      const slaHours = template.sla?.review || 48;
      const dueDate = new Date(Date.now() + slaHours * 60 * 60 * 1000);
      const warningDate = new Date(Date.now() + slaHours * 0.75 * 60 * 60 * 1000);

      const workflow = new WorkflowInstance({
        documentId,
        templateId,
        currentStatus: 'draft',
        initiatedBy,
        assignedTo: options.assignTo || null,
        participants: [
          {
            userId: initiatedBy,
            role: 'author',
            assignedAt: new Date(),
          },
        ],
        sla: {
          dueDate,
          warningDate,
          isOverdue: false,
        },
        metadata: {
          priority: options.priority || 'medium',
          category: options.category || '',
          estimatedCompletionDate: dueDate,
          completionPercentage: 0,
        },
        transitionHistory: [
          {
            from: null,
            to: 'draft',
            action: 'submit',
            performedBy: initiatedBy,
            comments: 'تم إنشاء سير العمل',
            timestamp: new Date(),
          },
        ],
      });

      await workflow.save();

      this.emit('workflow:created', {
        workflowId: workflow._id,
        documentId,
        templateId,
        initiatedBy,
      });

      logger.info(`[Workflow] سير عمل جديد: ${workflow._id} لمستند: ${documentId}`);

      return {
        success: true,
        workflow: this._formatWorkflow(workflow),
      };
    } catch (err) {
      logger.error(`[Workflow] خطأ في الإنشاء: ${err.message}`);
      throw err;
    }
  }

  /**
   * تنفيذ انتقال (transition) في سير العمل
   */
  async executeTransition(workflowId, newStatus, userId, options = {}) {
    try {
      const workflow = await WorkflowInstance.findById(workflowId);
      if (!workflow) throw new Error('سير العمل غير موجود');
      if (!workflow.isActive) throw new Error('سير العمل غير نشط');

      const currentConfig = WORKFLOW_STATUSES[workflow.currentStatus];
      if (!currentConfig) throw new Error('حالة غير صالحة');

      // التحقق من صلاحية الانتقال
      if (!currentConfig.allowedTransitions.includes(newStatus)) {
        throw new Error(
          `لا يمكن الانتقال من "${currentConfig.label}" إلى "${WORKFLOW_STATUSES[newStatus]?.label || newStatus}"`
        );
      }

      const previousStatus = workflow.currentStatus;
      workflow.previousStatus = previousStatus;
      workflow.currentStatus = newStatus;

      // إضافة إلى سجل الانتقالات
      const actionMap = {
        pending_review: 'submit',
        reviewed: 'review',
        pending_approval: 'submit',
        approved: 'approve',
        rejected: 'reject',
        revision_required: 'revise',
        published: 'publish',
        archived: 'archive',
        cancelled: 'cancel',
        draft: 'revise',
      };

      workflow.transitionHistory.push({
        from: previousStatus,
        to: newStatus,
        action: actionMap[newStatus] || 'submit',
        performedBy: userId,
        performedByName: options.performedByName || '',
        comments: options.comments || '',
        attachments: options.attachments || [],
        timestamp: new Date(),
        metadata: options.metadata || {},
      });

      // تحديث المسؤول الحالي
      if (options.assignTo) {
        workflow.assignedTo = options.assignTo;
        workflow.participants.push({
          userId: options.assignTo,
          role: options.assignRole || 'reviewer',
          assignedAt: new Date(),
        });
      }

      // تحديث SLA
      const template = WORKFLOW_TEMPLATES[workflow.templateId];
      if (template?.sla) {
        const nextSlaKey = Object.keys(template.sla).find(k => {
          const stageMap = {
            review: 'pending_review',
            approval: 'pending_approval',
            finalApproval: 'approved',
          };
          return stageMap[k] === newStatus;
        });

        if (nextSlaKey) {
          const hours = template.sla[nextSlaKey];
          workflow.sla.dueDate = new Date(Date.now() + hours * 60 * 60 * 1000);
          workflow.sla.warningDate = new Date(Date.now() + hours * 0.75 * 60 * 60 * 1000);
          workflow.sla.isOverdue = false;
        }
      }

      // حساب نسبة الإنجاز
      const template2 = WORKFLOW_TEMPLATES[workflow.templateId];
      if (template2?.stages) {
        const currentIdx = template2.stages.indexOf(newStatus);
        if (currentIdx >= 0) {
          workflow.metadata.completionPercentage = Math.round(
            ((currentIdx + 1) / template2.stages.length) * 100
          );
        }
      }

      // هل اكتمل سير العمل؟
      if (['approved', 'published', 'cancelled', 'rejected'].includes(newStatus)) {
        if (['published', 'cancelled'].includes(newStatus)) {
          workflow.isActive = false;
          workflow.completedAt = new Date();
          workflow.metadata.actualCompletionDate = new Date();
        }
      }

      // إضافة التعليق
      if (options.comments) {
        workflow.comments.push({
          text: options.comments,
          author: userId,
          authorName: options.performedByName || '',
          timestamp: new Date(),
          isInternal: options.isInternal || false,
        });
      }

      await workflow.save();

      // إطلاق الأحداث
      this.emit('workflow:transition', {
        workflowId: workflow._id,
        documentId: workflow.documentId,
        from: previousStatus,
        to: newStatus,
        performedBy: userId,
      });

      if (!workflow.isActive) {
        this.emit('workflow:completed', {
          workflowId: workflow._id,
          documentId: workflow.documentId,
          finalStatus: newStatus,
        });
      }

      logger.info(`[Workflow] انتقال: ${previousStatus} → ${newStatus} | سير عمل: ${workflowId}`);

      return {
        success: true,
        workflow: this._formatWorkflow(workflow),
        transition: {
          from: previousStatus,
          to: newStatus,
          fromLabel: WORKFLOW_STATUSES[previousStatus]?.label,
          toLabel: WORKFLOW_STATUSES[newStatus]?.label,
        },
      };
    } catch (err) {
      logger.error(`[Workflow] خطأ في الانتقال: ${err.message}`);
      throw err;
    }
  }

  /**
   * الحصول على سير عمل المستند
   */
  async getWorkflow(documentId) {
    try {
      const workflow = await WorkflowInstance.findOne({
        documentId,
        isActive: true,
      }).populate('initiatedBy assignedTo', 'name email');

      if (!workflow) return null;
      return this._formatWorkflow(workflow);
    } catch (err) {
      logger.error(`[Workflow] خطأ في جلب سير العمل: ${err.message}`);
      throw err;
    }
  }

  /**
   * الحصول على سير العمل بالمعرف
   */
  async getWorkflowById(workflowId) {
    try {
      const workflow = await WorkflowInstance.findById(workflowId).populate(
        'initiatedBy assignedTo',
        'name email'
      );
      if (!workflow) return null;
      return this._formatWorkflow(workflow);
    } catch (err) {
      logger.error(`[Workflow] خطأ: ${err.message}`);
      throw err;
    }
  }

  /**
   * جلب المهام المعلقة لمستخدم معين
   */
  async getPendingTasks(userId, options = {}) {
    try {
      const query = {
        isActive: true,
        $or: [{ assignedTo: userId }, { 'participants.userId': userId }],
      };

      if (options.status) query.currentStatus = options.status;

      const workflows = await WorkflowInstance.find(query)
        .populate('documentId', 'title category fileName fileType')
        .populate('initiatedBy', 'name email')
        .sort({ 'sla.dueDate': 1 })
        .limit(options.limit || 50);

      return workflows.map(w => this._formatWorkflow(w));
    } catch (err) {
      logger.error(`[Workflow] خطأ في جلب المهام المعلقة: ${err.message}`);
      throw err;
    }
  }

  /**
   * تصعيد سير العمل المتأخر
   */
  async escalateOverdue(workflowId, escalateTo, userId) {
    try {
      const workflow = await WorkflowInstance.findById(workflowId);
      if (!workflow) throw new Error('سير العمل غير موجود');

      workflow.sla.isOverdue = true;
      workflow.sla.escalatedTo = escalateTo;
      workflow.sla.escalatedAt = new Date();

      workflow.transitionHistory.push({
        from: workflow.currentStatus,
        to: workflow.currentStatus,
        action: 'escalate',
        performedBy: userId,
        comments: 'تم تصعيد سير العمل بسبب تأخر المعالجة',
        timestamp: new Date(),
      });

      await workflow.save();

      this.emit('workflow:escalated', {
        workflowId: workflow._id,
        documentId: workflow.documentId,
        escalatedTo,
      });

      return { success: true, workflow: this._formatWorkflow(workflow) };
    } catch (err) {
      logger.error(`[Workflow] خطأ في التصعيد: ${err.message}`);
      throw err;
    }
  }

  /**
   * تفويض المهمة لمستخدم آخر
   */
  async delegateTask(workflowId, fromUserId, toUserId, comments = '') {
    try {
      const workflow = await WorkflowInstance.findById(workflowId);
      if (!workflow) throw new Error('سير العمل غير موجود');

      workflow.assignedTo = toUserId;
      workflow.participants.push({
        userId: toUserId,
        role: 'delegate',
        assignedAt: new Date(),
      });

      workflow.transitionHistory.push({
        from: workflow.currentStatus,
        to: workflow.currentStatus,
        action: 'delegate',
        performedBy: fromUserId,
        comments: comments || 'تم تفويض المهمة',
        timestamp: new Date(),
        metadata: { delegatedTo: toUserId },
      });

      await workflow.save();

      this.emit('workflow:delegated', {
        workflowId: workflow._id,
        documentId: workflow.documentId,
        from: fromUserId,
        to: toUserId,
      });

      return { success: true, workflow: this._formatWorkflow(workflow) };
    } catch (err) {
      logger.error(`[Workflow] خطأ في التفويض: ${err.message}`);
      throw err;
    }
  }

  /**
   * جلب إحصائيات سير العمل
   */
  async getWorkflowStats(filters = {}) {
    try {
      const matchStage = {};
      if (filters.startDate || filters.endDate) {
        matchStage.createdAt = {};
        if (filters.startDate) matchStage.createdAt.$gte = new Date(filters.startDate);
        if (filters.endDate) matchStage.createdAt.$lte = new Date(filters.endDate);
      }

      const [statusCounts, templateCounts, overdueCounts, avgCompletionTime] = await Promise.all([
        // توزيع حسب الحالة
        WorkflowInstance.aggregate([
          { $match: matchStage },
          { $group: { _id: '$currentStatus', count: { $sum: 1 } } },
        ]),
        // توزيع حسب القالب
        WorkflowInstance.aggregate([
          { $match: matchStage },
          { $group: { _id: '$templateId', count: { $sum: 1 } } },
        ]),
        // المتأخرة
        WorkflowInstance.countDocuments({
          ...matchStage,
          isActive: true,
          'sla.isOverdue': true,
        }),
        // متوسط وقت الإنجاز
        WorkflowInstance.aggregate([
          { $match: { ...matchStage, completedAt: { $exists: true } } },
          {
            $project: {
              completionTime: { $subtract: ['$completedAt', '$createdAt'] },
            },
          },
          { $group: { _id: null, avgTime: { $avg: '$completionTime' } } },
        ]),
      ]);

      const totalActive = await WorkflowInstance.countDocuments({ isActive: true });
      const totalCompleted = await WorkflowInstance.countDocuments({
        isActive: false,
        completedAt: { $exists: true },
      });

      return {
        overview: {
          totalActive,
          totalCompleted,
          totalOverdue: overdueCounts,
          avgCompletionHours: avgCompletionTime[0]
            ? Math.round(avgCompletionTime[0].avgTime / (1000 * 60 * 60))
            : 0,
        },
        byStatus: statusCounts.map(s => ({
          status: s._id,
          ...WORKFLOW_STATUSES[s._id],
          count: s.count,
        })),
        byTemplate: templateCounts.map(t => ({
          templateId: t._id,
          ...(WORKFLOW_TEMPLATES[t._id] || {}),
          count: t.count,
        })),
      };
    } catch (err) {
      logger.error(`[Workflow] خطأ في الإحصائيات: ${err.message}`);
      throw err;
    }
  }

  /**
   * فحص SLA المتأخر (يُستدعى بشكل دوري)
   */
  async checkOverdueSLAs() {
    try {
      const overdue = await WorkflowInstance.find({
        isActive: true,
        'sla.isOverdue': false,
        'sla.dueDate': { $lt: new Date() },
      });

      for (const workflow of overdue) {
        workflow.sla.isOverdue = true;
        await workflow.save();

        this.emit('workflow:sla_breached', {
          workflowId: workflow._id,
          documentId: workflow.documentId,
          assignedTo: workflow.assignedTo,
          dueDate: workflow.sla.dueDate,
        });
      }

      if (overdue.length > 0) {
        logger.warn(`[Workflow] تم اكتشاف ${overdue.length} سير عمل متأخر`);
      }

      return { overdueCount: overdue.length };
    } catch (err) {
      logger.error(`[Workflow] خطأ في فحص SLA: ${err.message}`);
      throw err;
    }
  }

  /**
   * تنسيق سير العمل للعرض
   */
  _formatWorkflow(workflow) {
    const statusConfig = WORKFLOW_STATUSES[workflow.currentStatus] || {};
    const template = WORKFLOW_TEMPLATES[workflow.templateId] || {};

    return {
      id: workflow._id,
      documentId: workflow.documentId,
      template: {
        id: workflow.templateId,
        name: template.name || workflow.templateId,
        nameEn: template.nameEn || '',
        description: template.description || '',
      },
      status: {
        current: workflow.currentStatus,
        label: statusConfig.label || workflow.currentStatus,
        labelEn: statusConfig.labelEn || '',
        icon: statusConfig.icon || '📄',
        color: statusConfig.color || '#6B7280',
        allowedTransitions: (statusConfig.allowedTransitions || []).map(t => ({
          status: t,
          ...WORKFLOW_STATUSES[t],
        })),
      },
      previousStatus: workflow.previousStatus,
      initiatedBy: workflow.initiatedBy,
      assignedTo: workflow.assignedTo,
      participants: workflow.participants,
      sla: {
        dueDate: workflow.sla?.dueDate,
        warningDate: workflow.sla?.warningDate,
        isOverdue: workflow.sla?.isOverdue || false,
        escalatedTo: workflow.sla?.escalatedTo,
        escalatedAt: workflow.sla?.escalatedAt,
      },
      transitionHistory: workflow.transitionHistory?.map(t => ({
        ...(t.toObject?.() || t),
        fromLabel: WORKFLOW_STATUSES[t.from]?.label || t.from,
        toLabel: WORKFLOW_STATUSES[t.to]?.label || t.to,
      })),
      comments: workflow.comments,
      metadata: workflow.metadata,
      isActive: workflow.isActive,
      completedAt: workflow.completedAt,
      completionPercentage: workflow.metadata?.completionPercentage || 0,
      createdAt: workflow.createdAt,
      updatedAt: workflow.updatedAt,
    };
  }

  // ─── تصدير الثوابت ────────────────────────
  getStatuses() {
    return WORKFLOW_STATUSES;
  }
  getTemplates() {
    return WORKFLOW_TEMPLATES;
  }
}

module.exports = new DocumentWorkflowEngine();
module.exports.WorkflowInstance = WorkflowInstance;
module.exports.WORKFLOW_STATUSES = WORKFLOW_STATUSES;
module.exports.WORKFLOW_TEMPLATES = WORKFLOW_TEMPLATES;
