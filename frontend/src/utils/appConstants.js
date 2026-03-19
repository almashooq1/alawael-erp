/**
 * constants — App-wide constants and enumerations.
 * الثوابت العامة للتطبيق
 */

/** User roles */
export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  MANAGER: 'manager',
  SUPERVISOR: 'supervisor',
  DOCTOR: 'doctor',
  THERAPIST: 'therapist',
  NURSE: 'nurse',
  TEACHER: 'teacher',
  RECEPTIONIST: 'receptionist',
  ACCOUNTANT: 'accountant',
  HR: 'hr',
  IT: 'it',
  PARENT: 'parent',
  DRIVER: 'driver',
  STAFF: 'staff',
};

/** Arabic role labels */
export const ROLE_LABELS = {
  [ROLES.SUPER_ADMIN]: 'مدير النظام',
  [ROLES.ADMIN]: 'مدير',
  [ROLES.MANAGER]: 'مدير قسم',
  [ROLES.SUPERVISOR]: 'مشرف',
  [ROLES.DOCTOR]: 'طبيب',
  [ROLES.THERAPIST]: 'معالج',
  [ROLES.NURSE]: 'ممرض',
  [ROLES.TEACHER]: 'معلم',
  [ROLES.RECEPTIONIST]: 'موظف استقبال',
  [ROLES.ACCOUNTANT]: 'محاسب',
  [ROLES.HR]: 'موارد بشرية',
  [ROLES.IT]: 'تقنية المعلومات',
  [ROLES.PARENT]: 'ولي أمر',
  [ROLES.DRIVER]: 'سائق',
  [ROLES.STAFF]: 'موظف',
};

/** Common entity statuses */
export const STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
  IN_PROGRESS: 'in_progress',
  ON_HOLD: 'on_hold',
  OVERDUE: 'overdue',
  EXPIRED: 'expired',
  SUSPENDED: 'suspended',
};

/** Arabic status labels */
export const STATUS_LABELS = {
  [STATUS.ACTIVE]: 'نشط',
  [STATUS.INACTIVE]: 'غير نشط',
  [STATUS.PENDING]: 'قيد الانتظار',
  [STATUS.APPROVED]: 'معتمد',
  [STATUS.REJECTED]: 'مرفوض',
  [STATUS.DRAFT]: 'مسودة',
  [STATUS.PUBLISHED]: 'منشور',
  [STATUS.ARCHIVED]: 'مؤرشف',
  [STATUS.CANCELLED]: 'ملغي',
  [STATUS.COMPLETED]: 'مكتمل',
  [STATUS.IN_PROGRESS]: 'قيد التنفيذ',
  [STATUS.ON_HOLD]: 'معلق',
  [STATUS.OVERDUE]: 'متأخر',
  [STATUS.EXPIRED]: 'منتهي',
  [STATUS.SUSPENDED]: 'موقوف',
};

/** Priority levels */
export const PRIORITY = {
  URGENT: 'urgent',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
};

export const PRIORITY_LABELS = {
  [PRIORITY.URGENT]: 'عاجل',
  [PRIORITY.HIGH]: 'مرتفع',
  [PRIORITY.MEDIUM]: 'متوسط',
  [PRIORITY.LOW]: 'منخفض',
};

/** Gender options */
export const GENDER = { MALE: 'male', FEMALE: 'female' };
export const GENDER_LABELS = { [GENDER.MALE]: 'ذكر', [GENDER.FEMALE]: 'أنثى' };

/** Blood types */
export const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

/** Days of the week — Arabic (Sunday start) */
export const WEEKDAYS = [
  { value: 0, label: 'الأحد' },
  { value: 1, label: 'الإثنين' },
  { value: 2, label: 'الثلاثاء' },
  { value: 3, label: 'الأربعاء' },
  { value: 4, label: 'الخميس' },
  { value: 5, label: 'الجمعة' },
  { value: 6, label: 'السبت' },
];

/** Pagination defaults */
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  LIMIT_OPTIONS: [5, 10, 25, 50, 100],
};

/** Date formats */
export const DATE_FORMATS = {
  DATE: 'YYYY-MM-DD',
  DATE_AR: 'DD/MM/YYYY',
  DATETIME: 'YYYY-MM-DD HH:mm',
  TIME: 'HH:mm',
  TIME_12: 'hh:mm A',
};

/** File upload limits */
export const UPLOAD = {
  MAX_FILES: 10,
  MAX_IMAGE_SIZE: 5 * 1024 * 1024,
  MAX_DOC_SIZE: 20 * 1024 * 1024,
  ALLOWED_IMAGE_EXT: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
  ALLOWED_DOC_EXT: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv'],
};

/** Notification types */
export const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
};

/** Session / Auth */
export const AUTH = {
  TOKEN_KEY: 'token',
  REFRESH_TOKEN_KEY: 'refreshToken',
  USER_KEY: 'user',
  SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes
};

/** Debounce defaults (ms) */
export const DEBOUNCE = {
  SEARCH: 300,
  RESIZE: 150,
  SCROLL: 100,
  API: 500,
};

/** Appointment / Session statuses */
export const APPOINTMENT_STATUS = {
  SCHEDULED: 'scheduled',
  CONFIRMED: 'confirmed',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  NO_SHOW: 'no_show',
  RESCHEDULED: 'rescheduled',
};

export const APPOINTMENT_STATUS_LABELS = {
  [APPOINTMENT_STATUS.SCHEDULED]: 'مجدول',
  [APPOINTMENT_STATUS.CONFIRMED]: 'مؤكد',
  [APPOINTMENT_STATUS.IN_PROGRESS]: 'قيد التنفيذ',
  [APPOINTMENT_STATUS.COMPLETED]: 'مكتمل',
  [APPOINTMENT_STATUS.CANCELLED]: 'ملغي',
  [APPOINTMENT_STATUS.NO_SHOW]: 'لم يحضر',
  [APPOINTMENT_STATUS.RESCHEDULED]: 'معاد جدولته',
};

/** Payment statuses */
export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  PARTIAL: 'partial',
  OVERDUE: 'overdue',
  REFUNDED: 'refunded',
  CANCELLED: 'cancelled',
};

export const PAYMENT_STATUS_LABELS = {
  [PAYMENT_STATUS.PENDING]: 'قيد الانتظار',
  [PAYMENT_STATUS.PAID]: 'مدفوع',
  [PAYMENT_STATUS.PARTIAL]: 'مدفوع جزئياً',
  [PAYMENT_STATUS.OVERDUE]: 'متأخر',
  [PAYMENT_STATUS.REFUNDED]: 'مسترجع',
  [PAYMENT_STATUS.CANCELLED]: 'ملغي',
};

/** Leave / Absence types */
export const LEAVE_TYPES = {
  ANNUAL: 'annual',
  SICK: 'sick',
  EMERGENCY: 'emergency',
  MATERNITY: 'maternity',
  PATERNITY: 'paternity',
  UNPAID: 'unpaid',
  HAJJ: 'hajj',
  BEREAVEMENT: 'bereavement',
};

export const LEAVE_TYPE_LABELS = {
  [LEAVE_TYPES.ANNUAL]: 'إجازة سنوية',
  [LEAVE_TYPES.SICK]: 'إجازة مرضية',
  [LEAVE_TYPES.EMERGENCY]: 'إجازة طارئة',
  [LEAVE_TYPES.MATERNITY]: 'إجازة أمومة',
  [LEAVE_TYPES.PATERNITY]: 'إجازة أبوة',
  [LEAVE_TYPES.UNPAID]: 'إجازة بدون راتب',
  [LEAVE_TYPES.HAJJ]: 'إجازة حج',
  [LEAVE_TYPES.BEREAVEMENT]: 'إجازة وفاة',
};

/** Regex patterns */
export const PATTERNS = {
  SAUDI_ID: /^[12]\d{9}$/,
  SAUDI_PHONE: /^(05\d{8}|9665\d{8}|\+9665\d{8})$/,
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  SAUDI_IBAN: /^SA\d{2}[A-Z0-9]{20}$/i,
  ARABIC_ONLY: /^[\u0600-\u06FF\s\d.,!?؟،؛:()-]+$/,
  VAT_NUMBER: /^3\d{13}3$/,
  CR_NUMBER: /^\d{10}$/,
};

export default {
  ROLES,
  ROLE_LABELS,
  STATUS,
  STATUS_LABELS,
  PRIORITY,
  PRIORITY_LABELS,
  GENDER,
  GENDER_LABELS,
  BLOOD_TYPES,
  WEEKDAYS,
  PAGINATION,
  DATE_FORMATS,
  UPLOAD,
  NOTIFICATION_TYPES,
  AUTH,
  DEBOUNCE,
  APPOINTMENT_STATUS,
  APPOINTMENT_STATUS_LABELS,
  PAYMENT_STATUS,
  PAYMENT_STATUS_LABELS,
  LEAVE_TYPES,
  LEAVE_TYPE_LABELS,
  PATTERNS,
};
