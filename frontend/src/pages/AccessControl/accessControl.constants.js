/**
 * Access Control Dashboard — ثوابت لوحة تحكم الصلاحيات والوصول
 */

// ─── TAB IDENTIFIERS ─────────────────────────────────────────────────────────
export const TABS = {
  OVERVIEW: 0,
  ROLES: 1,
  MATRIX: 2,
  USERS: 3,
  AUDIT: 4,
  INSIGHTS: 5,
};

// ─── SYSTEM ROLES (flat, ordered by privilege level desc) ────────────────────
export const SYSTEM_ROLES = [
  { value: 'super_admin', label: 'مدير النظام', level: 0, color: '#b71c1c', icon: 'SuperAdmin' },
  { value: 'head_office_admin', label: 'مدير المقر', level: 0, color: '#c62828', icon: 'Admin' },
  { value: 'ceo', label: 'الرئيس التنفيذي', level: 0, color: '#ad1457', icon: 'CEO' },
  { value: 'it_admin', label: 'مدير تقنية المعلومات', level: 0, color: '#4527a0', icon: 'IT' },
  {
    value: 'compliance_officer',
    label: 'مسؤول الامتثال',
    level: 0,
    color: '#283593',
    icon: 'Compliance',
  },
  { value: 'regional_director', label: 'مدير إقليمي', level: 1, color: '#1565c0', icon: 'Region' },
  { value: 'admin', label: 'مدير', level: 2, color: '#1976d2', icon: 'Admin' },
  { value: 'branch_manager', label: 'مدير الفرع', level: 2, color: '#0277bd', icon: 'Branch' },
  { value: 'clinical_director', label: 'مدير سريري', level: 2, color: '#00838f', icon: 'Clinical' },
  { value: 'supervisor', label: 'مشرف', level: 3, color: '#2e7d32', icon: 'Supervisor' },
  { value: 'hr_manager', label: 'مدير الموارد البشرية', level: 3, color: '#558b2f', icon: 'HR' },
  { value: 'doctor', label: 'طبيب', level: 4, color: '#0097a7', icon: 'Doctor' },
  { value: 'therapist', label: 'معالج', level: 4, color: '#00796b', icon: 'Therapist' },
  { value: 'teacher', label: 'معلم', level: 4, color: '#f57c00', icon: 'Teacher' },
  { value: 'hr', label: 'موارد بشرية', level: 5, color: '#6a1b9a', icon: 'HR' },
  { value: 'accountant', label: 'محاسب', level: 5, color: '#4e342e', icon: 'Finance' },
  { value: 'receptionist', label: 'موظف استقبال', level: 5, color: '#37474f', icon: 'Reception' },
  { value: 'data_entry', label: 'مدخل بيانات', level: 5, color: '#455a64', icon: 'Data' },
  { value: 'parent', label: 'ولي أمر', level: 6, color: '#5d4037', icon: 'Parent' },
  { value: 'viewer', label: 'مشاهد', level: 6, color: '#78909c', icon: 'Viewer' },
  { value: 'user', label: 'مستخدم', level: 6, color: '#546e7a', icon: 'User' },
  { value: 'guest', label: 'زائر', level: 6, color: '#90a4ae', icon: 'Guest' },
];

// ─── PERMISSION MODULES ───────────────────────────────────────────────────────
export const PERMISSION_MODULES = [
  {
    key: 'users',
    label: 'إدارة المستخدمين',
    icon: 'People',
    color: '#1976d2',
    permissions: [
      { key: 'users.view', label: 'عرض', risk: 'low' },
      { key: 'users.create', label: 'إنشاء', risk: 'medium' },
      { key: 'users.edit', label: 'تعديل', risk: 'medium' },
      { key: 'users.delete', label: 'حذف', risk: 'high' },
      { key: 'users.permissions', label: 'صلاحيات', risk: 'critical' },
      { key: 'users.export', label: 'تصدير', risk: 'medium' },
    ],
  },
  {
    key: 'finance',
    label: 'المالية',
    icon: 'AccountBalance',
    color: '#2e7d32',
    permissions: [
      { key: 'finance.view', label: 'عرض', risk: 'low' },
      { key: 'finance.create', label: 'إنشاء', risk: 'medium' },
      { key: 'finance.edit', label: 'تعديل', risk: 'medium' },
      { key: 'finance.delete', label: 'حذف', risk: 'high' },
      { key: 'finance.approve', label: 'اعتماد', risk: 'high' },
      { key: 'finance.reports', label: 'تقارير', risk: 'medium' },
    ],
  },
  {
    key: 'hr',
    label: 'الموارد البشرية',
    icon: 'BadgeOutlined',
    color: '#7b1fa2',
    permissions: [
      { key: 'hr.view', label: 'عرض', risk: 'low' },
      { key: 'hr.create', label: 'إنشاء', risk: 'medium' },
      { key: 'hr.edit', label: 'تعديل', risk: 'medium' },
      { key: 'hr.delete', label: 'حذف', risk: 'high' },
      { key: 'hr.payroll', label: 'رواتب', risk: 'critical' },
      { key: 'hr.attendance', label: 'حضور', risk: 'low' },
    ],
  },
  {
    key: 'clinic',
    label: 'العيادة والعلاج',
    icon: 'LocalHospital',
    color: '#0097a7',
    permissions: [
      { key: 'clinic.view', label: 'عرض', risk: 'low' },
      { key: 'clinic.create', label: 'إنشاء', risk: 'medium' },
      { key: 'clinic.edit', label: 'تعديل', risk: 'medium' },
      { key: 'clinic.sessions', label: 'جلسات', risk: 'medium' },
      { key: 'clinic.reports', label: 'تقارير', risk: 'low' },
    ],
  },
  {
    key: 'education',
    label: 'التعليم',
    icon: 'School',
    color: '#f57c00',
    permissions: [
      { key: 'education.view', label: 'عرض', risk: 'low' },
      { key: 'education.create', label: 'إنشاء', risk: 'medium' },
      { key: 'education.edit', label: 'تعديل', risk: 'medium' },
      { key: 'education.grades', label: 'درجات', risk: 'medium' },
      { key: 'education.reports', label: 'تقارير', risk: 'low' },
    ],
  },
  {
    key: 'reports',
    label: 'التقارير',
    icon: 'Assessment',
    color: '#00695c',
    permissions: [
      { key: 'reports.view', label: 'عرض', risk: 'low' },
      { key: 'reports.create', label: 'إنشاء', risk: 'medium' },
      { key: 'reports.export', label: 'تصدير', risk: 'medium' },
      { key: 'reports.advanced', label: 'متقدمة', risk: 'high' },
    ],
  },
  {
    key: 'settings',
    label: 'الإعدادات',
    icon: 'Settings',
    color: '#455a64',
    permissions: [
      { key: 'settings.view', label: 'عرض', risk: 'low' },
      { key: 'settings.edit', label: 'تعديل', risk: 'critical' },
      { key: 'settings.system', label: 'النظام', risk: 'critical' },
    ],
  },
  {
    key: 'audit',
    label: 'سجل التدقيق',
    icon: 'HistoryEdu',
    color: '#37474f',
    permissions: [
      { key: 'audit.view', label: 'عرض', risk: 'medium' },
      { key: 'audit.export', label: 'تصدير', risk: 'medium' },
    ],
  },
];

// ─── ALL PERMISSIONS FLAT ─────────────────────────────────────────────────────
export const ALL_PERMISSIONS = PERMISSION_MODULES.flatMap(m =>
  m.permissions.map(p => ({ ...p, module: m.key, moduleLabel: m.label, moduleColor: m.color }))
);

// ─── RISK COLORS ──────────────────────────────────────────────────────────────
export const RISK_CONFIG = {
  low: { label: 'منخفضة', color: '#43a047', bg: '#e8f5e9' },
  medium: { label: 'متوسطة', color: '#fb8c00', bg: '#fff3e0' },
  high: { label: 'عالية', color: '#e53935', bg: '#ffebee' },
  critical: { label: 'حرجة', color: '#b71c1c', bg: '#fce4ec' },
};

// ─── DEFAULT ROLE PERMISSIONS MAP ─────────────────────────────────────────────
// Maps role → set of permission keys (baseline defaults)
export const DEFAULT_ROLE_PERMISSIONS = {
  super_admin: ALL_PERMISSIONS.map(p => p.key),
  admin: ALL_PERMISSIONS.filter(p => !['settings.system'].includes(p.key)).map(p => p.key),
  manager: [
    'users.view',
    'users.create',
    'users.edit',
    'finance.view',
    'finance.create',
    'finance.edit',
    'finance.reports',
    'hr.view',
    'hr.create',
    'hr.edit',
    'hr.attendance',
    'clinic.view',
    'clinic.create',
    'clinic.edit',
    'clinic.sessions',
    'clinic.reports',
    'education.view',
    'education.create',
    'education.edit',
    'education.grades',
    'education.reports',
    'reports.view',
    'reports.create',
    'reports.export',
    'audit.view',
  ],
  supervisor: [
    'users.view',
    'hr.view',
    'hr.attendance',
    'clinic.view',
    'clinic.sessions',
    'clinic.reports',
    'education.view',
    'education.grades',
    'education.reports',
    'reports.view',
  ],
  hr_manager: [
    'users.view',
    'users.create',
    'users.edit',
    'hr.view',
    'hr.create',
    'hr.edit',
    'hr.delete',
    'hr.payroll',
    'hr.attendance',
    'reports.view',
    'reports.create',
    'reports.export',
    'audit.view',
  ],
  therapist: [
    'clinic.view',
    'clinic.create',
    'clinic.edit',
    'clinic.sessions',
    'clinic.reports',
    'reports.view',
  ],
  doctor: [
    'clinic.view',
    'clinic.create',
    'clinic.edit',
    'clinic.sessions',
    'clinic.reports',
    'reports.view',
    'reports.create',
  ],
  teacher: [
    'education.view',
    'education.create',
    'education.edit',
    'education.grades',
    'education.reports',
    'reports.view',
  ],
  hr: ['users.view', 'hr.view', 'hr.create', 'hr.edit', 'hr.attendance', 'reports.view'],
  accountant: [
    'finance.view',
    'finance.create',
    'finance.edit',
    'finance.reports',
    'reports.view',
    'reports.create',
    'reports.export',
  ],
  receptionist: ['clinic.view', 'education.view', 'reports.view'],
  data_entry: ['clinic.view', 'education.view', 'hr.view', 'finance.view'],
  viewer: ALL_PERMISSIONS.filter(p => p.key.endsWith('.view')).map(p => p.key),
  parent: ['education.view', 'clinic.view'],
  user: ['clinic.view', 'education.view'],
  guest: [],
};

// ─── AUDIT ACTION LABELS ──────────────────────────────────────────────────────
export const AUDIT_ACTIONS = {
  permission_granted: { label: 'منح صلاحية', color: 'success', icon: 'Add' },
  permission_revoked: { label: 'سحب صلاحية', color: 'error', icon: 'Remove' },
  role_assigned: { label: 'تعيين دور', color: 'info', icon: 'PersonAdd' },
  role_removed: { label: 'إزالة دور', color: 'warning', icon: 'PersonRemove' },
  role_created: { label: 'إنشاء دور جديد', color: 'success', icon: 'CreateNewFolder' },
  role_updated: { label: 'تعديل دور', color: 'info', icon: 'Edit' },
  role_deleted: { label: 'حذف دور', color: 'error', icon: 'Delete' },
  user_locked: { label: 'قفل حساب', color: 'error', icon: 'Lock' },
  user_unlocked: { label: 'فتح حساب', color: 'success', icon: 'LockOpen' },
  mfa_enabled: { label: 'تفعيل MFA', color: 'success', icon: 'Security' },
  mfa_disabled: { label: 'تعطيل MFA', color: 'warning', icon: 'SecurityOff' },
};

// ─── SECURITY SCORE THRESHOLDS ────────────────────────────────────────────────
export const SECURITY_SCORE = {
  excellent: { min: 85, label: 'ممتاز', color: '#43a047' },
  good: { min: 70, label: 'جيد', color: '#00acc1' },
  fair: { min: 50, label: 'مقبول', color: '#fb8c00' },
  poor: { min: 0, label: 'ضعيف', color: '#e53935' },
};

export const getSecurityScoreConfig = score => {
  if (score >= SECURITY_SCORE.excellent.min) return SECURITY_SCORE.excellent;
  if (score >= SECURITY_SCORE.good.min) return SECURITY_SCORE.good;
  if (score >= SECURITY_SCORE.fair.min) return SECURITY_SCORE.fair;
  return SECURITY_SCORE.poor;
};

export const getRoleConfig = roleValue =>
  SYSTEM_ROLES.find(r => r.value === roleValue) || {
    label: roleValue,
    color: '#78909c',
    level: 6,
  };
