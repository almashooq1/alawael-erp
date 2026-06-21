/**
 * rehab-model-suite.test.js — behavioral coverage for frequently-used
 * rehab and clinical-assessment sub-models that previously had no tests.
 *
 * Uses MongoMemoryServer for real mongoose persistence. Mirrors the
 * W673 trio pattern so the suite stays consistent with existing
 * integration-style model tests.
 */

'use strict';

jest.unmock('mongoose');
jest.setTimeout(60000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let MChat;
let Portage;
let SensoryProfile;
let PostRehabCase;
let RehabilitationProgram;

const OID = () => new mongoose.Types.ObjectId();

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  MChat = require('../models/clinical-assessment/mchat-assessment.model');
  Portage = require('../models/clinical-assessment/portage-assessment.model');
  SensoryProfile = require('../models/clinical-assessment/sensory-profile-assessment.model');
  PostRehabCase = require('../models/post-rehab/PostRehabCase.model');
  RehabilitationProgram = require('../models/rehab-program/RehabilitationProgram.model');
}, 60000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
}, 60000);

beforeEach(async () => {
  for (const M of [MChat, Portage, SensoryProfile, PostRehabCase, RehabilitationProgram]) {
    if (M && M.collection) await M.collection.deleteMany({});
  }
}, 20000);

function mchatItems() {
  return Array.from({ length: 20 }, (_, i) => ({
    item_number: i + 1,
    question_ar: `سؤال ${i + 1}`,
    response: false,
    is_critical: [2, 5, 9, 12, 15, 17, 18].includes(i + 1),
  }));
}

// ════════════════════════════════════════════════════════════════════════
// M-CHAT-R/F
// ════════════════════════════════════════════════════════════════════════
describe('MChatAssessment model', () => {
  const base = () => ({
    beneficiary: OID(),
    assessor: OID(),
    age_months: 24,
    items: mchatItems(),
  });

  it('persists a minimal valid draft', async () => {
    const doc = await MChat.create(base());
    expect(doc._id).toBeDefined();
    expect(doc.status).toBe('draft');
  });

  it('rejects age outside 16-30 months', async () => {
    await expect(MChat.create({ ...base(), age_months: 12 })).rejects.toThrow(/age_months/);
    await expect(MChat.create({ ...base(), age_months: 31 })).rejects.toThrow(/age_months/);
  });

  it('rejects wrong item count', async () => {
    await expect(MChat.create({ ...base(), items: mchatItems().slice(0, 10) })).rejects.toThrow(
      /20/
    );
  });

  it('computes risk_level from total_risk_score on save', async () => {
    const doc = await MChat.create({
      ...base(),
      total_risk_score: 9,
      critical_items_failed: 3,
    });
    expect(doc.risk_level).toBe('high');
    expect(doc.risk_level_ar).toBe('مرتفع');
  });

  it('risk_summary virtual includes score and critical count', async () => {
    const doc = await MChat.create({
      ...base(),
      total_risk_score: 5,
      critical_items_failed: 2,
    });
    expect(doc.risk_summary).toMatch(/متوسط/);
    expect(doc.risk_summary).toMatch(/5\/20/);
  });
});

// ════════════════════════════════════════════════════════════════════════
// Portage
// ════════════════════════════════════════════════════════════════════════
describe('PortageAssessment model', () => {
  const base = () => ({
    beneficiary: OID(),
    assessor: OID(),
    age_months: 36,
    items: [
      {
        domain: 'motor',
        age_range: '3-4',
        item_number: 1,
        skill_ar: 'يقفز على قدم واحدة',
        achieved: true,
      },
    ],
  });

  it('persists a minimal valid draft', async () => {
    const doc = await Portage.create(base());
    expect(doc._id).toBeDefined();
    expect(doc.status).toBe('draft');
  });

  it('rejects invalid domain enum', async () => {
    await expect(
      Portage.create({
        ...base(),
        items: [{ domain: 'telepathy', age_range: '3-4', item_number: 1, skill_ar: 'x' }],
      })
    ).rejects.toThrow(/domain/);
  });

  it('accepts all valid developmental domains', async () => {
    const domains = [
      'infant_stimulation',
      'socialization',
      'language',
      'self_help',
      'cognitive',
      'motor',
    ];
    const items = domains.map((d, i) => ({
      domain: d,
      age_range: '3-4',
      item_number: i + 1,
      skill_ar: `مهارة ${d}`,
    }));
    const doc = await Portage.create({ ...base(), items });
    expect(doc.items).toHaveLength(6);
  });

  it('rejects invalid delay severity enum', async () => {
    await expect(
      Portage.create({
        ...base(),
        developmental_analysis: { delay_severity: 'extreme' },
      })
    ).rejects.toThrow(/delay_severity/);
  });
});

// ════════════════════════════════════════════════════════════════════════
// Sensory Profile
// ════════════════════════════════════════════════════════════════════════
describe('SensoryProfileAssessment model', () => {
  const base = () => ({
    beneficiary: OID(),
    assessor: OID(),
    age_months: 60,
    items: [
      {
        item_number: 1,
        section: 'auditory',
        question_ar: 'هل يستجيب للأصوات المفاجئة؟',
        frequency: 3,
      },
    ],
  });

  it('persists a minimal valid draft', async () => {
    const doc = await SensoryProfile.create(base());
    expect(doc._id).toBeDefined();
    expect(doc.status).toBe('draft');
  });

  it('rejects invalid sensory section', async () => {
    await expect(
      SensoryProfile.create({
        ...base(),
        items: [{ item_number: 1, section: 'extrasensory', question_ar: 'x', frequency: 3 }],
      })
    ).rejects.toThrow(/section/);
  });

  it('rejects frequency outside 1-5', async () => {
    await expect(
      SensoryProfile.create({
        ...base(),
        items: [{ item_number: 1, section: 'auditory', question_ar: 'x', frequency: 7 }],
      })
    ).rejects.toThrow(/frequency/);
  });

  it('rejects age outside 36-168 months', async () => {
    await expect(SensoryProfile.create({ ...base(), age_months: 24 })).rejects.toThrow(
      /age_months/
    );
  });
});

// ════════════════════════════════════════════════════════════════════════
// Post-Rehab Case
// ════════════════════════════════════════════════════════════════════════
describe('PostRehabCase model', () => {
  const base = () => ({
    beneficiary: OID(),
    dischargeDate: new Date(),
    followUpPlan: { nextScheduledVisit: new Date(Date.now() + 7 * 86400000) },
  });

  it('persists a minimal valid active case', async () => {
    const doc = await PostRehabCase.create(base());
    expect(doc._id).toBeDefined();
    expect(doc.status).toBe('ACTIVE');
  });

  it('rejects missing dischargeDate', async () => {
    const { dischargeDate, ...rest } = base();
    await expect(PostRehabCase.create(rest)).rejects.toThrow(/dischargeDate/);
  });

  it('rejects invalid status enum', async () => {
    await expect(PostRehabCase.create({ ...base(), status: 'PENDING' })).rejects.toThrow(/status/);
  });

  it('accepts contact attempts with valid enums', async () => {
    const doc = await PostRehabCase.create({
      ...base(),
      contactAttempts: [{ method: 'PHONE', outcome: 'REACHED', notes: 'تم التواصل' }],
    });
    expect(doc.contactAttempts).toHaveLength(1);
  });

  it('rejects invalid contact method', async () => {
    await expect(
      PostRehabCase.create({
        ...base(),
        contactAttempts: [{ method: 'FAX', outcome: 'REACHED' }],
      })
    ).rejects.toThrow(/method/);
  });
});

// ════════════════════════════════════════════════════════════════════════
// Rehabilitation Program
// ════════════════════════════════════════════════════════════════════════
describe('RehabilitationProgram model', () => {
  const base = () => ({
    code: 'PROG-TEST-001',
    nameAr: 'برنامج اختبار',
    nameEn: 'Test Program',
    categoryId: OID(),
  });

  it('persists a minimal valid program', async () => {
    const doc = await RehabilitationProgram.create(base());
    expect(doc._id).toBeDefined();
    expect(doc.code).toBe('PROG-TEST-001');
  });

  it('rejects missing code', async () => {
    const { code, ...rest } = base();
    await expect(RehabilitationProgram.create(rest)).rejects.toThrow(/code/);
  });

  it('rejects invalid target disability', async () => {
    await expect(
      RehabilitationProgram.create({ ...base(), targetDisabilities: ['UNKNOWN'] })
    ).rejects.toThrow(/targetDisabilities/);
  });

  it('enforces unique code', async () => {
    await RehabilitationProgram.create(base());
    await expect(RehabilitationProgram.create(base())).rejects.toThrow(/duplicate|E11000/i);
  });
});
