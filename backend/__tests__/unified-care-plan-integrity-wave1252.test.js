'use strict';

/**
 * W1252 — UnifiedCarePlan integrity layer (ADR-040 option (b) step 1,
 * owner-approved 2026-06-12).
 *
 * Lifts CarePlanVersion's compliance guarantees onto the model the UI
 * actually writes: append-only hash-chained signatureChain + sha256
 * evidenceHash lock over the clinical body. Layers:
 *   1. CROSS-MODEL HASH COMPAT — signature-hash payload format identical to
 *      CarePlanVersion (verifiable across models during the migration).
 *   2. BEHAVIORAL (MMS) — chain append/verify, tamper detection, evidence
 *      seal + divergence detection, immutability invariant on save.
 *   3. SERVICE WIRING — activatePlan records the 'activate' signature +
 *      seals evidence when an actor is passed (fail-safe otherwise).
 */

jest.unmock('mongoose');
jest.setTimeout(120000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const { UnifiedCarePlan } = require('../domains/care-plans/models/UnifiedCarePlan');

describe('W1252 cross-model hash compatibility', () => {
  test('signature-hash payload format matches CarePlanVersion exactly', () => {
    const CarePlanVersion = require('../models/CarePlanVersion');
    const args = {
      userId: '64b000000000000000000001',
      role: 'clinical_lead',
      action: 'activate',
      signedAt: new Date('2026-06-12T10:00:00Z'),
      prevHash: 'abc',
    };
    expect(UnifiedCarePlan.computeSignatureHash(args)).toBe(
      CarePlanVersion.computeSignatureHash(args)
    );
  });

  test('evidence hash is deterministic and key-order independent', () => {
    const a = UnifiedCarePlan.computeEvidenceHash({ x: 1, y: { b: 2, a: 3 } });
    const b = UnifiedCarePlan.computeEvidenceHash({ y: { a: 3, b: 2 }, x: 1 });
    expect(a).toBe(b);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe('W1252 behavioral (MMS)', () => {
  let mongod;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongod) await mongod.stop();
  });

  beforeEach(async () => {
    await UnifiedCarePlan.deleteMany({});
  });

  function basePlan() {
    return {
      beneficiaryId: new mongoose.Types.ObjectId(),
      episodeId: new mongoose.Types.ObjectId(),
      startDate: new Date('2026-06-01'),
      type: 'comprehensive',
    };
  }

  test('appendSignature builds a verifiable chain; tampering is detected', async () => {
    const plan = await UnifiedCarePlan.create(basePlan());
    const u1 = new mongoose.Types.ObjectId();
    const u2 = new mongoose.Types.ObjectId();

    plan.appendSignature({ userId: u1, role: 'therapist', action: 'submit' });
    plan.appendSignature({ userId: u2, role: 'clinical_lead', action: 'activate' });
    await plan.save();

    const loaded = await UnifiedCarePlan.findById(plan._id);
    expect(loaded.signatureChain).toHaveLength(2);
    expect(loaded.signatureChain[1].prevHash).toBe(loaded.signatureChain[0].hash);
    expect(loaded.verifySignatureChain().ok).toBe(true);

    // Tamper with the first entry → chain breaks at index 0
    loaded.signatureChain[0].action = 'forged_action';
    const verdict = loaded.verifySignatureChain();
    expect(verdict.ok).toBe(false);
    expect(verdict.brokenAt).toBe(0);
  });

  test('sealEvidence locks the clinical body; divergence is detected', async () => {
    const plan = await UnifiedCarePlan.create({
      ...basePlan(),
      globalGoals: [{ title: 'هدف تواصل', type: 'communication' }],
    });
    const sealed = plan.sealEvidence();
    await plan.save();
    expect(sealed).toMatch(/^[a-f0-9]{64}$/);

    const loaded = await UnifiedCarePlan.findById(plan._id);
    expect(loaded.verifyEvidence().ok).toBe(true);

    // Clinical change after sealing → divergence detected
    loaded.globalGoals.push({ title: 'هدف مُقحم', type: 'other' });
    expect(loaded.verifyEvidence().ok).toBe(false);
  });

  test('sealEvidence is idempotent', async () => {
    const plan = await UnifiedCarePlan.create(basePlan());
    const h1 = plan.sealEvidence();
    const h2 = plan.sealEvidence();
    expect(h1).toBe(h2);
  });

  test('evidenceHash is immutable once persisted (invariant rejects overwrite)', async () => {
    const plan = await UnifiedCarePlan.create(basePlan());
    plan.sealEvidence();
    await plan.save();

    const loaded = await UnifiedCarePlan.findById(plan._id);
    loaded.evidenceHash = 'f'.repeat(64);
    await expect(loaded.save()).rejects.toThrow(/immutable/);
  });

  test('service wiring — activatePlan with actor records signature + seals evidence', async () => {
    const plan = await UnifiedCarePlan.create(basePlan());
    const { carePlansService: svc } = require('../domains/care-plans/services/CarePlansService');

    const actorId = new mongoose.Types.ObjectId();
    await svc.activatePlan(String(plan._id), { actor: { id: actorId, role: 'clinical_lead' } });

    const after = await UnifiedCarePlan.findById(plan._id);
    expect(after.status).toBe('active');
    expect(after.signatureChain.length).toBe(1);
    expect(after.signatureChain[0].action).toBe('activate');
    expect(String(after.signatureChain[0].userId)).toBe(String(actorId));
    expect(after.evidenceHash).toMatch(/^[a-f0-9]{64}$/);
    expect(after.verifySignatureChain().ok).toBe(true);
  });

  test('service wiring — activatePlan WITHOUT actor still activates (fail-safe, no chain)', async () => {
    const plan = await UnifiedCarePlan.create(basePlan());
    const { carePlansService: svc } = require('../domains/care-plans/services/CarePlansService');

    await svc.activatePlan(String(plan._id));
    const after = await UnifiedCarePlan.findById(plan._id);
    expect(after.status).toBe('active');
    expect(after.signatureChain.length).toBe(0);
  });
});
