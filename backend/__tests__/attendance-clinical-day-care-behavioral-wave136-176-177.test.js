'use strict';

/**
 * Behavioral counterpart for the clinical / day-care attendance trio:
 *   • ClinicalAttendanceDiscrepancy  (Wave 136) — therapist sign-in vs session
 *   • MorningHealthCheck             (Wave 177) — arrival safety gate
 *   • DailyCommunicationLog          (Wave 176) — parent-facing daily report
 *
 * Pairing doctrine: static drift guards catch source-text shape but
 * not runtime behavior. These exercise every Wave-18 `__invariants`
 * branch end-to-end against MongoMemoryServer.
 *
 * Closes the attendance behavioral series 24/24.
 */

jest.unmock('mongoose');
jest.setTimeout(45000);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let Discrepancy;
let HealthCheck;
let CommLog;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({
      instance: { dbName: 'w136-176-177-clinical-daycare' },
    });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  require('../config/mongoose.plugins');
  Discrepancy = require('../models/ClinicalAttendanceDiscrepancy');
  HealthCheck = require('../models/MorningHealthCheck');
  CommLog = require('../models/DailyCommunicationLog');
  await Discrepancy.init().catch(() => null);
  await HealthCheck.init().catch(() => null);
  await CommLog.init().catch(() => null);
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await Discrepancy.deleteMany({});
  await HealthCheck.deleteMany({});
  await CommLog.deleteMany({});
});

const oid = () => new mongoose.Types.ObjectId();

// ════════════════════════════════════════════════════════════════════
//  ClinicalAttendanceDiscrepancy (W136)
// ════════════════════════════════════════════════════════════════════

describe('ClinicalAttendanceDiscrepancy — Wave-18 invariants', () => {
  let counter = 0;
  const baseDisc = (overrides = {}) => ({
    kind: 'ghost-presence',
    severity: 'high',
    employeeId: oid(),
    sessionDate: new Date('2026-05-27T00:00:00.000Z'),
    dedupKey: `ghost-presence|emp|2026-05-27|${++counter}`,
    summaryAr: 'الموظف سجل حضوره ولم تكتمل أي جلسة معه اليوم',
    status: 'open',
    detectedAt: new Date(),
    ...overrides,
  });

  it('rejects kind enum drift', async () => {
    const d = new Discrepancy(baseDisc({ kind: 'parallel-universe' }));
    await expect(d.save()).rejects.toThrow(/kind/);
  });

  it('rejects severity enum drift', async () => {
    const d = new Discrepancy(baseDisc({ severity: 'catastrophic' }));
    await expect(d.save()).rejects.toThrow(/severity/);
  });

  it('rejects status enum drift', async () => {
    const d = new Discrepancy(baseDisc({ status: 'half-dismissed' }));
    await expect(d.save()).rejects.toThrow(/status/);
  });

  it('rejects status=resolved without resolution.actorId', async () => {
    const d = new Discrepancy(baseDisc({ status: 'resolved' }));
    await expect(d.save()).rejects.toThrow(/resolution.actorId/);
  });

  it('rejects status=dismissed without resolution.actorId', async () => {
    const d = new Discrepancy(baseDisc({ status: 'dismissed' }));
    await expect(d.save()).rejects.toThrow(/resolution.actorId/);
  });

  it('accepts status=resolved with full resolution', async () => {
    const d = new Discrepancy(
      baseDisc({
        status: 'resolved',
        resolution: {
          actorId: oid(),
          actorRole: 'clinical_director',
          decidedAt: new Date(),
          note: 'تأكدت من السجل - تم تصحيح الجلسة لاحقاً',
        },
      })
    );
    await expect(d.save()).resolves.toBeDefined();
  });

  it('accepts status=acknowledged without resolver', async () => {
    const d = new Discrepancy(baseDisc({ status: 'acknowledged' }));
    await expect(d.save()).resolves.toBeDefined();
  });

  it('rejects rows without employeeId', async () => {
    const d = new Discrepancy(baseDisc({ employeeId: undefined }));
    await expect(d.save()).rejects.toThrow(/employeeId/);
  });

  it('rejects rows without sessionDate', async () => {
    const d = new Discrepancy(baseDisc({ sessionDate: undefined }));
    await expect(d.save()).rejects.toThrow(/sessionDate/);
  });

  it('rejects rows without summaryAr', async () => {
    const d = new Discrepancy(baseDisc({ summaryAr: undefined }));
    await expect(d.save()).rejects.toThrow(/summaryAr/);
  });

  it('enforces unique dedupKey', async () => {
    const key = 'dedup-unique-' + Date.now();
    await new Discrepancy(baseDisc({ dedupKey: key })).save();
    const dup = new Discrepancy(baseDisc({ dedupKey: key }));
    await expect(dup.save()).rejects.toThrow();
  });

  it('accepts all 4 kinds + 4 severities', async () => {
    const kinds = ['ghost-presence', 'phantom-session', 'late-for-session', 'shift-mismatch'];
    const sevs = ['low', 'medium', 'high', 'critical'];
    for (let i = 0; i < 4; i++) {
      const d = new Discrepancy(
        baseDisc({
          kind: kinds[i],
          severity: sevs[i],
          dedupKey: `kind-sev-${kinds[i]}-${sevs[i]}-${Date.now()}-${i}`,
        })
      );
      await expect(d.save()).resolves.toBeDefined();
    }
  });

  it('persists default status = open', async () => {
    const d = await new Discrepancy(
      baseDisc({ status: undefined, dedupKey: 'default-status-' + Date.now() })
    ).save();
    expect(d.status).toBe('open');
  });

  it('exposes KINDS / SEVERITIES / STATUSES module constants', () => {
    expect(Discrepancy.KINDS).toContain('ghost-presence');
    expect(Discrepancy.KINDS).toContain('phantom-session');
    expect(Discrepancy.SEVERITIES).toEqual(['low', 'medium', 'high', 'critical']);
    expect(Discrepancy.STATUSES).toContain('open');
    expect(Discrepancy.STATUSES).toContain('resolved');
  });
});

// ════════════════════════════════════════════════════════════════════
//  MorningHealthCheck (W177)
// ════════════════════════════════════════════════════════════════════

describe('MorningHealthCheck — Wave-18 invariants', () => {
  const baseCheck = (overrides = {}) => ({
    beneficiaryId: oid(),
    date: new Date('2026-05-27T00:00:00.000Z'),
    decision: 'allow',
    ...overrides,
  });

  it('rejects rows without beneficiaryId', async () => {
    const c = new HealthCheck(baseCheck({ beneficiaryId: undefined }));
    await expect(c.save()).rejects.toThrow(/beneficiaryId/);
  });

  it('rejects rows without date', async () => {
    const c = new HealthCheck(baseCheck({ date: undefined }));
    await expect(c.save()).rejects.toThrow(/date/);
  });

  it('rejects decision enum drift', async () => {
    const c = new HealthCheck(baseCheck({ decision: 'maybe' }));
    await expect(c.save()).rejects.toThrow(/decision/);
  });

  it('rejects temperatureC < 30', async () => {
    const c = new HealthCheck(baseCheck({ temperatureC: 29 }));
    await expect(c.save()).rejects.toThrow(/temperatureC/);
  });

  it('rejects temperatureC > 45', async () => {
    const c = new HealthCheck(baseCheck({ temperatureC: 46 }));
    await expect(c.save()).rejects.toThrow(/temperatureC/);
  });

  it('rejects mood enum drift', async () => {
    const c = new HealthCheck(baseCheck({ mood: 'thunderous' }));
    await expect(c.save()).rejects.toThrow(/mood/);
  });

  it('rejects decision=send_home without reason', async () => {
    const c = new HealthCheck(baseCheck({ decision: 'send_home', reason: '' }));
    await expect(c.save()).rejects.toThrow(/reason/);
  });

  it('rejects decision=send_home with whitespace-only reason', async () => {
    const c = new HealthCheck(baseCheck({ decision: 'send_home', reason: '   ' }));
    await expect(c.save()).rejects.toThrow(/reason/);
  });

  it('accepts decision=send_home with non-empty reason', async () => {
    const c = new HealthCheck(
      baseCheck({
        decision: 'send_home',
        reason: 'حرارة عالية - 39.2°C',
        temperatureC: 39.2,
        symptoms: { vomiting: false, cough: true, fatigue: true },
        nurseId: oid(),
        nurseName: 'الممرضة سارة',
      })
    );
    await expect(c.save()).resolves.toBeDefined();
  });

  it('accepts decision=observe without a reason', async () => {
    const c = new HealthCheck(baseCheck({ decision: 'observe' }));
    await expect(c.save()).resolves.toBeDefined();
  });

  it('enforces compound unique on (beneficiaryId, date)', async () => {
    const ben = oid();
    const date = new Date('2026-05-27T00:00:00.000Z');
    await new HealthCheck(baseCheck({ beneficiaryId: ben, date })).save();
    const dup = new HealthCheck(baseCheck({ beneficiaryId: ben, date }));
    await expect(dup.save()).rejects.toThrow();
  });

  it('persists defaults: decision=allow, mood=normal, parentNotified=false', async () => {
    const c = await new HealthCheck({
      beneficiaryId: oid(),
      date: new Date('2026-05-27'),
    }).save();
    expect(c.decision).toBe('allow');
    expect(c.mood).toBe('normal');
    expect(c.parentNotified).toBe(false);
  });

  it('exposes DECISIONS module constant', () => {
    expect(HealthCheck.DECISIONS).toEqual(['allow', 'observe', 'send_home']);
  });
});

// ════════════════════════════════════════════════════════════════════
//  DailyCommunicationLog (W176)
// ════════════════════════════════════════════════════════════════════

describe('DailyCommunicationLog — Wave-18 invariants', () => {
  const baseLog = (overrides = {}) => ({
    beneficiaryId: oid(),
    date: new Date('2026-05-27T00:00:00.000Z'),
    mood: 'neutral',
    engagement: 'medium',
    ...overrides,
  });

  it('rejects rows without beneficiaryId', async () => {
    const l = new CommLog(baseLog({ beneficiaryId: undefined }));
    await expect(l.save()).rejects.toThrow(/beneficiaryId/);
  });

  it('rejects rows without date', async () => {
    const l = new CommLog(baseLog({ date: undefined }));
    await expect(l.save()).rejects.toThrow(/date/);
  });

  it('rejects mood enum drift', async () => {
    const l = new CommLog(baseLog({ mood: 'transcendent' }));
    await expect(l.save()).rejects.toThrow(/mood/);
  });

  it('rejects engagement enum drift', async () => {
    const l = new CommLog(baseLog({ engagement: 'astronomical' }));
    await expect(l.save()).rejects.toThrow(/engagement/);
  });

  it('rejects status enum drift', async () => {
    const l = new CommLog(baseLog({ status: 'half-published' }));
    await expect(l.save()).rejects.toThrow(/status/);
  });

  it('rejects parentSeen=true without parentSeenAt', async () => {
    const l = new CommLog(baseLog({ parentSeen: true }));
    await expect(l.save()).rejects.toThrow(/parentSeenAt/);
  });

  it('rejects parentSeenAt set with parentSeen=false', async () => {
    const l = new CommLog(baseLog({ parentSeen: false, parentSeenAt: new Date() }));
    await expect(l.save()).rejects.toThrow(/parentSeen/);
  });

  it('accepts parentSeen=true with parentSeenAt', async () => {
    const l = new CommLog(
      baseLog({
        parentSeen: true,
        parentSeenAt: new Date(),
        parentResponse: 'شكراً، رؤيتها كانت قيمة جداً',
        parentRespondedAt: new Date(),
      })
    );
    await expect(l.save()).resolves.toBeDefined();
  });

  it('rejects meal participation > 100', async () => {
    const l = new CommLog(baseLog({ meals: { lunch: 150 } }));
    await expect(l.save()).rejects.toThrow(/lunch/);
  });

  it('rejects meal participation < 0', async () => {
    const l = new CommLog(baseLog({ meals: { breakfast: -10 } }));
    await expect(l.save()).rejects.toThrow(/breakfast/);
  });

  it('accepts a fully-formed daily log', async () => {
    const l = new CommLog(
      baseLog({
        sectionId: oid(),
        branchId: oid(),
        authorId: oid(),
        authorName: 'المعالج أحمد',
        mood: 'happy',
        moodNote: 'كان في مزاج رائع طوال اليوم',
        achievements: ['عد إلى 10', 'استخدم الجملة الكاملة لطلب الماء'],
        activities: ['موسيقى', 'لعبة جماعية', 'فن'],
        behavior: { calm: true, social: true },
        behaviorNote: 'شارك في اللعب الجماعي',
        meals: { breakfast: 80, snack: 100, lunch: 70 },
        engagement: 'high',
        homeRecommendations: 'كرر العد إلى 10 معه قبل النوم',
        photos: ['s3://comm/2026-05-27/photo1.jpg'],
        status: 'published',
      })
    );
    await expect(l.save()).resolves.toBeDefined();
  });

  it('enforces compound unique on (beneficiaryId, date)', async () => {
    const ben = oid();
    const date = new Date('2026-05-27T00:00:00.000Z');
    await new CommLog(baseLog({ beneficiaryId: ben, date })).save();
    const dup = new CommLog(baseLog({ beneficiaryId: ben, date }));
    await expect(dup.save()).rejects.toThrow();
  });

  it('persists defaults: mood=neutral, engagement=medium, status=published', async () => {
    const l = await new CommLog({
      beneficiaryId: oid(),
      date: new Date('2026-05-27'),
    }).save();
    expect(l.mood).toBe('neutral');
    expect(l.engagement).toBe('medium');
    expect(l.status).toBe('published');
    expect(l.parentSeen).toBe(false);
  });

  it('exposes MOODS + ENGAGEMENTS module constants', () => {
    expect(CommLog.MOODS).toContain('happy');
    expect(CommLog.MOODS).toContain('sad');
    expect(CommLog.ENGAGEMENTS).toEqual(['high', 'medium', 'low']);
  });
});
