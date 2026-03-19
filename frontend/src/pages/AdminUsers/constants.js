/**
 * Export column definitions & constants for AdminUsers
 * ثوابت وتعريفات أعمدة التصدير لإدارة المستخدمين
 */

export const EXPORT_COLUMNS = [
  { key: 'name', label: 'الاسم', width: 20 },
  { key: 'email', label: 'البريد الإلكتروني', width: 25 },
  { key: 'phone', label: 'الهاتف', width: 15 },
  { key: 'role', label: 'الدور', width: 10 },
  { key: 'status', label: 'الحالة', width: 10 },
  { key: 'createdAt', label: 'تاريخ الإنشاء', width: 15 },
];

export const INITIAL_FORM = {
  name: '',
  email: '',
  phone: '',
  role: 'طالب',
  status: 'قيد الانتظار',
};
