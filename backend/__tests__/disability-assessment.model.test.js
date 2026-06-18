/**
 * Behavioral model tests for DisabilityAssessment.
 *
 * Replaces the auto-generated structural test in tests/unit/ with real
 * MongoMemoryServer persistence, exercising invariants, methods, virtuals,
 * and static helpers.
 */

'use strict';

jest.unmock('mongoose');
jest.setTimeout(60000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let DisabilityAssessment;

const OID = () => new mongoose.Types.ObjectId();

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  DisabilityAssessment = require('../models/disability-assessment.model');
}, 60000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
}, 60000);

beforeEach(async () => {
  if (DisabilityAssessment && DisabilityAssessment.collection) {
    await DisabilityAssessment.collection.deleteMany({});
  }
}, 20000);

function baseDoc(overrides = {}) {
  return {
    beneficiary_id: `BEN-${Date.now()}`,
    beneficiary_name: 'مستفيد اختبار',
    date_of_birth: new Date('2015-01-01'),
    gender: 'male',
    disability_profile: {
      type: 'autism_spectrum',
      severity: 'moderate',
      onset_type: 'congenital',
      comorbidities: ['adhd'],
    },
    assessment_details: {
      assessor_id: OID().toString(),
      assessor_name: 'أخصائي اختبار',
      assessment_method: 'clinical',
    },
    functional_abilities: {
      mobility: { endurance_level: 60 },
      self_care: {
        feeding: { level: 3, needs_assistance: false },
        toileting: { level: 3, needs_assistance: false },
        bathing: { level: 2, needs_assistance: true },
        dressing: { level: 3, needs_assistance: false },
        grooming: { level: 2, needs_assistance: true },
      },
      communication: { understanding: { level: 4, method: 'verbal' } },
      cognitive: { problem_solving: 50, learning_ability: 55 },
      social_emotional: { social_interaction: 40, independence_level: 45 },
    },
    scales: {
      who_disability_assessment: { score: 45 },
      quality_of_life_score: { total: 50 },
      barthel_index: { score: 55 },
    },
    rehabilitation_readiness: {
      motivation_score: 70,
      cognitive_capacity: 60,
      physical_capacity: 55,
      family_support: 65,
      resource_availability: 50,
    },
    assessment_status: 'completed',
    ...overrides,
  };
}

describe('DisabilityAssessment model — persistence', () => {
  it('persists a valid completed assessment', async () => {
    const doc = await DisabilityAssessment.create(baseDoc());
    expect(doc._id).toBeDefined();
    expect(doc.assessment_status).toBe('completed');
  });

  it('rejects invalid disability type', async () => {
    await expect(
      DisabilityAssessment.create({
        ...baseDoc(),
        disability_profile: { ...baseDoc().disability_profile, type: 'unknown' },
      })
    ).rejects.toThrow(/type/);
  });

  it('rejects invalid severity', async () => {
    await expect(
      DisabilityAssessment.create({
        ...baseDoc(),
        disability_profile: { ...baseDoc().disability_profile, severity: 'extreme' },
      })
    ).rejects.toThrow(/severity/);
  });

  it('rejects invalid gender', async () => {
    await expect(DisabilityAssessment.create({ ...baseDoc(), gender: 'X' })).rejects.toThrow(
      /gender/
    );
  });

  it('computes overall_readiness on save', async () => {
    const doc = await DisabilityAssessment.create(baseDoc());
    expect(doc.rehabilitation_readiness.overall_readiness).toBe('moderate');
  });
});

describe('DisabilityAssessment model — instance methods', () => {
  it('calculateCompositeScore averages available scale scores', async () => {
    const doc = await DisabilityAssessment.create(baseDoc());
    // (45 + 50 + 55) / 3 = 50
    expect(doc.calculateCompositeScore()).toBe(50);
  });

  it('calculateCompositeScore returns 0 when no scales are present', async () => {
    const doc = await DisabilityAssessment.create({ ...baseDoc(), scales: {} });
    expect(doc.calculateCompositeScore()).toBe(0);
  });

  it('getSeverityProfile returns key profile fields', async () => {
    const doc = await DisabilityAssessment.create(baseDoc());
    const profile = doc.getSeverityProfile();
    expect(profile.type).toBe('autism_spectrum');
    expect(profile.severity).toBe('moderate');
    expect(profile.comorbidities_count).toBe(1);
  });

  it('isReadyForRehabilitation returns true above thresholds', async () => {
    const doc = await DisabilityAssessment.create(baseDoc());
    expect(doc.isReadyForRehabilitation()).toBe(true);
  });

  it('isReadyForRehabilitation returns false below thresholds', async () => {
    const doc = await DisabilityAssessment.create({
      ...baseDoc(),
      rehabilitation_readiness: {
        motivation_score: 30,
        cognitive_capacity: 30,
        physical_capacity: 30,
        family_support: 30,
      },
    });
    expect(doc.isReadyForRehabilitation()).toBe(false);
  });

  it('generateAssessmentReport contains beneficiary and domain data', async () => {
    const doc = await DisabilityAssessment.create(baseDoc());
    const report = doc.generateAssessmentReport();
    expect(report.beneficiary.id).toBe(doc.beneficiary_id);
    expect(report.composite_score).toBe(50);
    expect(report.domain_scores).toHaveProperty('functional_abilities');
  });

  it('getProgressMetrics compares two assessments', async () => {
    const previous = await DisabilityAssessment.create({
      ...baseDoc(),
      scales: { who_disability_assessment: { score: 30 } },
      createdAt: new Date(Date.now() - 30 * 86400000),
    });
    const current = await DisabilityAssessment.create({
      ...baseDoc(),
      scales: { who_disability_assessment: { score: 60 } },
    });
    const metrics = current.getProgressMetrics(previous);
    expect(metrics.is_improving).toBe(true);
    expect(metrics.composite_score_change).toBe(30);
    expect(metrics.assessment_period_days).toBeGreaterThan(0);
  });
});

describe('DisabilityAssessment model — statics', () => {
  it('findByDisabilityType returns matching docs', async () => {
    await DisabilityAssessment.create(baseDoc());
    await DisabilityAssessment.create({
      ...baseDoc(),
      beneficiary_id: `BEN-${Date.now()}-2`,
      disability_profile: { ...baseDoc().disability_profile, type: 'physical' },
    });
    const results = await DisabilityAssessment.findByDisabilityType('autism_spectrum').lean();
    expect(results.length).toBe(1);
  });

  it('findBySeverity returns matching docs', async () => {
    await DisabilityAssessment.create(baseDoc());
    const results = await DisabilityAssessment.findBySeverity('moderate').lean();
    expect(results.length).toBe(1);
  });

  it('getAssessmentStatistics aggregates counts', async () => {
    await DisabilityAssessment.create(baseDoc());
    const stats = await DisabilityAssessment.getAssessmentStatistics();
    expect(stats.total_assessments).toBe(1);
    expect(stats.by_type.some(b => b._id === 'autism_spectrum')).toBe(true);
  });

  it('getReadyForRehabilitationCount counts completed high-readiness cases', async () => {
    await DisabilityAssessment.create({
      ...baseDoc(),
      rehabilitation_readiness: {
        motivation_score: 80,
        cognitive_capacity: 80,
        physical_capacity: 80,
        family_support: 80,
        resource_availability: 80,
      },
    });
    const count = await DisabilityAssessment.getReadyForRehabilitationCount();
    expect(count).toBe(1);
  });

  it('getByRiskLevel filters by computed risk', async () => {
    await DisabilityAssessment.create({
      ...baseDoc(),
      risk_factors: [
        { factor: 'fall', severity: 'high' },
        { factor: 'wandering', severity: 'high' },
      ],
    });
    const critical = await DisabilityAssessment.getByRiskLevel('critical');
    expect(critical.length).toBe(1);
  });
});
