'use strict';

/**
 * story-models-behavioral-wave480.test.js — behavioral counterpart to
 * `story-models-wave480.test.js` (static drift guard). MongoMemoryServer.
 *
 * Validates W480 StoryBook + StorySurfaceVariant Wave-18 invariants
 * + index uniqueness against a real Mongoose runtime.
 */

jest.unmock('mongoose');
jest.setTimeout(30000);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let StoryBook;
let StorySurfaceVariant;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({
      instance: { dbName: 'w480-behavioral-test' },
    });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  StoryBook = require('../models/StoryBook');
  StorySurfaceVariant = require('../models/StorySurfaceVariant');
  await StoryBook.init();
  await StorySurfaceVariant.init();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await StoryBook.deleteMany({});
  await StorySurfaceVariant.deleteMany({});
});

function baseBook(overrides = {}) {
  return {
    beneficiaryId: new mongoose.Types.ObjectId(),
    branchId: new mongoose.Types.ObjectId(),
    periodStart: new Date('2026-01-01'),
    periodEnd: new Date('2026-03-31'),
    periodType: 'quarterly',
    composedByMethod: 'template_only',
    sections: [
      { section: 'cover', title: 'الغلاف', hasData: false },
      { section: 'gas_trajectory', title: 'تطور', hasData: true },
    ],
    confidence: 'high',
    coverage: 80,
    status: 'draft',
    ...overrides,
  };
}

function baseVariant(storyBookId, beneficiaryId, branchId, overrides = {}) {
  return {
    storyBookId,
    beneficiaryId,
    branchId,
    surfaceType: 'family_quarterly_storybook',
    lang: 'ar',
    targetReadingGrade: 8,
    sections: [{ section: 'cover', title: 'الغلاف' }],
    generatedBy: 'template',
    status: 'draft',
    ...overrides,
  };
}

describe('W480 — StoryBook behavioral', () => {
  it('accepts a well-formed draft', async () => {
    const doc = await StoryBook.create(baseBook());
    expect(doc._id).toBeDefined();
    expect(doc.status).toBe('draft');
  });

  it('rejects when periodStart >= periodEnd', async () => {
    await expect(
      StoryBook.create(
        baseBook({
          periodStart: new Date('2026-04-01'),
          periodEnd: new Date('2026-01-01'),
        })
      )
    ).rejects.toThrow(/periodStart must be before periodEnd/);
  });

  it('rejects status=published without reviewedBy', async () => {
    await expect(StoryBook.create(baseBook({ status: 'published' }))).rejects.toThrow(
      /requires reviewedBy/
    );
  });

  it('rejects status=shared_with_family without reviewedBy', async () => {
    await expect(StoryBook.create(baseBook({ status: 'shared_with_family' }))).rejects.toThrow(
      /requires reviewedBy/
    );
  });

  it('accepts status=published with reviewedBy + auto-fills publishedAt', async () => {
    const doc = await StoryBook.create(
      baseBook({
        status: 'published',
        reviewedBy: new mongoose.Types.ObjectId(),
      })
    );
    expect(doc.publishedAt).toBeInstanceOf(Date);
    // reviewedAt only auto-fills on status='reviewed' transition; for direct
    // status=published the route is expected to set both reviewedBy + status.
  });

  it('auto-fills sharedWithFamilyAt on shared_with_family status', async () => {
    const doc = await StoryBook.create(
      baseBook({
        status: 'shared_with_family',
        reviewedBy: new mongoose.Types.ObjectId(),
      })
    );
    expect(doc.sharedWithFamilyAt).toBeInstanceOf(Date);
  });

  it('rejects invalid periodType enum', async () => {
    await expect(StoryBook.create(baseBook({ periodType: 'bogus' }))).rejects.toThrow();
  });

  it('accepts coverage in 0-100 range', async () => {
    const doc = await StoryBook.create(baseBook({ coverage: 100 }));
    expect(doc.coverage).toBe(100);
  });

  it('rejects coverage > 100', async () => {
    await expect(StoryBook.create(baseBook({ coverage: 150 }))).rejects.toThrow();
  });

  it('rejects invalid confidence enum', async () => {
    await expect(StoryBook.create(baseBook({ confidence: 'bogus' }))).rejects.toThrow();
  });
});

describe('W480 — StorySurfaceVariant behavioral', () => {
  let bookId;
  let beneficiaryId;
  let branchId;

  beforeEach(async () => {
    const book = await StoryBook.create(baseBook());
    bookId = book._id;
    beneficiaryId = book.beneficiaryId;
    branchId = book.branchId;
  });

  it('accepts a well-formed variant', async () => {
    const doc = await StorySurfaceVariant.create(baseVariant(bookId, beneficiaryId, branchId));
    expect(doc._id).toBeDefined();
    expect(doc.surfaceType).toBe('family_quarterly_storybook');
  });

  it('enforces unique (storyBookId, surfaceType) compound index — idempotency for W491 spawn', async () => {
    await StorySurfaceVariant.create(baseVariant(bookId, beneficiaryId, branchId));
    await expect(
      StorySurfaceVariant.create(baseVariant(bookId, beneficiaryId, branchId))
    ).rejects.toMatchObject({ code: 11000 });
  });

  it('allows different surfaceType for same storyBookId', async () => {
    await StorySurfaceVariant.create(
      baseVariant(bookId, beneficiaryId, branchId, {
        surfaceType: 'family_quarterly_storybook',
      })
    );
    const doc = await StorySurfaceVariant.create(
      baseVariant(bookId, beneficiaryId, branchId, {
        surfaceType: 'sibling_friendly_story',
      })
    );
    expect(doc.surfaceType).toBe('sibling_friendly_story');
  });

  it('auto-flags isSensitive=true for sibling_friendly_story', async () => {
    const doc = await StorySurfaceVariant.create(
      baseVariant(bookId, beneficiaryId, branchId, {
        surfaceType: 'sibling_friendly_story',
        isSensitive: false,
      })
    );
    expect(doc.isSensitive).toBe(true);
  });

  it('auto-flags isSensitive=true for beneficiary_personal_story', async () => {
    const doc = await StorySurfaceVariant.create(
      baseVariant(bookId, beneficiaryId, branchId, {
        surfaceType: 'beneficiary_personal_story',
        isSensitive: false,
      })
    );
    expect(doc.isSensitive).toBe(true);
  });

  it('leaves isSensitive=false for non-sensitive surfaces', async () => {
    const doc = await StorySurfaceVariant.create(
      baseVariant(bookId, beneficiaryId, branchId, {
        surfaceType: 'clinical_narrative',
      })
    );
    expect(doc.isSensitive).toBe(false);
  });

  it('rejects status=approved without approvedBy', async () => {
    await expect(
      StorySurfaceVariant.create(
        baseVariant(bookId, beneficiaryId, branchId, { status: 'approved' })
      )
    ).rejects.toThrow(/requires approvedBy/);
  });

  it('rejects status=retracted without retractionReason >=5', async () => {
    await expect(
      StorySurfaceVariant.create(
        baseVariant(bookId, beneficiaryId, branchId, {
          status: 'retracted',
          retractionReason: 'no',
        })
      )
    ).rejects.toThrow(/retractionReason/);
  });

  it('rejects published with photo visualAsset missing consentVerified', async () => {
    await expect(
      StorySurfaceVariant.create(
        baseVariant(bookId, beneficiaryId, branchId, {
          status: 'approved',
          approvedBy: new mongoose.Types.ObjectId(),
          visualAssets: [
            { kind: 'photo', url: 'https://example.com/p.jpg', consentVerified: false },
          ],
        })
      )
    ).rejects.toThrow(/photo visualAssets require consentVerified=true/);
  });

  it('accepts approved with photo visualAsset when consentVerified=true', async () => {
    const doc = await StorySurfaceVariant.create(
      baseVariant(bookId, beneficiaryId, branchId, {
        status: 'approved',
        approvedBy: new mongoose.Types.ObjectId(),
        visualAssets: [{ kind: 'photo', url: 'https://example.com/p.jpg', consentVerified: true }],
      })
    );
    expect(doc.status).toBe('approved');
    expect(doc.approvedAt).toBeInstanceOf(Date);
  });

  it('rejects targetReadingGrade > 16', async () => {
    await expect(
      StorySurfaceVariant.create(
        baseVariant(bookId, beneficiaryId, branchId, {
          targetReadingGrade: 20,
        })
      )
    ).rejects.toThrow();
  });

  it('rejects invalid surfaceType', async () => {
    await expect(
      StorySurfaceVariant.create(
        baseVariant(bookId, beneficiaryId, branchId, {
          surfaceType: 'bogus_surface',
        })
      )
    ).rejects.toThrow();
  });
});
