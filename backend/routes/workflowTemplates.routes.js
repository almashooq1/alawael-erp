/**
 * Workflow Extended Templates — extracted from workflowEnhanced.routes.js.
 *
 * Concrete sub-module #4 of the workflowEnhanced refactor. Contains the
 * EXTENDED_TEMPLATES registry (10 frozen Arabic-first workflow blueprints
 * for salary-advance, leave-request, complaint-investigation, etc.) plus
 * the 3 endpoints that read it.
 *
 * Mounted through `workflowEnhanced.routes.js` via
 * `router.use('/', require('./workflowTemplates.routes'))` so public URLs
 * (`/api/workflow-enhanced/templates/extended/...` + v1 alias) are
 * unchanged.
 *
 * Endpoints:
 *   GET  /templates/extended
 *   GET  /templates/extended/:templateId
 *   POST /templates/extended/:templateId/deploy
 */

'use strict';

const express = require('express');
const router = express.Router();

const { WorkflowDefinition } = require('../workflow/intelligent-workflow-engine');

const { authenticateToken: authMiddleware } = require('../middleware/auth');
const { requireBranchAccess } = require('../middleware/branchScope.middleware');
const safeError = require('../utils/safeError');

const uid = req => (req.user && (req.user.id || req.user._id)) || null;

// ════════════════════════════════════════════════════════════════════════════════
// EXTENDED TEMPLATES — قوالب جديدة (10 إضافية)
// ════════════════════════════════════════════════════════════════════════════════

const EXTENDED_TEMPLATES = [
  // ── 6) طلب سلفة مالية ─────────────────────────────
  {
    id: 'salary-advance',
    name: 'Salary Advance Request',
    nameAr: 'طلب سلفة مالية',
    description: 'Employee salary advance request with multi-level approval',
    descriptionAr: 'طلب سلفة راتب للموظف مع موافقة متعددة المستويات',
    category: 'request',
    icon: '💰',
    steps: [
      { id: 'start', name: 'Start', nameAr: 'بداية', type: 'start', nextSteps: ['submit'] },
      {
        id: 'submit',
        name: 'Submit Request',
        nameAr: 'تقديم الطلب',
        type: 'task',
        assignment: { type: 'previous_assignee' },
        taskConfig: { priority: 'medium', requireComment: true },
        nextSteps: ['amount_check'],
      },
      {
        id: 'amount_check',
        name: 'Amount Check',
        nameAr: 'فحص المبلغ',
        type: 'condition',
        conditions: [
          {
            id: 'low',
            field: 'amount',
            operator: 'lte',
            value: 5000,
            nextStep: 'manager_approval',
          },
          {
            id: 'high',
            field: 'amount',
            operator: 'gt',
            value: 5000,
            nextStep: 'director_approval',
          },
        ],
        defaultNextStep: 'manager_approval',
        nextSteps: ['manager_approval', 'director_approval'],
      },
      {
        id: 'manager_approval',
        name: 'Manager Approval',
        nameAr: 'موافقة المدير',
        type: 'approval',
        assignment: { type: 'manager' },
        sla: { enabled: true, duration: 1440, escalateAfter: 720 },
        taskConfig: {
          actions: [
            {
              id: 'approve',
              label: 'Approve',
              labelAr: 'موافقة',
              type: 'approve',
              nextStep: 'hr_review',
            },
            {
              id: 'reject',
              label: 'Reject',
              labelAr: 'رفض',
              type: 'reject',
              nextStep: 'end_rejected',
            },
          ],
        },
        nextSteps: ['hr_review', 'end_rejected'],
      },
      {
        id: 'director_approval',
        name: 'Director Approval',
        nameAr: 'موافقة المدير التنفيذي',
        type: 'approval',
        assignment: { type: 'role' },
        sla: { enabled: true, duration: 2880 },
        taskConfig: {
          actions: [
            {
              id: 'approve',
              label: 'Approve',
              labelAr: 'موافقة',
              type: 'approve',
              nextStep: 'hr_review',
            },
            {
              id: 'reject',
              label: 'Reject',
              labelAr: 'رفض',
              type: 'reject',
              nextStep: 'end_rejected',
            },
          ],
        },
        nextSteps: ['hr_review', 'end_rejected'],
      },
      {
        id: 'hr_review',
        name: 'HR Review',
        nameAr: 'مراجعة الموارد البشرية',
        type: 'task',
        assignment: { type: 'role' },
        sla: { enabled: true, duration: 1440 },
        nextSteps: ['finance_process'],
      },
      {
        id: 'finance_process',
        name: 'Finance Processing',
        nameAr: 'التنفيذ المالي',
        type: 'task',
        assignment: { type: 'role' },
        sla: { enabled: true, duration: 2880 },
        nextSteps: ['notify_employee'],
      },
      {
        id: 'notify_employee',
        name: 'Notify Employee',
        nameAr: 'إبلاغ الموظف',
        type: 'notification',
        notifications: [{ type: 'email', template: 'advance_approved', recipients: ['requester'] }],
        nextSteps: ['end_approved'],
      },
      { id: 'end_approved', name: 'End (Approved)', nameAr: 'نهاية (مقبول)', type: 'end' },
      { id: 'end_rejected', name: 'End (Rejected)', nameAr: 'نهاية (مرفوض)', type: 'end' },
    ],
  },

  // ── 7) طلب صيانة ─────────────────────────────────
  {
    id: 'maintenance-request',
    name: 'Maintenance Request',
    nameAr: 'طلب صيانة',
    description: 'Facility maintenance request with priority-based routing',
    descriptionAr: 'طلب صيانة مع توجيه حسب الأولوية',
    category: 'request',
    icon: '🔧',
    steps: [
      { id: 'start', name: 'Start', nameAr: 'بداية', type: 'start', nextSteps: ['report'] },
      {
        id: 'report',
        name: 'Report Issue',
        nameAr: 'الإبلاغ عن المشكلة',
        type: 'task',
        taskConfig: { requireAttachment: true, requireComment: true },
        nextSteps: ['priority_check'],
      },
      {
        id: 'priority_check',
        name: 'Priority Check',
        nameAr: 'فحص الأولوية',
        type: 'condition',
        conditions: [
          {
            id: 'urgent',
            field: 'priority',
            operator: 'eq',
            value: 'urgent',
            nextStep: 'emergency_team',
          },
          {
            id: 'normal',
            field: 'priority',
            operator: 'in',
            value: ['medium', 'low'],
            nextStep: 'assign_technician',
          },
        ],
        defaultNextStep: 'assign_technician',
        nextSteps: ['emergency_team', 'assign_technician'],
      },
      {
        id: 'emergency_team',
        name: 'Emergency Team',
        nameAr: 'فريق الطوارئ',
        type: 'task',
        assignment: { type: 'group' },
        sla: { enabled: true, duration: 120 },
        nextSteps: ['work_order'],
      },
      {
        id: 'assign_technician',
        name: 'Assign Technician',
        nameAr: 'تعيين فني',
        type: 'task',
        assignment: { type: 'role' },
        sla: { enabled: true, duration: 1440 },
        nextSteps: ['work_order'],
      },
      {
        id: 'work_order',
        name: 'Execute Work Order',
        nameAr: 'تنفيذ أمر العمل',
        type: 'task',
        taskConfig: { requireComment: true, requireAttachment: true },
        sla: { enabled: true, duration: 4320 },
        nextSteps: ['quality_check'],
      },
      {
        id: 'quality_check',
        name: 'Quality Check',
        nameAr: 'فحص الجودة',
        type: 'approval',
        taskConfig: {
          actions: [
            { id: 'pass', label: 'Pass', labelAr: 'ناجح', type: 'approve', nextStep: 'close' },
            { id: 'fail', label: 'Fail', labelAr: 'فاشل', type: 'reject', nextStep: 'work_order' },
          ],
        },
        nextSteps: ['close', 'work_order'],
      },
      {
        id: 'close',
        name: 'Close Request',
        nameAr: 'إغلاق الطلب',
        type: 'notification',
        notifications: [
          { type: 'in_app', template: 'maintenance_complete', recipients: ['requester'] },
        ],
        nextSteps: ['end'],
      },
      { id: 'end', name: 'End', nameAr: 'نهاية', type: 'end' },
    ],
  },

  // ── 8) طلب نقل موظف ─────────────────────────────
  {
    id: 'employee-transfer',
    name: 'Employee Transfer',
    nameAr: 'طلب نقل موظف',
    description: 'Internal employee transfer between departments',
    descriptionAr: 'نقل موظف بين الأقسام الداخلية',
    category: 'request',
    icon: '🔄',
    steps: [
      { id: 'start', name: 'Start', nameAr: 'بداية', type: 'start', nextSteps: ['submit'] },
      {
        id: 'submit',
        name: 'Submit Transfer Request',
        nameAr: 'تقديم طلب النقل',
        type: 'task',
        taskConfig: { requireComment: true },
        nextSteps: ['current_manager'],
      },
      {
        id: 'current_manager',
        name: 'Current Manager Approval',
        nameAr: 'موافقة المدير الحالي',
        type: 'approval',
        assignment: { type: 'manager' },
        sla: { enabled: true, duration: 2880 },
        taskConfig: {
          actions: [
            {
              id: 'approve',
              label: 'Approve',
              labelAr: 'موافقة',
              type: 'approve',
              nextStep: 'new_manager',
            },
            {
              id: 'reject',
              label: 'Reject',
              labelAr: 'رفض',
              type: 'reject',
              nextStep: 'end_rejected',
            },
          ],
        },
        nextSteps: ['new_manager', 'end_rejected'],
      },
      {
        id: 'new_manager',
        name: 'New Manager Approval',
        nameAr: 'موافقة المدير الجديد',
        type: 'approval',
        sla: { enabled: true, duration: 2880 },
        taskConfig: {
          actions: [
            {
              id: 'approve',
              label: 'Approve',
              labelAr: 'موافقة',
              type: 'approve',
              nextStep: 'hr_process',
            },
            {
              id: 'reject',
              label: 'Reject',
              labelAr: 'رفض',
              type: 'reject',
              nextStep: 'end_rejected',
            },
          ],
        },
        nextSteps: ['hr_process', 'end_rejected'],
      },
      {
        id: 'hr_process',
        name: 'HR Processing',
        nameAr: 'إجراءات الموارد البشرية',
        type: 'task',
        assignment: { type: 'role' },
        sla: { enabled: true, duration: 4320 },
        nextSteps: ['it_setup'],
      },
      {
        id: 'it_setup',
        name: 'IT Setup (New Location)',
        nameAr: 'إعداد تقنية المعلومات',
        type: 'task',
        assignment: { type: 'role' },
        sla: { enabled: true, duration: 2880 },
        nextSteps: ['notify'],
      },
      {
        id: 'notify',
        name: 'Notify All Parties',
        nameAr: 'إبلاغ جميع الأطراف',
        type: 'notification',
        notifications: [
          { type: 'email', template: 'transfer_approved', recipients: ['requester', 'manager'] },
        ],
        nextSteps: ['end_approved'],
      },
      { id: 'end_approved', name: 'End (Approved)', nameAr: 'نهاية (مقبول)', type: 'end' },
      { id: 'end_rejected', name: 'End (Rejected)', nameAr: 'نهاية (مرفوض)', type: 'end' },
    ],
  },

  // ── 9) طلب تدريب ──────────────────────────────────
  {
    id: 'training-request',
    name: 'Training Request',
    nameAr: 'طلب تدريب',
    description: 'Employee training and development request',
    descriptionAr: 'طلب تدريب وتطوير الموظف',
    category: 'request',
    icon: '📚',
    steps: [
      { id: 'start', name: 'Start', nameAr: 'بداية', type: 'start', nextSteps: ['submit'] },
      {
        id: 'submit',
        name: 'Submit Training Request',
        nameAr: 'تقديم طلب التدريب',
        type: 'task',
        taskConfig: { requireComment: true },
        nextSteps: ['manager_approval'],
      },
      {
        id: 'manager_approval',
        name: 'Manager Approval',
        nameAr: 'موافقة المدير',
        type: 'approval',
        assignment: { type: 'manager' },
        sla: { enabled: true, duration: 2880 },
        taskConfig: {
          actions: [
            {
              id: 'approve',
              label: 'Approve',
              labelAr: 'موافقة',
              type: 'approve',
              nextStep: 'budget_check',
            },
            {
              id: 'reject',
              label: 'Reject',
              labelAr: 'رفض',
              type: 'reject',
              nextStep: 'end_rejected',
            },
          ],
        },
        nextSteps: ['budget_check', 'end_rejected'],
      },
      {
        id: 'budget_check',
        name: 'Budget Verification',
        nameAr: 'التحقق من الميزانية',
        type: 'condition',
        conditions: [
          { id: 'within', field: 'cost', operator: 'lte', value: 10000, nextStep: 'hr_enroll' },
          { id: 'over', field: 'cost', operator: 'gt', value: 10000, nextStep: 'finance_approval' },
        ],
        defaultNextStep: 'hr_enroll',
        nextSteps: ['hr_enroll', 'finance_approval'],
      },
      {
        id: 'finance_approval',
        name: 'Finance Approval',
        nameAr: 'موافقة المالية',
        type: 'approval',
        assignment: { type: 'role' },
        sla: { enabled: true, duration: 2880 },
        taskConfig: {
          actions: [
            {
              id: 'approve',
              label: 'Approve',
              labelAr: 'موافقة',
              type: 'approve',
              nextStep: 'hr_enroll',
            },
            {
              id: 'reject',
              label: 'Reject',
              labelAr: 'رفض',
              type: 'reject',
              nextStep: 'end_rejected',
            },
          ],
        },
        nextSteps: ['hr_enroll', 'end_rejected'],
      },
      {
        id: 'hr_enroll',
        name: 'HR Enrollment',
        nameAr: 'تسجيل الموارد البشرية',
        type: 'task',
        assignment: { type: 'role' },
        sla: { enabled: true, duration: 4320 },
        nextSteps: ['training_execution'],
      },
      {
        id: 'training_execution',
        name: 'Training Execution',
        nameAr: 'تنفيذ التدريب',
        type: 'task',
        nextSteps: ['evaluation'],
      },
      {
        id: 'evaluation',
        name: 'Training Evaluation',
        nameAr: 'تقييم التدريب',
        type: 'task',
        taskConfig: { requireComment: true },
        nextSteps: ['end_completed'],
      },
      { id: 'end_completed', name: 'End', nameAr: 'نهاية', type: 'end' },
      { id: 'end_rejected', name: 'End (Rejected)', nameAr: 'نهاية (مرفوض)', type: 'end' },
    ],
  },

  // ── 10) طلب إجراء تأديبي ──────────────────────────
  {
    id: 'disciplinary-action',
    name: 'Disciplinary Action',
    nameAr: 'إجراء تأديبي',
    description: 'Employee disciplinary action workflow',
    descriptionAr: 'سير عمل الإجراء التأديبي للموظف',
    category: 'incident',
    icon: '⚠️',
    steps: [
      { id: 'start', name: 'Start', nameAr: 'بداية', type: 'start', nextSteps: ['report'] },
      {
        id: 'report',
        name: 'Report Incident',
        nameAr: 'الإبلاغ عن المخالفة',
        type: 'task',
        taskConfig: { requireComment: true, requireAttachment: true },
        nextSteps: ['hr_review'],
      },
      {
        id: 'hr_review',
        name: 'HR Investigation',
        nameAr: 'تحقيق الموارد البشرية',
        type: 'task',
        assignment: { type: 'role' },
        sla: { enabled: true, duration: 7200 },
        nextSteps: ['hearing'],
      },
      {
        id: 'hearing',
        name: 'Employee Hearing',
        nameAr: 'جلسة استماع الموظف',
        type: 'task',
        sla: { enabled: true, duration: 4320 },
        nextSteps: ['committee_decision'],
      },
      {
        id: 'committee_decision',
        name: 'Committee Decision',
        nameAr: 'قرار اللجنة',
        type: 'approval',
        taskConfig: {
          actions: [
            {
              id: 'warning',
              label: 'Warning',
              labelAr: 'إنذار',
              type: 'custom',
              nextStep: 'issue_warning',
            },
            {
              id: 'suspension',
              label: 'Suspension',
              labelAr: 'إيقاف',
              type: 'custom',
              nextStep: 'issue_suspension',
            },
            {
              id: 'termination',
              label: 'Termination',
              labelAr: 'إنهاء خدمة',
              type: 'custom',
              nextStep: 'legal_review',
            },
            {
              id: 'dismiss',
              label: 'Dismiss Case',
              labelAr: 'رفض القضية',
              type: 'custom',
              nextStep: 'end_dismissed',
            },
          ],
        },
        nextSteps: ['issue_warning', 'issue_suspension', 'legal_review', 'end_dismissed'],
      },
      {
        id: 'issue_warning',
        name: 'Issue Warning',
        nameAr: 'إصدار الإنذار',
        type: 'task',
        assignment: { type: 'role' },
        nextSteps: ['notify_employee'],
      },
      {
        id: 'issue_suspension',
        name: 'Issue Suspension',
        nameAr: 'إصدار الإيقاف',
        type: 'task',
        assignment: { type: 'role' },
        nextSteps: ['notify_employee'],
      },
      {
        id: 'legal_review',
        name: 'Legal Review',
        nameAr: 'المراجعة القانونية',
        type: 'approval',
        sla: { enabled: true, duration: 7200 },
        taskConfig: {
          actions: [
            {
              id: 'approve',
              label: 'Approve',
              labelAr: 'موافقة',
              type: 'approve',
              nextStep: 'notify_employee',
            },
            {
              id: 'return',
              label: 'Return',
              labelAr: 'إعادة',
              type: 'return',
              nextStep: 'committee_decision',
            },
          ],
        },
        nextSteps: ['notify_employee', 'committee_decision'],
      },
      {
        id: 'notify_employee',
        name: 'Notify Employee',
        nameAr: 'إبلاغ الموظف',
        type: 'notification',
        notifications: [
          { type: 'email', template: 'disciplinary_notice', recipients: ['requester'] },
        ],
        nextSteps: ['end_completed'],
      },
      { id: 'end_completed', name: 'End', nameAr: 'نهاية', type: 'end' },
      { id: 'end_dismissed', name: 'End (Dismissed)', nameAr: 'نهاية (مرفوض)', type: 'end' },
    ],
  },

  // ── 11) طلب عقد جديد ──────────────────────────────
  {
    id: 'contract-request',
    name: 'Contract Request',
    nameAr: 'طلب عقد جديد',
    description: 'New contract creation and approval workflow',
    descriptionAr: 'سير عمل إنشاء واعتماد العقود الجديدة',
    category: 'approval',
    icon: '📝',
    steps: [
      { id: 'start', name: 'Start', nameAr: 'بداية', type: 'start', nextSteps: ['draft'] },
      {
        id: 'draft',
        name: 'Draft Contract',
        nameAr: 'صياغة العقد',
        type: 'task',
        taskConfig: { requireAttachment: true },
        sla: { enabled: true, duration: 7200 },
        nextSteps: ['legal_review'],
      },
      {
        id: 'legal_review',
        name: 'Legal Review',
        nameAr: 'المراجعة القانونية',
        type: 'approval',
        assignment: { type: 'role' },
        sla: { enabled: true, duration: 7200 },
        taskConfig: {
          actions: [
            {
              id: 'approve',
              label: 'Approve',
              labelAr: 'موافقة',
              type: 'approve',
              nextStep: 'value_check',
            },
            {
              id: 'return',
              label: 'Return for Changes',
              labelAr: 'إعادة للتعديل',
              type: 'return',
              nextStep: 'draft',
            },
          ],
        },
        nextSteps: ['value_check', 'draft'],
      },
      {
        id: 'value_check',
        name: 'Value Check',
        nameAr: 'فحص القيمة',
        type: 'condition',
        conditions: [
          {
            id: 'low',
            field: 'contractValue',
            operator: 'lte',
            value: 100000,
            nextStep: 'dept_manager',
          },
          {
            id: 'med',
            field: 'contractValue',
            operator: 'lte',
            value: 500000,
            nextStep: 'director',
          },
          {
            id: 'high',
            field: 'contractValue',
            operator: 'gt',
            value: 500000,
            nextStep: 'ceo_approval',
          },
        ],
        defaultNextStep: 'dept_manager',
        nextSteps: ['dept_manager', 'director', 'ceo_approval'],
      },
      {
        id: 'dept_manager',
        name: 'Department Manager Approval',
        nameAr: 'موافقة مدير القسم',
        type: 'approval',
        assignment: { type: 'manager' },
        sla: { enabled: true, duration: 2880 },
        taskConfig: {
          actions: [
            {
              id: 'approve',
              label: 'Approve',
              labelAr: 'موافقة',
              type: 'approve',
              nextStep: 'sign',
            },
            {
              id: 'reject',
              label: 'Reject',
              labelAr: 'رفض',
              type: 'reject',
              nextStep: 'end_rejected',
            },
          ],
        },
        nextSteps: ['sign', 'end_rejected'],
      },
      {
        id: 'director',
        name: 'Director Approval',
        nameAr: 'موافقة المدير التنفيذي',
        type: 'approval',
        sla: { enabled: true, duration: 4320 },
        taskConfig: {
          actions: [
            {
              id: 'approve',
              label: 'Approve',
              labelAr: 'موافقة',
              type: 'approve',
              nextStep: 'sign',
            },
            {
              id: 'reject',
              label: 'Reject',
              labelAr: 'رفض',
              type: 'reject',
              nextStep: 'end_rejected',
            },
          ],
        },
        nextSteps: ['sign', 'end_rejected'],
      },
      {
        id: 'ceo_approval',
        name: 'CEO Approval',
        nameAr: 'موافقة الرئيس التنفيذي',
        type: 'approval',
        sla: { enabled: true, duration: 5760 },
        taskConfig: {
          actions: [
            {
              id: 'approve',
              label: 'Approve',
              labelAr: 'موافقة',
              type: 'approve',
              nextStep: 'sign',
            },
            {
              id: 'reject',
              label: 'Reject',
              labelAr: 'رفض',
              type: 'reject',
              nextStep: 'end_rejected',
            },
          ],
        },
        nextSteps: ['sign', 'end_rejected'],
      },
      {
        id: 'sign',
        name: 'Contract Signing',
        nameAr: 'توقيع العقد',
        type: 'task',
        taskConfig: { requireAttachment: true },
        nextSteps: ['archive'],
      },
      {
        id: 'archive',
        name: 'Archive Contract',
        nameAr: 'أرشفة العقد',
        type: 'task',
        nextSteps: ['end_approved'],
      },
      { id: 'end_approved', name: 'End (Approved)', nameAr: 'نهاية (معتمد)', type: 'end' },
      { id: 'end_rejected', name: 'End (Rejected)', nameAr: 'نهاية (مرفوض)', type: 'end' },
    ],
  },

  // ── 12) طلب استقالة ───────────────────────────────
  {
    id: 'resignation-request',
    name: 'Resignation Request',
    nameAr: 'طلب استقالة',
    description: 'Employee resignation with exit procedures',
    descriptionAr: 'استقالة موظف مع إجراءات المغادرة',
    category: 'request',
    icon: '🚪',
    steps: [
      { id: 'start', name: 'Start', nameAr: 'بداية', type: 'start', nextSteps: ['submit'] },
      {
        id: 'submit',
        name: 'Submit Resignation',
        nameAr: 'تقديم الاستقالة',
        type: 'task',
        taskConfig: { requireComment: true },
        nextSteps: ['manager_review'],
      },
      {
        id: 'manager_review',
        name: 'Manager Review',
        nameAr: 'مراجعة المدير',
        type: 'approval',
        assignment: { type: 'manager' },
        sla: { enabled: true, duration: 2880 },
        taskConfig: {
          actions: [
            {
              id: 'accept',
              label: 'Accept',
              labelAr: 'قبول',
              type: 'approve',
              nextStep: 'hr_process',
            },
            {
              id: 'counter',
              label: 'Counter Offer',
              labelAr: 'عرض بديل',
              type: 'custom',
              nextStep: 'counter_offer',
            },
          ],
        },
        nextSteps: ['hr_process', 'counter_offer'],
      },
      {
        id: 'counter_offer',
        name: 'Counter Offer',
        nameAr: 'عرض بديل',
        type: 'task',
        nextSteps: ['employee_decision'],
      },
      {
        id: 'employee_decision',
        name: 'Employee Decision',
        nameAr: 'قرار الموظف',
        type: 'approval',
        taskConfig: {
          actions: [
            {
              id: 'stay',
              label: 'Accept Offer',
              labelAr: 'قبول العرض',
              type: 'approve',
              nextStep: 'end_withdrawn',
            },
            {
              id: 'leave',
              label: 'Proceed Resignation',
              labelAr: 'متابعة الاستقالة',
              type: 'reject',
              nextStep: 'hr_process',
            },
          ],
        },
        nextSteps: ['end_withdrawn', 'hr_process'],
      },
      {
        id: 'hr_process',
        name: 'HR Exit Process',
        nameAr: 'إجراءات مغادرة الموارد البشرية',
        type: 'parallel',
        nextSteps: ['it_clearance', 'finance_clearance', 'admin_clearance'],
      },
      {
        id: 'it_clearance',
        name: 'IT Clearance',
        nameAr: 'تسوية تقنية المعلومات',
        type: 'task',
        assignment: { type: 'role' },
        sla: { enabled: true, duration: 4320 },
        nextSteps: ['final_settlement'],
      },
      {
        id: 'finance_clearance',
        name: 'Finance Clearance',
        nameAr: 'التسوية المالية',
        type: 'task',
        assignment: { type: 'role' },
        sla: { enabled: true, duration: 4320 },
        nextSteps: ['final_settlement'],
      },
      {
        id: 'admin_clearance',
        name: 'Admin Clearance',
        nameAr: 'التسوية الإدارية',
        type: 'task',
        assignment: { type: 'role' },
        sla: { enabled: true, duration: 4320 },
        nextSteps: ['final_settlement'],
      },
      {
        id: 'final_settlement',
        name: 'Final Settlement',
        nameAr: 'التسوية النهائية',
        type: 'task',
        assignment: { type: 'role' },
        nextSteps: ['end_completed'],
      },
      { id: 'end_completed', name: 'End', nameAr: 'نهاية', type: 'end' },
      { id: 'end_withdrawn', name: 'End (Withdrawn)', nameAr: 'نهاية (سُحبت)', type: 'end' },
    ],
  },

  // ── 13) طلب سفر عمل ──────────────────────────────
  {
    id: 'business-travel',
    name: 'Business Travel Request',
    nameAr: 'طلب سفر عمل',
    description: 'Business travel request with booking and expense',
    descriptionAr: 'طلب سفر عمل مع الحجز والمصاريف',
    category: 'request',
    icon: '✈️',
    steps: [
      { id: 'start', name: 'Start', nameAr: 'بداية', type: 'start', nextSteps: ['submit'] },
      {
        id: 'submit',
        name: 'Submit Travel Request',
        nameAr: 'تقديم طلب السفر',
        type: 'task',
        taskConfig: { requireComment: true },
        nextSteps: ['manager_approval'],
      },
      {
        id: 'manager_approval',
        name: 'Manager Approval',
        nameAr: 'موافقة المدير',
        type: 'approval',
        assignment: { type: 'manager' },
        sla: { enabled: true, duration: 2880 },
        taskConfig: {
          actions: [
            {
              id: 'approve',
              label: 'Approve',
              labelAr: 'موافقة',
              type: 'approve',
              nextStep: 'travel_desk',
            },
            {
              id: 'reject',
              label: 'Reject',
              labelAr: 'رفض',
              type: 'reject',
              nextStep: 'end_rejected',
            },
          ],
        },
        nextSteps: ['travel_desk', 'end_rejected'],
      },
      {
        id: 'travel_desk',
        name: 'Travel Desk Booking',
        nameAr: 'حجز مكتب السفر',
        type: 'task',
        assignment: { type: 'role' },
        sla: { enabled: true, duration: 4320 },
        nextSteps: ['advance_payment'],
      },
      {
        id: 'advance_payment',
        name: 'Advance Payment',
        nameAr: 'صرف سلفة السفر',
        type: 'task',
        assignment: { type: 'role' },
        nextSteps: ['travel_execution'],
      },
      {
        id: 'travel_execution',
        name: 'Travel Period',
        nameAr: 'فترة السفر',
        type: 'task',
        nextSteps: ['expense_report'],
      },
      {
        id: 'expense_report',
        name: 'Expense Report',
        nameAr: 'تقرير المصاريف',
        type: 'task',
        taskConfig: { requireAttachment: true, requireComment: true },
        nextSteps: ['finance_settlement'],
      },
      {
        id: 'finance_settlement',
        name: 'Finance Settlement',
        nameAr: 'التسوية المالية',
        type: 'task',
        assignment: { type: 'role' },
        sla: { enabled: true, duration: 4320 },
        nextSteps: ['end_completed'],
      },
      { id: 'end_completed', name: 'End', nameAr: 'نهاية', type: 'end' },
      { id: 'end_rejected', name: 'End (Rejected)', nameAr: 'نهاية (مرفوض)', type: 'end' },
    ],
  },

  // ── 14) طلب تقييم أداء ────────────────────────────
  {
    id: 'performance-review',
    name: 'Performance Review',
    nameAr: 'تقييم الأداء',
    description: 'Annual/periodic performance review workflow',
    descriptionAr: 'سير عمل تقييم الأداء الدوري',
    category: 'project',
    icon: '📊',
    steps: [
      {
        id: 'start',
        name: 'Start',
        nameAr: 'بداية',
        type: 'start',
        nextSteps: ['self_assessment'],
      },
      {
        id: 'self_assessment',
        name: 'Self Assessment',
        nameAr: 'التقييم الذاتي',
        type: 'task',
        taskConfig: { requireComment: true },
        sla: { enabled: true, duration: 7200 },
        nextSteps: ['manager_review'],
      },
      {
        id: 'manager_review',
        name: 'Manager Review',
        nameAr: 'مراجعة المدير',
        type: 'task',
        assignment: { type: 'manager' },
        taskConfig: { requireComment: true },
        sla: { enabled: true, duration: 7200 },
        nextSteps: ['face_to_face'],
      },
      {
        id: 'face_to_face',
        name: 'Face-to-Face Meeting',
        nameAr: 'اجتماع وجهاً لوجه',
        type: 'task',
        taskConfig: { requireComment: true },
        nextSteps: ['goals_setting'],
      },
      {
        id: 'goals_setting',
        name: 'Goals Setting',
        nameAr: 'تحديد الأهداف',
        type: 'task',
        taskConfig: { requireComment: true },
        nextSteps: ['hr_review'],
      },
      {
        id: 'hr_review',
        name: 'HR Review & Calibration',
        nameAr: 'مراجعة وموازنة الموارد البشرية',
        type: 'approval',
        assignment: { type: 'role' },
        sla: { enabled: true, duration: 7200 },
        taskConfig: {
          actions: [
            {
              id: 'approve',
              label: 'Approve',
              labelAr: 'اعتماد',
              type: 'approve',
              nextStep: 'finalize',
            },
            {
              id: 'adjust',
              label: 'Request Adjustment',
              labelAr: 'طلب تعديل',
              type: 'return',
              nextStep: 'manager_review',
            },
          ],
        },
        nextSteps: ['finalize', 'manager_review'],
      },
      {
        id: 'finalize',
        name: 'Finalize & Archive',
        nameAr: 'الاعتماد والأرشفة',
        type: 'task',
        nextSteps: ['end'],
      },
      { id: 'end', name: 'End', nameAr: 'نهاية', type: 'end' },
    ],
  },

  // ── 15) طلب شكوى / تظلم ──────────────────────────
  {
    id: 'grievance-complaint',
    name: 'Grievance / Complaint',
    nameAr: 'شكوى / تظلم',
    description: 'Employee grievance and complaint handling',
    descriptionAr: 'معالجة شكاوى وتظلمات الموظفين',
    category: 'incident',
    icon: '📢',
    steps: [
      { id: 'start', name: 'Start', nameAr: 'بداية', type: 'start', nextSteps: ['submit'] },
      {
        id: 'submit',
        name: 'Submit Complaint',
        nameAr: 'تقديم الشكوى',
        type: 'task',
        taskConfig: { requireComment: true, requireAttachment: false },
        nextSteps: ['hr_receive'],
      },
      {
        id: 'hr_receive',
        name: 'HR Acknowledgment',
        nameAr: 'استلام الموارد البشرية',
        type: 'task',
        assignment: { type: 'role' },
        sla: { enabled: true, duration: 1440 },
        nextSteps: ['investigation'],
      },
      {
        id: 'investigation',
        name: 'Investigation',
        nameAr: 'التحقيق',
        type: 'task',
        assignment: { type: 'role' },
        sla: { enabled: true, duration: 14400 },
        taskConfig: { requireComment: true },
        nextSteps: ['committee_review'],
      },
      {
        id: 'committee_review',
        name: 'Committee Review',
        nameAr: 'مراجعة اللجنة',
        type: 'approval',
        sla: { enabled: true, duration: 7200 },
        taskConfig: {
          actions: [
            {
              id: 'uphold',
              label: 'Uphold Complaint',
              labelAr: 'قبول الشكوى',
              type: 'approve',
              nextStep: 'resolution',
            },
            {
              id: 'dismiss',
              label: 'Dismiss',
              labelAr: 'رفض',
              type: 'reject',
              nextStep: 'notify_dismissed',
            },
            {
              id: 'escalate',
              label: 'Escalate',
              labelAr: 'تصعيد',
              type: 'delegate',
              nextStep: 'ceo_review',
            },
          ],
        },
        nextSteps: ['resolution', 'notify_dismissed', 'ceo_review'],
      },
      {
        id: 'ceo_review',
        name: 'CEO/Executive Review',
        nameAr: 'مراجعة الرئيس التنفيذي',
        type: 'approval',
        sla: { enabled: true, duration: 7200 },
        taskConfig: {
          actions: [
            {
              id: 'resolve',
              label: 'Resolve',
              labelAr: 'حل',
              type: 'approve',
              nextStep: 'resolution',
            },
            {
              id: 'dismiss',
              label: 'Dismiss',
              labelAr: 'رفض',
              type: 'reject',
              nextStep: 'notify_dismissed',
            },
          ],
        },
        nextSteps: ['resolution', 'notify_dismissed'],
      },
      {
        id: 'resolution',
        name: 'Implement Resolution',
        nameAr: 'تنفيذ الحل',
        type: 'task',
        assignment: { type: 'role' },
        sla: { enabled: true, duration: 7200 },
        nextSteps: ['notify_resolved'],
      },
      {
        id: 'notify_resolved',
        name: 'Notify Resolution',
        nameAr: 'إبلاغ بالحل',
        type: 'notification',
        notifications: [
          { type: 'email', template: 'complaint_resolved', recipients: ['requester'] },
        ],
        nextSteps: ['end_resolved'],
      },
      {
        id: 'notify_dismissed',
        name: 'Notify Dismissal',
        nameAr: 'إبلاغ بالرفض',
        type: 'notification',
        notifications: [
          { type: 'email', template: 'complaint_dismissed', recipients: ['requester'] },
        ],
        nextSteps: ['end_dismissed'],
      },
      { id: 'end_resolved', name: 'End (Resolved)', nameAr: 'نهاية (تم الحل)', type: 'end' },
      { id: 'end_dismissed', name: 'End (Dismissed)', nameAr: 'نهاية (مرفوض)', type: 'end' },
    ],
  },
];

/** List extended templates */
router.get('/templates/extended', authMiddleware, requireBranchAccess, async (_req, res) => {
  try {
    const templates = EXTENDED_TEMPLATES.map(t => ({
      id: t.id,
      name: t.name,
      nameAr: t.nameAr,
      description: t.description,
      descriptionAr: t.descriptionAr,
      category: t.category,
      icon: t.icon,
      stepsCount: t.steps.length,
    }));
    res.json({ success: true, data: templates, total: templates.length });
  } catch (error) {
    safeError(res, error, 'workflowEnhanced');
  }
});

/** Get extended template detail */
router.get(
  '/templates/extended/:templateId',
  authMiddleware,
  requireBranchAccess,
  async (req, res) => {
    try {
      const tmpl = EXTENDED_TEMPLATES.find(t => t.id === req.params.templateId);
      if (!tmpl) return res.status(404).json({ success: false, message: 'القالب غير موجود' });
      res.json({ success: true, data: tmpl });
    } catch (error) {
      safeError(res, error, 'workflowEnhanced');
    }
  }
);

/** Deploy extended template */
router.post(
  '/templates/extended/:templateId/deploy',
  authMiddleware,
  requireBranchAccess,
  async (req, res) => {
    try {
      const tmpl = EXTENDED_TEMPLATES.find(t => t.id === req.params.templateId);
      if (!tmpl) return res.status(404).json({ success: false, message: 'القالب غير موجود' });

      const { name, nameAr } = req.body;
      const code = `${tmpl.id}-${Date.now()}`;

      const definition = new WorkflowDefinition({
        name: name || tmpl.name,
        nameAr: nameAr || tmpl.nameAr,
        code,
        description: tmpl.description,
        category: tmpl.category,
        status: 'draft',
        version: 1,
        steps: tmpl.steps,
        trigger: { type: 'manual' },
        settings: {
          allowReassignment: true,
          allowDelegation: true,
          allowCancellation: true,
          autoAssign: true,
          notifyOnComplete: true,
          notifyOnError: true,
        },
        createdBy: uid(req),
      });

      await definition.save();
      res.status(201).json({
        success: true,
        data: definition,
        message: `تم نشر قالب "${tmpl.nameAr}" بنجاح`,
      });
    } catch (error) {
      safeError(res, error, 'workflowEnhanced');
    }
  }
);

module.exports = router;
