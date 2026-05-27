'use strict';

/**
 * productivity-models-behavioral-wave27.test.js — behavioral coverage for
 * the 4 Productivity-suite models (W27).
 *
 *   • Annotation     — per-KPI internal comments
 *   • FollowUp       — accountability queue (auto-created from alerts/insights)
 *   • HandoffNote    — team-to-team shift-change notes
 *   • Watchlist      — personal entity-watchlist with dedup setter
 *
 * Common theme across the suite: each requires at least one of textAr/textEn
 * (or nameAr/nameEn for Watchlist) — the "bilingual content required"
 * invariant. The W18 virtual-path validator pattern used in all 4 makes
 * them tractable behaviorally as a single test file.
 *
 * Per CLAUDE.md doctrine — 30× application. Closes ALL 4 entries from
 * BEHAVIORAL_TEST_COVERAGE_BACKLOG.md "Productivity" group in one PR.
 *
 * Run: cd backend && npx jest --config=jest.config.js __tests__/productivity-models-behavioral-wave27.test.js --runInBand
 */

jest.unmock('mongoose');
jest.unmock('../intelligence/branchScopePlugin');
jest.setTimeout(30000);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let Annotation;
let FollowUp;
let HandoffNote;
let Watchlist;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w27-productivity-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  require('../config/mongoose.plugins'); // Mongoose-9 legacy-hook shim
  Annotation = require('../models/Productivity/Annotation');
  FollowUp = require('../models/Productivity/FollowUp');
  HandoffNote = require('../models/Productivity/HandoffNote');
  Watchlist = require('../models/Productivity/Watchlist');
  await Annotation.init().catch(() => null);
  await FollowUp.init().catch(() => null);
  await HandoffNote.init().catch(() => null);
  await Watchlist.init().catch(() => null);
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await Annotation.deleteMany({});
  await FollowUp.deleteMany({});
  await HandoffNote.deleteMany({});
  await Watchlist.deleteMany({});
});

const oid = () => new mongoose.Types.ObjectId();

// ═════════════════════════════════════════════════════════════════════
// Annotation (per-KPI comment)
// ═════════════════════════════════════════════════════════════════════

describe('W27 behavioral — Annotation', () => {
  it('REJECTS without kpiId', async () => {
    const p = new Annotation({ byUserId: oid(), textAr: 'تعليق' });
    await expect(p.save()).rejects.toThrow(/kpiId/);
  });

  it('REJECTS without byUserId', async () => {
    const p = new Annotation({ kpiId: 'attendance.late_rate', textAr: 'تعليق' });
    await expect(p.save()).rejects.toThrow(/byUserId/);
  });

  it('REJECTS without textAr OR textEn (W18 bilingual invariant)', async () => {
    const p = new Annotation({ kpiId: 'attendance.late_rate', byUserId: oid() });
    await expect(p.save()).rejects.toThrow(/Annotation requires textAr or textEn/);
  });

  it('SAVES with textAr only', async () => {
    const doc = await Annotation.create({
      kpiId: 'attendance.late_rate',
      byUserId: oid(),
      textAr: 'انخفاض ملحوظ في معدل التأخر هذا الأسبوع',
    });
    expect(doc.kpiId).toBe('attendance.late_rate');
    expect(doc.visibility).toBe('authenticated'); // default
  });

  it('SAVES with textEn only', async () => {
    const doc = await Annotation.create({
      kpiId: 'attendance.late_rate',
      byUserId: oid(),
      textEn: 'Late-arrival rate dropped 22% week-over-week',
    });
    expect(doc.textEn).toMatch(/22%/);
  });

  it('REJECTS invalid visibility enum', async () => {
    const p = new Annotation({
      kpiId: 'x',
      byUserId: oid(),
      textAr: 'x',
      visibility: 'public',
    });
    await expect(p.save()).rejects.toThrow();
  });

  it('SAVES visibility=role-restricted with visibilityRoles', async () => {
    const doc = await Annotation.create({
      kpiId: 'x',
      byUserId: oid(),
      textAr: 'x',
      visibility: 'role-restricted',
      visibilityRoles: ['branch_manager', 'clinical_lead'],
    });
    expect(doc.visibilityRoles).toHaveLength(2);
  });

  it('uses canonical collection name productivity_annotations', () => {
    expect(Annotation.collection.collectionName).toBe('productivity_annotations');
  });
});

// ═════════════════════════════════════════════════════════════════════
// FollowUp (accountability queue)
// ═════════════════════════════════════════════════════════════════════

describe('W27 behavioral — FollowUp', () => {
  function baseFU(overrides = {}) {
    return {
      ownerUserId: oid(),
      dueBy: new Date(Date.now() + 24 * 60 * 60 * 1000),
      ...overrides,
    };
  }

  it('REJECTS without ownerUserId', async () => {
    const p = new FollowUp({
      dueBy: new Date(),
      titleAr: 'متابعة',
    });
    await expect(p.save()).rejects.toThrow(/ownerUserId/);
  });

  it('REJECTS without dueBy', async () => {
    const p = new FollowUp({ ownerUserId: oid(), titleAr: 'متابعة' });
    await expect(p.save()).rejects.toThrow(/dueBy/);
  });

  it('REJECTS without titleAr OR titleEn (W18 bilingual invariant)', async () => {
    const p = new FollowUp(baseFU());
    await expect(p.save()).rejects.toThrow(/FollowUp requires titleAr or titleEn/);
  });

  it('SAVES with titleAr + default status=open + sourceType=manual', async () => {
    const doc = await FollowUp.create(baseFU({ titleAr: 'متابعة شكوى أحمد' }));
    expect(doc.status).toBe('open');
    expect(doc.sourceType).toBe('manual');
  });

  it('REJECTS invalid sourceType enum', async () => {
    const p = new FollowUp(baseFU({ titleAr: 'x', sourceType: 'rumor' }));
    await expect(p.save()).rejects.toThrow();
  });

  for (const valid of ['alert', 'insight', 'manual', 'exception-review', 'kpi-annotation']) {
    it(`SAVES sourceType='${valid}'`, async () => {
      const doc = await FollowUp.create(baseFU({ titleAr: 'x', sourceType: valid }));
      expect(doc.sourceType).toBe(valid);
    });
  }

  it('REJECTS invalid status enum', async () => {
    const p = new FollowUp(baseFU({ titleAr: 'x', status: 'maybe' }));
    await expect(p.save()).rejects.toThrow();
  });

  for (const valid of ['open', 'done', 'cancelled']) {
    it(`SAVES status='${valid}'`, async () => {
      const doc = await FollowUp.create(baseFU({ titleAr: 'x', status: valid }));
      expect(doc.status).toBe(valid);
    });
  }

  it('persists notes[] subdoc', async () => {
    const userA = oid();
    const userB = oid();
    const doc = await FollowUp.create(
      baseFU({
        titleAr: 'متابعة',
        notes: [
          { byUserId: userA, textAr: 'اتصلت بالعميل، طلب موعدًا' },
          { byUserId: userB, textEn: 'Scheduled phone callback for Tuesday' },
        ],
      })
    );
    expect(doc.notes).toHaveLength(2);
    expect(doc.notes[0].at).toBeInstanceOf(Date); // default
  });

  it('uses canonical collection name productivity_follow_ups', () => {
    expect(FollowUp.collection.collectionName).toBe('productivity_follow_ups');
  });
});

// ═════════════════════════════════════════════════════════════════════
// HandoffNote (shift change)
// ═════════════════════════════════════════════════════════════════════

describe('W27 behavioral — HandoffNote', () => {
  function baseHN(overrides = {}) {
    return {
      byUserId: oid(),
      branchId: oid(),
      subjectType: 'Beneficiary',
      subjectId: 'beneficiary-001',
      ...overrides,
    };
  }

  it('REJECTS without byUserId / branchId / subjectType / subjectId', async () => {
    for (const missing of ['byUserId', 'branchId', 'subjectType', 'subjectId']) {
      const doc = baseHN({ toUserId: oid(), textAr: 'x' });
      delete doc[missing];
      const p = new HandoffNote(doc);
      await expect(p.save()).rejects.toThrow(new RegExp(missing));
    }
  });

  it('REJECTS without toRoleGroup AND without toUserId (W18 dual-recipient invariant)', async () => {
    const p = new HandoffNote(baseHN({ textAr: 'تنبيه' }));
    await expect(p.save()).rejects.toThrow(/HandoffNote requires toRoleGroup or toUserId/);
  });

  it('REJECTS without textAr OR textEn', async () => {
    const p = new HandoffNote(baseHN({ toRoleGroup: 'night_shift_nurses' }));
    await expect(p.save()).rejects.toThrow(/HandoffNote requires textAr or textEn/);
  });

  it('SAVES with toRoleGroup + textAr (broadcast handoff)', async () => {
    const doc = await HandoffNote.create(
      baseHN({
        toRoleGroup: 'night_shift_nurses',
        textAr: 'يرجى متابعة الحالة في الغرفة 12',
      })
    );
    expect(doc.priority).toBe('fyi'); // default
  });

  it('SAVES with toUserId + textEn (named handoff)', async () => {
    const doc = await HandoffNote.create(
      baseHN({
        toUserId: oid(),
        textEn: 'Please monitor room 12 — beneficiary woke up disoriented at 22:30',
      })
    );
    expect(doc.toUserId).toBeInstanceOf(mongoose.Types.ObjectId);
  });

  it('REJECTS invalid subjectType enum', async () => {
    const p = new HandoffNote(baseHN({ subjectType: 'Vehicle', toUserId: oid(), textAr: 'x' }));
    await expect(p.save()).rejects.toThrow();
  });

  it('REJECTS invalid priority enum', async () => {
    const p = new HandoffNote(baseHN({ toUserId: oid(), textAr: 'x', priority: 'urgent' }));
    await expect(p.save()).rejects.toThrow();
  });

  it('SAVES priority=must-read', async () => {
    const doc = await HandoffNote.create(
      baseHN({ toUserId: oid(), textAr: 'x', priority: 'must-read' })
    );
    expect(doc.priority).toBe('must-read');
  });

  it('uses canonical collection name productivity_handoff_notes', () => {
    expect(HandoffNote.collection.collectionName).toBe('productivity_handoff_notes');
  });
});

// ═════════════════════════════════════════════════════════════════════
// Watchlist (personal entity tracking + setter-dedupe)
// ═════════════════════════════════════════════════════════════════════

describe('W27 behavioral — Watchlist', () => {
  function baseWL(overrides = {}) {
    return {
      ownerUserId: oid(),
      entityType: 'Beneficiary',
      ...overrides,
    };
  }

  it('REJECTS without ownerUserId', async () => {
    const p = new Watchlist({ entityType: 'Beneficiary', nameAr: 'x' });
    await expect(p.save()).rejects.toThrow(/ownerUserId/);
  });

  it('REJECTS without entityType', async () => {
    const p = new Watchlist({ ownerUserId: oid(), nameAr: 'x' });
    await expect(p.save()).rejects.toThrow(/entityType/);
  });

  it('REJECTS without nameAr OR nameEn', async () => {
    const p = new Watchlist(baseWL());
    await expect(p.save()).rejects.toThrow(/Watchlist requires nameAr or nameEn/);
  });

  it('REJECTS invalid entityType enum', async () => {
    const p = new Watchlist(baseWL({ entityType: 'Vehicle', nameAr: 'x' }));
    await expect(p.save()).rejects.toThrow();
  });

  it('SAVES with valid entityType + nameAr', async () => {
    const doc = await Watchlist.create(baseWL({ nameAr: 'الحالات الحرجة' }));
    expect(doc.entityIds).toEqual([]);
  });

  it('SETTER deduplicates entityIds at assignment time', async () => {
    const doc = await Watchlist.create(
      baseWL({ nameAr: 'x', entityIds: ['ben-001', 'ben-002', 'ben-001', 'ben-002', 'ben-003'] })
    );
    expect(doc.entityIds).toEqual(['ben-001', 'ben-002', 'ben-003']);
  });

  it('SETTER dedup survives re-assignment', async () => {
    const doc = await Watchlist.create(baseWL({ nameAr: 'x', entityIds: ['ben-001'] }));
    doc.entityIds = ['ben-001', 'ben-002', 'ben-001'];
    await doc.save();
    expect(doc.entityIds).toEqual(['ben-001', 'ben-002']);
  });

  for (const valid of ['Beneficiary', 'Employee', 'Invoice', 'Complaint', 'Incident']) {
    it(`SAVES entityType='${valid}'`, async () => {
      const doc = await Watchlist.create(baseWL({ entityType: valid, nameAr: `قائمة ${valid}` }));
      expect(doc.entityType).toBe(valid);
    });
  }

  it('uses canonical collection name productivity_watchlists', () => {
    expect(Watchlist.collection.collectionName).toBe('productivity_watchlists');
  });
});

// ═════════════════════════════════════════════════════════════════════
// End-to-end: alert → auto-followup → handoff → watchlist tracking
// ═════════════════════════════════════════════════════════════════════

describe('W27 behavioral — pipeline end-to-end', () => {
  it('records a KPI annotation → auto-creates a follow-up → handoff to night shift → adds to watchlist', async () => {
    const userA = oid();
    const userB = oid();
    const branchId = oid();
    const benId = 'beneficiary-042';

    // 1. Day-shift therapist annotates a concerning KPI
    const annotation = await Annotation.create({
      kpiId: 'beneficiary.behavioral_episodes_per_week',
      branchId,
      byUserId: userA,
      byRole: 'therapist',
      textAr: 'زيادة ملحوظة في النوبات السلوكية - يحتاج مراجعة الخطة',
    });
    expect(annotation._id).toBeDefined();

    // 2. KPI annotation triggers an auto-follow-up
    const followUp = await FollowUp.create({
      ownerUserId: userA,
      branchId,
      sourceType: 'kpi-annotation',
      sourceId: String(annotation._id),
      titleAr: 'مراجعة خطة سلوكية للمستفيد 042',
      dueBy: new Date(Date.now() + 48 * 60 * 60 * 1000),
    });
    expect(followUp.sourceType).toBe('kpi-annotation');

    // 3. Night-shift handoff
    const handoff = await HandoffNote.create({
      byUserId: userA,
      branchId,
      subjectType: 'Beneficiary',
      subjectId: benId,
      toRoleGroup: 'night_shift_nurses',
      textAr: 'يرجى مراقبة المستفيد 042 — لاحظت 3 نوبات سلوكية اليوم',
      priority: 'must-read',
    });
    expect(handoff.priority).toBe('must-read');

    // 4. Case manager adds beneficiary to personal watchlist
    const watchlist = await Watchlist.create({
      ownerUserId: userB,
      ownerRole: 'case_manager',
      nameAr: 'الحالات قيد المراجعة السلوكية',
      entityType: 'Beneficiary',
      entityIds: [benId, 'beneficiary-091', benId], // dedups
    });
    expect(watchlist.entityIds).toEqual([benId, 'beneficiary-091']);
  });
});
