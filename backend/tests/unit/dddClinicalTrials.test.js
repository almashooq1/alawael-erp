'use strict';

/* ─── Model mock ─── */
const chain = () => ({
  sort: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  lean: jest.fn().mockResolvedValue([]),
});
const makeModel = name => {
  const m = function (d) {
    this.data = d;
  };
  m.modelName = name;
  m.find = jest.fn(chain);
  m.findById = jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'id1' }) });
  m.findByIdAndUpdate = jest
    .fn()
    .mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'id1' }) });
  m.countDocuments = jest.fn().mockResolvedValue(5);
  m.create = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'id1', ...d }));
  return m;
};

const mockDDDClinicalTrial = makeModel('DDDClinicalTrial');
const mockDDDTrialEnrollment = makeModel('DDDTrialEnrollment');
const mockDDDAdverseEvent = makeModel('DDDAdverseEvent');
const mockDDDTrialEndpoint = makeModel('DDDTrialEndpoint');

jest.mock('../../models/DddClinicalTrials', () => ({
  DDDClinicalTrial: mockDDDClinicalTrial,
  DDDTrialEnrollment: mockDDDTrialEnrollment,
  DDDAdverseEvent: mockDDDAdverseEvent,
  DDDTrialEndpoint: mockDDDTrialEndpoint,
  TRIAL_PHASES: [],
  TRIAL_STATUSES: [],
  RANDOMIZATION_METHODS: [],
  BLINDING_TYPES: [],
  ADVERSE_EVENT_GRADES: [],
  ENDPOINT_TYPES: [],
  BUILTIN_TRIAL_TEMPLATES: [],
}));

jest.mock('../../services/base/BaseCrudService', () => {
  return class {
    constructor() {
      this.models = {};
    }
    _create(M, d) {
      return M.create(d);
    }
    _list(M, f, o) {
      return M.find(f)
        .sort(o?.sort || {})
        .limit(o?.limit || 20)
        .lean();
    }
    _update(M, id, d) {
      return M.findByIdAndUpdate(id, d, { new: true }).lean();
    }
    _getById(M, id) {
      return M.findById(id).lean();
    }
    log() {}
  };
});

const service = require('../../services/dddClinicalTrials');

describe('dddClinicalTrials service', () => {
  beforeEach(() => jest.clearAllMocks());

  /* ── Singleton ── */
  test('exports singleton', () => {
    expect(service).toBeDefined();
    expect(typeof service.createTrial).toBe('function');
  });

  /* ── Trials CRUD ── */
  test('createTrial', async () => {
    const r = await service.createTrial({ title: 't' });
    expect(mockDDDClinicalTrial.create).toHaveBeenCalledWith({ title: 't' });
    expect(r).toHaveProperty('_id');
  });

  test('listTrials no filter', async () => {
    await service.listTrials();
    expect(mockDDDClinicalTrial.find).toHaveBeenCalledWith({});
  });

  test('listTrials with filter', async () => {
    await service.listTrials({ status: 'recruiting' }, 2, 10);
    expect(mockDDDClinicalTrial.find).toHaveBeenCalledWith({ status: 'recruiting' });
  });

  test('updateTrial', async () => {
    await service.updateTrial('id1', { phase: 2 });
    expect(mockDDDClinicalTrial.findByIdAndUpdate).toHaveBeenCalled();
  });

  /* ── Enrollments ── */
  test('enrollParticipant', async () => {
    await service.enrollParticipant({ trialId: 't1' });
    expect(mockDDDTrialEnrollment.create).toHaveBeenCalledWith({ trialId: 't1' });
  });

  test('listEnrollments', async () => {
    await service.listEnrollments({ trialId: 't1' });
    expect(mockDDDTrialEnrollment.find).toHaveBeenCalledWith({ trialId: 't1' });
  });

  /* ── Adverse Events ── */
  test('reportAdverseEvent', async () => {
    await service.reportAdverseEvent({ grade: 3 });
    expect(mockDDDAdverseEvent.create).toHaveBeenCalledWith({ grade: 3 });
  });

  test('listAdverseEvents', async () => {
    await service.listAdverseEvents();
    expect(mockDDDAdverseEvent.find).toHaveBeenCalledWith({});
  });

  /* ── Endpoints ── */
  test('createEndpoint', async () => {
    await service.createEndpoint({ type: 'primary' });
    expect(mockDDDTrialEndpoint.create).toHaveBeenCalledWith({ type: 'primary' });
  });

  test('listEndpoints', async () => {
    await service.listEndpoints();
    expect(mockDDDTrialEndpoint.find).toHaveBeenCalledWith({});
  });

  /* ── Stats ── */
  test('getTrialStats returns aggregated counts', async () => {
    mockDDDClinicalTrial.countDocuments
      .mockResolvedValueOnce(10) // total
      .mockResolvedValueOnce(3) // recruiting
      .mockResolvedValueOnce(2); // completed (called 3rd for ClinicalTrial)
    mockDDDAdverseEvent.countDocuments.mockResolvedValueOnce(1); // serious AE

    const s = await service.getTrialStats();
    expect(s).toEqual({
      totalTrials: 10,
      recruiting: 3,
      seriousAdverseEvents: 1,
      completedTrials: 2,
    });
  });
});
