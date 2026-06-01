'use strict';

/**
 * Behavioral counterpart for VisionScreening (W720).
 *
 * Boots an in-memory Mongo (mongodb-memory-server), unmocks mongoose, and
 * asserts the Wave-18 __invariants ACTUALLY FIRE — reject bad saves, accept
 * good ones — plus that virtuals compute on persisted docs.
 *
 * Pattern reference: seating-postural-assessment-behavioral-wave675.
 */

const mongoose = require('mongoose');

jest.unmock('mongoose');

let mongod;
let Vision;

beforeAll(async () => {
  const { MongoMemoryServer } = require('mongodb-memory-server');
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  Vision = require('../models/VisionScreening');
}, 60000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

describe('VisionScreening behavioral (W720)', () => {
  test('rejects an invalid screening method', async () => {
    const doc = new Vision({
      beneficiaryId: new mongoose.Types.ObjectId(),
      date: new Date(),
      screeningMethod: 'crystal_ball',
    });
    await expect(doc.save()).rejects.toThrow(/screeningMethod/);
  });

  test('rejects outcome=refer without a referral reason', async () => {
    const doc = new Vision({
      beneficiaryId: new mongoose.Types.ObjectId(),
      date: new Date(),
      screeningMethod: 'lea_symbols',
      outcome: 'refer',
    });
    await expect(doc.save()).rejects.toThrow(/referralReason/);
  });

  test('rejects glassesPrescribed without detail', async () => {
    const doc = new Vision({
      beneficiaryId: new mongoose.Types.ObjectId(),
      date: new Date(),
      screeningMethod: 'snellen_chart',
      glassesPrescribed: true,
    });
    await expect(doc.save()).rejects.toThrow(/glassesDetail/);
  });

  test('rejects cviSuspected with no signs', async () => {
    const doc = new Vision({
      beneficiaryId: new mongoose.Types.ObjectId(),
      date: new Date(),
      screeningMethod: 'fixation_following',
      cviSuspected: true,
    });
    await expect(doc.save()).rejects.toThrow(/cviSign/);
  });

  test('rejects an invalid acuity band', async () => {
    const doc = new Vision({
      beneficiaryId: new mongoose.Types.ObjectId(),
      date: new Date(),
      screeningMethod: 'hotv',
      acuityRight: 'eagle_eyes',
    });
    await expect(doc.save()).rejects.toThrow(/acuityRight/);
  });

  test('accepts a valid CVI referral screen + computes virtuals', async () => {
    const doc = await Vision.create({
      beneficiaryId: new mongoose.Types.ObjectId(),
      date: new Date(),
      screeningMethod: 'fixation_following',
      acuityBinocular: 'severe_6_60',
      cviSuspected: true,
      cviSigns: ['colour_preference', 'visual_latency', 'difficulty_with_complexity'],
      outcome: 'refer',
      referralReason: 'CVI cluster + low functional acuity — needs ophthalmology + low-vision OT.',
      referralTo: 'ophthalmology',
    });
    expect(doc.needsReferral).toBe(true);
    expect(doc.cviSignCount).toBe(3);
  });

  test('accepts a clean pass screen (no referral required)', async () => {
    const doc = await Vision.create({
      beneficiaryId: new mongoose.Types.ObjectId(),
      date: new Date(),
      screeningMethod: 'snellen_chart',
      acuityBinocular: 'normal_6_6',
      outcome: 'pass',
    });
    expect(doc.needsReferral).toBe(false);
    expect(doc.status).toBe('draft');
  });

  test('rejects reassessmentDue earlier than the screening date', async () => {
    const doc = new Vision({
      beneficiaryId: new mongoose.Types.ObjectId(),
      date: new Date('2026-06-01'),
      screeningMethod: 'lea_symbols',
      reassessmentDue: new Date('2026-05-01'),
    });
    await expect(doc.save()).rejects.toThrow(/reassessmentDue/);
  });
});
