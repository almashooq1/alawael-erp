'use strict';

/**
 * complaint-reasonable-adjustments-behavioral-wave465.test.js — behavioral
 * counterpart to the static drift guard `complaint-reasonable-adjustments-wave465.test.js`.
 *
 * W465 is an ADDITIVE extension to the pre-existing Complaint model — it adds:
 *   • reasonableAdjustments[] subdoc array (CRPD Art. 13 + 21 accessibility)
 *   • advocateInvolved + advocateUserId + advocateNotifiedAt (CRPD Art. 12)
 *   • originVoiceLogId ref → BeneficiaryVoiceLog (W460 linkage)
 *   • beneficiaryId ref → Beneficiary
 *   • Wave-18 invariant: beneficiary-related complaints (beneficiaryId set OR
 *     source in {student, parent}) cannot close/resolve without advocateInvolved=true
 *
 * The static drift guard checks source text for the additive fields + the
 * pre-save hook regex. The behavioral test verifies the runtime invariant
 * actually fires (the W385/W408 lesson: regex catches presence, not behavior).
 *
 * Per CLAUDE.md doctrine "Pair every static drift guard with a behavioral
 * counterpart" — 17× application across W356-W465.
 *
 * Run: cd backend && npx jest --config=jest.config.js __tests__/complaint-reasonable-adjustments-behavioral-wave465.test.js --runInBand
 */

jest.unmock('mongoose');
jest.setTimeout(30000);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let Complaint;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w465-behavioral-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  require('../config/mongoose.plugins'); // Mongoose-9 legacy-hook shim
  Complaint = require('../models/Complaint');
  await Complaint.init();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await Complaint.deleteMany({});
});

// ─── Fixtures ─────────────────────────────────────────────────────────

const oid = () => new mongoose.Types.ObjectId();

function baseComplaint(overrides = {}) {
  return {
    type: 'complaint',
    source: 'employee',
    subject: 'Pay slip not delivered',
    description: 'Three months without printed pay slip — verbal request ignored',
    ...overrides,
  };
}

// ─── 1. Additive fields populate + persist ────────────────────────────

describe('W465 behavioral — additive fields persist correctly', () => {
  it('saves with empty reasonableAdjustments[] by default', async () => {
    const doc = await Complaint.create(baseComplaint());
    expect(Array.isArray(doc.reasonableAdjustments)).toBe(true);
    expect(doc.reasonableAdjustments).toHaveLength(0);
  });

  it('saves reasonableAdjustments[] with type + description + grantedBy + grantedAt', async () => {
    const granterId = oid();
    const doc = await Complaint.create(
      baseComplaint({
        source: 'student',
        beneficiaryId: oid(),
        advocateInvolved: true,
        advocateUserId: oid(),
        reasonableAdjustments: [
          {
            type: 'aac_supported',
            description: 'Beneficiary used picture board to articulate complaint',
            grantedBy: granterId,
          },
          {
            type: 'sign_language',
            description: 'Sign-language interpreter present during all sessions',
            grantedBy: granterId,
          },
        ],
      })
    );
    expect(doc.reasonableAdjustments).toHaveLength(2);
    expect(doc.reasonableAdjustments[0].type).toBe('aac_supported');
    expect(doc.reasonableAdjustments[0].grantedAt).toBeInstanceOf(Date);
    expect(doc.reasonableAdjustments[0].grantedBy.toString()).toBe(granterId.toString());
  });

  it('advocateInvolved defaults to false', async () => {
    const doc = await Complaint.create(baseComplaint());
    expect(doc.advocateInvolved).toBe(false);
  });

  it('persists advocate linkage when provided', async () => {
    const advId = oid();
    const notifiedAt = new Date('2026-05-26T10:00:00Z');
    const doc = await Complaint.create(
      baseComplaint({
        advocateInvolved: true,
        advocateUserId: advId,
        advocateNotifiedAt: notifiedAt,
      })
    );
    expect(doc.advocateUserId.toString()).toBe(advId.toString());
    expect(doc.advocateNotifiedAt.toISOString()).toBe(notifiedAt.toISOString());
  });

  it('persists W460 voice-log + beneficiary linkages', async () => {
    const voiceId = oid();
    const benId = oid();
    const doc = await Complaint.create(
      baseComplaint({
        source: 'parent',
        originVoiceLogId: voiceId,
        beneficiaryId: benId,
        advocateInvolved: true,
        advocateUserId: oid(),
      })
    );
    expect(doc.originVoiceLogId.toString()).toBe(voiceId.toString());
    expect(doc.beneficiaryId.toString()).toBe(benId.toString());
  });
});

// ─── 2. Wave-18: beneficiary complaint closure requires advocate ──────

describe('W465 behavioral — closure-without-advocate invariant (CRPD Art. 12)', () => {
  it('SAVES new beneficiary complaint without advocate (only enforced on close)', async () => {
    const doc = await Complaint.create(
      baseComplaint({ source: 'student', beneficiaryId: oid(), status: 'new' })
    );
    expect(doc.status).toBe('new');
    expect(doc.advocateInvolved).toBe(false);
  });

  it('SAVES under_review beneficiary complaint without advocate', async () => {
    const doc = await Complaint.create(
      baseComplaint({
        source: 'student',
        beneficiaryId: oid(),
        status: 'under_review',
      })
    );
    expect(doc.status).toBe('under_review');
  });

  it('REJECTS resolve of beneficiaryId-bearing complaint without advocate', async () => {
    const p = new Complaint(
      baseComplaint({
        beneficiaryId: oid(),
        status: 'resolved',
      })
    );
    await expect(p.save()).rejects.toThrow(/CRPD Article 12.*W464/);
  });

  it('REJECTS close of source=student complaint without advocate', async () => {
    const p = new Complaint(
      baseComplaint({
        source: 'student',
        status: 'closed',
      })
    );
    await expect(p.save()).rejects.toThrow(/CRPD Article 12.*W464/);
  });

  it('REJECTS close of source=parent complaint without advocate', async () => {
    const p = new Complaint(
      baseComplaint({
        source: 'parent',
        status: 'closed',
      })
    );
    await expect(p.save()).rejects.toThrow(/CRPD Article 12.*W464/);
  });

  it('SAVES resolve of source=student complaint WITH advocate', async () => {
    const doc = await Complaint.create(
      baseComplaint({
        source: 'student',
        beneficiaryId: oid(),
        status: 'resolved',
        advocateInvolved: true,
        advocateUserId: oid(),
      })
    );
    expect(doc.status).toBe('resolved');
  });

  it('does NOT enforce advocate on source=employee complaint at closure (not beneficiary-related)', async () => {
    const doc = await Complaint.create(
      baseComplaint({
        source: 'employee',
        status: 'closed',
      })
    );
    expect(doc.status).toBe('closed');
    expect(doc.advocateInvolved).toBe(false);
  });

  it('does NOT enforce advocate on source=customer complaint at closure', async () => {
    const doc = await Complaint.create(
      baseComplaint({
        source: 'customer',
        status: 'resolved',
      })
    );
    expect(doc.status).toBe('resolved');
  });

  it('lifecycle: new → resolved transition catches advocate at the resolve step', async () => {
    // 1. Open without advocate — OK
    const doc = await Complaint.create(
      baseComplaint({ source: 'parent', beneficiaryId: oid(), status: 'new' })
    );

    // 2. Try to resolve without advocate — REJECTED
    doc.status = 'resolved';
    await expect(doc.save()).rejects.toThrow(/CRPD Article 12/);

    // 3. Add advocate then resolve — OK
    doc.advocateInvolved = true;
    doc.advocateUserId = oid();
    doc.advocateNotifiedAt = new Date();
    await doc.save();
    expect(doc.status).toBe('resolved');
  });
});

// ─── 3. New index ─────────────────────────────────────────────────────

describe('W465 behavioral — index advocateInvolved+status declared', () => {
  it('declares the new compound index for advocate-tracking queries', async () => {
    const indexes = await Complaint.collection.indexes();
    const keys = indexes.map(i => Object.keys(i.key).join('+'));
    expect(keys).toContain('advocateInvolved+status');
  });
});
