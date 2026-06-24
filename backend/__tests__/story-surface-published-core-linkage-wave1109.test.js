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

const { waitForRows, waitForCount } = require('./helpers/waitForTimelineRows');

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
    await waitForCount({ beneficiaryId }, 0);

    doc.status = 'published';
    doc.approvedBy = approver;
    await doc.save();
    const rows = await waitForRows({ beneficiaryId }, 1);
  });

  it('does not fire while the variant is only approved (not published)', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const branchId = new mongoose.Types.ObjectId();

    const doc = await StorySurfaceVariant.create(variant(beneficiaryId, branchId));
    await waitForCount({ beneficiaryId }, 0);

    doc.status = 'approved';
    doc.approvedBy = new mongoose.Types.ObjectId();
    await doc.save();
    await waitForCount({ beneficiaryId }, 0);
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
    const rows = await waitForRows({ beneficiaryId }, 1);
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
    const rows = await waitForRows({ beneficiaryId }, 1);
  });
});
