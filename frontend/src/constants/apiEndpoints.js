/**
 * apiEndpoints — Backend API endpoint paths.
 * ثوابت مسارات واجهة برمجة التطبيقات
 */

const API = {
  // Auth
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh-token',
    ME: '/auth/me',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
    CHANGE_PASSWORD: '/auth/change-password',
  },

  // Dashboard
  DASHBOARD: {
    HEALTH: '/dashboard/health',
    SUMMARY: '/dashboard/summary',
    SUMMARY_SYSTEMS: '/dashboard/summary-systems',
    SERVICES: '/dashboard/services',
    TOP_KPIS: '/dashboard/top-kpis',
  },

  // Modules / System
  MODULES: {
    LIST: '/modules',
    BY_KEY: key => `/modules/${key}`,
  },

  // Users
  USERS: {
    LIST: '/users',
    BY_ID: id => `/users/${id}`,
    PROFILE: '/users/profile',
    CHANGE_ROLE: id => `/users/${id}/role`,
  },

  // CRM
  CRM: {
    CONTACTS: '/crm/contacts',
    CONTACT: id => `/crm/contacts/${id}`,
    CONTACTS_STATS: '/crm/contacts/stats',
    LEADS: '/crm/leads',
    LEAD: id => `/crm/leads/${id}`,
    REPORTS: '/crm/reports',
  },

  // Finance / Accounting
  FINANCE: {
    ROOT: '/finance',
    SUMMARY: '/finance/summary',
    ACCOUNTS: '/finance/accounts',
    ACCOUNT: id => `/finance/accounts/${id}`,
    JOURNAL_ENTRIES: '/finance/journal-entries',
    JOURNAL_ENTRY: id => `/finance/journal-entries/${id}`,
    POST_ENTRY: id => `/finance/journal-entries/${id}/post`,
    INVOICES: '/finance/invoices',
    INVOICE: id => `/finance/invoices/${id}`,
    EXPENSES: '/finance/expenses',
    EXPENSE: id => `/finance/expenses/${id}`,
    APPROVE_EXPENSE: id => `/finance/expenses/${id}/approve`,
    BUDGETS: '/finance/budgets',
    BUDGET: id => `/finance/budgets/${id}`,
    FINANCIAL_REPORTS: '/finance/financial-reports',
    PAYMENTS: '/finance/payments',
    PAYMENT: id => `/finance/payments/${id}`,
    COST_CENTERS: '/finance/cost-centers',
    FIXED_ASSETS: '/finance/fixed-assets',
    VAT_ZAKAT: '/finance/vat-zakat',
    GENERAL_LEDGER: '/finance/general-ledger',
    CASH_FLOW: '/finance/cash-flow',
  },

  // HR
  HR: {
    ROOT: '/hr',
    DASHBOARD_KPIS: '/hr/dashboard-kpis',
    EMPLOYEES: '/hr/employees',
    EMPLOYEE: id => `/hr/employees/${id}`,
    ATTENDANCE: '/hr/attendance',
    CHECK_IN: '/hr/attendance/check-in',
    CHECK_OUT: '/hr/attendance/check-out',
    MONTHLY_REPORT: '/hr/attendance/monthly-report',
    LEAVES: '/hr/leaves',
    LEAVE: id => `/hr/leaves/${id}`,
    APPROVE_LEAVE: id => `/hr/leaves/${id}/approve`,
    REJECT_LEAVE: id => `/hr/leaves/${id}/reject`,
    PERFORMANCE_REVIEWS: '/hr/performance-reviews',
    INCENTIVES: '/hr/incentives',
    COMPENSATION: '/hr/compensation',
  },

  // Payroll
  PAYROLL: {
    ROOT: '/payroll',
    CREATE: '/payroll/create',
    BY_ID: id => `/payroll/${id}`,
    MONTHLY: (month, year) => `/payroll/monthly/${month}/${year}`,
    EMPLOYEE_YEAR: (empId, year) => `/payroll/employee/${empId}/year/${year}`,
    PROCESS_MONTHLY: '/payroll/process-monthly',
    SUBMIT_APPROVAL: id => `/payroll/${id}/submit-approval`,
    APPROVE: id => `/payroll/${id}/approve`,
    PROCESS: id => `/payroll/${id}/process`,
    TRANSFER: id => `/payroll/${id}/transfer`,
    CONFIRM_PAYMENT: id => `/payroll/${id}/confirm-payment`,
    STATS: (month, year) => `/payroll/stats/${month}/${year}`,
    SETTINGS: '/payroll/settings',
    END_OF_SERVICE: '/payroll/end-of-service',
    END_OF_SERVICE_CALC: '/payroll/end-of-service/calculate',
    REPORT_WPS: (m, y) => `/payroll/reports/wps/${m}/${y}`,
    REPORT_GOSI: (m, y) => `/payroll/reports/gosi/${m}/${y}`,
    REPORT_BANK: (m, y) => `/payroll/reports/bank-transfer/${m}/${y}`,
  },

  // Students
  STUDENTS: {
    LIST: '/students',
    BY_ID: id => `/students/${id}`,
    REGISTER: '/students/register',
    DASHBOARD: '/students/dashboard',
    STATS: '/students/stats',
  },

  // Beneficiaries
  BENEFICIARIES: {
    LIST: '/beneficiaries',
    BY_ID: id => `/beneficiaries/${id}`,
    DASHBOARD: '/beneficiaries/dashboard',
    STATS: '/beneficiaries/stats',
  },

  // Sessions / Therapy
  SESSIONS: {
    LIST: '/sessions',
    BY_ID: id => `/sessions/${id}`,
    STATS: '/sessions/stats',
    DASHBOARD: '/sessions/dashboard',
  },

  // Care Plans
  CARE_PLANS: {
    LIST: '/care-plans',
    BY_ID: id => `/care-plans/${id}`,
    CREATE: '/care-plans',
  },

  // Disability / Rehab
  DISABILITY: {
    ASSESSMENT_SCALES: '/disability/assessment-scales',
    ASSESSMENT_TESTS: '/disability/assessment-tests',
    REHAB_PROGRAMS: '/disability/rehab-programs',
    ASSISTIVE_DEVICES: '/disability/assistive-devices',
    REPORTS: '/disability/reports',
  },

  // Inventory
  INVENTORY: {
    LIST: '/inventory',
    BY_ID: id => `/inventory/${id}`,
    STATS: '/inventory/stats',
    STOCK_TRANSFER: '/inventory/stock-transfers',
  },

  // Purchasing
  PURCHASING: {
    LIST: '/purchasing',
    BY_ID: id => `/purchasing/${id}`,
    APPROVE: id => `/purchasing/${id}/approve`,
  },

  // Documents
  DOCUMENTS: {
    LIST: '/documents',
    BY_ID: id => `/documents/${id}`,
    UPLOAD: '/documents/upload',
    DOWNLOAD: id => `/documents/${id}/download`,
  },

  // Notifications
  NOTIFICATIONS: {
    LIST: '/notifications',
    MARK_READ: id => `/notifications/${id}/read`,
    MARK_ALL_READ: '/notifications/read-all',
    COUNT: '/notifications/unread-count',
  },

  // Quality
  QUALITY: {
    ROOT: '/quality',
    INCIDENTS: '/quality/incidents',
    AUDITS: '/quality/audits',
    RISKS: '/quality/risks',
  },

  // Fleet
  FLEET: {
    LIST: '/fleet',
    BY_ID: id => `/fleet/${id}`,
    DASHBOARD: '/fleet/dashboard',
  },

  // Communications / Messages
  MESSAGES: {
    LIST: '/messages',
    BY_ID: id => `/messages/${id}`,
    SEND: '/messages/send',
  },

  // Reports
  REPORTS: {
    GENERATE: '/reports/generate',
    BY_TYPE: type => `/reports/${type}`,
  },

  // Settings
  SETTINGS: {
    GENERAL: '/settings',
    SYSTEM: '/settings/system',
  },
};

export default API;
