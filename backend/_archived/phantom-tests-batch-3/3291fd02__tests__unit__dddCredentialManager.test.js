'use strict';

const chain = () => {
  const c = {};
  [
    'find',
    'findById',
    'findByIdAndUpdate',
    'findOne',
    'sort',
    'skip',
    'limit',
    'lean',
    'populate',
    'countDocuments',
    'create',
    'insertMany',
    'aggregate',
  ].forEach(m => {
    c[m] = jest.fn().mockReturnValue(c);
  });
  c.then = undefined;
  return c;
};
const makeModel = () => {
  const c = chain();
  const M = jest.fn(() => c);
  Object.assign(M, c);
  return M;
};

const mockDDDCredential = makeModel();
const mockDDDCredentialCEURecord = makeModel();
const mockDDDVerificationLog = makeModel();
const mockDDDComplianceRequirement = makeModel();

jest.mock('../../models/DddCredentialManager', () => ({
  DDDCredential: mockDDDCredential,
  DDDCredentialCEURecord: mockDDDCredentialCEURecord,
  DDDVerificationLog: mockDDDVerificationLog,
  DDDComplianceRequirement: mockDDDComplianceRequirement,
  CREDENTIAL_TYPES: ['license', 'certification'],
  CREDENTIAL_STATUSES: ['active', 'expired', 'pending'],
  ISSUING_BODIES: ['MOH', 'SCFHS'],
  CEU_CATEGORIES: ['clinical', 'admin'],
  VERIFICATION_METHODS: ['manual', 'automated'],
  RENEWAL_FREQUENCIES: ['annual', 'biennial'],
  BUILTIN_CREDENTIAL_TEMPLATES: [],
}));

jest.mock('../../services/base/BaseCrudService', () => {
  return class BaseCrudService {
    constructor() {}
    log() {}
    _create(M, d) {
      return M.create(d);
    }
    _update(M, id, d, o) {
      return M.findByIdAndUpdate(id, d, { new: true, ...o }).lean();
    }
    _list(M, f, o) {
      return M.find(f)
        .sort(o?.sort || {})
        .lean();
    }
    _getById(M, id) {
      return M.findById(id).lean();
    }
  };
});

const svc = require('../../services/dddCredentialManager');

beforeEach(() => jest.clearAllMocks());

/* ─── singleton ─── */
describe('dddCredentialManager – singleton', () => {
  test('exports instance with expected methods', () => {
    expect(svc).toBeDefined();
    expect(typeof svc.createCredential).toBe('function');
    expect(typeof svc.getComplianceStats).toBe('function');
  });
});

/* ─── credentials CRUD ─── */
describe('dddCredentialManager – credentials', () => {
  test('createCredential', async () => {
    mockDDDCredential.create.mockResolvedValueOnce({ _id: 'c1' });
    await svc.createCredential({ name: 'License A' });
    expect(mockDDDCredential.create).toHaveBeenCalled();
  });

  test('listCredentials', async () => {
    mockDDDCredential.find.mockReturnValue(mockDDDCredential);
    mockDDDCredential.sort.mockReturnValue(mockDDDCredential);
    mockDDDCredential.lean.mockResolvedValueOnce([]);
    await svc.listCredentials({ status: 'active' });
    expect(mockDDDCredential.find).toHaveBeenCalled();
  });

  test('getCredentialById', async () => {
    mockDDDCredential.findById.mockReturnValue(mockDDDCredential);
    mockDDDCredential.lean.mockResolvedValueOnce({ _id: 'c1' });
    await svc.getCredentialById('c1');
    expect(mockDDDCredential.findById).toHaveBeenCalledWith('c1');
  });

  test('updateCredential', async () => {
    mockDDDCredential.findByIdAndUpdate.mockReturnValue(mockDDDCredential);
    mockDDDCredential.lean.mockResolvedValueOnce({ _id: 'c1' });
    await svc.updateCredential('c1', { status: 'expired' });
    expect(mockDDDCredential.findByIdAndUpdate).toHaveBeenCalled();
  });
});

/* ─── CEU Records ─── */
describe('dddCredentialManager – CEU records', () => {
  test('createCEURecord', async () => {
    mockDDDCredentialCEURecord.create.mockResolvedValueOnce({ _id: 'r1' });
    await svc.createCEURecord({ hoursEarned: 5 });
    expect(mockDDDCredentialCEURecord.create).toHaveBeenCalled();
  });

  test('listCEURecords', async () => {
    mockDDDCredentialCEURecord.find.mockReturnValue(mockDDDCredentialCEURecord);
    mockDDDCredentialCEURecord.sort.mockReturnValue(mockDDDCredentialCEURecord);
    mockDDDCredentialCEURecord.lean.mockResolvedValueOnce([]);
    await svc.listCEURecords({});
    expect(mockDDDCredentialCEURecord.find).toHaveBeenCalled();
  });
});

/* ─── Verification ─── */
describe('dddCredentialManager – verification', () => {
  test('createVerificationLog', async () => {
    mockDDDVerificationLog.create.mockResolvedValueOnce({ _id: 'v1' });
    await svc.createVerificationLog({ credentialId: 'c1' });
    expect(mockDDDVerificationLog.create).toHaveBeenCalled();
  });

  test('listVerificationLogs by credentialId', async () => {
    mockDDDVerificationLog.find.mockReturnValue(mockDDDVerificationLog);
    mockDDDVerificationLog.sort.mockReturnValue(mockDDDVerificationLog);
    mockDDDVerificationLog.lean.mockResolvedValueOnce([]);
    await svc.listVerificationLogs('c1');
    expect(mockDDDVerificationLog.find).toHaveBeenCalledWith({ credentialId: 'c1' });
  });
});

/* ─── Compliance ─── */
describe('dddCredentialManager – compliance', () => {
  test('createRequirement', async () => {
    mockDDDComplianceRequirement.create.mockResolvedValueOnce({ _id: 'req1' });
    await svc.createRequirement({ name: 'Annual' });
    expect(mockDDDComplianceRequirement.create).toHaveBeenCalled();
  });

  test('listRequirements', async () => {
    mockDDDComplianceRequirement.find.mockReturnValue(mockDDDComplianceRequirement);
    mockDDDComplianceRequirement.sort.mockReturnValue(mockDDDComplianceRequirement);
    mockDDDComplianceRequirement.lean.mockResolvedValueOnce([]);
    await svc.listRequirements({});
    expect(mockDDDComplianceRequirement.find).toHaveBeenCalled();
  });
});

/* ─── getExpiringCredentials ─── */
describe('dddCredentialManager – expiring', () => {
  test('getExpiringCredentials queries within date range', async () => {
    mockDDDCredential.find.mockReturnValue(mockDDDCredential);
    mockDDDCredential.sort.mockReturnValue(mockDDDCredential);
    mockDDDCredential.lean.mockResolvedValueOnce([]);
    await svc.getExpiringCredentials(60);
    expect(mockDDDCredential.find).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'active', expiryDate: expect.any(Object) })
    );
  });
});

/* ─── getComplianceStats ─── */
describe('dddCredentialManager – analytics', () => {
  test('getComplianceStats returns counts + rate', async () => {
    mockDDDCredential.countDocuments
      .mockResolvedValueOnce(100) // total
      .mockResolvedValueOnce(80) // active
      .mockResolvedValueOnce(15) // expired
      .mockResolvedValueOnce(5); // pending
    const r = await svc.getComplianceStats();
    expect(r.total).toBe(100);
    expect(r.active).toBe(80);
    expect(r.expired).toBe(15);
    expect(r.pending).toBe(5);
    expect(r.complianceRate).toBe('80.0');
  });

  test('getComplianceStats handles zero total', async () => {
    mockDDDCredential.countDocuments
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);
    const r = await svc.getComplianceStats();
    expect(r.complianceRate).toBe(0);
  });
});
