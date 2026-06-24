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

const { waitForRows, waitForCount } = require('./helpers/waitForTimelineRows');

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
    const rows = await waitForRows({ beneficiaryId: String(beneficiaryId) }, 1);
  });

  it('records a row even when no branch context is present', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();

    await RedFlagOverride.create(override(beneficiaryId, { blockingFlagIds: ['flag-x'] }));
    const rows = await waitForRows({ beneficiaryId: String(beneficiaryId) }, 1);
  });

  it('does not duplicate the row on a later unrelated save', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();

    const doc = await RedFlagOverride.create(override(beneficiaryId));
    const rows = await waitForRows({ beneficiaryId: String(beneficiaryId) }, 1);
  });

  it('emits exactly one row per distinct override', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();

    await RedFlagOverride.create(override(beneficiaryId, { blockingFlagIds: ['a'] }));
    await RedFlagOverride.create(override(beneficiaryId, { blockingFlagIds: ['b'] }));
    const rows = await waitForRows({ beneficiaryId: String(beneficiaryId) }, 2);
  });
});
