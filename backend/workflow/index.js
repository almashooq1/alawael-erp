/**
 * Intelligent Workflow Module Index
 * فهرس وحدة سير العمل الذكي
 */

const {
  IntelligentWorkflowEngine,
  WorkflowDefinition,
  WorkflowInstance,
  TaskInstance,
  WorkflowAuditLog,
} = require('./intelligent-workflow-engine');

const workflowRoutes = require('./workflow-routes');

module.exports = {
  // Engine
  IntelligentWorkflowEngine,
  
  // Models
  WorkflowDefinition,
  WorkflowInstance,
  TaskInstance,
  WorkflowAuditLog,
  
  // Routes
  workflowRoutes,
  
  // Step Types
  stepTypes: {
    start: { name: 'بداية', nameEn: 'Start' },
    end: { name: 'نهاية', nameEn: 'End' },
    task: { name: 'مهمة', nameEn: 'Task' },
    approval: { name: 'موافقة', nameEn: 'Approval' },
    notification: { name: 'إشعار', nameEn: 'Notification' },
    condition: { name: 'شرط', nameEn: 'Condition' },
    parallel: { name: 'متوازي', nameEn: 'Parallel' },
    subprocess: { name: 'عملية فرعية', nameEn: 'Subprocess' },
    integration: { name: 'تكامل', nameEn: 'Integration' },
  },
  
  // Categories
  categories: {
    approval: { name: 'موافقات', nameEn: 'Approval' },
    request: { name: 'طلبات', nameEn: 'Request' },
    incident: { name: 'حوادث', nameEn: 'Incident' },
    change: { name: 'تغييرات', nameEn: 'Change' },
    project: { name: 'مشاريع', nameEn: 'Project' },
    custom: { name: 'مخصص', nameEn: 'Custom' },
  },
  
  // Task Statuses
  taskStatuses: {
    pending: { name: 'قيد الانتظار', color: '#9CA3AF' },
    assigned: { name: 'معين', color: '#3B82F6' },
    in_progress: { name: 'قيد التنفيذ', color: '#F59E0B' },
    completed: { name: 'مكتمل', color: '#10B981' },
    cancelled: { name: 'ملغي', color: '#EF4444' },
    skipped: { name: 'تم تخطيه', color: '#6B7280' },
    error: { name: 'خطأ', color: '#DC2626' },
  },
  
  // Workflow Statuses
  workflowStatuses: {
    running: { name: 'قيد التشغيل', color: '#3B82F6' },
    completed: { name: 'مكتمل', color: '#10B981' },
    cancelled: { name: 'ملغي', color: '#EF4444' },
    error: { name: 'خطأ', color: '#DC2626' },
    suspended: { name: 'معلق', color: '#F59E0B' },
  },
  
  // Assignment Types
  assignmentTypes: {
    user: { name: 'مستخدم محدد', nameEn: 'Specific User' },
    role: { name: 'دور', nameEn: 'Role' },
    group: { name: 'مجموعة', nameEn: 'Group' },
    manager: { name: 'المدير', nameEn: 'Manager' },
    previous_assignee: { name: 'المكلف السابق', nameEn: 'Previous Assignee' },
    formula: { name: 'صيغة ديناميكية', nameEn: 'Dynamic Formula' },
  },
};