/**
 * Unit tests for incidentService.js — Incident Service
 * Singleton (new IncidentService()). Model: Incident. Logger.
 */

/* ── Chainable query helper ─────────────────────────────────────────── */
global.__incQ = function (val) {
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

/* ── Build a fake Incident document ─────────────────────────────────── */
function makeDoc(overrides = {}) {
  return {
    _id: 'inc-1',
    incidentNumber: 'INC-2024-001',
    title: 'Test Incident',
    description: 'Something happened',
    status: 'OPEN',
    severity: 'medium',
    priority: 'medium',
    type: 'safety',
    assignedTo: [],
    teamLead: null,
    responders: [],
    timeline: [],
    escalations: [],
    comments: [],
    attachments: [],
    relatedIncidents: [],
    resolution: null,
    closure: null,
    metrics: {},
    sla: {},
    isArchived: false,
    auditInfo: {},
    discoveryInfo: { discoveredAt: new Date() },
    generateIncidentNumber: jest.fn().mockReturnValue('INC-2024-001'),
    save: jest.fn().mockImplementation(function () {
      return Promise.resolve(this);
    }),
    updateStatus: jest.fn(),
    addResponder: jest.fn(),
    addComment: jest.fn(),
    addAttachment: jest.fn(),
    calculateMetrics: jest.fn(),
    checkSLABreach: jest.fn(),
    toObject: jest.fn().mockReturnThis(),
    ...overrides,
  };
}

/* ── Mock Incident model ────────────────────────────────────────────── */
global.__incidentModel = jest.fn(function (data) {
  const doc = makeDoc(data);
  doc.save = jest.fn().mockResolvedValue(doc);
  return doc;
});
global.__incidentModel.find = jest.fn(() => global.__incQ([]));
global.__incidentModel.findById = jest.fn(() => global.__incQ(null));
global.__incidentModel.findByIdAndDelete = jest.fn(() => global.__incQ(null));
global.__incidentModel.countDocuments = jest.fn().mockResolvedValue(0);
global.__incidentModel.aggregate = jest.fn().mockResolvedValue([]);

jest.mock('../../models/Incident', () => global.__incidentModel);
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

/* ── SUT ────────────────────────────────────────────────────────────── */
const svc = require('../../services/incidentService');
const Incident = require('../../models/Incident');
const Q = global.__incQ;

/* ── Reset ──────────────────────────────────────────────────────────── */
beforeEach(() => {
  jest.clearAllMocks();
  Incident.find.mockImplementation(() => Q([]));
  Incident.findById.mockImplementation(() => Q(null));
  Incident.findByIdAndDelete.mockImplementation(() => Q(null));
  Incident.countDocuments.mockResolvedValue(0);
  Incident.aggregate.mockResolvedValue([]);
});

/* ═══════════════════════════════════════════════════════════════════════ */
describe('IncidentService', () => {
  /* ── createIncident ──────────────────────────────────────────────── */
  describe('createIncident', () => {
    test('creates incident', async () => {
      const data = {
        title: 'Fire alarm',
        description: 'Alarm triggered',
        severity: 'high',
        type: 'safety',
      };
      const result = await svc.createIncident(data, 'user1');
      expect(result).toBeDefined();
      expect(result.title).toBe('Fire alarm');
    });
  });

  /* ── getAllIncidents ──────────────────────────────────────────────── */
  describe('getAllIncidents', () => {
    test('returns paginated list', async () => {
      Incident.find.mockImplementation(() => Q([makeDoc()]));
      Incident.countDocuments.mockResolvedValue(1);
      const result = await svc.getAllIncidents({}, 1, 20);
      expect(result.incidents).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });

    test('applies filters', async () => {
      Incident.find.mockImplementation(() => Q([]));
      Incident.countDocuments.mockResolvedValue(0);
      await svc.getAllIncidents({ status: 'OPEN', severity: 'high' }, 1, 10);
      expect(Incident.find).toHaveBeenCalled();
    });
  });

  /* ── getIncidentById ─────────────────────────────────────────────── */
  describe('getIncidentById', () => {
    test('returns incident', async () => {
      Incident.findById.mockImplementation(() => Q(makeDoc()));
      const result = await svc.getIncidentById('inc-1');
      expect(result.title).toBe('Test Incident');
    });

    test('throws for not found', async () => {
      await expect(svc.getIncidentById('nope')).rejects.toThrow('الحادثة غير موجودة');
    });
  });

  /* ── updateIncident ──────────────────────────────────────────────── */
  describe('updateIncident', () => {
    test('updates and saves', async () => {
      const doc = makeDoc();
      Incident.findById.mockImplementation(() => Q(doc));
      const result = await svc.updateIncident('inc-1', { title: 'Updated' }, 'user1');
      expect(doc.save).toHaveBeenCalled();
    });

    test('throws for not found', async () => {
      await expect(svc.updateIncident('nope', {}, 'u1')).rejects.toThrow('الحادثة غير موجودة');
    });
  });

  /* ── deleteIncident ──────────────────────────────────────────────── */
  describe('deleteIncident', () => {
    test('deletes incident', async () => {
      Incident.findByIdAndDelete.mockImplementation(() => Q(makeDoc()));
      const result = await svc.deleteIncident('inc-1', 'user1');
      expect(result.message).toBe('تم حذف الحادثة بنجاح');
    });

    test('throws for not found', async () => {
      await expect(svc.deleteIncident('nope', 'u1')).rejects.toThrow('الحادثة غير موجودة');
    });
  });

  /* ── updateIncidentStatus ────────────────────────────────────────── */
  describe('updateIncidentStatus', () => {
    test('updates status via doc method', async () => {
      const doc = makeDoc();
      Incident.findById.mockImplementation(() => Q(doc));
      await svc.updateIncidentStatus('inc-1', 'IN_PROGRESS', 'user1', 'started work');
      expect(doc.updateStatus).toHaveBeenCalledWith('IN_PROGRESS', 'user1');
      expect(doc.save).toHaveBeenCalled();
    });

    test('throws for not found', async () => {
      await expect(svc.updateIncidentStatus('nope', 'X', 'u', 'n')).rejects.toThrow(
        'الحادثة غير موجودة'
      );
    });
  });

  /* ── assignIncident ──────────────────────────────────────────────── */
  describe('assignIncident', () => {
    test('assigns team and pushes timeline', async () => {
      const doc = makeDoc();
      Incident.findById.mockImplementation(() => Q(doc));
      await svc.assignIncident('inc-1', ['user2', 'user3'], 'user2', 'user1');
      expect(doc.assignedTo).toEqual(['user2', 'user3']);
      expect(doc.timeline.length).toBeGreaterThan(0);
      expect(doc.save).toHaveBeenCalled();
    });
  });

  /* ── addResponder ────────────────────────────────────────────────── */
  describe('addResponder', () => {
    test('adds responder', async () => {
      const doc = makeDoc();
      Incident.findById.mockImplementation(() => Q(doc));
      await svc.addResponder('inc-1', { userId: 'resp1', role: 'firefighter' }, 'user1');
      expect(doc.addResponder).toHaveBeenCalled();
      expect(doc.save).toHaveBeenCalled();
    });
  });

  /* ── escalateIncident ────────────────────────────────────────────── */
  describe('escalateIncident', () => {
    test('escalates incident', async () => {
      const doc = makeDoc();
      Incident.findById.mockImplementation(() => Q(doc));
      await svc.escalateIncident('inc-1', { level: 2, reason: 'critical' }, 'user1');
      expect(doc.escalations.length).toBeGreaterThan(0);
      expect(doc.save).toHaveBeenCalled();
    });
  });

  /* ── addComment ──────────────────────────────────────────────────── */
  describe('addComment', () => {
    test('adds comment', async () => {
      const doc = makeDoc();
      Incident.findById.mockImplementation(() => Q(doc));
      await svc.addComment(
        'inc-1',
        { comment: 'This is an update on the incident status' },
        'user1'
      );
      expect(doc.addComment).toHaveBeenCalled();
      expect(doc.save).toHaveBeenCalled();
    });
  });

  /* ── addAttachment ───────────────────────────────────────────────── */
  describe('addAttachment', () => {
    test('adds attachment', async () => {
      const doc = makeDoc();
      Incident.findById.mockImplementation(() => Q(doc));
      await svc.addAttachment(
        'inc-1',
        { filename: 'photo.jpg', url: '/uploads/photo.jpg' },
        'user1'
      );
      expect(doc.addAttachment).toHaveBeenCalled();
      expect(doc.save).toHaveBeenCalled();
    });
  });

  /* ── resolveIncident ─────────────────────────────────────────────── */
  describe('resolveIncident', () => {
    test('resolves incident', async () => {
      const doc = makeDoc();
      Incident.findById.mockImplementation(() => Q(doc));
      await svc.resolveIncident('inc-1', { summary: 'Fixed' }, 'user1');
      expect(doc.updateStatus).toHaveBeenCalledWith('RESOLVED', 'user1');
      expect(doc.calculateMetrics).toHaveBeenCalled();
      expect(doc.save).toHaveBeenCalled();
    });
  });

  /* ── closeIncident ───────────────────────────────────────────────── */
  describe('closeIncident', () => {
    test('closes incident', async () => {
      const doc = makeDoc();
      Incident.findById.mockImplementation(() => Q(doc));
      await svc.closeIncident('inc-1', { notes: 'Done' }, 'user1');
      expect(doc.updateStatus).toHaveBeenCalledWith('CLOSED', 'user1');
      expect(doc.save).toHaveBeenCalled();
    });
  });

  /* ── generateIncidentReport ──────────────────────────────────────── */
  describe('generateIncidentReport', () => {
    test('returns report object', async () => {
      Incident.findById.mockImplementation(() => Q(makeDoc()));
      const report = await svc.generateIncidentReport('inc-1');
      expect(report).toBeDefined();
    });
  });

  /* ── getIncidentStatistics ───────────────────────────────────────── */
  describe('getIncidentStatistics', () => {
    test('returns statistics', async () => {
      // Promise.all order: total(count), bySeverity(count), byCategory(agg), byStatus(agg), avgResolution(agg), slaBreaches(count)
      Incident.countDocuments
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(80) // bySeverity (count with $in filter)
        .mockResolvedValueOnce(5); // slaBreaches
      Incident.aggregate
        .mockResolvedValueOnce([{ _id: 'safety', count: 50 }]) // byCategory
        .mockResolvedValueOnce([{ _id: 'OPEN', count: 40 }]) // byStatus
        .mockResolvedValueOnce([{ _id: null, avgTime: 48 }]); // avgResolutionTime

      const stats = await svc.getIncidentStatistics({});
      expect(stats.total).toBe(100);
      expect(stats.bySeverity).toBe(80);
      expect(stats.byCategory).toEqual([{ _id: 'safety', count: 50 }]);
      expect(stats.byStatus).toEqual([{ _id: 'OPEN', count: 40 }]);
      expect(stats.avgResolutionTime).toBe(48);
      expect(stats.slaBreaches).toBe(5);
    });
  });

  /* ── searchIncidents ─────────────────────────────────────────────── */
  describe('searchIncidents', () => {
    test('returns search results', async () => {
      Incident.find.mockImplementation(() => Q([makeDoc()]));
      Incident.countDocuments.mockResolvedValue(1);
      const result = await svc.searchIncidents('fire', {}, 1, 20);
      expect(result.incidents).toHaveLength(1);
    });
  });

  /* ── archiveIncident ─────────────────────────────────────────────── */
  describe('archiveIncident', () => {
    test('archives incident', async () => {
      const doc = makeDoc();
      Incident.findById.mockImplementation(() => Q(doc));
      await svc.archiveIncident('inc-1', 'user1');
      expect(doc.isArchived).toBe(true);
      expect(doc.save).toHaveBeenCalled();
    });
  });

  /* ── getRelatedIncidents ─────────────────────────────────────────── */
  describe('getRelatedIncidents', () => {
    test('returns related incidents', async () => {
      const doc = makeDoc({ relatedIncidents: ['inc-2', 'inc-3'] });
      Incident.findById.mockImplementation(() => Q(doc));
      Incident.find.mockImplementation(() =>
        Q([makeDoc({ _id: 'inc-2' }), makeDoc({ _id: 'inc-3' })])
      );
      const result = await svc.getRelatedIncidents('inc-1');
      expect(result).toHaveLength(2);
    });
  });
});
