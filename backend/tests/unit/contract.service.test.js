'use strict';

/* ─── Mock variables ───────────────────────────────────────────────────────── */
const mockCreate = jest.fn();
const mockFindById = jest.fn();
const mockFindByIdAndUpdate = jest.fn();
const mockFindOne = jest.fn();
const mockFind = jest.fn();
const mockCountDocuments = jest.fn();
const mockAggregate = jest.fn();

jest.mock('../../models/nitaqat.models', () => ({
  EmploymentContract: {
    create: (...a) => mockCreate(...a),
    findById: (...a) => mockFindById(...a),
    findByIdAndUpdate: (...a) => mockFindByIdAndUpdate(...a),
    findOne: (...a) => mockFindOne(...a),
    find: (...a) => mockFind(...a),
    countDocuments: (...a) => mockCountDocuments(...a),
    aggregate: (...a) => mockAggregate(...a),
  },
}));

const mockAxiosPost = jest.fn();
jest.mock('axios', () => ({
  post: (...a) => mockAxiosPost(...a),
}));

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

/* ═══════════════════════════════════════════════════════════════════════════ */
describe('contract.service', () => {
  let svc;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.isolateModules(() => {
      svc = require('../../services/contract.service');
    });
  });

  /* ─── createContract ───────────────────────────────────────────────────── */
  describe('createContract', () => {
    test('creates contract with all fields and totalSalary', async () => {
      mockCountDocuments.mockResolvedValue(0);
      const mockDoc = { _id: 'c1', contractNumber: 'CTR-2025-000001' };
      mockCreate.mockResolvedValue(mockDoc);

      const result = await svc.createContract(
        'emp1',
        'org1',
        {
          startDate: '2025-01-01',
          basicSalary: 5000,
          housingAllowance: 1000,
          transportAllowance: 500,
          otherAllowances: 200,
          jobTitleAr: 'مهندس',
          jobTitleEn: 'Engineer',
        },
        'admin1'
      );

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          employee: 'emp1',
          organization: 'org1',
          totalSalary: 6700,
          status: 'draft',
          createdBy: 'admin1',
        })
      );
      expect(result).toBe(mockDoc);
    });

    test('defaults contractType to indefinite', async () => {
      mockCountDocuments.mockResolvedValue(5);
      mockCreate.mockResolvedValue({});

      await svc.createContract('emp1', 'org1', { startDate: '2025-06-01', basicSalary: 3000 }, 'a');
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          contractType: 'indefinite',
        })
      );
    });

    test('calculates probation end date (+90 days)', async () => {
      mockCountDocuments.mockResolvedValue(0);
      mockCreate.mockResolvedValue({});

      await svc.createContract('emp1', 'org1', { startDate: '2025-01-01', basicSalary: 3000 }, 'a');
      const arg = mockCreate.mock.calls[0][0];
      const diff = Math.round((new Date(arg.probationEndDate) - new Date('2025-01-01')) / 86400000);
      expect(diff).toBe(90);
    });

    test('increments contract number sequence', async () => {
      mockCountDocuments.mockResolvedValue(42);
      mockCreate.mockResolvedValue({});

      await svc.createContract('emp1', 'org1', { startDate: '2025-01-01', basicSalary: 3000 }, 'a');
      const arg = mockCreate.mock.calls[0][0];
      const year = new Date().getFullYear();
      expect(arg.contractNumber).toBe(`CTR-${year}-000043`);
    });
  });

  /* ─── submitToQiwa ─────────────────────────────────────────────────────── */
  describe('submitToQiwa', () => {
    const baseDraftContract = () => ({
      status: 'draft',
      contractType: 'indefinite',
      startDate: new Date('2025-01-01'),
      endDate: null,
      jobTitleAr: 'مهندس',
      jobTitleEn: 'Engineer',
      occupationCode: '214',
      basicSalary: 5000,
      housingAllowance: 1000,
      transportAllowance: 500,
      otherAllowances: 0,
      workingHoursPerWeek: 48,
      annualLeaveDays: 21,
      workLocation: 'Riyadh',
      additionalTerms: '',
      updateOne: jest.fn().mockResolvedValue({}),
      toObject: jest.fn().mockReturnValue({ id: 'c1' }),
    });

    test('throws when contract not found', async () => {
      mockFindById.mockResolvedValue(null);
      await expect(svc.submitToQiwa('c1', {}, {})).rejects.toThrow('العقد غير موجود');
    });

    test('throws when contract status is not draft', async () => {
      mockFindById.mockResolvedValue({ status: 'active' });
      await expect(svc.submitToQiwa('c1', {}, {})).rejects.toThrow('لا يمكن رفع عقد بحالة');
    });

    test('uses mock Qiwa ID in non-production when API fails', async () => {
      const contract = baseDraftContract();
      mockFindById.mockResolvedValue(contract);
      mockAxiosPost.mockRejectedValue(new Error('API down'));

      const result = await svc.submitToQiwa(
        'c1',
        { nationalId: '123' },
        { establishmentNumber: 'E1' }
      );
      expect(contract.updateOne).toHaveBeenCalledWith(
        expect.objectContaining({
          qiwaContractId: expect.stringMatching(/^QIWA-MOCK-/),
          status: 'pending_employee',
        })
      );
      expect(result).toBeDefined();
    });

    test('calls Qiwa API and updates contract on success', async () => {
      const contract = baseDraftContract();
      mockFindById.mockResolvedValue(contract);
      mockAxiosPost.mockImplementation(url => {
        if (url.includes('auth/token')) {
          return Promise.resolve({ data: { access_token: 'tok-123' } });
        }
        return Promise.resolve({ data: { contract_id: 'QIWA-REAL-1' } });
      });

      await svc.submitToQiwa(
        'c1',
        { nationalId: '123', updatedBy: 'admin1' },
        { establishmentNumber: 'E1' }
      );
      expect(contract.updateOne).toHaveBeenCalledWith(
        expect.objectContaining({
          qiwaContractId: 'QIWA-REAL-1',
          status: 'pending_employee',
        })
      );
    });
  });

  /* ─── updateStatus ─────────────────────────────────────────────────────── */
  describe('updateStatus', () => {
    test('updates to valid status', async () => {
      mockFindByIdAndUpdate.mockResolvedValue({ status: 'active' });
      await svc.updateStatus('c1', 'active', 'admin1');
      expect(mockFindByIdAndUpdate).toHaveBeenCalledWith(
        'c1',
        expect.objectContaining({
          status: 'active',
          updatedBy: 'admin1',
          employeeSignedDate: expect.any(Date),
        }),
        { new: true }
      );
    });

    test('sets qiwaAuthenticationDate for authenticated', async () => {
      mockFindByIdAndUpdate.mockResolvedValue({ status: 'authenticated' });
      await svc.updateStatus('c1', 'authenticated', 'admin1');
      expect(mockFindByIdAndUpdate).toHaveBeenCalledWith(
        'c1',
        expect.objectContaining({ qiwaAuthenticationDate: expect.any(Date) }),
        { new: true }
      );
    });

    test('throws for invalid status', async () => {
      await expect(svc.updateStatus('c1', 'invalid_status', 'admin1')).rejects.toThrow(
        'حالة عقد غير صالحة'
      );
    });
  });

  /* ─── getContracts ─────────────────────────────────────────────────────── */
  describe('getContracts', () => {
    test('fetches contracts with filters', async () => {
      const mockLean = jest.fn().mockResolvedValue([{ contractNumber: 'CTR-1' }]);
      const mockPopulate = jest.fn().mockReturnValue({ lean: mockLean });
      const mockSort = jest.fn().mockReturnValue({ populate: mockPopulate });
      mockFind.mockReturnValue({ sort: mockSort });

      const result = await svc.getContracts('org1', { status: 'active' });
      expect(mockFind).toHaveBeenCalledWith({ organization: 'org1', status: 'active' });
      expect(result).toEqual([{ contractNumber: 'CTR-1' }]);
    });

    test('fetches all contracts without filters', async () => {
      const mockLean = jest.fn().mockResolvedValue([]);
      const mockPopulate = jest.fn().mockReturnValue({ lean: mockLean });
      const mockSort = jest.fn().mockReturnValue({ populate: mockPopulate });
      mockFind.mockReturnValue({ sort: mockSort });

      await svc.getContracts('org1');
      expect(mockFind).toHaveBeenCalledWith({ organization: 'org1' });
    });
  });

  /* ─── getContract ──────────────────────────────────────────────────────── */
  describe('getContract', () => {
    test('fetches single contract by ID with populate', async () => {
      const mockLean = jest.fn().mockResolvedValue({ contractNumber: 'CTR-1' });
      const mockPopulate = jest.fn().mockReturnValue({ lean: mockLean });
      mockFindById.mockReturnValue({ populate: mockPopulate });

      const result = await svc.getContract('c1');
      expect(mockFindById).toHaveBeenCalledWith('c1');
      expect(result).toEqual({ contractNumber: 'CTR-1' });
    });
  });

  /* ─── getEmployeeActiveContract ────────────────────────────────────────── */
  describe('getEmployeeActiveContract', () => {
    test('fetches active contract for employee', async () => {
      const mockLean = jest.fn().mockResolvedValue({ status: 'active' });
      const mockSort = jest.fn().mockReturnValue({ lean: mockLean });
      mockFindOne.mockReturnValue({ sort: mockSort });

      const result = await svc.getEmployeeActiveContract('emp1');
      expect(mockFindOne).toHaveBeenCalledWith({
        employee: 'emp1',
        status: { $in: ['active', 'authenticated', 'pending_employee'] },
      });
      expect(result).toEqual({ status: 'active' });
    });
  });

  /* ─── getStats ─────────────────────────────────────────────────────────── */
  describe('getStats', () => {
    test('returns total, byStatus, and expiringSoon', async () => {
      mockCountDocuments
        .mockResolvedValueOnce(50) // total
        .mockResolvedValueOnce(3); // expiringSoon
      mockAggregate.mockResolvedValue([
        { _id: 'active', count: 30 },
        { _id: 'draft', count: 20 },
      ]);

      const result = await svc.getStats('org1');
      expect(result.total).toBe(50);
      expect(result.byStatus).toEqual([
        { _id: 'active', count: 30 },
        { _id: 'draft', count: 20 },
      ]);
      expect(result.expiringSoon).toBe(3);
    });
  });

  /* ─── _generateContractNumber ──────────────────────────────────────────── */
  describe('_generateContractNumber', () => {
    test('generates sequential contract number', async () => {
      mockCountDocuments.mockResolvedValue(42);
      const result = await svc._generateContractNumber('org1');
      const year = new Date().getFullYear();
      expect(result).toBe(`CTR-${year}-000043`);
    });

    test('starts at 000001 for first contract', async () => {
      mockCountDocuments.mockResolvedValue(0);
      const result = await svc._generateContractNumber('org1');
      const year = new Date().getFullYear();
      expect(result).toBe(`CTR-${year}-000001`);
    });
  });
});
