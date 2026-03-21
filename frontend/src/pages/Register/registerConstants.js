/**
 * Register Page — Constants & Utility Functions
 */
import { gradients, statusColors, assessmentColors, surfaceColors } from 'theme/palette';

// ─── Password Strength Logic ─────────────────────────
export const getPasswordStrength = password => {
  if (!password) return { score: 0, label: '', color: surfaceColors.divider };
  let score = 0;
  if (password.length >= 6) score += 1;
  if (password.length >= 10) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;

  const levels = [
    { score: 0, label: '', color: surfaceColors.divider },
    { score: 1, label: 'ضعيفة جداً', color: statusColors.error },
    { score: 2, label: 'ضعيفة', color: statusColors.warning },
    { score: 3, label: 'متوسطة', color: '#ffeb3b' },
    { score: 4, label: 'قوية', color: statusColors.success },
    { score: 5, label: 'قوية جداً', color: assessmentColors.normal },
  ];
  return levels[score] || levels[0];
};

// ─── Steps Config ─────────────────────────────────
export const STEPS = ['البيانات الأساسية', 'كلمة المرور', 'نوع الحساب'];

export const ROLES = [
  {
    value: 'student',
    label: 'طالب / مستفيد',
    description: 'الوصول إلى بوابة الطالب والجدول والدرجات',
    icon: <School sx={{ fontSize: 40 }} />,
    gradient: gradients.info,
  },
  {
    value: 'guardian',
    label: 'ولي أمر',
    description: 'متابعة تقدم الأبناء والتواصل مع المركز',
    icon: <SupervisorAccount sx={{ fontSize: 40 }} />,
    gradient: gradients.success,
  },
  {
    value: 'staff',
    label: 'موظف / أخصائي',
    description: 'إدارة الجلسات والتقارير والبرامج التأهيلية',
    icon: <AdminPanelSettings sx={{ fontSize: 40 }} />,
    gradient: gradients.warning,
  },
];
