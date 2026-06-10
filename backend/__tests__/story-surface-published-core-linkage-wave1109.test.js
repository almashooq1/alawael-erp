'use strict';

/**
 * W1109 — StorySurfaceVariant → unified core timeline linkage.
 *
 * When an audience-specific story surface variant for a beneficiary reaches
 * the `published` status, the model publishes
 * `story-surface.story_surface.published`, which the DDD cross-module
 * subscriber materialises into one per-beneficiary CareTimeline row
 * (category: family, severity: success). The row is never double-counted on
 * a subsequent unrelated save.
 *
 * Doctrine: every milestone for a single beneficiary is linked to the
 * beneficiary + the unified timeline + time.
 */

jest.unmock('mongoose');
jest.setTimeout(90000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const { CareTimeline } = require('../domains/timeline/models/CareTimeline');
require('../models/Beneficiary');
const { integrationBus } = require('../integration/systemIntegrationBus');
const { initializeDDDSubscribers } = require('../integration/dddCrossModuleSubscribers');

let StorySurfaceVariant;
let mongo;

/** Build a valid StorySurfaceVariant payload (required fields). */
function variant(beneficiaryId, branchId, overrides = {}) {
  return {
    storyBookId: new mongoose.Types.ObjectId(),
    beneficiaryId,
    branchId,
    surfaceType: 'family_quarterly_storybook',
    generatedBy: 'template',
    lang: 'ar',
    ...overrides,
  };
}

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  StorySurfaceVariant =
    mongoose.models.StorySurfaceVariant || require('../models/StorySurfaceVariant');
  initializeDDDSubscribers(integrationBus);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

afterEach(async () => {
  await CareTimeline.deleteMany({});
  await StorySurfaceVariant.deleteMany({});
});

describe('W1109 StorySurfaceVariant → CareTimeline (story_surface.published)', () => {
  it('records a family/success row when a variant is published', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const branchId = new mongoose.Types.ObjectId();
    const approver = new mongoose.Types.ObjectId();

    // Draft → no row yet.
    const doc = await StorySurfaceVariant.create(variant(beneficiaryId, branchId));
    await new Promise(r => setTimeout(r, 30));
    expect(await CareTimeline.countDocuments({ beneficiaryId })).toBe(0);

    doc.status = 'published';
    doc.approvedBy = approver;
    await doc.save();
    await new Promise(r => setTimeout(r, 30));

    const rows = await CareTimeline.find({ beneficiaryId });
    expect(rows).toHaveLength(1);
    const row = rows[0];
    expect(row.eventType).toBe('story_surface_published');
    expect(row.category).toBe('family');
    expect(row.severity).toBe('success');
    expect(String(row.branchId)).toBe(String(branchId));
    expect(String(row.metadata.variantId)).toBe(String(doc._id));
    expect(row.metadata.surfaceType).toBe('family_quarterly_storybook');
    expect(row.title).toContain('family_quarterly_storybook');
  });

  it('does not fire while the variant is only approved (not published)', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const branchId = new mongoose.Types.ObjectId();

    const doc = await StorySurfaceVariant.create(variant(beneficiaryId, branchId));
    await new Promise(r => setTimeout(r, 30));

    doc.status = 'approved';
    doc.approvedBy = new mongoose.Types.ObjectId();
    await doc.save();
    await new Promise(r => setTimeout(r, 30));

    expect(await CareTimeline.countDocuments({ beneficiaryId })).toBe(0);
  });

  it('fires when a variant is created already published', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const branchId = new mongoose.Types.ObjectId();

    await StorySurfaceVariant.create(
      variant(beneficiaryId, branchId, {
        status: 'published',
        approvedBy: new mongoose.Types.ObjectId(),
      })
    );
    await new Promise(r => setTimeout(r, 30));

    const rows = await CareTimeline.find({ beneficiaryId });
    expect(rows).toHaveLength(1);
    expect(rows[0].eventType).toBe('story_surface_published');
  });

  it('does not duplicate the row on a later unrelated save', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const branchId = new mongoose.Types.ObjectId();

    const doc = await StorySurfaceVariant.create(
      variant(beneficiaryId, branchId, {
        status: 'published',
        approvedBy: new mongoose.Types.ObjectId(),
      })
    );
    await new Promise(r => setTimeout(r, 30));

    doc.targetReadingGrade = 6;
    await doc.save();
    await new Promise(r => setTimeout(r, 30));

    const rows = await CareTimeline.find({ beneficiaryId });
    expect(rows).toHaveLength(1);
  });
});
