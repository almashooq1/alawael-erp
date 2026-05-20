'use strict';

/**
 * measure-selection-strategist-wave218.test.js — Wave 218.
 *
 * Verifies the Clinical Measure Selection Strategist:
 *
 *   Pure rules (no DB):
 *     - filterCandidate hard-exclusions (age, ICD-10, status, cooldown,
 *       respondent, certification, prerequisite, time budget, purpose,
 *       discharge continuity)
 *     - scoreCandidate positive signals (domain primary/secondary,
 *       discipline toolkit, Arabic validated, longitudinal continuity,
 *       MCID, time-fits, low-sensitivity, baseline gold-standard)
 *     - scoreCandidate negative signal (RECENT_NO_MCID_CHANGE)
 *
 *   Service.recommend() (with real DB):
 *     - Returns ranked recommendations
 *     - Excludes ineligible measures with reason codes
 *     - Honours cooldown via historyByMeasureId
 *     - Discharge requires continuity with baseline code
 *     - noViableMeasure flag when everything filtered
 *     - toolkitFor() returns per-discipline codes
 */

jest.unmock('mongoose');
jest.setTimeout(30000);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const { MongoMemoryServer } = require('mongodb-memory-server');
let mongod;
let Measure;
let MeasureApplication;
let strategist;
let rules;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w218-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  ({ Measure } = require('../domains/goals/models/Measure'));
  ({ MeasureApplication } = require('../domains/goals/models/MeasureApplication'));
  strategist = require('../services/measureSelectionStrategist.service');
  rules = require('../measures/selection/rules');
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
});

// ─── Synthetic measure factory ─────────────────────────────────────────

function makeMeasureLike(overrides = {}) {
  return {
    _id: overrides._id || new mongoose.Types.ObjectId(),
    code: overrides.code || 'BERG',
    name: overrides.name || 'Berg Balance Scale',
    category: overrides.category || 'motor',
    status: overrides.status || 'active',
    purpose: overrides.purpose || 'outcome',
    administrationTime: overrides.administrationTime ?? 20,
    administeredBy: overrides.administeredBy || ['physical_therapist'],
    ageRange: overrides.ageRange || { min: 5, max: 95, unit: 'years' },
    eligibility: overrides.eligibility || {},
    reassessment: overrides.reassessment || { minIntervalDays: 30, standardIntervalDays: 90 },
    interpretation: overrides.interpretation || {
      mcid: { value: 4, type: 'absolute', status: 'established', source: 'Donoghue 2009' },
    },
    targetPopulation: overrides.targetPopulation || ['all'],
    sensitivityLevel: overrides.sensitivityLevel || 'MEDIUM',
    ...overrides,
  };
}

function ctxLike(overrides = {}) {
  return {
    beneficiary: { ageMonths: 60, icd10: ['G80.1'] },
    discipline: 'physical_therapist',
    clinicalQuestion: 'progress',
    domain: 'motor',
    availableMinutes: 60,
    respondents: ['clinician'],
    raterCertifications: [],
    administeredMeasureCodes: [],
    historyByMeasureId: new Map(),
    now: new Date('2026-05-20T10:00:00Z'),
    ...overrides,
  };
}

// ════════════════════════════════════════════════════════════════════════
// 1. filterCandidate — pure
// ════════════════════════════════════════════════════════════════════════

describe('W218 — filterCandidate hard exclusions', () => {
  test('eligible when nothing fails', () => {
    const r = rules.filterCandidate(makeMeasureLike(), ctxLike());
    expect(r.eligible).toBe(true);
    expect(r.reasonCodes).toEqual([]);
  });

  test('OUT_OF_AGE_RANGE when ageMonths below range', () => {
    const m = makeMeasureLike({ ageRange: { min: 18, max: 65, unit: 'years' } });
    const ctx = ctxLike({ beneficiary: { ageMonths: 36, icd10: [] } }); // 3yo
    const r = rules.filterCandidate(m, ctx);
    expect(r.eligible).toBe(false);
    expect(r.reasonCodes).toContain(rules.REASON_CODES.OUT_OF_AGE_RANGE);
  });

  test('OUT_OF_AGE_RANGE with months-unit measure', () => {
    const m = makeMeasureLike({ ageRange: { min: 16, max: 30, unit: 'months' } });
    const r1 = rules.filterCandidate(m, ctxLike({ beneficiary: { ageMonths: 24 } }));
    expect(r1.eligible).toBe(true);
    const r2 = rules.filterCandidate(m, ctxLike({ beneficiary: { ageMonths: 48 } }));
    expect(r2.reasonCodes).toContain(rules.REASON_CODES.OUT_OF_AGE_RANGE);
  });

  test('OUT_OF_AGE_RANGE when age unknown', () => {
    const m = makeMeasureLike();
    const r = rules.filterCandidate(m, ctxLike({ beneficiary: { icd10: [] } }));
    expect(r.eligible).toBe(false);
    expect(r.reasonCodes).toContain(rules.REASON_CODES.OUT_OF_AGE_RANGE);
  });

  test('DIAGNOSIS_NOT_INDICATED when icd10Required miss', () => {
    const m = makeMeasureLike({ eligibility: { icd10Required: ['F84.*'] } });
    const r = rules.filterCandidate(m, ctxLike()); // ben has G80.1
    expect(r.reasonCodes).toContain(rules.REASON_CODES.DIAGNOSIS_NOT_INDICATED);
  });

  test('ICD-10 wildcard matches', () => {
    const m = makeMeasureLike({ eligibility: { icd10Required: ['G80.*'] } });
    const r = rules.filterCandidate(m, ctxLike()); // G80.1 matches G80.*
    expect(r.eligible).toBe(true);
  });

  test('DIAGNOSIS_EXCLUDED', () => {
    const m = makeMeasureLike({ eligibility: { icd10Excluded: ['G80.1'] } });
    const r = rules.filterCandidate(m, ctxLike());
    expect(r.reasonCodes).toContain(rules.REASON_CODES.DIAGNOSIS_EXCLUDED);
  });

  test('MEASURE_NOT_PUBLISHED for non-active', () => {
    const m = makeMeasureLike({ status: 'deprecated' });
    const r = rules.filterCandidate(m, ctxLike());
    expect(r.reasonCodes).toContain(rules.REASON_CODES.MEASURE_NOT_PUBLISHED);
  });

  test('COOLDOWN_NOT_ELAPSED when prior admin too recent', () => {
    const m = makeMeasureLike({ reassessment: { minIntervalDays: 30, standardIntervalDays: 90 } });
    const hist = new Map();
    hist.set(String(m._id), { lastDate: new Date('2026-05-15T10:00:00Z') }); // 5 days ago
    const ctx = ctxLike({ historyByMeasureId: hist });
    const r = rules.filterCandidate(m, ctx);
    expect(r.reasonCodes).toContain(rules.REASON_CODES.COOLDOWN_NOT_ELAPSED);
  });

  test('cooldown OK when prior admin past minInterval', () => {
    const m = makeMeasureLike({ reassessment: { minIntervalDays: 30 } });
    const hist = new Map();
    hist.set(String(m._id), { lastDate: new Date('2026-03-01T10:00:00Z') }); // ~80d ago
    const r = rules.filterCandidate(m, ctxLike({ historyByMeasureId: hist }));
    expect(r.eligible).toBe(true);
  });

  test('CERTIFICATION_MISSING', () => {
    const m = makeMeasureLike({ eligibility: { certificationRequired: 'GMFM-66-cert' } });
    const r = rules.filterCandidate(m, ctxLike()); // no certs
    expect(r.reasonCodes).toContain(rules.REASON_CODES.CERTIFICATION_MISSING);
  });

  test('PREREQUISITE_MISSING', () => {
    const m = makeMeasureLike({ eligibility: { prerequisiteMeasures: ['GMFCS'] } });
    const r = rules.filterCandidate(m, ctxLike({ administeredMeasureCodes: ['BERG'] }));
    expect(r.reasonCodes).toContain(rules.REASON_CODES.PREREQUISITE_MISSING);
    const r2 = rules.filterCandidate(m, ctxLike({ administeredMeasureCodes: ['GMFCS'] }));
    expect(r2.eligible).toBe(true);
  });

  test('TIME_BUDGET_EXCEEDED', () => {
    const m = makeMeasureLike({ administrationTime: 45 });
    const r = rules.filterCandidate(m, ctxLike({ availableMinutes: 20 }));
    expect(r.reasonCodes).toContain(rules.REASON_CODES.TIME_BUDGET_EXCEEDED);
  });

  test('PURPOSE_MISMATCH — outcome measure during screening question', () => {
    const m = makeMeasureLike({ purpose: 'outcome' });
    const r = rules.filterCandidate(m, ctxLike({ clinicalQuestion: 'screening' }));
    expect(r.reasonCodes).toContain(rules.REASON_CODES.PURPOSE_MISMATCH);
  });

  test('PURPOSE_MISMATCH — screener during baseline question', () => {
    const m = makeMeasureLike({ purpose: 'screening' });
    const r = rules.filterCandidate(m, ctxLike({ clinicalQuestion: 'baseline' }));
    expect(r.reasonCodes).toContain(rules.REASON_CODES.PURPOSE_MISMATCH);
  });

  test('DISCHARGE_REQUIRES_BASELINE_CONTINUITY', () => {
    const m = makeMeasureLike({ code: 'FIM' });
    const r = rules.filterCandidate(
      m,
      ctxLike({ clinicalQuestion: 'discharge', baselineMeasureCode: 'BERG' })
    );
    expect(r.reasonCodes).toContain(rules.REASON_CODES.DISCHARGE_REQUIRES_BASELINE_CONTINUITY);
    const r2 = rules.filterCandidate(
      makeMeasureLike({ code: 'BERG' }),
      ctxLike({ clinicalQuestion: 'discharge', baselineMeasureCode: 'BERG' })
    );
    expect(r2.eligible).toBe(true);
  });

  test('RESPONDENT_UNAVAILABLE for strict parent-report when no parent', () => {
    const m = makeMeasureLike({ administeredBy: ['parent_caregiver'] });
    const r = rules.filterCandidate(m, ctxLike({ respondents: ['clinician'] }));
    expect(r.reasonCodes).toContain(rules.REASON_CODES.RESPONDENT_UNAVAILABLE);
  });
});

// ════════════════════════════════════════════════════════════════════════
// 2. scoreCandidate — pure
// ════════════════════════════════════════════════════════════════════════

describe('W218 — scoreCandidate positive signals', () => {
  test('DOMAIN_PRIMARY_MATCH (+5)', () => {
    const m = makeMeasureLike({ category: 'motor' });
    const s = rules.scoreCandidate(m, ctxLike({ domain: 'motor' }));
    expect(s.score).toBeGreaterThanOrEqual(rules.WEIGHTS.DOMAIN_PRIMARY_MATCH);
    expect(s.reasonCodes).toContain(rules.REASON_CODES.DOMAIN_PRIMARY_MATCH);
  });

  test('DISCIPLINE_PRIMARY_TOOLKIT for known code', () => {
    const m = makeMeasureLike({ code: 'BERG' });
    const s = rules.scoreCandidate(m, ctxLike({ discipline: 'physical_therapist' }));
    expect(s.reasonCodes).toContain(rules.REASON_CODES.DISCIPLINE_PRIMARY_TOOLKIT);
  });

  test('LONGITUDINAL_CONTINUITY when baseline used same code', () => {
    const m = makeMeasureLike({ code: 'GMFM-66' });
    const s = rules.scoreCandidate(m, ctxLike({ baselineMeasureCode: 'GMFM-66' }));
    expect(s.reasonCodes).toContain(rules.REASON_CODES.LONGITUDINAL_CONTINUITY);
  });

  test('MCID_AVAILABLE when established or provisional', () => {
    const m = makeMeasureLike({
      interpretation: { mcid: { value: 4, status: 'established' } },
    });
    const s = rules.scoreCandidate(m, ctxLike());
    expect(s.reasonCodes).toContain(rules.REASON_CODES.MCID_AVAILABLE);
  });

  test('ARABIC_VALIDATED when languages include ar', () => {
    const m = makeMeasureLike({ eligibility: { languages: ['ar', 'en'] } });
    const s = rules.scoreCandidate(m, ctxLike());
    expect(s.reasonCodes).toContain(rules.REASON_CODES.ARABIC_VALIDATED);
  });

  test('BURDEN_FITS_TIME at <80% of available minutes', () => {
    const m = makeMeasureLike({ administrationTime: 10 });
    const s = rules.scoreCandidate(m, ctxLike({ availableMinutes: 60 }));
    expect(s.reasonCodes).toContain(rules.REASON_CODES.BURDEN_FITS_TIME);
  });

  test('LOW_SENSITIVITY_GRADE bonus', () => {
    const m = makeMeasureLike({ sensitivityLevel: 'LOW' });
    const s = rules.scoreCandidate(m, ctxLike());
    expect(s.reasonCodes).toContain(rules.REASON_CODES.LOW_SENSITIVITY_GRADE);
  });

  test('PHASE_BASELINE_GOLD_STANDARD for outcome measure during baseline', () => {
    const m = makeMeasureLike({ purpose: 'outcome' });
    const s = rules.scoreCandidate(m, ctxLike({ clinicalQuestion: 'baseline' }));
    expect(s.reasonCodes).toContain(rules.REASON_CODES.PHASE_BASELINE_GOLD_STANDARD);
  });

  test('all positive signals stack', () => {
    const m = makeMeasureLike({
      code: 'BERG',
      category: 'motor',
      purpose: 'outcome',
      sensitivityLevel: 'LOW',
      administrationTime: 15,
      eligibility: { languages: ['ar', 'en'] },
    });
    const s = rules.scoreCandidate(
      m,
      ctxLike({
        discipline: 'physical_therapist',
        domain: 'motor',
        clinicalQuestion: 'baseline',
        baselineMeasureCode: 'BERG',
        availableMinutes: 60,
      })
    );
    // 5 (domain primary) + 4 (toolkit) + 2 (arabic) + 3 (continuity)
    //   + 2 (mcid) + 1 (burden fits) + 1 (low sens) + 2 (baseline gold)
    expect(s.score).toBe(20);
  });
});

describe('W218 — scoreCandidate negative signal', () => {
  test('RECENT_NO_MCID_CHANGE penalises stale re-admin below MCID', () => {
    const m = makeMeasureLike({
      reassessment: { minIntervalDays: 30, standardIntervalDays: 90 },
      interpretation: { mcid: { value: 4, status: 'established', source: 'cite' } },
    });
    const hist = new Map();
    // 45 days ago — past minInterval (so cooldown clears), still under
    // standardInterval; prior delta 2 < MCID 4 → penalty.
    hist.set(String(m._id), {
      lastDate: new Date('2026-04-05T10:00:00Z'),
      lastTotalRawScore: 42,
      priorTotalRawScore: 40,
    });
    const sWith = rules.scoreCandidate(m, ctxLike({ historyByMeasureId: hist }));
    const sWithout = rules.scoreCandidate(m, ctxLike()); // no history
    expect(sWith.reasonCodes).toContain(rules.REASON_CODES.RECENT_NO_MCID_CHANGE);
    expect(sWith.score - sWithout.score).toBe(rules.WEIGHTS.RECENT_NO_MCID_CHANGE);
  });

  test('no penalty when change ≥ MCID', () => {
    const m = makeMeasureLike();
    const hist = new Map();
    hist.set(String(m._id), {
      lastDate: new Date('2026-04-05T10:00:00Z'),
      lastTotalRawScore: 50,
      priorTotalRawScore: 40, // delta 10 > MCID 4
    });
    const s = rules.scoreCandidate(m, ctxLike({ historyByMeasureId: hist }));
    expect(s.reasonCodes).not.toContain(rules.REASON_CODES.RECENT_NO_MCID_CHANGE);
  });
});

// ════════════════════════════════════════════════════════════════════════
// 3. Helpers
// ════════════════════════════════════════════════════════════════════════

describe('W218 — helpers', () => {
  test('_matchIcd exact + wildcard', () => {
    expect(rules._matchIcd('G80.1', 'G80.1')).toBe(true);
    expect(rules._matchIcd('G80.1', 'g80.1')).toBe(true);
    expect(rules._matchIcd('G80.1', 'G80.2')).toBe(false);
    expect(rules._matchIcd('G80.*', 'G80.4')).toBe(true);
    expect(rules._matchIcd('G80.*', 'F84.0')).toBe(false);
    expect(rules._matchIcd('', 'G80.1')).toBe(false);
  });

  test('_ageInMonths from various inputs', () => {
    expect(rules._ageInMonths({ ageMonths: 36 })).toBe(36);
    expect(rules._ageInMonths({ ageYears: 5 })).toBe(60);
    expect(rules._ageInMonths({})).toBeNull();
    expect(rules._ageInMonths(null)).toBeNull();
  });

  test('_isInToolkit case + hyphen insensitive', () => {
    expect(rules._isInToolkit('physical_therapist', 'BERG')).toBe(true);
    expect(rules._isInToolkit('physical_therapist', 'berg')).toBe(true);
    expect(rules._isInToolkit('physical_therapist', 'GMFM-66')).toBe(true);
    expect(rules._isInToolkit('physical_therapist', 'gmfm66')).toBe(true);
    expect(rules._isInToolkit('physical_therapist', 'SCQ')).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════════════
// 4. Service — recommend() against real DB
// ════════════════════════════════════════════════════════════════════════

async function seedBerg(overrides = {}) {
  return Measure.create({
    code: 'BERG',
    name: 'Berg Balance Scale',
    name_ar: 'مقياس بيرغ للتوازن',
    category: 'motor',
    version: '1.0.0',
    purpose: 'outcome',
    rawShape: 'items_array',
    derivedType: 'sum',
    interpretationStyle: 'tier',
    scoringAlgorithmRef: 'scoring/berg.js',
    scoringEngineVersion: '1.0.0',
    status: 'active',
    administrationTime: 20,
    administeredBy: ['physical_therapist'],
    ageRange: { min: 5, max: 95, unit: 'years' },
    reassessment: { minIntervalDays: 30, standardIntervalDays: 90 },
    interpretation: {
      mcid: { value: 4, type: 'absolute', status: 'established', source: 'Donoghue 2009' },
    },
    targetPopulation: ['all'],
    eligibility: { languages: ['ar', 'en'] },
    sensitivityLevel: 'LOW',
    ...overrides,
  });
}

async function seedScq(overrides = {}) {
  return Measure.create({
    code: 'SCQ',
    name: 'Social Communication Questionnaire',
    name_ar: 'استبيان التواصل الاجتماعي',
    category: 'screening',
    version: '1.0.0',
    purpose: 'screening',
    rawShape: 'items_array',
    derivedType: 'sum',
    interpretationStyle: 'cutoff',
    status: 'active',
    administrationTime: 15,
    administeredBy: ['psychologist', 'parent_caregiver'],
    ageRange: { min: 48, max: 480, unit: 'months' },
    targetPopulation: ['autism'],
    ...overrides,
  });
}

describe('W218 — strategist.recommend() integration', () => {
  test('returns ranked recommendations for PT motor case', async () => {
    const berg = await seedBerg();
    await seedScq();
    const out = await strategist.recommend({
      beneficiary: { ageMonths: 60, icd10: ['G80.1'] },
      discipline: 'physical_therapist',
      clinicalQuestion: 'baseline',
      domain: 'motor',
      availableMinutes: 60,
      respondents: ['clinician'],
    });
    expect(out.recommended.length).toBeGreaterThan(0);
    expect(out.recommended[0].code).toBe('BERG');
    expect(out.recommended[0].score).toBeGreaterThan(0);
    expect(out.recommended[0].reasonCodes).toContain(rules.REASON_CODES.DISCIPLINE_PRIMARY_TOOLKIT);
    expect(out.noViableMeasure).toBe(false);
    expect(out.flagForClinicalReview).toBe(false);
    expect(out.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(String(out.recommended[0].measureId)).toBe(String(berg._id));
  });

  test('excludes ineligible measure with reason codes', async () => {
    await seedBerg({ status: 'deprecated' });
    const out = await strategist.recommend({
      beneficiary: { ageMonths: 60, icd10: ['G80.1'] },
      discipline: 'physical_therapist',
      clinicalQuestion: 'baseline',
      domain: 'motor',
      availableMinutes: 60,
    });
    // Deprecated is filtered at the Mongo query level (status: 'active')
    // — should be excluded silently. Either way, no recommendations.
    expect(out.recommended.length).toBe(0);
    expect(out.noViableMeasure).toBe(true);
    expect(out.flagForClinicalReview).toBe(true);
  });

  test('cooldown enforced via real MeasureApplication history', async () => {
    const berg = await seedBerg();
    const benId = new mongoose.Types.ObjectId();
    // Prior admin 5 days ago — under 30-day minInterval
    await MeasureApplication.create({
      beneficiaryId: benId,
      measureId: berg._id,
      assessorId: new mongoose.Types.ObjectId(),
      applicationDate: new Date(Date.now() - 5 * 86400000),
      totalRawScore: 40,
      status: 'completed',
    });
    const out = await strategist.recommend({
      beneficiary: { _id: benId, ageMonths: 60, icd10: ['G80.1'] },
      discipline: 'physical_therapist',
      clinicalQuestion: 'progress',
      domain: 'motor',
      availableMinutes: 60,
    });
    const excluded = out.excluded.find(e => e.code === 'BERG');
    expect(excluded).toBeTruthy();
    expect(excluded.reasonCodes).toContain(rules.REASON_CODES.COOLDOWN_NOT_ELAPSED);
  });

  test('discharge requires same code as baseline', async () => {
    await seedBerg(); // code BERG
    await seedBerg({ code: 'TUG', name: 'Timed Up & Go' });
    const out = await strategist.recommend({
      beneficiary: { ageMonths: 60, icd10: ['G80.1'] },
      discipline: 'physical_therapist',
      clinicalQuestion: 'discharge',
      domain: 'motor',
      availableMinutes: 60,
      baselineMeasureCode: 'BERG',
    });
    expect(out.recommended.length).toBe(1);
    expect(out.recommended[0].code).toBe('BERG');
    const tugExcluded = out.excluded.find(e => e.code === 'TUG');
    expect(tugExcluded).toBeTruthy();
    expect(tugExcluded.reasonCodes).toContain(
      rules.REASON_CODES.DISCHARGE_REQUIRES_BASELINE_CONTINUITY
    );
  });

  test('screening question filters outcome measures', async () => {
    // Use candidatePool so BERG reaches the purpose-mismatch check
    // (the DB query would otherwise filter on administeredBy=psychologist).
    const berg = makeMeasureLike({ code: 'BERG', purpose: 'outcome', category: 'motor' });
    const scq = makeMeasureLike({
      code: 'SCQ',
      purpose: 'screening',
      category: 'screening',
      administeredBy: ['psychologist', 'parent_caregiver'],
      administrationTime: 15,
      ageRange: { min: 48, max: 480, unit: 'months' },
    });
    const out = await strategist.recommend({
      beneficiary: { ageMonths: 60, icd10: ['F84.0'] },
      discipline: 'psychologist',
      clinicalQuestion: 'screening',
      domain: 'screening',
      availableMinutes: 30,
      respondents: ['parent', 'clinician'],
      candidatePool: [berg, scq],
    });
    expect(out.recommended.map(r => r.code)).toEqual(['SCQ']);
    const bergExcluded = out.excluded.find(e => e.code === 'BERG');
    expect(bergExcluded).toBeTruthy();
    expect(bergExcluded.reasonCodes).toContain(rules.REASON_CODES.PURPOSE_MISMATCH);
  });

  test('toolkitFor() returns discipline codes', () => {
    expect(strategist.toolkitFor('physical_therapist')).toContain('BERG');
    expect(strategist.toolkitFor('psychologist')).toContain('CARS-2');
    expect(strategist.toolkitFor('unknown_discipline')).toEqual([]);
  });

  test('candidatePool override skips DB load', async () => {
    const m1 = makeMeasureLike({ code: 'BERG' });
    const m2 = makeMeasureLike({ code: 'FIM', administrationTime: 45 });
    const out = await strategist.recommend({
      beneficiary: { ageMonths: 60, icd10: ['G80.1'] },
      discipline: 'physical_therapist',
      clinicalQuestion: 'progress',
      domain: 'motor',
      availableMinutes: 60,
      candidatePool: [m1, m2],
    });
    expect(out.recommended.length).toBe(2);
    // BERG should outrank FIM (FIM not in toolkit + longer)
    expect(out.recommended[0].code).toBe('BERG');
  });

  test('rejects without beneficiary', async () => {
    await expect(strategist.recommend({})).rejects.toThrow(/beneficiary required/);
  });
});
