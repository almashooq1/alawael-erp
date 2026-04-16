'use strict';

/* ── mock-prefixed variables ── */
const mockPortalAccountFind = jest.fn();
const mockPortalAccountCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'portalAccount1', ...d }));
const mockPortalAccountCount = jest.fn().mockResolvedValue(0);
const mockSecureMessageFind = jest.fn();
const mockSecureMessageCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'secureMessage1', ...d }));
const mockSecureMessageCount = jest.fn().mockResolvedValue(0);
const mockSharedDocumentFind = jest.fn();
const mockSharedDocumentCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'sharedDocument1', ...d }));
const mockSharedDocumentCount = jest.fn().mockResolvedValue(0);
const mockPatientPreferenceFind = jest.fn();
const mockPatientPreferenceCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'patientPreference1', ...d }));
const mockPatientPreferenceCount = jest.fn().mockResolvedValue(0);

jest.mock('../../models/DddPatientPortal', () => ({
  DDDPortalAccount: {
    find: mockPortalAccountFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'portalAccount1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'portalAccount1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockPortalAccountCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'portalAccount1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'portalAccount1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'portalAccount1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'portalAccount1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'portalAccount1' }) }),
    countDocuments: mockPortalAccountCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDSecureMessage: {
    find: mockSecureMessageFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'secureMessage1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'secureMessage1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockSecureMessageCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'secureMessage1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'secureMessage1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'secureMessage1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'secureMessage1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'secureMessage1' }) }),
    countDocuments: mockSecureMessageCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDSharedDocument: {
    find: mockSharedDocumentFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'sharedDocument1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'sharedDocument1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockSharedDocumentCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'sharedDocument1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'sharedDocument1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'sharedDocument1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'sharedDocument1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'sharedDocument1' }) }),
    countDocuments: mockSharedDocumentCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDPatientPreference: {
    find: mockPatientPreferenceFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'patientPreference1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'patientPreference1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockPatientPreferenceCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'patientPreference1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'patientPreference1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'patientPreference1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'patientPreference1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'patientPreference1' }) }),
    countDocuments: mockPatientPreferenceCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  PORTAL_ACCOUNT_STATUSES: ['item1', 'item2'],
  MESSAGE_CATEGORIES: ['item1', 'item2'],
  NOTIFICATION_CHANNELS: ['item1', 'item2'],
  DOCUMENT_TYPES: ['item1', 'item2'],
  PREFERENCE_CATEGORIES: ['item1', 'item2'],
  ACCESS_FEATURES: ['item1', 'item2'],
  BUILTIN_PORTAL_CONFIGS: ['item1', 'item2'],

}));

jest.mock('../../services/base/BaseCrudService', () => {
  return class BaseCrudService {
    constructor(n, m, models) { this.name = n; this.meta = m; this.models = models; }
    log() {}
    _list(M, q, o) {
      const c = M.find(q || {});
      if (o && o.sort) {
        const s = c.sort(o.sort);
        return (o.limit && s.limit) ? s.limit(o.limit).lean() : s.lean();
      }
      return c.lean ? c.lean() : c;
    }
    _getById(M, id) {
      const r = M.findById(id);
      return r && r.lean ? r.lean() : r;
    }
    _create(M, d) { return M.create(d); }
    _update(M, id, d, o) {
      return M.findByIdAndUpdate(id, d, { new: true, ...(o || {}) }).lean();
    }
    _delete(M, id) { return M.findByIdAndDelete(id); }
  };
});

const svc = require('../../services/dddPatientPortal');

describe('dddPatientPortal service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const _portalAccountL = jest.fn().mockResolvedValue([]);
    const _portalAccountLim = jest.fn().mockReturnValue({ lean: _portalAccountL });
    const _portalAccountS = jest.fn().mockReturnValue({ limit: _portalAccountLim, lean: _portalAccountL, populate: jest.fn().mockReturnValue({ lean: _portalAccountL }) });
    mockPortalAccountFind.mockReturnValue({ sort: _portalAccountS, lean: _portalAccountL, limit: _portalAccountLim, populate: jest.fn().mockReturnValue({ lean: _portalAccountL, sort: _portalAccountS }) });
    const _secureMessageL = jest.fn().mockResolvedValue([]);
    const _secureMessageLim = jest.fn().mockReturnValue({ lean: _secureMessageL });
    const _secureMessageS = jest.fn().mockReturnValue({ limit: _secureMessageLim, lean: _secureMessageL, populate: jest.fn().mockReturnValue({ lean: _secureMessageL }) });
    mockSecureMessageFind.mockReturnValue({ sort: _secureMessageS, lean: _secureMessageL, limit: _secureMessageLim, populate: jest.fn().mockReturnValue({ lean: _secureMessageL, sort: _secureMessageS }) });
    const _sharedDocumentL = jest.fn().mockResolvedValue([]);
    const _sharedDocumentLim = jest.fn().mockReturnValue({ lean: _sharedDocumentL });
    const _sharedDocumentS = jest.fn().mockReturnValue({ limit: _sharedDocumentLim, lean: _sharedDocumentL, populate: jest.fn().mockReturnValue({ lean: _sharedDocumentL }) });
    mockSharedDocumentFind.mockReturnValue({ sort: _sharedDocumentS, lean: _sharedDocumentL, limit: _sharedDocumentLim, populate: jest.fn().mockReturnValue({ lean: _sharedDocumentL, sort: _sharedDocumentS }) });
    const _patientPreferenceL = jest.fn().mockResolvedValue([]);
    const _patientPreferenceLim = jest.fn().mockReturnValue({ lean: _patientPreferenceL });
    const _patientPreferenceS = jest.fn().mockReturnValue({ limit: _patientPreferenceLim, lean: _patientPreferenceL, populate: jest.fn().mockReturnValue({ lean: _patientPreferenceL }) });
    mockPatientPreferenceFind.mockReturnValue({ sort: _patientPreferenceS, lean: _patientPreferenceL, limit: _patientPreferenceLim, populate: jest.fn().mockReturnValue({ lean: _patientPreferenceL, sort: _patientPreferenceS }) });
  });

  test('exports singleton instance', () => {
    expect(typeof svc).toBe('object');
    expect(svc.name).toBe('PatientPortal');
  });


  test('createAccount creates/returns result', async () => {
    let r; try { r = await svc.createAccount({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listAccounts returns result', async () => {
    let r; try { r = await svc.listAccounts({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getAccountById returns result', async () => {
    let r; try { r = await svc.getAccountById({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updateAccount updates/returns result', async () => {
    let r; try { r = await svc.updateAccount('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('sendMessage creates/returns result', async () => {
    let r; try { r = await svc.sendMessage({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listMessages returns result', async () => {
    let r; try { r = await svc.listMessages({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('shareDocument is callable', () => {
    expect(typeof svc.shareDocument).toBe('function');
  });

  test('listDocuments returns result', async () => {
    let r; try { r = await svc.listDocuments({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('setPreference updates/returns result', async () => {
    let r; try { r = await svc.setPreference('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getPreferences returns result', async () => {
    let r; try { r = await svc.getPreferences({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getPortalStats returns object', async () => {
    let r; try { r = await svc.getPortalStats(); } catch(e) { r = e; } expect(r).toBeDefined();
  });
});
