/**
 * Comprehensive unit tests for GosiFullService
 * @module tests/unit/gosi-full.service.test
 */
'use strict';

// ─── Mock Factory ────────────────────────────────────────────────────────────
const createModelMock = () => {
  const Model = jest.fn(function (data) {
    Object.assign(this, data);
    this._id = 'mockId';
    this.save = jest.fn().mockResolvedValue(this);
  });
  Model.find = jest.fn();
  Model.findById = jest.fn();
  Model.findOne = jest.fn();
  Model.findOneAndUpdate = jest.fn();
  Model.findByIdAndUpdate = jest.fn();
  Model.countDocuments = jest.fn();
  Model.aggregate = jest.fn();
  Model.create = jest.fn();
  Model.updateMany = jest.fn();
  return Model;
};

const mockSubscription = createModelMock();
const mockContribution = createModelMock();
const mockPayment = createModelMock();
const mockCompliance = createModelMock();
const mockEndOfService = createModelMock();

jest.mock('../../models/gosi.models', () => ({
  GOSISubscription: mockSubscription,
  GOSIContribution: mockContribution,
  GOSIPayment: mockPayment,
  GOSIComplianceReport: mockCompliance,
  EndOfServiceCalculation: mockEndOfService,
}));

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

const service = require('../../services/gosi-full.service');

// ─── Helpers ─────────────────────────────────────────────────────────────────
const resetAllMocks = () => {
  [mockSubscription, mockContribution, mockPayment, mockCompliance, mockEndOfService].forEach(m => {
    m.mockClear();
    m.find.mockReset();
    m.findById.mockReset();
    m.findOne.mockReset();
    m.findOneAndUpdate.mockReset();
    m.findByIdAndUpdate.mockReset();
    m.countDocuments.mockReset();
    m.aggregate.mockReset();
    m.create.mockReset();
    if (m.updateMany) m.updateMany.mockReset();
  });
};

// Helper to build a date string relative to NEW_SYSTEM_START_DATE (2024-07-01)
const OLD_HIRE = '2020-01-15';
const NEW_HIRE = '2024-08-01';

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('GosiFullService', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  // =========================================================================
  // 1. Module Exports
  // =========================================================================
  describe('Module exports', () => {
    it('exports a singleton object (not a class)', () => {
      expect(typeof service).toBe('object');
      expect(service).not.toBeNull();
    });

    it('has all expected public methods', () => {
      const expected = [
        'calculateContribution',
        'calculateMonthlyContributions',
        'registerEmployee',
        'updateSubscriptionWage',
        'linkWithPayroll',
        'recordPayment',
        'calculateEndOfService',
        'estimateEndOfService',
        'confirmEndOfService',
        'markEndOfServicePaid',
        'getDashboardSummary',
        'getPeriodReport',
        'getEmployeeEndOfServiceHistory',
        'quickCalculate',
        'getRatesTable',
      ];
      expected.forEach(m => expect(typeof service[m]).toBe('function'));
    });
  });

  // =========================================================================
  // 2. calculateContribution
  // =========================================================================
  describe('calculateContribution', () => {
    // ── Saudi old system ──────────────────────────────────────────────────
    it('calculates Saudi old-system contribution correctly', () => {
      const result = service.calculateContribution({
        basicSalary: 10000,
        housingAllowance: 2500,
        nationalityCode: 'SA',
        hireDate: OLD_HIRE,
      });
      expect(result.employeeType).toBe('saudi');
      expect(result.isNewSystem).toBe(false);
      expect(result.gosiBase).toBe(12500);
      expect(result.maxSalaryCap).toBe(45000);
      // employee: 9% pension + 0.75% saned = 9.75%
      expect(result.rates.employeeRate).toBeCloseTo(9.75, 2);
      // employer: 9% pension + 2% ohp + 0.75% saned = 11.75%
      expect(result.rates.employerRate).toBeCloseTo(11.75, 2);
      // breakdown
      expect(result.breakdown.employee.pension).toBeCloseTo(1125, 2);
      expect(result.breakdown.employee.saned).toBeCloseTo(93.75, 2);
      expect(result.breakdown.employee.total).toBeCloseTo(1218.75, 2);
      expect(result.breakdown.employer.pension).toBeCloseTo(1125, 2);
      expect(result.breakdown.employer.ohp).toBeCloseTo(250, 2);
      expect(result.breakdown.employer.saned).toBeCloseTo(93.75, 2);
      expect(result.breakdown.employer.total).toBeCloseTo(1468.75, 2);
      expect(result.grandTotal).toBeCloseTo(2687.5, 2);
    });

    it('returns correct nationalityCode in output', () => {
      const result = service.calculateContribution({
        basicSalary: 5000,
        housingAllowance: 0,
        nationalityCode: 'SA',
        hireDate: OLD_HIRE,
      });
      expect(result.nationalityCode).toBe('SA');
    });

    // ── Saudi new system ─────────────────────────────────────────────────
    it('calculates Saudi new-system (2025) contribution when hired after 2024-07-01', () => {
      const result = service.calculateContribution({
        basicSalary: 10000,
        housingAllowance: 2500,
        nationalityCode: 'SA',
        hireDate: NEW_HIRE,
      });
      expect(result.isNewSystem).toBe(true);
      // new rates: 9.5% pension + 0.75% saned = 10.25%
      expect(result.rates.employeeRate).toBeCloseTo(10.25, 2);
      // employer: 9.5% pension + 2% ohp + 0.75% saned = 12.25%
      expect(result.rates.employerRate).toBeCloseTo(12.25, 2);
      expect(result.breakdown.employee.pension).toBeCloseTo(1187.5, 2);
      expect(result.breakdown.employer.pension).toBeCloseTo(1187.5, 2);
    });

    it('treats hire on exactly 2024-07-01 as new system', () => {
      const result = service.calculateContribution({
        basicSalary: 8000,
        housingAllowance: 0,
        nationalityCode: 'SA',
        hireDate: '2024-07-01',
      });
      expect(result.isNewSystem).toBe(true);
    });

    it('treats hire on 2024-06-30 as old system', () => {
      const result = service.calculateContribution({
        basicSalary: 8000,
        housingAllowance: 0,
        nationalityCode: 'SA',
        hireDate: '2024-06-30',
      });
      expect(result.isNewSystem).toBe(false);
    });

    // ── Expatriate ───────────────────────────────────────────────────────
    it('calculates expatriate contribution (zero employee, 2% employer OHP only)', () => {
      const result = service.calculateContribution({
        basicSalary: 5000,
        housingAllowance: 1000,
        nationalityCode: 'PK',
        hireDate: OLD_HIRE,
      });
      expect(result.employeeType).toBe('expatriate');
      expect(result.breakdown.employee.pension).toBe(0);
      expect(result.breakdown.employee.saned).toBe(0);
      expect(result.breakdown.employee.total).toBe(0);
      expect(result.breakdown.employer.pension).toBe(0);
      expect(result.breakdown.employer.ohp).toBeCloseTo(120, 2);
      expect(result.breakdown.employer.saned).toBe(0);
      expect(result.grandTotal).toBeCloseTo(120, 2);
    });

    it('treats null nationalityCode as expatriate', () => {
      const result = service.calculateContribution({
        basicSalary: 4000,
        housingAllowance: 0,
        nationalityCode: null,
        hireDate: OLD_HIRE,
      });
      expect(result.employeeType).toBe('expatriate');
    });

    it('treats undefined nationalityCode as expatriate', () => {
      const result = service.calculateContribution({
        basicSalary: 4000,
        housingAllowance: 0,
        hireDate: OLD_HIRE,
      });
      expect(result.employeeType).toBe('expatriate');
    });

    // ── GCC countries ────────────────────────────────────────────────────
    it.each([
      ['BH', 0.08, 0.14, 44880],
      ['KW', 0.08, 0.115, 33502],
      ['OM', 0.07, 0.105, 29220],
      ['QA', 0.07, 0.14, 103022],
      ['AE', 0.05, 0.125, 71477],
    ])('calculates GCC contribution for %s', (code, empRate, emplrRate, maxSal) => {
      const result = service.calculateContribution({
        basicSalary: 10000,
        housingAllowance: 2000,
        nationalityCode: code,
        hireDate: OLD_HIRE,
      });
      expect(result.employeeType).toBe('gcc');
      expect(result.maxSalaryCap).toBe(maxSal);
      // GCC employee rate = pension only (saned=0)
      expect(result.breakdown.employee.pension).toBeCloseTo(12000 * empRate, 1);
      expect(result.breakdown.employee.saned).toBe(0);
      // GCC employer rate: pension + 2% ohp + saned=0
      expect(result.breakdown.employer.pension).toBeCloseTo(12000 * emplrRate, 1);
      expect(result.breakdown.employer.ohp).toBeCloseTo(12000 * 0.02, 1);
    });

    // ── Max salary cap ───────────────────────────────────────────────────
    it('caps Saudi salary at DEFAULT_MAX_SALARY (45000)', () => {
      const result = service.calculateContribution({
        basicSalary: 40000,
        housingAllowance: 10000,
        nationalityCode: 'SA',
        hireDate: OLD_HIRE,
      });
      // 40000+10000 = 50000 → capped at 45000
      expect(result.gosiBase).toBe(45000);
    });

    it('applies GCC-specific max salary cap', () => {
      const result = service.calculateContribution({
        basicSalary: 30000,
        housingAllowance: 20000,
        nationalityCode: 'OM',
        hireDate: OLD_HIRE,
      });
      // 50000 → capped at OM max 29220
      expect(result.gosiBase).toBe(29220);
    });

    // ── MIN_SALARY floor ────────────────────────────────────────────────
    it('enforces MIN_SALARY floor of 1500', () => {
      const result = service.calculateContribution({
        basicSalary: 500,
        housingAllowance: 0,
        nationalityCode: 'SA',
        hireDate: OLD_HIRE,
      });
      expect(result.gosiBase).toBe(1500);
    });

    // ── workingDays proration ────────────────────────────────────────────
    it('prorates based on workingDays when provided', () => {
      const result = service.calculateContribution(
        { basicSalary: 9000, housingAllowance: 0, nationalityCode: 'SA', hireDate: OLD_HIRE },
        15
      );
      // gosiBase after proration will be less than 9000
      expect(result.gosiBase).toBeLessThan(9000);
      expect(result.gosiBase).toBeGreaterThan(0);
    });

    it('uses full month when workingDays is null', () => {
      const full = service.calculateContribution({
        basicSalary: 9000,
        housingAllowance: 0,
        nationalityCode: 'SA',
        hireDate: OLD_HIRE,
      });
      expect(full.gosiBase).toBe(9000);
    });

    // ── without housingAllowance ─────────────────────────────────────────
    it('works when housingAllowance is 0', () => {
      const result = service.calculateContribution({
        basicSalary: 8000,
        housingAllowance: 0,
        nationalityCode: 'SA',
        hireDate: OLD_HIRE,
      });
      expect(result.gosiBase).toBe(8000);
    });

    it('works when housingAllowance is omitted (defaults to 0)', () => {
      const result = service.calculateContribution({
        basicSalary: 8000,
        nationalityCode: 'SA',
        hireDate: OLD_HIRE,
      });
      expect(result.gosiBase).toBe(8000);
    });

    // ── isNewSystem is false for non-Saudi ────────────────────────────────
    it('isNewSystem is always false for expatriate regardless of hireDate', () => {
      const result = service.calculateContribution({
        basicSalary: 5000,
        housingAllowance: 0,
        nationalityCode: 'IN',
        hireDate: NEW_HIRE,
      });
      expect(result.isNewSystem).toBe(false);
    });

    it('isNewSystem is false for GCC employee', () => {
      const result = service.calculateContribution({
        basicSalary: 5000,
        housingAllowance: 0,
        nationalityCode: 'BH',
        hireDate: NEW_HIRE,
      });
      expect(result.isNewSystem).toBe(false);
    });
  });

  // =========================================================================
  // 3. quickCalculate
  // =========================================================================
  describe('quickCalculate', () => {
    it('defaults to SA nationality', () => {
      const result = service.quickCalculate(10000);
      expect(result.employeeType).toBe('saudi');
      expect(result.nationalityCode).toBe('SA');
    });

    it('accepts custom nationality code', () => {
      const result = service.quickCalculate(10000, 0, 'PK');
      expect(result.employeeType).toBe('expatriate');
    });

    it('computes correct breakdown for BH', () => {
      const result = service.quickCalculate(10000, 2000, 'BH');
      expect(result.employeeType).toBe('gcc');
      expect(result.breakdown.employee.pension).toBeCloseTo(12000 * 0.08, 1);
    });

    it('handles null hireDate (uses current date)', () => {
      const result = service.quickCalculate(5000, 0, 'SA', null);
      expect(result).toBeDefined();
      expect(result.employeeType).toBe('saudi');
    });

    it('accepts explicit hireDate', () => {
      const result = service.quickCalculate(5000, 0, 'SA', OLD_HIRE);
      expect(result.isNewSystem).toBe(false);
    });
  });

  // =========================================================================
  // 4. getRatesTable
  // =========================================================================
  describe('getRatesTable', () => {
    it('returns object with all expected top-level keys', () => {
      const table = service.getRatesTable();
      expect(table).toHaveProperty('saudi');
      expect(table).toHaveProperty('gcc');
      expect(table).toHaveProperty('expatriate');
      expect(table).toHaveProperty('general');
    });

    it('contains all GCC country codes', () => {
      const table = service.getRatesTable();
      ['BH', 'KW', 'OM', 'QA', 'AE'].forEach(code => {
        expect(table.gcc).toHaveProperty(code);
        expect(table.gcc[code]).toHaveProperty('employee');
        expect(table.gcc[code]).toHaveProperty('employer');
        expect(table.gcc[code]).toHaveProperty('maxSalary');
      });
    });
  });

  // =========================================================================
  // 5. registerEmployee
  // =========================================================================
  describe('registerEmployee', () => {
    const employee = {
      _id: 'emp1',
      basicSalary: 8000,
      housingAllowance: 2000,
      nationalityCode: 'SA',
      hireDate: OLD_HIRE,
      nationalId: '1234567890',
      name: 'Ahmad Test',
      dateOfBirth: '1990-01-01',
      nationality: 'SA',
      position: 'Developer',
    };

    it('creates subscription when employee not previously registered', async () => {
      mockSubscription.findOne.mockResolvedValue(null);
      mockSubscription.create.mockResolvedValue({
        _id: 'sub1',
        employee: 'emp1',
        status: 'active',
      });

      const result = await service.registerEmployee(employee, {
        organizationId: 'org1',
        userId: 'u1',
      });
      expect(mockSubscription.findOne).toHaveBeenCalledWith({ employee: 'emp1', status: 'active' });
      expect(mockSubscription.create).toHaveBeenCalledTimes(1);
      expect(result).toHaveProperty('_id', 'sub1');
    });

    it('throws if employee already has an active subscription', async () => {
      mockSubscription.findOne.mockResolvedValue({ _id: 'sub1', status: 'active' });
      await expect(service.registerEmployee(employee)).rejects.toThrow(
        'الموظف مسجل بالفعل في التأمينات الاجتماعية'
      );
      expect(mockSubscription.create).not.toHaveBeenCalled();
    });

    it('passes correct GOSI data to create', async () => {
      mockSubscription.findOne.mockResolvedValue(null);
      mockSubscription.create.mockImplementation(data => Promise.resolve({ _id: 'sub2', ...data }));

      await service.registerEmployee(employee, { organizationId: 'org1' });
      const createArg = mockSubscription.create.mock.calls[0][0];
      expect(createArg.employee).toBe('emp1');
      expect(createArg.organization).toBe('org1');
      expect(createArg.isSaudi).toBe(true);
      expect(createArg.subscriberWage).toBe(10000);
      expect(createArg.status).toBe('active');
    });

    it('sets isSaudi false for expatriate', async () => {
      mockSubscription.findOne.mockResolvedValue(null);
      mockSubscription.create.mockImplementation(data => Promise.resolve({ _id: 'sub3', ...data }));

      const expatEmployee = { ...employee, nationalityCode: 'PK', nationality: 'PK' };
      await service.registerEmployee(expatEmployee, {});
      const createArg = mockSubscription.create.mock.calls[0][0];
      expect(createArg.isSaudi).toBe(false);
    });

    it('sets isSaudi false for GCC employee', async () => {
      mockSubscription.findOne.mockResolvedValue(null);
      mockSubscription.create.mockImplementation(data => Promise.resolve({ _id: 'sub4', ...data }));

      const gccEmployee = { ...employee, nationalityCode: 'BH', nationality: 'BH' };
      await service.registerEmployee(gccEmployee, {});
      const createArg = mockSubscription.create.mock.calls[0][0];
      expect(createArg.isSaudi).toBe(false);
    });

    it('caps gosiBase at maxSalaryCap', async () => {
      mockSubscription.findOne.mockResolvedValue(null);
      mockSubscription.create.mockImplementation(data => Promise.resolve({ _id: 'sub5', ...data }));

      const highSalaryEmployee = { ...employee, basicSalary: 40000, housingAllowance: 10000 };
      await service.registerEmployee(highSalaryEmployee, {});
      const createArg = mockSubscription.create.mock.calls[0][0];
      expect(createArg.subscriberWage).toBe(45000);
    });

    it('applies MIN_SALARY floor to gosiBase', async () => {
      mockSubscription.findOne.mockResolvedValue(null);
      mockSubscription.create.mockImplementation(data => Promise.resolve({ _id: 'sub6', ...data }));

      const lowSalaryEmployee = { ...employee, basicSalary: 500, housingAllowance: 0 };
      await service.registerEmployee(lowSalaryEmployee, {});
      const createArg = mockSubscription.create.mock.calls[0][0];
      expect(createArg.subscriberWage).toBe(1500);
    });

    it('uses empty context defaults gracefully', async () => {
      mockSubscription.findOne.mockResolvedValue(null);
      mockSubscription.create.mockImplementation(data => Promise.resolve({ _id: 'sub7', ...data }));

      await service.registerEmployee(employee);
      const createArg = mockSubscription.create.mock.calls[0][0];
      expect(createArg.organization).toBeUndefined();
      expect(createArg.createdBy).toBeUndefined();
    });
  });

  // =========================================================================
  // 6. updateSubscriptionWage
  // =========================================================================
  describe('updateSubscriptionWage', () => {
    it('updates wage and recalculates contributions', async () => {
      mockSubscription.findById.mockResolvedValue({
        _id: 'sub1',
        isSaudi: true,
        nationality: 'SA',
      });
      mockSubscription.findByIdAndUpdate.mockResolvedValue({
        _id: 'sub1',
        basicSalary: 12000,
        housingAllowance: 3000,
      });

      const result = await service.updateSubscriptionWage('sub1', 12000, 3000, 'admin1');
      expect(mockSubscription.findById).toHaveBeenCalledWith('sub1');
      expect(mockSubscription.findByIdAndUpdate).toHaveBeenCalledWith(
        'sub1',
        expect.objectContaining({
          basicSalary: 12000,
          housingAllowance: 3000,
          updatedBy: 'admin1',
        }),
        { new: true }
      );
      expect(result).toBeDefined();
    });

    it('throws when subscription not found', async () => {
      mockSubscription.findById.mockResolvedValue(null);
      await expect(service.updateSubscriptionWage('nonexistent', 10000)).rejects.toThrow(
        'الاشتراك غير موجود'
      );
    });

    it('calculates subscriberWage correctly for Saudi', async () => {
      mockSubscription.findById.mockResolvedValue({
        _id: 'sub2',
        isSaudi: true,
        nationality: 'SA',
      });
      mockSubscription.findByIdAndUpdate.mockImplementation((_id, data) =>
        Promise.resolve({ _id, ...data })
      );

      await service.updateSubscriptionWage('sub2', 10000, 5000);
      const updateArg = mockSubscription.findByIdAndUpdate.mock.calls[0][1];
      expect(updateArg.subscriberWage).toBe(15000);
    });

    it('caps subscriberWage at max salary', async () => {
      mockSubscription.findById.mockResolvedValue({
        _id: 'sub3',
        isSaudi: true,
        nationality: 'SA',
      });
      mockSubscription.findByIdAndUpdate.mockImplementation((_id, data) =>
        Promise.resolve({ _id, ...data })
      );

      await service.updateSubscriptionWage('sub3', 40000, 20000);
      const updateArg = mockSubscription.findByIdAndUpdate.mock.calls[0][1];
      expect(updateArg.subscriberWage).toBe(45000);
    });

    it('defaults housingAllowance to 0 and updatedBy to null', async () => {
      mockSubscription.findById.mockResolvedValue({
        _id: 'sub4',
        isSaudi: false,
        nationality: 'PK',
      });
      mockSubscription.findByIdAndUpdate.mockImplementation((_id, data) =>
        Promise.resolve({ _id, ...data })
      );

      await service.updateSubscriptionWage('sub4', 8000);
      const updateArg = mockSubscription.findByIdAndUpdate.mock.calls[0][1];
      expect(updateArg.housingAllowance).toBe(0);
      expect(updateArg.updatedBy).toBeNull();
    });

    it('handles GCC employee type via isSaudi=false + GCC nationality', async () => {
      mockSubscription.findById.mockResolvedValue({
        _id: 'sub5',
        isSaudi: false,
        nationality: 'BH',
      });
      mockSubscription.findByIdAndUpdate.mockImplementation((_id, data) =>
        Promise.resolve({ _id, ...data })
      );

      await service.updateSubscriptionWage('sub5', 20000, 5000);
      const updateArg = mockSubscription.findByIdAndUpdate.mock.calls[0][1];
      // BH max is 44880, so 25000 should pass
      expect(updateArg.subscriberWage).toBe(25000);
    });
  });

  // =========================================================================
  // 7. linkWithPayroll
  // =========================================================================
  describe('linkWithPayroll', () => {
    it('links payroll items to contributions successfully', async () => {
      mockSubscription.findOne.mockResolvedValue({
        _id: 'sub1',
        subscriberWage: 10000,
        employeeContribution: 975,
        employerContribution: 1175,
        totalContribution: 2150,
      });
      mockContribution.findOneAndUpdate.mockResolvedValue({ _id: 'contrib1' });

      const items = [{ employeeId: 'emp1', workingDays: 30, gosiDeduction: 975 }];
      const results = await service.linkWithPayroll(items, '2025-03', 'pay1');
      expect(results).toHaveLength(1);
      expect(results[0].employeeId).toBe('emp1');
    });

    it('skips employees without active subscription', async () => {
      mockSubscription.findOne.mockResolvedValue(null);

      const items = [{ employeeId: 'emp_no_sub', workingDays: 30 }];
      const results = await service.linkWithPayroll(items, '2025-03', 'pay2');
      expect(results).toHaveLength(0);
      expect(mockContribution.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('handles empty payroll items array', async () => {
      const results = await service.linkWithPayroll([], '2025-03', 'pay3');
      expect(results).toHaveLength(0);
    });

    it('continues processing when one item fails (safe)', async () => {
      mockSubscription.findOne
        .mockResolvedValueOnce({
          _id: 'sub1',
          subscriberWage: 10000,
          employeeContribution: 975,
          employerContribution: 1175,
          totalContribution: 2150,
        })
        .mockResolvedValueOnce({
          _id: 'sub2',
          subscriberWage: 8000,
          employeeContribution: 780,
          employerContribution: 940,
          totalContribution: 1720,
        });

      mockContribution.findOneAndUpdate
        .mockRejectedValueOnce(new Error('DB error'))
        .mockResolvedValueOnce({ _id: 'contrib2' });

      const items = [
        { employeeId: 'emp1', workingDays: 30 },
        { employeeId: 'emp2', workingDays: 30 },
      ];
      const results = await service.linkWithPayroll(items, '2025-03', 'pay4');
      // First fails, second succeeds
      expect(results).toHaveLength(1);
      expect(results[0].employeeId).toBe('emp2');
    });

    it('calls findOneAndUpdate with correct upsert parameters', async () => {
      mockSubscription.findOne.mockResolvedValue({
        _id: 'sub1',
        subscriberWage: 10000,
        employeeContribution: 975,
        employerContribution: 1175,
        totalContribution: 2150,
      });
      mockContribution.findOneAndUpdate.mockResolvedValue({ _id: 'contrib1' });

      await service.linkWithPayroll([{ employeeId: 'emp1' }], '2025-04', 'pay5');
      expect(mockContribution.findOneAndUpdate).toHaveBeenCalledWith(
        { subscription: 'sub1', period: '2025-04' },
        expect.objectContaining({
          period: '2025-04',
          subscriberWage: 10000,
          paymentStatus: 'pending',
        }),
        { upsert: true, new: true }
      );
    });

    it('processes multiple items and returns all results', async () => {
      mockSubscription.findOne
        .mockResolvedValueOnce({
          _id: 'sub1',
          subscriberWage: 10000,
          employeeContribution: 975,
          employerContribution: 1175,
          totalContribution: 2150,
        })
        .mockResolvedValueOnce({
          _id: 'sub2',
          subscriberWage: 8000,
          employeeContribution: 780,
          employerContribution: 940,
          totalContribution: 1720,
        });

      mockContribution.findOneAndUpdate
        .mockResolvedValueOnce({ _id: 'c1' })
        .mockResolvedValueOnce({ _id: 'c2' });

      const items = [{ employeeId: 'emp1' }, { employeeId: 'emp2' }];
      const results = await service.linkWithPayroll(items, '2025-05', 'pay6');
      expect(results).toHaveLength(2);
    });
  });

  // =========================================================================
  // 8. recordPayment
  // =========================================================================
  describe('recordPayment', () => {
    it('records payment and updates status to paid', async () => {
      const paymentDoc = { _id: 'pay1', period: '2025-03', status: 'paid', sadadNumber: 'SAD123' };
      mockPayment.findByIdAndUpdate.mockResolvedValue(paymentDoc);
      mockContribution.updateMany.mockResolvedValue({ modifiedCount: 5 });

      const result = await service.recordPayment('pay1', 'SAD123', 'admin1');
      expect(result.status).toBe('paid');
      expect(result.sadadNumber).toBe('SAD123');
      expect(mockPayment.findByIdAndUpdate).toHaveBeenCalledWith(
        'pay1',
        expect.objectContaining({
          sadadNumber: 'SAD123',
          status: 'paid',
          approvedBy: 'admin1',
        }),
        { new: true }
      );
    });

    it('throws when payment record not found', async () => {
      mockPayment.findByIdAndUpdate.mockResolvedValue(null);
      await expect(service.recordPayment('nonexistent', 'SAD999', 'admin1')).rejects.toThrow(
        'سجل الدفع غير موجود'
      );
    });

    it('updates related contributions to paid status', async () => {
      mockPayment.findByIdAndUpdate.mockResolvedValue({ _id: 'pay2', period: '2025-04' });
      mockContribution.updateMany.mockResolvedValue({ modifiedCount: 3 });

      await service.recordPayment('pay2', 'SAD456', 'admin2');
      expect(mockContribution.updateMany).toHaveBeenCalledWith(
        { period: '2025-04', paymentStatus: 'pending' },
        expect.objectContaining({
          paymentStatus: 'paid',
          paymentReference: 'SAD456',
        })
      );
    });

    it('sets approvedAt and paymentDate to current date', async () => {
      mockPayment.findByIdAndUpdate.mockResolvedValue({ _id: 'pay3', period: '2025-05' });
      mockContribution.updateMany.mockResolvedValue({});

      await service.recordPayment('pay3', 'SAD789', 'admin3');
      const updateArg = mockPayment.findByIdAndUpdate.mock.calls[0][1];
      expect(updateArg.paymentDate).toBeInstanceOf(Date);
      expect(updateArg.approvedAt).toBeInstanceOf(Date);
    });

    it('does not call updateMany when payment not found (throws first)', async () => {
      mockPayment.findByIdAndUpdate.mockResolvedValue(null);
      await expect(service.recordPayment('bad', 'S', 'a')).rejects.toThrow();
      expect(mockContribution.updateMany).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 9. calculateEndOfService
  // =========================================================================
  describe('calculateEndOfService', () => {
    const makeEmployee = (hireDate, salary = 10000, housing = 2500) => ({
      _id: 'emp1',
      hireDate,
      basicSalary: salary,
      housingAllowance: housing,
      transportAllowance: 500,
      otherAllowances: 0,
    });

    beforeEach(() => {
      mockEndOfService.create.mockImplementation(data => Promise.resolve({ _id: 'eos1', ...data }));
    });

    // ── Employer termination (مادة 84): always full entitlement ──────────
    it('employer_termination: full entitlement at <2 years', async () => {
      // ~1 year service
      const emp = makeEmployee('2024-06-01');
      const result = await service.calculateEndOfService(emp, 'employer_termination', '2025-06-01');
      expect(result.entitlementRatio).toBe(1.0);
      expect(result.applicableArticle).toBe('مادة 84');
      expect(result.finalAmount).toBe(result.fullEntitlement);
    });

    it('employer_termination: full entitlement at 3 years', async () => {
      const emp = makeEmployee('2022-06-01');
      const result = await service.calculateEndOfService(emp, 'employer_termination', '2025-06-01');
      expect(result.entitlementRatio).toBe(1.0);
      expect(result.finalAmount).toBe(result.fullEntitlement);
    });

    it('employer_termination: full entitlement at 12 years', async () => {
      const emp = makeEmployee('2013-01-01');
      const result = await service.calculateEndOfService(emp, 'employer_termination', '2025-01-01');
      expect(result.entitlementRatio).toBe(1.0);
      expect(result.totalYears).toBeGreaterThanOrEqual(11);
      expect(result.finalAmount).toBe(result.fullEntitlement);
    });

    // ── end_of_contract (مادة 84): always full ──────────────────────────
    it('end_of_contract: full entitlement (مادة 84)', async () => {
      const emp = makeEmployee('2022-01-01');
      const result = await service.calculateEndOfService(emp, 'contract_expiry', '2025-01-01');
      expect(result.entitlementRatio).toBe(1.0);
      expect(result.applicableArticle).toBe('مادة 84');
    });

    // ── Resignation (مادة 85): ratio depends on years ────────────────────
    it('resignation: 0% entitlement at <2 years', async () => {
      const emp = makeEmployee('2024-06-01');
      const result = await service.calculateEndOfService(emp, 'resignation', '2025-06-01');
      expect(result.entitlementRatio).toBe(0);
      expect(result.applicableArticle).toBe('مادة 85');
      expect(result.finalAmount).toBe(0);
    });

    it('resignation: 1/3 entitlement at 2-5 years', async () => {
      const emp = makeEmployee('2022-01-01');
      const result = await service.calculateEndOfService(emp, 'resignation', '2025-06-01');
      expect(result.entitlementRatio).toBeCloseTo(1 / 3, 4);
      expect(result.finalAmount).toBeCloseTo(result.fullEntitlement / 3, 0);
    });

    it('resignation: 2/3 entitlement at 5-10 years', async () => {
      const emp = makeEmployee('2019-01-01');
      const result = await service.calculateEndOfService(emp, 'resignation', '2025-06-01');
      expect(result.entitlementRatio).toBeCloseTo(2 / 3, 4);
    });

    it('resignation: full entitlement at 10+ years', async () => {
      const emp = makeEmployee('2014-01-01');
      const result = await service.calculateEndOfService(emp, 'resignation', '2025-06-01');
      expect(result.entitlementRatio).toBe(1.0);
      expect(result.finalAmount).toBe(result.fullEntitlement);
    });

    // ── Force majeure (مادة 87) ──────────────────────────────────────────
    it('force_majeure: full entitlement (مادة 87)', async () => {
      const emp = makeEmployee('2024-01-01');
      const result = await service.calculateEndOfService(emp, 'force_majeure', '2025-01-01');
      expect(result.entitlementRatio).toBe(1.0);
      expect(result.applicableArticle).toBe('مادة 87');
    });

    // ── first 5 / beyond 5 proration ─────────────────────────────────────
    it('calculates first 5 years at half-month rate', async () => {
      // 4 years exactly
      const emp = makeEmployee('2021-01-01', 10000, 2500, 500, 0);
      const result = await service.calculateEndOfService(emp, 'employer_termination', '2025-01-01');
      const lastSalary = 10000 + 2500 + 500 + 0;
      // first 5 years: (lastSalary/2) * ~4 years
      expect(result.firstFiveYearsAmount).toBeGreaterThan(0);
      expect(result.remainingYearsAmount).toBe(0); // <5 years
    });

    it('calculates beyond 5 years at full-month rate', async () => {
      // ~8 years
      const emp = makeEmployee('2017-01-01', 10000, 2500, 500, 0);
      const result = await service.calculateEndOfService(emp, 'employer_termination', '2025-01-01');
      expect(result.firstFiveYearsAmount).toBeGreaterThan(0);
      expect(result.remainingYearsAmount).toBeGreaterThan(0);
    });

    it('uses default endDate (now) when null', async () => {
      const emp = makeEmployee('2020-01-01');
      const result = await service.calculateEndOfService(emp, 'employer_termination', null);
      expect(result.totalYears).toBeGreaterThan(0);
    });

    it('saves record via EndOfServiceCalculation.create', async () => {
      const emp = makeEmployee('2020-01-01');
      await service.calculateEndOfService(emp, 'employer_termination', '2025-01-01', {
        userId: 'u1',
        organizationId: 'org1',
      });
      expect(mockEndOfService.create).toHaveBeenCalledTimes(1);
      const arg = mockEndOfService.create.mock.calls[0][0];
      expect(arg.employee).toBe('emp1');
      expect(arg.organization).toBe('org1');
      expect(arg.calculatedBy).toBe('u1');
    });
  });

  // =========================================================================
  // 10. estimateEndOfService
  // =========================================================================
  describe('estimateEndOfService', () => {
    const emp = {
      _id: 'emp1',
      hireDate: '2020-01-01',
      basicSalary: 10000,
      housingAllowance: 2500,
      transportAllowance: 500,
      otherAllowances: 0,
    };

    beforeEach(() => {
      mockEndOfService.create.mockImplementation(data =>
        Promise.resolve({
          _id: 'eos_est',
          ...data,
          calculationBreakdown: { servicePeriod: {}, lastSalaryBreakdown: {} },
        })
      );
    });

    it('returns both employer_termination and resignation scenarios', async () => {
      const result = await service.estimateEndOfService(emp, { userId: 'u1' });
      expect(result).toHaveProperty('employer_termination');
      expect(result).toHaveProperty('resignation');
    });

    it('employer_termination scenario has full ratio', async () => {
      const result = await service.estimateEndOfService(emp);
      expect(result.employer_termination.entitlementRatio).toBe(1.0);
    });

    it('resignation scenario has correct article', async () => {
      const result = await service.estimateEndOfService(emp);
      expect(result.resignation.applicableArticle).toBe('مادة 85');
    });

    it('both records are marked as estimated (isEstimated=true)', async () => {
      await service.estimateEndOfService(emp);
      expect(mockEndOfService.create).toHaveBeenCalledTimes(2);
      const calls = mockEndOfService.create.mock.calls;
      expect(calls[0][0].isEstimated).toBe(true);
      expect(calls[1][0].isEstimated).toBe(true);
    });
  });

  // =========================================================================
  // 11. confirmEndOfService
  // =========================================================================
  describe('confirmEndOfService', () => {
    it('confirms an existing calculation', async () => {
      mockEndOfService.findByIdAndUpdate.mockResolvedValue({
        _id: 'eos1',
        status: 'confirmed',
        isEstimated: false,
      });

      const result = await service.confirmEndOfService('eos1', 'admin1');
      expect(result.status).toBe('confirmed');
      expect(mockEndOfService.findByIdAndUpdate).toHaveBeenCalledWith(
        'eos1',
        { status: 'confirmed', isEstimated: false, confirmedBy: 'admin1' },
        { new: true }
      );
    });

    it('throws when calculation not found', async () => {
      mockEndOfService.findByIdAndUpdate.mockResolvedValue(null);
      await expect(service.confirmEndOfService('nonexistent', 'admin1')).rejects.toThrow(
        'حساب مكافأة نهاية الخدمة غير موجود'
      );
    });

    it('sets confirmedBy to provided user', async () => {
      mockEndOfService.findByIdAndUpdate.mockResolvedValue({ _id: 'eos2', confirmedBy: 'admin2' });
      await service.confirmEndOfService('eos2', 'admin2');
      expect(mockEndOfService.findByIdAndUpdate.mock.calls[0][1].confirmedBy).toBe('admin2');
    });

    it('sets isEstimated to false', async () => {
      mockEndOfService.findByIdAndUpdate.mockResolvedValue({ _id: 'eos3' });
      await service.confirmEndOfService('eos3', 'a');
      expect(mockEndOfService.findByIdAndUpdate.mock.calls[0][1].isEstimated).toBe(false);
    });
  });

  // =========================================================================
  // 12. markEndOfServicePaid
  // =========================================================================
  describe('markEndOfServicePaid', () => {
    it('marks calculation as paid', async () => {
      mockEndOfService.findByIdAndUpdate.mockResolvedValue({
        _id: 'eos1',
        status: 'paid',
      });

      const result = await service.markEndOfServicePaid('eos1');
      expect(result.status).toBe('paid');
      expect(mockEndOfService.findByIdAndUpdate).toHaveBeenCalledWith(
        'eos1',
        expect.objectContaining({ status: 'paid' }),
        { new: true }
      );
    });

    it('returns null when calculation not found', async () => {
      mockEndOfService.findByIdAndUpdate.mockResolvedValue(null);
      const result = await service.markEndOfServicePaid('nonexistent');
      expect(result).toBeNull();
    });

    it('uses provided paidDate', async () => {
      mockEndOfService.findByIdAndUpdate.mockResolvedValue({ _id: 'eos2', status: 'paid' });
      const specificDate = new Date('2025-06-15');
      await service.markEndOfServicePaid('eos2', specificDate);
      const arg = mockEndOfService.findByIdAndUpdate.mock.calls[0][1];
      expect(arg.paidDate).toEqual(specificDate);
    });

    it('defaults paidDate to current date when not provided', async () => {
      mockEndOfService.findByIdAndUpdate.mockResolvedValue({ _id: 'eos3', status: 'paid' });
      const before = new Date();
      await service.markEndOfServicePaid('eos3');
      const after = new Date();
      const arg = mockEndOfService.findByIdAndUpdate.mock.calls[0][1];
      expect(arg.paidDate.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(arg.paidDate.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  // =========================================================================
  // 13. getDashboardSummary
  // =========================================================================
  describe('getDashboardSummary', () => {
    const setupDashboardMocks = () => {
      mockSubscription.countDocuments
        .mockResolvedValueOnce(100) // totalSubscriptions
        .mockResolvedValueOnce(80); // activeSubscriptions
      mockPayment.countDocuments
        .mockResolvedValueOnce(5) // pendingPayments
        .mockResolvedValueOnce(3); // overduePayments
      mockPayment.aggregate.mockResolvedValueOnce([{ _id: null, total: 15000 }]);
      mockSubscription.aggregate.mockResolvedValueOnce([
        { _id: true, count: 60 },
        { _id: false, count: 20 },
      ]);
    };

    it('returns all expected summary fields', async () => {
      setupDashboardMocks();
      const result = await service.getDashboardSummary();
      expect(result).toHaveProperty('totalSubscriptions', 100);
      expect(result).toHaveProperty('activeSubscriptions', 80);
      expect(result).toHaveProperty('pendingPayments', 5);
      expect(result).toHaveProperty('overduePayments', 3);
      expect(result).toHaveProperty('overdueAmount', 15000);
      expect(result).toHaveProperty('employeeBreakdown');
      expect(result.employeeBreakdown.saudi).toBe(60);
      expect(result.employeeBreakdown.nonSaudi).toBe(20);
    });

    it('calculates Saudi percentage correctly', async () => {
      setupDashboardMocks();
      const result = await service.getDashboardSummary();
      // 60/80 = 75%
      expect(result.employeeBreakdown.saudiPercentage).toBe(75);
    });

    it('filters by organizationId when provided', async () => {
      setupDashboardMocks();
      await service.getDashboardSummary('org1');
      // Check that countDocuments was called with org filter
      expect(mockSubscription.countDocuments.mock.calls[0][0]).toEqual({ organization: 'org1' });
    });

    it('uses empty query when no organizationId', async () => {
      setupDashboardMocks();
      await service.getDashboardSummary();
      expect(mockSubscription.countDocuments.mock.calls[0][0]).toEqual({});
    });

    it('handles zero overdueAmount gracefully', async () => {
      mockSubscription.countDocuments.mockResolvedValueOnce(10).mockResolvedValueOnce(10);
      mockPayment.countDocuments.mockResolvedValueOnce(0).mockResolvedValueOnce(0);
      mockPayment.aggregate.mockResolvedValueOnce([]);
      mockSubscription.aggregate.mockResolvedValueOnce([]);

      const result = await service.getDashboardSummary();
      expect(result.overdueAmount).toBe(0);
      expect(result.employeeBreakdown.saudi).toBe(0);
      expect(result.employeeBreakdown.nonSaudi).toBe(0);
    });
  });

  // =========================================================================
  // 14. getPeriodReport
  // =========================================================================
  describe('getPeriodReport', () => {
    it('returns payment and contributions for the period', async () => {
      const mockChain = {
        populate: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([{ _id: 'c1' }]),
      };
      mockPayment.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue({ _id: 'pay1' }),
      });
      mockContribution.find.mockReturnValue(mockChain);

      const result = await service.getPeriodReport('2025-03');
      expect(result).toHaveProperty('payment');
      expect(result).toHaveProperty('contributions');
    });

    it('passes organizationId into query when provided', async () => {
      mockPayment.findOne.mockReturnValue({ populate: jest.fn().mockResolvedValue(null) });
      mockContribution.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      });

      await service.getPeriodReport('2025-04', 'org1');
      expect(mockPayment.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ period: '2025-04', organization: 'org1' })
      );
    });

    it('omits organization from query when not provided', async () => {
      mockPayment.findOne.mockReturnValue({ populate: jest.fn().mockResolvedValue(null) });
      mockContribution.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      });

      await service.getPeriodReport('2025-05');
      const arg = mockPayment.findOne.mock.calls[0][0];
      expect(arg).toEqual({ period: '2025-05' });
      expect(arg).not.toHaveProperty('organization');
    });

    it('limits contributions to 500', async () => {
      mockPayment.findOne.mockReturnValue({ populate: jest.fn().mockResolvedValue(null) });
      const limitMock = jest.fn().mockResolvedValue([]);
      mockContribution.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({ limit: limitMock }),
      });

      await service.getPeriodReport('2025-06');
      expect(limitMock).toHaveBeenCalledWith(500);
    });
  });

  // =========================================================================
  // 15. getEmployeeEndOfServiceHistory
  // =========================================================================
  describe('getEmployeeEndOfServiceHistory', () => {
    it('queries by employeeId and returns sorted results', async () => {
      const mockChain = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([{ _id: 'eos1' }, { _id: 'eos2' }]),
      };
      mockEndOfService.find.mockReturnValue(mockChain);

      const result = await service.getEmployeeEndOfServiceHistory('emp1');
      expect(mockEndOfService.find).toHaveBeenCalledWith({ employee: 'emp1' });
      expect(mockChain.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(result).toHaveLength(2);
    });

    it('limits results to 10', async () => {
      const limitMock = jest.fn().mockResolvedValue([]);
      mockEndOfService.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({ limit: limitMock }),
      });

      await service.getEmployeeEndOfServiceHistory('emp2');
      expect(limitMock).toHaveBeenCalledWith(10);
    });

    it('returns empty array when no history exists', async () => {
      mockEndOfService.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      });

      const result = await service.getEmployeeEndOfServiceHistory('emp_none');
      expect(result).toEqual([]);
    });
  });

  // =========================================================================
  // 16. calculateMonthlyContributions
  // =========================================================================
  describe('calculateMonthlyContributions', () => {
    const saudiEmp = {
      _id: 'emp1',
      name: 'Ahmad',
      basicSalary: 10000,
      housingAllowance: 2500,
      nationalityCode: 'SA',
      hireDate: OLD_HIRE,
    };

    const expatEmp = {
      _id: 'emp2',
      name: 'John',
      basicSalary: 5000,
      housingAllowance: 1000,
      nationalityCode: 'US',
      hireDate: OLD_HIRE,
    };

    const gccEmp = {
      _id: 'emp3',
      name: 'Khalid',
      basicSalary: 8000,
      housingAllowance: 2000,
      nationalityCode: 'BH',
      hireDate: OLD_HIRE,
    };

    it('creates payment document via upsert for multiple employees', async () => {
      const paymentDoc = { _id: 'pay1', grandTotal: 3000, period: '2025-03' };
      mockPayment.findOneAndUpdate.mockResolvedValue(paymentDoc);

      const result = await service.calculateMonthlyContributions(
        [saudiEmp, expatEmp],
        '2025-03',
        'org1',
        'admin1'
      );

      expect(mockPayment.findOneAndUpdate).toHaveBeenCalledTimes(1);
      expect(mockPayment.findOneAndUpdate).toHaveBeenCalledWith(
        { organization: 'org1', period: '2025-03' },
        expect.objectContaining({
          organization: 'org1',
          period: '2025-03',
          status: 'pending',
          generatedBy: 'admin1',
        }),
        { upsert: true, new: true }
      );
      expect(result).toEqual(paymentDoc);
    });

    it('counts Saudi, GCC, and expat employees separately', async () => {
      mockPayment.findOneAndUpdate.mockResolvedValue({ _id: 'pay2' });

      await service.calculateMonthlyContributions(
        [saudiEmp, expatEmp, gccEmp],
        '2025-03',
        'org1',
        'admin1'
      );

      const updateArg = mockPayment.findOneAndUpdate.mock.calls[0][1];
      expect(updateArg.saudiEmployees).toBe(1);
      expect(updateArg.expatEmployees).toBe(1);
      expect(updateArg.gccEmployees).toBe(1);
      expect(updateArg.totalEmployees).toBe(3);
    });

    it('calculates correct totals (employee + employer shares)', async () => {
      mockPayment.findOneAndUpdate.mockResolvedValue({ _id: 'pay3' });

      await service.calculateMonthlyContributions([saudiEmp], '2025-03', 'org1', 'admin1');

      const updateArg = mockPayment.findOneAndUpdate.mock.calls[0][1];
      // Saudi old: base=12500, employee 9.75% = 1218.75, employer 11.75% = 1468.75
      expect(updateArg.totalEmployeeShare).toBeCloseTo(1218.75, 2);
      expect(updateArg.totalEmployerShare).toBeCloseTo(1468.75, 2);
      expect(updateArg.grandTotal).toBeCloseTo(2687.5, 2);
    });

    it('includes contribution details for each employee', async () => {
      mockPayment.findOneAndUpdate.mockResolvedValue({ _id: 'pay4' });

      await service.calculateMonthlyContributions(
        [saudiEmp, expatEmp],
        '2025-04',
        'org1',
        'admin1'
      );

      const updateArg = mockPayment.findOneAndUpdate.mock.calls[0][1];
      expect(updateArg.paymentDetails.contributions).toHaveLength(2);
      expect(updateArg.paymentDetails.contributions[0].employeeId).toBe('emp1');
      expect(updateArg.paymentDetails.contributions[1].employeeId).toBe('emp2');
    });

    it('sets due date to 15th of next month', async () => {
      mockPayment.findOneAndUpdate.mockResolvedValue({ _id: 'pay5' });

      await service.calculateMonthlyContributions([saudiEmp], '2025-03', 'org1', 'admin1');

      const updateArg = mockPayment.findOneAndUpdate.mock.calls[0][1];
      // period=2025-03, dueDate should be April 15, 2025
      expect(updateArg.dueDate.getFullYear()).toBe(2025);
      expect(updateArg.dueDate.getMonth()).toBe(3); // April = month index 3
      expect(updateArg.dueDate.getDate()).toBe(15);
    });

    it('handles empty employees array', async () => {
      mockPayment.findOneAndUpdate.mockResolvedValue({ _id: 'pay6', grandTotal: 0 });

      const result = await service.calculateMonthlyContributions([], '2025-05', 'org1', 'admin1');
      const updateArg = mockPayment.findOneAndUpdate.mock.calls[0][1];
      expect(updateArg.totalEmployees).toBe(0);
      expect(updateArg.grandTotal).toBe(0);
      expect(result).toBeDefined();
    });
  });
});
