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

const mockDDDCEURecord = makeModel();
const mockDDDProfDevPlan = makeModel();
const mockDDDAccreditedProvider = makeModel();
const mockDDDCEURequirement = makeModel();

jest.mock('../../models/DddContinuousEducation', () => ({
  DDDCEURecord: mockDDDCEURecord,
  DDDProfDevPlan: mockDDDProfDevPlan,
  DDDAccreditedProvider: mockDDDAccreditedProvider,
  DDDCEURequirement: mockDDDCEURequirement,
  CEU_CATEGORIES: ['clinical', 'professional_ethics'],
  CEU_ACTIVITY_TYPES: ['course', 'conference'],
  CEU_STATUSES: ['pending', 'approved', 'rejected'],
  DEV_PLAN_STATUSES: ['draft', 'active', 'completed'],
  DEV_GOAL_STATUSES: ['not_started', 'in_progress', 'completed', 'cancelled'],
  ACCREDITATION_TYPES: ['university', 'association'],
  RENEWAL_CYCLES: ['annual', 'biennial'],
  BUILTIN_CEU_REQUIREMENTS: [{ code: 'REQ1', totalCredits: 30, minEthics: 5 }],
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

const svc = require('../../services/dddContinuousEducation');

beforeEach(() => jest.clearAllMocks());

/* ─── singleton ─── */
describe('dddContinuousEducation – singleton', () => {
  test('exports instance with expected methods', () => {
    expect(svc).toBeDefined();
    expect(typeof svc.listCEURecords).toBe('function');
    expect(typeof svc.getCEUCompliance).toBe('function');
    expect(typeof svc.getCEUDashboard).toBe('function');
  });
});

/* ─── initialize ─── */
describe('dddContinuousEducation – initialize', () => {
  test('seeds requirements via findOne/create', async () => {
    mockDDDCEURequirement.findOne.mockReturnValue(mockDDDCEURequirement);
    mockDDDCEURequirement.lean.mockResolvedValue(null);
    mockDDDCEURequirement.create.mockResolvedValue({});
    const r = await svc.initialize();
    expect(r).toBe(true);
    expect(mockDDDCEURequirement.findOne).toHaveBeenCalled();
  });

  test('skips create when requirement exists', async () => {
    mockDDDCEURequirement.findOne.mockReturnValue(mockDDDCEURequirement);
    mockDDDCEURequirement.lean.mockResolvedValue({ code: 'REQ1' });
    await svc.initialize();
    expect(mockDDDCEURequirement.create).not.toHaveBeenCalled();
  });
});

/* ─── CEU Records ─── */
describe('dddContinuousEducation – CEU records', () => {
  test('listCEURecords with all filters', async () => {
    mockDDDCEURecord.find.mockReturnValue(mockDDDCEURecord);
    mockDDDCEURecord.sort.mockReturnValue(mockDDDCEURecord);
    mockDDDCEURecord.lean.mockResolvedValueOnce([]);
    await svc.listCEURecords({
      userId: 'u1',
      category: 'clinical',
      status: 'approved',
      activityType: 'course',
      from: '2024-01-01',
      to: '2024-12-31',
    });
    expect(mockDDDCEURecord.find).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'u1',
        category: 'clinical',
        status: 'approved',
        activityType: 'course',
        activityDate: expect.any(Object),
      })
    );
  });

  test('getCEURecord', async () => {
    mockDDDCEURecord.findById.mockReturnValue(mockDDDCEURecord);
    mockDDDCEURecord.lean.mockResolvedValueOnce({ _id: 'r1' });
    await svc.getCEURecord('r1');
    expect(mockDDDCEURecord.findById).toHaveBeenCalledWith('r1');
  });

  test('createCEURecord', async () => {
    mockDDDCEURecord.create.mockResolvedValueOnce({ _id: 'r1' });
    await svc.createCEURecord({ credits: 5 });
    expect(mockDDDCEURecord.create).toHaveBeenCalled();
  });

  test('updateCEURecord with runValidators', async () => {
    mockDDDCEURecord.findByIdAndUpdate.mockReturnValue(mockDDDCEURecord);
    mockDDDCEURecord.lean.mockResolvedValueOnce({ _id: 'r1' });
    await svc.updateCEURecord('r1', { credits: 10 });
    expect(mockDDDCEURecord.findByIdAndUpdate).toHaveBeenCalledWith(
      'r1',
      { credits: 10 },
      expect.objectContaining({ runValidators: true })
    );
  });

  test('approveCEURecord sets status + verifiedAt + verifiedBy', async () => {
    mockDDDCEURecord.findByIdAndUpdate.mockReturnValue(mockDDDCEURecord);
    mockDDDCEURecord.lean.mockResolvedValueOnce({ _id: 'r1', status: 'approved' });
    await svc.approveCEURecord('r1', 'admin1');
    expect(mockDDDCEURecord.findByIdAndUpdate).toHaveBeenCalledWith(
      'r1',
      expect.objectContaining({ status: 'approved', verifiedBy: 'admin1' }),
      { new: true }
    );
  });

  test('rejectCEURecord sets status + reason', async () => {
    mockDDDCEURecord.findByIdAndUpdate.mockReturnValue(mockDDDCEURecord);
    mockDDDCEURecord.lean.mockResolvedValueOnce({ _id: 'r1', status: 'rejected' });
    await svc.rejectCEURecord('r1', 'insufficient evidence');
    expect(mockDDDCEURecord.findByIdAndUpdate).toHaveBeenCalledWith(
      'r1',
      { status: 'rejected', rejectionReason: 'insufficient evidence' },
      { new: true }
    );
  });
});

/* ─── CEU Compliance ─── */
describe('dddContinuousEducation – compliance', () => {
  test('getCEUCompliance returns compliance summary', async () => {
    mockDDDCEURequirement.findOne.mockReturnValue(mockDDDCEURequirement);
    mockDDDCEURequirement.lean.mockResolvedValueOnce({
      code: 'REQ1',
      totalCredits: 30,
      minEthics: 5,
    });
    mockDDDCEURecord.find.mockReturnValue(mockDDDCEURecord);
    mockDDDCEURecord.lean.mockResolvedValueOnce([
      { credits: 20, category: 'clinical' },
      { credits: 6, category: 'professional_ethics' },
    ]);
    const r = await svc.getCEUCompliance('u1', 'REQ1');
    expect(r.totalRequired).toBe(30);
    expect(r.totalEarned).toBe(26);
    expect(r.remaining).toBe(4);
    expect(r.ethicsRequired).toBe(5);
    expect(r.ethicsEarned).toBe(6);
    expect(r.ethicsRemaining).toBe(0);
    expect(r.compliant).toBe(false); // 26 < 30
  });

  test('getCEUCompliance throws when requirement not found', async () => {
    mockDDDCEURequirement.findOne.mockReturnValue(mockDDDCEURequirement);
    mockDDDCEURequirement.lean.mockResolvedValueOnce(null);
    await expect(svc.getCEUCompliance('u1', 'BAD')).rejects.toThrow('CEU requirement not found');
  });
});

/* ─── Dev Plans ─── */
describe('dddContinuousEducation – dev plans', () => {
  test('listDevPlans with filters', async () => {
    mockDDDProfDevPlan.find.mockReturnValue(mockDDDProfDevPlan);
    mockDDDProfDevPlan.sort.mockReturnValue(mockDDDProfDevPlan);
    mockDDDProfDevPlan.lean.mockResolvedValueOnce([]);
    await svc.listDevPlans({ userId: 'u1', status: 'active' });
    expect(mockDDDProfDevPlan.find).toHaveBeenCalledWith({ userId: 'u1', status: 'active' });
  });

  test('getDevPlan', async () => {
    mockDDDProfDevPlan.findById.mockReturnValue(mockDDDProfDevPlan);
    mockDDDProfDevPlan.lean.mockResolvedValueOnce({ _id: 'p1' });
    await svc.getDevPlan('p1');
    expect(mockDDDProfDevPlan.findById).toHaveBeenCalledWith('p1');
  });

  test('createDevPlan sets overallProgress to 0', async () => {
    mockDDDProfDevPlan.create.mockResolvedValueOnce({ overallProgress: 0 });
    await svc.createDevPlan({ userId: 'u1' });
    const arg = mockDDDProfDevPlan.create.mock.calls[0][0];
    expect(arg.overallProgress).toBe(0);
  });

  test('updateDevPlan', async () => {
    mockDDDProfDevPlan.findByIdAndUpdate.mockReturnValue(mockDDDProfDevPlan);
    mockDDDProfDevPlan.lean.mockResolvedValueOnce({ _id: 'p1' });
    await svc.updateDevPlan('p1', { status: 'completed' });
    expect(mockDDDProfDevPlan.findByIdAndUpdate).toHaveBeenCalled();
  });

  test('approveDevPlan sets active + approvedBy', async () => {
    mockDDDProfDevPlan.findByIdAndUpdate.mockReturnValue(mockDDDProfDevPlan);
    mockDDDProfDevPlan.lean.mockResolvedValueOnce({ _id: 'p1', status: 'active' });
    await svc.approveDevPlan('p1', 'admin1', 'good plan');
    expect(mockDDDProfDevPlan.findByIdAndUpdate).toHaveBeenCalledWith(
      'p1',
      expect.objectContaining({ status: 'active', approvedBy: 'admin1', reviewNotes: 'good plan' }),
      { new: true }
    );
  });
});

/* ─── updateGoalProgress ─── */
describe('dddContinuousEducation – updateGoalProgress', () => {
  test('marks goal completed when progress >= 100', async () => {
    const goal = { progress: 0, status: 'not_started', completedAt: null };
    const plan = {
      goals: {
        id: jest.fn().mockReturnValue(goal),
        length: 1,
        reduce: jest.fn().mockReturnValue(100),
        every: jest.fn().mockReturnValue(true),
      },
      overallProgress: 0,
      status: 'active',
      save: jest.fn().mockResolvedValue(true),
    };
    mockDDDProfDevPlan.findById.mockResolvedValueOnce(plan);
    await svc.updateGoalProgress('p1', 'g1', { progress: 100 });
    expect(goal.status).toBe('completed');
    expect(goal.completedAt).toBeInstanceOf(Date);
    expect(plan.save).toHaveBeenCalled();
  });

  test('sets in_progress when progress > 0 but < 100', async () => {
    const goal = { progress: 0, status: 'not_started' };
    const plan = {
      goals: {
        id: jest.fn().mockReturnValue(goal),
        length: 1,
        reduce: jest.fn().mockReturnValue(50),
        every: jest.fn().mockReturnValue(false),
      },
      overallProgress: 0,
      status: 'active',
      save: jest.fn().mockResolvedValue(true),
    };
    mockDDDProfDevPlan.findById.mockResolvedValueOnce(plan);
    await svc.updateGoalProgress('p1', 'g1', { progress: 50 });
    expect(goal.status).toBe('in_progress');
  });

  test('throws when plan not found', async () => {
    mockDDDProfDevPlan.findById.mockResolvedValueOnce(null);
    await expect(svc.updateGoalProgress('bad', 'g1', {})).rejects.toThrow('Plan not found');
  });

  test('throws when goal not found', async () => {
    const plan = { goals: { id: jest.fn().mockReturnValue(null) } };
    mockDDDProfDevPlan.findById.mockResolvedValueOnce(plan);
    await expect(svc.updateGoalProgress('p1', 'bad', {})).rejects.toThrow('Goal not found');
  });
});

/* ─── Providers ─── */
describe('dddContinuousEducation – providers', () => {
  test('listProviders with filters', async () => {
    mockDDDAccreditedProvider.find.mockReturnValue(mockDDDAccreditedProvider);
    mockDDDAccreditedProvider.sort.mockReturnValue(mockDDDAccreditedProvider);
    mockDDDAccreditedProvider.lean.mockResolvedValueOnce([]);
    await svc.listProviders({ type: 'university', isActive: true });
    expect(mockDDDAccreditedProvider.find).toHaveBeenCalledWith({
      type: 'university',
      isActive: true,
    });
  });

  test('getProvider', async () => {
    mockDDDAccreditedProvider.findById.mockReturnValue(mockDDDAccreditedProvider);
    mockDDDAccreditedProvider.lean.mockResolvedValueOnce({ _id: 'prov1' });
    await svc.getProvider('prov1');
    expect(mockDDDAccreditedProvider.findById).toHaveBeenCalledWith('prov1');
  });

  test('createProvider', async () => {
    mockDDDAccreditedProvider.create.mockResolvedValueOnce({ _id: 'prov1' });
    await svc.createProvider({ name: 'Uni' });
    expect(mockDDDAccreditedProvider.create).toHaveBeenCalled();
  });

  test('updateProvider with runValidators', async () => {
    mockDDDAccreditedProvider.findByIdAndUpdate.mockReturnValue(mockDDDAccreditedProvider);
    mockDDDAccreditedProvider.lean.mockResolvedValueOnce({ _id: 'prov1' });
    await svc.updateProvider('prov1', { name: 'Updated' });
    expect(mockDDDAccreditedProvider.findByIdAndUpdate).toHaveBeenCalledWith(
      'prov1',
      { name: 'Updated' },
      expect.objectContaining({ runValidators: true })
    );
  });
});

/* ─── Requirements ─── */
describe('dddContinuousEducation – requirements', () => {
  test('listRequirements', async () => {
    mockDDDCEURequirement.find.mockReturnValue(mockDDDCEURequirement);
    mockDDDCEURequirement.sort.mockReturnValue(mockDDDCEURequirement);
    mockDDDCEURequirement.lean.mockResolvedValueOnce([]);
    await svc.listRequirements({ isActive: true });
    expect(mockDDDCEURequirement.find).toHaveBeenCalledWith({ isActive: true });
  });

  test('getRequirement', async () => {
    mockDDDCEURequirement.findById.mockReturnValue(mockDDDCEURequirement);
    mockDDDCEURequirement.lean.mockResolvedValueOnce({ _id: 'req1' });
    await svc.getRequirement('req1');
    expect(mockDDDCEURequirement.findById).toHaveBeenCalledWith('req1');
  });

  test('createRequirement', async () => {
    mockDDDCEURequirement.create.mockResolvedValueOnce({ _id: 'req1' });
    await svc.createRequirement({ role: 'therapist' });
    expect(mockDDDCEURequirement.create).toHaveBeenCalled();
  });

  test('updateRequirement', async () => {
    mockDDDCEURequirement.findByIdAndUpdate.mockReturnValue(mockDDDCEURequirement);
    mockDDDCEURequirement.lean.mockResolvedValueOnce({ _id: 'req1' });
    await svc.updateRequirement('req1', { totalCredits: 40 });
    expect(mockDDDCEURequirement.findByIdAndUpdate).toHaveBeenCalled();
  });
});

/* ─── getCEUDashboard ─── */
describe('dddContinuousEducation – dashboard', () => {
  test('returns credits summary with byCategory/byYear', async () => {
    mockDDDCEURecord.find.mockReturnValue(mockDDDCEURecord);
    mockDDDCEURecord.lean.mockResolvedValueOnce([
      { credits: 10, category: 'clinical', activityDate: '2024-03-01' },
      { credits: 5, category: 'professional_ethics', activityDate: '2024-06-01' },
    ]);
    mockDDDProfDevPlan.find.mockReturnValue(mockDDDProfDevPlan);
    mockDDDProfDevPlan.lean.mockResolvedValueOnce([{ status: 'active' }, { status: 'completed' }]);
    const r = await svc.getCEUDashboard('u1');
    expect(r.userId).toBe('u1');
    expect(r.totalCredits).toBe(15);
    expect(r.totalRecords).toBe(2);
    expect(r.activePlans).toBe(1);
    expect(r.byCategory).toHaveProperty('clinical', 10);
    expect(r.byYear).toHaveProperty('2024', 15);
  });
});
