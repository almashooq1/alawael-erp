/**
 * systemAdmin.constants.js — Constants, config, and demo data
 * Extracted from SystemAdmin.js for maintainability
 */
import { statusColors } from '../../theme/palette';

/* ─── Status Colors (MUI chip color prop) ─── */
export const STATUS_COLORS = {
  active: 'success',
  approved: 'success',
  'in-stock': 'success',
  sent: 'success',
  pending: 'warning',
  'low-stock': 'warning',
  draft: 'default',
  rejected: 'error',
  'out-of-stock': 'error',
  expired: 'error',
  completed: 'info',
  published: 'info',
};

/* ─── Column Mapping (per tab) ─── */
export const COL_MAP = {
  inventory: {
    cols: ['name', 'sku', 'category', 'quantity', 'minQuantity', 'location', 'status'],
    headers: ['الصنف', 'الكود', 'الفئة', 'الكمية', 'الحد الأدنى', 'الموقع', 'الحالة'],
  },
  ecommerce: {
    cols: ['name', 'price', 'category', 'stock', 'sales', 'status', 'rating'],
    headers: ['المنتج', 'السعر', 'الفئة', 'المخزون', 'المبيعات', 'الحالة', 'التقييم'],
  },
  templates: {
    cols: ['name', 'category', 'type', 'department', 'status', 'downloads', 'lastModified'],
    headers: ['النموذج', 'الفئة', 'النوع', 'القسم', 'الحالة', 'التحميلات', 'آخر تعديل'],
  },
  approvals: {
    cols: ['title', 'requester', 'type', 'amount', 'priority', 'status', 'submittedDate'],
    headers: ['الطلب', 'مقدم الطلب', 'النوع', 'المبلغ', 'الأولوية', 'الحالة', 'التاريخ'],
  },
  notifications: {
    cols: ['name', 'type', 'trigger', 'recipients', 'status', 'lastSent'],
    headers: ['الإشعار', 'النوع', 'المحفز', 'المستلمون', 'الحالة', 'آخر إرسال'],
  },
  rbac: {
    cols: ['name', 'code', 'users', 'permissions', 'status', 'description'],
    headers: ['الدور', 'الكود', 'المستخدمون', 'الصلاحيات', 'الحالة', 'الوصف'],
  },
  civilDefense: {
    cols: ['item', 'type', 'lastInspection', 'nextInspection', 'location', 'status', 'responsible'],
    headers: ['العنصر', 'النوع', 'آخر فحص', 'الفحص القادم', 'الموقع', 'الحالة', 'المسؤول'],
  },
  qiwa: {
    cols: [
      'employee',
      'qiwaId',
      'contractType',
      'contractStart',
      'contractEnd',
      'status',
      'wageProtection',
    ],
    headers: [
      'الموظف',
      'رقم قوى',
      'نوع العقد',
      'بداية العقد',
      'نهاية العقد',
      'الحالة',
      'حماية الأجور',
    ],
  },
};

/* ─── Form Field Definitions ─── */
export const FIELD_SETS = {
  inventory: [
    { key: 'name', label: 'الصنف' },
    { key: 'sku', label: 'الكود' },
    { key: 'category', label: 'الفئة' },
    { key: 'quantity', label: 'الكمية', type: 'number' },
    { key: 'minQuantity', label: 'الحد الأدنى', type: 'number' },
    { key: 'unit', label: 'الوحدة' },
    { key: 'location', label: 'الموقع' },
  ],
  ecommerce: [
    { key: 'name', label: 'المنتج' },
    { key: 'price', label: 'السعر' },
    { key: 'category', label: 'الفئة' },
    { key: 'stock', label: 'المخزون', type: 'number' },
  ],
  templates: [
    { key: 'name', label: 'النموذج' },
    { key: 'category', label: 'الفئة' },
    { key: 'type', label: 'النوع' },
    { key: 'department', label: 'القسم' },
  ],
  approvals: [
    { key: 'title', label: 'الطلب' },
    { key: 'requester', label: 'مقدم الطلب' },
    { key: 'type', label: 'النوع' },
    { key: 'amount', label: 'المبلغ' },
    { key: 'priority', label: 'الأولوية' },
  ],
  notifications: [
    { key: 'name', label: 'الإشعار' },
    { key: 'type', label: 'النوع' },
    { key: 'trigger', label: 'المحفز' },
    { key: 'recipients', label: 'المستلمون' },
  ],
  rbac: [
    { key: 'name', label: 'الدور' },
    { key: 'code', label: 'الكود' },
    { key: 'description', label: 'الوصف' },
  ],
  civilDefense: [
    { key: 'item', label: 'العنصر' },
    { key: 'type', label: 'النوع' },
    { key: 'location', label: 'الموقع' },
    { key: 'responsible', label: 'المسؤول' },
    { key: 'lastInspection', label: 'آخر فحص', type: 'date' },
    { key: 'nextInspection', label: 'الفحص القادم', type: 'date' },
  ],
  qiwa: [
    { key: 'employee', label: 'الموظف' },
    { key: 'qiwaId', label: 'رقم قوى' },
    { key: 'contractType', label: 'نوع العقد' },
    { key: 'contractStart', label: 'بداية العقد', type: 'date' },
    { key: 'contractEnd', label: 'نهاية العقد', type: 'date' },
  ],
};

/* ─── Computed Stats Factory ─── */
export const getStats = data => [
  {
    label: 'أصناف المخزون',
    value: (Array.isArray(data.inventory) ? data.inventory : []).length,
    color: statusColors.success,
  },
  {
    label: 'نفاد المخزون',
    value: (Array.isArray(data.inventory) ? data.inventory : []).filter(
      i => i.status === 'out-of-stock' || i.status === 'low-stock'
    ).length,
    color: statusColors.error,
  },
  {
    label: 'طلبات معلقة',
    value: (Array.isArray(data.approvals) ? data.approvals : []).filter(a => a.status === 'pending')
      .length,
    color: statusColors.warning,
  },
  {
    label: 'الأدوار',
    value: (Array.isArray(data.rbac) ? data.rbac : []).length,
    color: statusColors.info,
  },
];
