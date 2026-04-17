'use strict';

/* ── Mocks ── */
jest.mock('../../models/payroll.model', () => ({ find: jest.fn() }));
jest.mock('../../models/HR/Employee', () => ({ findById: jest.fn() }));
jest.mock('../../utils/logger', () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

const Payroll = require('../../models/payroll.model');
const Employee = require('../../models/HR/Employee');
const Svc = require('../../services/payrollReportService');

/* ── Helpers ── */
/** Chainable query that resolves to `data` when awaited */
function Q(data) {
  const c = {};
  c.populate = jest.fn(() => c);
  c.sort = jest.fn(() => c);
  c.then = (res, rej) => Promise.resolve(data).then(res, rej);
  c.catch = fn => Promise.resolve(data).catch(fn);
  return c;
}

function mkPayroll(overrides = {}) {
  return {
    employeeId: {
      _id: 'emp1',
      fullName: 'Ali Ahmed',
      nationalId: '1234567890',
      bankAccount: 'SA001',
      bankName: 'AlRajhi',
      iqamaNumber: 'IQ001',
      nationality: 'SA',
      gosiNumber: 'G001',
      dateOfBirth: '1990-01-01',
    },
    employeeName: 'Ali Ahmed',
    month: '03',
    year: 2025,
    baseSalary: 5000,
    departmentName: 'IT',
    allowances: [
      { name: 'housing', amount: 1250 },
      { name: 'transport', amount: 500 },
    ],
    calculations: {
      totalAllowances: 1750,
      totalIncentives: 500,
      totalDeductions: 300,
      totalPenalties: 100,
      totalGross: 7250,
      totalNet: 6950,
      netPayable: 6950,
    },
    taxes: {
      socialSecurity: 450,
      gosi: 200,
      incomeTax: 0,
      healthInsurance: 150,
    },
    payment: { status: 'approved', bankAccount: 'SA001', bankName: 'AlRajhi' },
    deductions: [
      { name: 'loan-deduction', amount: 100 },
      { name: 'other-ded', amount: 50 },
    ],
    ...overrides,
  };
}

beforeEach(() => jest.clearAllMocks());

// ═══════════════════════════════════════════════════════════════
describe('PayrollReportService', () => {
  // ─────── WPS ───────
  describe('generateWPSReport', () => {
    it('builds WPS report with one record', async () => {
      Payroll.find.mockReturnValue(Q([mkPayroll()]));
      const r = await Svc.generateWPSReport(3, 2025);
      expect(r.type).toBe('WPS');
      expect(r.records).toBe(1);
      expect(r.summary.totalBaseSalary).toBe(5000);
      expect(r.summary.totalNetSalary).toBe(6950);
      expect(r.employees[0].sequenceNumber).toBe(1);
      expect(r.employees[0].baseSalary).toBe(5000);
      expect(r.employees[0].housingAllowance).toBe(1250);
      expect(r.format).toBe('SIF');
    });

    it('returns zero totals for empty payrolls', async () => {
      Payroll.find.mockReturnValue(Q([]));
      const r = await Svc.generateWPSReport(1, 2025);
      expect(r.records).toBe(0);
      expect(r.totalAmount).toBe(0);
    });
  });

  // ─────── GOSI ───────
  describe('generateGOSIReport', () => {
    it('splits Saudi vs non-Saudi', async () => {
      const saudi = mkPayroll();
      const nonSaudi = mkPayroll({
        employeeName: 'Bob',
        employeeId: { ...mkPayroll().employeeId, nationality: 'US', _id: 'emp2' },
      });
      Payroll.find.mockReturnValue(Q([saudi, nonSaudi]));

      const r = await Svc.generateGOSIReport(3, 2025);
      expect(r.type).toBe('GOSI');
      expect(r.breakdown.saudi.count).toBe(1);
      expect(r.breakdown.nonSaudi.count).toBe(1);
      expect(r.summary.totalEmployees).toBe(2);
    });

    it('calculates employee + employer contributions', async () => {
      Payroll.find.mockReturnValue(Q([mkPayroll()]));
      const r = await Svc.generateGOSIReport(3, 2025);
      const emp = r.employees[0];
      expect(emp.employeeContribution).toBe(450);
      expect(emp.employerContribution).toBe(550);
      expect(emp.contributionBase).toBe(5000 + 1250);
    });
  });

  // ─────── Bank Transfer ───────
  describe('generateBankTransferReport', () => {
    it('groups transfers by bank', async () => {
      const p1 = mkPayroll();
      const p2 = mkPayroll({
        employeeName: 'Sara',
        employeeId: { ...mkPayroll().employeeId, _id: 'emp2', bankName: 'SNB' },
        payment: { status: 'approved', bankAccount: 'SA002', bankName: 'SNB' },
      });
      Payroll.find.mockReturnValue(Q([p1, p2]));

      const r = await Svc.generateBankTransferReport(3, 2025);
      expect(r.type).toBe('BankTransfer');
      expect(r.records).toBe(2);
      expect(r.byBank.length).toBe(2);
      expect(r.totalAmount).toBe(6950 * 2);
    });
  });

  // ─────── Department Comparison ───────
  describe('generateDepartmentComparisonReport', () => {
    it('computes department stats', async () => {
      Payroll.find.mockReturnValue(
        Q([
          mkPayroll(),
          mkPayroll({
            departmentName: 'HR',
            baseSalary: 4000,
            calculations: { ...mkPayroll().calculations, totalNet: 5500, totalGross: 6000 },
          }),
        ])
      );

      const r = await Svc.generateDepartmentComparisonReport(3, 2025);
      expect(r.type).toBe('DepartmentComparison');
      expect(r.totalDepartments).toBe(2);
      expect(r.departments[0].costPercentage).toBeGreaterThan(0);
    });

    it('handles empty payrolls', async () => {
      Payroll.find.mockReturnValue(Q([]));
      const r = await Svc.generateDepartmentComparisonReport(3, 2025);
      expect(r.totalDepartments).toBe(0);
      expect(r.grandTotalNet).toBe(0);
    });
  });

  // ─────── Annual Summary ───────
  describe('generateAnnualSummaryReport', () => {
    it('aggregates monthly data', async () => {
      Payroll.find.mockReturnValue(
        Q([mkPayroll({ month: '01' }), mkPayroll({ month: '02' }), mkPayroll({ month: '03' })])
      );

      const r = await Svc.generateAnnualSummaryReport(2025);
      expect(r.type).toBe('AnnualSummary');
      expect(r.annualTotals.totalEmployeeMonths).toBe(3);
      expect(r.annualTotals.totalNet).toBe(6950 * 3);
      expect(r.monthlyBreakdown.length).toBe(12);
    });

    it('produces growth data', async () => {
      Payroll.find.mockReturnValue(
        Q([
          mkPayroll({ month: '01', calculations: { ...mkPayroll().calculations, totalNet: 5000 } }),
          mkPayroll({ month: '02', calculations: { ...mkPayroll().calculations, totalNet: 6000 } }),
        ])
      );

      const r = await Svc.generateAnnualSummaryReport(2025);
      expect(r.monthOverMonthGrowth.length).toBe(1);
      expect(r.monthOverMonthGrowth[0].growth).toBe(20);
    });
  });

  // ─────── Variance ───────
  describe('generateVarianceReport', () => {
    it('compares current vs previous month', async () => {
      const curr = mkPayroll({
        month: '03',
        baseSalary: 6000,
        calculations: { ...mkPayroll().calculations, totalNet: 7500 },
      });
      const prev = mkPayroll({ month: '02', baseSalary: 5000 });

      Payroll.find.mockReturnValueOnce(Q([curr])).mockReturnValueOnce(Q([prev]));

      const r = await Svc.generateVarianceReport(3, 2025);
      expect(r.type).toBe('Variance');
      expect(r.variance.totalBaseSalary.current).toBe(6000);
      expect(r.variance.totalBaseSalary.previous).toBe(5000);
      expect(r.variance.totalBaseSalary.change).toBe(1000);
    });

    it('January wraps to December of previous year', async () => {
      Payroll.find.mockReturnValueOnce(Q([mkPayroll({ month: '01' })])).mockReturnValueOnce(Q([]));

      const r = await Svc.generateVarianceReport(1, 2025);
      expect(r.previousPeriod.month).toBe(12);
      expect(r.previousPeriod.year).toBe(2024);
    });

    it('detects new + removed employees', async () => {
      const currOnly = mkPayroll({ employeeId: 'new1', employeeName: 'Newbie' });
      const prevOnly = mkPayroll({ employeeId: 'gone1', employeeName: 'Gone Guy' });
      const both = mkPayroll({ employeeId: 'stay1' });

      Payroll.find
        .mockReturnValueOnce(Q([currOnly, both]))
        .mockReturnValueOnce(Q([prevOnly, both]));

      const r = await Svc.generateVarianceReport(3, 2025);
      expect(r.employeeChanges.newEmployees.length).toBe(1);
      expect(r.employeeChanges.removedEmployees.length).toBe(1);
    });

    it('detects significant salary changes (>5%)', async () => {
      const currData = mkPayroll({
        employeeId: 'emp1',
        calculations: { ...mkPayroll().calculations, totalNet: 7500 },
      });
      const prevData = mkPayroll({
        employeeId: 'emp1',
        calculations: { ...mkPayroll().calculations, totalNet: 6950 },
      });

      Payroll.find.mockReturnValueOnce(Q([currData])).mockReturnValueOnce(Q([prevData]));

      const r = await Svc.generateVarianceReport(3, 2025);
      expect(r.employeeChanges.significantSalaryChanges.length).toBe(1);
      expect(r.employeeChanges.significantSalaryChanges[0].percentageChange).toBeGreaterThan(5);
    });
  });

  // ─────── Employee Cost ───────
  describe('generateEmployeeCostReport', () => {
    it('returns employee cost breakdown', async () => {
      Employee.findById.mockResolvedValue({
        _id: 'emp1',
        fullName: 'Ali Ahmed',
        departmentName: 'IT',
        jobTitle: 'Dev',
        baseSalary: 5000,
      });
      Payroll.find.mockReturnValue(Q([mkPayroll({ month: '01' }), mkPayroll({ month: '02' })]));

      const r = await Svc.generateEmployeeCostReport('emp1', 2025);
      expect(r.type).toBe('EmployeeCost');
      expect(r.employee.name).toBe('Ali Ahmed');
      expect(r.monthlyBreakdown.length).toBe(2);
      expect(r.annualTotals.monthsWorked).toBe(2);
    });

    it('throws for missing employee', async () => {
      Employee.findById.mockResolvedValue(null);
      await expect(Svc.generateEmployeeCostReport('bad', 2025)).rejects.toThrow(
        'خطأ في توليد تقرير تكلفة الموظف'
      );
    });
  });

  // ─────── Deductions ───────
  describe('generateDeductionsReport', () => {
    it('categorizes deductions', async () => {
      Payroll.find.mockReturnValue(Q([mkPayroll()]));

      const r = await Svc.generateDeductionsReport(3, 2025);
      expect(r.type).toBe('Deductions');
      expect(r.records).toBe(1);
      expect(r.categories.socialSecurity.total).toBe(450);
      expect(r.categories.healthInsurance.total).toBe(150);
      expect(r.categories.loanDeduction.total).toBe(100);
      expect(r.details.length).toBe(1);
    });

    it('handles payroll with no taxes or deductions', async () => {
      Payroll.find.mockReturnValue(
        Q([
          mkPayroll({
            taxes: {},
            deductions: [],
            calculations: { totalDeductions: 0, totalPenalties: 0 },
          }),
        ])
      );

      const r = await Svc.generateDeductionsReport(3, 2025);
      expect(r.totalDeductions).toBe(0);
    });
  });

  // ─────── Error propagation ───────
  describe('error handling', () => {
    it('wraps DB errors in Arabic messages', async () => {
      Payroll.find.mockImplementation(() => {
        throw new Error('DB down');
      });
      await expect(Svc.generateWPSReport(3, 2025)).rejects.toThrow(
        'خطأ في توليد تقرير حماية الأجور'
      );
      await expect(Svc.generateDepartmentComparisonReport(3, 2025)).rejects.toThrow(
        'خطأ في توليد تقرير مقارنة الأقسام'
      );
    });
  });
});
