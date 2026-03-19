/**
 * payrollService.js — خدمة نظام الرواتب المتكاملة
 * Dedicated payroll frontend service with API + mock fallback
 */
import apiClient from './api.client';
import logger from '../utils/logger';

/* ─── Helpers ─── */
const safe = async (fn, fallback) => {
  try {
    const res = await fn();
    return res?.data ?? res ?? fallback;
  } catch (err) {
    logger.warn('payrollService fallback:', err?.message);
    return fallback;
  }
};

/* ─── Mock Data ─── */
const MOCK_EMPLOYEES_PAYROLL = [
  {
    _id: 'p1',
    employeeId: 'e1',
    employeeName: 'أحمد محمد الحربي',
    departmentName: 'تقنية المعلومات',
    month: '2026-03',
    baseSalary: 12000,
    totalAllowances: 4500,
    totalIncentives: 1500,
    totalDeductions: 1800,
    totalPenalties: 0,
    netPayable: 16200,
    status: 'approved',
    attendance: { presentDays: 22, absentDays: 0, leaveDays: 0, overtime: { regularOvertime: 8 } },
  },
  {
    _id: 'p2',
    employeeId: 'e2',
    employeeName: 'فاطمة أحمد السيد',
    departmentName: 'الموارد البشرية',
    month: '2026-03',
    baseSalary: 10000,
    totalAllowances: 3800,
    totalIncentives: 800,
    totalDeductions: 1500,
    totalPenalties: 200,
    netPayable: 12900,
    status: 'processed',
    attendance: { presentDays: 20, absentDays: 1, leaveDays: 1, overtime: { regularOvertime: 0 } },
  },
  {
    _id: 'p3',
    employeeId: 'e3',
    employeeName: 'خالد عمر الشهري',
    departmentName: 'المالية',
    month: '2026-03',
    baseSalary: 15000,
    totalAllowances: 5500,
    totalIncentives: 2000,
    totalDeductions: 2300,
    totalPenalties: 0,
    netPayable: 20200,
    status: 'transferred',
    attendance: { presentDays: 22, absentDays: 0, leaveDays: 0, overtime: { regularOvertime: 12 } },
  },
  {
    _id: 'p4',
    employeeId: 'e4',
    employeeName: 'نورة سعيد القحطاني',
    departmentName: 'التعليم',
    month: '2026-03',
    baseSalary: 9000,
    totalAllowances: 3200,
    totalIncentives: 600,
    totalDeductions: 1300,
    totalPenalties: 0,
    netPayable: 11500,
    status: 'paid',
    attendance: { presentDays: 21, absentDays: 0, leaveDays: 1, overtime: { regularOvertime: 4 } },
  },
  {
    _id: 'p5',
    employeeId: 'e5',
    employeeName: 'محمد علي الدوسري',
    departmentName: 'العلاج الطبيعي',
    month: '2026-03',
    baseSalary: 11000,
    totalAllowances: 4200,
    totalIncentives: 1000,
    totalDeductions: 1600,
    totalPenalties: 500,
    netPayable: 14100,
    status: 'draft',
    attendance: { presentDays: 19, absentDays: 2, leaveDays: 1, overtime: { regularOvertime: 2 } },
  },
  {
    _id: 'p6',
    employeeId: 'e6',
    employeeName: 'سارة خالد العتيبي',
    departmentName: 'الإدارة',
    month: '2026-03',
    baseSalary: 18000,
    totalAllowances: 6500,
    totalIncentives: 3000,
    totalDeductions: 2800,
    totalPenalties: 0,
    netPayable: 24700,
    status: 'paid',
    attendance: { presentDays: 22, absentDays: 0, leaveDays: 0, overtime: { regularOvertime: 0 } },
  },
  {
    _id: 'p7',
    employeeId: 'e7',
    employeeName: 'عبدالله ياسر الزهراني',
    departmentName: 'تقنية المعلومات',
    month: '2026-03',
    baseSalary: 8500,
    totalAllowances: 3100,
    totalIncentives: 400,
    totalDeductions: 1200,
    totalPenalties: 0,
    netPayable: 10800,
    status: 'pending-approval',
    attendance: { presentDays: 21, absentDays: 1, leaveDays: 0, overtime: { regularOvertime: 6 } },
  },
  {
    _id: 'p8',
    employeeId: 'e8',
    employeeName: 'ريم ناصر المالكي',
    departmentName: 'علاج النطق',
    month: '2026-03',
    baseSalary: 10500,
    totalAllowances: 3900,
    totalIncentives: 900,
    totalDeductions: 1500,
    totalPenalties: 0,
    netPayable: 13800,
    status: 'approved',
    attendance: { presentDays: 22, absentDays: 0, leaveDays: 0, overtime: { regularOvertime: 3 } },
  },
];

const MOCK_SALARY_SLIP = {
  _id: 'p1',
  employeeId: 'e1',
  employeeName: 'أحمد محمد الحربي',
  employeeEmail: 'ahmed@alawael.com',
  departmentName: 'تقنية المعلومات',
  month: '2026-03',
  year: 2026,
  baseSalary: 12000,
  allowances: [
    { name: 'housing', amount: 2500, description: 'بدل سكن' },
    { name: 'transportation', amount: 800, description: 'بدل نقل' },
    { name: 'communication', amount: 300, description: 'بدل اتصالات' },
    { name: 'performance', amount: 900, description: 'بدل أداء' },
  ],
  deductions: [
    {
      name: 'social-security',
      amount: 1080,
      calculationType: 'percentage',
      percentage: 9,
      description: 'التأمينات الاجتماعية (GOSI)',
    },
    { name: 'health-insurance', amount: 500, calculationType: 'fixed', description: 'تأمين طبي' },
    { name: 'income-tax', amount: 220, calculationType: 'tiered', description: 'ضريبة دخل' },
  ],
  attendance: {
    presentDays: 22,
    absentDays: 0,
    leaveDays: 0,
    unpaidLeaveDays: 0,
    workingDays: 22,
    overtime: { regularOvertime: 8, weekendOvertime: 0, holidayOvertime: 0 },
    lateArrivals: 1,
    earlyDepartures: 0,
  },
  incentives: {
    performanceBonus: 1000,
    attendanceBonus: 500,
    safetyBonus: 0,
    loyaltyBonus: 0,
    projectBonus: 0,
    seasonalBonus: 0,
  },
  penalties: { disciplinary: 0, attendance: 0, misconduct: 0 },
  calculations: {
    totalAllowances: 4500,
    totalIncentives: 1500,
    totalPenalties: 0,
    totalGross: 18000,
    totalDeductions: 1800,
    totalNet: 16200,
    netPayable: 16200,
  },
  taxes: { incomeTax: 220, socialSecurity: 1080, healthInsurance: 500, GOSI: 1080 },
  payment: {
    status: 'paid',
    paymentDate: '2026-03-28',
    paymentMethod: 'bank-transfer',
    bankAccount: 'SA44 2000 0001 2345 6789 0001',
    transactionReference: 'TXN-2026-03-001',
  },
  approvals: {
    preparedBy: { name: 'قسم الموارد البشرية', date: '2026-03-25' },
    approvedBy: { name: 'المدير المالي', date: '2026-03-26' },
  },
};

const MOCK_PAYROLL_SETTINGS = {
  gosiRate: { employee: 9, employer: 11 },
  healthInsurance: { fixed: 500, tiers: [] },
  taxBrackets: [
    { min: 0, max: 5000, rate: 0 },
    { min: 5001, max: 15000, rate: 5 },
    { min: 15001, max: 30000, rate: 10 },
    { min: 30001, max: Infinity, rate: 15 },
  ],
  allowanceDefaults: {
    housing: { percentage: 25, isFixed: false },
    transportation: { fixed: 800, isFixed: true },
    communication: { fixed: 300, isFixed: true },
  },
  workingDays: 22,
  overtimeRates: { regular: 1.5, weekend: 2.0, holiday: 3.0 },
  endOfServiceRates: { first5Years: 0.5, after5Years: 1.0 },
  currency: 'SAR',
  paymentDay: 28,
};

const MOCK_EOS = [
  {
    _id: 'eos1',
    employeeName: 'سامي سعود الغامدي',
    joinDate: '2018-03-15',
    endDate: '2026-03-12',
    yearsOfService: 8,
    lastSalary: 14000,
    totalAllowances: 5000,
    totalComp: 19000,
    eosAmount: 114000,
    reason: 'resignation',
    status: 'calculated',
  },
  {
    _id: 'eos2',
    employeeName: 'منى حسن العسيري',
    joinDate: '2021-08-01',
    endDate: '2026-02-28',
    yearsOfService: 4.6,
    lastSalary: 10500,
    totalAllowances: 3800,
    totalComp: 14300,
    eosAmount: 32890,
    reason: 'end-of-contract',
    status: 'approved',
  },
  {
    _id: 'eos3',
    employeeName: 'عادل عبدالرحمن',
    joinDate: '2015-01-10',
    endDate: '2026-01-31',
    yearsOfService: 11,
    lastSalary: 20000,
    totalAllowances: 7500,
    totalComp: 27500,
    eosAmount: 233750,
    reason: 'retirement',
    status: 'paid',
  },
];

/* ─── API Methods ─── */
const payrollService = {
  /* Monthly payroll list */
  getMonthlyPayroll: (month, year) =>
    safe(() => apiClient.get(`/payroll/monthly/${month}/${year}`), MOCK_EMPLOYEES_PAYROLL),

  /* Single payroll / salary slip */
  getSalarySlip: payrollId => safe(() => apiClient.get(`/payroll/${payrollId}`), MOCK_SALARY_SLIP),

  /* Employee annual history */
  getEmployeePayrollHistory: (employeeId, year) =>
    safe(
      () => apiClient.get(`/payroll/employee/${employeeId}/year/${year}`),
      Array.from({ length: 12 }, (_, i) => ({
        ...MOCK_SALARY_SLIP,
        month: `${year}-${String(i + 1).padStart(2, '0')}`,
        calculations: {
          ...MOCK_SALARY_SLIP.calculations,
          netPayable: 15500 + Math.round(Math.random() * 2000),
        },
      }))
    ),

  /* Create single payroll */
  createPayroll: data =>
    safe(() => apiClient.post('/payroll/create', data), {
      ...data,
      _id: Date.now().toString(),
      status: 'draft',
    }),

  /* Process monthly batch */
  processMonthlyBatch: (month, year) =>
    safe(() => apiClient.post('/payroll/process-monthly', { month, year }), {
      processed: MOCK_EMPLOYEES_PAYROLL.length,
      month,
      year,
      status: 'completed',
    }),

  /* Approval workflow */
  submitForApproval: payrollId =>
    safe(() => apiClient.put(`/payroll/${payrollId}/submit-approval`), {
      status: 'pending-approval',
    }),
  approvePayroll: payrollId =>
    safe(() => apiClient.put(`/payroll/${payrollId}/approve`), { status: 'approved' }),
  processPayroll: payrollId =>
    safe(() => apiClient.put(`/payroll/${payrollId}/process`), { status: 'processed' }),
  transferPayroll: payrollId =>
    safe(() => apiClient.put(`/payroll/${payrollId}/transfer`), { status: 'transferred' }),
  confirmPayment: payrollId =>
    safe(() => apiClient.put(`/payroll/${payrollId}/confirm-payment`), { status: 'paid' }),

  /* Payroll stats */
  getPayrollStats: (month, year) =>
    safe(() => apiClient.get(`/payroll/stats/${month}/${year}`), {
      totalEmployees: MOCK_EMPLOYEES_PAYROLL.length,
      totalGross: MOCK_EMPLOYEES_PAYROLL.reduce(
        (s, p) => s + (p.baseSalary + p.totalAllowances + p.totalIncentives),
        0
      ),
      totalDeductions: MOCK_EMPLOYEES_PAYROLL.reduce((s, p) => s + p.totalDeductions, 0),
      totalNet: MOCK_EMPLOYEES_PAYROLL.reduce((s, p) => s + p.netPayable, 0),
      byStatus: {
        draft: 1,
        'pending-approval': 1,
        approved: 2,
        processed: 1,
        transferred: 1,
        paid: 2,
      },
    }),

  /* Settings */
  getPayrollSettings: () => safe(() => apiClient.get('/payroll/settings'), MOCK_PAYROLL_SETTINGS),
  updatePayrollSettings: data =>
    safe(() => apiClient.put('/payroll/settings', data), { ...MOCK_PAYROLL_SETTINGS, ...data }),

  /* End of Service */
  calculateEOS: data =>
    safe(() => apiClient.post('/payroll/end-of-service/calculate', data), MOCK_EOS[0]),
  getEOSHistory: () => safe(() => apiClient.get('/payroll/end-of-service'), MOCK_EOS),

  /* Reports */
  generateWPSReport: (month, year) =>
    safe(() => apiClient.get(`/payroll/reports/wps/${month}/${year}`), {
      type: 'WPS',
      reportName: 'تقرير حماية الأجور',
      month,
      year,
      records: MOCK_EMPLOYEES_PAYROLL.length,
      totalAmount: 124200,
      summary: {
        totalBaseSalary: 84000,
        totalHousingAllowance: 21000,
        totalOtherAllowances: 9800,
        totalDeductions: 11900,
        totalNetSalary: 124200,
      },
      employees: MOCK_EMPLOYEES_PAYROLL.map((p, i) => ({
        sequenceNumber: i + 1,
        employeeName: p.employeeName,
        baseSalary: p.baseSalary,
        housingAllowance: Math.round(p.baseSalary * 0.25),
        otherAllowances: p.totalAllowances - Math.round(p.baseSalary * 0.25),
        deductions: p.totalDeductions,
        netSalary: p.netPayable,
      })),
      generatedAt: new Date().toISOString(),
      format: 'SIF',
    }),
  generateGOSIReport: (month, year) =>
    safe(() => apiClient.get(`/payroll/reports/gosi/${month}/${year}`), {
      type: 'GOSI',
      reportName: 'تقرير التأمينات الاجتماعية',
      month,
      year,
      records: MOCK_EMPLOYEES_PAYROLL.length,
      totalContribution: 18800,
      summary: {
        totalEmployees: MOCK_EMPLOYEES_PAYROLL.length,
        totalContributionBase: 105000,
        totalEmployeeContribution: 9450,
        totalEmployerContribution: 11550,
        totalContribution: 21000,
      },
      breakdown: {
        saudi: { count: 5, totalContribution: 14000 },
        nonSaudi: { count: 3, totalContribution: 7000 },
      },
      employees: MOCK_EMPLOYEES_PAYROLL.map(p => ({
        employeeName: p.employeeName,
        baseSalary: p.baseSalary,
        contributionBase: p.baseSalary + Math.round(p.baseSalary * 0.25),
        employeeContribution: Math.round(p.baseSalary * 0.09),
        employerContribution: Math.round(p.baseSalary * 0.11),
        totalContribution: Math.round(p.baseSalary * 0.2),
      })),
      generatedAt: new Date().toISOString(),
    }),
  generateBankTransferFile: (month, year) =>
    safe(() => apiClient.get(`/payroll/reports/bank-transfer/${month}/${year}`), {
      type: 'BankTransfer',
      reportName: 'ملف التحويل البنكي',
      month,
      year,
      records: MOCK_EMPLOYEES_PAYROLL.length,
      totalAmount: 124200,
      byBank: [
        { bankName: 'البنك الأهلي', transferCount: 4, totalAmount: 65400 },
        { bankName: 'بنك الراجحي', transferCount: 3, totalAmount: 39600 },
        { bankName: 'بنك الرياض', transferCount: 1, totalAmount: 19200 },
      ],
      transfers: MOCK_EMPLOYEES_PAYROLL.map((p, i) => ({
        sequenceNumber: i + 1,
        employeeName: p.employeeName,
        amount: p.netPayable,
        bankName: ['البنك الأهلي', 'بنك الراجحي', 'بنك الرياض'][i % 3],
        currency: 'SAR',
      })),
      generatedAt: new Date().toISOString(),
    }),
  generateDepartmentComparison: (month, year) =>
    safe(() => apiClient.get(`/payroll/reports/department-comparison/${month}/${year}`), {
      type: 'DepartmentComparison',
      reportName: 'تقرير مقارنة الأقسام',
      month,
      year,
      totalDepartments: 6,
      totalEmployees: MOCK_EMPLOYEES_PAYROLL.length,
      grandTotalNet: 124200,
      grandTotalGross: 146000,
      departments: [
        {
          name: 'الإدارة',
          employeeCount: 1,
          totalNet: 24700,
          averageNet: 24700,
          costPercentage: 19.9,
        },
        {
          name: 'المالية',
          employeeCount: 1,
          totalNet: 20200,
          averageNet: 20200,
          costPercentage: 16.3,
        },
        {
          name: 'تقنية المعلومات',
          employeeCount: 2,
          totalNet: 27000,
          averageNet: 13500,
          costPercentage: 21.7,
        },
        {
          name: 'الموارد البشرية',
          employeeCount: 1,
          totalNet: 12900,
          averageNet: 12900,
          costPercentage: 10.4,
        },
        {
          name: 'العلاج الطبيعي',
          employeeCount: 1,
          totalNet: 14100,
          averageNet: 14100,
          costPercentage: 11.4,
        },
        {
          name: 'علاج النطق',
          employeeCount: 1,
          totalNet: 13800,
          averageNet: 13800,
          costPercentage: 11.1,
        },
        {
          name: 'التعليم',
          employeeCount: 1,
          totalNet: 11500,
          averageNet: 11500,
          costPercentage: 9.3,
        },
      ],
      generatedAt: new Date().toISOString(),
    }),
  generateAnnualSummary: year =>
    safe(() => apiClient.get(`/payroll/reports/annual-summary/${year}`), {
      type: 'AnnualSummary',
      reportName: 'التقرير السنوي للرواتب',
      year,
      monthlyBreakdown: Array.from({ length: 12 }, (_, i) => ({
        month: i + 1,
        monthName: [
          'يناير',
          'فبراير',
          'مارس',
          'أبريل',
          'مايو',
          'يونيو',
          'يوليو',
          'أغسطس',
          'سبتمبر',
          'أكتوبر',
          'نوفمبر',
          'ديسمبر',
        ][i],
        employeeCount: i < 3 ? 8 : 0,
        totalGross: i < 3 ? 146000 + Math.round(Math.random() * 5000) : 0,
        totalNet: i < 3 ? 124200 + Math.round(Math.random() * 4000) : 0,
        totalDeductions: i < 3 ? 11900 + Math.round(Math.random() * 1000) : 0,
        totalAllowances: i < 3 ? 30800 : 0,
        totalIncentives: i < 3 ? 10300 : 0,
        totalPenalties: i < 3 ? 700 : 0,
        totalBaseSalary: i < 3 ? 84000 : 0,
      })),
      annualTotals: {
        totalNet: 372600,
        totalGross: 438000,
        totalDeductions: 35700,
        totalAllowances: 92400,
        totalIncentives: 30900,
        totalBaseSalary: 252000,
        totalEmployeeMonths: 24,
        totalPenalties: 2100,
      },
      averageMonthlyPayroll: 124200,
      departmentSummary: [
        { department: 'تقنية المعلومات', totalNet: 81000, records: 6, averageNet: 13500 },
        { department: 'الإدارة', totalNet: 74100, records: 3, averageNet: 24700 },
        { department: 'المالية', totalNet: 60600, records: 3, averageNet: 20200 },
      ],
      generatedAt: new Date().toISOString(),
    }),
  generateVarianceReport: (month, year) =>
    safe(() => apiClient.get(`/payroll/reports/variance/${month}/${year}`), {
      type: 'Variance',
      reportName: 'تقرير الفروقات الشهرية',
      currentPeriod: { month, year },
      previousPeriod: { month: month > 1 ? month - 1 : 12, year: month > 1 ? year : year - 1 },
      variance: {
        employeeCount: { current: 8, previous: 7, change: 1, percentageChange: 14.3 },
        totalNet: { current: 124200, previous: 112500, change: 11700, percentageChange: 10.4 },
        totalGross: { current: 146000, previous: 131000, change: 15000, percentageChange: 11.5 },
        totalDeductions: { current: 11900, previous: 10800, change: 1100, percentageChange: 10.2 },
        totalBaseSalary: { current: 84000, previous: 78000, change: 6000, percentageChange: 7.7 },
        totalAllowances: { current: 30800, previous: 28000, change: 2800, percentageChange: 10.0 },
        totalIncentives: { current: 10300, previous: 8500, change: 1800, percentageChange: 21.2 },
      },
      employeeChanges: {
        newEmployees: [
          { name: 'عبدالله ياسر الزهراني', department: 'تقنية المعلومات', netSalary: 10800 },
        ],
        removedEmployees: [],
        significantSalaryChanges: [
          {
            name: 'خالد عمر الشهري',
            department: 'المالية',
            previousNet: 18500,
            currentNet: 20200,
            change: 1700,
            percentageChange: 9.2,
          },
        ],
      },
      generatedAt: new Date().toISOString(),
    }),
  generateDeductionsReport: (month, year) =>
    safe(() => apiClient.get(`/payroll/reports/deductions/${month}/${year}`), {
      type: 'Deductions',
      reportName: 'تقرير الخصومات التفصيلي',
      month,
      year,
      records: MOCK_EMPLOYEES_PAYROLL.length,
      totalDeductions: MOCK_EMPLOYEES_PAYROLL.reduce((s, p) => s + p.totalDeductions, 0),
      categories: {
        incomeTax: { label: 'ضريبة الدخل', total: 1760, count: 8 },
        socialSecurity: { label: 'التأمينات الاجتماعية', total: 7560, count: 8 },
        healthInsurance: { label: 'التأمين الصحي', total: 4000, count: 8 },
        penalties: { label: 'العقوبات', total: 700, count: 2 },
      },
      details: MOCK_EMPLOYEES_PAYROLL.map(p => ({
        name: p.employeeName,
        department: p.departmentName,
        incomeTax: Math.round(p.baseSalary * 0.02),
        socialSecurity: Math.round(p.baseSalary * 0.09),
        healthInsurance: 500,
        penalties: p.totalPenalties,
        totalDeductions: p.totalDeductions,
      })),
      generatedAt: new Date().toISOString(),
    }),
  generateEmployeeCostReport: (employeeId, year) =>
    safe(() => apiClient.get(`/payroll/reports/employee-cost/${employeeId}/${year}`), null),

  /* Mock getters for direct access */
  getMockPayroll: () => MOCK_EMPLOYEES_PAYROLL,
  getMockSlip: () => MOCK_SALARY_SLIP,
  getMockSettings: () => MOCK_PAYROLL_SETTINGS,
  getMockEOS: () => MOCK_EOS,
};

export default payrollService;
