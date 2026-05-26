'use strict';

/**
 * assistive-device-behavioral-wave359.test.js — behavioral counterpart to
 * `assistive-device-wave359.test.js` (static drift guard). MongoMemoryServer-based.
 *
 * Validates Wave-18 invariants:
 *   - category enum (12 categories), availability enum (4)
 *   - assetTag + name required (non-empty)
 *   - availability=loaned ⇒ currentLoaneeId + currentLoanStartedAt
 *   - availability=available ⇒ currentLoaneeId is null
 *   - availability=maintenance ⇒ inMaintenanceSince
 *   - availability=retired ⇒ retiredAt + retirementReason
 *   - loans[] entries: beneficiaryId + status + startedAt required
 *   - maintenance[] entries: kind + performedAt required
 *   - assetTag + branchId compound unique
 *
 * Plus `isLoanOverdue` + `isMaintenanceOverdue` virtuals.
 */

jest.unmock('mongoose');
jest.setTimeout(30000);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let AssistiveDevice;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w359-behavioral-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  AssistiveDevice = require('../models/AssistiveDevice');
  await AssistiveDevice.init();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await AssistiveDevice.deleteMany({});
});

let tagCounter = 0;
function baseDoc(overrides = {}) {
  tagCounter++;
  return {
    assetTag: `AD-${tagCounter}-${Date.now()}`,
    name: 'Wheelchair Manual',
    category: 'wheelchair',
    branchId: new mongoose.Types.ObjectId(),
    ...overrides,
  };
}

describe('W359 behavioral — assetTag + branchId unique', () => {
  it('SAVES with unique assetTag', async () => {
    const doc = await AssistiveDevice.create(baseDoc());
    expect(doc.availability).toBe('available');
  });

  it('REJECTS duplicate assetTag+branchId combo', async () => {
    const bid = new mongoose.Types.ObjectId();
    const tag = `DUP-${Date.now()}`;
    await AssistiveDevice.create(baseDoc({ assetTag: tag, branchId: bid }));
    await expect(
      AssistiveDevice.create(baseDoc({ assetTag: tag, branchId: bid }))
    ).rejects.toThrow();
  });

  it('REJECTS empty assetTag', async () => {
    const p = new AssistiveDevice(baseDoc({ assetTag: '   ' }));
    await expect(p.save()).rejects.toThrow(/assetTag/);
  });

  it('REJECTS empty name', async () => {
    const p = new AssistiveDevice(baseDoc({ name: '' }));
    await expect(p.save()).rejects.toThrow();
  });
});

describe('W359 behavioral — availability=loaned invariants', () => {
  it('REJECTS loaned without currentLoaneeId', async () => {
    const p = new AssistiveDevice(
      baseDoc({ availability: 'loaned', currentLoanStartedAt: new Date() })
    );
    await expect(p.save()).rejects.toThrow(/currentLoaneeId/);
  });

  it('REJECTS loaned without currentLoanStartedAt', async () => {
    const p = new AssistiveDevice(
      baseDoc({ availability: 'loaned', currentLoaneeId: new mongoose.Types.ObjectId() })
    );
    await expect(p.save()).rejects.toThrow(/currentLoanStartedAt/);
  });

  it('SAVES loaned with full chain', async () => {
    const doc = await AssistiveDevice.create(
      baseDoc({
        availability: 'loaned',
        currentLoaneeId: new mongoose.Types.ObjectId(),
        currentLoanStartedAt: new Date(),
      })
    );
    expect(doc.availability).toBe('loaned');
  });
});

describe('W359 behavioral — availability=available cleanup invariant', () => {
  it('REJECTS available WITH currentLoaneeId (must be null)', async () => {
    const p = new AssistiveDevice(
      baseDoc({ availability: 'available', currentLoaneeId: new mongoose.Types.ObjectId() })
    );
    await expect(p.save()).rejects.toThrow(/currentLoaneeId/);
  });
});

describe('W359 behavioral — maintenance/retired invariants', () => {
  it('REJECTS maintenance without inMaintenanceSince', async () => {
    const p = new AssistiveDevice(baseDoc({ availability: 'maintenance' }));
    await expect(p.save()).rejects.toThrow(/inMaintenanceSince/);
  });

  it('SAVES maintenance with inMaintenanceSince', async () => {
    const doc = await AssistiveDevice.create(
      baseDoc({ availability: 'maintenance', inMaintenanceSince: new Date() })
    );
    expect(doc.availability).toBe('maintenance');
  });

  it('REJECTS retired without retiredAt', async () => {
    const p = new AssistiveDevice(
      baseDoc({ availability: 'retired', retirementReason: 'beyond repair' })
    );
    await expect(p.save()).rejects.toThrow(/retiredAt/);
  });

  it('REJECTS retired without retirementReason', async () => {
    const p = new AssistiveDevice(baseDoc({ availability: 'retired', retiredAt: new Date() }));
    await expect(p.save()).rejects.toThrow(/retirementReason/);
  });

  it('SAVES retired with both', async () => {
    const doc = await AssistiveDevice.create(
      baseDoc({
        availability: 'retired',
        retiredAt: new Date(),
        retirementReason: 'beyond economical repair',
      })
    );
    expect(doc.availability).toBe('retired');
  });
});

describe('W359 behavioral — loans[] + maintenance[] integrity', () => {
  it('REJECTS loan without beneficiaryId', async () => {
    const p = new AssistiveDevice(
      baseDoc({
        loans: [{ status: 'requested', startedAt: new Date() }],
      })
    );
    await expect(p.save()).rejects.toThrow(/beneficiaryId/);
  });

  it('REJECTS loan with invalid status', async () => {
    const p = new AssistiveDevice(
      baseDoc({
        loans: [
          {
            beneficiaryId: new mongoose.Types.ObjectId(),
            status: 'not_real',
            startedAt: new Date(),
          },
        ],
      })
    );
    await expect(p.save()).rejects.toThrow();
  });

  it('REJECTS maintenance entry with invalid kind', async () => {
    const p = new AssistiveDevice(
      baseDoc({
        maintenance: [{ kind: 'not_real', performedAt: new Date() }],
      })
    );
    await expect(p.save()).rejects.toThrow();
  });

  it('SAVES with valid loans[] + maintenance[] entries', async () => {
    const doc = await AssistiveDevice.create(
      baseDoc({
        loans: [
          {
            beneficiaryId: new mongoose.Types.ObjectId(),
            status: 'returned',
            startedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        ],
        maintenance: [{ kind: 'preventive', performedAt: new Date() }],
      })
    );
    expect(doc.loans).toHaveLength(1);
    expect(doc.maintenance).toHaveLength(1);
  });
});

describe('W359 behavioral — virtuals', () => {
  it('isLoanOverdue=false when not loaned', async () => {
    const doc = await AssistiveDevice.create(baseDoc());
    expect(doc.isLoanOverdue).toBe(false);
  });

  it('isLoanOverdue=true when loaned + expectedReturnAt in past', async () => {
    const doc = await AssistiveDevice.create(
      baseDoc({
        availability: 'loaned',
        currentLoaneeId: new mongoose.Types.ObjectId(),
        currentLoanStartedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        currentLoanExpectedReturnAt: new Date(Date.now() - 1000),
      })
    );
    expect(doc.isLoanOverdue).toBe(true);
  });

  it('isMaintenanceOverdue=true when nextMaintenanceDue in past', async () => {
    const doc = await AssistiveDevice.create(
      baseDoc({ nextMaintenanceDue: new Date(Date.now() - 1000) })
    );
    expect(doc.isMaintenanceOverdue).toBe(true);
  });

  it('isMaintenanceOverdue=false when null', async () => {
    const doc = await AssistiveDevice.create(baseDoc());
    expect(doc.isMaintenanceOverdue).toBe(false);
  });
});

describe('W359 behavioral — defaults', () => {
  it('defaults availability=available, currentCondition=good, acquisitionCost=0', async () => {
    const doc = await AssistiveDevice.create(baseDoc());
    expect(doc.availability).toBe('available');
    expect(doc.currentCondition).toBe('good');
    expect(doc.acquisitionCost).toBe(0);
    expect(doc.loans).toEqual([]);
    expect(doc.maintenance).toEqual([]);
  });
});
