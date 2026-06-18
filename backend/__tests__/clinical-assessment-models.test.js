/**
 * Behavioral model tests for clinical assessment models:
 * MChatAssessment, PortageAssessment, SensoryProfileAssessment.
 */

'use strict';

jest.unmock('mongoose');
jest.setTimeout(60000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let MChatAssessment;
let PortageAssessment;
let SensoryProfileAssessment;

const OID = () => new mongoose.Types.ObjectId();

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  // latestFor populates assessor from User; register a minimal User model.
  mongoose.model(
    'User',
    new mongoose.Schema({ name: String, role: String }, { collection: 'users' })
  );
  MChatAssessment = require('../models/clinical-assessment/mchat-assessment.model');
  PortageAssessment = require('../models/clinical-assessment/portage-assessment.model');
  SensoryProfileAssessment = require('../models/clinical-assessment/sensory-profile-assessment.model');
}, 60000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
}, 60000);

beforeEach(async () => {
  await MChatAssessment.collection.deleteMany({});
  await PortageAssessment.collection.deleteMany({});
  await SensoryProfileAssessment.collection.deleteMany({});
}, 20000);

function mchatItems(riskCount = 0) {
  return Array.from({ length: 20 }, (_, i) => ({
    item_number: i + 1,
    question_ar: `سؤال ${i + 1}`,
    response: i < riskCount ? true : false,
    is_critical: [2, 5, 9, 12, 15, 17, 18].includes(i + 1),
  }));
}

function portageItems() {
  return [
    {
      domain: 'motor',
      age_range: '1-2',
      item_number: 1,
      skill_ar: 'مهارة حركية',
      achieved: true,
    },
    {
      domain: 'language',
      age_range: '2-3',
      item_number: 2,
      skill_ar: 'مهارة لغوية',
      achieved: false,
      emerging: true,
    },
  ];
}

function sensoryItems() {
  return [
    { item_number: 1, section: 'auditory', question_ar: 'سمعي', frequency: 3 },
    { item_number: 2, section: 'visual', question_ar: 'بصري', frequency: 2 },
  ];
}

describe('MChatAssessment', () => {
  it('persists a valid assessment and computes risk level from score', async () => {
    const doc = await MChatAssessment.create({
      beneficiary: OID(),
      assessor: OID(),
      age_months: 18,
      items: mchatItems(5),
      total_risk_score: 5,
      critical_items_failed: 2,
    });
    expect(doc._id).toBeDefined();
    expect(doc.risk_level).toBe('medium');
    expect(doc.risk_level_ar).toBe('متوسط');
  });

  it('rejects fewer than 20 items', async () => {
    await expect(
      MChatAssessment.create({
        beneficiary: OID(),
        assessor: OID(),
        age_months: 18,
        items: mchatItems(0).slice(0, 19),
      })
    ).rejects.toThrow(/20/);
  });

  it('rejects age outside 16-30 months', async () => {
    await expect(
      MChatAssessment.create({
        beneficiary: OID(),
        assessor: OID(),
        age_months: 10,
        items: mchatItems(0),
      })
    ).rejects.toThrow();
  });

  it('provides risk_summary virtual', async () => {
    const doc = await MChatAssessment.create({
      beneficiary: OID(),
      assessor: OID(),
      age_months: 18,
      items: mchatItems(1),
      total_risk_score: 1,
      critical_items_failed: 0,
    });
    expect(doc.toJSON().risk_summary).toContain('منخفض');
  });

  it('paginate returns correct shape', async () => {
    await MChatAssessment.create({
      beneficiary: OID(),
      assessor: OID(),
      age_months: 18,
      items: mchatItems(0),
      total_risk_score: 0,
    });
    const result = await MChatAssessment.paginate({}, { limit: 5 });
    expect(result.docs.length).toBe(1);
    expect(result.pagination.total).toBe(1);
    expect(result.pagination.limit).toBe(5);
  });
});

describe('PortageAssessment', () => {
  it('persists a valid assessment', async () => {
    const doc = await PortageAssessment.create({
      beneficiary: OID(),
      assessor: OID(),
      age_months: 24,
      items: portageItems(),
      domain_summaries: {
        motor: { total_items: 1, achieved: 1, emerging: 0, percentage: 100 },
      },
    });
    expect(doc._id).toBeDefined();
    expect(doc.items.length).toBe(2);
  });

  it('rejects invalid domain enum', async () => {
    await expect(
      PortageAssessment.create({
        beneficiary: OID(),
        assessor: OID(),
        age_months: 24,
        items: [{ ...portageItems()[0], domain: 'invalid' }],
      })
    ).rejects.toThrow(/domain/);
  });

  it('rejects age above 72 months', async () => {
    await expect(
      PortageAssessment.create({
        beneficiary: OID(),
        assessor: OID(),
        age_months: 80,
        items: portageItems(),
      })
    ).rejects.toThrow();
  });

  it('latestFor returns the most recent document', async () => {
    const beneficiary = OID();
    await PortageAssessment.create({
      beneficiary,
      assessor: OID(),
      age_months: 24,
      items: portageItems(),
    });
    const latest = await PortageAssessment.latestFor(beneficiary);
    expect(latest).not.toBeNull();
    expect(String(latest.beneficiary)).toBe(String(beneficiary));
  });
});

describe('SensoryProfileAssessment', () => {
  it('persists a valid assessment', async () => {
    const doc = await SensoryProfileAssessment.create({
      beneficiary: OID(),
      assessor: OID(),
      age_months: 48,
      items: sensoryItems(),
      section_scores: {
        auditory: { raw: 10, classification: 'typical' },
      },
    });
    expect(doc._id).toBeDefined();
    expect(doc.items.length).toBe(2);
  });

  it('rejects invalid section enum', async () => {
    await expect(
      SensoryProfileAssessment.create({
        beneficiary: OID(),
        assessor: OID(),
        age_months: 48,
        items: [{ ...sensoryItems()[0], section: 'taste' }],
      })
    ).rejects.toThrow(/section/);
  });

  it('rejects frequency outside 1-5', async () => {
    await expect(
      SensoryProfileAssessment.create({
        beneficiary: OID(),
        assessor: OID(),
        age_months: 48,
        items: [{ ...sensoryItems()[0], frequency: 7 }],
      })
    ).rejects.toThrow();
  });

  it('rejects age below 36 months', async () => {
    await expect(
      SensoryProfileAssessment.create({
        beneficiary: OID(),
        assessor: OID(),
        age_months: 24,
        items: sensoryItems(),
      })
    ).rejects.toThrow();
  });

  it('paginate returns pagination metadata', async () => {
    await SensoryProfileAssessment.create({
      beneficiary: OID(),
      assessor: OID(),
      age_months: 48,
      items: sensoryItems(),
    });
    const result = await SensoryProfileAssessment.paginate({}, { page: 1, limit: 10 });
    expect(result.pagination.pages).toBe(1);
    expect(result.docs.length).toBe(1);
  });
});
