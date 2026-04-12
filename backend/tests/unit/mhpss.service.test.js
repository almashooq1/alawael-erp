/**
 * Unit tests for mhpss.service.js — Mental Health & Psychosocial Support Service
 * Singleton export, uses 5 Mongoose models from MentalHealth.
 */

/* ── chainable query helper ─────────────────────────────────────────── */
global.__mhQ = function Q(val) {
  return {
    populate: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    then: (r, e) => Promise.resolve(val).then(r, e),
  };
};

global.__mhSave = jest.fn();

global.__mkMHModel = function (name) {
  const Model = jest.fn(function (data) {
    Object.assign(this, data);
    this._id = `${name}-id-1`;
    this.save = global.__mhSave.mockResolvedValue(this);
  });
  Model.find = jest.fn(() => global.__mhQ([]));
  Model.findById = jest.fn(() => global.__mhQ(null));
  Model.findByIdAndUpdate = jest.fn(() => global.__mhQ(null));
  Model.findByIdAndDelete = jest.fn(() => global.__mhQ(null));
  Model.countDocuments = jest.fn().mockResolvedValue(0);
  Model.aggregate = jest.fn().mockResolvedValue([]);
  return Model;
};

jest.mock('../../models/MentalHealth', () => ({
  CounselingSession: global.__mkMHModel('cs'),
  MentalHealthProgram: global.__mkMHModel('mhp'),
  PsychologicalAssessment: global.__mkMHModel('pa'),
  CrisisIntervention: global.__mkMHModel('ci'),
  SupportGroup: global.__mkMHModel('sg'),
}));

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

/* ── SUT ────────────────────────────────────────────────────────────── */
const svc = require('../../services/mhpss.service');
const {
  CounselingSession,
  MentalHealthProgram,
  PsychologicalAssessment,
  CrisisIntervention,
  SupportGroup,
} = require('../../models/MentalHealth');

const Q = global.__mhQ;
const mockSave = global.__mhSave;

/* ── Helpers ─────────────────────────────────────────────────────────── */
function resetAll() {
  jest.clearAllMocks();
  CounselingSession.find.mockImplementation(() => Q([]));
  CounselingSession.findById.mockImplementation(() => Q(null));
  CounselingSession.findByIdAndUpdate.mockImplementation(() => Q(null));
  CounselingSession.findByIdAndDelete.mockImplementation(() => Q(null));
  CounselingSession.countDocuments.mockResolvedValue(0);
  CounselingSession.aggregate.mockResolvedValue([]);

  MentalHealthProgram.find.mockImplementation(() => Q([]));
  MentalHealthProgram.findById.mockImplementation(() => Q(null));
  MentalHealthProgram.findByIdAndUpdate.mockImplementation(() => Q(null));
  MentalHealthProgram.findByIdAndDelete.mockImplementation(() => Q(null));
  MentalHealthProgram.countDocuments.mockResolvedValue(0);
  MentalHealthProgram.aggregate.mockResolvedValue([]);

  PsychologicalAssessment.find.mockImplementation(() => Q([]));
  PsychologicalAssessment.findById.mockImplementation(() => Q(null));
  PsychologicalAssessment.findByIdAndUpdate.mockImplementation(() => Q(null));
  PsychologicalAssessment.findByIdAndDelete.mockImplementation(() => Q(null));
  PsychologicalAssessment.countDocuments.mockResolvedValue(0);
  PsychologicalAssessment.aggregate.mockResolvedValue([]);

  CrisisIntervention.find.mockImplementation(() => Q([]));
  CrisisIntervention.findById.mockImplementation(() => Q(null));
  CrisisIntervention.findByIdAndUpdate.mockImplementation(() => Q(null));
  CrisisIntervention.findByIdAndDelete.mockImplementation(() => Q(null));
  CrisisIntervention.countDocuments.mockResolvedValue(0);
  CrisisIntervention.aggregate.mockResolvedValue([]);

  SupportGroup.find.mockImplementation(() => Q([]));
  SupportGroup.findById.mockImplementation(() => Q(null));
  SupportGroup.findByIdAndUpdate.mockImplementation(() => Q(null));
  SupportGroup.findByIdAndDelete.mockImplementation(() => Q(null));
  SupportGroup.countDocuments.mockResolvedValue(0);
  SupportGroup.aggregate.mockResolvedValue([]);
}

beforeEach(resetAll);

/* ═══════════════════════════════════════════════════════════════════════
 *  Counseling Sessions
 * ═══════════════════════════════════════════════════════════════════════ */
describe('MHPSS Service', () => {
  describe('Counseling Sessions', () => {
    test('createSession — success', async () => {
      const data = { title: 'Session 1', type: 'individual' };
      const res = await svc.createSession(data);
      expect(res.success).toBe(true);
      expect(mockSave).toHaveBeenCalled();
    });

    test('createSession — error', async () => {
      mockSave.mockRejectedValueOnce(new Error('DB'));
      const res = await svc.createSession({});
      expect(res.success).toBe(false);
      expect(res.error).toBe('DB');
    });

    test('getSessions — returns paginated data', async () => {
      const rows = [{ _id: '1' }, { _id: '2' }];
      CounselingSession.find.mockImplementation(() => Q(rows));
      CounselingSession.countDocuments.mockResolvedValue(2);

      const res = await svc.getSessions({}, { page: 1, limit: 10 });
      expect(res.success).toBe(true);
      expect(res.data).toEqual(rows);
      expect(res.pagination.total).toBe(2);
      expect(res.pagination.pages).toBe(1);
    });

    test('getSessions — error', async () => {
      CounselingSession.find.mockImplementation(() => {
        throw new Error('fail');
      });
      const res = await svc.getSessions();
      expect(res.success).toBe(false);
    });

    test('getSessionById — found', async () => {
      const session = { _id: 's1', title: 'Test' };
      CounselingSession.findById.mockImplementation(() => Q(session));
      const res = await svc.getSessionById('s1');
      expect(res.success).toBe(true);
      expect(res.data).toEqual(session);
    });

    test('getSessionById — not found', async () => {
      CounselingSession.findById.mockImplementation(() => Q(null));
      const res = await svc.getSessionById('nope');
      expect(res.success).toBe(false);
    });

    test('updateSession — success', async () => {
      const updated = { _id: 's1', title: 'Updated' };
      CounselingSession.findByIdAndUpdate.mockImplementation(() => Q(updated));
      const res = await svc.updateSession('s1', { title: 'Updated' });
      expect(res.success).toBe(true);
      expect(res.data).toEqual(updated);
    });

    test('updateSession — not found', async () => {
      const res = await svc.updateSession('nope', {});
      expect(res.success).toBe(false);
    });

    test('deleteSession — success', async () => {
      CounselingSession.findByIdAndDelete.mockImplementation(() => Q({ _id: 's1' }));
      const res = await svc.deleteSession('s1');
      expect(res.success).toBe(true);
    });

    test('deleteSession — not found', async () => {
      const res = await svc.deleteSession('nope');
      expect(res.success).toBe(false);
    });

    test('getSessionStats — returns stats', async () => {
      CounselingSession.countDocuments.mockResolvedValue(10);
      CounselingSession.aggregate
        .mockResolvedValueOnce([{ _id: 'individual', count: 5 }])
        .mockResolvedValueOnce([{ _id: 'completed', count: 8 }])
        .mockResolvedValueOnce([{ _id: 'low', count: 7 }])
        .mockResolvedValueOnce([{ avgMood: 4.2, avgProgress: 3.8 }]);

      const res = await svc.getSessionStats();
      expect(res.success).toBe(true);
      expect(res.data.totalSessions).toBe(10);
      expect(res.data.averageMoodRating).toBe(4.2);
    });

    test('getSessionStats — no mood data', async () => {
      CounselingSession.countDocuments.mockResolvedValue(0);
      CounselingSession.aggregate
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const res = await svc.getSessionStats();
      expect(res.success).toBe(true);
      expect(res.data.averageMoodRating).toBe(0);
    });
  });

  /* ═══════════════════════════════════════════════════════════════════
   *  Mental Health Programs
   * ═══════════════════════════════════════════════════════════════════ */
  describe('Programs', () => {
    test('createProgram — success', async () => {
      const res = await svc.createProgram({ name: 'P1' });
      expect(res.success).toBe(true);
    });

    test('getPrograms — paginated', async () => {
      MentalHealthProgram.find.mockImplementation(() => Q([{ _id: 'p1' }]));
      MentalHealthProgram.countDocuments.mockResolvedValue(1);
      const res = await svc.getPrograms();
      expect(res.success).toBe(true);
      expect(res.data).toHaveLength(1);
    });

    test('getProgramById — found', async () => {
      MentalHealthProgram.findById.mockImplementation(() => Q({ _id: 'p1' }));
      const res = await svc.getProgramById('p1');
      expect(res.success).toBe(true);
    });

    test('getProgramById — not found', async () => {
      const res = await svc.getProgramById('nope');
      expect(res.success).toBe(false);
    });

    test('updateProgram — success', async () => {
      MentalHealthProgram.findByIdAndUpdate.mockImplementation(() => Q({ _id: 'p1' }));
      const res = await svc.updateProgram('p1', { name: 'U' });
      expect(res.success).toBe(true);
    });

    test('deleteProgram — success', async () => {
      MentalHealthProgram.findByIdAndDelete.mockImplementation(() => Q({ _id: 'p1' }));
      const res = await svc.deleteProgram('p1');
      expect(res.success).toBe(true);
    });

    test('enrollInProgram — success', async () => {
      const pgm = {
        _id: 'p1',
        enrolledParticipants: [],
        maxParticipants: 10,
        save: jest.fn().mockResolvedValue(true),
      };
      MentalHealthProgram.findById.mockImplementation(() => Q(pgm));
      const res = await svc.enrollInProgram('p1', 'b1');
      expect(res.success).toBe(true);
      expect(pgm.enrolledParticipants).toContain('b1');
    });

    test('enrollInProgram — program full', async () => {
      const pgm = {
        _id: 'p1',
        enrolledParticipants: ['b1', 'b2'],
        maxParticipants: 2,
        save: jest.fn(),
      };
      MentalHealthProgram.findById.mockImplementation(() => Q(pgm));
      const res = await svc.enrollInProgram('p1', 'b3');
      expect(res.success).toBe(false);
      expect(res.message).toContain('ممتلئ');
    });

    test('enrollInProgram — already enrolled', async () => {
      const pgm = {
        _id: 'p1',
        enrolledParticipants: [{ toString: () => 'b1' }],
        maxParticipants: 10,
        save: jest.fn(),
      };
      MentalHealthProgram.findById.mockImplementation(() => Q(pgm));
      const res = await svc.enrollInProgram('p1', 'b1');
      expect(res.success).toBe(false);
      expect(res.message).toContain('مسبقاً');
    });

    test('enrollInProgram — program not found', async () => {
      const res = await svc.enrollInProgram('nope', 'b1');
      expect(res.success).toBe(false);
    });

    test('unenrollFromProgram — success', async () => {
      const pgm = {
        _id: 'p1',
        enrolledParticipants: [{ toString: () => 'b1' }],
        save: jest.fn().mockResolvedValue(true),
      };
      MentalHealthProgram.findById.mockImplementation(() => Q(pgm));
      const res = await svc.unenrollFromProgram('p1', 'b1');
      expect(res.success).toBe(true);
      expect(pgm.enrolledParticipants).toHaveLength(0);
    });

    test('unenrollFromProgram — program not found', async () => {
      const res = await svc.unenrollFromProgram('nope', 'b1');
      expect(res.success).toBe(false);
    });
  });

  /* ═══════════════════════════════════════════════════════════════════
   *  Psychological Assessments
   * ═══════════════════════════════════════════════════════════════════ */
  describe('Assessments', () => {
    test('createAssessment — success', async () => {
      const res = await svc.createAssessment({ type: 'PHQ-9' });
      expect(res.success).toBe(true);
    });

    test('getAssessments — paginated', async () => {
      PsychologicalAssessment.find.mockImplementation(() => Q([{ _id: 'a1' }]));
      PsychologicalAssessment.countDocuments.mockResolvedValue(1);
      const res = await svc.getAssessments();
      expect(res.success).toBe(true);
    });

    test('getAssessmentById — found', async () => {
      PsychologicalAssessment.findById.mockImplementation(() => Q({ _id: 'a1' }));
      const res = await svc.getAssessmentById('a1');
      expect(res.success).toBe(true);
    });

    test('getAssessmentById — not found', async () => {
      const res = await svc.getAssessmentById('nope');
      expect(res.success).toBe(false);
    });

    test('updateAssessment — success (uses findById + save)', async () => {
      const doc = { _id: 'a1', type: 'PHQ-9', save: jest.fn().mockResolvedValue(true) };
      PsychologicalAssessment.findById.mockImplementation(() => Q(doc));
      const res = await svc.updateAssessment('a1', { score: 10 });
      expect(res.success).toBe(true);
      expect(doc.save).toHaveBeenCalled();
    });

    test('updateAssessment — not found', async () => {
      const res = await svc.updateAssessment('nope', {});
      expect(res.success).toBe(false);
    });

    test('deleteAssessment — success', async () => {
      PsychologicalAssessment.findByIdAndDelete.mockImplementation(() => Q({ _id: 'a1' }));
      const res = await svc.deleteAssessment('a1');
      expect(res.success).toBe(true);
    });

    test('getBeneficiaryAssessmentHistory — returns sorted', async () => {
      PsychologicalAssessment.find.mockImplementation(() => Q([{ _id: 'a1' }, { _id: 'a2' }]));
      const res = await svc.getBeneficiaryAssessmentHistory('ben1');
      expect(res.success).toBe(true);
      expect(res.data).toHaveLength(2);
    });

    test('getAssessmentStats — returns stats', async () => {
      PsychologicalAssessment.countDocuments.mockResolvedValue(5);
      PsychologicalAssessment.aggregate
        .mockResolvedValueOnce([{ _id: 'moderate', count: 3 }])
        .mockResolvedValueOnce([{ _id: 'PHQ-9', count: 5, avgScore: 12 }])
        .mockResolvedValueOnce([{ _id: 'PHQ-9', count: 5 }]);
      const res = await svc.getAssessmentStats();
      expect(res.success).toBe(true);
      expect(res.data.total).toBe(5);
    });
  });

  /* ═══════════════════════════════════════════════════════════════════
   *  Crisis Interventions
   * ═══════════════════════════════════════════════════════════════════ */
  describe('Crises', () => {
    test('createCrisis — success', async () => {
      const res = await svc.createCrisis({ type: 'suicidal' });
      expect(res.success).toBe(true);
    });

    test('getCrises — paginated', async () => {
      CrisisIntervention.find.mockImplementation(() => Q([{ _id: 'c1' }]));
      CrisisIntervention.countDocuments.mockResolvedValue(1);
      const res = await svc.getCrises();
      expect(res.success).toBe(true);
    });

    test('getCrisisById — found', async () => {
      CrisisIntervention.findById.mockImplementation(() => Q({ _id: 'c1' }));
      const res = await svc.getCrisisById('c1');
      expect(res.success).toBe(true);
    });

    test('getCrisisById — not found', async () => {
      const res = await svc.getCrisisById('nope');
      expect(res.success).toBe(false);
    });

    test('updateCrisis — success', async () => {
      CrisisIntervention.findByIdAndUpdate.mockImplementation(() => Q({ _id: 'c1' }));
      const res = await svc.updateCrisis('c1', { status: 'resolved' });
      expect(res.success).toBe(true);
    });

    test('addCrisisTimelineEvent — success', async () => {
      const crisis = { _id: 'c1', timeline: [], save: jest.fn().mockResolvedValue(true) };
      CrisisIntervention.findById.mockImplementation(() => Q(crisis));
      const res = await svc.addCrisisTimelineEvent('c1', { action: 'call' });
      expect(res.success).toBe(true);
      expect(crisis.timeline).toHaveLength(1);
    });

    test('addCrisisTimelineEvent — not found', async () => {
      const res = await svc.addCrisisTimelineEvent('nope', {});
      expect(res.success).toBe(false);
    });

    test('addCrisisFollowUp — success', async () => {
      const crisis = { _id: 'c1', followUps: [], save: jest.fn().mockResolvedValue(true) };
      CrisisIntervention.findById.mockImplementation(() => Q(crisis));
      const res = await svc.addCrisisFollowUp('c1', { date: new Date() });
      expect(res.success).toBe(true);
      expect(crisis.followUps).toHaveLength(1);
    });

    test('deleteCrisis — success', async () => {
      CrisisIntervention.findByIdAndDelete.mockImplementation(() => Q({ _id: 'c1' }));
      const res = await svc.deleteCrisis('c1');
      expect(res.success).toBe(true);
    });

    test('deleteCrisis — not found', async () => {
      const res = await svc.deleteCrisis('nope');
      expect(res.success).toBe(false);
    });

    test('getCrisisStats — returns stats', async () => {
      CrisisIntervention.countDocuments
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(2); // activeCritical
      CrisisIntervention.aggregate
        .mockResolvedValueOnce([{ _id: 'high', count: 3 }])
        .mockResolvedValueOnce([{ _id: 'suicidal', count: 2 }])
        .mockResolvedValueOnce([{ _id: 'active', count: 5 }]);
      const res = await svc.getCrisisStats();
      expect(res.success).toBe(true);
      expect(res.data.total).toBe(10);
    });
  });

  /* ═══════════════════════════════════════════════════════════════════
   *  Support Groups
   * ═══════════════════════════════════════════════════════════════════ */
  describe('Support Groups', () => {
    test('createGroup — success', async () => {
      const res = await svc.createGroup({ name: 'G1' });
      expect(res.success).toBe(true);
    });

    test('getGroups — paginated', async () => {
      SupportGroup.find.mockImplementation(() => Q([{ _id: 'g1' }]));
      SupportGroup.countDocuments.mockResolvedValue(1);
      const res = await svc.getGroups();
      expect(res.success).toBe(true);
    });

    test('getGroupById — found', async () => {
      SupportGroup.findById.mockImplementation(() => Q({ _id: 'g1' }));
      const res = await svc.getGroupById('g1');
      expect(res.success).toBe(true);
    });

    test('getGroupById — not found', async () => {
      const res = await svc.getGroupById('nope');
      expect(res.success).toBe(false);
    });

    test('updateGroup — success', async () => {
      SupportGroup.findByIdAndUpdate.mockImplementation(() => Q({ _id: 'g1' }));
      const res = await svc.updateGroup('g1', { name: 'U' });
      expect(res.success).toBe(true);
    });

    test('deleteGroup — success', async () => {
      SupportGroup.findByIdAndDelete.mockImplementation(() => Q({ _id: 'g1' }));
      const res = await svc.deleteGroup('g1');
      expect(res.success).toBe(true);
    });

    test('addGroupMember — success', async () => {
      const group = {
        _id: 'g1',
        members: [],
        maxMembers: 10,
        save: jest.fn().mockResolvedValue(true),
      };
      SupportGroup.findById.mockImplementation(() => Q(group));
      const res = await svc.addGroupMember('g1', 'b1');
      expect(res.success).toBe(true);
      expect(group.members).toHaveLength(1);
    });

    test('addGroupMember — group full', async () => {
      const group = {
        _id: 'g1',
        members: [{ beneficiary: { toString: () => 'b1' }, status: 'active' }],
        maxMembers: 1,
        save: jest.fn(),
      };
      SupportGroup.findById.mockImplementation(() => Q(group));
      const res = await svc.addGroupMember('g1', 'b2');
      expect(res.success).toBe(false);
      expect(res.message).toContain('ممتلئة');
    });

    test('addGroupMember — already exists', async () => {
      const group = {
        _id: 'g1',
        members: [{ beneficiary: { toString: () => 'b1' }, status: 'active' }],
        maxMembers: 10,
        save: jest.fn(),
      };
      SupportGroup.findById.mockImplementation(() => Q(group));
      const res = await svc.addGroupMember('g1', 'b1');
      expect(res.success).toBe(false);
      expect(res.message).toContain('مسبقاً');
    });

    test('addGroupMember — group not found', async () => {
      const res = await svc.addGroupMember('nope', 'b1');
      expect(res.success).toBe(false);
    });

    test('removeGroupMember — success', async () => {
      const group = {
        _id: 'g1',
        members: [{ beneficiary: { toString: () => 'b1' }, status: 'active' }],
        save: jest.fn().mockResolvedValue(true),
      };
      SupportGroup.findById.mockImplementation(() => Q(group));
      const res = await svc.removeGroupMember('g1', 'b1');
      expect(res.success).toBe(true);
      expect(group.members[0].status).toBe('withdrawn');
    });

    test('removeGroupMember — member not found', async () => {
      const group = { _id: 'g1', members: [], save: jest.fn() };
      SupportGroup.findById.mockImplementation(() => Q(group));
      const res = await svc.removeGroupMember('g1', 'b99');
      expect(res.success).toBe(false);
    });

    test('addGroupSession — success', async () => {
      const group = {
        _id: 'g1',
        sessions: [{ sessionNumber: 1 }],
        save: jest.fn().mockResolvedValue(true),
      };
      SupportGroup.findById.mockImplementation(() => Q(group));
      const res = await svc.addGroupSession('g1', { topic: 'Coping' });
      expect(res.success).toBe(true);
      expect(group.sessions).toHaveLength(2);
      expect(group.sessions[1].sessionNumber).toBe(2);
    });

    test('addGroupSession — group not found', async () => {
      const res = await svc.addGroupSession('nope', {});
      expect(res.success).toBe(false);
    });
  });

  /* ═══════════════════════════════════════════════════════════════════
   *  Dashboard
   * ═══════════════════════════════════════════════════════════════════ */
  describe('Dashboard', () => {
    test('getDashboardStats — aggregates all entities', async () => {
      CounselingSession.countDocuments.mockResolvedValue(5);
      CounselingSession.aggregate
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      MentalHealthProgram.aggregate.mockResolvedValue([{ _id: 'active', count: 3 }]);
      PsychologicalAssessment.countDocuments.mockResolvedValue(2);
      PsychologicalAssessment.aggregate
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      CrisisIntervention.countDocuments.mockResolvedValueOnce(1).mockResolvedValueOnce(0);
      CrisisIntervention.aggregate
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      SupportGroup.aggregate.mockResolvedValue([{ _id: 'active', count: 2 }]);

      const res = await svc.getDashboardStats();
      expect(res.success).toBe(true);
      expect(res.data).toHaveProperty('sessions');
      expect(res.data).toHaveProperty('programs');
      expect(res.data).toHaveProperty('assessments');
      expect(res.data).toHaveProperty('crises');
      expect(res.data).toHaveProperty('groups');
    });
  });
});
