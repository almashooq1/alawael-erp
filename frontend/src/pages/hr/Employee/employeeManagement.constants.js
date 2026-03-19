/**
 * Employee Management – Constants
 * Department names, status config, and stat-card factory.
 */

/** Arabic department names */
export const DEPARTMENTS = [
  'تقنية المعلومات',
  'الموارد البشرية',
  'المالية',
  'العمليات',
  'التعليم',
  'العلاج الطبيعي',
  'الإدارة',
  'الخدمات',
];

/** Status key → { label (Arabic), color } */
export const STATUS_MAP = {
  active: { label: 'نشط', color: '#4caf50' },
  inactive: { label: 'غير نشط', color: '#f44336' },
  onLeave: { label: 'في إجازة', color: '#ff9800' },
  probation: { label: 'تحت التجربة', color: '#2196f3' },
};

/**
 * Build stat-card descriptors from computed `stats` object.
 * @param {{ total:number, active:number, onLeave:number, inactive:number, departments:number }} stats
 * @returns {Array<{label:string, value:number, color:string}>}
 */
export const STAT_CARDS = (stats = {}) => [
  { label: 'إجمالي الموظفين', value: stats.total ?? 0, color: '#667eea' },
  { label: 'نشط', value: stats.active ?? 0, color: '#4caf50' },
  { label: 'في إجازة', value: stats.onLeave ?? 0, color: '#ff9800' },
  { label: 'غير نشط', value: stats.inactive ?? 0, color: '#f44336' },
  { label: 'الأقسام', value: stats.departments ?? 0, color: '#2196f3' },
];
