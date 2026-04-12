/**
 * Unit tests for services/payrollReportService.js
 * PayrollReportService — Static methods for payroll reports (WPS, GOSI, Bank, Dept, Annual, Variance, Employee, Deductions)
 */

/* ─── mocks ─────────────────────────────────────────────────────────── */

const mockPayrollFind = jest.fn();
const mockEmployeeFindById = jest.fn();

jest.mock('../../models/payroll.model', () => ({
  find: (...a) => mockPayrollFind(...a),
}));

jest.mock('../../models/Employee', () => ({
  findById: (...a) => mockEmployeeFindById(...a),
}));

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

const Service = require('../../services/payrollReportService');

/* ─── helpers ───────────────────────────────────────────────────────── */

function fakePayroll(overrides = {}) {
  return {
    _id: 'p1',
    employeeId: {
      _id: 'e1',
      fullName: 'Ahmed',
      nationalId: '1234567890',
      bankAccount: 'SA001',
      bankName: 'Rajhi',
      iqamaNumber: 'IQ001',
      nationality: 'SA',
      gosiNumber: 'G001',
    },
    employeeName: 'Ahmed Ali',
    departmentName: 'Engineering',
    baseSalary: 10000,
    month: '06',
    year: 2025,
    payment: { status: 'approved', bankAccount: 'SA001', bankName: 'Rajhi' },
    calculations: {
      totalAllowances: 3000,
      totalIncentives: 500,
      totalDeductions: 1000,
      totalPenalties: 200,
      totalGross: 13500,
      totalNet: 12300,
    },
    allowances: [
      { name: 'housing', amount: 2000 },
      { name: 'transport', amount: 1000 },
    ],
    deductions: [{ name: 'gosi', amount: 975 }],
    taxes: { socialSecurity: 900, gosi: 975, incomeTax: 0, healthInsurance: 100 },
    ...overrides,
  };
}

function chainPopulate(data) {
  return { populate: jest.fn().mockResolvedValue(data) };
}

function chainSort(data) {
  return { sort: jest.fn().mockResolvedValue(data) };
}

/* ─── tests ─────────────────────────────────────────────────────────── */

describe('PayrollReportService', () => {
  beforeEach(() => jest.clearAllMocks());

  // ── generateWPSReport ────────────────────────────────────────────

  describe('generateWPSReport', () => {
    it('returns WPS report with records', async () => {
      mockPayrollFind.mockReturnValue(chainPopulate([fakePayroll()]));

      const result = await Service.generateWPSReport(6, 2025);

      expect(result.type).toBe('WPS');
      expect(result.month).toBe(6);
      expect(result.year).toBe(2025);
      expect(result.records).toBe(1);
      expect(result.employees).toHaveLength(1);
      expect(result.employees[0].baseSalary).toBe(10000);
      expect(result.format).toBe('SIF');
    });

    it('handles empty payrolls', async () => {
      mockPayrollFind.mockReturnValue(chainPopulate([]));

      const result = await Service.generateWPSReport(1, 2025);

      expect(result.records).toBe(0);
      expect(result.totalAmount).toBe(0);
    });

    it('throws on DB error', async () => {
      mockPayrollFind.mockReturnValue({ populate: jest.fn().mockRejectedValue(new Error('DB')) });

      await expect(Service.generateWPSReport(1, 2025)).rejects.toThrow('حماية الأجور');
    });
  });

  // ── generateGOSIReport ───────────────────────────────────────────

  describe('generateGOSIReport', () => {
    it('returns GOSI contributions', async () => {
      mockPayrollFind.mockReturnValue(chainPopulate([fakePayroll()]));

      const result = await Service.generateGOSIReport(6, 2025);

      expect(result.type).toBe('GOSI');
      expect(result.records).toBe(1);
      expect(result.employees).toHaveLength(1);
      expect(result.breakdown.saudi.count).toBe(1);
    });

    it('separates saudi from non-saudi', async () => {
      const saudi = fakePayroll();
      const nonSaudi = fakePayroll({
        _id: 'p2',
        employeeId: { ...fakePayroll().employeeId, _id: 'e2', nationality: 'EG' },
      });
      mockPayrollFind.mockReturnValue(chainPopulate([saudi, nonSaudi]));

      const result = await Service.generateGOSIReport(6, 2025);

      expect(result.breakdown.saudi.count).toBe(1);
      expect(result.breakdown.nonSaudi.count).toBe(1);
    });

    it('handles empty payrolls', async () => {
      mockPayrollFind.mockReturnValue(chainPopulate([]));

      const result = await Service.generateGOSIReport(1, 2025);

      expect(result.records).toBe(0);
    });
  });

  // ── generateBankTransferReport ───────────────────────────────────

  describe('generateBankTransferReport', () => {
    it('returns bank transfer records grouped by bank', async () => {
      mockPayrollFind.mockReturnValue(chainPopulate([fakePayroll()]));

      const result = await Service.generateBankTransferReport(6, 2025);

      expect(result.type).toBe('BankTransfer');
      expect(result.transfers).toHaveLength(1);
      expect(result.byBank).toHaveLength(1);
      expect(result.byBank[0].bankName).toBe('Rajhi');
    });

    it('aggregates by bank correctly for multiple employees', async () => {
      const p1 = fakePayroll();
      const p2 = fakePayroll({
        _id: 'p2',
        employeeId: { ...fakePayroll().employeeId, bankName: 'NCB', bankAccount: 'SA002' },
        payment: { status: 'approved', bankName: 'NCB', bankAccount: 'SA002' },
      });
      mockPayrollFind.mockReturnValue(chainPopulate([p1, p2]));

      const result = await Service.generateBankTransferReport(6, 2025);

      expect(result.byBank).toHaveLength(2);
    });

    it('handles empty', async () => {
      mockPayrollFind.mockReturnValue(chainPopulate([]));

      const result = await Service.generateBankTransferReport(1, 2025);

      expect(result.totalAmount).toBe(0);
    });
  });

  // ── generateDepartmentComparisonReport ───────────────────────────

  describe('generateDepartmentComparisonReport', () => {
    it('groups payrolls by department', async () => {
      const eng = fakePayroll();
      const hr = fakePayroll({ _id: 'p2', departmentName: 'HR' });
      mockPayrollFind.mockResolvedValue([eng, hr]);

      const result = await Service.generateDepartmentComparisonReport(6, 2025);

      expect(result.type).toBe('DepartmentComparison');
      expect(result.totalDepartments).toBe(2);
      expect(result.departments.find(d => d.name === 'HR')).toBeTruthy();
    });

    it('calculates statistics per department', async () => {
      mockPayrollFind.mockResolvedValue([fakePayroll()]);

      const result = await Service.generateDepartmentComparisonReport(6, 2025);

      const dept = result.departments[0];
      expect(dept.employeeCount).toBe(1);
      expect(dept.totalBaseSalary).toBe(10000);
      expect(dept.averageNet).toBe(12300);
      expect(dept.costPercentage).toBe(100);
    });

    it('handles empty', async () => {
      mockPayrollFind.mockResolvedValue([]);

      const result = await Service.generateDepartmentComparisonReport(1, 2025);

      expect(result.totalDepartments).toBe(0);
    });
  });

  // ── generateAnnualSummaryReport ──────────────────────────────────

  describe('generateAnnualSummaryReport', () => {
    it('returns annual breakdown by month', async () => {
      mockPayrollFind.mockResolvedValue([fakePayroll({ month: '06' })]);

      const result = await Service.generateAnnualSummaryReport(2025);

      expect(result.type).toBe('AnnualSummary');
      expect(result.year).toBe(2025);
      expect(result.monthlyBreakdown).toHaveLength(12);
      expect(result.annualTotals.totalNet).toBe(12300);
    });

    it('calculates department summary', async () => {
      mockPayrollFind.mockResolvedValue([
        fakePayroll({ month: '01' }),
        fakePayroll({ _id: 'p2', month: '02', departmentName: 'HR' }),
      ]);

      const result = await Service.generateAnnualSummaryReport(2025);

      expect(result.departmentSummary.length).toBeGreaterThanOrEqual(2);
    });

    it('handles empty year', async () => {
      mockPayrollFind.mockResolvedValue([]);

      const result = await Service.generateAnnualSummaryReport(2025);

      expect(result.annualTotals.totalNet).toBe(0);
      expect(result.averageMonthlyPayroll).toBe(0);
    });
  });

  // ── generateVarianceReport ───────────────────────────────────────

  describe('generateVarianceReport', () => {
    it('compares current vs previous month', async () => {
      const current = fakePayroll({ month: '06', employeeId: 'e1' });
      const previous = fakePayroll({ month: '05', employeeId: 'e1', baseSalary: 9000 });
      mockPayrollFind.mockResolvedValueOnce([current]).mockResolvedValueOnce([previous]);

      const result = await Service.generateVarianceReport(6, 2025);

      expect(result.type).toBe('Variance');
      expect(result.currentPeriod.month).toBe(6);
      expect(result.previousPeriod.month).toBe(5);
      expect(result.variance.totalBaseSalary.change).toBe(1000);
    });

    it('handles January → December of prev year', async () => {
      mockPayrollFind
        .mockResolvedValueOnce([fakePayroll({ month: '01' })])
        .mockResolvedValueOnce([fakePayroll({ month: '12' })]);

      const result = await Service.generateVarianceReport(1, 2025);

      expect(result.previousPeriod.month).toBe(12);
      expect(result.previousPeriod.year).toBe(2024);
    });

    it('detects new employees', async () => {
      mockPayrollFind
        .mockResolvedValueOnce([fakePayroll({ employeeId: 'e1' })])
        .mockResolvedValueOnce([]); // no prev month

      const result = await Service.generateVarianceReport(6, 2025);

      expect(result.employeeChanges.newEmployees).toHaveLength(1);
    });

    it('detects removed employees', async () => {
      mockPayrollFind
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([fakePayroll({ employeeId: 'e1' })]);

      const result = await Service.generateVarianceReport(6, 2025);

      expect(result.employeeChanges.removedEmployees).toHaveLength(1);
    });

    it('handles zero previous values', async () => {
      mockPayrollFind.mockResolvedValueOnce([fakePayroll()]).mockResolvedValueOnce([]);

      const result = await Service.generateVarianceReport(6, 2025);

      expect(result.variance.employeeCount.previous).toBe(0);
    });
  });

  // ── generateEmployeeCostReport ───────────────────────────────────

  describe('generateEmployeeCostReport', () => {
    it('returns employee cost breakdown', async () => {
      mockEmployeeFindById.mockResolvedValue({
        _id: 'e1',
        fullName: 'Ahmed',
        departmentName: 'Engineering',
        jobTitle: 'Senior Dev',
        baseSalary: 10000,
      });
      mockPayrollFind.mockReturnValue(chainSort([fakePayroll()]));

      const result = await Service.generateEmployeeCostReport('e1', 2025);

      expect(result.type).toBe('EmployeeCost');
      expect(result.employee.name).toBe('Ahmed');
      expect(result.monthlyBreakdown).toHaveLength(1);
      expect(result.annualTotals.totalGross).toBe(13500);
      expect(result.annualTotals.monthsWorked).toBe(1);
    });

    it('throws when employee not found', async () => {
      mockEmployeeFindById.mockResolvedValue(null);

      await expect(Service.generateEmployeeCostReport('bad', 2025)).rejects.toThrow(
        'تقرير تكلفة الموظف'
      );
    });

    it('handles no payrolls', async () => {
      mockEmployeeFindById.mockResolvedValue({ _id: 'e1', fullName: 'X', baseSalary: 5000 });
      mockPayrollFind.mockReturnValue(chainSort([]));

      const result = await Service.generateEmployeeCostReport('e1', 2025);

      expect(result.annualTotals.monthsWorked).toBe(0);
      expect(result.annualTotals.averageMonthlyNet).toBe(0);
    });
  });

  // ── generateDeductionsReport ─────────────────────────────────────

  describe('generateDeductionsReport', () => {
    it('returns deductions by category', async () => {
      mockPayrollFind.mockResolvedValue([fakePayroll()]);

      const result = await Service.generateDeductionsReport(6, 2025);

      expect(result.type).toBe('Deductions');
      expect(result.records).toBe(1);
      expect(result.categories.gosi.total).toBe(975);
      expect(result.categories.socialSecurity.total).toBe(900);
      expect(result.details).toHaveLength(1);
    });

    it('handles empty payrolls', async () => {
      mockPayrollFind.mockResolvedValue([]);

      const result = await Service.generateDeductionsReport(1, 2025);

      expect(result.records).toBe(0);
      expect(result.totalDeductions).toBe(0);
    });

    it('processes loan deductions', async () => {
      const p = fakePayroll({
        deductions: [
          { name: 'loan-deduction', amount: 500 },
          { name: 'other-stuff', amount: 100 },
        ],
      });
      mockPayrollFind.mockResolvedValue([p]);

      const result = await Service.generateDeductionsReport(6, 2025);

      expect(result.details[0].loanDeduction).toBe(500);
      expect(result.details[0].other).toBe(100);
    });
  });
});
