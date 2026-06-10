'use strict';

/**
 * W1102 — SpeechSessionRecording → unified core timeline linkage.
 *
 * When an SLP speech-session recording finishes its analysis pipeline
 * (analysisStatus transitions to 'completed'), the model publishes
 * `speech-session.speech_session.analyzed`, which the DDD cross-module
 * subscriber materialises into a per-beneficiary CareTimeline row
 * (category: clinical, severity: success). Uploads, in-progress states
 * and failures never fire the milestone, and a completed recording is
 * never double-counted on subsequent saves.
 */

jest.unmock('mongoose');
jest.setTimeout(90000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const SpeechSessionRecording = require('../models/SpeechSessionRecording');
const { CareTimeline } = require('../domains/timeline/models/CareTimeline');
require('../models/Beneficiary');

const { integrationBus } = require('../integration/systemIntegrationBus');
const { initializeDDDSubscribers } = require('../integration/dddCrossModuleSubscribers');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create({
    instance: { dbName: 'w1102-speech-session' },
  });
  await mongoose.connect(mongoServer.getUri());
  initializeDDDSubscribers(integrationBus);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

afterEach(async () => {
  await SpeechSessionRecording.deleteMany({});
  await CareTimeline.deleteMany({});
});

async function waitForTimeline(filter, { tries = 40, gap = 50 } = {}) {
  for (let i = 0; i < tries; i += 1) {
    const row = await CareTimeline.findOne(filter).lean();
    if (row) return row;
    await new Promise(r => setTimeout(r, gap));
  }
  return null;
}

function recording(beneficiaryId, branchId, overrides = {}) {
  return {
    beneficiaryId,
    branchId,
    therapistId: new mongoose.Types.ObjectId(),
    consentRecordId: new mongoose.Types.ObjectId(),
    storageProvider: 's3',
    storageBucket: 'speech-audio',
    storageKey: `recordings/${new mongoose.Types.ObjectId()}.wav`,
    encryptionKeyId: 'alias/speech-kms',
    audioHash: 'a'.repeat(64),
    ...overrides,
  };
}

describe('W1102 — SpeechSessionRecording → CareTimeline linkage', () => {
  it('records a clinical/success timeline row when analysis completes', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const branchId = new mongoose.Types.ObjectId();
    const doc = await SpeechSessionRecording.create(recording(beneficiaryId, branchId));

    // Upload alone must NOT fire.
    await new Promise(r => setTimeout(r, 200));
    expect(await CareTimeline.countDocuments({ beneficiaryId })).toBe(0);

    doc.analysisStatus = 'completed';
    doc.transcriptLanguage = 'ar';
    doc.transcriptConfidence = 0.92;
    doc.analysisProvider = 'openai-whisper-api';
    doc.analysisCompletedAt = new Date();
    await doc.save();

    const row = await waitForTimeline({ beneficiaryId });
    expect(row).toBeTruthy();
    expect(row.eventType).toBe('speech_session_analyzed');
    expect(row.category).toBe('clinical');
    expect(row.severity).toBe('success');
    expect(String(row.branchId)).toBe(String(branchId));
    expect(String(row.metadata.recordingId)).toBe(String(doc._id));
    expect(row.metadata.transcriptLanguage).toBe('ar');
    expect(row.title).toContain('92%');
  });

  it('does NOT fire when a recording is merely uploaded', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const branchId = new mongoose.Types.ObjectId();
    await SpeechSessionRecording.create(recording(beneficiaryId, branchId));

    await new Promise(r => setTimeout(r, 300));
    expect(await CareTimeline.countDocuments({ beneficiaryId })).toBe(0);
  });

  it('does NOT fire when analysis fails', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const branchId = new mongoose.Types.ObjectId();
    const doc = await SpeechSessionRecording.create(recording(beneficiaryId, branchId));

    doc.analysisStatus = 'failed';
    doc.analysisError = 'STT timeout';
    await doc.save();

    await new Promise(r => setTimeout(r, 300));
    expect(await CareTimeline.countDocuments({ beneficiaryId })).toBe(0);
  });

  it('does not duplicate the timeline row on a subsequent unrelated save', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const branchId = new mongoose.Types.ObjectId();
    const doc = await SpeechSessionRecording.create(recording(beneficiaryId, branchId));

    doc.analysisStatus = 'completed';
    doc.analysisCompletedAt = new Date();
    await doc.save();
    await waitForTimeline({ beneficiaryId });

    doc.audioPurgedAt = new Date();
    await doc.save();
    await new Promise(r => setTimeout(r, 300));
    expect(await CareTimeline.countDocuments({ beneficiaryId })).toBe(1);
  });
});
