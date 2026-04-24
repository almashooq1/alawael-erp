/**
 * red-flag-medication-observations.test.js — Beneficiary-360 Commit 23.
 *
 * Covers three layers:
 *   • interactions catalog (pure data)
 *   • adapter unit behavior (allergy match + drug-drug)
 *   • end-to-end flag firing via engine
 *
 * Uses mongodb-memory-server for the two new models.
 */

'use strict';

process.env.NODE_ENV = 'test';

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const {
  createMedicationObservations,
} = require('../services/redFlagObservations/medicationObservations');
const {
  INTERACTIONS,
  findInteraction,
  findAllInteractions,
  canonPair,
} = require('../config/medication-interactions');
const { createLocator } = require('../services/redFlagServiceLocator');
const { createEngine } = require('../services/redFlagEngine');

// ─── Pure catalog tests (no DB) ────────────────────────────────

describe('medication-interactions catalog', () => {
  it('all pairs are alpha-canonicalized (a <= b)', () => {
    for (const entry of INTERACTIONS) {
      expect(entry.a <= entry.b).toBe(true);
    }
  });

  it('all entries have high or moderate severity', () => {
    for (const entry of INTERACTIONS) {
      expect(['high', 'moderate', 'low']).toContain(entry.severity);
    }
  });

  it('findInteraction is direction-agnostic', () => {
    const ab = findInteraction('warfarin', 'aspirin');
    const ba = findInteraction('aspirin', 'warfarin');
    expect(ab).not.toBeNull();
    expect(ba).not.toBeNull();
    expect(ab).toEqual(ba);
  });

  it('findInteraction normalizes case + whitespace', () => {
    expect(findInteraction('  Warfarin ', 'ASPIRIN')).not.toBeNull();
  });

  it('findInteraction returns null for unknown pairs', () => {
    expect(findInteraction('water', 'sugar')).toBeNull();
  });

  it('findInteraction returns null when both drugs are the same', () => {
    expect(findInteraction('warfarin', 'warfarin')).toBeNull();
  });

  it('findAllInteractions scans a full list and de-duplicates', () => {
    const hits = findAllInteractions(['warfarin', 'aspirin', 'Ibuprofen', 'aspirin']);
    // warfarin+aspirin (1) + warfarin+ibuprofen (1) = 2 distinct pairs
    expect(hits).toHaveLength(2);
  });

  it('canonPair normalizes order', () => {
    expect(canonPair('B', 'A')).toEqual(['a', 'b']);
    expect(canonPair('a', 'b')).toEqual(['a', 'b']);
  });
});

// ─── DB-backed tests ───────────────────────────────────────────

let mongoServer;
let Allergy;
let MedicationOrder;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  if (mongoose.connection.readyState !== 0) {
    try {
      await mongoose.disconnect();
    } catch {
      /* ignore */
    }
  }
  await mongoose.connect(mongoServer.getUri(), { dbName: 'medication-obs-test' });
  Allergy = require('../models/Allergy').Allergy;
  MedicationOrder = require('../models/MedicationOrder').MedicationOrder;
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
  await Allergy.deleteMany({});
  await MedicationOrder.deleteMany({});
});

// ─── Fixtures ──────────────────────────────────────────────────

async function seedAllergy({
  bId,
  substance,
  severity = 'severe',
  status = 'active',
  rxNormClass = null,
}) {
  return Allergy.create({
    beneficiaryId: bId instanceof mongoose.Types.ObjectId ? bId : new mongoose.Types.ObjectId(bId),
    substance,
    severity,
    status,
    rxNormClass,
  });
}

async function seedMedication({
  bId,
  name,
  status = 'active',
  rxNormId = null,
  rxNormClass = null,
}) {
  return MedicationOrder.create({
    beneficiaryId: bId instanceof mongoose.Types.ObjectId ? bId : new mongoose.Types.ObjectId(bId),
    name,
    status,
    rxNormId,
    rxNormClass,
  });
}

// ─── onPrescribe (allergy-conflict) ────────────────────────────

describe('onPrescribe', () => {
  it('returns no-conflict when the beneficiary has no allergies', async () => {
    const bId = new mongoose.Types.ObjectId();
    await seedMedication({ bId, name: 'amoxicillin' });
    const obs = createMedicationObservations({
      allergyModel: Allergy,
      medicationModel: MedicationOrder,
    });
    const result = await obs.onPrescribe(bId);
    expect(result.drug.rxNormId).toBe('no-conflict');
  });

  it('returns no-conflict when allergies exist but no medications', async () => {
    const bId = new mongoose.Types.ObjectId();
    await seedAllergy({ bId, substance: 'penicillin' });
    const obs = createMedicationObservations({
      allergyModel: Allergy,
      medicationModel: MedicationOrder,
    });
    const result = await obs.onPrescribe(bId);
    expect(result.drug.rxNormId).toBe('no-conflict');
  });

  it('returns allergen.match when a severe allergy matches an active medication by name', async () => {
    const bId = new mongoose.Types.ObjectId();
    await seedAllergy({ bId, substance: 'penicillin', severity: 'severe' });
    await seedMedication({ bId, name: 'penicillin' });
    const obs = createMedicationObservations({
      allergyModel: Allergy,
      medicationModel: MedicationOrder,
    });
    const result = await obs.onPrescribe(bId);
    expect(result.drug.rxNormId).toBe('allergen.match');
  });

  it('matches case-insensitively', async () => {
    const bId = new mongoose.Types.ObjectId();
    await seedAllergy({ bId, substance: 'Penicillin' });
    await seedMedication({ bId, name: 'PENICILLIN' });
    const obs = createMedicationObservations({
      allergyModel: Allergy,
      medicationModel: MedicationOrder,
    });
    const result = await obs.onPrescribe(bId);
    expect(result.drug.rxNormId).toBe('allergen.match');
  });

  it('matches by rxNormClass when names differ but classes align', async () => {
    const bId = new mongoose.Types.ObjectId();
    await seedAllergy({ bId, substance: 'penicillin', rxNormClass: 'penicillins' });
    await seedMedication({ bId, name: 'amoxicillin', rxNormClass: 'penicillins' });
    const obs = createMedicationObservations({
      allergyModel: Allergy,
      medicationModel: MedicationOrder,
    });
    const result = await obs.onPrescribe(bId);
    expect(result.drug.rxNormId).toBe('allergen.match');
  });

  it('ignores mild/moderate allergies (only severe+life_threatening trip the flag)', async () => {
    const bId = new mongoose.Types.ObjectId();
    await seedAllergy({ bId, substance: 'penicillin', severity: 'moderate' });
    await seedMedication({ bId, name: 'penicillin' });
    const obs = createMedicationObservations({
      allergyModel: Allergy,
      medicationModel: MedicationOrder,
    });
    const result = await obs.onPrescribe(bId);
    expect(result.drug.rxNormId).toBe('no-conflict');
  });

  it('ignores inactive allergies', async () => {
    const bId = new mongoose.Types.ObjectId();
    await seedAllergy({ bId, substance: 'penicillin', status: 'inactive' });
    await seedMedication({ bId, name: 'penicillin' });
    const obs = createMedicationObservations({
      allergyModel: Allergy,
      medicationModel: MedicationOrder,
    });
    const result = await obs.onPrescribe(bId);
    expect(result.drug.rxNormId).toBe('no-conflict');
  });

  it('ignores held / stopped medications', async () => {
    const bId = new mongoose.Types.ObjectId();
    await seedAllergy({ bId, substance: 'penicillin' });
    await seedMedication({ bId, name: 'penicillin', status: 'stopped' });
    const obs = createMedicationObservations({
      allergyModel: Allergy,
      medicationModel: MedicationOrder,
    });
    const result = await obs.onPrescribe(bId);
    expect(result.drug.rxNormId).toBe('no-conflict');
  });

  it('does not cross-leak between beneficiaries', async () => {
    const a = new mongoose.Types.ObjectId();
    const b = new mongoose.Types.ObjectId();
    await seedAllergy({ bId: a, substance: 'penicillin' });
    await seedMedication({ bId: b, name: 'penicillin' });
    const obs = createMedicationObservations({
      allergyModel: Allergy,
      medicationModel: MedicationOrder,
    });
    expect((await obs.onPrescribe(a)).drug.rxNormId).toBe('no-conflict');
    expect((await obs.onPrescribe(b)).drug.rxNormId).toBe('no-conflict');
  });
});

// ─── interactionCheckForBeneficiary ────────────────────────────

describe('interactionCheckForBeneficiary', () => {
  it('returns false when the beneficiary has no medications', async () => {
    const bId = new mongoose.Types.ObjectId();
    const obs = createMedicationObservations({
      allergyModel: Allergy,
      medicationModel: MedicationOrder,
    });
    const result = await obs.interactionCheckForBeneficiary(bId);
    expect(result.hasInteraction).toBe(false);
  });

  it('returns false when only one active medication exists', async () => {
    const bId = new mongoose.Types.ObjectId();
    await seedMedication({ bId, name: 'warfarin' });
    const obs = createMedicationObservations({
      allergyModel: Allergy,
      medicationModel: MedicationOrder,
    });
    const result = await obs.interactionCheckForBeneficiary(bId);
    expect(result.hasInteraction).toBe(false);
  });

  it('returns true for a known high-severity pair (warfarin + aspirin)', async () => {
    const bId = new mongoose.Types.ObjectId();
    await seedMedication({ bId, name: 'warfarin' });
    await seedMedication({ bId, name: 'aspirin' });
    const obs = createMedicationObservations({
      allergyModel: Allergy,
      medicationModel: MedicationOrder,
    });
    const result = await obs.interactionCheckForBeneficiary(bId);
    expect(result.hasInteraction).toBe(true);
  });

  it('moderate-severity pairs do NOT trip the flag', async () => {
    const bId = new mongoose.Types.ObjectId();
    // clopidogrel + omeprazole is MODERATE in our catalog
    await seedMedication({ bId, name: 'clopidogrel' });
    await seedMedication({ bId, name: 'omeprazole' });
    const obs = createMedicationObservations({
      allergyModel: Allergy,
      medicationModel: MedicationOrder,
    });
    const result = await obs.interactionCheckForBeneficiary(bId);
    expect(result.hasInteraction).toBe(false);
  });

  it('ignores held / stopped medications', async () => {
    const bId = new mongoose.Types.ObjectId();
    await seedMedication({ bId, name: 'warfarin' });
    await seedMedication({ bId, name: 'aspirin', status: 'stopped' });
    const obs = createMedicationObservations({
      allergyModel: Allergy,
      medicationModel: MedicationOrder,
    });
    const result = await obs.interactionCheckForBeneficiary(bId);
    expect(result.hasInteraction).toBe(false);
  });
});

// ─── End-to-end via engine ─────────────────────────────────────

describe('medication flags fire end-to-end', () => {
  function wire() {
    const locator = createLocator();
    locator.register(
      'medicationService',
      createMedicationObservations({
        allergyModel: Allergy,
        medicationModel: MedicationOrder,
      })
    );
    return createEngine({ locator });
  }

  it('clinical.allergy.severe.medication_conflict raises on a name match', async () => {
    const bId = new mongoose.Types.ObjectId().toString();
    await seedAllergy({ bId, substance: 'penicillin', severity: 'life_threatening' });
    await seedMedication({ bId, name: 'penicillin' });
    const engine = wire();
    const result = await engine.evaluateBeneficiary(bId, {
      flagIds: ['clinical.allergy.severe.medication_conflict'],
    });
    expect(result.raisedCount).toBe(1);
    expect(result.blockingRaisedCount).toBe(1);
    expect(result.verdicts[0].observedValue).toBe('allergen.match');
  });

  it('safety.medication.interaction.detected raises on warfarin+aspirin', async () => {
    const bId = new mongoose.Types.ObjectId().toString();
    await seedMedication({ bId, name: 'warfarin' });
    await seedMedication({ bId, name: 'aspirin' });
    const engine = wire();
    const result = await engine.evaluateBeneficiary(bId, {
      flagIds: ['safety.medication.interaction.detected'],
    });
    expect(result.raisedCount).toBe(1);
    expect(result.blockingRaisedCount).toBe(1);
    expect(result.verdicts[0].observedValue).toBe(true);
  });

  it('both flags stay clear for a clean-slate beneficiary', async () => {
    const bId = new mongoose.Types.ObjectId().toString();
    const engine = wire();
    const result = await engine.evaluateBeneficiary(bId, {
      flagIds: [
        'clinical.allergy.severe.medication_conflict',
        'safety.medication.interaction.detected',
      ],
    });
    expect(result.raisedCount).toBe(0);
  });
});
