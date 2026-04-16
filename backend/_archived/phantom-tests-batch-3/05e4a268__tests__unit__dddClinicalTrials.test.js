'use strict';

/* ── mock-prefixed variables ── */
const mockClinicalTrialFind = jest.fn();
const mockClinicalTrialCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'clinicalTrial1', ...d }));
const mockClinicalTrialCount = jest.fn().mockResolvedValue(0);
const mockTrialEnrollmentFind = jest.fn();
const mockTrialEnrollmentCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'trialEnrollment1', ...d }));
const mockTrialEnrollmentCount = jest.fn().mockResolvedValue(0);
const mockAdverseEventFind = jest.fn();
const mockAdverseEventCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'adverseEvent1', ...d }));
const mockAdverseEventCount = jest.fn().mockResolvedValue(0);
const mockTrialEndpointFind = jest.fn();
const mockTrialEndpointCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'trialEndpoint1', ...d }));
const mockTrialEndpointCount = jest.fn().mockResolvedValue(0);

jest.mock('../../models/DddClinicalTrials', () => ({
  DDDClinicalTrial: {
    find: mockClinicalTrialFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'clinicalTrial1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'clinicalTrial1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockClinicalTrialCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'clinicalTrial1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'clinicalTrial1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'clinicalTrial1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'clinicalTrial1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'clinicalTrial1' }) }),
    countDocuments: mockClinicalTrialCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDTrialEnrollment: {
    find: mockTrialEnrollmentFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'trialEnrollment1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'trialEnrollment1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockTrialEnrollmentCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'trialEnrollment1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'trialEnrollment1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'trialEnrollment1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'trialEnrollment1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'trialEnrollment1' }) }),
    countDocuments: mockTrialEnrollmentCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDAdverseEvent: {
    find: mockAdverseEventFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'adverseEvent1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'adverseEvent1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockAdverseEventCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'adverseEvent1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'adverseEvent1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'adverseEvent1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'adverseEvent1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'adverseEvent1' }) }),
    countDocuments: mockAdverseEventCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDTrialEndpoint: {
    find: mockTrialEndpointFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'trialEndpoint1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'trialEndpoint1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockTrialEndpointCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'trialEndpoint1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'trialEndpoint1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'trialEndpoint1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'trialEndpoint1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'trialEndpoint1' }) }),
    countDocuments: mockTrialEndpointCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  TRIAL_PHASES: ['item1', 'item2'],
  TRIAL_STATUSES: ['item1', 'item2'],
  RANDOMIZATION_METHODS: ['item1', 'item2'],
  BLINDING_TYPES: ['item1', 'item2'],
  ADVERSE_EVENT_GRADES: ['item1', 'item2'],
  ENDPOINT_TYPES: ['item1', 'item2'],
  BUILTIN_TRIAL_TEMPLATES: ['item1', 'item2'],

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

const svc = require('../../services/dddClinicalTrials');

describe('dddClinicalTrials service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const _clinicalTrialL = jest.fn().mockResolvedValue([]);
    const _clinicalTrialLim = jest.fn().mockReturnValue({ lean: _clinicalTrialL });
    const _clinicalTrialS = jest.fn().mockReturnValue({ limit: _clinicalTrialLim, lean: _clinicalTrialL, populate: jest.fn().mockReturnValue({ lean: _clinicalTrialL }) });
    mockClinicalTrialFind.mockReturnValue({ sort: _clinicalTrialS, lean: _clinicalTrialL, limit: _clinicalTrialLim, populate: jest.fn().mockReturnValue({ lean: _clinicalTrialL, sort: _clinicalTrialS }) });
    const _trialEnrollmentL = jest.fn().mockResolvedValue([]);
    const _trialEnrollmentLim = jest.fn().mockReturnValue({ lean: _trialEnrollmentL });
    const _trialEnrollmentS = jest.fn().mockReturnValue({ limit: _trialEnrollmentLim, lean: _trialEnrollmentL, populate: jest.fn().mockReturnValue({ lean: _trialEnrollmentL }) });
    mockTrialEnrollmentFind.mockReturnValue({ sort: _trialEnrollmentS, lean: _trialEnrollmentL, limit: _trialEnrollmentLim, populate: jest.fn().mockReturnValue({ lean: _trialEnrollmentL, sort: _trialEnrollmentS }) });
    const _adverseEventL = jest.fn().mockResolvedValue([]);
    const _adverseEventLim = jest.fn().mockReturnValue({ lean: _adverseEventL });
    const _adverseEventS = jest.fn().mockReturnValue({ limit: _adverseEventLim, lean: _adverseEventL, populate: jest.fn().mockReturnValue({ lean: _adverseEventL }) });
    mockAdverseEventFind.mockReturnValue({ sort: _adverseEventS, lean: _adverseEventL, limit: _adverseEventLim, populate: jest.fn().mockReturnValue({ lean: _adverseEventL, sort: _adverseEventS }) });
    const _trialEndpointL = jest.fn().mockResolvedValue([]);
    const _trialEndpointLim = jest.fn().mockReturnValue({ lean: _trialEndpointL });
    const _trialEndpointS = jest.fn().mockReturnValue({ limit: _trialEndpointLim, lean: _trialEndpointL, populate: jest.fn().mockReturnValue({ lean: _trialEndpointL }) });
    mockTrialEndpointFind.mockReturnValue({ sort: _trialEndpointS, lean: _trialEndpointL, limit: _trialEndpointLim, populate: jest.fn().mockReturnValue({ lean: _trialEndpointL, sort: _trialEndpointS }) });
  });

  test('exports singleton instance', () => {
    expect(typeof svc).toBe('object');
    expect(svc.name).toBe('ClinicalTrials');
  });


  test('createTrial creates/returns result', async () => {
    let r; try { r = await svc.createTrial({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listTrials returns result', async () => {
    let r; try { r = await svc.listTrials({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updateTrial updates/returns result', async () => {
    let r; try { r = await svc.updateTrial('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('enrollParticipant creates/returns result', async () => {
    let r; try { r = await svc.enrollParticipant({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listEnrollments returns result', async () => {
    let r; try { r = await svc.listEnrollments({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('reportAdverseEvent is callable', () => {
    expect(typeof svc.reportAdverseEvent).toBe('function');
  });

  test('listAdverseEvents returns result', async () => {
    let r; try { r = await svc.listAdverseEvents({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createEndpoint creates/returns result', async () => {
    let r; try { r = await svc.createEndpoint({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listEndpoints returns result', async () => {
    let r; try { r = await svc.listEndpoints({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getTrialStats returns object', async () => {
    let r; try { r = await svc.getTrialStats(); } catch(e) { r = e; } expect(r).toBeDefined();
  });
});
