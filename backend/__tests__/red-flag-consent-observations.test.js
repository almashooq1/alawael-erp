/**
 * red-flag-consent-observations.test.js — Beneficiary-360 Commit 19.
 *
 * Integration: real Consent + Beneficiary models against mongodb-
 * memory-server. Pins the opt-in gate behavior (tracking disabled
 * → safe defaults), the active-consent filter semantics (revoked /
 * expired / future-granted), and the end-to-end flag firing.
 */

'use strict';

process.env.NODE_ENV = 'test';

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const {
  createConsentObservations,
} = require('../services/redFlagObservations/consentObservations');
const { createLocator } = require('../services/redFlagServiceLocator');
const { createEngine } = require('../services/redFlagEngine');

let mongoServer;
let Consent;
let Beneficiary;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  if (mongoose.connection.readyState !== 0) {
    try {
      await mongoose.disconnect();
    } catch {
      /* ignore */
    }
  }
  await mongoose.connect(mongoServer.getUri(), { dbName: 'consent-obs-test' });
  const consentExports = require('../models/Consent');
  Consent = consentExports.Consent;
  Beneficiary = require('../models/Beneficiary');
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
  await Consent.deleteMany({});
  await Beneficiary.deleteMany({});
});

// ─── Fixtures ───────────────────────────────────────────────────

async function seedBeneficiary({ trackingEnabled = false } = {}) {
  const doc = await Beneficiary.create({
    firstName: 'Consent',
    lastName: 'Test',
    dateOfBirth: new Date('2018-01-01'),
    gender: 'male',
    consentTrackingEnabled: trackingEnabled,
  });
  return doc;
}

async function seedConsent({
  bId,
  type = 'treatment',
  grantedAt = new Date('2026-04-01T00:00:00.000Z'),
  expiresAt = null,
  revokedAt = null,
}) {
  return Consent.create({
    beneficiaryId: bId instanceof mongoose.Types.ObjectId ? bId : new mongoose.Types.ObjectId(bId),
    type,
    grantedAt,
    expiresAt,
    revokedAt,
  });
}

// ─── Opt-in gate ────────────────────────────────────────────────

describe('activeForBeneficiary — tracking gate', () => {
  it('returns treatmentActive: true when tracking is disabled (default)', async () => {
    const doc = await seedBeneficiary({ trackingEnabled: false });
    const obs = createConsentObservations({
      consentModel: Consent,
      beneficiaryModel: Beneficiary,
    });
    const { treatmentActive } = await obs.activeForBeneficiary(doc._id);
    expect(treatmentActive).toBe(true);
  });

  it('returns treatmentActive: true when the beneficiary does not exist', async () => {
    const obs = createConsentObservations({
      consentModel: Consent,
      beneficiaryModel: Beneficiary,
    });
    const { treatmentActive } = await obs.activeForBeneficiary(new mongoose.Types.ObjectId());
    // Missing beneficiary → tracking implicitly disabled → safe default.
    expect(treatmentActive).toBe(true);
  });
});

describe('missingRequiredForBeneficiary — tracking gate', () => {
  it('returns missingCount: 0 when tracking is disabled', async () => {
    const doc = await seedBeneficiary({ trackingEnabled: false });
    const obs = createConsentObservations({
      consentModel: Consent,
      beneficiaryModel: Beneficiary,
    });
    const { missingCount } = await obs.missingRequiredForBeneficiary(doc._id);
    expect(missingCount).toBe(0);
  });
});

// ─── Active consent filter semantics ───────────────────────────

describe('activeForBeneficiary — active-consent filter', () => {
  it('returns treatmentActive: false when tracking enabled but no consent exists', async () => {
    const doc = await seedBeneficiary({ trackingEnabled: true });
    const obs = createConsentObservations({
      consentModel: Consent,
      beneficiaryModel: Beneficiary,
    });
    const { treatmentActive } = await obs.activeForBeneficiary(doc._id);
    expect(treatmentActive).toBe(false);
  });

  it('returns treatmentActive: true with a simple active grant', async () => {
    const doc = await seedBeneficiary({ trackingEnabled: true });
    await seedConsent({
      bId: doc._id,
      type: 'treatment',
      grantedAt: new Date('2026-01-01'),
    });
    const obs = createConsentObservations({
      consentModel: Consent,
      beneficiaryModel: Beneficiary,
    });
    const { treatmentActive } = await obs.activeForBeneficiary(doc._id, {
      now: new Date('2026-04-22T12:00:00.000Z'),
    });
    expect(treatmentActive).toBe(true);
  });

  it('returns treatmentActive: false when the consent is revoked', async () => {
    const doc = await seedBeneficiary({ trackingEnabled: true });
    await seedConsent({
      bId: doc._id,
      grantedAt: new Date('2026-01-01'),
      revokedAt: new Date('2026-02-01'),
    });
    const obs = createConsentObservations({
      consentModel: Consent,
      beneficiaryModel: Beneficiary,
    });
    const { treatmentActive } = await obs.activeForBeneficiary(doc._id, {
      now: new Date('2026-04-22T12:00:00.000Z'),
    });
    expect(treatmentActive).toBe(false);
  });

  it('returns treatmentActive: false when the consent has expired', async () => {
    const doc = await seedBeneficiary({ trackingEnabled: true });
    await seedConsent({
      bId: doc._id,
      grantedAt: new Date('2025-01-01'),
      expiresAt: new Date('2026-01-01'),
    });
    const obs = createConsentObservations({
      consentModel: Consent,
      beneficiaryModel: Beneficiary,
    });
    const { treatmentActive } = await obs.activeForBeneficiary(doc._id, {
      now: new Date('2026-04-22T12:00:00.000Z'),
    });
    expect(treatmentActive).toBe(false);
  });

  it('ignores future-granted consents (grantedAt > now)', async () => {
    const doc = await seedBeneficiary({ trackingEnabled: true });
    await seedConsent({
      bId: doc._id,
      grantedAt: new Date('2027-01-01'),
    });
    const obs = createConsentObservations({
      consentModel: Consent,
      beneficiaryModel: Beneficiary,
    });
    const { treatmentActive } = await obs.activeForBeneficiary(doc._id, {
      now: new Date('2026-04-22T12:00:00.000Z'),
    });
    expect(treatmentActive).toBe(false);
  });

  it('only looks at treatment-type consents', async () => {
    const doc = await seedBeneficiary({ trackingEnabled: true });
    await seedConsent({ bId: doc._id, type: 'photography' });
    await seedConsent({ bId: doc._id, type: 'data_sharing' });
    const obs = createConsentObservations({
      consentModel: Consent,
      beneficiaryModel: Beneficiary,
    });
    const { treatmentActive } = await obs.activeForBeneficiary(doc._id, {
      now: new Date('2026-04-22T12:00:00.000Z'),
    });
    expect(treatmentActive).toBe(false);
  });
});

// ─── missingRequiredForBeneficiary ─────────────────────────────

describe('missingRequiredForBeneficiary — required-types check', () => {
  it('counts all required types as missing when no consent exists', async () => {
    const doc = await seedBeneficiary({ trackingEnabled: true });
    const obs = createConsentObservations({
      consentModel: Consent,
      beneficiaryModel: Beneficiary,
    });
    const { missingCount } = await obs.missingRequiredForBeneficiary(doc._id);
    // Default required = [treatment, data_sharing]
    expect(missingCount).toBe(2);
  });

  it('counts only the types that are still missing', async () => {
    const doc = await seedBeneficiary({ trackingEnabled: true });
    await seedConsent({ bId: doc._id, type: 'treatment' });
    const obs = createConsentObservations({
      consentModel: Consent,
      beneficiaryModel: Beneficiary,
    });
    const { missingCount } = await obs.missingRequiredForBeneficiary(doc._id, {
      now: new Date('2026-04-22T12:00:00.000Z'),
    });
    expect(missingCount).toBe(1); // treatment present, data_sharing missing
  });

  it('returns 0 when all required types have active consent', async () => {
    const doc = await seedBeneficiary({ trackingEnabled: true });
    await seedConsent({ bId: doc._id, type: 'treatment' });
    await seedConsent({ bId: doc._id, type: 'data_sharing' });
    const obs = createConsentObservations({
      consentModel: Consent,
      beneficiaryModel: Beneficiary,
    });
    const { missingCount } = await obs.missingRequiredForBeneficiary(doc._id, {
      now: new Date('2026-04-22T12:00:00.000Z'),
    });
    expect(missingCount).toBe(0);
  });

  it('a revoked required consent counts as missing', async () => {
    const doc = await seedBeneficiary({ trackingEnabled: true });
    await seedConsent({
      bId: doc._id,
      type: 'treatment',
      revokedAt: new Date('2026-03-01'),
    });
    await seedConsent({ bId: doc._id, type: 'data_sharing' });
    const obs = createConsentObservations({
      consentModel: Consent,
      beneficiaryModel: Beneficiary,
    });
    const { missingCount } = await obs.missingRequiredForBeneficiary(doc._id, {
      now: new Date('2026-04-22T12:00:00.000Z'),
    });
    expect(missingCount).toBe(1);
  });
});

// ─── End-to-end via engine ──────────────────────────────────────

describe('consent flags end-to-end', () => {
  function wire() {
    const locator = createLocator();
    locator.register(
      'consentService',
      createConsentObservations({
        consentModel: Consent,
        beneficiaryModel: Beneficiary,
      })
    );
    return createEngine({ locator });
  }

  it('clinical.consent.treatment.missing_pre_session raises when tracking on and no consent', async () => {
    const doc = await seedBeneficiary({ trackingEnabled: true });
    const engine = wire();
    const result = await engine.evaluateBeneficiary(String(doc._id), {
      flagIds: ['clinical.consent.treatment.missing_pre_session'],
    });
    expect(result.raisedCount).toBe(1);
    expect(result.blockingRaisedCount).toBe(1);
  });

  it('clinical.consent.treatment.missing_pre_session stays clear when tracking off (opt-in gate)', async () => {
    const doc = await seedBeneficiary({ trackingEnabled: false });
    const engine = wire();
    const result = await engine.evaluateBeneficiary(String(doc._id), {
      flagIds: ['clinical.consent.treatment.missing_pre_session'],
    });
    expect(result.raisedCount).toBe(0);
  });

  it('compliance.consent.required.missing raises when tracking on and both required types are missing', async () => {
    const doc = await seedBeneficiary({ trackingEnabled: true });
    const engine = wire();
    const result = await engine.evaluateBeneficiary(String(doc._id), {
      flagIds: ['compliance.consent.required.missing'],
    });
    expect(result.raisedCount).toBe(1);
    expect(result.verdicts[0].observedValue).toBe(2);
  });

  it('compliance.consent.required.missing clears once all required consents are on file', async () => {
    const doc = await seedBeneficiary({ trackingEnabled: true });
    await seedConsent({ bId: doc._id, type: 'treatment' });
    await seedConsent({ bId: doc._id, type: 'data_sharing' });
    const engine = wire();
    const result = await engine.evaluateBeneficiary(String(doc._id), {
      flagIds: ['compliance.consent.required.missing'],
    });
    expect(result.raisedCount).toBe(0);
  });
});
