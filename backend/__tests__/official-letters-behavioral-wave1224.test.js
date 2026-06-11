'use strict';

/**
 * official-letters-behavioral-wave1224.test.js — OfficialLetter against
 * MongoMemoryServer (real driver, no mocks).
 *
 * Covers the issuance contract: atomic per-type/per-year sequencing,
 * official refNumber format, verifyToken uniqueness, revocation
 * invariants (Wave-18), and parallel-issue safety (no duplicate seq under
 * concurrency — the whole reason the counter is a findOneAndUpdate $inc).
 */

jest.unmock('mongoose');
jest.setTimeout(120000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let OfficialLetter;

const YEAR = new Date().getFullYear();

function subject(over = {}) {
  return {
    kind: 'employee',
    refId: new mongoose.Types.ObjectId(),
    nameAr: 'موظف اختبار',
    nameEn: 'Test Employee',
    number: 'EMP-2026-0001',
    jobTitle: 'أخصائي علاج طبيعي',
    ...over,
  };
}

function issuer() {
  return { userId: new mongoose.Types.ObjectId(), name: 'HR Tester' };
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1224-letters' } });
  await mongoose.connect(mongod.getUri());
  OfficialLetter = require('../models/OfficialLetter');
  await OfficialLetter.init();
  await OfficialLetter.OfficialLetterCounter.init();
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

afterEach(async () => {
  await OfficialLetter.deleteMany({});
  await OfficialLetter.OfficialLetterCounter.deleteMany({});
});

describe('W1224 OfficialLetter.issue — sequencing + format', () => {
  test('first issue gets seq 1 and a formatted refNumber', async () => {
    const letter = await OfficialLetter.issue({
      letterType: 'employment_certificate',
      subject: subject(),
      issuer: issuer(),
    });
    expect(letter.seq).toBe(1);
    expect(letter.refNumber).toBe(`EC-${YEAR}-0001`);
    expect(letter.status).toBe('issued');
    expect(letter.verifyToken).toMatch(/^[a-f0-9]{32}$/);
    expect(letter.addressee).toBe('إلى من يهمه الأمر');
  });

  test('sequences are independent per letterType', async () => {
    const a = await OfficialLetter.issue({
      letterType: 'employment_certificate',
      subject: subject(),
      issuer: issuer(),
    });
    const b = await OfficialLetter.issue({
      letterType: 'salary_certificate',
      subject: subject(),
      issuer: issuer(),
      payload: { salary: { basic: 8000, housing: 2000, transport: 500, other: 0, total: 10500 } },
    });
    expect(a.refNumber).toBe(`EC-${YEAR}-0001`);
    expect(b.refNumber).toBe(`SC-${YEAR}-0001`);
    expect(b.payload.salary.total).toBe(10500);
  });

  test('10 PARALLEL issues never collide on seq (atomic $inc counter)', async () => {
    const letters = await Promise.all(
      Array.from({ length: 10 }, () =>
        OfficialLetter.issue({
          letterType: 'employment_certificate',
          subject: subject(),
          issuer: issuer(),
        })
      )
    );
    const seqs = letters.map((l) => l.seq).sort((x, y) => x - y);
    expect(seqs).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const refs = new Set(letters.map((l) => l.refNumber));
    expect(refs.size).toBe(10);
  });

  test('unknown letterType throws INVALID_LETTER_TYPE', async () => {
    await expect(
      OfficialLetter.issue({ letterType: 'nope', subject: subject(), issuer: issuer() })
    ).rejects.toMatchObject({ code: 'INVALID_LETTER_TYPE' });
  });

  test('verifyTokens are unique across letters', async () => {
    const a = await OfficialLetter.issue({
      letterType: 'employment_certificate',
      subject: subject(),
      issuer: issuer(),
    });
    const b = await OfficialLetter.issue({
      letterType: 'employment_certificate',
      subject: subject(),
      issuer: issuer(),
    });
    expect(a.verifyToken).not.toBe(b.verifyToken);
  });
});

describe('W1224 OfficialLetter — revocation invariants (Wave-18)', () => {
  test('revoking without a reason fails validation', async () => {
    const letter = await OfficialLetter.issue({
      letterType: 'employment_certificate',
      subject: subject(),
      issuer: issuer(),
    });
    letter.status = 'revoked';
    letter.revokedAt = new Date();
    await expect(letter.save()).rejects.toThrow(/revokeReason/);
  });

  test('revoking with reason + revokedAt persists', async () => {
    const letter = await OfficialLetter.issue({
      letterType: 'employment_certificate',
      subject: subject(),
      issuer: issuer(),
    });
    letter.status = 'revoked';
    letter.revokedAt = new Date();
    letter.revokedBy = new mongoose.Types.ObjectId();
    letter.revokeReason = 'صدر بالخطأ';
    await letter.save();
    const row = await OfficialLetter.findById(letter._id).lean();
    expect(row.status).toBe('revoked');
    expect(row.revokeReason).toBe('صدر بالخطأ');
  });

  test('issued letters must not carry revocation fields', async () => {
    const letter = await OfficialLetter.issue({
      letterType: 'employment_certificate',
      subject: subject(),
      issuer: issuer(),
    });
    letter.revokeReason = 'leftover';
    await expect(letter.save()).rejects.toThrow(/revocation/);
  });

  test('subject snapshot is required and shaped', async () => {
    await expect(
      OfficialLetter.issue({
        letterType: 'employment_certificate',
        subject: { kind: 'employee' }, // missing refId + nameAr
        issuer: issuer(),
      })
    ).rejects.toThrow();
  });
});
