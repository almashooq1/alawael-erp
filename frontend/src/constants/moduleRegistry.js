/**
 * moduleRegistry — Module metadata for sidebar, navigation, and permission checks.
 * سجل الوحدات — بيانات وصفية للقائمة الجانبية والتنقل والصلاحيات
 */

/**
 * @typedef {object} ModuleEntry
 * @property {string} key          — Unique module identifier
 * @property {string} nameAr       — Arabic display name
 * @property {string} nameEn       — English display name
 * @property {string} icon         — MUI icon name
 * @property {string} path         — Base route path
 * @property {string} resource     — Permission resource key
 * @property {string[]} roles      — Allowed roles (empty = all)
 * @property {string} [color]      — Theme accent color
 * @property {string} [description] — Short Arabic description
 */

/** @type {ModuleEntry[]} */
export const MODULE_REGISTRY = [
  // ─── Core ──────────────────────────────────
  {
    key: 'home',
    nameAr: 'الرئيسية',
    nameEn: 'Home',
    icon: 'Home',
    path: '/home',
    resource: 'dashboard',
    roles: [],
    color: '#667eea',
  },
  {
    key: 'dashboard',
    nameAr: 'لوحة المعلومات',
    nameEn: 'Dashboard',
    icon: 'Dashboard',
    path: '/dashboard',
    resource: 'dashboard',
    roles: [],
    color: '#667eea',
  },
  {
    key: 'executive-dashboard',
    nameAr: 'لوحة المدير التنفيذي',
    nameEn: 'Executive Dashboard',
    icon: 'Assessment',
    path: '/executive-dashboard',
    resource: 'dashboard',
    roles: ['admin', 'super_admin', 'manager'],
    color: '#667eea',
  },

  // ─── Admin ─────────────────────────────────
  {
    key: 'admin-portal',
    nameAr: 'بوابة المدير',
    nameEn: 'Admin Portal',
    icon: 'AdminPanelSettings',
    path: '/admin-portal',
    resource: 'admin',
    roles: ['admin', 'super_admin'],
    color: '#e53e3e',
  },
  {
    key: 'system-admin',
    nameAr: 'إدارة النظام',
    nameEn: 'System Admin',
    icon: 'Settings',
    path: '/system-admin',
    resource: 'settings',
    roles: ['admin', 'super_admin'],
    color: '#718096',
  },

  // ─── HR ────────────────────────────────────
  {
    key: 'hr',
    nameAr: 'الموارد البشرية',
    nameEn: 'Human Resources',
    icon: 'PeopleAlt',
    path: '/hr',
    resource: 'hr',
    roles: ['admin', 'super_admin', 'hr', 'manager'],
    color: '#805ad5',
  },
  {
    key: 'employee-portal',
    nameAr: 'بوابة الموظف',
    nameEn: 'Employee Portal',
    icon: 'Badge',
    path: '/employee-portal',
    resource: 'employees',
    roles: [],
    color: '#805ad5',
  },
  {
    key: 'attendance',
    nameAr: 'الحضور والانصراف',
    nameEn: 'Attendance',
    icon: 'AccessTime',
    path: '/attendance',
    resource: 'attendance',
    roles: ['admin', 'super_admin', 'hr', 'manager', 'supervisor'],
    color: '#38a169',
  },
  {
    key: 'payroll',
    nameAr: 'الرواتب',
    nameEn: 'Payroll',
    icon: 'AccountBalance',
    path: '/hr/payroll',
    resource: 'payroll',
    roles: ['admin', 'super_admin', 'hr', 'accountant'],
    color: '#d69e2e',
  },
  {
    key: 'recruitment',
    nameAr: 'التوظيف',
    nameEn: 'Recruitment',
    icon: 'GroupAdd',
    path: '/recruitment',
    resource: 'hr',
    roles: ['admin', 'super_admin', 'hr'],
    color: '#805ad5',
  },
  {
    key: 'performance',
    nameAr: 'تقييم الأداء',
    nameEn: 'Performance',
    icon: 'TrendingUp',
    path: '/performance',
    resource: 'hr',
    roles: ['admin', 'super_admin', 'hr', 'manager', 'supervisor'],
    color: '#48bb78',
  },

  // ─── Finance ───────────────────────────────
  {
    key: 'accounting',
    nameAr: 'المحاسبة',
    nameEn: 'Accounting',
    icon: 'AccountBalanceWallet',
    path: '/accounting',
    resource: 'accounting',
    roles: ['admin', 'super_admin', 'accountant', 'manager'],
    color: '#38a169',
  },
  {
    key: 'finance',
    nameAr: 'المالية',
    nameEn: 'Finance',
    icon: 'Payments',
    path: '/finance',
    resource: 'finance',
    roles: ['admin', 'super_admin', 'accountant', 'manager'],
    color: '#38a169',
  },
  {
    key: 'e-invoicing',
    nameAr: 'الفوترة الإلكترونية',
    nameEn: 'E-Invoicing',
    icon: 'Receipt',
    path: '/e-invoicing',
    resource: 'finance',
    roles: ['admin', 'super_admin', 'accountant'],
    color: '#38a169',
  },

  // ─── CRM ───────────────────────────────────
  {
    key: 'crm',
    nameAr: 'إدارة العلاقات',
    nameEn: 'CRM',
    icon: 'Handshake',
    path: '/crm',
    resource: 'crm',
    roles: ['admin', 'super_admin', 'manager', 'receptionist'],
    color: '#ed8936',
  },

  // ─── Students / Beneficiaries ──────────────
  {
    key: 'students-dashboard',
    nameAr: 'الطلاب',
    nameEn: 'Students',
    icon: 'School',
    path: '/students-dashboard',
    resource: 'students',
    roles: ['admin', 'super_admin', 'teacher', 'manager', 'supervisor'],
    color: '#4299e1',
  },
  {
    key: 'beneficiaries',
    nameAr: 'المستفيدون',
    nameEn: 'Beneficiaries',
    icon: 'Accessibility',
    path: '/beneficiaries-dashboard',
    resource: 'beneficiaries',
    roles: ['admin', 'super_admin', 'doctor', 'therapist', 'manager'],
    color: '#4ecdc4',
  },
  {
    key: 'student-portal',
    nameAr: 'بوابة الطالب',
    nameEn: 'Student Portal',
    icon: 'School',
    path: '/student-portal',
    resource: 'students',
    roles: [],
    color: '#4299e1',
  },

  // ─── Clinical / Sessions ───────────────────
  {
    key: 'sessions',
    nameAr: 'الجلسات',
    nameEn: 'Sessions',
    icon: 'EventNote',
    path: '/sessions',
    resource: 'sessions',
    roles: ['admin', 'super_admin', 'doctor', 'therapist', 'manager'],
    color: '#9f7aea',
  },
  {
    key: 'integrated-care',
    nameAr: 'الرعاية المتكاملة',
    nameEn: 'Integrated Care',
    icon: 'Healing',
    path: '/integrated-care',
    resource: 'care_plans',
    roles: ['admin', 'super_admin', 'doctor', 'therapist', 'manager'],
    color: '#f56565',
  },
  {
    key: 'therapist-portal',
    nameAr: 'بوابة المعالج',
    nameEn: 'Therapist Portal',
    icon: 'MedicalServices',
    path: '/therapist-portal',
    resource: 'sessions',
    roles: ['therapist'],
    color: '#9f7aea',
  },

  // ─── Disability / Rehab ────────────────────
  {
    key: 'disability-rehab',
    nameAr: 'التأهيل والإعاقة',
    nameEn: 'Disability & Rehab',
    icon: 'Accessible',
    path: '/disability-rehab-dashboard',
    resource: 'care_plans',
    roles: ['admin', 'super_admin', 'doctor', 'therapist', 'manager'],
    color: '#48bb78',
  },
  {
    key: 'assessment-scales',
    nameAr: 'مقاييس التقييم',
    nameEn: 'Assessment Scales',
    icon: 'Assignment',
    path: '/assessment-scales',
    resource: 'care_plans',
    roles: ['admin', 'super_admin', 'doctor', 'therapist'],
    color: '#4ecdc4',
  },

  // ─── Parent Portal ─────────────────────────
  {
    key: 'parent-portal',
    nameAr: 'بوابة ولي الأمر',
    nameEn: 'Parent Portal',
    icon: 'FamilyRestroom',
    path: '/parent-portal',
    resource: 'dashboard',
    roles: ['parent'],
    color: '#ed64a6',
  },

  // ─── LMS / Training ───────────────────────
  {
    key: 'lms',
    nameAr: 'التعلم الإلكتروني',
    nameEn: 'E-Learning',
    icon: 'MenuBook',
    path: '/lms',
    resource: 'training',
    roles: [],
    color: '#4299e1',
  },
  {
    key: 'training',
    nameAr: 'التدريب',
    nameEn: 'Training',
    icon: 'ModelTraining',
    path: '/training',
    resource: 'training',
    roles: ['admin', 'super_admin', 'hr', 'manager'],
    color: '#4299e1',
  },

  // ─── Communications ────────────────────────
  {
    key: 'messages',
    nameAr: 'الرسائل',
    nameEn: 'Messages',
    icon: 'Chat',
    path: '/messages',
    resource: 'communications',
    roles: [],
    color: '#667eea',
  },
  {
    key: 'communications',
    nameAr: 'الاتصالات',
    nameEn: 'Communications',
    icon: 'Forum',
    path: '/communications',
    resource: 'communications',
    roles: [],
    color: '#667eea',
  },

  // ─── Documents ─────────────────────────────
  {
    key: 'documents',
    nameAr: 'المستندات',
    nameEn: 'Documents',
    icon: 'FolderOpen',
    path: '/documents',
    resource: 'documents',
    roles: [],
    color: '#ed8936',
  },
  {
    key: 'electronic-archiving',
    nameAr: 'الأرشفة الإلكترونية',
    nameEn: 'E-Archiving',
    icon: 'Archive',
    path: '/electronic-archiving',
    resource: 'documents',
    roles: ['admin', 'super_admin', 'manager'],
    color: '#ed8936',
  },

  // ─── Fleet / Transport ─────────────────────
  {
    key: 'fleet',
    nameAr: 'الأسطول',
    nameEn: 'Fleet',
    icon: 'DirectionsCar',
    path: '/fleet',
    resource: 'fleet',
    roles: ['admin', 'super_admin', 'manager', 'driver'],
    color: '#2b6cb0',
  },
  {
    key: 'transport',
    nameAr: 'النقل',
    nameEn: 'Transport',
    icon: 'LocalShipping',
    path: '/transport-management',
    resource: 'fleet',
    roles: ['admin', 'super_admin', 'manager'],
    color: '#2b6cb0',
  },

  // ─── Operations ────────────────────────────
  {
    key: 'operations',
    nameAr: 'العمليات',
    nameEn: 'Operations',
    icon: 'Engineering',
    path: '/operations',
    resource: 'dashboard',
    roles: ['admin', 'super_admin', 'manager'],
    color: '#718096',
  },

  // ─── Inventory / Purchasing ────────────────
  {
    key: 'inventory',
    nameAr: 'المخزون',
    nameEn: 'Inventory',
    icon: 'Inventory',
    path: '/inventory',
    resource: 'inventory',
    roles: ['admin', 'super_admin', 'manager'],
    color: '#d69e2e',
  },
  {
    key: 'purchasing',
    nameAr: 'المشتريات',
    nameEn: 'Purchasing',
    icon: 'ShoppingCart',
    path: '/purchasing',
    resource: 'purchasing',
    roles: ['admin', 'super_admin', 'accountant', 'manager'],
    color: '#d69e2e',
  },

  // ─── Quality / Compliance ──────────────────
  {
    key: 'quality',
    nameAr: 'الجودة',
    nameEn: 'Quality',
    icon: 'VerifiedUser',
    path: '/quality',
    resource: 'quality',
    roles: ['admin', 'super_admin', 'manager', 'supervisor'],
    color: '#38a169',
  },
  {
    key: 'incidents',
    nameAr: 'الحوادث',
    nameEn: 'Incidents',
    icon: 'ReportProblem',
    path: '/incidents',
    resource: 'quality',
    roles: ['admin', 'super_admin', 'manager', 'supervisor'],
    color: '#e53e3e',
  },

  // ─── AI / Analytics ────────────────────────
  {
    key: 'ai-analytics',
    nameAr: 'الذكاء الاصطناعي',
    nameEn: 'AI Analytics',
    icon: 'Psychology',
    path: '/ai-analytics',
    resource: 'reports',
    roles: ['admin', 'super_admin', 'manager'],
    color: '#9f7aea',
  },
  {
    key: 'analytics',
    nameAr: 'التحليلات',
    nameEn: 'Analytics',
    icon: 'Analytics',
    path: '/analytics',
    resource: 'reports',
    roles: ['admin', 'super_admin', 'manager'],
    color: '#667eea',
  },
  {
    key: 'kpi-dashboard',
    nameAr: 'مؤشرات الأداء',
    nameEn: 'KPI Dashboard',
    icon: 'Speed',
    path: '/kpi-dashboard',
    resource: 'reports',
    roles: ['admin', 'super_admin', 'manager'],
    color: '#667eea',
  },

  // ─── Misc ──────────────────────────────────
  {
    key: 'projects',
    nameAr: 'المشاريع',
    nameEn: 'Projects',
    icon: 'AccountTree',
    path: '/projects',
    resource: 'dashboard',
    roles: ['admin', 'super_admin', 'manager'],
    color: '#718096',
  },
  {
    key: 'contracts',
    nameAr: 'العقود',
    nameEn: 'Contracts',
    icon: 'Description',
    path: '/contracts',
    resource: 'contracts',
    roles: ['admin', 'super_admin', 'manager', 'accountant'],
    color: '#718096',
  },
  {
    key: 'maintenance',
    nameAr: 'الصيانة',
    nameEn: 'Maintenance',
    icon: 'Build',
    path: '/maintenance',
    resource: 'maintenance',
    roles: ['admin', 'super_admin', 'manager', 'it'],
    color: '#ed8936',
  },
  {
    key: 'vendors',
    nameAr: 'الموردون',
    nameEn: 'Vendors',
    icon: 'Store',
    path: '/vendors',
    resource: 'purchasing',
    roles: ['admin', 'super_admin', 'accountant', 'manager'],
    color: '#d69e2e',
  },
  {
    key: 'meetings',
    nameAr: 'الاجتماعات',
    nameEn: 'Meetings',
    icon: 'Groups',
    path: '/meetings',
    resource: 'communications',
    roles: [],
    color: '#667eea',
  },
  {
    key: 'visitors',
    nameAr: 'الزوار',
    nameEn: 'Visitors',
    icon: 'PersonSearch',
    path: '/visitors',
    resource: 'dashboard',
    roles: ['admin', 'super_admin', 'receptionist', 'manager'],
    color: '#718096',
  },
  {
    key: 'licenses',
    nameAr: 'التراخيص',
    nameEn: 'Licenses',
    icon: 'CardMembership',
    path: '/licenses',
    resource: 'documents',
    roles: ['admin', 'super_admin', 'manager'],
    color: '#805ad5',
  },
  {
    key: 'donations',
    nameAr: 'التبرعات',
    nameEn: 'Donations',
    icon: 'VolunteerActivism',
    path: '/donations',
    resource: 'finance',
    roles: ['admin', 'super_admin', 'accountant'],
    color: '#e53e3e',
  },
  {
    key: 'complaints',
    nameAr: 'الشكاوى',
    nameEn: 'Complaints',
    icon: 'Feedback',
    path: '/complaints',
    resource: 'quality',
    roles: ['admin', 'super_admin', 'manager', 'supervisor'],
    color: '#ed8936',
  },
  {
    key: 'tasks',
    nameAr: 'المهام',
    nameEn: 'Tasks',
    icon: 'Task',
    path: '/tasks',
    resource: 'dashboard',
    roles: [],
    color: '#4299e1',
  },
  {
    key: 'security',
    nameAr: 'الأمان',
    nameEn: 'Security',
    icon: 'Security',
    path: '/security',
    resource: 'settings',
    roles: ['admin', 'super_admin', 'it'],
    color: '#e53e3e',
  },
  {
    key: 'knowledge-center',
    nameAr: 'مركز المعرفة',
    nameEn: 'Knowledge Center',
    icon: 'LibraryBooks',
    path: '/knowledge-center',
    resource: 'training',
    roles: [],
    color: '#4299e1',
  },
];

/**
 * Get module by key.
 * @param {string} key
 * @returns {ModuleEntry|undefined}
 */
export const getModule = key => MODULE_REGISTRY.find(m => m.key === key);

/**
 * Get modules accessible to a role.
 * @param {string} role
 * @returns {ModuleEntry[]}
 */
export const getModulesForRole = role =>
  MODULE_REGISTRY.filter(m => m.roles.length === 0 || m.roles.includes(role));

/**
 * Get modules grouped by resource category.
 * @returns {Object<string, ModuleEntry[]>}
 */
export const getModulesGrouped = () =>
  MODULE_REGISTRY.reduce((groups, m) => {
    const key = m.resource;
    if (!groups[key]) groups[key] = [];
    groups[key].push(m);
    return groups;
  }, {});

export default MODULE_REGISTRY;
