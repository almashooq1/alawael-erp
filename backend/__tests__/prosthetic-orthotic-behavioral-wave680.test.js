'use strict';

/**
 * prosthetic-orthotic-behavioral-wave680.test.js — behavioral counterpart
 * to `prosthetic-orthotic-wave680.test.js` (static drift guard).
 * MongoMemoryServer-based.
 *
 * Static guards check source-text shape; this asserts runtime behavior:
 *   1. Wave-18 invariants actually fire (category/stage enum,
 *      outsourced⇒vendor, casting⇒castingDate, delivered⇒deliveredDate,
 *      refabricate⇒fittingNotes, cancelled⇒cancelReason,
 *      seating⇒posturalAssessment)
 *   2. isOverdueFollowUp / isActive virtuals compute correctly
 *   3. Defaults (stage=prescribed, laterality=not_applicable,
 *      fabricationType=in_house)
 *   4. Indexes (4 compound) exist
 */

jest.unmock('mongoose');
jest.setTimeout(30000);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let POOrder;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w680-behavioral-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  POOrder = require('../models/ProstheticOrthoticOrder');
  await POOrder.init();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await POOrder.deleteMany({});
});

function baseDoc(overrides = {}) {
  const now = new Date();
  return {
    beneficiaryId: new mongoose.Types.ObjectId(),
    branchId: new mongoose.Types.ObjectId(),
    deviceCategory: 'afo',
    prescribedDate: now,
    ...overrides,
  };
}

describe('W680 behavioral — category/stage enum + defaults', () => {
  it('SAVES with valid category and applies defaults', async () => {
    const doc = await POOrder.create(baseDoc());
    expect(doc.deviceCategory).toBe('afo');
    expect(doc.stage).toBe('prescribed');
    expect(doc.laterality).toBe('not_applicable');
    expect(doc.fabricationType).toBe('in_house');
    expect(doc.castingRequired).toBe(false);
  });

  it('REJECTS unknown deviceCategory', async () => {
    const p = new POOrder(baseDoc({ deviceCategory: 'not_a_device' }));
    await expect(p.save()).rejects.toThrow();
  });
});

describe('W680 behavioral — fabrication invariants', () => {
  it('REJECTS fabricationType=outsourced without vendorName', async () => {
    const p = new POOrder(baseDoc({ fabricationType: 'outsourced' }));
    await expect(p.save()).rejects.toThrow(/vendorName/);
  });

  it('SAVES outsourced with vendorName', async () => {
    const doc = await POOrder.create(
      baseDoc({ fabricationType: 'outsourced', vendorName: 'مصنع الأطراف الوطني' })
    );
    expect(doc.vendorName).toBe('مصنع الأطراف الوطني');
  });

  it('REJECTS castingRequired=true without castingDate', async () => {
    const p = new POOrder(baseDoc({ castingRequired: true }));
    await expect(p.save()).rejects.toThrow(/castingDate/);
  });

  it('SAVES castingRequired with castingDate', async () => {
    const doc = await POOrder.create(baseDoc({ castingRequired: true, castingDate: new Date() }));
    expect(doc.castingRequired).toBe(true);
  });
});

describe('W680 behavioral — stage-gated invariants', () => {
  it('REJECTS stage=delivered without deliveredDate', async () => {
    const p = new POOrder(baseDoc({ stage: 'delivered' }));
    await expect(p.save()).rejects.toThrow(/deliveredDate/);
  });

  it('SAVES stage=delivered with deliveredDate', async () => {
    const doc = await POOrder.create(baseDoc({ stage: 'delivered', deliveredDate: new Date() }));
    expect(doc.stage).toBe('delivered');
  });

  it('REJECTS fitOutcome=refabricate without fittingNotes', async () => {
    const p = new POOrder(baseDoc({ stage: 'fitting', fitOutcome: 'refabricate' }));
    await expect(p.save()).rejects.toThrow(/fittingNotes/);
  });

  it('REJECTS stage=cancelled without cancelReason', async () => {
    const p = new POOrder(baseDoc({ stage: 'cancelled' }));
    await expect(p.save()).rejects.toThrow(/cancelReason/);
  });

  it('SAVES stage=cancelled with cancelReason', async () => {
    const doc = await POOrder.create(
      baseDoc({ stage: 'cancelled', cancelReason: 'انسحب المستفيد' })
    );
    expect(doc.stage).toBe('cancelled');
  });
});

describe('W680 behavioral — wheelchair_seating gate', () => {
  it('REJECTS wheelchair_seating at fitting without posturalAssessment', async () => {
    const p = new POOrder(baseDoc({ deviceCategory: 'wheelchair_seating', stage: 'fitting' }));
    await expect(p.save()).rejects.toThrow(/posturalAssessment/);
  });

  it('SAVES wheelchair_seating at fitting with posturalAssessment', async () => {
    const doc = await POOrder.create(
      baseDoc({
        deviceCategory: 'wheelchair_seating',
        stage: 'fitting',
        posturalAssessment: 'وضعية الجلوس: ميلان حوضي بسيط، يحتاج دعم جانبي',
      })
    );
    expect(doc.deviceCategory).toBe('wheelchair_seating');
  });

  it('ALLOWS wheelchair_seating at prescribed/measured without posturalAssessment', async () => {
    const doc = await POOrder.create(
      baseDoc({ deviceCategory: 'wheelchair_seating', stage: 'measured' })
    );
    expect(doc.stage).toBe('measured');
  });
});

describe('W680 behavioral — isOverdueFollowUp / isActive virtuals', () => {
  it('isOverdueFollowUp false when no followUpDueDate', async () => {
    const doc = await POOrder.create(baseDoc({ stage: 'delivered', deliveredDate: new Date() }));
    expect(doc.isOverdueFollowUp).toBe(false);
    expect(doc.isActive).toBe(true);
  });

  it('isOverdueFollowUp true when due date is past and stage active', async () => {
    const past = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const doc = await POOrder.create(
      baseDoc({ stage: 'follow_up', deliveredDate: new Date(), followUpDueDate: past })
    );
    expect(doc.isOverdueFollowUp).toBe(true);
  });

  it('isOverdueFollowUp false when terminal even if due date past', async () => {
    const past = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const doc = await POOrder.create(
      baseDoc({
        stage: 'completed',
        deliveredDate: new Date(),
        completedDate: new Date(),
        followUpDueDate: past,
      })
    );
    expect(doc.isOverdueFollowUp).toBe(false);
    expect(doc.isActive).toBe(false);
  });
});

describe('W680 behavioral — indexes', () => {
  it('compound indexes exist for query patterns', async () => {
    const indexes = await POOrder.collection.indexes();
    const keys = indexes.map(i => Object.keys(i.key).join('+'));
    expect(keys).toContain('beneficiaryId+prescribedDate');
    expect(keys).toContain('branchId+stage');
    expect(keys).toContain('stage+followUpDueDate');
    expect(keys).toContain('deviceCategory+prescribedDate');
  });
});
