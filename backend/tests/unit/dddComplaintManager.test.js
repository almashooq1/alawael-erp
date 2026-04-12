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

const mockDDDComplaint = makeModel();
const mockDDDResolution = makeModel();
const mockDDDEscalation = makeModel();
const mockDDDComplaintAnalytics = makeModel();

jest.mock('../../models/DddComplaintManager', () => ({
  DDDComplaint: mockDDDComplaint,
  DDDResolution: mockDDDResolution,
  DDDEscalation: mockDDDEscalation,
  DDDComplaintAnalytics: mockDDDComplaintAnalytics,
  COMPLAINT_TYPES: ['service', 'staff', 'facility'],
  COMPLAINT_STATUSES: ['open', 'in_progress', 'resolved', 'closed'],
  COMPLAINT_PRIORITIES: ['low', 'medium', 'high', 'critical'],
  RESOLUTION_TYPES: ['apology', 'compensation', 'corrective_action'],
  ESCALATION_LEVELS: ['supervisor', 'manager', 'director'],
  GRIEVANCE_CATEGORIES: ['quality', 'access', 'communication'],
  BUILTIN_RESOLUTION_TEMPLATES: [{ code: 'T1', name: 'Template 1' }],
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

const svc = require('../../services/dddComplaintManager');

beforeEach(() => jest.clearAllMocks());

/* ─── complaints ─── */
describe('dddComplaintManager – complaints', () => {
  test('listComplaints delegates to _list', async () => {
    mockDDDComplaint.find.mockReturnValue(mockDDDComplaint);
    mockDDDComplaint.sort.mockReturnValue(mockDDDComplaint);
    mockDDDComplaint.lean.mockResolvedValueOnce([{ _id: 'c1' }]);
    const r = await svc.listComplaints({ status: 'open' });
    expect(mockDDDComplaint.find).toHaveBeenCalledWith({ status: 'open' });
  });

  test('getComplaint delegates to _getById', async () => {
    mockDDDComplaint.findById.mockReturnValue(mockDDDComplaint);
    mockDDDComplaint.lean.mockResolvedValueOnce({ _id: 'c1' });
    await svc.getComplaint('c1');
    expect(mockDDDComplaint.findById).toHaveBeenCalledWith('c1');
  });

  test('fileComplaint auto-generates complaintId', async () => {
    mockDDDComplaint.create.mockResolvedValueOnce({ complaintId: 'CMP-1' });
    await svc.fileComplaint({ subject: 'issue' });
    const arg = mockDDDComplaint.create.mock.calls[0][0];
    expect(arg.complaintId).toMatch(/^CMP-/);
  });

  test('fileComplaint preserves existing complaintId', async () => {
    mockDDDComplaint.create.mockResolvedValueOnce({ complaintId: 'CUSTOM' });
    await svc.fileComplaint({ complaintId: 'CUSTOM' });
    const arg = mockDDDComplaint.create.mock.calls[0][0];
    expect(arg.complaintId).toBe('CUSTOM');
  });

  test('updateComplaint delegates to _update', async () => {
    mockDDDComplaint.findByIdAndUpdate.mockReturnValue(mockDDDComplaint);
    mockDDDComplaint.lean.mockResolvedValueOnce({ _id: 'c1' });
    await svc.updateComplaint('c1', { status: 'resolved' });
    expect(mockDDDComplaint.findByIdAndUpdate).toHaveBeenCalled();
  });
});

/* ─── resolutions ─── */
describe('dddComplaintManager – resolutions', () => {
  test('listResolutions delegates to _list', async () => {
    mockDDDResolution.find.mockReturnValue(mockDDDResolution);
    mockDDDResolution.sort.mockReturnValue(mockDDDResolution);
    mockDDDResolution.lean.mockResolvedValueOnce([]);
    await svc.listResolutions({});
    expect(mockDDDResolution.find).toHaveBeenCalled();
  });

  test('createResolution auto-generates resolutionId and resolvedAt', async () => {
    mockDDDResolution.create.mockResolvedValueOnce({ resolutionId: 'RES-1' });
    await svc.createResolution({ complaintId: 'c1' });
    const arg = mockDDDResolution.create.mock.calls[0][0];
    expect(arg.resolutionId).toMatch(/^RES-/);
    expect(arg.resolvedAt).toBeDefined();
  });

  test('updateResolution delegates to _update', async () => {
    mockDDDResolution.findByIdAndUpdate.mockReturnValue(mockDDDResolution);
    mockDDDResolution.lean.mockResolvedValueOnce({ _id: 'r1' });
    await svc.updateResolution('r1', { notes: 'done' });
    expect(mockDDDResolution.findByIdAndUpdate).toHaveBeenCalled();
  });
});

/* ─── escalations ─── */
describe('dddComplaintManager – escalations', () => {
  test('listEscalations sorts by escalatedAt desc', async () => {
    mockDDDEscalation.find.mockReturnValue(mockDDDEscalation);
    mockDDDEscalation.sort.mockReturnValue(mockDDDEscalation);
    mockDDDEscalation.lean.mockResolvedValueOnce([]);
    await svc.listEscalations({});
    expect(mockDDDEscalation.sort).toHaveBeenCalledWith({ escalatedAt: -1 });
  });

  test('escalate auto-generates escalationId', async () => {
    mockDDDEscalation.create.mockResolvedValueOnce({ escalationId: 'ESC-1' });
    await svc.escalate({ complaintId: 'c1', level: 'manager' });
    const arg = mockDDDEscalation.create.mock.calls[0][0];
    expect(arg.escalationId).toMatch(/^ESC-/);
  });

  test('resolveEscalation calls findByIdAndUpdate', async () => {
    mockDDDEscalation.findByIdAndUpdate.mockReturnValue(mockDDDEscalation);
    mockDDDEscalation.lean.mockResolvedValueOnce({ _id: 'e1', outcome: 'resolved' });
    const r = await svc.resolveEscalation('e1', 'resolved');
    expect(mockDDDEscalation.findByIdAndUpdate).toHaveBeenCalledWith(
      'e1',
      expect.objectContaining({ outcome: 'resolved', resolvedAt: expect.any(Date) }),
      { new: true }
    );
  });
});

/* ─── analytics ─── */
describe('dddComplaintManager – analytics', () => {
  test('getComplaintAnalytics sorts by periodStart desc', async () => {
    mockDDDComplaintAnalytics.find.mockReturnValue(mockDDDComplaintAnalytics);
    mockDDDComplaintAnalytics.sort.mockReturnValue(mockDDDComplaintAnalytics);
    mockDDDComplaintAnalytics.lean.mockResolvedValueOnce([]);
    await svc.getComplaintAnalytics({});
    expect(mockDDDComplaintAnalytics.sort).toHaveBeenCalledWith({ periodStart: -1 });
  });

  test('generateAnalytics auto-generates analyticsId', async () => {
    mockDDDComplaintAnalytics.create.mockResolvedValueOnce({ analyticsId: 'CMAN-1' });
    await svc.generateAnalytics({ period: '2024-Q1' });
    const arg = mockDDDComplaintAnalytics.create.mock.calls[0][0];
    expect(arg.analyticsId).toMatch(/^CMAN-/);
  });
});
