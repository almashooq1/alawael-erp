/**
 * User Management Constants — ثوابت نظام إدارة المستخدمين
 */

export const ROLE_OPTIONS = [
  { value: 'super_admin', label: 'مدير النظام', color: '#d32f2f' },
  { value: 'admin', label: 'مدير', color: '#e53935' },
  { value: 'manager', label: 'مدير إداري', color: '#7b1fa2' },
  { value: 'supervisor', label: 'مشرف', color: '#512da8' },
  { value: 'hr', label: 'موارد بشرية', color: '#1565c0' },
  { value: 'hr_manager', label: 'مدير موارد بشرية', color: '#0d47a1' },
  { value: 'accountant', label: 'محاسب', color: '#00695c' },
  { value: 'finance', label: 'مالية', color: '#2e7d32' },
  { value: 'doctor', label: 'طبيب', color: '#1976d2' },
  { value: 'therapist', label: 'معالج', color: '#0097a7' },
  { value: 'teacher', label: 'معلم', color: '#f57c00' },
  { value: 'receptionist', label: 'استقبال', color: '#5d4037' },
  { value: 'data_entry', label: 'إدخال بيانات', color: '#455a64' },
  { value: 'parent', label: 'ولي أمر', color: '#6a1b9a' },
  { value: 'student', label: 'طالب', color: '#00838f' },
  { value: 'viewer', label: 'مشاهد', color: '#78909c' },
  { value: 'user', label: 'مستخدم', color: '#546e7a' },
  { value: 'guest', label: 'زائر', color: '#90a4ae' },
];

export const STATUS_OPTIONS = [
  { value: 'all', label: 'الكل' },
  { value: 'true', label: 'نشط', color: 'success' },
  { value: 'false', label: 'معطل', color: 'error' },
];

export const SORT_OPTIONS = [
  { value: 'createdAt', label: 'تاريخ الإنشاء' },
  { value: 'fullName', label: 'الاسم' },
  { value: 'lastLogin', label: 'آخر تسجيل دخول' },
  { value: 'role', label: 'الدور' },
];

export const BULK_ACTIONS = [
  { value: 'activate', label: 'تفعيل المحددين', icon: 'CheckCircle', color: 'success' },
  { value: 'deactivate', label: 'تعطيل المحددين', icon: 'Block', color: 'error' },
  {
    value: 'reset-password',
    label: 'إعادة تعيين كلمة المرور',
    icon: 'LockReset',
    color: 'warning',
  },
  { value: 'unlock', label: 'فك قفل الحسابات', icon: 'LockOpen', color: 'info' },
  { value: 'change-role', label: 'تغيير الدور', icon: 'ManageAccounts', color: 'primary' },
];

export const EXPORT_COLUMNS = [
  { key: 'fullName', label: 'الاسم الكامل', width: 20 },
  { key: 'username', label: 'اسم المستخدم', width: 15 },
  { key: 'email', label: 'البريد الإلكتروني', width: 25 },
  { key: 'phone', label: 'الهاتف', width: 15 },
  { key: 'roleLabel', label: 'الدور', width: 12 },
  { key: 'statusLabel', label: 'الحالة', width: 10 },
  { key: 'createdAt', label: 'تاريخ الإنشاء', width: 15 },
  { key: 'lastLogin', label: 'آخر تسجيل دخول', width: 15 },
];

export const INITIAL_FORM = {
  fullName: '',
  username: '',
  email: '',
  phone: '',
  password: '',
  role: 'user',
  branch: '',
  isActive: true,
  requirePasswordChange: false,
  notifyByEmail: false,
  customPermissions: [],
  deniedPermissions: [],
};

export const getRoleColor = role => {
  const found = ROLE_OPTIONS.find(r => r.value === role);
  return found?.color || '#546e7a';
};

export const getRoleLabel = role => {
  const found = ROLE_OPTIONS.find(r => r.value === role);
  return found?.label || role;
};
