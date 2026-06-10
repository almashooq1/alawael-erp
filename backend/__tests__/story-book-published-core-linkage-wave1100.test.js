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

async function waitForTimeline(filter, { tries = 40, gap = 50 } = {}) {
  for (let i = 0; i < tries; i += 1) {
    const row = await CareTimeline.findOne(filter).lean();
    if (row) return row;
    await new Promise(r => setTimeout(r, gap));
  }
  return null;
}

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
    await new Promise(r => setTimeout(r, 200));
    expect(await CareTimeline.countDocuments({ beneficiaryId })).toBe(0);

    doc.reviewedBy = reviewedBy;
    doc.status = 'published';
    await doc.save();

    const row = await waitForTimeline({ beneficiaryId });
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

    await new Promise(r => setTimeout(r, 300));
    expect(await CareTimeline.countDocuments({ beneficiaryId })).toBe(0);
  });

  it('does NOT fire merely on draft creation', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const branchId = new mongoose.Types.ObjectId();
    await StoryBook.create(book(beneficiaryId, branchId));

    await new Promise(r => setTimeout(r, 300));
    expect(await CareTimeline.countDocuments({ beneficiaryId })).toBe(0);
  });

  it('does not duplicate the timeline row on a subsequent unrelated save', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const branchId = new mongoose.Types.ObjectId();
    const doc = await StoryBook.create(book(beneficiaryId, branchId));
    doc.reviewedBy = new mongoose.Types.ObjectId();
    doc.status = 'published';
    await doc.save();

    await waitForTimeline({ beneficiaryId });

    doc.notes = 'family review note';
    await doc.save();
    await new Promise(r => setTimeout(r, 300));
    expect(await CareTimeline.countDocuments({ beneficiaryId })).toBe(1);
  });
});
