'use strict';

/**
 * compliance-calendar-service.test.js — Phase 13 Commit 3 (4.0.57).
 *
 * Tests the stored-event CRUD + status recomputation + adapter
 * aggregation + dedup + pendingAlertsFor windowing.
 */

process.env.NODE_ENV = 'test';

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const {
  createComplianceCalendarService,
} = require('../services/quality/complianceCalendar.service');
const { DEFAULT_ALERT_WINDOWS } = require('../config/compliance-calendar.registry');

let mongoServer;
let ComplianceCalendarEvent;

const userA = new mongoose.Types.ObjectId();
const branch1 = new mongoose.Types.ObjectId();
const branch2 = new mongoose.Types.ObjectId();

function makeDispatcher() {
  const events = [];
  return {
    events,
    async emit(name, payload) {
      events.push({ name, payload });
    },
  };
}

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  if (mongoose.connection.readyState !== 0) {
    try {
      await mongoose.disconnect();
    } catch {
      /* ignore */
    }
  }
  await mongoose.connect(mongoServer.getUri(), { dbName: 'calendar-test' });
  ComplianceCalendarEvent = require('../models/quality/ComplianceCalendarEvent.model');
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

afterEach(async () => {
  await ComplianceCalendarEvent.deleteMany({});
});

// ── helpers ────────────────────────────────────────────────────────

function daysFromNow(n) {
  return new Date(Date.now() + n * 86400000);
}

// Fake adapter that returns whatever we hand it. Used to assert
// the service's adapter protocol + dedup behavior.
function staticAdapter(rows) {
  return async () => rows;
}

// ── tests ──────────────────────────────────────────────────────────

describe('ComplianceCalendarService', () => {
  function svc(opts = {}) {
    return createComplianceCalendarService({
      model: ComplianceCalendarEvent,
      ...opts,
    });
  }

  describe('createEvent', () => {
    it('creates a stored event with auto code + default severity', async () => {
      const d = makeDispatcher();
      const doc = await svc({ dispatcher: d }).createEvent(
        {
          title: 'MOH annual report',
          type: 'regulatory_submission',
          dueDate: daysFromNow(20),
          branchId: branch1,
        },
        userA
      );
      expect(doc.code).toMatch(/^CC-\d{4}-000001$/);
      expect(doc.severity).toBe('critical'); // default for regulatory_submission
      expect(doc.status).toBe('due_soon'); // 20 days → due_soon band
      expect(d.events.map(e => e.name)).toContain('compliance.calendar.event_created');
    });

    it('rejects invalid type', async () => {
      await expect(
        svc().createEvent({ title: 'x', type: 'unknown_type', dueDate: daysFromNow(10) }, userA)
      ).rejects.toThrow(/type/);
    });

    it('computes status band from dueDate', async () => {
      const s = svc();
      const urgent = await s.createEvent(
        { title: 'u', type: 'capa_deadline', dueDate: daysFromNow(3) },
        userA
      );
      const soon = await s.createEvent(
        { title: 's', type: 'capa_deadline', dueDate: daysFromNow(20) },
        userA
      );
      const far = await s.createEvent(
        { title: 'f', type: 'capa_deadline', dueDate: daysFromNow(90) },
        userA
      );
      const over = await s.createEvent(
        { title: 'o', type: 'capa_deadline', dueDate: daysFromNow(-5) },
        userA
      );
      expect(urgent.status).toBe('urgent');
      expect(soon.status).toBe('due_soon');
      expect(far.status).toBe('upcoming');
      expect(over.status).toBe('overdue');
    });
  });

  describe('resolve / cancel / snooze', () => {
    async function seed(s) {
      return s.createEvent(
        {
          title: 'License renewal',
          type: 'license_renewal',
          dueDate: daysFromNow(10),
          branchId: branch1,
        },
        userA
      );
    }

    it('resolves and records resolution trail', async () => {
      const s = svc();
      const e = await seed(s);
      const r = await s.resolve(e._id, { notes: 'renewed' }, userA);
      expect(r.status).toBe('resolved');
      expect(r.resolution.resolvedBy.toString()).toBe(String(userA));
      expect(r.resolution.notes).toBe('renewed');
    });

    it('resolve is idempotent', async () => {
      const s = svc();
      const e = await seed(s);
      await s.resolve(e._id, {}, userA);
      const second = await s.resolve(e._id, {}, userA);
      expect(second.status).toBe('resolved');
    });

    it('rejects cancel without reason', async () => {
      const s = svc();
      const e = await seed(s);
      await expect(s.cancel(e._id, '', userA)).rejects.toThrow(/reason/);
    });

    it('snooze updates dueDate and recomputes status', async () => {
      const s = svc();
      const e = await seed(s); // 10 days out → due_soon
      const snoozed = await s.snooze(e._id, daysFromNow(60), 'vendor delayed', userA);
      expect(snoozed.dueDate.getTime()).toBeGreaterThan(Date.now() + 50 * 86400000);
      expect(snoozed.status).toBe('upcoming');
      expect(snoozed.snoozeReason).toBe('vendor delayed');
    });

    it('rejects resolve on cancelled event', async () => {
      const s = svc();
      const e = await seed(s);
      await s.cancel(e._id, 'no longer needed', userA);
      await expect(s.resolve(e._id, {}, userA)).rejects.toMatchObject({
        code: 'ILLEGAL_TRANSITION',
      });
    });
  });

  describe('list view (stored + computed)', () => {
    it('returns only stored events when no adapters', async () => {
      const s = svc();
      await s.createEvent(
        {
          title: 'Event A',
          type: 'policy_review',
          dueDate: daysFromNow(5),
          branchId: branch1,
        },
        userA
      );
      const rows = await s.list({ branchId: branch1, withinDays: 30 });
      expect(rows).toHaveLength(1);
      expect(rows[0].title).toBe('Event A');
    });

    it('merges computed events from adapters and marks them', async () => {
      const computed = [
        {
          _sourceKey: 'evidence_vault:abc',
          title: 'Evidence expiring: X',
          type: 'evidence_expiry',
          severity: 'warning',
          dueDate: daysFromNow(4),
          source: {
            adapter: 'evidence_vault',
            collection: 'evidenceitems',
            docId: new mongoose.Types.ObjectId(),
          },
          computed: true,
        },
      ];
      const s = svc({ adapters: { evidence_vault: staticAdapter(computed) } });
      await s.createEvent(
        {
          title: 'Manual regulatory',
          type: 'regulatory_submission',
          dueDate: daysFromNow(10),
        },
        userA
      );
      const rows = await s.list({ withinDays: 30 });
      expect(rows).toHaveLength(2);
      const titles = rows.map(r => r.title);
      expect(titles).toContain('Manual regulatory');
      expect(titles).toContain('Evidence expiring: X');
      // Sorted by dueDate ascending → evidence (4d) first, manual (10d) second
      expect(rows[0].dueDate < rows[1].dueDate).toBe(true);
    });

    it('dedupes: if a stored event references an adapter doc, computed copy is dropped', async () => {
      const adapterDocId = new mongoose.Types.ObjectId();
      const computed = [
        {
          _sourceKey: `management_review:${adapterDocId}`,
          title: 'Review (computed)',
          type: 'management_review',
          severity: 'warning',
          dueDate: daysFromNow(15),
          source: {
            adapter: 'management_review',
            collection: 'managementreviews',
            docId: adapterDocId,
          },
          computed: true,
        },
      ];
      const s = svc({
        adapters: { management_review: staticAdapter(computed) },
      });
      // Same source.docId stored
      await s.createEvent(
        {
          title: 'Review (stored, acknowledged)',
          type: 'management_review',
          dueDate: daysFromNow(15),
          source: {
            adapter: 'management_review',
            collection: 'managementreviews',
            docId: adapterDocId,
          },
        },
        userA
      );
      const rows = await s.list({ withinDays: 30 });
      expect(rows).toHaveLength(1);
      expect(rows[0].title).toBe('Review (stored, acknowledged)');
    });

    it('excludes resolved by default, includes on request', async () => {
      const s = svc();
      const a = await s.createEvent(
        { title: 'A', type: 'policy_review', dueDate: daysFromNow(5) },
        userA
      );
      await s.resolve(a._id, {}, userA);

      const withoutResolved = await s.list({ withinDays: 30 });
      expect(withoutResolved).toHaveLength(0);

      const withResolved = await s.list({
        withinDays: 30,
        includeResolved: true,
      });
      expect(withResolved).toHaveLength(1);
    });

    it('filters by branch, type, severity', async () => {
      const s = svc();
      await s.createEvent(
        {
          title: 'B1 audit',
          type: 'audit_scheduled',
          dueDate: daysFromNow(10),
          branchId: branch1,
          severity: 'warning',
        },
        userA
      );
      await s.createEvent(
        {
          title: 'B2 drill',
          type: 'drill',
          dueDate: daysFromNow(10),
          branchId: branch2,
          severity: 'info',
        },
        userA
      );

      const b1Rows = await s.list({ branchId: branch1, withinDays: 30 });
      expect(b1Rows).toHaveLength(1);
      expect(b1Rows[0].title).toBe('B1 audit');

      const critOnly = await s.list({ severity: 'critical', withinDays: 30 });
      expect(critOnly).toHaveLength(0);
    });

    it('recomputes status at read time', async () => {
      const s = svc();
      const e = await s.createEvent(
        {
          title: 'E',
          type: 'policy_review',
          dueDate: daysFromNow(40),
        },
        userA
      );
      expect(e.status).toBe('upcoming');
      // Simulate time passing by nudging dueDate closer via direct update
      await ComplianceCalendarEvent.updateOne(
        { _id: e._id },
        { $set: { dueDate: daysFromNow(5) } }
      );
      const rows = await s.list({ withinDays: 30 });
      expect(rows).toHaveLength(1);
      expect(rows[0].status).toBe('urgent');
    });
  });

  describe('getStats', () => {
    it('buckets by status / severity / type', async () => {
      const s = svc();
      await s.createEvent({ title: 'a', type: 'capa_deadline', dueDate: daysFromNow(3) }, userA);
      await s.createEvent({ title: 'b', type: 'capa_deadline', dueDate: daysFromNow(20) }, userA);
      await s.createEvent({ title: 'c', type: 'drill', dueDate: daysFromNow(60) }, userA);
      const stats = await s.getStats({ withinDays: 90 });
      expect(stats.total).toBe(3);
      expect(stats.byStatus.urgent).toBe(1);
      expect(stats.byStatus.due_soon).toBe(1);
      expect(stats.byStatus.upcoming).toBe(1);
      expect(stats.bySeverity.critical).toBe(2);
      expect(stats.byType.capa_deadline).toBe(2);
    });
  });

  describe('pendingAlertsFor', () => {
    it('returns windows crossed but not yet fired', () => {
      const s = svc();
      const event = {
        dueDate: daysFromNow(5), // 5 days → crossed windows ≥ 7, ≥ 14, ≥ 30, ≥ 60, ≥ 90
        status: 'urgent',
        alertsFired: [{ window: 30, firedAt: new Date() }],
      };
      const pending = s.pendingAlertsFor(event);
      // Should include 7 (crossed, unfired) and not include 30 (already fired)
      // and not include 3 or 1 or 0 (not crossed yet)
      expect(pending).toContain(7);
      expect(pending).not.toContain(30);
      expect(pending).not.toContain(3);
    });

    it('returns empty for terminal events', () => {
      const s = svc();
      const out = s.pendingAlertsFor({
        dueDate: daysFromNow(-5),
        status: 'resolved',
        alertsFired: [],
      });
      expect(out).toEqual([]);
    });
  });

  describe('adapter safety', () => {
    it('a throwing adapter does not break the view', async () => {
      const s = svc({
        adapters: {
          evidence_vault: async () => {
            throw new Error('boom');
          },
        },
      });
      await s.createEvent(
        { title: 'Manual', type: 'policy_review', dueDate: daysFromNow(5) },
        userA
      );
      const rows = await s.list({ withinDays: 30 });
      expect(rows).toHaveLength(1);
      expect(rows[0].title).toBe('Manual');
    });
  });

  describe('alert log', () => {
    it('recordAlertFired is idempotent per window', async () => {
      const s = svc();
      const e = await s.createEvent(
        { title: 'A', type: 'capa_deadline', dueDate: daysFromNow(5) },
        userA
      );
      await s.recordAlertFired(e._id, 7, 'email');
      await s.recordAlertFired(e._id, 7, 'email'); // no-op
      const reload = await s.findById(e._id);
      expect(reload.alertsFired).toHaveLength(1);
      expect(reload.alertsFired[0].window).toBe(7);
    });
  });

  it('registry DEFAULT_ALERT_WINDOWS is descending', () => {
    // Sanity guard so sweeper logic assuming descending order doesn't drift.
    const w = [...DEFAULT_ALERT_WINDOWS];
    for (let i = 1; i < w.length; i++) {
      expect(w[i] <= w[i - 1]).toBe(true);
    }
  });
});
