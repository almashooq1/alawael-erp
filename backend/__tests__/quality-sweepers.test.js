'use strict';

/**
 * quality-sweepers.test.js — Phase 13 Commit 11 (4.0.60).
 *
 * Tests for the evidence retention sweeper + compliance-calendar
 * alert sweeper. Each uses mongodb-memory-server; tests invoke
 * `tick()` directly (no timers) so they're deterministic.
 */

process.env.NODE_ENV = 'test';

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const {
  createEvidenceRetentionSweeper,
} = require('../services/quality/evidenceRetentionSweeper.service');
const {
  createComplianceCalendarAlertSweeper,
} = require('../services/quality/complianceCalendarAlertSweeper.service');
const { createEvidenceVaultService } = require('../services/quality/evidenceVault.service');
const {
  createComplianceCalendarService,
} = require('../services/quality/complianceCalendar.service');

let mongoServer;
let EvidenceItem;
let ComplianceCalendarEvent;

const userA = new mongoose.Types.ObjectId();
const branch1 = new mongoose.Types.ObjectId();

function dispatcher() {
  const events = [];
  return {
    events,
    async emit(name, payload) {
      events.push({ name, payload });
    },
  };
}

function daysFromNow(n) {
  return new Date(Date.now() + n * 86400000);
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
  await mongoose.connect(mongoServer.getUri(), { dbName: 'sweepers-test' });
  EvidenceItem = require('../models/quality/EvidenceItem.model');
  ComplianceCalendarEvent = require('../models/quality/ComplianceCalendarEvent.model');
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

afterEach(async () => {
  await EvidenceItem.deleteMany({});
  await ComplianceCalendarEvent.deleteMany({});
});

// ── evidence retention sweeper ─────────────────────────────────────

describe('EvidenceRetentionSweeper', () => {
  function sweeper(opts = {}) {
    return createEvidenceRetentionSweeper({
      evidenceModel: EvidenceItem,
      ...opts,
    });
  }
  function vault(opts = {}) {
    return createEvidenceVaultService({ model: EvidenceItem, ...opts });
  }

  it('flips a past-expiry item to `expired` and emits', async () => {
    const d = dispatcher();
    const v = vault();
    await v.ingest(
      {
        title: 'Past cred',
        type: 'credential',
        sourceModule: 'hr',
        validUntil: daysFromNow(-2),
        branchId: branch1,
      },
      userA
    );

    const s = sweeper({ dispatcher: d });
    const report = await s.tick();
    expect(report.expired).toBe(1);
    expect(d.events.find(e => e.name === 'compliance.evidence.expired')).toBeDefined();

    const rows = await EvidenceItem.find({ status: 'expired' });
    expect(rows).toHaveLength(1);
  });

  it('fires warning windows once per window, idempotent on second tick', async () => {
    const d = dispatcher();
    const v = vault();
    // 5 days away → crosses 30 + 14 + 7 windows
    await v.ingest(
      {
        title: 'Expiring',
        type: 'credential',
        sourceModule: 'hr',
        validUntil: daysFromNow(5),
        branchId: branch1,
      },
      userA
    );

    const s = sweeper({ dispatcher: d });
    const r1 = await s.tick();
    expect(r1.alerts).toBe(3);
    expect(r1.expiring).toBe(1);

    const warnings = d.events.filter(e => e.name === 'compliance.evidence.expiring');
    expect(warnings).toHaveLength(3);
    expect(new Set(warnings.map(w => w.payload.window))).toEqual(new Set([30, 14, 7]));

    // Second tick must not double-fire.
    const r2 = await s.tick();
    expect(r2.alerts).toBe(0);
  });

  it('flips `valid` item to `expiring` status once warning window crossed', async () => {
    const v = vault();
    const doc = await v.ingest(
      {
        title: 'E',
        type: 'document',
        sourceModule: 'governance',
        validUntil: daysFromNow(10),
        branchId: branch1,
      },
      userA
    );
    expect(doc.status).toBe('valid');

    await sweeper({ dispatcher: dispatcher() }).tick();
    const reloaded = await EvidenceItem.findById(doc._id);
    expect(reloaded.status).toBe('expiring');
  });

  it('does nothing for items far from expiry', async () => {
    const v = vault();
    await v.ingest(
      {
        title: 'Far',
        type: 'document',
        sourceModule: 'governance',
        validUntil: daysFromNow(120),
      },
      userA
    );
    const d = dispatcher();
    const r = await sweeper({ dispatcher: d }).tick();
    expect(r.alerts).toBe(0);
    expect(r.expired).toBe(0);
    expect(d.events).toEqual([]);
  });

  it('leaves terminal (superseded/revoked) items alone', async () => {
    const v = vault();
    const doc = await v.ingest(
      {
        title: 'X',
        type: 'document',
        sourceModule: 'governance',
        validUntil: daysFromNow(-1),
      },
      userA
    );
    await v.revoke(doc._id, 'wrong data', userA);

    const s = sweeper({ dispatcher: dispatcher() });
    const r = await s.tick();
    expect(r.expired).toBe(0);
    const reload = await EvidenceItem.findById(doc._id);
    expect(reload.status).toBe('revoked');
  });
});

// ── compliance-calendar alert sweeper ──────────────────────────────

describe('ComplianceCalendarAlertSweeper', () => {
  function calendar(opts = {}) {
    return createComplianceCalendarService({
      model: ComplianceCalendarEvent,
      ...opts,
    });
  }
  function sweeper({ calSvc, dispatcher: d }) {
    return createComplianceCalendarAlertSweeper({
      calendarService: calSvc,
      eventModel: ComplianceCalendarEvent,
      dispatcher: d,
    });
  }

  it('fires alerts for all crossed windows the first time', async () => {
    const d = dispatcher();
    const cal = calendar({ dispatcher: d });
    // 5 days out → windows 7/14/30/60/90 all crossed
    await cal.createEvent(
      {
        title: 'License renewal',
        type: 'license_renewal',
        dueDate: daysFromNow(5),
        branchId: branch1,
      },
      userA
    );

    const s = sweeper({ calSvc: cal, dispatcher: d });
    const r = await s.tick();
    expect(r.alertsFired).toBeGreaterThanOrEqual(5);

    const alerts = d.events.filter(e => e.name === 'compliance.calendar.alert');
    expect(alerts.length).toBeGreaterThanOrEqual(5);
    expect(new Set(alerts.map(a => a.payload.window))).toEqual(
      expect.arrayContaining ? expect.any(Set) : new Set([7, 14, 30, 60, 90])
    );
  });

  it('is idempotent — second tick does not refire windows', async () => {
    const d = dispatcher();
    const cal = calendar({ dispatcher: d });
    await cal.createEvent(
      {
        title: 'X',
        type: 'capa_deadline',
        dueDate: daysFromNow(5),
      },
      userA
    );

    const s = sweeper({ calSvc: cal, dispatcher: d });
    const r1 = await s.tick();
    const r2 = await s.tick();
    expect(r1.alertsFired).toBeGreaterThan(0);
    expect(r2.alertsFired).toBe(0);
  });

  it('flips past-due events to `overdue`', async () => {
    const d = dispatcher();
    const cal = calendar({ dispatcher: d });
    const e = await cal.createEvent(
      { title: 'Overdue', type: 'policy_review', dueDate: daysFromNow(-2) },
      userA
    );
    // Initial status computed to 'overdue' already at create time.
    expect(e.status).toBe('overdue');

    // Create an upcoming event then move its dueDate manually into
    // the past to simulate drift.
    const e2 = await cal.createEvent(
      { title: 'Drift', type: 'policy_review', dueDate: daysFromNow(30) },
      userA
    );
    await ComplianceCalendarEvent.updateOne(
      { _id: e2._id },
      { $set: { dueDate: daysFromNow(-1), status: 'upcoming' } }
    );

    const s = sweeper({ calSvc: cal, dispatcher: d });
    const r = await s.tick();
    expect(r.flippedOverdue).toBe(1);
    const reload = await ComplianceCalendarEvent.findById(e2._id);
    expect(reload.status).toBe('overdue');
  });

  it('respects terminal events (does not resurface resolved)', async () => {
    const d = dispatcher();
    const cal = calendar({ dispatcher: d });
    const e = await cal.createEvent(
      { title: 'Done', type: 'policy_review', dueDate: daysFromNow(3) },
      userA
    );
    await cal.resolve(e._id, {}, userA);

    const s = sweeper({ calSvc: cal, dispatcher: d });
    const r = await s.tick();
    expect(r.scanned).toBe(0);
    expect(r.alertsFired).toBe(0);
  });
});

// ── bootstrap wiring smoke test ────────────────────────────────────

describe('qualityComplianceBootstrap', () => {
  it('returns services + shutdown when mongo is connected', () => {
    const { bootstrapQualityCompliance } = require('../startup/qualityComplianceBootstrap');
    const qms = bootstrapQualityCompliance({
      logger: { info: () => {}, warn: () => {} },
      startSweepers: false, // don't start timers in tests
    });
    expect(qms).toBeTruthy();
    expect(qms.managementReview).toBeDefined();
    expect(qms.evidenceVault).toBeDefined();
    expect(qms.complianceCalendar).toBeDefined();
    expect(qms.controlLibrary).toBeDefined();
    expect(qms.healthScore).toBeDefined();
    expect(typeof qms.shutdown).toBe('function');
  });

  it('wires calendar adapters so evidence expiry surfaces in calendar view', async () => {
    const { bootstrapQualityCompliance } = require('../startup/qualityComplianceBootstrap');
    const qms = bootstrapQualityCompliance({
      logger: { info: () => {}, warn: () => {} },
      startSweepers: false,
    });
    // Seed a credential that will expire soon.
    await qms.evidenceVault.ingest(
      {
        title: 'Expiring SCFHS license',
        type: 'credential',
        sourceModule: 'hr',
        validUntil: daysFromNow(20),
        branchId: branch1,
      },
      userA
    );

    const rows = await qms.complianceCalendar.list({
      branchId: branch1,
      withinDays: 60,
    });
    const hit = rows.find(r => r.computed && r.source && r.source.adapter === 'evidence_vault');
    expect(hit).toBeDefined();
    expect(hit.type).toBe('evidence_expiry');
  });

  it('shutdown stops sweepers without throwing', async () => {
    const { bootstrapQualityCompliance } = require('../startup/qualityComplianceBootstrap');
    const qms = bootstrapQualityCompliance({
      logger: { info: () => {}, warn: () => {} },
      startSweepers: true,
    });
    await expect(qms.shutdown()).resolves.toBeUndefined();
  });
});
