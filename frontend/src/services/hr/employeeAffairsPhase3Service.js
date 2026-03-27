/**
 * Employee Affairs Phase 3 — Frontend API Service
 * خدمات واجهة المستخدم — المرحلة الثالثة
 *
 * 1. العقود  2. تسوية الإجازات  3. الإنذارات  4. إخلاء الطرف  5. تأشيرات الخروج والعودة  6. المزايا
 */
import { safeFetch } from './safeFetch';

const BASE = '/api/employee-affairs-phase3';

/* ═══════════════════ helpers ═══════════════════ */
const qs = params => {
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '' && v !== null) p.append(k, v);
  });
  return p.toString() ? `?${p}` : '';
};

/* ══════════════════════════════════════════════════════════════════════
   1. CONTRACTS — إدارة العقود
   ══════════════════════════════════════════════════════════════════════ */
export const fetchContracts = (params = {}) =>
  safeFetch(`${BASE}/contracts${qs(params)}`, demoContracts);

export const fetchContractById = id => safeFetch(`${BASE}/contracts/${id}`, demoContracts[0]);

export const createContract = data =>
  safeFetch(`${BASE}/contracts`, null, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

export const renewContract = (id, data) =>
  safeFetch(`${BASE}/contracts/${id}/renew`, null, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

export const amendContract = (id, data) =>
  safeFetch(`${BASE}/contracts/${id}/amend`, null, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

export const terminateContract = (id, data) =>
  safeFetch(`${BASE}/contracts/${id}/terminate`, null, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

export const fetchExpiringContracts = (days = 60) =>
  safeFetch(`${BASE}/contracts/expiring?days=${days}`, []);

export const fetchContractStats = () => safeFetch(`${BASE}/contracts/stats`, demoContractStats);

/* ══════════════════════════════════════════════════════════════════════
   2. VACATION SETTLEMENT — تسوية الإجازات
   ══════════════════════════════════════════════════════════════════════ */
export const fetchSettlements = (params = {}) =>
  safeFetch(`${BASE}/vacation-settlement${qs(params)}`, demoSettlements);

export const fetchSettlementById = id =>
  safeFetch(`${BASE}/vacation-settlement/${id}`, demoSettlements[0]);

export const createSettlement = data =>
  safeFetch(`${BASE}/vacation-settlement`, null, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

export const approveSettlement = (id, data) =>
  safeFetch(`${BASE}/vacation-settlement/${id}/approve`, null, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

export const disburseSettlement = (id, data) =>
  safeFetch(`${BASE}/vacation-settlement/${id}/disburse`, null, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

export const fetchSettlementStats = () =>
  safeFetch(`${BASE}/vacation-settlement/stats`, demoSettlementStats);

/* ══════════════════════════════════════════════════════════════════════
   3. WARNINGS — الإنذارات والمخالفات
   ══════════════════════════════════════════════════════════════════════ */
export const fetchWarnings = (params = {}) =>
  safeFetch(`${BASE}/warnings${qs(params)}`, demoWarnings);

export const fetchWarningById = id => safeFetch(`${BASE}/warnings/${id}`, demoWarnings[0]);

export const createWarning = data =>
  safeFetch(`${BASE}/warnings`, null, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

export const issueWarning = id =>
  safeFetch(`${BASE}/warnings/${id}/issue`, null, { method: 'PUT' });

export const acknowledgeWarning = (id, data) =>
  safeFetch(`${BASE}/warnings/${id}/acknowledge`, null, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

export const appealWarning = (id, data) =>
  safeFetch(`${BASE}/warnings/${id}/appeal`, null, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

export const fetchEmployeeWarnings = employeeId =>
  safeFetch(`${BASE}/warnings/employee/${employeeId}`, []);

export const fetchWarningStats = () => safeFetch(`${BASE}/warnings/stats`, demoWarningStats);

/* ══════════════════════════════════════════════════════════════════════
   4. CLEARANCE — إخلاء الطرف
   ══════════════════════════════════════════════════════════════════════ */
export const fetchClearances = (params = {}) =>
  safeFetch(`${BASE}/clearance${qs(params)}`, demoClearances);

export const fetchClearanceById = id => safeFetch(`${BASE}/clearance/${id}`, demoClearances[0]);

export const initiateClearance = data =>
  safeFetch(`${BASE}/clearance`, null, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

export const updateClearanceItem = (clearanceId, itemId, data) =>
  safeFetch(`${BASE}/clearance/${clearanceId}/item/${itemId}`, null, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

export const calculateFinalSettlement = (id, data) =>
  safeFetch(`${BASE}/clearance/${id}/settlement`, null, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

export const conductExitInterview = (id, data) =>
  safeFetch(`${BASE}/clearance/${id}/exit-interview`, null, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

export const fetchClearanceStats = () => safeFetch(`${BASE}/clearance/stats`, demoClearanceStats);

/* ══════════════════════════════════════════════════════════════════════
   5. EXIT/RE-ENTRY VISAS — تأشيرات الخروج والعودة
   ══════════════════════════════════════════════════════════════════════ */
export const fetchVisaRequests = (params = {}) =>
  safeFetch(`${BASE}/exit-visas${qs(params)}`, demoVisas);

export const fetchVisaById = id => safeFetch(`${BASE}/exit-visas/${id}`, demoVisas[0]);

export const createVisaRequest = data =>
  safeFetch(`${BASE}/exit-visas`, null, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

export const approveVisaRequest = (id, data) =>
  safeFetch(`${BASE}/exit-visas/${id}/approve`, null, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

export const issueVisaDoc = (id, data) =>
  safeFetch(`${BASE}/exit-visas/${id}/issue`, null, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

export const recordTravel = (id, data) =>
  safeFetch(`${BASE}/exit-visas/${id}/travel`, null, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

export const recordReturn = id =>
  safeFetch(`${BASE}/exit-visas/${id}/return`, null, { method: 'PUT' });

export const fetchExpiringVisas = (days = 30) =>
  safeFetch(`${BASE}/exit-visas/expiring?days=${days}`, []);

export const fetchVisaStats = () => safeFetch(`${BASE}/exit-visas/stats`, demoVisaStats);

/* ══════════════════════════════════════════════════════════════════════
   6. BENEFITS & ALLOWANCES — المزايا والبدلات
   ══════════════════════════════════════════════════════════════════════ */
export const fetchBenefitPackages = () =>
  safeFetch(`${BASE}/benefit-packages`, demoBenefitPackages);

export const createBenefitPackage = data =>
  safeFetch(`${BASE}/benefit-packages`, null, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

export const fetchEmployeeBenefits = (params = {}) =>
  safeFetch(`${BASE}/employee-benefits${qs(params)}`, demoEmployeeBenefits);

export const fetchEmployeeBenefitById = id =>
  safeFetch(`${BASE}/employee-benefits/${id}`, demoEmployeeBenefits[0]);

export const assignBenefit = data =>
  safeFetch(`${BASE}/employee-benefits`, null, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

export const adjustBenefitAllowance = (id, data) =>
  safeFetch(`${BASE}/employee-benefits/${id}/adjust`, null, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

export const claimAirTicket = (id, data) =>
  safeFetch(`${BASE}/employee-benefits/${id}/claim-ticket`, null, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

export const fetchBenefitStats = () =>
  safeFetch(`${BASE}/employee-benefits/stats`, demoBenefitStats);

/* PHASE 3 DASHBOARD */
export const fetchPhase3Dashboard = () => safeFetch(`${BASE}/phase3-dashboard`, {});

/* ══════════════════════════════════════════════════════════════════════
   DEMO DATA — بيانات تجريبية
   ══════════════════════════════════════════════════════════════════════ */
const demoContracts = [
  {
    _id: 'd1',
    contractNumber: 'CTR-2026-00001',
    employeeId: { firstName: 'أحمد', lastName: 'محمد', employeeNumber: 'EMP001' },
    contractType: 'دوام كامل',
    status: 'ساري',
    startDate: '2025-01-01',
    endDate: '2026-12-31',
    basicSalary: 8000,
    totalPackage: 15000,
  },
  {
    _id: 'd2',
    contractNumber: 'CTR-2026-00002',
    employeeId: { firstName: 'فاطمة', lastName: 'علي', employeeNumber: 'EMP002' },
    contractType: 'مؤقت',
    status: 'قيد التجديد',
    startDate: '2025-06-01',
    endDate: '2026-05-31',
    basicSalary: 6000,
    totalPackage: 10000,
  },
];
const demoContractStats = {
  total: 45,
  byStatus: [
    { _id: 'ساري', count: 30 },
    { _id: 'منتهي', count: 10 },
    { _id: 'قيد التجديد', count: 5 },
  ],
  byType: [
    { _id: 'دوام كامل', count: 35 },
    { _id: 'مؤقت', count: 10 },
  ],
  expiringSoon: 8,
};

const demoSettlements = [
  {
    _id: 's1',
    settlementNumber: 'VST-2026-00001',
    employeeId: { firstName: 'خالد', lastName: 'ناصر', employeeNumber: 'EMP003' },
    type: 'تسوية سنوية',
    status: 'معتمدة من المالية',
    settlementDays: 15,
    calculation: { dailyRate: 500, grossAmount: 7500, netAmount: 7200 },
  },
];
const demoSettlementStats = {
  total: 22,
  byStatus: [
    { _id: 'صرفت', count: 15 },
    { _id: 'قيد المراجعة', count: 7 },
  ],
  byType: [
    { _id: 'تسوية سنوية', count: 12 },
    { _id: 'نهاية خدمة', count: 10 },
  ],
  totalDisbursed: 250000,
};

const demoWarnings = [
  {
    _id: 'w1',
    warningNumber: 'WRN-2026-00001',
    employeeId: { firstName: 'عمر', lastName: 'حسن', employeeNumber: 'EMP004' },
    violationType: 'تأخر متكرر',
    warningLevel: 'إنذار كتابي أول',
    status: 'مُبلّغ',
    violationDate: '2026-03-01',
  },
];
const demoWarningStats = {
  total: 18,
  byLevel: [
    { _id: 'تنبيه شفهي', count: 8 },
    { _id: 'إنذار كتابي أول', count: 6 },
    { _id: 'إنذار كتابي ثاني', count: 4 },
  ],
  byType: [
    { _id: 'تأخر متكرر', count: 7 },
    { _id: 'غياب بدون إذن', count: 5 },
  ],
  byStatus: [
    { _id: 'نُفّذ', count: 12 },
    { _id: 'مُبلّغ', count: 6 },
  ],
};

const demoClearances = [
  {
    _id: 'c1',
    clearanceNumber: 'CLR-2026-00001',
    employeeId: { firstName: 'سعد', lastName: 'يوسف', employeeNumber: 'EMP005' },
    departureType: 'استقالة',
    status: 'قيد المعالجة',
    overallProgress: 40,
    lastWorkingDay: '2026-04-15',
    items: [
      { department: 'الموارد البشرية', status: 'مُخلى' },
      { department: 'تقنية المعلومات', status: 'معلّق' },
    ],
  },
];
const demoClearanceStats = {
  total: 12,
  byStatus: [
    { _id: 'مكتمل', count: 6 },
    { _id: 'قيد المعالجة', count: 4 },
    { _id: 'بُدء', count: 2 },
  ],
  byType: [
    { _id: 'استقالة', count: 5 },
    { _id: 'انتهاء عقد', count: 7 },
  ],
  avgProgress: 65,
};

const demoVisas = [
  {
    _id: 'v1',
    visaRequestNumber: 'EVR-2026-00001',
    employeeId: {
      firstName: 'ماجد',
      lastName: 'فهد',
      employeeNumber: 'EMP006',
      nationality: 'مصري',
    },
    visaType: 'خروج وعودة مفرد',
    status: 'صادر',
    departureDate: '2026-05-01',
    returnDate: '2026-05-20',
    destination: 'مصر',
  },
];
const demoVisaStats = {
  total: 30,
  byStatus: [
    { _id: 'صادر', count: 12 },
    { _id: 'مستخدم', count: 10 },
    { _id: 'منتهي', count: 8 },
  ],
  byType: [
    { _id: 'خروج وعودة مفرد', count: 18 },
    { _id: 'خروج وعودة متعدد', count: 8 },
    { _id: 'خروج نهائي', count: 4 },
  ],
  totalFees: 45000,
};

const demoBenefitPackages = [
  {
    _id: 'bp1',
    name: 'حزمة المدراء',
    packageCode: 'PKG-MGR',
    grade: 'مدير',
    isActive: true,
    allowances: { housingPercentage: 25, transportationFixed: 1500 },
  },
  {
    _id: 'bp2',
    name: 'حزمة الموظفين',
    packageCode: 'PKG-EMP',
    grade: 'موظف',
    isActive: true,
    allowances: { housingPercentage: 15, transportationFixed: 800 },
  },
];
const demoEmployeeBenefits = [
  {
    _id: 'eb1',
    benefitNumber: 'BNF-2026-00001',
    employeeId: { firstName: 'نورة', lastName: 'عبدالله', employeeNumber: 'EMP007' },
    packageId: { name: 'حزمة الموظفين', packageCode: 'PKG-EMP' },
    status: 'نشط',
    allowances: { totalMonthlyAllowances: 4500 },
    gosi: { employeeContribution: 780, employerContribution: 940 },
  },
];
const demoBenefitStats = {
  totalBenefits: 40,
  totalPackages: 4,
  byStatus: [
    { _id: 'نشط', count: 35 },
    { _id: 'معلّق', count: 5 },
  ],
  totalMonthlyAllowances: 180000,
};
