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

const mockDDDTrialMonitor = makeModel();
const mockDDDTrialParticipant = makeModel();
const mockDDDMonitoringEvent = makeModel();
const mockDDDTrialMonitorAdverseEvent = makeModel();

jest.mock('../../models/DddClinicalTrial', () => ({
  DDDTrialMonitor: mockDDDTrialMonitor,
  DDDTrialParticipant: mockDDDTrialParticipant,
  DDDMonitoringEvent: mockDDDMonitoringEvent,
  DDDTrialMonitorAdverseEvent: mockDDDTrialMonitorAdverseEvent,
  TRIAL_TYPES: ['interventional', 'observational'],
  TRIAL_STATUSES: ['active', 'completed', 'suspended'],
  ENROLLMENT_STATUSES: ['screening', 'enrolled', 'withdrawn'],
  MONITORING_TYPES: ['site_visit', 'remote'],
  ADVERSE_EVENT_GRADES: [1, 2, 3, 4, 5],
  RANDOMIZATION_METHODS: ['simple', 'block', 'stratified'],
  BUILTIN_TRIAL_TEMPLATES: [{ code: 'DEFAULT' }],
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

const service = require('../../services/dddClinicalTrial');

beforeEach(() => {
  [
    mockDDDTrialMonitor,
    mockDDDTrialParticipant,
    mockDDDMonitoringEvent,
    mockDDDTrialMonitorAdverseEvent,
  ].forEach(M => {
    Object.values(M).forEach(v => {
      if (typeof v === 'function' && v.mockClear) v.mockClear();
    });
  });
});

describe('dddClinicalTrial', () => {
  /* ── Trials ── */
  describe('listTrials', () => {
    it('returns trials via _list', async () => {
      mockDDDTrialMonitor.find.mockReturnThis();
      mockDDDTrialMonitor.sort.mockReturnThis();
      mockDDDTrialMonitor.lean.mockResolvedValue([{ _id: 't1' }]);
      expect(await service.listTrials({})).toHaveLength(1);
    });
  });

  describe('getTrial', () => {
    it('returns by id', async () => {
      mockDDDTrialMonitor.findById.mockReturnThis();
      mockDDDTrialMonitor.lean.mockResolvedValue({ _id: 't1' });
      expect(await service.getTrial('t1')).toHaveProperty('_id');
    });
  });

  describe('createTrial', () => {
    it('auto-generates trialId and creates', async () => {
      mockDDDTrialMonitor.create.mockResolvedValue({ _id: 't1', trialId: 'CT-123' });
      const r = await service.createTrial({ title: 'Study A' });
      expect(r).toHaveProperty('trialId');
    });
    it('keeps provided trialId', async () => {
      mockDDDTrialMonitor.create.mockImplementation(d => Promise.resolve(d));
      const r = await service.createTrial({ trialId: 'CUSTOM' });
      expect(r.trialId).toBe('CUSTOM');
    });
  });

  describe('updateTrial', () => {
    it('updates via _update', async () => {
      mockDDDTrialMonitor.findByIdAndUpdate.mockReturnThis();
      mockDDDTrialMonitor.lean.mockResolvedValue({ _id: 't1', status: 'completed' });
      expect((await service.updateTrial('t1', { status: 'completed' })).status).toBe('completed');
    });
  });

  /* ── Participants ── */
  describe('listParticipants', () => {
    it('returns participants via _list', async () => {
      mockDDDTrialParticipant.find.mockReturnThis();
      mockDDDTrialParticipant.sort.mockReturnThis();
      mockDDDTrialParticipant.lean.mockResolvedValue([]);
      expect(await service.listParticipants({})).toEqual([]);
    });
  });

  describe('enrollParticipant', () => {
    it('auto-generates participantId and sets enrollmentDate', async () => {
      mockDDDTrialParticipant.create.mockImplementation(d => Promise.resolve(d));
      const r = await service.enrollParticipant({ trialId: 't1' });
      expect(r.participantId).toMatch(/^TP-/);
      expect(r.enrollmentDate).toBeInstanceOf(Date);
    });
  });

  describe('updateParticipant', () => {
    it('updates via _update', async () => {
      mockDDDTrialParticipant.findByIdAndUpdate.mockReturnThis();
      mockDDDTrialParticipant.lean.mockResolvedValue({ _id: 'p1', status: 'withdrawn' });
      expect((await service.updateParticipant('p1', { status: 'withdrawn' })).status).toBe(
        'withdrawn'
      );
    });
  });

  /* ── Monitoring Events ── */
  describe('listMonitoringEvents', () => {
    it('returns sorted by date desc', async () => {
      mockDDDMonitoringEvent.find.mockReturnThis();
      mockDDDMonitoringEvent.sort.mockReturnThis();
      mockDDDMonitoringEvent.lean.mockResolvedValue([]);
      expect(await service.listMonitoringEvents({})).toEqual([]);
      expect(mockDDDMonitoringEvent.sort).toHaveBeenCalledWith({ date: -1 });
    });
  });

  describe('recordMonitoringEvent', () => {
    it('auto-generates eventId and creates', async () => {
      mockDDDMonitoringEvent.create.mockImplementation(d => Promise.resolve(d));
      const r = await service.recordMonitoringEvent({ type: 'site_visit' });
      expect(r.eventId).toMatch(/^ME-/);
    });
  });

  /* ── Adverse Events ── */
  describe('listAdverseEvents', () => {
    it('returns sorted by reportedAt desc', async () => {
      mockDDDTrialMonitorAdverseEvent.find.mockReturnThis();
      mockDDDTrialMonitorAdverseEvent.sort.mockReturnThis();
      mockDDDTrialMonitorAdverseEvent.lean.mockResolvedValue([]);
      expect(await service.listAdverseEvents({})).toEqual([]);
      expect(mockDDDTrialMonitorAdverseEvent.sort).toHaveBeenCalledWith({ reportedAt: -1 });
    });
  });

  describe('reportAdverseEvent', () => {
    it('auto-generates aeId and creates', async () => {
      mockDDDTrialMonitorAdverseEvent.create.mockImplementation(d => Promise.resolve(d));
      const r = await service.reportAdverseEvent({ grade: 3 });
      expect(r.aeId).toMatch(/^AE-/);
    });
  });

  /* ── Analytics ── */
  describe('getTrialAnalytics', () => {
    it('returns all counts', async () => {
      mockDDDTrialMonitor.countDocuments.mockResolvedValue(10);
      mockDDDTrialParticipant.countDocuments.mockResolvedValue(50);
      mockDDDMonitoringEvent.countDocuments.mockResolvedValue(30);
      mockDDDTrialMonitorAdverseEvent.countDocuments.mockResolvedValue(5);
      const r = await service.getTrialAnalytics({});
      expect(r).toEqual({
        totalTrials: 10,
        totalParticipants: 50,
        totalMonitoring: 30,
        totalAdverseEvents: 5,
      });
    });
  });
});
