/**
 * Employee Affairs Expanded Service — خدمة شؤون الموظفين الموسعة (Frontend)
 *
 * API client for expanded HR features:
 *   complaints, loans, disciplinary, letters, promotions, overtime
 */
import { safeFetch } from './safeFetch';

const BASE = '/api/employee-affairs-expanded';

// ─── Demo Data ───────────────────────────────────────────────────────────────

const DEMO_COMPLAINTS = [
  {
    _id: '1',
    complaintNumber: 'CMP-2026-00001',
    type: 'شكوى إدارية',
    subject: 'تأخر صرف الراتب',
    status: 'مقدمة',
    priority: 'مرتفع',
    employeeId: {
      firstName: 'أحمد',
      lastName: 'محمد',
      employeeId: 'EMP001',
      department: 'تقنية المعلومات',
    },
    createdAt: '2026-03-01',
  },
  {
    _id: '2',
    complaintNumber: 'CMP-2026-00002',
    type: 'بيئة عمل',
    subject: 'مشكلة في التكييف',
    status: 'قيد المراجعة',
    priority: 'متوسط',
    employeeId: {
      firstName: 'سارة',
      lastName: 'أحمد',
      employeeId: 'EMP002',
      department: 'المالية',
    },
    createdAt: '2026-03-05',
  },
];

const DEMO_LOANS = [
  {
    _id: '1',
    loanNumber: 'LN-2026-00001',
    type: 'سلفة راتب',
    amount: 10000,
    status: 'قيد السداد',
    monthlyInstallment: 2000,
    remainingBalance: 6000,
    employeeId: {
      firstName: 'خالد',
      lastName: 'العمري',
      employeeId: 'EMP003',
      department: 'الموارد البشرية',
    },
    createdAt: '2026-01-15',
  },
  {
    _id: '2',
    loanNumber: 'LN-2026-00002',
    type: 'قرض شخصي',
    amount: 25000,
    status: 'مقدم',
    monthlyInstallment: 2500,
    remainingBalance: 25000,
    employeeId: {
      firstName: 'فاطمة',
      lastName: 'السعيد',
      employeeId: 'EMP004',
      department: 'المبيعات',
    },
    createdAt: '2026-03-10',
  },
];

const DEMO_DISCIPLINARY = [
  {
    _id: '1',
    actionNumber: 'DA-2026-00001',
    type: 'إنذار كتابي أول',
    severity: 'متوسطة',
    status: 'معتمد',
    violation: {
      type: 'تأخر متكرر',
      description: 'تأخر عن الدوام 5 مرات خلال شهر',
      date: '2026-02-20',
    },
    employeeId: { firstName: 'محمد', lastName: 'حسن', employeeId: 'EMP005', department: 'الإدارة' },
    createdAt: '2026-02-25',
  },
];

const DEMO_LETTERS = [
  {
    _id: '1',
    letterNumber: 'LTR-2026-00001',
    type: 'تعريف بالراتب',
    status: 'جاهز',
    language: 'عربي',
    employeeId: {
      firstName: 'عبدالله',
      lastName: 'الزهراني',
      employeeId: 'EMP006',
      department: 'تقنية المعلومات',
    },
    createdAt: '2026-03-01',
  },
  {
    _id: '2',
    letterNumber: 'LTR-2026-00002',
    type: 'شهادة خبرة',
    status: 'مطلوب',
    language: 'كلاهما',
    employeeId: {
      firstName: 'نورة',
      lastName: 'القحطاني',
      employeeId: 'EMP007',
      department: 'المالية',
    },
    createdAt: '2026-03-12',
  },
];

const DEMO_PROMOTIONS = [
  {
    _id: '1',
    requestNumber: 'PRM-2026-00001',
    type: 'ترقية',
    status: 'معتمد',
    current: { department: 'تقنية المعلومات', position: 'مطور', grade: '7' },
    proposed: { department: 'تقنية المعلومات', position: 'مطور أول', grade: '8' },
    employeeId: { firstName: 'يوسف', lastName: 'الشمري', employeeId: 'EMP008' },
    effectiveDate: '2026-04-01',
    createdAt: '2026-02-15',
  },
  {
    _id: '2',
    requestNumber: 'TRF-2026-00002',
    type: 'نقل داخلي',
    status: 'مقترح',
    current: { department: 'المبيعات', position: 'مندوب' },
    proposed: { department: 'التسويق', position: 'أخصائي تسويق' },
    employeeId: { firstName: 'هند', lastName: 'المالكي', employeeId: 'EMP009' },
    effectiveDate: '2026-04-15',
    createdAt: '2026-03-01',
  },
];

const DEMO_OVERTIME = [
  {
    _id: '1',
    requestNumber: 'OT-2026-00001',
    type: 'عمل إضافي عادي',
    date: '2026-03-10',
    totalHours: 3,
    status: 'معتمد',
    calculation: { hourlyRate: 50, multiplier: 1.5, totalAmount: 225 },
    employeeId: {
      firstName: 'عمر',
      lastName: 'الحربي',
      employeeId: 'EMP010',
      department: 'تقنية المعلومات',
    },
    reason: 'إنهاء مشروع عاجل',
  },
  {
    _id: '2',
    requestNumber: 'OT-2026-00002',
    type: 'عمل يوم راحة',
    date: '2026-03-14',
    totalHours: 8,
    status: 'مقدم',
    calculation: { hourlyRate: 45, multiplier: 2.0, totalAmount: 720 },
    employeeId: {
      firstName: 'ريم',
      lastName: 'الدوسري',
      employeeId: 'EMP011',
      department: 'المالية',
    },
    reason: 'إقفال الحسابات الشهرية',
  },
];

// ─── API Functions ───────────────────────────────────────────────────────────

// Dashboard
export const getExpandedDashboard = () =>
  safeFetch(
    `${BASE}/expanded-dashboard`,
    {},
    {
      complaints: { total: 12, byStatus: [], byType: [] },
      loans: { total: 8, byStatus: [], totalDisbursed: 150000 },
      disciplinaryActions: 5,
      letters: { byType: [], byStatus: [] },
      promotionsAndTransfers: [],
      overtime: {
        total: 15,
        byStatus: [],
        byType: [],
        approved: { totalHours: 120, totalAmount: 9000 },
      },
    }
  );

// Complaints
export const getComplaints = (params = {}) =>
  safeFetch(
    `${BASE}/complaints`,
    { params },
    { complaints: DEMO_COMPLAINTS, total: 2, page: 1, pages: 1 }
  );

export const getComplaintById = id => safeFetch(`${BASE}/complaints/${id}`, {}, DEMO_COMPLAINTS[0]);

export const createComplaint = data =>
  safeFetch(`${BASE}/complaints`, { method: 'POST', data }, DEMO_COMPLAINTS[0]);

export const updateComplaintStatus = (id, data) =>
  safeFetch(`${BASE}/complaints/${id}/status`, { method: 'PATCH', data }, DEMO_COMPLAINTS[0]);

export const getComplaintStats = () =>
  safeFetch(`${BASE}/complaints/stats`, {}, { total: 12, byStatus: [], byType: [] });

// Loans
export const getLoans = (params = {}) =>
  safeFetch(`${BASE}/loans`, { params }, { loans: DEMO_LOANS, total: 2, page: 1, pages: 1 });

export const getLoanById = id => safeFetch(`${BASE}/loans/${id}`, {}, DEMO_LOANS[0]);

export const createLoan = data =>
  safeFetch(`${BASE}/loans`, { method: 'POST', data }, DEMO_LOANS[0]);

export const approveLoanStep = (id, data) =>
  safeFetch(`${BASE}/loans/${id}/approve`, { method: 'PATCH', data }, DEMO_LOANS[0]);

export const payInstallment = (loanId, installmentNumber) =>
  safeFetch(
    `${BASE}/loans/${loanId}/installments/${installmentNumber}/pay`,
    { method: 'PATCH' },
    DEMO_LOANS[0]
  );

export const getLoanStats = () =>
  safeFetch(`${BASE}/loans/stats`, {}, { total: 8, byStatus: [], totalDisbursed: 150000 });

// Disciplinary Actions
export const getDisciplinaryActions = (params = {}) =>
  safeFetch(
    `${BASE}/disciplinary`,
    { params },
    { actions: DEMO_DISCIPLINARY, total: 1, page: 1, pages: 1 }
  );

export const getDisciplinaryActionById = id =>
  safeFetch(`${BASE}/disciplinary/${id}`, {}, DEMO_DISCIPLINARY[0]);

export const createDisciplinaryAction = data =>
  safeFetch(`${BASE}/disciplinary`, { method: 'POST', data }, DEMO_DISCIPLINARY[0]);

export const approveDisciplinaryAction = (id, data) =>
  safeFetch(`${BASE}/disciplinary/${id}/approve`, { method: 'PATCH', data }, DEMO_DISCIPLINARY[0]);

export const fileDisciplinaryAppeal = (id, data) =>
  safeFetch(`${BASE}/disciplinary/${id}/appeal`, { method: 'POST', data }, DEMO_DISCIPLINARY[0]);

export const getEmployeeDisciplinaryRecord = employeeId =>
  safeFetch(
    `${BASE}/disciplinary/employee/${employeeId}/record`,
    {},
    { total: 1, active: 1, actions: DEMO_DISCIPLINARY }
  );

// Letters
export const getLetters = (params = {}) =>
  safeFetch(`${BASE}/letters`, { params }, { letters: DEMO_LETTERS, total: 2, page: 1, pages: 1 });

export const getLetterById = id => safeFetch(`${BASE}/letters/${id}`, {}, DEMO_LETTERS[0]);

export const createLetterRequest = data =>
  safeFetch(`${BASE}/letters`, { method: 'POST', data }, DEMO_LETTERS[0]);

export const updateLetterStatus = (id, data) =>
  safeFetch(`${BASE}/letters/${id}/status`, { method: 'PATCH', data }, DEMO_LETTERS[0]);

export const getLetterStats = () =>
  safeFetch(`${BASE}/letters/stats`, {}, { byType: [], byStatus: [] });

// Promotions & Transfers
export const getPromotionTransfers = (params = {}) =>
  safeFetch(
    `${BASE}/promotions`,
    { params },
    { requests: DEMO_PROMOTIONS, total: 2, page: 1, pages: 1 }
  );

export const getPromotionTransferById = id =>
  safeFetch(`${BASE}/promotions/${id}`, {}, DEMO_PROMOTIONS[0]);

export const createPromotionTransfer = data =>
  safeFetch(`${BASE}/promotions`, { method: 'POST', data }, DEMO_PROMOTIONS[0]);

export const approvePromotionTransferStep = (id, data) =>
  safeFetch(`${BASE}/promotions/${id}/approve`, { method: 'PATCH', data }, DEMO_PROMOTIONS[0]);

export const executePromotionTransfer = id =>
  safeFetch(`${BASE}/promotions/${id}/execute`, { method: 'POST' }, DEMO_PROMOTIONS[0]);

// Overtime
export const getOvertimeRequests = (params = {}) =>
  safeFetch(
    `${BASE}/overtime`,
    { params },
    { requests: DEMO_OVERTIME, total: 2, page: 1, pages: 1 }
  );

export const getOvertimeRequestById = id =>
  safeFetch(`${BASE}/overtime/${id}`, {}, DEMO_OVERTIME[0]);

export const createOvertimeRequest = data =>
  safeFetch(`${BASE}/overtime`, { method: 'POST', data }, DEMO_OVERTIME[0]);

export const approveOvertimeStep = (id, data) =>
  safeFetch(`${BASE}/overtime/${id}/approve`, { method: 'PATCH', data }, DEMO_OVERTIME[0]);

export const getOvertimeStats = () =>
  safeFetch(
    `${BASE}/overtime/stats`,
    {},
    { total: 15, byStatus: [], byType: [], approved: { totalHours: 120, totalAmount: 9000 } }
  );

export const getOvertimeMonthlyReport = (month, year) =>
  safeFetch(
    `${BASE}/overtime/monthly-report`,
    { params: { month, year } },
    { month, year, employees: [], summary: { totalHours: 0, totalAmount: 0, totalRequests: 0 } }
  );

// Re-export demo data
export {
  DEMO_COMPLAINTS,
  DEMO_LOANS,
  DEMO_DISCIPLINARY,
  DEMO_LETTERS,
  DEMO_PROMOTIONS,
  DEMO_OVERTIME,
};
