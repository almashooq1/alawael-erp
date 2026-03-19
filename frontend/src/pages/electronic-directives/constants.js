/**
 * Electronic Directives Constants — ثوابت التوجيهات الإلكترونية
 * Aligned with backend DirectiveSchema enums
 */

// ─── Directive Types ──────────────────────────────────────────
export const DIRECTIVE_TYPES = {
  instruction: { value: 'instruction', label: 'تعليمات', color: '#1976d2' },
  circular: { value: 'circular', label: 'تعميم', color: '#388e3c' },
  decision: { value: 'decision', label: 'قرار', color: '#7b1fa2' },
  memo: { value: 'memo', label: 'مذكرة', color: '#f57c00' },
  urgent_notice: { value: 'urgent_notice', label: 'إشعار عاجل', color: '#d32f2f' },
  policy_update: { value: 'policy_update', label: 'تحديث سياسة', color: '#0288d1' },
  procedure_change: { value: 'procedure_change', label: 'تغيير إجراء', color: '#455a64' },
};

// ─── Priority Levels ──────────────────────────────────────────
export const DIRECTIVE_PRIORITIES = {
  critical: { value: 'critical', label: 'حرج', color: '#b71c1c', icon: '🔴' },
  urgent: { value: 'urgent', label: 'عاجل', color: '#d32f2f', icon: '🟠' },
  high: { value: 'high', label: 'عالي', color: '#f57c00', icon: '🟡' },
  normal: { value: 'normal', label: 'عادي', color: '#388e3c', icon: '🟢' },
  low: { value: 'low', label: 'منخفض', color: '#9e9e9e', icon: '⚪' },
};

// ─── Directive Status ─────────────────────────────────────────
export const DIRECTIVE_STATUS = {
  draft: { value: 'draft', label: 'مسودة', color: '#9e9e9e' },
  scheduled: { value: 'scheduled', label: 'مجدول', color: '#0288d1' },
  issued: { value: 'issued', label: 'صادر', color: '#388e3c' },
  delivered: { value: 'delivered', label: 'تم التسليم', color: '#1976d2' },
  expired: { value: 'expired', label: 'منتهي الصلاحية', color: '#f57c00' },
  cancelled: { value: 'cancelled', label: 'ملغي', color: '#d32f2f' },
};

// ─── Issuer Types ─────────────────────────────────────────────
export const ISSUER_TYPES = {
  admin: { value: 'admin', label: 'مدير النظام' },
  department_head: { value: 'department_head', label: 'رئيس قسم' },
  manager: { value: 'manager', label: 'مدير' },
  board: { value: 'board', label: 'مجلس الإدارة' },
  system: { value: 'system', label: 'النظام' },
};

// ─── Recipient Types ──────────────────────────────────────────
export const RECIPIENT_TYPES = {
  all: { value: 'all', label: 'الجميع' },
  department: { value: 'department', label: 'قسم' },
  branch: { value: 'branch', label: 'فرع' },
  role: { value: 'role', label: 'دور وظيفي' },
  specific: { value: 'specific', label: 'شخص محدد' },
};

// ─── Action Status ────────────────────────────────────────────
export const ACTION_STATUS = {
  pending: { value: 'pending', label: 'قيد الانتظار', color: '#f57c00' },
  in_progress: { value: 'in_progress', label: 'قيد التنفيذ', color: '#1976d2' },
  completed: { value: 'completed', label: 'مكتمل', color: '#388e3c' },
  overdue: { value: 'overdue', label: 'متأخر', color: '#d32f2f' },
};

// ─── Helper: Options for dropdowns ────────────────────────────
export const typeOptions = Object.values(DIRECTIVE_TYPES);
export const priorityOptions = Object.values(DIRECTIVE_PRIORITIES);
export const statusOptions = Object.values(DIRECTIVE_STATUS);
export const issuerOptions = Object.values(ISSUER_TYPES);
export const recipientTypeOptions = Object.values(RECIPIENT_TYPES);
export const actionStatusOptions = Object.values(ACTION_STATUS);
