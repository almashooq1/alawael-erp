'use strict';

/* ── mock-prefixed variables for jest.mock factory ── */
const mockSigReqFind = jest
  .fn()
  .mockReturnValue({
    sort: jest
      .fn()
      .mockReturnValue({
        limit: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }),
      }),
  });
const mockSigReqFindById = jest.fn();
const mockSigReqCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'sr1', ...d }));
const mockSigReqCount = jest.fn().mockResolvedValue(5);

const mockTplFind = jest
  .fn()
  .mockReturnValue({ sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }) });
const mockTplFindOne = jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });
const mockTplCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 't1', ...d }));
const mockTplCount = jest.fn().mockResolvedValue(2);

const mockCertFind = jest
  .fn()
  .mockReturnValue({ sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }) });
const mockCertCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'c1', ...d }));
const mockCertUpdate = jest
  .fn()
  .mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'c1', status: 'revoked' }) });
const mockCertCount = jest.fn().mockResolvedValue(3);

const mockAuditFind = jest
  .fn()
  .mockReturnValue({ sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }) });
const mockAuditCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'a1', ...d }));
const mockAuditCount = jest.fn().mockResolvedValue(10);

jest.mock('../../models/DddDigitalSignature', () => ({
  DDDSignatureRequest: {
    find: mockSigReqFind,
    findById: mockSigReqFindById,
    findOne: jest.fn().mockResolvedValue(null),
    create: mockSigReqCreate,
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({}) }),
    countDocuments: mockSigReqCount,
  },
  DDDSignatureTemplate: {
    find: mockTplFind,
    findOne: mockTplFindOne,
    create: mockTplCreate,
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({}) }),
    countDocuments: mockTplCount,
  },
  DDDCertificate: {
    find: mockCertFind,
    findOne: jest.fn().mockResolvedValue(null),
    create: mockCertCreate,
    findByIdAndUpdate: mockCertUpdate,
    countDocuments: mockCertCount,
  },
  DDDSignatureAudit: {
    find: mockAuditFind,
    findOne: jest.fn().mockResolvedValue(null),
    create: mockAuditCreate,
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({}) }),
    countDocuments: mockAuditCount,
  },
  SIGNATURE_TYPES: ['electronic', 'digital', 'advanced'],
  SIGNATURE_STATUSES: ['pending', 'signed', 'declined', 'completed'],
  SIGNER_ROLES: ['primary', 'witness', 'notary'],
  CERTIFICATE_STATUSES: ['active', 'expired', 'revoked'],
  VERIFICATION_METHODS: ['otp', 'biometric'],
  SIGNING_ALGORITHMS: ['RSA', 'ECDSA'],
  BUILTIN_SIGNATURE_TEMPLATES: [{ code: 'standard', name: 'Standard' }],
}));

jest.mock('../../services/base/BaseCrudService', () => {
  return class BaseCrudService {
    constructor(n, m, models) {
      this.name = n;
      this.meta = m;
      this.models = models;
    }
    log() {}
    _list(M, q, o) {
      return M.find(q || {})
        .sort((o && o.sort) || {})
        .lean();
    }
    _getById(M, id) {
      return M.findById(id);
    }
    _create(M, d) {
      return M.create(d);
    }
    _update(M, id, d, o) {
      return M.findByIdAndUpdate(id, d, { new: true, ...(o || {}) }).lean();
    }
  };
});

const svc = require('../../services/dddDigitalSignature');

describe('dddDigitalSignature service', () => {
  beforeEach(() => jest.clearAllMocks());

  /* ── Singleton ── */
  test('exports singleton instance', () => {
    expect(typeof svc).toBe('object');
    expect(svc.name).toBe('DigitalSignature');
  });
  test('initialize seeds templates', async () => {
    await svc.initialize();
    expect(mockTplFindOne).toHaveBeenCalled();
  });

  /* ── Requests ── */
  test('listRequests returns array', async () => {
    const r = await svc.listRequests();
    expect(mockSigReqFind).toHaveBeenCalled();
  });
  test('createRequest generates requestCode', async () => {
    const r = await svc.createRequest({ title: 'Sign contract' });
    expect(r.requestCode).toMatch(/^SIG-/);
  });
  test('signDocument - not found returns null', async () => {
    mockSigReqFindById.mockResolvedValueOnce(null);
    const r = await svc.signDocument('id1', 'u1', 'sig');
    expect(r).toBeNull();
  });
  test('signDocument - signer not found returns null', async () => {
    mockSigReqFindById.mockResolvedValueOnce({ signers: [] });
    const r = await svc.signDocument('id1', 'u1', 'sig');
    expect(r).toBeNull();
  });
  test('signDocument - marks signer signed, checks completion', async () => {
    const signer = { userId: { toString: () => 'u1' }, status: 'pending' };
    const mockSave = jest.fn().mockResolvedValue({ status: 'completed' });
    mockSigReqFindById.mockResolvedValueOnce({ signers: [signer], save: mockSave });
    const r = await svc.signDocument('id1', 'u1', 'myData');
    expect(signer.status).toBe('signed');
    expect(mockSave).toHaveBeenCalled();
  });
  test('signDocument - not all signed keeps status signed', async () => {
    const s1 = { userId: { toString: () => 'u1' }, status: 'pending' };
    const s2 = { userId: { toString: () => 'u2' }, status: 'pending' };
    const mockSave = jest.fn().mockResolvedValue({ status: 'signed' });
    mockSigReqFindById.mockResolvedValueOnce({ signers: [s1, s2], save: mockSave });
    await svc.signDocument('id1', 'u1', 'data');
    expect(s1.status).toBe('signed');
    expect(s2.status).toBe('pending');
  });
  test('declineSignature - not found returns null', async () => {
    mockSigReqFindById.mockResolvedValueOnce(null);
    expect(await svc.declineSignature('id1', 'u1', 'reason')).toBeNull();
  });
  test('declineSignature - signer not found returns null', async () => {
    mockSigReqFindById.mockResolvedValueOnce({ signers: [] });
    expect(await svc.declineSignature('id1', 'u1', 'reason')).toBeNull();
  });
  test('declineSignature marks signer declined', async () => {
    const signer = { userId: { toString: () => 'u1' }, status: 'pending' };
    const mockSave = jest.fn().mockResolvedValue({ status: 'declined' });
    mockSigReqFindById.mockResolvedValueOnce({
      signers: [signer],
      status: 'pending',
      save: mockSave,
    });
    await svc.declineSignature('id1', 'u1', 'wrong doc');
    expect(signer.status).toBe('declined');
    expect(signer.declineReason).toBe('wrong doc');
    expect(mockSave).toHaveBeenCalled();
  });

  /* ── Templates ── */
  test('listTemplates calls model', async () => {
    await svc.listTemplates();
    expect(mockTplFind).toHaveBeenCalled();
  });
  test('createTemplate creates', async () => {
    const r = await svc.createTemplate({ name: 'T1' });
    expect(mockTplCreate).toHaveBeenCalled();
  });

  /* ── Certificates ── */
  test('listCertificates returns array', async () => {
    await svc.listCertificates({ userId: 'u1' });
    expect(mockCertFind).toHaveBeenCalled();
  });
  test('issueCertificate generates certCode', async () => {
    const r = await svc.issueCertificate({ userId: 'u1' });
    expect(r.certCode).toMatch(/^CERT-/);
  });
  test('revokeCertificate revokes', async () => {
    const r = await svc.revokeCertificate('c1', 'compromised');
    expect(mockCertUpdate).toHaveBeenCalledWith(
      'c1',
      expect.objectContaining({ status: 'revoked' }),
      { new: true }
    );
  });

  /* ── Audit ── */
  test('listAudit fetches by requestId', async () => {
    await svc.listAudit('r1');
    expect(mockAuditFind).toHaveBeenCalledWith({ requestId: 'r1' });
  });
  test('logAudit creates entry', async () => {
    await svc.logAudit({ action: 'sign' });
    expect(mockAuditCreate).toHaveBeenCalled();
  });

  /* ── Analytics ── */
  test('getSignatureAnalytics returns counts', async () => {
    mockSigReqCount.mockResolvedValueOnce(5).mockResolvedValueOnce(3);
    const a = await svc.getSignatureAnalytics();
    expect(a).toHaveProperty('requests');
    expect(a).toHaveProperty('completed');
    expect(a).toHaveProperty('templates');
    expect(a).toHaveProperty('certificates');
    expect(a).toHaveProperty('audits');
  });
});
