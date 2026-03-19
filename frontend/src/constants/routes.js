/**
 * routes — Centralized route path constants.
 * ثوابت مسارات الصفحات
 */

export const ROUTES = {
  // Auth
  LOGIN: '/login',
  REGISTER: '/register',

  // Core
  HOME: '/home',
  DASHBOARD: '/dashboard',
  DASHBOARD_SIMPLE: '/dashboard/simple',
  DASHBOARD_ADVANCED: '/dashboard/advanced',
  MONITORING: '/monitoring',
  ACTIVITY: '/activity',
  REPORTS: '/reports',
  EXECUTIVE_DASHBOARD: '/executive-dashboard',
  PROFILE: '/profile',

  // CRM
  CRM: '/crm',
  CRM_CONTACTS: '/crm/contacts',
  CRM_LEADS: '/crm/leads',
  CRM_REPORTS: '/crm/reports',

  // Accounting / Finance
  FINANCE: '/finance',
  ACCOUNTING: '/accounting',
  CHART_OF_ACCOUNTS: '/accounting/chart-of-accounts',
  JOURNAL_ENTRIES: '/accounting/journal-entries',
  INVOICES: '/accounting/invoices',
  EXPENSES: '/accounting/expenses',
  BUDGETS: '/accounting/budgets',
  FINANCIAL_REPORTS: '/accounting/reports',
  COST_CENTERS: '/accounting/cost-centers',
  FIXED_ASSETS: '/accounting/fixed-assets',
  VAT_ZAKAT: '/accounting/vat-zakat',
  GENERAL_LEDGER: '/accounting/general-ledger',
  CASH_FLOW: '/accounting/cash-flow',
  E_INVOICING: '/e-invoicing',
  BUDGET_MANAGEMENT: '/budget-management',

  // HR
  HR: '/hr',
  HR_EMPLOYEES: '/hr/employees',
  HR_LEAVES: '/hr/leaves',
  HR_ATTENDANCE: '/hr/attendance',
  HR_ZKTECO: '/hr/zkteco-devices',
  HR_PAYROLL: '/hr/payroll',
  HR_INCENTIVES: '/hr/incentives',
  HR_COMPENSATION: '/hr/compensation',
  HR_ANALYTICS: '/hr/analytics',
  HR_SALARY_SLIP: '/hr/salary-slip',
  HR_PAYROLL_PROCESSING: '/hr/payroll-processing',
  HR_PAYROLL_REPORTS: '/hr/payroll-reports',
  HR_PAYROLL_SETTINGS: '/hr/payroll-settings',
  HR_END_OF_SERVICE: '/hr/end-of-service',
  ORGANIZATION: '/organization',
  EMPLOYEE_PORTAL: '/employee-portal',
  PERFORMANCE: '/performance',
  RECRUITMENT: '/recruitment',
  ATTENDANCE: '/attendance',

  // LMS / Sessions
  LMS: '/lms',
  LMS_COURSE: '/lms/course', // + /:id
  SESSIONS: '/sessions',
  SESSIONS_DASHBOARD: '/sessions-dashboard',

  // Disability / Rehabilitation
  ASSESSMENT_SCALES: '/assessment-scales',
  ASSESSMENT_TESTS: '/assessment-tests',
  INTEGRATED_CARE: '/integrated-care',
  INTEGRATED_CARE_CREATE: '/integrated-care/create',
  INTEGRATED_CARE_SESSION: '/integrated-care/session',
  DISABILITY_REHAB_DASHBOARD: '/disability-rehab-dashboard',
  REHAB_PROGRAMS: '/rehab-programs',
  THERAPY_SESSIONS_ADMIN: '/therapy-sessions-admin',
  ASSISTIVE_DEVICES: '/assistive-devices',
  DISABILITY_REHAB_REPORTS: '/disability-rehab-reports',
  EDUCATION: '/education',

  // AI / Analytics
  AI_ANALYTICS: '/ai-analytics',
  ANALYTICS: '/analytics',
  ANALYTICS_ADVANCED: '/analytics/advanced',
  KPI_DASHBOARD: '/kpi-dashboard',

  // Communications
  MESSAGES: '/messages',
  COMMUNICATIONS: '/communications',
  COMMUNICATIONS_SYSTEM: '/communications-system',

  // Documents
  DOCUMENTS: '/documents',
  DOCUMENTS_MANAGEMENT: '/documents-management',
  SMART_DOCUMENTS: '/smart-documents',
  ARCHIVING: '/archiving',
  ELECTRONIC_ARCHIVING: '/electronic-archiving',
  EXPORT_IMPORT: '/export-import',

  // Student Portal
  STUDENT_PORTAL: '/student-portal',
  STUDENT_PORTAL_SCHEDULE: '/student-portal/schedule',
  STUDENT_PORTAL_GRADES: '/student-portal/grades',
  STUDENT_PORTAL_ATTENDANCE: '/student-portal/attendance',
  STUDENT_PORTAL_REPORTS: '/student-portal/reports',
  STUDENT_PORTAL_ASSIGNMENTS: '/student-portal/assignments',
  STUDENT_PORTAL_LIBRARY: '/student-portal/library',
  STUDENT_PORTAL_ANNOUNCEMENTS: '/student-portal/announcements',
  STUDENT_PORTAL_MESSAGES: '/student-portal/messages',
  STUDENT_REGISTRATION: '/student-registration',
  STUDENTS_DASHBOARD: '/students-dashboard',
  STUDENT_MANAGEMENT: '/student-management',
  STUDENT_REPORT: '/student-report', // + /:studentId
  STUDENT_REPORTS_CENTER: '/student-reports-center',
  STUDENT_REPORTS_PERIODIC: '/student-reports/periodic',
  STUDENT_REPORTS_COMPARISON: '/student-reports/comparison',
  STUDENT_REPORT_PARENT: '/student-report', // + /:studentId/parent

  // Therapist Portal
  THERAPIST_PORTAL: '/therapist-portal',
  THERAPIST_PATIENTS: '/therapist-portal/patients',
  THERAPIST_SCHEDULE: '/therapist-portal/schedule',
  THERAPIST_SESSIONS: '/therapist-portal/sessions',
  THERAPIST_CASES: '/therapist-portal/cases',
  THERAPIST_DOCUMENTS: '/therapist-portal/documents',
  THERAPIST_REPORTS: '/therapist-portal/reports',
  THERAPIST_MESSAGES: '/therapist-portal/messages',
  THERAPIST_TREATMENT_PLANS: '/therapist-portal/treatment-plans',
  THERAPIST_ASSESSMENTS: '/therapist-portal/assessments',
  THERAPIST_PRESCRIPTIONS: '/therapist-portal/prescriptions',
  THERAPIST_PROFESSIONAL_DEV: '/therapist-portal/professional-dev',
  THERAPIST_ANALYTICS: '/therapist-portal/analytics',
  THERAPIST_CONSULTATIONS: '/therapist-portal/consultations',
  THERAPIST_DAILY_TASKS: '/therapist-portal/tasks',
  THERAPIST_PROGRESS_TRACKING: '/therapist-portal/progress-tracking',
  THERAPIST_CLINICAL_LIBRARY: '/therapist-portal/clinical-library',
  THERAPIST_DOC_TEMPLATES: '/therapist-portal/doc-templates',
  THERAPIST_PARENT_COMM: '/therapist-portal/parent-comm',
  THERAPIST_SMART_GOALS: '/therapist-portal/smart-goals',
  THERAPIST_REFERRALS: '/therapist-portal/referrals',
  THERAPIST_GROUP_THERAPY: '/therapist-portal/group-therapy',
  THERAPIST_EQUIPMENT: '/therapist-portal/equipment',
  THERAPIST_KPIS: '/therapist-portal/kpis',
  THERAPIST_SAFETY_PROTOCOLS: '/therapist-portal/safety-protocols',
  THERAPIST_CLINICAL_RESEARCH: '/therapist-portal/clinical-research',
  THERAPIST_TELEHEALTH: '/therapist-portal/telehealth',
  THERAPIST_FIELD_TRAINING: '/therapist-portal/field-training',
  THERAPIST_CONSENTS: '/therapist-portal/consents',
  THERAPIST_QUALITY_REPORTS: '/therapist-portal/quality-reports',
  THERAPIST_WAITING_LIST: '/therapist-portal/waiting-list',
  THERAPIST_ACHIEVEMENTS: '/therapist-portal/achievements',

  // Admin Portal
  ADMIN_PORTAL: '/admin-portal',
  ADMIN_ENHANCED: '/admin-portal/enhanced',
  ADMIN_ADVANCED: '/admin-portal/advanced',
  ADMIN_USERS: '/admin-portal/users',
  ADMIN_SETTINGS: '/admin-portal/settings',
  ADMIN_REPORTS: '/admin-portal/reports',
  ADMIN_ADVANCED_REPORTS: '/admin-portal/advanced-reports',
  ADMIN_AUDIT_LOGS: '/admin-portal/audit-logs',
  ADMIN_CLINICS: '/admin-portal/clinics',
  ADMIN_PAYMENTS: '/admin-portal/payments',
  ADMIN_NOTIFICATIONS: '/admin-portal/notifications',

  // Beneficiaries
  BENEFICIARIES_DASHBOARD: '/beneficiaries-dashboard',
  BENEFICIARIES: '/beneficiaries',
  BENEFICIARIES_MANAGE: '/beneficiaries/manage',
  BENEFICIARIES_TABLE: '/beneficiaries/table',

  // Parent Portal
  PARENT_PORTAL: '/parent-portal',
  PARENT_CHILDREN_PROGRESS: '/parent-portal/children-progress',
  PARENT_ATTENDANCE: '/parent-portal/attendance-reports',
  PARENT_THERAPIST_COMM: '/parent-portal/therapist-communications',
  PARENT_PAYMENTS: '/parent-portal/payments-history',
  PARENT_DOCUMENTS: '/parent-portal/documents-reports',
  PARENT_APPOINTMENTS: '/parent-portal/appointments-scheduling',
  PARENT_MESSAGES: '/parent-portal/messages',

  // Fleet / Transport / Operations
  FLEET_DASHBOARD: '/fleet-dashboard',
  FLEET: '/fleet',
  VEHICLE_MANAGEMENT: '/vehicle-management',
  INSURANCE_MANAGEMENT: '/insurance-management',
  TRANSPORT: '/transport-management',
  OPERATIONS_DASHBOARD: '/operations-dashboard',
  OPERATIONS: '/operations',

  // Quality / Compliance / Risk
  QUALITY_DASHBOARD: '/quality-dashboard',
  QUALITY: '/quality',
  INTERNAL_AUDIT: '/internal-audit',
  INCIDENTS: '/incidents',
  RISK_ASSESSMENT: '/risk-assessment',

  // Inventory / Purchasing / Branch
  INVENTORY: '/inventory',
  PURCHASING: '/purchasing',
  EQUIPMENT: '/equipment',
  BRANCH_WAREHOUSES: '/branch-warehouses',
  STOCK_TRANSFERS: '/stock-transfers',
  BRANCH_PURCHASING: '/branch-purchasing',
  BRANCH_REPORTS: '/branch-reports',

  // Misc
  PROJECTS: '/projects',
  SECURITY: '/security',
  CONTRACTS_DASHBOARD: '/contracts-dashboard',
  CONTRACTS: '/contracts',
  SMART_NOTIFICATIONS: '/smart-notifications',
  ADVANCED_TICKETS: '/advanced-tickets',
  MEETINGS: '/meetings',
  VISITORS: '/visitors',
  E_SIGNATURE: '/e-signature',
  KNOWLEDGE_CENTER: '/knowledge-center',
  LICENSES: '/licenses',
  TRAINING: '/training',
  TRAINING_PROGRAMS: '/training/programs',
  TRAINING_REPORTS: '/training/reports',
  MAINTENANCE: '/maintenance',
  VENDORS: '/vendors',
  DONATIONS: '/donations',
  COMPLAINTS: '/complaints',
  TASKS: '/tasks',
  SYSTEM_ADMIN: '/system-admin',
  GROUPS: '/groups',
  FRIENDS: '/friends',
};

export default ROUTES;
