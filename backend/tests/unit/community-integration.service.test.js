'use strict';

/* ── Global helper for jest.mock scope ── */
global.__mkCIModel = () => {
  const M = jest.fn(function (data) {
    Object.assign(this, data);
    this.save = jest.fn().mockImplementation(() => Promise.resolve(this));
  });
  M.find = jest.fn();
  M.findOne = jest.fn();
  M.findById = jest.fn();
  M.findByIdAndUpdate = jest.fn();
  M.findByIdAndDelete = jest.fn();
  M.countDocuments = jest.fn();
  M.aggregate = jest.fn();
  return M;
};

jest.mock('../../models/CommunityActivity', () => global.__mkCIModel());
jest.mock('../../models/CivilPartnership', () => global.__mkCIModel());
jest.mock('../../models/EventParticipation', () => global.__mkCIModel());
jest.mock('../../models/IntegrationAssessment', () => global.__mkCIModel());
jest.mock('../../models/AwarenessProgram', () => global.__mkCIModel());
jest.mock('../../utils/logger', () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));
jest.mock('../../utils/sanitize', () => ({ escapeRegex: jest.fn(s => s) }));

const CA = require('../../models/CommunityActivity');
const CP = require('../../models/CivilPartnership');
const EP = require('../../models/EventParticipation');
const IA = require('../../models/IntegrationAssessment');
const AP = require('../../models/AwarenessProgram');
const svc = require('../../services/communityIntegration.service');

/* ── Chain query helper ── */
function CQ(data) {
  const c = {};
  'sort skip limit populate lean select'.split(' ').forEach(m => {
    c[m] = jest.fn(() => c);
  });
  c.then = (res, rej) => Promise.resolve(data).then(res, rej);
  c.catch = fn => Promise.resolve(data).catch(fn);
  return c;
}

beforeEach(() => jest.clearAllMocks());

// ═══════════════════════════════════════════════════════════════
// ACTIVITIES
// ═══════════════════════════════════════════════════════════════
describe('Community Activities', () => {
  it('createActivity saves and returns', async () => {
    const r = await svc.createActivity({ title: 'Camp' }, 'u1');
    expect(r.title).toBe('Camp');
    expect(r.createdBy).toBe('u1');
    expect(r.save).toHaveBeenCalled();
  });

  it('getActivities paginates', async () => {
    CA.find.mockReturnValue(CQ([{ _id: 'a1', title: 'T' }]));
    CA.countDocuments.mockResolvedValue(1);

    const r = await svc.getActivities({ page: 1, limit: 10 });
    expect(r.activities).toHaveLength(1);
    expect(r.pagination.total).toBe(1);
  });

  it('getActivities applies search filter', async () => {
    CA.find.mockReturnValue(CQ([]));
    CA.countDocuments.mockResolvedValue(0);

    await svc.getActivities({ search: 'test' });
    const filter = CA.find.mock.calls[0][0];
    expect(filter.$or).toBeDefined();
  });

  it('getActivityById populates + lean', async () => {
    CA.findById.mockReturnValue(CQ({ _id: 'a1', title: 'T' }));
    const r = await svc.getActivityById('a1');
    expect(r.title).toBe('T');
  });

  it('updateActivity delegates to findByIdAndUpdate', async () => {
    CA.findByIdAndUpdate.mockResolvedValue({ _id: 'a1', title: 'New' });
    const r = await svc.updateActivity('a1', { title: 'New' }, 'u1');
    expect(r.title).toBe('New');
    expect(CA.findByIdAndUpdate).toHaveBeenCalledWith(
      'a1',
      expect.objectContaining({ title: 'New', updatedBy: 'u1' }),
      expect.any(Object)
    );
  });

  it('deleteActivity', async () => {
    CA.findByIdAndDelete.mockResolvedValue({ _id: 'a1' });
    const r = await svc.deleteActivity('a1');
    expect(CA.findByIdAndDelete).toHaveBeenCalledWith('a1');
    expect(r._id).toBe('a1');
  });

  it('getActivityStats aggregates', async () => {
    CA.aggregate
      .mockResolvedValueOnce([{ _id: 'social', count: 5 }])
      .mockResolvedValueOnce([{ _id: 'active', count: 3 }]);
    CA.countDocuments.mockResolvedValue(5);

    const r = await svc.getActivityStats();
    expect(r.totalActivities).toBe(5);
    expect(r.byCategory).toHaveLength(1);
    expect(r.byStatus).toHaveLength(1);
  });
});

// ═══════════════════════════════════════════════════════════════
// PARTNERSHIPS
// ═══════════════════════════════════════════════════════════════
describe('Civil Partnerships', () => {
  it('createPartnership saves', async () => {
    const r = await svc.createPartnership({ organizationName: 'NGO' }, 'u1');
    expect(r.organizationName).toBe('NGO');
    expect(r.save).toHaveBeenCalled();
  });

  it('getPartnerships paginates', async () => {
    CP.find.mockReturnValue(CQ([{ _id: 'p1' }]));
    CP.countDocuments.mockResolvedValue(1);

    const r = await svc.getPartnerships({ page: 1, limit: 10 });
    expect(r.partnerships).toHaveLength(1);
    expect(r.pagination.total).toBe(1);
  });

  it('getPartnershipById populates', async () => {
    CP.findById.mockReturnValue(CQ({ _id: 'p1', organizationName: 'NGO' }));
    const r = await svc.getPartnershipById('p1');
    expect(r.organizationName).toBe('NGO');
  });

  it('updatePartnership', async () => {
    CP.findByIdAndUpdate.mockResolvedValue({ _id: 'p1' });
    const r = await svc.updatePartnership('p1', { status: 'active' }, 'u1');
    expect(r).toBeDefined();
  });

  it('deletePartnership', async () => {
    CP.findByIdAndDelete.mockResolvedValue({ _id: 'p1' });
    await svc.deletePartnership('p1');
    expect(CP.findByIdAndDelete).toHaveBeenCalledWith('p1');
  });

  it('getPartnershipStats', async () => {
    CP.aggregate
      .mockResolvedValueOnce([{ _id: 'ngo', count: 2 }])
      .mockResolvedValueOnce([{ _id: 'active', count: 1 }]);
    CP.countDocuments.mockResolvedValue(2);

    const r = await svc.getPartnershipStats();
    expect(r.totalPartnerships).toBe(2);
  });
});

// ═══════════════════════════════════════════════════════════════
// PARTICIPATION
// ═══════════════════════════════════════════════════════════════
describe('Event Participation', () => {
  it('registerParticipation creates and increments activity count', async () => {
    CA.findByIdAndUpdate.mockResolvedValue({});
    const r = await svc.registerParticipation({ activity: 'act1' }, 'u1');
    expect(r.activity).toBe('act1');
    expect(r.createdBy).toBe('u1');
    expect(r.save).toHaveBeenCalled();
    expect(CA.findByIdAndUpdate).toHaveBeenCalledWith('act1', { $inc: { currentParticipants: 1 } });
  });

  it('getParticipations paginates', async () => {
    EP.find.mockReturnValue(CQ([{ _id: 'ep1' }]));
    EP.countDocuments.mockResolvedValue(1);

    const r = await svc.getParticipations({ page: 1, limit: 10 });
    expect(r.participations).toHaveLength(1);
  });

  it('getParticipationById', async () => {
    EP.findById.mockReturnValue(CQ({ _id: 'ep1' }));
    const r = await svc.getParticipationById('ep1');
    expect(r._id).toBe('ep1');
  });

  it('updateParticipation', async () => {
    EP.findByIdAndUpdate.mockResolvedValue({ _id: 'ep1' });
    const r = await svc.updateParticipation('ep1', { status: 'confirmed' }, 'u1');
    expect(r).toBeDefined();
  });

  it('recordAttendance pushes record', async () => {
    const mock = {
      _id: 'ep1',
      attendanceRecords: [],
      totalSessionsAttended: 0,
      totalSessionsMissed: 0,
      save: jest.fn().mockResolvedValue({}),
    };
    EP.findById.mockReturnValue(CQ(mock));

    const r = await svc.recordAttendance('ep1', { date: '2025-03-01', status: 'attended' });
    expect(mock.attendanceRecords.length).toBe(1);
    expect(mock.save).toHaveBeenCalled();
  });

  it('recordAttendance returns null for missing participation', async () => {
    EP.findById.mockReturnValue(CQ(null));
    const r = await svc.recordAttendance('bad', {});
    expect(r).toBeNull();
  });

  it('submitFeedback delegates to findByIdAndUpdate', async () => {
    EP.findByIdAndUpdate.mockResolvedValue({ _id: 'ep1' });
    const r = await svc.submitFeedback('ep1', { rating: 5 });
    expect(r).toBeDefined();
  });

  it('getParticipationStats', async () => {
    EP.aggregate
      .mockResolvedValueOnce([{ _id: 'confirmed', count: 3 }])
      .mockResolvedValueOnce([{ _id: null, avg: 4.5 }]);
    EP.countDocuments.mockResolvedValue(3);

    const r = await svc.getParticipationStats();
    expect(r.totalParticipations).toBe(3);
  });

  it('getBeneficiaryHistory', async () => {
    EP.find.mockReturnValue(CQ([{ _id: 'ep1' }]));
    const r = await svc.getBeneficiaryHistory('ben1');
    expect(Array.isArray(r)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════
// ASSESSMENTS
// ═══════════════════════════════════════════════════════════════
describe('Integration Assessments', () => {
  it('createAssessment looks up previous and saves', async () => {
    IA.findOne.mockReturnValue(CQ(null));
    const r = await svc.createAssessment({ beneficiary: 'b1', domains: [] }, 'u1');
    expect(r.beneficiary).toBe('b1');
    expect(r.save).toHaveBeenCalled();
  });

  it('getAssessments paginates', async () => {
    IA.find.mockReturnValue(CQ([{ _id: 'ia1' }]));
    IA.countDocuments.mockResolvedValue(1);

    const r = await svc.getAssessments({ page: 1, limit: 10 });
    expect(r.assessments).toHaveLength(1);
  });

  it('getAssessmentById', async () => {
    IA.findById.mockReturnValue(CQ({ _id: 'ia1' }));
    expect((await svc.getAssessmentById('ia1'))._id).toBe('ia1');
  });

  it('updateAssessment', async () => {
    IA.findByIdAndUpdate.mockResolvedValue({ _id: 'ia1' });
    expect(await svc.updateAssessment('ia1', {}, 'u1')).toBeDefined();
  });

  it('deleteAssessment', async () => {
    IA.findByIdAndDelete.mockResolvedValue({ _id: 'ia1' });
    await svc.deleteAssessment('ia1');
    expect(IA.findByIdAndDelete).toHaveBeenCalledWith('ia1');
  });

  it('getIntegrationProgress returns assessments for beneficiary', async () => {
    IA.find.mockReturnValue(
      CQ([{ _id: 'ia1', overallIntegrationScore: 70, integrationLevel: 'moderate' }])
    );
    const r = await svc.getIntegrationProgress('b1');
    expect(r.beneficiary).toBe('b1');
    expect(r.totalAssessments).toBe(1);
    expect(Array.isArray(r.history)).toBe(true);
    expect(r.latestScore).toBe(70);
    expect(r.latestLevel).toBe('moderate');
  });

  it('getAssessmentStats', async () => {
    IA.aggregate
      .mockResolvedValueOnce([{ _id: null, avgScore: 72 }])
      .mockResolvedValueOnce([{ _id: 'social', avgScore: 80 }]);
    IA.countDocuments.mockResolvedValue(5);

    const r = await svc.getAssessmentStats();
    expect(r.totalAssessments).toBe(5);
  });
});

// ═══════════════════════════════════════════════════════════════
// AWARENESS PROGRAMS
// ═══════════════════════════════════════════════════════════════
describe('Awareness Programs', () => {
  it('createAwarenessProgram', async () => {
    const r = await svc.createAwarenessProgram({ title: 'Prog' }, 'u1');
    expect(r.title).toBe('Prog');
    expect(r.save).toHaveBeenCalled();
  });

  it('getAwarenessPrograms paginates', async () => {
    AP.find.mockReturnValue(CQ([{ _id: 'ap1' }]));
    AP.countDocuments.mockResolvedValue(1);

    const r = await svc.getAwarenessPrograms({ page: 1, limit: 10 });
    expect(r.programs).toHaveLength(1);
  });

  it('getAwarenessProgramById', async () => {
    AP.findById.mockReturnValue(CQ({ _id: 'ap1' }));
    expect((await svc.getAwarenessProgramById('ap1'))._id).toBe('ap1');
  });

  it('updateAwarenessProgram', async () => {
    AP.findByIdAndUpdate.mockResolvedValue({ _id: 'ap1' });
    expect(await svc.updateAwarenessProgram('ap1', {}, 'u1')).toBeDefined();
  });

  it('deleteAwarenessProgram', async () => {
    AP.findByIdAndDelete.mockResolvedValue({ _id: 'ap1' });
    await svc.deleteAwarenessProgram('ap1');
    expect(AP.findByIdAndDelete).toHaveBeenCalledWith('ap1');
  });

  it('addWorkshop pushes and saves', async () => {
    const mock = { workshops: [], save: jest.fn().mockResolvedValue({}) };
    AP.findById.mockReturnValue(CQ(mock));

    const r = await svc.addWorkshop('ap1', { title: 'WS' });
    expect(mock.workshops.length).toBe(1);
    expect(mock.save).toHaveBeenCalled();
  });

  it('addWorkshop returns null for missing program', async () => {
    AP.findById.mockReturnValue(CQ(null));
    expect(await svc.addWorkshop('bad', {})).toBeNull();
  });

  it('addMaterial pushes and saves', async () => {
    const mock = { materials: [], save: jest.fn().mockResolvedValue({}) };
    AP.findById.mockReturnValue(CQ(mock));

    const r = await svc.addMaterial('ap1', { title: 'Mat' });
    expect(mock.materials.length).toBe(1);
  });

  it('getAwarenessProgramStats', async () => {
    AP.aggregate
      .mockResolvedValueOnce([{ _id: 'workshop', count: 2 }])
      .mockResolvedValueOnce([{ _id: 'active', count: 1 }])
      .mockResolvedValueOnce([{ totalReach: 500, avgSatisfaction: 4.2 }]);
    AP.countDocuments.mockResolvedValue(2);

    const r = await svc.getAwarenessProgramStats();
    expect(r.totalPrograms).toBe(2);
    expect(r.impact.totalReach).toBe(500);
  });
});

// ═══════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════
describe('getCommunityIntegrationDashboard', () => {
  it('aggregates all counts', async () => {
    // Each stat function calls aggregate N times + countDocuments once
    // getActivityStats: 2 aggregates + 1 countDocuments
    // getPartnershipStats: 2 aggregates + 1 countDocuments
    // getParticipationStats: 2 aggregates + 1 countDocuments
    // getAssessmentStats: 3 aggregates + 1 countDocuments
    // getAwarenessProgramStats: 3 aggregates + 1 countDocuments
    CA.aggregate.mockResolvedValue([]);
    CP.aggregate.mockResolvedValue([]);
    EP.aggregate.mockResolvedValue([]);
    IA.aggregate.mockResolvedValue([]);
    AP.aggregate.mockResolvedValue([]);

    CA.countDocuments.mockResolvedValue(10);
    CP.countDocuments.mockResolvedValue(5);
    EP.countDocuments.mockResolvedValue(20);
    IA.countDocuments.mockResolvedValue(8);
    AP.countDocuments.mockResolvedValue(3);

    const r = await svc.getCommunityIntegrationDashboard();
    expect(r.activities.totalActivities).toBe(10);
    expect(r.partnerships.totalPartnerships).toBe(5);
    expect(r.participation.totalParticipations).toBe(20);
    expect(r.assessments.totalAssessments).toBe(8);
    expect(r.awarenessPrograms.totalPrograms).toBe(3);
    expect(r.generatedAt).toBeDefined();
  });
});
