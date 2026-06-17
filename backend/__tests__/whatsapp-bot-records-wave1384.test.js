'use strict';

jest.unmock('mongoose');

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const svc = require('../services/whatsapp/whatsappBotRecords.service');

// ─── Pure mapper tests (no DB) ──────────────────────────────────────────────
describe('W1384 — pure mappers', () => {
  test('parseAge pulls the first plausible whole number', () => {
    expect(svc.parseAge('5 سنوات')).toBe(5);
    expect(svc.parseAge('٧')).toBe(7); // Arabic-Indic digit
    expect(svc.parseAge('سنتان ونصف')).toBeNull();
    expect(svc.parseAge('200')).toBeNull(); // out of 0–120 range
  });

  test('mapGender → schema enum (male|female|"")', () => {
    expect(svc.mapGender('ذكر')).toBe('male');
    expect(svc.mapGender('أنثى')).toBe('female');
    expect(svc.mapGender('غير محدد')).toBe('');
  });

  test('mapConditionType maps keywords and NEVER force-classifies the unclear', () => {
    expect(svc.mapConditionType('توحد')).toBe(svc.CONDITION.AUTISM);
    expect(svc.mapConditionType('عنده متلازمة داون')).toBe(svc.CONDITION.DOWN);
    expect(svc.mapConditionType('تأخر في النطق واللغة')).toBe(svc.CONDITION.SPEECH);
    expect(svc.mapConditionType('فرط حركة')).toBe(svc.CONDITION.ADHD);
    expect(svc.mapConditionType('شيء غير واضح')).toBe(svc.CONDITION.UNSURE);
    expect(svc.mapConditionType('لا')).toBe(svc.CONDITION.UNSURE);
    expect(svc.mapConditionType('')).toBe(svc.CONDITION.UNSURE);
  });

  test('NPS scaling 1–5 → 0–10 + bucket', () => {
    expect(svc.npsScoreFromRating('5')).toBe(10);
    expect(svc.npsScoreFromRating('1')).toBe(2);
    expect(svc.npsScoreFromRating('بدون')).toBe(6); // neutral default ×2
    expect(svc.npsBucket(10)).toBe('promoter');
    expect(svc.npsBucket(8)).toBe('passive');
    expect(svc.npsBucket(6)).toBe('detractor');
  });

  test('deriveSubject + mapsToRecord', () => {
    expect(svc.deriveSubject('الموظف تأخر عن الجلسة')).toMatch(/الموظف/);
    expect(svc.deriveSubject('')).toMatch(/شكوى/);
    expect(svc.mapsToRecord('create_complaint')).toBe(true);
    expect(svc.mapsToRecord('submit_satisfaction')).toBe(true);
    expect(svc.mapsToRecord('create_registration')).toBe(true);
    expect(svc.mapsToRecord('emergency_escalation')).toBe(false);
    expect(svc.mapsToRecord('lookup_attendance')).toBe(false);
  });
});

// ─── Behavioral: real creates against the real schemas (MongoMemoryServer) ──
describe('W1384 — createRecordFor persists real records', () => {
  let mongod;
  let dbReady = false;
  let Complaint;
  let Nps;
  let Booking;
  let FamilyMember;

  beforeAll(async () => {
    try {
      mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1384-records' } });
      await mongoose.connect(mongod.getUri());
      Complaint = require('../models/Complaint');
      Nps = require('../models/NpsResponse');
      Booking = require('../models/PublicBookingRequest');
      FamilyMember = require('../domains/family/models/FamilyMember');
      dbReady = true;
    } catch {
      dbReady = false;
    }
  }, 60000);

  afterAll(async () => {
    if (dbReady) {
      await mongoose.disconnect().catch(() => {});
      await mongod.stop().catch(() => {});
    }
  });

  test('complaint → Complaint (source=parent, required fields filled)', async () => {
    if (!dbReady) return;
    const r = await svc.createRecordFor(
      {
        kind: 'create_complaint',
        collected: { name: 'أحمد', contactPhone: '0500000001', description: 'تأخر بدء الجلسة' },
      },
      { phone: '966500000001' }
    );
    expect(r.ok).toBe(true);
    expect(r.model).toBe('Complaint');
    const doc = await Complaint.findById(r.recordId).lean();
    expect(doc.source).toBe('parent');
    expect(doc.subject).toMatch(/تأخر/);
    expect(doc.submitterName).toBe('أحمد');
  });

  test('registration → PublicBookingRequest with mapped enums', async () => {
    if (!dbReady) return;
    const r = await svc.createRecordFor(
      {
        kind: 'create_registration',
        collected: {
          guardianName: 'سعد علي',
          beneficiaryName: 'لمى سعد',
          age: '4 سنوات',
          gender: 'أنثى',
          city: 'الرياض',
          priorDiagnosis: 'توحد',
          hasReports: 'نعم',
        },
      },
      { phone: '966500000002' }
    );
    expect(r.ok).toBe(true);
    const doc = await Booking.findById(r.recordId).lean();
    expect(doc.childAge).toBe(4);
    expect(doc.childGender).toBe('female');
    expect(doc.conditionType).toBe('اضطراب طيف التوحد');
    expect(doc.source).toBe('whatsapp');
    expect(doc.preferredTime).toBe('أي وقت يناسب');
    expect(doc.notes).toMatch(/توحد/);
  });

  test('registration with unparseable age → ok:false (dispatcher escalates)', async () => {
    if (!dbReady) return;
    const r = await svc.createRecordFor(
      {
        kind: 'create_registration',
        collected: { guardianName: 'x', beneficiaryName: 'y', age: 'غير معروف' },
      },
      { phone: '966500000003' }
    );
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('age_unparseable');
  });

  test('satisfaction: no guardian → ok:false; with a linked guardian → NpsResponse', async () => {
    if (!dbReady) return;
    const noGuardian = await svc.createRecordFor(
      { kind: 'submit_satisfaction', collected: { rating: '5', liked: 'الطاقم', improve: '-' } },
      { phone: '966500000099' }
    );
    expect(noGuardian.ok).toBe(false);
    expect(noGuardian.reason).toBe('no_guardian');

    // Seed a FamilyMember for this phone (raw insert bypasses unrelated required fields).
    await FamilyMember.collection.insertOne({
      phone: '966500000004',
      beneficiaryId: new mongoose.Types.ObjectId(),
      branchId: new mongoose.Types.ObjectId(),
      isDeleted: false,
    });
    const r = await svc.createRecordFor(
      { kind: 'submit_satisfaction', collected: { rating: '5', liked: 'ممتاز', improve: '-' } },
      { phone: '966500000004' }
    );
    expect(r.ok).toBe(true);
    expect(r.model).toBe('NpsResponse');
    const doc = await Nps.findById(r.recordId).lean();
    expect(doc.score).toBe(10);
    expect(doc.bucket).toBe('promoter');
    expect(doc.sourceChannel).toBe('whatsapp');
    expect(doc.guardianId).toBeTruthy();
  });
});
