'use strict';

/**
 * W1100 — StoryBook → unified core timeline linkage.
 *
 * Publishing a beneficiary's quarterly story book (status → published)
 * publishes `story-book.story_book.published`, which the DDD cross-module
 * subscriber materialises into a per-beneficiary CareTimeline row
 * (category: family, severity: success) so the family-facing milestone joins
 * the longitudinal record. Draft / reviewed books stay off the timeline.
 */

jest.unmock('mongoose');
jest.setTimeout(90000);

const { waitForRows, waitForCount } = require('./helpers/waitForTimelineRows');

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const StoryBook = require('../models/StoryBook');
const { CareTimeline } = require('../domains/timeline/models/CareTimeline');
require('../models/Beneficiary');

const { integrationBus } = require('../integration/systemIntegrationBus');
const { initializeDDDSubscribers } = require('../integration/dddCrossModuleSubscribers');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create({
    instance: { dbName: 'w1100-story-book' },
  });
  await mongoose.connect(mongoServer.getUri());
  initializeDDDSubscribers(integrationBus);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

afterEach(async () => {
  await StoryBook.deleteMany({});
  await CareTimeline.deleteMany({});
});

function book(beneficiaryId, branchId, overrides = {}) {
  return {
    beneficiaryId,
    branchId,
    periodStart: new Date('2026-01-01T00:00:00.000Z'),
    periodEnd: new Date('2026-03-31T23:59:59.000Z'),
    periodType: 'quarterly',
    coverage: 80,
    ...overrides,
  };
}

describe('W1100 — StoryBook → CareTimeline linkage', () => {
  it('records a family timeline row when a story book is published', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const branchId = new mongoose.Types.ObjectId();
    const reviewedBy = new mongoose.Types.ObjectId();
    const doc = await StoryBook.create(book(beneficiaryId, branchId));

    // No row yet — still a draft.
    await waitForCount({ beneficiaryId }, 0);

    doc.reviewedBy = reviewedBy;
    doc.status = 'published';
    await doc.save();

    const rowRows = await waitForRows({ beneficiaryId }, 1);
    const row = rowRows[0];
    expect(row).toBeTruthy();
    expect(row.eventType).toBe('story_book_published');
    expect(row.category).toBe('family');
    expect(row.severity).toBe('success');
    expect(String(row.branchId)).toBe(String(branchId));
    expect(String(row.metadata.storyBookId)).toBe(String(doc._id));
    expect(row.metadata.periodType).toBe('quarterly');
    expect(row.metadata.coverage).toBe(80);
    expect(row.title).toContain('quarterly');
  });

  it('does NOT fire when a story book is only reviewed', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const branchId = new mongoose.Types.ObjectId();
    const doc = await StoryBook.create(book(beneficiaryId, branchId));
    doc.reviewedBy = new mongoose.Types.ObjectId();
    doc.status = 'reviewed';
    await doc.save();

    await waitForCount({ beneficiaryId }, 0);
  });

  it('does NOT fire merely on draft creation', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const branchId = new mongoose.Types.ObjectId();
    await StoryBook.create(book(beneficiaryId, branchId));

    await waitForCount({ beneficiaryId }, 0);
  });

  it('does not duplicate the timeline row on a subsequent unrelated save', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const branchId = new mongoose.Types.ObjectId();
    const doc = await StoryBook.create(book(beneficiaryId, branchId));
    doc.reviewedBy = new mongoose.Types.ObjectId();
    doc.status = 'published';
    await doc.save();

    await waitForRows({ beneficiaryId }, 1);

    doc.notes = 'family review note';
    await doc.save();
    await waitForCount({ beneficiaryId }, 1);
  });
});
