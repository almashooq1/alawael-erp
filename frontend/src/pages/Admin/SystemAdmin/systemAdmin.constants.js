/**
 * SystemAdmin Constants & Helpers
 * ================================
 * Stats generator for the 8 system-admin tabs.
 */

const TAB_META = {
  inventory: { label: 'المخزون', color: '#1976d2' },
  ecommerce: { label: 'المتجر الإلكتروني', color: '#9c27b0' },
  templates: { label: 'النماذج', color: '#ed6c02' },
  approvals: { label: 'الموافقات', color: '#2e7d32' },
  notifications: { label: 'الإشعارات', color: '#d32f2f' },
  rbac: { label: 'الأدوار والصلاحيات', color: '#0288d1' },
  civilDefense: { label: 'الدفاع المدني', color: '#c62828' },
  qiwa: { label: 'منصة قوى', color: '#00695c' },
};

/**
 * Build an array of stat cards from the current data object.
 *
 * @param {Record<string, any[]>} data – keyed by tab key, value is array of rows
 * @returns {{ label: string, value: number, color: string }[]}
 */
export const getStats = (data = {}) =>
  Object.entries(TAB_META).map(([key, { label, color }]) => ({
    label,
    value: Array.isArray(data[key]) ? data[key].length : 0,
    color,
  }));

export { TAB_META };
