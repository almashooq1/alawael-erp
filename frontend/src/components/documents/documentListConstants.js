/**
 * Document List Constants
 * ثوابت قائمة المستندات — متزامنة مع الخادم
 */

export const CATEGORIES = [
  'الكل',
  'تقارير',
  'عقود',
  'سياسات',
  'تدريب',
  'مالي',
  'شهادات',
  'مراسلات',
  'أخرى',
];

export const DEFAULT_VISIBLE_COLS = {
  type: true,
  title: true,
  category: true,
  size: true,
  date: true,
  status: true,
  actions: true,
};

export const COLUMN_DEFINITIONS = [
  { key: 'type', label: 'النوع' },
  { key: 'title', label: 'العنوان' },
  { key: 'category', label: 'الفئة' },
  { key: 'size', label: 'الحجم' },
  { key: 'date', label: 'التاريخ' },
  { key: 'status', label: 'الحالة' },
  { key: 'actions', label: 'الإجراءات' },
];

const CATEGORY_COLORS = {
  تقارير: 'info',
  عقود: 'warning',
  سياسات: 'success',
  تدريب: 'primary',
  مالي: 'error',
  شهادات: 'secondary',
  مراسلات: 'info',
  أخرى: 'default',
};

export const getCategoryColor = category => CATEGORY_COLORS[category] || 'default';
