/**
 * red-flag-vaccination-observations.test.js — Beneficiary-360 Commit 24.
 *
 * Integration: real Vaccination model against mongodb-memory-server.
 * Pins the "overdue = scheduled + past grace" definition and the
 * end-to-end clinical.vaccination.overdue.60d flag.
 */

'use strict';

process.env.NODE_ENV = 'test';

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const {
  createVaccinationObservations,
} = require('../services/redFlagObservations/vaccinationObservations');
const { createLocator } = require('../services/redFlagServiceLocator');
const { createEngine } = require('../services/redFlagEngine');

let mongoServer;
let Vaccination;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  if (mongoose.connection.readyState !== 0) {
    try {
      await mongoose.disconnect();
    } catch {
      /* ignore */
    }
  }
  await mongoose.connect(mongoServer.getUri(), { dbName: 'vaccination-obs-test' });
  Vaccination = require('../models/Vaccination').Vaccination;
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
  await Vaccination.deleteMany({});
});

// ─── Fixture ────────────────────────────────────────────────────

async function seedVaccination({
  bId,
  vaccine = 'MMR',
  doseNumber = 1,
  status = 'scheduled',
  dueDaysAgo = 30,
  administeredAt = null,
  now = new Date(),
}) {
  return Vaccination.create({
    beneficiaryId: bId instanceof mongoose.Types.ObjectId ? bId : new mongoose.Types.ObjectId(bId),
    vaccine,
    doseNumber,
    status,
    dueDate: new Date(now.getTime() - dueDaysAgo * 24 * 3600 * 1000),
    administeredAt,
  });
}

// ─── Unit: dueStatusForBeneficiary ──────────────────────────────

describe('dueStatusForBeneficiary', () => {
  it('returns 0 when the beneficiary has no vaccinations', async () => {
    const obs = createVaccinationObservations({ model: Vaccination });
    const { overdueCount } = await obs.dueStatusForBeneficiary(new mongoose.Types.ObjectId());
    expect(overdueCount).toBe(0);
  });

  it('counts a single scheduled dose past the 60-day grace window', async () => {
    const bId = new mongoose.Types.ObjectId();
    const now = new Date('2026-04-22T12:00:00.000Z');
    await seedVaccination({ bId, dueDaysAgo: 90, now });
    const obs = createVaccinationObservations({ model: Vaccination });
    const { overdueCount } = await obs.dueStatusForBeneficiary(bId, { now });
    expect(overdueCount).toBe(1);
  });

  it('does NOT count doses inside the 60-day grace window', async () => {
    const bId = new mongoose.Types.ObjectId();
    const now = new Date('2026-04-22T12:00:00.000Z');
    await seedVaccination({ bId, dueDaysAgo: 30, now });
    const obs = createVaccinationObservations({ model: Vaccination });
    const { overdueCount } = await obs.dueStatusForBeneficiary(bId, { now });
    expect(overdueCount).toBe(0);
  });

  it('does NOT count administered doses', async () => {
    const bId = new mongoose.Types.ObjectId();
    const now = new Date('2026-04-22T12:00:00.000Z');
    await seedVaccination({
      bId,
      status: 'administered',
      dueDaysAgo: 90,
      administeredAt: new Date('2026-02-01'),
      now,
    });
    const obs = createVaccinationObservations({ model: Vaccination });
    const { overdueCount } = await obs.dueStatusForBeneficiary(bId, { now });
    expect(overdueCount).toBe(0);
  });

  it('does NOT count skipped or refused doses', async () => {
    const bId = new mongoose.Types.ObjectId();
    const now = new Date('2026-04-22T12:00:00.000Z');
    await seedVaccination({ bId, status: 'skipped', dueDaysAgo: 200, now });
    await seedVaccination({ bId, status: 'refused', dueDaysAgo: 200, now });
    const obs = createVaccinationObservations({ model: Vaccination });
    const { overdueCount } = await obs.dueStatusForBeneficiary(bId, { now });
    expect(overdueCount).toBe(0);
  });

  it('counts multiple overdue doses (one per row, no dedup across vaccines)', async () => {
    const bId = new mongoose.Types.ObjectId();
    const now = new Date('2026-04-22T12:00:00.000Z');
    await seedVaccination({ bId, vaccine: 'MMR', dueDaysAgo: 90, now });
    await seedVaccination({ bId, vaccine: 'DTaP', dueDaysAgo: 120, now });
    await seedVaccination({ bId, vaccine: 'Polio', dueDaysAgo: 30, now }); // inside grace
    const obs = createVaccinationObservations({ model: Vaccination });
    const { overdueCount } = await obs.dueStatusForBeneficiary(bId, { now });
    expect(overdueCount).toBe(2);
  });

  it('honors an injectable graceDays override', async () => {
    const bId = new mongoose.Types.ObjectId();
    const now = new Date('2026-04-22T12:00:00.000Z');
    await seedVaccination({ bId, dueDaysAgo: 45, now });
    const obs = createVaccinationObservations({ model: Vaccination });
    // Default 60-day grace: 45 days ago is still within grace → 0
    expect((await obs.dueStatusForBeneficiary(bId, { now })).overdueCount).toBe(0);
    // Tighter 30-day grace: 45 > 30 → count 1
    expect((await obs.dueStatusForBeneficiary(bId, { now, graceDays: 30 })).overdueCount).toBe(1);
  });

  it('does not leak across beneficiaries', async () => {
    const a = new mongoose.Types.ObjectId();
    const b = new mongoose.Types.ObjectId();
    const now = new Date('2026-04-22T12:00:00.000Z');
    await seedVaccination({ bId: a, dueDaysAgo: 90, now });
    await seedVaccination({ bId: b, dueDaysAgo: 30, now });
    const obs = createVaccinationObservations({ model: Vaccination });
    expect((await obs.dueStatusForBeneficiary(a, { now })).overdueCount).toBe(1);
    expect((await obs.dueStatusForBeneficiary(b, { now })).overdueCount).toBe(0);
  });
});

// ─── End-to-end via engine ──────────────────────────────────────

describe('clinical.vaccination.overdue.60d fires end-to-end', () => {
  function wire() {
    const locator = createLocator();
    locator.register('vaccinationService', createVaccinationObservations({ model: Vaccination }));
    return createEngine({ locator });
  }

  it('raises when one dose is past the 60-day grace', async () => {
    const bId = new mongoose.Types.ObjectId().toString();
    const now = new Date('2026-04-22T12:00:00.000Z');
    await seedVaccination({ bId, dueDaysAgo: 90, now });
    const engine = wire();
    const result = await engine.evaluateBeneficiary(bId, {
      flagIds: ['clinical.vaccination.overdue.60d'],
      now,
    });
    expect(result.raisedCount).toBe(1);
    expect(result.verdicts[0].observedValue).toBe(1);
  });

  it('stays clear when the dose is still within grace', async () => {
    const bId = new mongoose.Types.ObjectId().toString();
    const now = new Date('2026-04-22T12:00:00.000Z');
    await seedVaccination({ bId, dueDaysAgo: 45, now });
    const engine = wire();
    const result = await engine.evaluateBeneficiary(bId, {
      flagIds: ['clinical.vaccination.overdue.60d'],
      now,
    });
    expect(result.raisedCount).toBe(0);
  });

  it('stays clear when all doses are administered', async () => {
    const bId = new mongoose.Types.ObjectId().toString();
    const now = new Date('2026-04-22T12:00:00.000Z');
    await seedVaccination({
      bId,
      status: 'administered',
      dueDaysAgo: 200,
      administeredAt: new Date('2026-02-01'),
      now,
    });
    const engine = wire();
    const result = await engine.evaluateBeneficiary(bId, {
      flagIds: ['clinical.vaccination.overdue.60d'],
      now,
    });
    expect(result.raisedCount).toBe(0);
  });
});
