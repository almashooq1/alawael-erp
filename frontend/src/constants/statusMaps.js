/**
 * statusMaps — Comprehensive status/color/icon maps for all modules.
 * خرائط الحالات والألوان والأيقونات لجميع الوحدات
 */

/**
 * @typedef {object} StatusConfig
 * @property {string} label   — Arabic label
 * @property {string} color   — MUI color or hex
 * @property {string} icon    — MUI icon name
 * @property {string} bg      — Background hex
 */

/** General entity statuses */
export const GENERAL_STATUS_MAP = {
  active: { label: 'نشط', color: 'success', icon: 'CheckCircle', bg: '#e8f5e9' },
  inactive: { label: 'غير نشط', color: 'default', icon: 'Cancel', bg: '#f5f5f5' },
  pending: { label: 'قيد الانتظار', color: 'warning', icon: 'HourglassEmpty', bg: '#fff3e0' },
  approved: { label: 'معتمد', color: 'success', icon: 'Verified', bg: '#e8f5e9' },
  rejected: { label: 'مرفوض', color: 'error', icon: 'Block', bg: '#ffebee' },
  draft: { label: 'مسودة', color: 'info', icon: 'Edit', bg: '#e3f2fd' },
  published: { label: 'منشور', color: 'primary', icon: 'Public', bg: '#e8eaf6' },
  archived: { label: 'مؤرشف', color: 'default', icon: 'Archive', bg: '#f5f5f5' },
  cancelled: { label: 'ملغي', color: 'error', icon: 'DoNotDisturb', bg: '#ffebee' },
  completed: { label: 'مكتمل', color: 'success', icon: 'TaskAlt', bg: '#e8f5e9' },
  in_progress: { label: 'قيد التنفيذ', color: 'info', icon: 'Autorenew', bg: '#e3f2fd' },
  on_hold: { label: 'معلق', color: 'warning', icon: 'PauseCircle', bg: '#fff3e0' },
  overdue: { label: 'متأخر', color: 'error', icon: 'Warning', bg: '#ffebee' },
  expired: { label: 'منتهي', color: 'default', icon: 'EventBusy', bg: '#f5f5f5' },
  suspended: { label: 'موقوف', color: 'error', icon: 'RemoveCircle', bg: '#ffebee' },
};

/** Appointment / Session statuses */
export const APPOINTMENT_STATUS_MAP = {
  scheduled: { label: 'مجدول', color: 'info', icon: 'Schedule', bg: '#e3f2fd' },
  confirmed: { label: 'مؤكد', color: 'primary', icon: 'EventAvailable', bg: '#e8eaf6' },
  in_progress: { label: 'قيد التنفيذ', color: 'warning', icon: 'PlayCircle', bg: '#fff3e0' },
  completed: { label: 'مكتمل', color: 'success', icon: 'CheckCircle', bg: '#e8f5e9' },
  cancelled: { label: 'ملغي', color: 'error', icon: 'EventBusy', bg: '#ffebee' },
  no_show: { label: 'لم يحضر', color: 'error', icon: 'PersonOff', bg: '#ffebee' },
  rescheduled: { label: 'معاد جدولته', color: 'info', icon: 'Update', bg: '#e3f2fd' },
};

/** Payment statuses */
export const PAYMENT_STATUS_MAP = {
  pending: { label: 'قيد الانتظار', color: 'warning', icon: 'HourglassTop', bg: '#fff3e0' },
  paid: { label: 'مدفوع', color: 'success', icon: 'Paid', bg: '#e8f5e9' },
  partial: { label: 'مدفوع جزئياً', color: 'info', icon: 'PieChart', bg: '#e3f2fd' },
  overdue: { label: 'متأخر', color: 'error', icon: 'Warning', bg: '#ffebee' },
  refunded: { label: 'مسترجع', color: 'default', icon: 'Replay', bg: '#f5f5f5' },
  cancelled: { label: 'ملغي', color: 'error', icon: 'Cancel', bg: '#ffebee' },
};

/** Leave / Absence statuses */
export const LEAVE_STATUS_MAP = {
  pending: { label: 'قيد المراجعة', color: 'warning', icon: 'HourglassEmpty', bg: '#fff3e0' },
  approved: { label: 'موافق عليها', color: 'success', icon: 'ThumbUp', bg: '#e8f5e9' },
  rejected: { label: 'مرفوضة', color: 'error', icon: 'ThumbDown', bg: '#ffebee' },
  cancelled: { label: 'ملغية', color: 'default', icon: 'Cancel', bg: '#f5f5f5' },
};

/** Attendance statuses */
export const ATTENDANCE_STATUS_MAP = {
  present: { label: 'حاضر', color: 'success', icon: 'CheckCircle', bg: '#e8f5e9' },
  absent: { label: 'غائب', color: 'error', icon: 'Cancel', bg: '#ffebee' },
  late: { label: 'متأخر', color: 'warning', icon: 'Schedule', bg: '#fff3e0' },
  excused: { label: 'مستأذن', color: 'info', icon: 'Info', bg: '#e3f2fd' },
  on_leave: { label: 'في إجازة', color: 'default', icon: 'BeachAccess', bg: '#f5f5f5' },
};

/** Invoice statuses */
export const INVOICE_STATUS_MAP = {
  draft: { label: 'مسودة', color: 'default', icon: 'Edit', bg: '#f5f5f5' },
  sent: { label: 'مرسلة', color: 'info', icon: 'Send', bg: '#e3f2fd' },
  paid: { label: 'مدفوعة', color: 'success', icon: 'Paid', bg: '#e8f5e9' },
  overdue: { label: 'متأخرة', color: 'error', icon: 'Warning', bg: '#ffebee' },
  cancelled: { label: 'ملغية', color: 'error', icon: 'Cancel', bg: '#ffebee' },
  partial: { label: 'مدفوعة جزئياً', color: 'warning', icon: 'PieChart', bg: '#fff3e0' },
};

/** Ticket / Support statuses */
export const TICKET_STATUS_MAP = {
  open: { label: 'مفتوحة', color: 'info', icon: 'FiberNew', bg: '#e3f2fd' },
  in_progress: { label: 'قيد المعالجة', color: 'warning', icon: 'Autorenew', bg: '#fff3e0' },
  resolved: { label: 'محلولة', color: 'success', icon: 'DoneAll', bg: '#e8f5e9' },
  closed: { label: 'مغلقة', color: 'default', icon: 'Lock', bg: '#f5f5f5' },
  reopened: { label: 'معاد فتحها', color: 'error', icon: 'Replay', bg: '#ffebee' },
};

/** Priority map */
export const PRIORITY_MAP = {
  urgent: { label: 'عاجل', color: 'error', icon: 'PriorityHigh', bg: '#ffebee' },
  high: { label: 'مرتفع', color: 'warning', icon: 'ArrowUpward', bg: '#fff3e0' },
  medium: { label: 'متوسط', color: 'info', icon: 'Remove', bg: '#e3f2fd' },
  low: { label: 'منخفض', color: 'success', icon: 'ArrowDownward', bg: '#e8f5e9' },
};

/** Inventory / Stock statuses */
export const STOCK_STATUS_MAP = {
  in_stock: { label: 'متوفر', color: 'success', icon: 'Inventory2', bg: '#e8f5e9' },
  low_stock: { label: 'مخزون منخفض', color: 'warning', icon: 'Warning', bg: '#fff3e0' },
  out_of_stock: { label: 'نفد المخزون', color: 'error', icon: 'RemoveShoppingCart', bg: '#ffebee' },
  ordered: { label: 'تم الطلب', color: 'info', icon: 'LocalShipping', bg: '#e3f2fd' },
};

/**
 * Get status config from any map.
 * Falls back to GENERAL_STATUS_MAP, then returns a neutral default.
 * @param {string} status
 * @param {object} [statusMap]
 * @returns {StatusConfig}
 */
export const getStatusConfig = (status, statusMap) => {
  if (statusMap && statusMap[status]) return statusMap[status];
  if (GENERAL_STATUS_MAP[status]) return GENERAL_STATUS_MAP[status];
  return { label: status || 'غير محدد', color: 'default', icon: 'Help', bg: '#f5f5f5' };
};

export default {
  GENERAL_STATUS_MAP,
  APPOINTMENT_STATUS_MAP,
  PAYMENT_STATUS_MAP,
  LEAVE_STATUS_MAP,
  ATTENDANCE_STATUS_MAP,
  INVOICE_STATUS_MAP,
  TICKET_STATUS_MAP,
  PRIORITY_MAP,
  STOCK_STATUS_MAP,
  getStatusConfig,
};
