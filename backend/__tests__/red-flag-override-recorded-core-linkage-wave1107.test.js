'use strict';

/**
 * W1107 — RedFlagOverride → unified core timeline linkage.
 *
 * When a clinician overrides a blocking red flag to start a beneficiary's
 * session (the CBAHI emergency-override evidence trail), the append-only
 * model publishes `red-flag-override.red_flag_override.recorded`, which the
 * DDD cross-module subscriber materialises into one per-beneficiary
 * CareTimeline row (category: quality, severity: warning — an override is a
 * deviation that warrants visibility). The row is never double-counted on a
 * subsequent save of the same record.
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

let RedFlagOverride;
let mongo;

/** Build a valid RedFlagOverride payload (all required fields). */
function override(beneficiaryId, overrides = {}) {
  return {
    beneficiaryId: String(beneficiaryId),
    overriddenBy: 'user-clinician-1',
    overriddenAt: new Date(),
    reason: 'تجاوز سريري مبرر لبدء الجلسة رغم العلامة الحاجبة',
    blockingFlagIds: ['flag-consent', 'flag-allergy'],
    ...overrides,
  };
}

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  RedFlagOverride = mongoose.models.RedFlagOverride || require('../models/RedFlagOverride');
  initializeDDDSubscribers(integrationBus);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

afterEach(async () => {
  await CareTimeline.deleteMany({});
  await RedFlagOverride.deleteMany({});
});

describe('W1107 RedFlagOverride → CareTimeline (red_flag_override.recorded)', () => {
  it('records a quality/warning timeline row when an override is logged', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const branchId = new mongoose.Types.ObjectId();

    const doc = await RedFlagOverride.create(
      override(beneficiaryId, {
        context: {
          sessionId: 'sess-1',
          therapistId: 'th-1',
          branchId: String(branchId),
        },
      })
    );
    await new Promise(r => setTimeout(r, 300));

    const rows = await CareTimeline.find({ beneficiaryId: String(beneficiaryId) });
    expect(rows).toHaveLength(1);
    const row = rows[0];
    expect(row.eventType).toBe('red_flag_override_recorded');
    expect(row.category).toBe('quality');
    expect(row.severity).toBe('warning');
    expect(String(row.branchId)).toBe(String(branchId));
    expect(String(row.metadata.overrideId)).toBe(String(doc._id));
    expect(row.metadata.blockingFlagCount).toBe(2);
    expect(row.metadata.overriddenBy).toBe('user-clinician-1');
    expect(row.title).toContain('2 blocking flags');
  });

  it('records a row even when no branch context is present', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();

    await RedFlagOverride.create(override(beneficiaryId, { blockingFlagIds: ['flag-x'] }));
    await new Promise(r => setTimeout(r, 300));

    const rows = await CareTimeline.find({ beneficiaryId: String(beneficiaryId) });
    expect(rows).toHaveLength(1);
    expect(rows[0].metadata.blockingFlagCount).toBe(1);
    expect(rows[0].title).toContain('1 blocking flag');
  });

  it('does not duplicate the row on a later unrelated save', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();

    const doc = await RedFlagOverride.create(override(beneficiaryId));
    await new Promise(r => setTimeout(r, 300));

    // Unrelated mutation — not a new document.
    doc.reason = 'تصحيح صياغة سبب التجاوز السريري';
    await doc.save();
    await new Promise(r => setTimeout(r, 300));

    const rows = await CareTimeline.find({ beneficiaryId: String(beneficiaryId) });
    expect(rows).toHaveLength(1);
  });

  it('emits exactly one row per distinct override', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();

    await RedFlagOverride.create(override(beneficiaryId, { blockingFlagIds: ['a'] }));
    await RedFlagOverride.create(override(beneficiaryId, { blockingFlagIds: ['b'] }));
    await new Promise(r => setTimeout(r, 40));

    const rows = await CareTimeline.find({ beneficiaryId: String(beneficiaryId) });
    expect(rows).toHaveLength(2);
    expect(rows.every(r => r.eventType === 'red_flag_override_recorded')).toBe(true);
  });
});
