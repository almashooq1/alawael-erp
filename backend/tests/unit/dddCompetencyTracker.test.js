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
    'save',
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

const mockDDDCompetencyFramework = makeModel();
const mockDDDCompetency = makeModel();
const mockDDDStaffCompetency = makeModel();
const mockDDDCompetencyCredential = makeModel();

const MOCK_PROFICIENCY_LEVELS = ['novice', 'beginner', 'intermediate', 'advanced', 'expert'];

jest.mock('../../models/DddCompetencyTracker', () => ({
  DDDCompetencyFramework: mockDDDCompetencyFramework,
  DDDCompetency: mockDDDCompetency,
  DDDStaffCompetency: mockDDDStaffCompetency,
  DDDCompetencyCredential: mockDDDCompetencyCredential,
  COMPETENCY_DOMAINS: ['clinical', 'administrative', 'technical'],
  PROFICIENCY_LEVELS: MOCK_PROFICIENCY_LEVELS,
  ASSESSMENT_METHODS: ['observation', 'exam', 'self'],
  CREDENTIAL_TYPES: ['license', 'certification'],
  CREDENTIAL_STATUSES: ['active', 'expired', 'revoked'],
  COMPETENCY_STATUSES: ['not_assessed', 'developing', 'meets_expectations', 'exceeds_expectations'],
  BUILTIN_FRAMEWORKS: [{ code: 'BF1', name: 'Framework 1' }],
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

const svc = require('../../services/dddCompetencyTracker');

beforeEach(() => jest.clearAllMocks());

/* ─── singleton ─── */
describe('dddCompetencyTracker – singleton', () => {
  test('exports a CompetencyTracker instance with expected methods', () => {
    expect(svc).toBeDefined();
    expect(typeof svc.listFrameworks).toBe('function');
    expect(typeof svc.recordAssessment).toBe('function');
    expect(typeof svc.getStaffProfile).toBe('function');
  });
});

/* ─── initialize ─── */
describe('dddCompetencyTracker – initialize', () => {
  test('seeds frameworks via findOne/create', async () => {
    mockDDDCompetencyFramework.findOne.mockReturnValue(mockDDDCompetencyFramework);
    mockDDDCompetencyFramework.lean.mockResolvedValue(null);
    mockDDDCompetencyFramework.create.mockResolvedValue({});
    const r = await svc.initialize();
    expect(r).toBe(true);
    expect(mockDDDCompetencyFramework.findOne).toHaveBeenCalled();
  });
});

/* ─── frameworks ─── */
describe('dddCompetencyTracker – frameworks', () => {
  test('listFrameworks with status filter', async () => {
    mockDDDCompetencyFramework.find.mockReturnValue(mockDDDCompetencyFramework);
    mockDDDCompetencyFramework.sort.mockReturnValue(mockDDDCompetencyFramework);
    mockDDDCompetencyFramework.lean.mockResolvedValueOnce([{ name: 'F1' }]);
    await svc.listFrameworks({ status: 'active' });
    expect(mockDDDCompetencyFramework.find).toHaveBeenCalledWith({ status: 'active' });
  });

  test('getFramework delegates to _getById', async () => {
    mockDDDCompetencyFramework.findById.mockReturnValue(mockDDDCompetencyFramework);
    mockDDDCompetencyFramework.lean.mockResolvedValueOnce({ _id: 'f1' });
    await svc.getFramework('f1');
    expect(mockDDDCompetencyFramework.findById).toHaveBeenCalledWith('f1');
  });

  test('createFramework', async () => {
    mockDDDCompetencyFramework.create.mockResolvedValueOnce({ name: 'New' });
    await svc.createFramework({ name: 'New' });
    expect(mockDDDCompetencyFramework.create).toHaveBeenCalled();
  });

  test('updateFramework with runValidators', async () => {
    mockDDDCompetencyFramework.findByIdAndUpdate.mockReturnValue(mockDDDCompetencyFramework);
    mockDDDCompetencyFramework.lean.mockResolvedValueOnce({ _id: 'f1' });
    await svc.updateFramework('f1', { name: 'Upd' });
    expect(mockDDDCompetencyFramework.findByIdAndUpdate).toHaveBeenCalledWith(
      'f1',
      { name: 'Upd' },
      expect.objectContaining({ runValidators: true })
    );
  });
});

/* ─── competencies ─── */
describe('dddCompetencyTracker – competencies', () => {
  test('listCompetencies with domain/frameworkId/isCore/isActive', async () => {
    mockDDDCompetency.find.mockReturnValue(mockDDDCompetency);
    mockDDDCompetency.sort.mockReturnValue(mockDDDCompetency);
    mockDDDCompetency.lean.mockResolvedValueOnce([]);
    await svc.listCompetencies({
      domain: 'clinical',
      frameworkId: 'f1',
      isCore: true,
      isActive: true,
    });
    expect(mockDDDCompetency.find).toHaveBeenCalledWith({
      domain: 'clinical',
      frameworkId: 'f1',
      isCore: true,
      isActive: true,
    });
  });

  test('getCompetency', async () => {
    mockDDDCompetency.findById.mockReturnValue(mockDDDCompetency);
    mockDDDCompetency.lean.mockResolvedValueOnce({ _id: 'c1' });
    await svc.getCompetency('c1');
    expect(mockDDDCompetency.findById).toHaveBeenCalledWith('c1');
  });

  test('createCompetency', async () => {
    mockDDDCompetency.create.mockResolvedValueOnce({ name: 'C1' });
    await svc.createCompetency({ name: 'C1' });
    expect(mockDDDCompetency.create).toHaveBeenCalled();
  });

  test('updateCompetency', async () => {
    mockDDDCompetency.findByIdAndUpdate.mockReturnValue(mockDDDCompetency);
    mockDDDCompetency.lean.mockResolvedValueOnce({ _id: 'c1' });
    await svc.updateCompetency('c1', { name: 'Upd' });
    expect(mockDDDCompetency.findByIdAndUpdate).toHaveBeenCalled();
  });
});

/* ─── staff competencies ─── */
describe('dddCompetencyTracker – staffCompetencies', () => {
  test('listStaffCompetencies with filters and populate', async () => {
    mockDDDStaffCompetency.find.mockReturnValue(mockDDDStaffCompetency);
    mockDDDStaffCompetency.populate.mockReturnValue(mockDDDStaffCompetency);
    mockDDDStaffCompetency.sort.mockReturnValue(mockDDDStaffCompetency);
    mockDDDStaffCompetency.lean.mockResolvedValueOnce([]);
    await svc.listStaffCompetencies({
      userId: 'u1',
      competencyId: 'c1',
      frameworkId: 'f1',
      status: 'developing',
    });
    expect(mockDDDStaffCompetency.find).toHaveBeenCalledWith({
      userId: 'u1',
      competencyId: 'c1',
      frameworkId: 'f1',
      status: 'developing',
    });
    expect(mockDDDStaffCompetency.populate).toHaveBeenCalled();
  });

  test('getStaffCompetency populates competencyId', async () => {
    mockDDDStaffCompetency.findById.mockReturnValue(mockDDDStaffCompetency);
    mockDDDStaffCompetency.populate.mockReturnValue(mockDDDStaffCompetency);
    mockDDDStaffCompetency.lean.mockResolvedValueOnce({ _id: 'sc1' });
    await svc.getStaffCompetency('sc1');
    expect(mockDDDStaffCompetency.findById).toHaveBeenCalledWith('sc1');
    expect(mockDDDStaffCompetency.populate).toHaveBeenCalledWith('competencyId');
  });

  test('assignCompetency delegates to _create', async () => {
    mockDDDStaffCompetency.create.mockResolvedValueOnce({ _id: 'sc1' });
    await svc.assignCompetency({ userId: 'u1', competencyId: 'c1' });
    expect(mockDDDStaffCompetency.create).toHaveBeenCalled();
  });
});

/* ─── recordAssessment ─── */
describe('dddCompetencyTracker – recordAssessment', () => {
  const makeRecord = (currentLevel, targetLevel) => ({
    assessments: [],
    currentLevel,
    targetLevel,
    lastAssessedAt: null,
    save: jest.fn().mockResolvedValue(true),
    status: 'not_assessed',
  });

  test('sets exceeds_expectations when current > target', async () => {
    const rec = makeRecord('advanced', 'intermediate');
    mockDDDStaffCompetency.findById.mockResolvedValueOnce(rec);
    const r = await svc.recordAssessment('sc1', { level: 'expert' });
    expect(r.status).toBe('exceeds_expectations');
    expect(rec.save).toHaveBeenCalled();
  });

  test('sets meets_expectations when current == target', async () => {
    const rec = makeRecord('intermediate', 'intermediate');
    mockDDDStaffCompetency.findById.mockResolvedValueOnce(rec);
    const r = await svc.recordAssessment('sc1', { level: 'intermediate' });
    expect(r.status).toBe('meets_expectations');
  });

  test('sets developing when one level below target', async () => {
    const rec = makeRecord('beginner', 'intermediate');
    mockDDDStaffCompetency.findById.mockResolvedValueOnce(rec);
    const r = await svc.recordAssessment('sc1', { level: 'beginner' });
    expect(r.status).toBe('developing');
  });

  test('sets needs_improvement when far below target', async () => {
    const rec = makeRecord('novice', 'expert');
    mockDDDStaffCompetency.findById.mockResolvedValueOnce(rec);
    const r = await svc.recordAssessment('sc1', { level: 'novice' });
    expect(r.status).toBe('needs_improvement');
  });

  test('throws when record not found', async () => {
    mockDDDStaffCompetency.findById.mockResolvedValueOnce(null);
    await expect(svc.recordAssessment('bad', {})).rejects.toThrow(
      'Staff competency record not found'
    );
  });
});

/* ─── credentials ─── */
describe('dddCompetencyTracker – credentials', () => {
  test('listCredentials filters by userId/type/status', async () => {
    mockDDDCompetencyCredential.find.mockReturnValue(mockDDDCompetencyCredential);
    mockDDDCompetencyCredential.sort.mockReturnValue(mockDDDCompetencyCredential);
    mockDDDCompetencyCredential.lean.mockResolvedValueOnce([]);
    await svc.listCredentials({ userId: 'u1', type: 'license', status: 'active' });
    expect(mockDDDCompetencyCredential.find).toHaveBeenCalledWith({
      userId: 'u1',
      type: 'license',
      status: 'active',
    });
  });

  test('getCredential', async () => {
    mockDDDCompetencyCredential.findById.mockReturnValue(mockDDDCompetencyCredential);
    mockDDDCompetencyCredential.lean.mockResolvedValueOnce({ _id: 'cr1' });
    await svc.getCredential('cr1');
    expect(mockDDDCompetencyCredential.findById).toHaveBeenCalledWith('cr1');
  });

  test('createCredential', async () => {
    mockDDDCompetencyCredential.create.mockResolvedValueOnce({ _id: 'cr1' });
    await svc.createCredential({ name: 'License' });
    expect(mockDDDCompetencyCredential.create).toHaveBeenCalled();
  });

  test('updateCredential with runValidators', async () => {
    mockDDDCompetencyCredential.findByIdAndUpdate.mockReturnValue(mockDDDCompetencyCredential);
    mockDDDCompetencyCredential.lean.mockResolvedValueOnce({ _id: 'cr1' });
    await svc.updateCredential('cr1', { status: 'expired' });
    expect(mockDDDCompetencyCredential.findByIdAndUpdate).toHaveBeenCalledWith(
      'cr1',
      { status: 'expired' },
      expect.objectContaining({ runValidators: true })
    );
  });
});

/* ─── renewCredential ─── */
describe('dddCompetencyTracker – renewCredential', () => {
  test('pushes renewal history and updates dates', async () => {
    const cred = {
      renewalHistory: [],
      expiryDate: null,
      status: 'expired',
      renewalDate: null,
      save: jest.fn().mockResolvedValue(true),
    };
    mockDDDCompetencyCredential.findById.mockResolvedValueOnce(cred);
    const r = await svc.renewCredential('cr1', {
      newExpiryDate: '2026-01-01',
      nextRenewalDate: '2025-12-01',
      notes: 'ok',
    });
    expect(cred.renewalHistory.length).toBe(1);
    expect(cred.expiryDate).toBe('2026-01-01');
    expect(cred.status).toBe('active');
    expect(cred.save).toHaveBeenCalled();
  });

  test('throws when credential not found', async () => {
    mockDDDCompetencyCredential.findById.mockResolvedValueOnce(null);
    await expect(svc.renewCredential('bad', {})).rejects.toThrow('Credential not found');
  });
});

/* ─── getExpiringCredentials ─── */
describe('dddCompetencyTracker – getExpiringCredentials', () => {
  test('queries within date range', async () => {
    mockDDDCompetencyCredential.find.mockReturnValue(mockDDDCompetencyCredential);
    mockDDDCompetencyCredential.sort.mockReturnValue(mockDDDCompetencyCredential);
    mockDDDCompetencyCredential.lean.mockResolvedValueOnce([]);
    await svc.getExpiringCredentials(30);
    expect(mockDDDCompetencyCredential.find).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'active', expiryDate: expect.any(Object) })
    );
  });
});

/* ─── getCompetencyGapAnalysis ─── */
describe('dddCompetencyTracker – gapAnalysis', () => {
  test('returns gaps and totalGaps', async () => {
    mockDDDCompetency.find.mockReturnValue(mockDDDCompetency);
    mockDDDCompetency.lean.mockResolvedValueOnce([
      { _id: 'c1', name: 'A', nameAr: 'أ', domain: 'clinical', requiredLevel: 'advanced' },
    ]);
    mockDDDStaffCompetency.find.mockReturnValue(mockDDDStaffCompetency);
    mockDDDStaffCompetency.lean.mockResolvedValueOnce([]);
    const r = await svc.getCompetencyGapAnalysis('u1', 'f1');
    expect(r.userId).toBe('u1');
    expect(r.frameworkId).toBe('f1');
    expect(r.gaps.length).toBe(1);
    expect(r.gaps[0].currentLevel).toBe('novice');
    expect(r.totalGaps).toBe(1);
  });
});

/* ─── getStaffProfile ─── */
describe('dddCompetencyTracker – staffProfile', () => {
  test('returns profile with competencies grouped by domain', async () => {
    mockDDDStaffCompetency.find.mockReturnValue(mockDDDStaffCompetency);
    mockDDDStaffCompetency.populate.mockReturnValue(mockDDDStaffCompetency);
    mockDDDStaffCompetency.lean.mockResolvedValueOnce([
      { competencyId: { domain: 'clinical' }, currentLevel: 'advanced' },
    ]);
    mockDDDCompetencyCredential.find.mockReturnValue(mockDDDCompetencyCredential);
    mockDDDCompetencyCredential.lean.mockResolvedValueOnce([{ _id: 'cr1' }]);
    const r = await svc.getStaffProfile('u1');
    expect(r.userId).toBe('u1');
    expect(r.totalCompetencies).toBe(1);
    expect(r.totalCredentials).toBe(1);
    expect(r.byDomain).toHaveProperty('clinical');
  });
});
