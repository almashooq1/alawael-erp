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

const mockDDDOutreachProgram = makeModel('DDDOutreachProgram');
const mockDDDCommunityPartner = makeModel('DDDCommunityPartner');
const mockDDDOutreachEvent = makeModel('DDDOutreachEvent');
const mockDDDImpactReport = makeModel('DDDImpactReport');

jest.mock('../../models/DddCommunityOutreach', () => ({
  DDDOutreachProgram: mockDDDOutreachProgram,
  DDDCommunityPartner: mockDDDCommunityPartner,
  DDDOutreachEvent: mockDDDOutreachEvent,
  DDDImpactReport: mockDDDImpactReport,
  PROGRAM_TYPES: [],
  PROGRAM_STATUSES: [],
  TARGET_AUDIENCES: [],
  PARTNERSHIP_TYPES: [],
  OUTREACH_CHANNELS: [],
  IMPACT_METRICS: [],
  BUILTIN_OUTREACH_TEMPLATES: [],
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

const service = require('../../services/dddCommunityOutreach');

describe('dddCommunityOutreach service', () => {
  beforeEach(() => jest.clearAllMocks());

  /* ── Singleton ── */
  test('exports singleton', () => {
    expect(service).toBeDefined();
    expect(typeof service.createProgram).toBe('function');
  });

  /* ── Programs ── */
  test('createProgram', async () => {
    const r = await service.createProgram({ name: 'P1' });
    expect(mockDDDOutreachProgram.create).toHaveBeenCalledWith({ name: 'P1' });
    expect(r).toHaveProperty('_id');
  });

  test('listPrograms no filter', async () => {
    await service.listPrograms();
    expect(mockDDDOutreachProgram.find).toHaveBeenCalledWith({});
  });

  test('updateProgram', async () => {
    await service.updateProgram('id1', { status: 'active' });
    expect(mockDDDOutreachProgram.findByIdAndUpdate).toHaveBeenCalled();
  });

  /* ── Partners ── */
  test('createPartner', async () => {
    await service.createPartner({ organizationName: 'Org' });
    expect(mockDDDCommunityPartner.create).toHaveBeenCalledWith({ organizationName: 'Org' });
  });

  test('listPartners', async () => {
    await service.listPartners({ status: 'active' });
    expect(mockDDDCommunityPartner.find).toHaveBeenCalledWith({ status: 'active' });
  });

  /* ── Events ── */
  test('createEvent', async () => {
    await service.createEvent({ title: 'E1' });
    expect(mockDDDOutreachEvent.create).toHaveBeenCalledWith({ title: 'E1' });
  });

  test('listEvents', async () => {
    await service.listEvents();
    expect(mockDDDOutreachEvent.find).toHaveBeenCalledWith({});
  });

  /* ── Impact Reports ── */
  test('createImpactReport', async () => {
    await service.createImpactReport({ type: 'quarterly' });
    expect(mockDDDImpactReport.create).toHaveBeenCalledWith({ type: 'quarterly' });
  });

  test('listImpactReports', async () => {
    await service.listImpactReports();
    expect(mockDDDImpactReport.find).toHaveBeenCalledWith({});
  });

  /* ── Stats ── */
  test('getOutreachStats returns aggregated counts', async () => {
    mockDDDOutreachProgram.countDocuments.mockResolvedValueOnce(8);
    mockDDDCommunityPartner.countDocuments.mockResolvedValueOnce(4);
    mockDDDOutreachEvent.countDocuments.mockResolvedValueOnce(12);
    mockDDDImpactReport.countDocuments.mockResolvedValueOnce(3);

    const s = await service.getOutreachStats();
    expect(s).toEqual({
      totalPrograms: 8,
      activePartners: 4,
      completedEvents: 12,
      impactReports: 3,
    });
  });
});
