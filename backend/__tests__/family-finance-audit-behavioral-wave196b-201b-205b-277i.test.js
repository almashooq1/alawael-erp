'use strict';

/**
 * Behavioral counterpart for the family/finance/audit quartet:
 *   • BeneficiarySubsidyEntry  (Wave 205b) — monthly subsidies
 *   • FamilyVisitRequest       (Wave 201b) — supervised parent visits
 *   • PickupAuthorization      (Wave 196b) — alternate-pickup permissions
 *   • IncidentAuditChain       (Wave 277i) — hash-chained audit ledger
 *
 * Pairing doctrine: static drift guards catch source-text shape but
 * not runtime behavior. These exercise every Wave-18 `__invariants`
 * branch end-to-end against MongoMemoryServer.
 */

jest.unmock('mongoose');
jest.setTimeout(45000);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let Subsidy;
let Visit;
let Pickup;
let AuditChain;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({
      instance: { dbName: 'w196b-201b-205b-277i-family-fin-audit' },
    });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  require('../config/mongoose.plugins');
  Subsidy = require('../models/BeneficiarySubsidyEntry');
  Visit = require('../models/FamilyVisitRequest');
  Pickup = require('../models/PickupAuthorization');
  AuditChain = require('../models/IncidentAuditChain');
  await Subsidy.init().catch(() => null);
  await Visit.init().catch(() => null);
  await Pickup.init().catch(() => null);
  await AuditChain.init().catch(() => null);
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await Subsidy.deleteMany({});
  await Visit.deleteMany({});
  await Pickup.deleteMany({});
  await AuditChain.deleteMany({});
});

const oid = () => new mongoose.Types.ObjectId();

// ════════════════════════════════════════════════════════════════════
//  BeneficiarySubsidyEntry (W205b)
// ════════════════════════════════════════════════════════════════════

describe('BeneficiarySubsidyEntry — Wave-18 invariants', () => {
  const baseSubsidy = (overrides = {}) => ({
    beneficiaryId: oid(),
    year: 2026,
    month: 5,
    subsidyType: 'social_security',
    amountSAR: 2000,
    status: 'expected',
    ...overrides,
  });

  it('rejects rows without beneficiaryId', async () => {
    const s = new Subsidy(baseSubsidy({ beneficiaryId: undefined }));
    await expect(s.save()).rejects.toThrow(/beneficiaryId/);
  });

  it('rejects year < 2020', async () => {
    const s = new Subsidy(baseSubsidy({ year: 2019 }));
    await expect(s.save()).rejects.toThrow(/year/);
  });

  it('rejects year > 2050', async () => {
    const s = new Subsidy(baseSubsidy({ year: 2051 }));
    await expect(s.save()).rejects.toThrow(/year/);
  });

  it('rejects month outside [1,12]', async () => {
    const s = new Subsidy(baseSubsidy({ month: 13 }));
    await expect(s.save()).rejects.toThrow(/month/);
  });

  it('rejects subsidyType enum drift', async () => {
    const s = new Subsidy(baseSubsidy({ subsidyType: 'mystery_grant' }));
    await expect(s.save()).rejects.toThrow(/subsidyType/);
  });

  it('rejects status enum drift', async () => {
    const s = new Subsidy(baseSubsidy({ status: 'half-received' }));
    await expect(s.save()).rejects.toThrow(/status/);
  });

  it('rejects amountSAR < 0', async () => {
    const s = new Subsidy(baseSubsidy({ amountSAR: -100 }));
    await expect(s.save()).rejects.toThrow(/amountSAR/);
  });

  it('rejects status=received without receivedDate', async () => {
    const s = new Subsidy(baseSubsidy({ status: 'received' }));
    await expect(s.save()).rejects.toThrow(/receivedDate/);
  });

  it('accepts status=received with receivedDate', async () => {
    const s = new Subsidy(
      baseSubsidy({
        status: 'received',
        receivedDate: new Date(),
        receiptNumber: 'R-2026-001',
      })
    );
    await expect(s.save()).resolves.toBeDefined();
  });

  it('enforces compound unique on (beneficiaryId, year, month, subsidyType)', async () => {
    const ben = oid();
    await new Subsidy(
      baseSubsidy({ beneficiaryId: ben, year: 2026, month: 5, subsidyType: 'social_security' })
    ).save();
    const dup = new Subsidy(
      baseSubsidy({ beneficiaryId: ben, year: 2026, month: 5, subsidyType: 'social_security' })
    );
    await expect(dup.save()).rejects.toThrow();
  });

  it('accepts same beneficiary across different months', async () => {
    const ben = oid();
    await new Subsidy(baseSubsidy({ beneficiaryId: ben, month: 5 })).save();
    const next = new Subsidy(baseSubsidy({ beneficiaryId: ben, month: 6 }));
    await expect(next.save()).resolves.toBeDefined();
  });

  it('persists default status = expected', async () => {
    const s = await new Subsidy(baseSubsidy({ status: undefined })).save();
    expect(s.status).toBe('expected');
  });

  it('exposes TYPES + STATUSES module constants', () => {
    expect(Subsidy.TYPES).toContain('social_security');
    expect(Subsidy.TYPES).toContain('disability_allowance');
    expect(Subsidy.STATUSES).toContain('received');
    expect(Subsidy.STATUSES).toContain('overdue');
  });
});

// ════════════════════════════════════════════════════════════════════
//  FamilyVisitRequest (W201b)
// ════════════════════════════════════════════════════════════════════

describe('FamilyVisitRequest — Wave-18 invariants', () => {
  const baseVisit = (overrides = {}) => ({
    beneficiaryId: oid(),
    parentName: 'الأب أحمد العلي',
    parentNationalId: '1234567890',
    requestedDate: new Date('2026-06-15'),
    slot: 'morning',
    ...overrides,
  });

  it('rejects rows without beneficiaryId', async () => {
    const v = new Visit(baseVisit({ beneficiaryId: undefined }));
    await expect(v.save()).rejects.toThrow(/beneficiaryId/);
  });

  it('rejects rows without parentName', async () => {
    const v = new Visit(baseVisit({ parentName: undefined }));
    await expect(v.save()).rejects.toThrow(/parentName/);
  });

  it('rejects rows without parentNationalId', async () => {
    const v = new Visit(baseVisit({ parentNationalId: undefined }));
    await expect(v.save()).rejects.toThrow(/parentNationalId/);
  });

  it('rejects slot enum drift', async () => {
    const v = new Visit(baseVisit({ slot: 'evening' }));
    await expect(v.save()).rejects.toThrow(/slot/);
  });

  it('rejects status enum drift', async () => {
    const v = new Visit(baseVisit({ status: 'maybe-approved' }));
    await expect(v.save()).rejects.toThrow(/status/);
  });

  it('rejects status=approved without approvedByName', async () => {
    const v = new Visit(baseVisit({ status: 'approved', approvedAt: new Date() }));
    await expect(v.save()).rejects.toThrow(/approvedBy/);
  });

  it('rejects status=approved without approvedAt', async () => {
    const v = new Visit(baseVisit({ status: 'approved', approvedByName: 'المدير' }));
    await expect(v.save()).rejects.toThrow(/approvedBy/);
  });

  it('rejects status=declined without declineReason', async () => {
    const v = new Visit(baseVisit({ status: 'declined' }));
    await expect(v.save()).rejects.toThrow(/declineReason/);
  });

  it('rejects status=declined with whitespace-only declineReason', async () => {
    const v = new Visit(baseVisit({ status: 'declined', declineReason: '   ' }));
    await expect(v.save()).rejects.toThrow(/declineReason/);
  });

  it('accepts a fully-formed approved visit', async () => {
    const v = new Visit(
      baseVisit({
        relationship: 'father',
        parentPhone: '+966500000001',
        reasonOrPurpose: 'مشاهدة جلسة العلاج المهني',
        status: 'approved',
        approvedBy: oid(),
        approvedByName: 'المدير محمد',
        approvedAt: new Date(),
      })
    );
    await expect(v.save()).resolves.toBeDefined();
  });

  it('accepts a declined visit with reason', async () => {
    const v = new Visit(baseVisit({ status: 'declined', declineReason: 'تعارض مع جلسة فردية' }));
    await expect(v.save()).resolves.toBeDefined();
  });

  it('persists default status = requested + slot constants', async () => {
    const v = await new Visit(baseVisit({ status: undefined })).save();
    expect(v.status).toBe('requested');
  });

  it('exposes SLOTS + STATUSES module constants', () => {
    expect(Visit.SLOTS).toEqual(['morning', 'afternoon']);
    expect(Visit.STATUSES).toContain('approved');
    expect(Visit.STATUSES).toContain('no_show');
  });
});

// ════════════════════════════════════════════════════════════════════
//  PickupAuthorization (W196b)
// ════════════════════════════════════════════════════════════════════

describe('PickupAuthorization — Wave-18 invariants', () => {
  const basePickup = (overrides = {}) => ({
    beneficiaryId: oid(),
    pickupPersonName: 'العم سعيد',
    pickupPersonRelationship: 'uncle',
    pickupPersonNationalId: '1234567890',
    validFrom: new Date('2026-06-01'),
    validUntil: new Date('2026-06-30'),
    status: 'requested',
    ...overrides,
  });

  it('rejects rows without pickupPersonName', async () => {
    const p = new Pickup(basePickup({ pickupPersonName: undefined }));
    await expect(p.save()).rejects.toThrow(/pickupPersonName/);
  });

  it('rejects rows without pickupPersonRelationship', async () => {
    const p = new Pickup(basePickup({ pickupPersonRelationship: undefined }));
    await expect(p.save()).rejects.toThrow(/pickupPersonRelationship/);
  });

  it('rejects rows without pickupPersonNationalId', async () => {
    const p = new Pickup(basePickup({ pickupPersonNationalId: undefined }));
    await expect(p.save()).rejects.toThrow(/pickupPersonNationalId/);
  });

  it('rejects validFrom ≥ validUntil', async () => {
    const p = new Pickup(
      basePickup({
        validFrom: new Date('2026-06-30'),
        validUntil: new Date('2026-06-01'),
      })
    );
    await expect(p.save()).rejects.toThrow(/validUntil/);
  });

  it('rejects status enum drift', async () => {
    const p = new Pickup(basePickup({ status: 'half-signed' }));
    await expect(p.save()).rejects.toThrow(/status/);
  });

  it('rejects status=signed without signedByParentAt', async () => {
    const p = new Pickup(basePickup({ status: 'signed' }));
    await expect(p.save()).rejects.toThrow(/signedByParentAt/);
  });

  it('rejects status=used without signedByParentAt', async () => {
    const p = new Pickup(
      basePickup({
        status: 'used',
        usedAt: new Date(),
        usedByName: 'الموظف يوسف',
      })
    );
    await expect(p.save()).rejects.toThrow(/signedByParentAt/);
  });

  it('rejects status=used without usedAt', async () => {
    const p = new Pickup(
      basePickup({
        status: 'used',
        signedByParentAt: new Date(),
        usedByName: 'الموظف يوسف',
      })
    );
    await expect(p.save()).rejects.toThrow(/usedAt/);
  });

  it('rejects status=used without usedByName', async () => {
    const p = new Pickup(
      basePickup({
        status: 'used',
        signedByParentAt: new Date(),
        usedAt: new Date(),
      })
    );
    await expect(p.save()).rejects.toThrow(/usedByName/);
  });

  it('accepts a fully-formed signed authorization', async () => {
    const p = new Pickup(
      basePickup({
        status: 'signed',
        signedByParentAt: new Date(),
        signedByParentName: 'الأم سارة',
        pickupPersonPhone: '+966500000002',
      })
    );
    await expect(p.save()).resolves.toBeDefined();
  });

  it('accepts a fully-formed used authorization', async () => {
    const p = new Pickup(
      basePickup({
        status: 'used',
        signedByParentAt: new Date('2026-06-01'),
        signedByParentName: 'الأم سارة',
        usedAt: new Date('2026-06-15'),
        usedByName: 'الموظف يوسف',
        usedByRole: 'reception',
        nationalIdVerified: true,
      })
    );
    await expect(p.save()).resolves.toBeDefined();
  });

  it('persists default status = requested', async () => {
    const p = await new Pickup(basePickup({ status: undefined })).save();
    expect(p.status).toBe('requested');
  });

  it('exposes STATUSES module constant', () => {
    expect(Pickup.STATUSES).toContain('requested');
    expect(Pickup.STATUSES).toContain('signed');
    expect(Pickup.STATUSES).toContain('used');
    expect(Pickup.STATUSES).toContain('revoked');
  });
});

// ════════════════════════════════════════════════════════════════════
//  IncidentAuditChain (W277i)
// ════════════════════════════════════════════════════════════════════

describe('IncidentAuditChain — Wave-18 invariants', () => {
  let nextSeq = 1;
  const baseEntry = (overrides = {}) => ({
    sequence: nextSeq++,
    action: 'incident-created',
    actorId: oid(),
    subjectId: oid(),
    payload: { status: 'open', priority: 'high' },
    payloadHash: 'a'.repeat(64),
    prevHash: AuditChain.GENESIS_HASH,
    hash: 'b'.repeat(64) + nextSeq.toString().padStart(4, '0'),
    occurredAt: new Date(),
    ...overrides,
  });

  it('rejects rows without sequence', async () => {
    const e = new AuditChain(baseEntry({ sequence: undefined }));
    await expect(e.save()).rejects.toThrow(/sequence/);
  });

  it('rejects sequence < 0', async () => {
    const e = new AuditChain(baseEntry({ sequence: -1 }));
    await expect(e.save()).rejects.toThrow(/sequence/);
  });

  it('rejects action enum drift', async () => {
    const e = new AuditChain(baseEntry({ action: 'incident-vibe-check' }));
    await expect(e.save()).rejects.toThrow(/action/);
  });

  it('rejects rows without payloadHash', async () => {
    const e = new AuditChain(baseEntry({ payloadHash: undefined }));
    await expect(e.save()).rejects.toThrow(/payloadHash/);
  });

  it('rejects rows without prevHash', async () => {
    const e = new AuditChain(baseEntry({ prevHash: undefined }));
    await expect(e.save()).rejects.toThrow(/prevHash/);
  });

  it('rejects rows without hash', async () => {
    const e = new AuditChain(baseEntry({ hash: undefined }));
    await expect(e.save()).rejects.toThrow(/hash/);
  });

  it('rejects rows without payload', async () => {
    const e = new AuditChain(baseEntry({ payload: undefined }));
    await expect(e.save()).rejects.toThrow(/payload/);
  });

  it('enforces unique sequence', async () => {
    const seq = 1000 + nextSeq;
    await new AuditChain(baseEntry({ sequence: seq, hash: 'unique-1-' + seq })).save();
    const dup = new AuditChain(baseEntry({ sequence: seq, hash: 'unique-2-' + seq }));
    await expect(dup.save()).rejects.toThrow();
  });

  it('enforces unique hash', async () => {
    const hash = 'fixed-hash-' + Date.now();
    await new AuditChain(baseEntry({ hash })).save();
    const dup = new AuditChain(baseEntry({ hash }));
    await expect(dup.save()).rejects.toThrow();
  });

  it('accepts all 10 declared action types', async () => {
    for (const action of AuditChain.ACTIONS) {
      const e = new AuditChain(
        baseEntry({
          action,
          hash: `action-${action}-${nextSeq}`,
        })
      );
      await expect(e.save()).resolves.toBeDefined();
    }
  });

  it('accepts a fully-formed audit entry', async () => {
    const e = new AuditChain(
      baseEntry({
        action: 'incident-resolved',
        actorRole: 'incident_manager',
        branchId: oid(),
        payload: { from: 'in-progress', to: 'resolved', note: 'تم حل الحادث' },
        lastVerifiedAt: new Date(),
      })
    );
    await expect(e.save()).resolves.toBeDefined();
  });

  it('exposes ACTIONS + GENESIS_HASH module constants', () => {
    expect(AuditChain.ACTIONS).toContain('incident-created');
    expect(AuditChain.ACTIONS).toContain('incident-resolved');
    expect(AuditChain.ACTIONS).toContain('incident-archived');
    expect(AuditChain.GENESIS_HASH).toBe('0'.repeat(64));
    expect(AuditChain.GENESIS_HASH.length).toBe(64);
  });

  it('persists occurredAt default = now when omitted', async () => {
    const before = Date.now();
    const e = await new AuditChain({
      sequence: 9999,
      action: 'incident-created',
      payload: { test: true },
      payloadHash: 'p'.repeat(64),
      prevHash: AuditChain.GENESIS_HASH,
      hash: 'occurred-at-test-' + before,
    }).save();
    expect(e.occurredAt).toBeDefined();
    expect(e.occurredAt.getTime()).toBeGreaterThanOrEqual(before);
  });
});
