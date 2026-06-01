'use strict';

/**
 * Behavioral counterpart for HearingScreening (W724).
 *
 * Boots an in-memory Mongo, unmocks mongoose, asserts the Wave-18 __invariants
 * ACTUALLY FIRE (reject bad / accept good) + virtuals compute on persisted docs.
 * Pattern reference: vision-screening-behavioral-wave720.
 */

const mongoose = require('mongoose');

jest.unmock('mongoose');

let mongod;
let Hearing;

beforeAll(async () => {
  const { MongoMemoryServer } = require('mongodb-memory-server');
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  Hearing = require('../models/HearingScreening');
}, 60000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

describe('HearingScreening behavioral (W724)', () => {
  test('rejects an invalid screening method', async () => {
    const doc = new Hearing({
      beneficiaryId: new mongoose.Types.ObjectId(),
      date: new Date(),
      screeningMethod: 'echolocation',
    });
    await expect(doc.save()).rejects.toThrow(/screeningMethod/);
  });

  test('rejects outcome=refer without a referral reason', async () => {
    const doc = new Hearing({
      beneficiaryId: new mongoose.Types.ObjectId(),
      date: new Date(),
      screeningMethod: 'oae',
      outcome: 'refer',
    });
    await expect(doc.save()).rejects.toThrow(/referralReason/);
  });

  test('rejects hearingAidRecommended without detail', async () => {
    const doc = new Hearing({
      beneficiaryId: new mongoose.Types.ObjectId(),
      date: new Date(),
      screeningMethod: 'pure_tone_audiometry',
      hearingAidRecommended: true,
    });
    await expect(doc.save()).rejects.toThrow(/hearingAidDetail/);
  });

  test('rejects lossDetected with no affected ear', async () => {
    const doc = new Hearing({
      beneficiaryId: new mongoose.Types.ObjectId(),
      date: new Date(),
      screeningMethod: 'play_audiometry',
      lossDetected: true,
    });
    await expect(doc.save()).rejects.toThrow(/at least one ear|lossDetected/);
  });

  test('rejects an invalid threshold band', async () => {
    const doc = new Hearing({
      beneficiaryId: new mongoose.Types.ObjectId(),
      date: new Date(),
      screeningMethod: 'vra',
      thresholdRight: 'whisper_quiet',
    });
    await expect(doc.save()).rejects.toThrow(/thresholdRight/);
  });

  test('accepts a valid bilateral-loss referral + computes virtuals', async () => {
    const doc = await Hearing.create({
      beneficiaryId: new mongoose.Types.ObjectId(),
      date: new Date(),
      screeningMethod: 'pure_tone_audiometry',
      thresholdRight: 'moderate_35_49',
      thresholdLeft: 'moderate_35_49',
      lossDetected: true,
      rightEarAffected: true,
      leftEarAffected: true,
      lossType: 'sensorineural',
      severity: 'moderate',
      outcome: 'refer',
      referralReason: 'Bilateral SNHL — refer to audiology for hearing-aid fitting.',
      referralTo: 'audiology',
    });
    expect(doc.needsReferral).toBe(true);
    expect(doc.isBilateral).toBe(true);
  });

  test('accepts a clean pass screen (no referral required)', async () => {
    const doc = await Hearing.create({
      beneficiaryId: new mongoose.Types.ObjectId(),
      date: new Date(),
      screeningMethod: 'oae',
      thresholdRight: 'normal_lt_20',
      thresholdLeft: 'normal_lt_20',
      outcome: 'pass',
    });
    expect(doc.needsReferral).toBe(false);
    expect(doc.isBilateral).toBe(false);
    expect(doc.status).toBe('draft');
  });

  test('rejects reassessmentDue earlier than the screening date', async () => {
    const doc = new Hearing({
      beneficiaryId: new mongoose.Types.ObjectId(),
      date: new Date('2026-06-01'),
      screeningMethod: 'tympanometry',
      reassessmentDue: new Date('2026-05-01'),
    });
    await expect(doc.save()).rejects.toThrow(/reassessmentDue/);
  });
});
