'use strict';

/**
 * W1240 — OfficialLetter → unified core timeline linkage.
 *
 * Beneficiary letters are part of the beneficiary's story (golden-thread
 * doctrine): issuing a registry letter for a beneficiary materialises one
 * CareTimeline row (administrative/success), and revoking it materialises
 * a second (administrative/warning). Employee letters never touch the
 * timeline. Producer = native pre-compile post('save') hooks on
 * OfficialLetter (W933 lesson); delivery = integrationBus → DDD
 * cross-module subscriber.
 *
 * Async assertions use the W1227 poll-until pattern — never a fixed sleep.
 */

jest.unmock('mongoose');
jest.setTimeout(90000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const { CareTimeline } = require('../domains/timeline/models/CareTimeline');
const { integrationBus } = require('../integration/systemIntegrationBus');
const { initializeDDDSubscribers } = require('../integration/dddCrossModuleSubscribers');

let OfficialLetter;
let mongo;

function issuer() {
  return { userId: new mongoose.Types.ObjectId(), name: 'HR Tester' };
}

function beneficiarySubject(refId) {
  return {
    kind: 'beneficiary',
    refId,
    nameAr: 'مستفيد اختبار',
    number: 'MRN-2026-0001',
  };
}

/** Poll until `expected` rows exist (or timeout) — W1227 deflake pattern. */
async function waitForRows(filter, expected, timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs;
  let rows = [];
  for (;;) {
    rows = await CareTimeline.find(filter).sort({ createdAt: 1 });
    if (rows.length >= expected || Date.now() > deadline) return rows;
    await new Promise(r => setTimeout(r, 25));
  }
}

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  OfficialLetter = require('../models/OfficialLetter');
  await OfficialLetter.init();
  await CareTimeline.init();
  initializeDDDSubscribers(integrationBus);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

afterEach(async () => {
  await CareTimeline.deleteMany({});
  await OfficialLetter.deleteMany({});
  await OfficialLetter.OfficialLetterCounter.deleteMany({});
});

describe('W1240 OfficialLetter → CareTimeline', () => {
  it('issuing a beneficiary letter records one administrative/success row', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const letter = await OfficialLetter.issue({
      letterType: 'beneficiary_certificate',
      subject: beneficiarySubject(beneficiaryId),
      issuer: issuer(),
      branchId: new mongoose.Types.ObjectId(),
    });

    const rows = await waitForRows({ beneficiaryId }, 1);
    expect(rows).toHaveLength(1);
    expect(rows[0].eventType).toBe('official_letter_issued');
    expect(rows[0].category).toBe('administrative');
    expect(rows[0].severity).toBe('success');
    expect(rows[0].title).toContain(letter.refNumber);
    expect(rows[0].metadata.letterId).toBe(String(letter._id));
  });

  it('revoking the letter records a second warning row', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const letter = await OfficialLetter.issue({
      letterType: 'beneficiary_certificate',
      subject: beneficiarySubject(beneficiaryId),
      issuer: issuer(),
    });
    await waitForRows({ beneficiaryId }, 1);

    letter.status = 'revoked';
    letter.revokedAt = new Date();
    letter.revokedBy = new mongoose.Types.ObjectId();
    letter.revokeReason = 'خطاب تجريبي';
    await letter.save();

    const rows = await waitForRows({ beneficiaryId }, 2);
    expect(rows).toHaveLength(2);
    expect(rows[1].eventType).toBe('official_letter_revoked');
    expect(rows[1].severity).toBe('warning');
    expect(rows[1].metadata.revokeReason).toBe('خطاب تجريبي');
  });

  it('employee letters never touch the timeline', async () => {
    const refId = new mongoose.Types.ObjectId();
    await OfficialLetter.issue({
      letterType: 'employment_certificate',
      subject: {
        kind: 'employee',
        refId,
        nameAr: 'موظف اختبار',
        number: 'EMP-2026-0001',
        jobTitle: 'أخصائي',
      },
      issuer: issuer(),
    });
    await new Promise(r => setTimeout(r, 150));

    const rows = await CareTimeline.find({});
    expect(rows).toHaveLength(0);
  });

  it('an unrelated later save of an issued letter does not duplicate the row', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const letter = await OfficialLetter.issue({
      letterType: 'beneficiary_certificate',
      subject: beneficiarySubject(beneficiaryId),
      issuer: issuer(),
    });
    await waitForRows({ beneficiaryId }, 1);

    letter.addressee = 'جهة أخرى';
    await letter.save();
    await new Promise(r => setTimeout(r, 150));

    const rows = await CareTimeline.find({ beneficiaryId });
    expect(rows).toHaveLength(1);
  });
});
