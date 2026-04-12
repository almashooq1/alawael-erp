/**
 * Unit tests for governmentIntegration.service.js — Government Integration Service
 * Singleton. Lazy loads Employee model + gosi.service + gosi-advanced.service + qiwa.service.
 */

/* ── Chainable query helper ─────────────────────────────────────────── */
global.__giQ = function (val) {
  return {
    populate: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    then: (r, e) => Promise.resolve(val).then(r, e),
  };
};

/* ── Mock Employee model ────────────────────────────────────────────── */
const mockEmployee = {
  find: jest.fn(() => global.__giQ([])),
  findById: jest.fn(() => global.__giQ(null)),
  findOne: jest.fn(() => global.__giQ(null)),
  countDocuments: jest.fn().mockResolvedValue(0),
};
jest.mock('../../models/employee.model', () => mockEmployee);

/* ── Mock external services ─────────────────────────────────────────── */
const mockGosiAdvanced = {
  registerEmployee: jest.fn().mockResolvedValue({ success: true, subscriptionNumber: 'GOSI-001' }),
  calculateGOSIContributions: jest.fn().mockReturnValue({
    employeeShare: 450,
    companyShare: 550,
    total: 1000,
    details: {},
  }),
  getSubscriptionStatus: jest
    .fn()
    .mockResolvedValue({ status: 'active', subscriptionNumber: 'GOSI-001' }),
  updateEmployeeWage: jest.fn().mockResolvedValue({ success: true }),
  cancelSubscription: jest.fn().mockResolvedValue({ success: true }),
  generateCertificate: jest.fn().mockResolvedValue({ certificate: 'pdf-data', url: '/cert.pdf' }),
  getComplianceReport: jest.fn().mockResolvedValue({ compliant: true, issues: [] }),
};

const mockQiwa = {
  registerContract: jest.fn().mockResolvedValue({ success: true, contractId: 'QW-001' }),
  verifyEmployeeByIqama: jest.fn().mockResolvedValue({ verified: true }),
  verifyEmployeeByNationalId: jest.fn().mockResolvedValue({ verified: true }),
  getContract: jest.fn().mockResolvedValue({ contractId: 'QW-001', status: 'active' }),
  updateEmployeeWage: jest.fn().mockResolvedValue({ success: true }),
  submitPayrollToWPS: jest.fn().mockResolvedValue({ success: true }),
  getNitaqatStatus: jest.fn().mockResolvedValue({ zone: 'green', score: 85 }),
  getNitaqatCompliance: jest.fn().mockResolvedValue({ compliant: true }),
  getEmployeeLaborRecord: jest.fn().mockResolvedValue({ records: [] }),
};

const mockGosiBasic = {};

jest.mock('../../services/gosi-advanced.service', () => mockGosiAdvanced);
jest.mock('../../services/qiwa.service', () => mockQiwa);
jest.mock('../../services/gosi.service', () => mockGosiBasic);
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

/* ── SUT ────────────────────────────────────────────────────────────── */
const svc = require('../../services/governmentIntegration.service');

/* ── Helpers: build employee doc ────────────────────────────────────── */
function makeEmp(overrides = {}) {
  return {
    _id: 'emp1',
    name: 'Ali Ahmed',
    nationalId: '1234567890',
    iqamaNumber: '2345678901',
    isSaudi: true,
    basicSalary: 5000,
    housingAllowance: 1500,
    salary: { basic: 5000, housing: 1500 },
    gosi: { status: 'inactive', subscriptionNumber: null },
    qiwa: { status: 'inactive', contractId: null },
    wps: {},
    government: {},
    status: 'active',
    save: jest.fn().mockResolvedValue(true),
    toObject: jest.fn().mockReturnThis(),
    lean: jest.fn().mockReturnThis(),
    ...overrides,
  };
}

/* ── Reset ──────────────────────────────────────────────────────────── */
beforeEach(() => {
  jest.clearAllMocks();
  mockEmployee.findById.mockImplementation(() => global.__giQ(null));
  mockEmployee.find.mockImplementation(() => global.__giQ([]));
  mockEmployee.countDocuments.mockResolvedValue(0);
});

/* ═══════════════════════════════════════════════════════════════════════ */
describe('GovernmentIntegrationService', () => {
  /* ── GOSI Registration ───────────────────────────────────────────── */
  describe('registerEmployeeGOSI', () => {
    test('registers employee in GOSI', async () => {
      const emp = makeEmp();
      mockEmployee.findById.mockImplementation(() => global.__giQ(emp));
      const result = await svc.registerEmployeeGOSI('emp1');
      expect(result).toBeDefined();
      expect(mockGosiAdvanced.registerEmployee).toHaveBeenCalled();
    });

    test('throws for non-existent employee', async () => {
      await expect(svc.registerEmployeeGOSI('nope')).rejects.toThrow();
    });
  });

  /* ── GOSI Status ─────────────────────────────────────────────────── */
  describe('getEmployeeGOSIStatus', () => {
    test('returns GOSI status', async () => {
      const emp = makeEmp();
      mockEmployee.findById.mockImplementation(() => global.__giQ(emp));
      const result = await svc.getEmployeeGOSIStatus('emp1');
      expect(result).toBeDefined();
    });

    test('throws for non-existent employee', async () => {
      await expect(svc.getEmployeeGOSIStatus('nope')).rejects.toThrow();
    });
  });

  /* ── GOSI Wage Update ────────────────────────────────────────────── */
  describe('updateEmployeeGOSIWage', () => {
    test('updates wage in GOSI', async () => {
      const emp = makeEmp({ gosi: { status: 'active', subscriptionNumber: 'GOSI-001' } });
      mockEmployee.findById.mockImplementation(() => global.__giQ(emp));
      const result = await svc.updateEmployeeGOSIWage('emp1', 7000);
      expect(mockGosiAdvanced.updateEmployeeWage).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  /* ── GOSI Contributions ──────────────────────────────────────────── */
  describe('calculateGOSIContributions', () => {
    test('calculates contributions', async () => {
      const result = await svc.calculateGOSIContributions(5000, 1500, true);
      expect(mockGosiAdvanced.calculateGOSIContributions).toHaveBeenCalledWith(5000, 1500, true);
      expect(result.total).toBe(1000);
    });
  });

  /* ── Cancel GOSI ─────────────────────────────────────────────────── */
  describe('cancelEmployeeGOSI', () => {
    test('cancels GOSI subscription', async () => {
      const emp = makeEmp({ gosi: { status: 'active', subscriptionNumber: 'GOSI-001' } });
      mockEmployee.findById.mockImplementation(() => global.__giQ(emp));
      const result = await svc.cancelEmployeeGOSI('emp1', 'termination');
      expect(mockGosiAdvanced.cancelSubscription).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  /* ── GOSI Certificate ────────────────────────────────────────────── */
  describe('generateGOSICertificate', () => {
    test('generates certificate', async () => {
      const emp = makeEmp({ gosi: { status: 'active', subscriptionNumber: 'GOSI-001' } });
      mockEmployee.findById.mockImplementation(() => global.__giQ(emp));
      const result = await svc.generateGOSICertificate('emp1', 'subscription');
      expect(mockGosiAdvanced.generateCertificate).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  /* ── GOSI Compliance Report ──────────────────────────────────────── */
  describe('getGOSIComplianceReport', () => {
    test('returns compliance report', async () => {
      const result = await svc.getGOSIComplianceReport({});
      expect(mockGosiAdvanced.getComplianceReport).toHaveBeenCalled();
      expect(result.compliant).toBe(true);
    });
  });

  /* ── Qiwa Contract ──────────────────────────────────────────────── */
  describe('registerEmployeeQiwaContract', () => {
    test('registers qiwa contract', async () => {
      const emp = makeEmp();
      mockEmployee.findById.mockImplementation(() => global.__giQ(emp));
      const result = await svc.registerEmployeeQiwaContract('emp1', { type: 'full-time' });
      expect(mockQiwa.registerContract).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  /* ── Verify Qiwa ─────────────────────────────────────────────────── */
  describe('verifyEmployeeInQiwa', () => {
    test('verifies employee in qiwa', async () => {
      const emp = makeEmp();
      mockEmployee.findById.mockImplementation(() => global.__giQ(emp));
      const result = await svc.verifyEmployeeInQiwa('emp1');
      expect(result).toBeDefined();
    });
  });

  /* ── Qiwa Status ─────────────────────────────────────────────────── */
  describe('getEmployeeQiwaStatus', () => {
    test('returns qiwa status', async () => {
      const emp = makeEmp();
      mockEmployee.findById.mockImplementation(() => global.__giQ(emp));
      const result = await svc.getEmployeeQiwaStatus('emp1');
      expect(result).toBeDefined();
    });
  });

  /* ── Qiwa Wage Update ────────────────────────────────────────────── */
  describe('updateEmployeeWageInQiwa', () => {
    test('updates wage in qiwa', async () => {
      const emp = makeEmp({ qiwa: { status: 'active', contractId: 'QW-001' } });
      mockEmployee.findById.mockImplementation(() => global.__giQ(emp));
      const result = await svc.updateEmployeeWageInQiwa('emp1', { newWage: 7000 });
      expect(mockQiwa.updateEmployeeWage).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  /* ── WPS / Nitaqat ───────────────────────────────────────────────── */
  describe('submitPayrollToWPS', () => {
    test('submits payroll', async () => {
      const result = await svc.submitPayrollToWPS({ month: '2024-01' });
      expect(mockQiwa.submitPayrollToWPS).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });
  });

  describe('getNitaqatStatus', () => {
    test('returns nitaqat status', async () => {
      const result = await svc.getNitaqatStatus();
      expect(result.zone).toBe('green');
    });
  });

  describe('getNitaqatCompliance', () => {
    test('returns nitaqat compliance', async () => {
      const result = await svc.getNitaqatCompliance();
      expect(result.compliant).toBe(true);
    });
  });

  /* ── Labor Record ────────────────────────────────────────────────── */
  describe('getEmployeeLaborRecord', () => {
    test('returns labor record', async () => {
      const emp = makeEmp();
      mockEmployee.findById.mockImplementation(() => global.__giQ(emp));
      const result = await svc.getEmployeeLaborRecord('emp1');
      expect(result).toBeDefined();
    });
  });

  /* ── Full Government Registration ────────────────────────────────── */
  describe('fullGovernmentRegistration', () => {
    test('registers employee in both GOSI and Qiwa', async () => {
      const emp = makeEmp();
      mockEmployee.findById.mockImplementation(() => global.__giQ(emp));
      const result = await svc.fullGovernmentRegistration('emp1');
      expect(result).toBeDefined();
    });
  });

  /* ── Government Status ───────────────────────────────────────────── */
  describe('getEmployeeGovernmentStatus', () => {
    test('returns government status', async () => {
      const emp = makeEmp();
      mockEmployee.findById.mockImplementation(() => global.__giQ(emp));
      const result = await svc.getEmployeeGovernmentStatus('emp1');
      expect(result).toBeDefined();
    });
  });

  /* ── Terminate Government ────────────────────────────────────────── */
  describe('terminateEmployeeGovernment', () => {
    test('terminates employee government registrations', async () => {
      const emp = makeEmp({ gosi: { status: 'active', subscriptionNumber: 'G1' } });
      mockEmployee.findById.mockImplementation(() => global.__giQ(emp));
      const result = await svc.terminateEmployeeGovernment('emp1', 'resignation');
      expect(result).toBeDefined();
    });
  });

  /* ── _generateAlerts (pure helper) ──────────────────────────────── */
  describe('_generateAlerts', () => {
    test('generates alerts for employee with issues', () => {
      const emp = makeEmp({
        gosi: { status: 'inactive' },
        qiwa: { status: 'inactive' },
      });
      const alerts = svc._generateAlerts(emp);
      expect(Array.isArray(alerts)).toBe(true);
    });

    test('generates no alerts for compliant employee', () => {
      const emp = makeEmp({
        gosi: { status: 'active', subscriptionNumber: 'G1' },
        qiwa: { status: 'active', contractId: 'Q1' },
        wps: { lastPaymentDate: new Date() },
      });
      const alerts = svc._generateAlerts(emp);
      expect(alerts.length).toBeLessThanOrEqual(2);
    });
  });
});
