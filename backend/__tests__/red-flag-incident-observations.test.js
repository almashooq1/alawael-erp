/**
 * red-flag-incident-observations.test.js — Beneficiary-360 Commit 17.
 *
 * Integration: real quality/Incident model against mongodb-memory-
 * server. Pins severity translation (catastrophic → CRITICAL), the
 * open-status filter, and per-type windows (seizure=48h, fall=30d).
 * Proves all three new live flags fire end-to-end:
 *   • safety.incident.critical.open
 *   • clinical.seizure.cluster.48h
 *   • safety.fall.repeat.30d
 */

'use strict';

process.env.NODE_ENV = 'test';

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const {
  createIncidentObservations,
  SEVERITY_MAP,
  OPEN_STATUSES,
} = require('../services/redFlagObservations/incidentObservations');
const { createLocator } = require('../services/redFlagServiceLocator');
const { createEngine } = require('../services/redFlagEngine');

let mongoServer;
let Incident;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  if (mongoose.connection.readyState !== 0) {
    try {
      await mongoose.disconnect();
    } catch {
      /* ignore */
    }
  }
  await mongoose.connect(mongoServer.getUri(), { dbName: 'incident-obs-test' });
  Incident = require('../models/quality/Incident.model');
}, 60_000);

afterAll(async () => {
  try {
    await mongoose.disconnect();
  } catch {
    /* ignore */
  }
  if (mongoServer) await mongoServer.stop();
}, 60_000);

beforeEach(async () => {
  await Incident.deleteMany({});
});

// ─── Helpers ────────────────────────────────────────────────────

let incidentCounter = 1;
async function seedIncident({
  bIds = [],
  type = 'fall',
  severity = 'major',
  status = 'reported',
  occurredHoursAgo = 1,
  now = new Date(),
}) {
  // Raw driver insert avoids the large set of required-field
  // validators (branchId ref to Branch, reportedBy ref to User,
  // category, location, description etc.) that aren't under test.
  const _id = new mongoose.Types.ObjectId();
  const occurredAt = new Date(now.getTime() - occurredHoursAgo * 3600 * 1000);
  await Incident.collection.insertOne({
    _id,
    incidentNumber: `INC-TEST-${String(incidentCounter++).padStart(4, '0')}`,
    branchId: new mongoose.Types.ObjectId(),
    reportedBy: new mongoose.Types.ObjectId(),
    type,
    severity,
    category: 'patient_safety',
    occurredAt,
    location: 'Therapy Room 1',
    description: 'test fixture',
    beneficiaryIds: bIds.map(b =>
      b instanceof mongoose.Types.ObjectId ? b : new mongoose.Types.ObjectId(b)
    ),
    status,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return _id;
}

// ─── Sanity: severity map + open statuses are exported ─────────

describe('module exports', () => {
  it('exposes the severity map for downstream use', () => {
    expect(SEVERITY_MAP.catastrophic).toBe('CRITICAL');
    expect(SEVERITY_MAP.major).toBe('HIGH');
    expect(SEVERITY_MAP.insignificant).toBe('NONE');
  });

  it('exposes the open-statuses list', () => {
    expect(OPEN_STATUSES).toContain('reported');
    expect(OPEN_STATUSES).toContain('monitoring');
    expect(OPEN_STATUSES).not.toContain('closed');
  });
});

// ─── openByBeneficiary ──────────────────────────────────────────

describe('openByBeneficiary', () => {
  it('returns an empty array when the beneficiary has no linked incidents', async () => {
    const obs = createIncidentObservations({ model: Incident });
    const result = await obs.openByBeneficiary(new mongoose.Types.ObjectId());
    expect(result).toEqual([]);
  });

  it('returns only OPEN incidents (excludes closed)', async () => {
    const bId = new mongoose.Types.ObjectId();
    await seedIncident({ bIds: [bId], severity: 'major', status: 'reported' });
    await seedIncident({ bIds: [bId], severity: 'catastrophic', status: 'closed' });
    const obs = createIncidentObservations({ model: Incident });
    const result = await obs.openByBeneficiary(bId);
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('reported');
  });

  it('translates model severity to CRITICAL/HIGH/... for consumers', async () => {
    const bId = new mongoose.Types.ObjectId();
    await seedIncident({ bIds: [bId], severity: 'catastrophic' });
    await seedIncident({ bIds: [bId], severity: 'major' });
    await seedIncident({ bIds: [bId], severity: 'moderate' });
    const obs = createIncidentObservations({ model: Incident });
    const result = await obs.openByBeneficiary(bId);
    const severities = result.map(r => r.severity).sort();
    expect(severities).toEqual(['CRITICAL', 'HIGH', 'MEDIUM']);
  });

  it('does NOT leak across beneficiaries', async () => {
    const a = new mongoose.Types.ObjectId();
    const b = new mongoose.Types.ObjectId();
    await seedIncident({ bIds: [a], severity: 'catastrophic' });
    await seedIncident({ bIds: [b], severity: 'major' });
    const obs = createIncidentObservations({ model: Incident });
    expect((await obs.openByBeneficiary(a)).map(r => r.severity)).toEqual(['CRITICAL']);
    expect((await obs.openByBeneficiary(b)).map(r => r.severity)).toEqual(['HIGH']);
  });

  it('an incident linked to multiple beneficiaries appears for each of them', async () => {
    const a = new mongoose.Types.ObjectId();
    const b = new mongoose.Types.ObjectId();
    await seedIncident({ bIds: [a, b], severity: 'catastrophic' });
    const obs = createIncidentObservations({ model: Incident });
    expect(await obs.openByBeneficiary(a)).toHaveLength(1);
    expect(await obs.openByBeneficiary(b)).toHaveLength(1);
  });
});

// ─── countByTypeForBeneficiary ──────────────────────────────────

describe('countByTypeForBeneficiary', () => {
  it('returns zero counts for a beneficiary with no incidents', async () => {
    const obs = createIncidentObservations({ model: Incident });
    const { counts } = await obs.countByTypeForBeneficiary(new mongoose.Types.ObjectId());
    expect(counts).toEqual({ seizure: 0, fall: 0 });
  });

  it('counts seizures within the 48-hour window (not older)', async () => {
    const bId = new mongoose.Types.ObjectId();
    const now = new Date('2026-04-22T12:00:00.000Z');
    await seedIncident({ bIds: [bId], type: 'seizure', occurredHoursAgo: 1, now });
    await seedIncident({ bIds: [bId], type: 'seizure', occurredHoursAgo: 24, now });
    await seedIncident({ bIds: [bId], type: 'seizure', occurredHoursAgo: 47, now });
    await seedIncident({ bIds: [bId], type: 'seizure', occurredHoursAgo: 72, now }); // outside
    const obs = createIncidentObservations({ model: Incident });
    const { counts } = await obs.countByTypeForBeneficiary(bId, { now });
    expect(counts.seizure).toBe(3);
  });

  it('counts falls within the 30-day window (not older)', async () => {
    const bId = new mongoose.Types.ObjectId();
    const now = new Date('2026-04-22T12:00:00.000Z');
    await seedIncident({ bIds: [bId], type: 'fall', occurredHoursAgo: 48, now });
    await seedIncident({ bIds: [bId], type: 'fall', occurredHoursAgo: 24 * 20, now });
    await seedIncident({ bIds: [bId], type: 'fall', occurredHoursAgo: 24 * 40, now }); // outside
    const obs = createIncidentObservations({ model: Incident });
    const { counts } = await obs.countByTypeForBeneficiary(bId, { now });
    expect(counts.fall).toBe(2);
  });

  it('does not cross-count between types (seizure vs fall)', async () => {
    const bId = new mongoose.Types.ObjectId();
    const now = new Date('2026-04-22T12:00:00.000Z');
    await seedIncident({ bIds: [bId], type: 'seizure', occurredHoursAgo: 1, now });
    await seedIncident({ bIds: [bId], type: 'fall', occurredHoursAgo: 2, now });
    const obs = createIncidentObservations({ model: Incident });
    const { counts } = await obs.countByTypeForBeneficiary(bId, { now });
    expect(counts.seizure).toBe(1);
    expect(counts.fall).toBe(1);
  });

  it('honors injectable per-type windows', async () => {
    const bId = new mongoose.Types.ObjectId();
    const now = new Date('2026-04-22T12:00:00.000Z');
    await seedIncident({ bIds: [bId], type: 'seizure', occurredHoursAgo: 36, now });
    const obs = createIncidentObservations({
      model: Incident,
      windowsHours: { seizure: 24, fall: 24 }, // tighter than defaults
    });
    const { counts } = await obs.countByTypeForBeneficiary(bId, { now });
    expect(counts.seizure).toBe(0); // 36h > 24h override
  });
});

// ─── End-to-end via engine: all 3 flags ─────────────────────────

describe('safety + clinical incident flags fire end-to-end', () => {
  function wireEngine() {
    const locator = createLocator();
    locator.register('incidentService', createIncidentObservations({ model: Incident }));
    return createEngine({ locator });
  }

  it('safety.incident.critical.open raises on any catastrophic open incident', async () => {
    const bId = new mongoose.Types.ObjectId().toString();
    await seedIncident({ bIds: [bId], severity: 'catastrophic', status: 'investigating' });
    const engine = wireEngine();
    const result = await engine.evaluateBeneficiary(bId, {
      flagIds: ['safety.incident.critical.open'],
    });
    expect(result.raisedCount).toBe(1);
    expect(result.verdicts[0].observedValue).toBeGreaterThanOrEqual(1);
  });

  it('safety.incident.critical.open does NOT raise on "major" alone (only catastrophic maps to CRITICAL)', async () => {
    const bId = new mongoose.Types.ObjectId().toString();
    await seedIncident({ bIds: [bId], severity: 'major', status: 'investigating' });
    const engine = wireEngine();
    const result = await engine.evaluateBeneficiary(bId, {
      flagIds: ['safety.incident.critical.open'],
    });
    expect(result.raisedCount).toBe(0);
  });

  it('clinical.seizure.cluster.48h raises when > 2 seizures in 48 hours', async () => {
    const bId = new mongoose.Types.ObjectId().toString();
    const now = new Date('2026-04-22T12:00:00.000Z');
    await seedIncident({ bIds: [bId], type: 'seizure', occurredHoursAgo: 1, now });
    await seedIncident({ bIds: [bId], type: 'seizure', occurredHoursAgo: 12, now });
    await seedIncident({ bIds: [bId], type: 'seizure', occurredHoursAgo: 36, now });
    const engine = wireEngine();
    const result = await engine.evaluateBeneficiary(bId, {
      flagIds: ['clinical.seizure.cluster.48h'],
      now,
    });
    expect(result.raisedCount).toBe(1);
    expect(result.verdicts[0].observedValue).toBe(3);
  });

  it('clinical.seizure.cluster.48h does NOT raise on 2 seizures (threshold is strict >)', async () => {
    const bId = new mongoose.Types.ObjectId().toString();
    const now = new Date('2026-04-22T12:00:00.000Z');
    await seedIncident({ bIds: [bId], type: 'seizure', occurredHoursAgo: 1, now });
    await seedIncident({ bIds: [bId], type: 'seizure', occurredHoursAgo: 24, now });
    const engine = wireEngine();
    const result = await engine.evaluateBeneficiary(bId, {
      flagIds: ['clinical.seizure.cluster.48h'],
      now,
    });
    expect(result.raisedCount).toBe(0);
  });

  it('safety.fall.repeat.30d raises when > 2 falls in 30 days', async () => {
    const bId = new mongoose.Types.ObjectId().toString();
    const now = new Date('2026-04-22T12:00:00.000Z');
    await seedIncident({ bIds: [bId], type: 'fall', occurredHoursAgo: 48, now });
    await seedIncident({ bIds: [bId], type: 'fall', occurredHoursAgo: 24 * 10, now });
    await seedIncident({ bIds: [bId], type: 'fall', occurredHoursAgo: 24 * 20, now });
    const engine = wireEngine();
    const result = await engine.evaluateBeneficiary(bId, {
      flagIds: ['safety.fall.repeat.30d'],
      now,
    });
    expect(result.raisedCount).toBe(1);
    expect(result.verdicts[0].observedValue).toBe(3);
  });
});
