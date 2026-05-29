'use strict';

/**
 * digital-assessment-behavioral-wave557.test.js — W557 behavioral.
 *
 * Exercises digitalAssessmentService against a real MongoMemoryServer:
 *   • preview() scores without persisting
 *   • administer() persists a MeasureApplication with the W212-scored
 *     envelope (totalRawScore, interpretation, severity, item-level
 *     domainScores, version pinning, MCID snapshot, isAutoScored)
 *   • multi-domain instruments (PedsQL) persist per-domain subscales
 *   • a second administration computes comparison vs baseline
 *   • unknown measure → 404; out-of-range items → 400
 *
 * Pairs with the static route drift guard (W559).
 */

jest.unmock('mongoose');
jest.setTimeout(30000);

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let Measure;
let MeasureApplication;
let svc;
const { MEASURES } = require('../measures/catalog/flagship-measures.catalog');

const ASSESSOR = new mongoose.Types.ObjectId();

function mchatWorst() {
  // every item at-risk → score 20
  return Array.from({ length: 20 }, (_, i) => ([2, 5, 12].includes(i + 1) ? 1 : 0));
}
function mchatTypical() {
  return Array.from({ length: 20 }, (_, i) => ([2, 5, 12].includes(i + 1) ? 0 : 1));
}

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w557-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  // getMeasureHistory populates assessorId → User; register a minimal stub
  // (the real app always has User registered).
  if (!mongoose.models.User) {
    mongoose.model(
      'User',
      new mongoose.Schema({ name: String, firstName: String, lastName: String })
    );
  }
  if (!mongoose.models.Beneficiary) {
    mongoose.model(
      'Beneficiary',
      new mongoose.Schema({ name: String, fileNumber: String, personalInfo: Object })
    );
  }
  ({ Measure } = require('../domains/goals/models/Measure'));
  ({ MeasureApplication } = require('../domains/goals/models/MeasureApplication'));
  ({ digitalAssessmentService: svc } = require('../services/digitalAssessment.service'));
  await Measure.init();
  await MeasureApplication.init();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await Measure.deleteMany({});
  await MeasureApplication.deleteMany({});
  // Seed the flagship catalog measures.
  for (const def of MEASURES) {
    await Measure.create(def);
  }
});

describe('W557 — preview (no persist)', () => {
  test('returns a scored envelope and writes nothing', async () => {
    const scored = await svc.preview({ measureCode: 'M-CHAT-R', rawItems: mchatWorst() });
    expect(scored.derived.value).toBe(20);
    expect(scored.interpretation.band).toBe('high_risk');
    expect(await MeasureApplication.countDocuments({})).toBe(0);
  });
});

describe('W557 — administer M-CHAT-R', () => {
  test('persists a MeasureApplication with the auto-scored envelope', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const { application, scoring } = await svc.administer({
      beneficiaryId,
      measureCode: 'M-CHAT-R',
      rawItems: mchatWorst(),
      assessorId: ASSESSOR,
    });
    expect(scoring.derived.value).toBe(20);
    expect(application.totalRawScore).toBe(20);
    expect(application.overallSeverity).toBe('severe');
    expect(application.isAutoScored).toBe(true);
    expect(application.scoredWithAlgorithmVersion).toBe('1.0.0');
    expect(application.purpose).toBe('baseline');
    expect(application.isBaseline).toBe(true);
    // single-domain instrument → one 'total' domain carrying all 20 items
    expect(application.domainScores).toHaveLength(1);
    expect(application.domainScores[0].itemScores).toHaveLength(20);
    expect(application.status).toBe('completed');
  });

  test('second administration computes comparison vs baseline (improvement)', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await svc.administer({
      beneficiaryId,
      measureCode: 'M-CHAT-R',
      rawItems: mchatWorst(),
      assessorId: ASSESSOR,
    });
    const { application } = await svc.administer({
      beneficiaryId,
      measureCode: 'M-CHAT-R',
      rawItems: mchatTypical(),
      assessorId: ASSESSOR,
    });
    expect(application.applicationNumber).toBe(2);
    expect(application.purpose).toBe('progress');
    expect(application.totalRawScore).toBe(0);
    expect(application.comparison.baselineScore).toBe(20);
    expect(application.comparison.changeFromBaseline).toBe(-20);
    // lower_better → going 20→0 is improving
    expect(application.comparison.trend).toBe('improving');
  });
});

describe('W557 — administer PedsQL (multi-domain)', () => {
  test('persists per-domain subscales + MCID snapshot', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const allZero = Array(23).fill(0); // no problems → total 100
    const { application, scoring } = await svc.administer({
      beneficiaryId,
      measureCode: 'PEDSQL',
      rawItems: allZero,
      assessorId: ASSESSOR,
    });
    expect(scoring.derived.value).toBe(100);
    expect(application.totalRawScore).toBe(100);
    const keys = application.domainScores.map(d => d.domainKey).sort();
    expect(keys).toEqual(['emotional', 'physical', 'school', 'social']);
    const physical = application.domainScores.find(d => d.domainKey === 'physical');
    expect(physical.rawScore).toBe(100);
    expect(physical.itemScores).toHaveLength(8);
    // MCID frozen at administration time (provisional, 4.4)
    expect(application.mcidAtAdministration.value).toBe(4.4);
  });
});

describe('W558 — administration report', () => {
  async function administerOne() {
    const Beneficiary = mongoose.model('Beneficiary');
    const ben = await Beneficiary.create({ name: 'طفل تجريبي', fileNumber: 'F-001' });
    const { application } = await svc.administer({
      beneficiaryId: ben._id,
      measureCode: 'M-CHAT-R',
      rawItems: mchatWorst(),
      assessorId: ASSESSOR,
    });
    return application;
  }

  test('clinical report carries item-level detail + version pinning', async () => {
    const app = await administerOne();
    const r = await svc.buildReport(app._id, { audience: 'clinical' });
    expect(r.audience).toBe('clinical');
    expect(r.measure.code).toBe('M-CHAT-R');
    expect(r.score.value).toBe(20);
    expect(r.items).toHaveLength(20);
    expect(r.items.every(i => typeof i.text_ar === 'string')).toBe(true);
    expect(r.items.some(i => i.atRisk)).toBe(true);
    expect(r.versionPinned.algorithmVersion).toBe('1.0.0');
    // current band flagged
    expect(r.bands.find(b => b.isCurrent).severity).toBe('severe');
  });

  test('family report hides item detail + gives plain-language action', async () => {
    const app = await administerOne();
    const r = await svc.buildReport(app._id, { audience: 'family' });
    expect(r.audience).toBe('family');
    expect(r.items).toBeUndefined();
    expect(typeof r.summary_ar).toBe('string');
    expect(typeof r.recommendation_ar).toBe('string');
    expect(r.recommendation_ar.length).toBeGreaterThan(0);
  });

  test('unknown application → 404', async () => {
    await expect(
      svc.buildReport(new mongoose.Types.ObjectId(), { audience: 'family' })
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('W557 — error paths', () => {
  test('unknown measure → 404', async () => {
    await expect(
      svc.administer({
        beneficiaryId: new mongoose.Types.ObjectId(),
        measureCode: 'NOPE',
        rawItems: [1],
        assessorId: ASSESSOR,
      })
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  test('out-of-range raw items → INVALID_RAW', async () => {
    await expect(
      svc.administer({
        beneficiaryId: new mongoose.Types.ObjectId(),
        measureCode: 'M-CHAT-R',
        rawItems: Array(20).fill(5),
        assessorId: ASSESSOR,
      })
    ).rejects.toThrow(/invalid raw items|INVALID_RAW/i);
  });
});
