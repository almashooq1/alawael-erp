/**
 * Document Approval Workflow Service — خدمة سير عمل الموافقات
 *
 * Features:
 * - Multi-level approval workflows
 * - Sequential and parallel approval chains
 * - Escalation rules
 * - Delegation of approval authority
 * - SLA tracking and notifications
 * - Auto-approval rules
 */

const EventEmitter = require('events');
const crypto = require('crypto');

const APPROVAL_STATUSES = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  ESCALATED: 'escalated',
  DELEGATED: 'delegated',
  AUTO_APPROVED: 'auto_approved',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
};

const WORKFLOW_TYPES = {
  SEQUENTIAL: 'sequential', // Must be approved in order
  PARALLEL: 'parallel', // All can approve simultaneously
  ANY: 'any', // Any one approver is enough
  MAJORITY: 'majority', // Majority must approve
  UNANIMOUS: 'unanimous', // All must approve
};

class DocumentApprovalService extends EventEmitter {
  constructor() {
    super();
    this.workflows = new Map(); // workflowId -> workflow
    this.approvalRequests = new Map(); // requestId -> request
    this.templates = new Map(); // templateId -> template
    this.delegations = new Map(); // userId -> delegation rules

    this._initializeTemplates();
  }

  /**
   * Initialize workflow templates — تهيئة قوالب سير العمل
   */
  _initializeTemplates() {
    const defaultTemplates = [
      {
        id: 'tpl_purchase',
        name: 'طلب شراء',
        nameEn: 'Purchase Request',
        type: WORKFLOW_TYPES.SEQUENTIAL,
        steps: [
          { role: 'department_manager', titleAr: 'مدير القسم', required: true, slaHours: 24 },
          { role: 'finance_manager', titleAr: 'المدير المالي', required: true, slaHours: 48 },
          {
            role: 'ceo',
            titleAr: 'المدير العام',
            required: false,
            slaHours: 72,
            condition: 'amount > 50000',
          },
        ],
        autoApproveRules: [
          { condition: 'amount < 1000', message: 'مبلغ أقل من 1000 - موافقة تلقائية' },
        ],
      },
      {
        id: 'tpl_leave',
        name: 'طلب إجازة',
        nameEn: 'Leave Request',
        type: WORKFLOW_TYPES.SEQUENTIAL,
        steps: [
          { role: 'direct_manager', titleAr: 'المدير المباشر', required: true, slaHours: 24 },
          { role: 'hr_manager', titleAr: 'مدير الموارد البشرية', required: true, slaHours: 48 },
        ],
      },
      {
        id: 'tpl_contract',
        name: 'اعتماد عقد',
        nameEn: 'Contract Approval',
        type: WORKFLOW_TYPES.SEQUENTIAL,
        steps: [
          { role: 'legal_department', titleAr: 'القسم القانوني', required: true, slaHours: 72 },
          { role: 'finance_manager', titleAr: 'المدير المالي', required: true, slaHours: 48 },
          { role: 'ceo', titleAr: 'المدير العام', required: true, slaHours: 72 },
        ],
      },
      {
        id: 'tpl_document_publish',
        name: 'نشر مستند',
        nameEn: 'Document Publishing',
        type: WORKFLOW_TYPES.PARALLEL,
        steps: [
          { role: 'content_reviewer', titleAr: 'مراجع المحتوى', required: true, slaHours: 24 },
          { role: 'quality_officer', titleAr: 'مسؤول الجودة', required: true, slaHours: 24 },
        ],
      },
      {
        id: 'tpl_expense',
        name: 'طلب مصروفات',
        nameEn: 'Expense Request',
        type: WORKFLOW_TYPES.SEQUENTIAL,
        steps: [
          { role: 'direct_manager', titleAr: 'المدير المباشر', required: true, slaHours: 24 },
          { role: 'finance_department', titleAr: 'القسم المالي', required: true, slaHours: 48 },
        ],
        autoApproveRules: [
          { condition: 'amount < 500', message: 'مبلغ أقل من 500 - موافقة تلقائية' },
        ],
      },
      {
        id: 'tpl_policy',
        name: 'اعتماد سياسة',
        nameEn: 'Policy Approval',
        type: WORKFLOW_TYPES.UNANIMOUS,
        steps: [
          { role: 'department_heads', titleAr: 'رؤساء الأقسام', required: true, slaHours: 120 },
          { role: 'hr_director', titleAr: 'مدير الموارد البشرية', required: true, slaHours: 72 },
          { role: 'ceo', titleAr: 'المدير العام', required: true, slaHours: 72 },
        ],
      },
    ];

    defaultTemplates.forEach(t => this.templates.set(t.id, t));
  }

  /**
   * Get workflow templates — جلب قوالب سير العمل
   */
  async getTemplates() {
    return {
      success: true,
      data: Array.from(this.templates.values()),
    };
  }

  /**
   * Create approval request — إنشاء طلب موافقة
   */
  async createApprovalRequest(data) {
    const {
      documentId,
      documentTitle,
      templateId,
      requestedBy,
      requestedByName,
      approvers = [],
      priority = 'normal',
      notes = '',
      dueDate,
      metadata = {},
    } = data;

    // Get template if specified
    let template = null;
    let steps = approvers;
    let workflowType = WORKFLOW_TYPES.SEQUENTIAL;

    if (templateId && this.templates.has(templateId)) {
      template = this.templates.get(templateId);
      steps = template.steps;
      workflowType = template.type;

      // Check auto-approve rules
      if (template.autoApproveRules) {
        for (const rule of template.autoApproveRules) {
          if (this._evaluateCondition(rule.condition, metadata)) {
            const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
            const autoRequest = {
              id: requestId,
              documentId,
              documentTitle,
              templateId,
              requestedBy,
              requestedByName,
              status: APPROVAL_STATUSES.AUTO_APPROVED,
              workflowType,
              priority,
              notes,
              autoApproveReason: rule.message,
              steps: [],
              createdAt: new Date(),
              completedAt: new Date(),
            };

            this.approvalRequests.set(requestId, autoRequest);
            this.emit('autoApproved', autoRequest);

            return {
              success: true,
              data: autoRequest,
              message: rule.message,
            };
          }
        }
      }
    }

    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    const approvalSteps = steps.map((step, index) => ({
      id: `step_${index + 1}`,
      order: index + 1,
      role: step.role || step.approverRole,
      titleAr: step.titleAr || step.role,
      approverId: step.approverId || null,
      approverName: step.approverName || '',
      required: step.required !== false,
      slaHours: step.slaHours || 48,
      status: APPROVAL_STATUSES.PENDING,
      decision: null,
      comment: '',
      decidedAt: null,
      delegatedTo: null,
      slaDeadline: new Date(Date.now() + (step.slaHours || 48) * 60 * 60 * 1000),
    }));

    const request = {
      id: requestId,
      documentId,
      documentTitle: documentTitle || '',
      templateId: templateId || null,
      templateName: template?.name || 'سير عمل مخصص',
      requestedBy,
      requestedByName: requestedByName || '',
      status: APPROVAL_STATUSES.PENDING,
      workflowType,
      priority,
      notes,
      metadata,
      steps: approvalSteps,
      currentStep: workflowType === WORKFLOW_TYPES.PARALLEL ? null : 1,
      dueDate: dueDate ? new Date(dueDate) : null,
      createdAt: new Date(),
      updatedAt: new Date(),
      completedAt: null,
      history: [
        {
          action: 'created',
          by: requestedBy,
          byName: requestedByName,
          at: new Date(),
          details: `تم إنشاء طلب الموافقة`,
        },
      ],
    };

    this.approvalRequests.set(requestId, request);
    this.emit('approvalRequested', request);

    return {
      success: true,
      data: request,
      message: 'تم إنشاء طلب الموافقة بنجاح',
    };
  }

  /**
   * Simple condition evaluator
   */
  _evaluateCondition(condition, metadata) {
    try {
      if (!condition || !metadata) return false;
      // Very basic evaluator for conditions like "amount < 1000"
      const match = condition.match(/(\w+)\s*([<>=!]+)\s*(\d+)/);
      if (!match) return false;
      const [, field, op, valueStr] = match;
      const value = Number(valueStr);
      const fieldValue = Number(metadata[field]);
      if (isNaN(fieldValue)) return false;
      switch (op) {
        case '<':
          return fieldValue < value;
        case '>':
          return fieldValue > value;
        case '<=':
          return fieldValue <= value;
        case '>=':
          return fieldValue >= value;
        case '==':
          return fieldValue === value;
        case '!=':
          return fieldValue !== value;
        default:
          return false;
      }
    } catch {
      return false;
    }
  }

  /**
   * Submit approval decision — تقديم قرار الموافقة
   */
  async submitDecision(requestId, stepId, decision) {
    const request = this.approvalRequests.get(requestId);
    if (!request) {
      return { success: false, message: 'طلب الموافقة غير موجود' };
    }

    if (request.status !== APPROVAL_STATUSES.PENDING) {
      return { success: false, message: 'الطلب ليس في حالة انتظار' };
    }

    const step = request.steps.find(s => s.id === stepId);
    if (!step) {
      return { success: false, message: 'خطوة الموافقة غير موجودة' };
    }

    // For sequential workflows, ensure it's the current step
    if (request.workflowType === WORKFLOW_TYPES.SEQUENTIAL && step.order !== request.currentStep) {
      return { success: false, message: 'ليس دورك في سلسلة الموافقة' };
    }

    step.status = decision.approved ? APPROVAL_STATUSES.APPROVED : APPROVAL_STATUSES.REJECTED;
    step.decision = decision.approved ? 'approved' : 'rejected';
    step.comment = decision.comment || '';
    step.approverId = decision.approverId;
    step.approverName = decision.approverName || '';
    step.decidedAt = new Date();

    request.history.push({
      action: step.decision,
      by: decision.approverId,
      byName: decision.approverName,
      stepId,
      at: new Date(),
      comment: decision.comment,
      details: `${decision.approverName || 'مستخدم'} ${decision.approved ? 'وافق' : 'رفض'} على الطلب`,
    });

    request.updatedAt = new Date();

    // Determine overall status
    this._updateWorkflowStatus(request);

    this.emit('decisionSubmitted', { request, step, decision });

    return {
      success: true,
      data: request,
      message: decision.approved ? 'تمت الموافقة بنجاح' : 'تم الرفض',
    };
  }

  /**
   * Update workflow status based on step decisions
   */
  _updateWorkflowStatus(request) {
    const approvedSteps = request.steps.filter(s => s.status === APPROVAL_STATUSES.APPROVED);
    const rejectedSteps = request.steps.filter(s => s.status === APPROVAL_STATUSES.REJECTED);
    const pendingSteps = request.steps.filter(s => s.status === APPROVAL_STATUSES.PENDING);
    const requiredSteps = request.steps.filter(s => s.required);

    switch (request.workflowType) {
      case WORKFLOW_TYPES.SEQUENTIAL:
        if (rejectedSteps.length > 0) {
          request.status = APPROVAL_STATUSES.REJECTED;
          request.completedAt = new Date();
          this.emit('approvalRejected', request);
        } else if (pendingSteps.length === 0) {
          request.status = APPROVAL_STATUSES.APPROVED;
          request.completedAt = new Date();
          this.emit('approvalCompleted', request);
        } else {
          request.currentStep = approvedSteps.length + 1;
        }
        break;

      case WORKFLOW_TYPES.PARALLEL:
      case WORKFLOW_TYPES.UNANIMOUS:
        if (rejectedSteps.some(s => s.required)) {
          request.status = APPROVAL_STATUSES.REJECTED;
          request.completedAt = new Date();
          this.emit('approvalRejected', request);
        } else if (requiredSteps.every(s => s.status === APPROVAL_STATUSES.APPROVED)) {
          request.status = APPROVAL_STATUSES.APPROVED;
          request.completedAt = new Date();
          this.emit('approvalCompleted', request);
        }
        break;

      case WORKFLOW_TYPES.ANY:
        if (approvedSteps.length > 0) {
          request.status = APPROVAL_STATUSES.APPROVED;
          request.completedAt = new Date();
          this.emit('approvalCompleted', request);
        } else if (pendingSteps.length === 0) {
          request.status = APPROVAL_STATUSES.REJECTED;
          request.completedAt = new Date();
          this.emit('approvalRejected', request);
        }
        break;

      case WORKFLOW_TYPES.MAJORITY:
        const total = requiredSteps.length;
        const majority = Math.ceil(total / 2);
        if (approvedSteps.filter(s => s.required).length >= majority) {
          request.status = APPROVAL_STATUSES.APPROVED;
          request.completedAt = new Date();
          this.emit('approvalCompleted', request);
        } else if (rejectedSteps.filter(s => s.required).length > total - majority) {
          request.status = APPROVAL_STATUSES.REJECTED;
          request.completedAt = new Date();
          this.emit('approvalRejected', request);
        }
        break;
    }
  }

  /**
   * Get approval request — جلب طلب الموافقة
   */
  async getApprovalRequest(requestId) {
    const request = this.approvalRequests.get(requestId);
    if (!request) {
      return { success: false, message: 'طلب الموافقة غير موجود' };
    }
    return { success: true, data: request };
  }

  /**
   * Get pending approvals for user — الموافقات المعلقة للمستخدم
   */
  async getPendingApprovals(userId, userRole) {
    const pending = [];

    for (const [, request] of this.approvalRequests) {
      if (request.status !== APPROVAL_STATUSES.PENDING) continue;

      const pendingSteps = request.steps.filter(s => {
        if (s.status !== APPROVAL_STATUSES.PENDING) return false;
        if (s.approverId === userId) return true;
        if (s.role === userRole) return true;
        if (s.delegatedTo === userId) return true;
        return false;
      });

      if (pendingSteps.length > 0) {
        pending.push({
          ...request,
          myPendingSteps: pendingSteps,
          isOverdue: pendingSteps.some(s => new Date(s.slaDeadline) < new Date()),
        });
      }
    }

    // Sort by priority then date
    const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
    pending.sort((a, b) => {
      const pDiff = (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
      if (pDiff !== 0) return pDiff;
      return new Date(a.createdAt) - new Date(b.createdAt);
    });

    return {
      success: true,
      data: pending,
      total: pending.length,
    };
  }

  /**
   * Get all approval requests with filters — جلب جميع الطلبات
   */
  async getApprovalRequests(filters = {}) {
    let requests = Array.from(this.approvalRequests.values());

    if (filters.status) requests = requests.filter(r => r.status === filters.status);
    if (filters.documentId) requests = requests.filter(r => r.documentId === filters.documentId);
    if (filters.requestedBy) requests = requests.filter(r => r.requestedBy === filters.requestedBy);
    if (filters.templateId) requests = requests.filter(r => r.templateId === filters.templateId);
    if (filters.priority) requests = requests.filter(r => r.priority === filters.priority);

    requests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 20;
    const start = (page - 1) * limit;

    return {
      success: true,
      data: requests.slice(start, start + limit),
      total: requests.length,
      page,
      pages: Math.ceil(requests.length / limit),
    };
  }

  /**
   * Delegate approval — تفويض الموافقة
   */
  async delegateApproval(requestId, stepId, delegateData) {
    const request = this.approvalRequests.get(requestId);
    if (!request) return { success: false, message: 'طلب الموافقة غير موجود' };

    const step = request.steps.find(s => s.id === stepId);
    if (!step) return { success: false, message: 'خطوة الموافقة غير موجودة' };

    step.delegatedTo = delegateData.delegateToId;
    step.delegatedToName = delegateData.delegateToName;
    step.delegatedBy = delegateData.delegatedBy;
    step.delegatedAt = new Date();
    step.delegationReason = delegateData.reason || '';

    request.history.push({
      action: 'delegated',
      by: delegateData.delegatedBy,
      at: new Date(),
      details: `تم التفويض إلى ${delegateData.delegateToName}`,
    });

    this.emit('approvalDelegated', { request, step, delegateData });

    return {
      success: true,
      data: request,
      message: 'تم التفويض بنجاح',
    };
  }

  /**
   * Cancel approval request — إلغاء طلب الموافقة
   */
  async cancelApprovalRequest(requestId, cancelledBy) {
    const request = this.approvalRequests.get(requestId);
    if (!request) return { success: false, message: 'طلب الموافقة غير موجود' };

    if (request.status !== APPROVAL_STATUSES.PENDING) {
      return { success: false, message: 'لا يمكن إلغاء طلب غير معلق' };
    }

    request.status = APPROVAL_STATUSES.CANCELLED;
    request.completedAt = new Date();
    request.history.push({
      action: 'cancelled',
      by: cancelledBy,
      at: new Date(),
      details: 'تم إلغاء طلب الموافقة',
    });

    this.emit('approvalCancelled', request);

    return { success: true, data: request, message: 'تم إلغاء الطلب بنجاح' };
  }

  /**
   * Get approval statistics — إحصائيات الموافقات
   */
  async getStatistics(options = {}) {
    const requests = Array.from(this.approvalRequests.values());

    const byStatus = {};
    const byTemplate = {};
    const byPriority = {};

    requests.forEach(r => {
      byStatus[r.status] = (byStatus[r.status] || 0) + 1;
      byTemplate[r.templateName] = (byTemplate[r.templateName] || 0) + 1;
      byPriority[r.priority] = (byPriority[r.priority] || 0) + 1;
    });

    const completed = requests.filter(r => r.completedAt);
    const avgProcessingTime =
      completed.length > 0
        ? completed.reduce((sum, r) => sum + (new Date(r.completedAt) - new Date(r.createdAt)), 0) /
          completed.length /
          (1000 * 60 * 60)
        : 0;

    const overdue = requests.filter(r => {
      if (r.status !== APPROVAL_STATUSES.PENDING) return false;
      return r.steps.some(
        s => s.status === APPROVAL_STATUSES.PENDING && new Date(s.slaDeadline) < new Date()
      );
    });

    return {
      success: true,
      data: {
        totalRequests: requests.length,
        byStatus,
        byTemplate,
        byPriority,
        avgProcessingTimeHours: Math.round(avgProcessingTime * 10) / 10,
        overdueCount: overdue.length,
        approvalRate:
          requests.length > 0
            ? Math.round(
                (requests.filter(r => r.status === APPROVAL_STATUSES.APPROVED).length /
                  requests.length) *
                  100
              )
            : 0,
      },
    };
  }
}

const approvalService = new DocumentApprovalService();
approvalService.APPROVAL_STATUSES = APPROVAL_STATUSES;
approvalService.WORKFLOW_TYPES = WORKFLOW_TYPES;
module.exports = approvalService;
