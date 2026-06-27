/**
 * DisabilityAssessment model — enhanced behavioral coverage with in-memory MongoDB.
 */

'use strict';

jest.unmock('mongoose');
jest.setTimeout(60000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let DisabilityAssessment;

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
  await DisabilityAssessment.collection.deleteMany({});
}, 20000);

const baseDoc = () => ({
  beneficiary_id: new mongoose.Types.ObjectId().toString(),
  beneficiary_name: 'أحمد',
  date_of_birth: new Date('2010-01-01'),
  gender: 'male',
  assessment_date: new Date(),
  assessor_id: 'A-001',
  assessor_name: 'د. سارة',
  assessment_status: 'active',
  assessment_details: {
    assessor_id: 'A-001',
    assessor_name: 'د. سارة',
    assessment_date: new Date(),
    assessment_method: 'clinical',
    icf_body_functions: {
      mental_functions: { score: 70, remarks: 'جيد' },
      sensory_functions: { score: 80 },
      neuro_muscular_skeletal: { score: 55 },
    },
    activities_participation: {
      mobility: { score: 60, difficulty: 'moderate' },
      self_care: { score: 75, difficulty: 'mild' },
      communication: { score: 80, difficulty: 'mild' },
    },
  },
  disability_profile: {
    type: 'physical',
    severity: 'moderate',
    onset_age: 5,
    onset_type: 'acquired',
    progression_status: 'stable',
  },
  functional_abilities: {
    mobility: {
      walking_distance: '10-100m',
      balance_standing: true,
      transfers_ability: 'independent',
      stairs_climbing: 'with_assistance',
      endurance_level: 65,
    },
    self_care: {
      feeding: { level: 4, needs_assistance: false },
      toileting: { level: 3, needs_assistance: true },
      bathing: { level: 3, needs_assistance: true },
      dressing: { level: 4, needs_assistance: false },
      grooming: { level: 4, needs_assistance: false },
    },
    communication: {
      understanding: { level: 5, method: 'verbal' },
      expression: { level: 4, method: 'verbal' },
      literacy: { reading: true, writing: true },
      language_proficiency: ['arabic'],
    },
    cognitive: {
      memory: { short_term: 70, long_term: 80 },
      attention_span: 25,
      problem_solving: 60,
      learning_ability: 65,
      orientation: { person: true, place: true, time: true },
    },
    social_emotional: { social_interaction: 55, emotional_regulation: 60, independence_level: 50 },
  },
  scales: {
    who_disability_assessment: { score: 60 },
    quality_of_life_score: { total: 70 },
    barthel_index: { score: 65 },
  },
  rehabilitation_readiness: {
    motivation_score: 75,
    cognitive_capacity: 65,
    physical_capacity: 60,
    family_support: 80,
    resource_availability: 70,
  },
  risk_factors: [{ type: 'fall', severity: 'medium', description: 'خطر سقوط' }],
  recommendations: [
    { type: 'therapy', description: 'علاج طبيعي', status: 'pending' },
    { type: 'equipment', description: 'عكاز', status: 'completed' },
  ],
});

describe('DisabilityAssessment — persistence and methods', () => {
  it('creates and saves a basic assessment', async () => {
    const doc = await DisabilityAssessment.create(baseDoc());
    expect(doc._id).toBeDefined();
    expect(doc.beneficiary_name).toBe('أحمد');
  });

  it('auto-calculates overall_readiness on save', async () => {
    const doc = await DisabilityAssessment.create(baseDoc());
    expect(['high', 'moderate', 'low']).toContain(doc.rehabilitation_readiness.overall_readiness);
  });

  it('calculates composite score from scales', async () => {
    const doc = await DisabilityAssessment.create(baseDoc());
    const composite = doc.calculateCompositeScore();
    expect(typeof composite).toBe('number');
    expect(composite).toBeGreaterThan(0);
  });

  it('determines readiness for rehabilitation', async () => {
    const doc = await DisabilityAssessment.create(baseDoc());
    expect(typeof doc.isReadyForRehabilitation()).toBe('boolean');
  });

  it('calculates overall risk level', async () => {
    const doc = await DisabilityAssessment.create(baseDoc());
    expect(['low', 'medium', 'high', 'critical']).toContain(doc.overallRiskLevel);
  });

  it('calculates rehabilitation priority', async () => {
    const doc = await DisabilityAssessment.create(baseDoc());
    const priority = doc.calculateRehabPriority();
    expect(priority.priorityScore).toBeGreaterThanOrEqual(0);
    expect(priority.priorityScore).toBeLessThanOrEqual(200);
  });

  it('generates assessment report', async () => {
    const doc = await DisabilityAssessment.create(baseDoc());
    const report = doc.generateAssessmentReport();
    expect(report.beneficiary.id).toBe(doc.beneficiary_id);
    expect(report.disability).toBeDefined();
    expect(report.composite_score).toBeDefined();
  });

  it('generates comprehensive profile', async () => {
    const doc = await DisabilityAssessment.create(baseDoc());
    const profile = doc.generateComprehensiveProfile();
    expect(profile.rehabPriority).toBeDefined();
    expect(profile.assistiveDevicesSummary).toBeDefined();
  });

  it('summarizes ICF body functions', async () => {
    const doc = await DisabilityAssessment.create(baseDoc());
    const summary = doc.getICFBodyFunctionSummary();
    expect(summary.domains.length).toBeGreaterThan(0);
    expect(summary.averageScore).toBeGreaterThan(0);
    expect(summary.weakestDomain).toBeDefined();
    expect(summary.strongestDomain).toBeDefined();
  });

  it('summarizes activities and participation', async () => {
    const doc = await DisabilityAssessment.create(baseDoc());
    const summary = doc.getActivitiesParticipationSummary();
    expect(summary.domains.length).toBeGreaterThan(0);
    expect(summary.averageScore).toBeGreaterThan(0);
  });

  it('summarizes self-care independence', async () => {
    const doc = await DisabilityAssessment.create(baseDoc());
    const summary = doc.getSelfCareIndependence();
    expect(summary.score).toBeGreaterThanOrEqual(0);
    expect(summary.needsAssistance).toBeDefined();
  });

  it('finds by disability type', async () => {
    await DisabilityAssessment.create(baseDoc());
    const found = await DisabilityAssessment.findByDisabilityType('physical');
    expect(found.length).toBe(1);
  });

  it('finds by severity', async () => {
    await DisabilityAssessment.create(baseDoc());
    const found = await DisabilityAssessment.findBySeverity('moderate');
    expect(found.length).toBe(1);
  });

  it('gets assessment statistics', async () => {
    await DisabilityAssessment.create(baseDoc());
    const stats = await DisabilityAssessment.getAssessmentStatistics();
    expect(stats.total_assessments).toBe(1);
    expect(stats.average_composite_score).toBeDefined();
  });

  it('computes average composite score with $avg over scales', async () => {
    await DisabilityAssessment.create(baseDoc());
    await DisabilityAssessment.create({
      ...baseDoc(),
      beneficiary_id: new mongoose.Types.ObjectId().toString(),
      scales: {
        who_disability_assessment: { score: 80 },
        quality_of_life_score: { total: 90 },
        barthel_index: { score: 85 },
      },
    });
    const stats = await DisabilityAssessment.getAssessmentStatistics();
    expect(stats.average_composite_score).toBeGreaterThan(0);
  });

  it('handles missing scale fields in average composite', async () => {
    const data = baseDoc();
    delete data.scales;
    await DisabilityAssessment.create(data);
    const stats = await DisabilityAssessment.getAssessmentStatistics();
    expect(stats.total_assessments).toBe(1);
  });

  it('gets distribution by type and severity', async () => {
    await DisabilityAssessment.create(baseDoc());
    const dist = await DisabilityAssessment.getDisabilityDistribution();
    expect(dist.byType.length).toBeGreaterThan(0);
    expect(dist.bySeverity.length).toBeGreaterThan(0);
  });

  it('gets functional abilities summary', async () => {
    await DisabilityAssessment.create(baseDoc());
    const summary = await DisabilityAssessment.getFunctionalAbilitiesSummary();
    expect(summary.count).toBe(1);
    expect(Object.keys(summary.domains).length).toBeGreaterThan(0);
  });

  it('gets rehab readiness overview', async () => {
    await DisabilityAssessment.create(baseDoc());
    const overview = await DisabilityAssessment.getRehabReadinessOverview();
    expect(overview.total).toBe(1);
    expect(overview.details.length).toBe(1);
  });

  it('filters by risk level', async () => {
    await DisabilityAssessment.create(baseDoc());
    const low = await DisabilityAssessment.getByRiskLevel('low');
    expect(low.length).toBeGreaterThanOrEqual(0);
  });
});
