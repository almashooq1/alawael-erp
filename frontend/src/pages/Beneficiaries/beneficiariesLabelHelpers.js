/**
 * تسميات جدول المستفيدين
 * Beneficiaries Label Helpers
 *
 * W0-LifecycleAlign: دعم جميع حالات دورة الحياة الموحدة
 * (beneficiary-lifecycle.registry.js) مع الحالات القديمة للتوافق.
 */

export const STATUS_LABELS = Object.freeze({
  // Canonical lifecycle states
  draft: 'مسودة',
  waitlisted: 'قائمة الانتظار',
  active: 'نشط',
  suspended: 'معلق',
  'transferred-pending': 'نقل قيد التنفيذ',
  transferred: 'محوّل',
  discharged: 'متخرج',
  deceased: 'متوفى',
  archived: 'مؤرشف',
  'deletion-pending': 'حذف قيد المراجعة',
  deleted: 'محذوف',
  // Legacy aliases (until data migration)
  inactive: 'غير نشط',
  pending: 'قيد الانتظار',
  graduated: 'متخرج',
});

export const STATUS_COLORS = Object.freeze({
  draft: '#9e9e9e',
  waitlisted: '#ff9800',
  active: '#4caf50',
  suspended: '#f44336',
  'transferred-pending': '#2196f3',
  transferred: '#03a9f4',
  discharged: '#8bc34a',
  deceased: '#000000',
  archived: '#795548',
  'deletion-pending': '#e91e63',
  deleted: '#424242',
  inactive: '#757575',
  pending: '#ff9800',
  graduated: '#8bc34a',
});

export const getStatusLabel = status => {
  if (!status) return '-';
  return STATUS_LABELS[status] || status;
};

export const getStatusColor = status => {
  if (!status) return '#9e9e9e';
  return STATUS_COLORS[status] || '#9e9e9e';
};

export const getCategoryLabel = category => {
  switch (category) {
    case 'physical':
      return 'إعاقة حركية';
    case 'mental':
      return 'إعاقة ذهنية';
    case 'sensory':
      return 'إعاقة حسية';
    case 'multiple':
      return 'إعاقات متعددة';
    default:
      return category;
  }
};

export default {
  getStatusLabel,
  getStatusColor,
  getCategoryLabel,
  STATUS_LABELS,
  STATUS_COLORS,
};
