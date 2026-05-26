'use strict';

/**
 * diet-prescription-behavioral-wave368.test.js — behavioral counterpart to
 * `diet-prescription-wave368.test.js` (static drift guard). MongoMemoryServer-based.
 *
 * Validates Wave-18 invariants:
 *   - status=active ⇒ NPO OR IDDSI levels OR enteral feeding active
 *   - NPO=true ⇒ no IDDSI levels + npoStartedAt + npoReason
 *   - enteralFeeding.active ⇒ route + formulaName
 *   - enteralFeeding continuous ⇒ ratePerHour
 *   - status=active ⇒ prescribedBy + prescribedAt + prescriberDiscipline + nextReviewDue
 *   - allergensToAvoid[] ⊆ ALLERGENS whitelist
 *   - status=discontinued ⇒ discontinuationReason
 *   - singleton per beneficiary (unique index)
 *
 * Plus `reviewOverdue` + `isEnteral` virtuals.
 */

jest.unmock('mongoose');
jest.setTimeout(30000);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let BeneficiaryDietPrescription;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w368-behavioral-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  BeneficiaryDietPrescription = require('../models/BeneficiaryDietPrescription');
  await BeneficiaryDietPrescription.init();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await BeneficiaryDietPrescription.deleteMany({});
});

function baseDoc(overrides = {}) {
  return {
    beneficiaryId: new mongoose.Types.ObjectId(),
    branchId: new mongoose.Types.ObjectId(),
    ...overrides,
  };
}

function activeOralBase(overrides = {}) {
  return {
    beneficiaryId: new mongoose.Types.ObjectId(),
    branchId: new mongoose.Types.ObjectId(),
    status: 'active',
    foodIddsiLevel: 5,
    drinkIddsiLevel: 2,
    prescribedByName: 'د. أحمد (RD)',
    prescribedAt: new Date(),
    prescriberDiscipline: 'registered_dietitian',
    nextReviewDue: new Date(Date.now() + 30 * 86400 * 1000),
    ...overrides,
  };
}

describe('W368 behavioral — singleton per beneficiary', () => {
  it('SAVES one prescription per beneficiary', async () => {
    const doc = await BeneficiaryDietPrescription.create(baseDoc());
    expect(doc.status).toBe('draft');
  });

  it('REJECTS second prescription for same beneficiary', async () => {
    const bid = new mongoose.Types.ObjectId();
    await BeneficiaryDietPrescription.create(baseDoc({ beneficiaryId: bid }));
    await expect(
      BeneficiaryDietPrescription.create(baseDoc({ beneficiaryId: bid }))
    ).rejects.toThrow();
  });
});

describe('W368 behavioral — status=active needs feeding mode', () => {
  it('REJECTS active with neither NPO nor IDDSI nor enteral', async () => {
    const p = new BeneficiaryDietPrescription(
      activeOralBase({ foodIddsiLevel: null, drinkIddsiLevel: null })
    );
    await expect(p.save()).rejects.toThrow(/foodIddsiLevel/);
  });

  it('SAVES active with IDDSI levels', async () => {
    const doc = await BeneficiaryDietPrescription.create(activeOralBase());
    expect(doc.status).toBe('active');
  });
});

describe('W368 behavioral — NPO state integrity', () => {
  it('REJECTS NPO=true with IDDSI levels set', async () => {
    const p = new BeneficiaryDietPrescription(
      activeOralBase({
        npo: true,
        npoStartedAt: new Date(),
        npoReason: 'pre-op',
      })
    );
    await expect(p.save()).rejects.toThrow(/foodIddsiLevel/);
  });

  it('REJECTS NPO=true without npoStartedAt', async () => {
    const p = new BeneficiaryDietPrescription(
      activeOralBase({
        npo: true,
        foodIddsiLevel: null,
        drinkIddsiLevel: null,
        npoReason: 'pre-op',
      })
    );
    await expect(p.save()).rejects.toThrow(/npoStartedAt/);
  });

  it('REJECTS NPO=true without npoReason', async () => {
    const p = new BeneficiaryDietPrescription(
      activeOralBase({
        npo: true,
        foodIddsiLevel: null,
        drinkIddsiLevel: null,
        npoStartedAt: new Date(),
      })
    );
    await expect(p.save()).rejects.toThrow(/npoReason/);
  });

  it('SAVES NPO=true with full chain', async () => {
    const doc = await BeneficiaryDietPrescription.create(
      activeOralBase({
        npo: true,
        foodIddsiLevel: null,
        drinkIddsiLevel: null,
        npoStartedAt: new Date(),
        npoReason: 'pre-op fasting per anesthesia',
      })
    );
    expect(doc.npo).toBe(true);
  });
});

describe('W368 behavioral — enteralFeeding integrity', () => {
  it('REJECTS enteral active without route', async () => {
    const p = new BeneficiaryDietPrescription(
      activeOralBase({
        foodIddsiLevel: null,
        drinkIddsiLevel: null,
        enteralFeeding: {
          active: true,
          formulaName: 'PediaSure 1.0',
        },
      })
    );
    await expect(p.save()).rejects.toThrow(/route/);
  });

  it('REJECTS enteral active without formulaName', async () => {
    const p = new BeneficiaryDietPrescription(
      activeOralBase({
        foodIddsiLevel: null,
        drinkIddsiLevel: null,
        enteralFeeding: { active: true, route: 'gt' },
      })
    );
    await expect(p.save()).rejects.toThrow(/formulaName/);
  });

  it('REJECTS enteral continuous without ratePerHour', async () => {
    const p = new BeneficiaryDietPrescription(
      activeOralBase({
        foodIddsiLevel: null,
        drinkIddsiLevel: null,
        enteralFeeding: {
          active: true,
          route: 'gt',
          formulaName: 'PediaSure 1.0',
          deliveryMode: 'continuous',
        },
      })
    );
    await expect(p.save()).rejects.toThrow(/ratePerHour/);
  });

  it('SAVES enteral continuous with full chain', async () => {
    const doc = await BeneficiaryDietPrescription.create(
      activeOralBase({
        foodIddsiLevel: null,
        drinkIddsiLevel: null,
        enteralFeeding: {
          active: true,
          route: 'gt',
          formulaName: 'PediaSure 1.0',
          deliveryMode: 'continuous',
          ratePerHour: 75,
        },
      })
    );
    expect(doc.enteralFeeding.active).toBe(true);
  });
});

describe('W368 behavioral — prescriber audit when active', () => {
  it('REJECTS active without prescriber', async () => {
    const p = new BeneficiaryDietPrescription(activeOralBase({ prescribedByName: '' }));
    await expect(p.save()).rejects.toThrow(/prescribedBy/);
  });

  it('REJECTS active without nextReviewDue', async () => {
    const p = new BeneficiaryDietPrescription(activeOralBase({ nextReviewDue: null }));
    await expect(p.save()).rejects.toThrow(/nextReviewDue/);
  });

  it('REJECTS active without prescriberDiscipline', async () => {
    const p = new BeneficiaryDietPrescription(activeOralBase({ prescriberDiscipline: null }));
    await expect(p.save()).rejects.toThrow(/prescriberDiscipline/);
  });
});

describe('W368 behavioral — allergens whitelist', () => {
  it('REJECTS unknown allergen', async () => {
    const p = new BeneficiaryDietPrescription(
      activeOralBase({ allergensToAvoid: ['gluten', 'unicorn_dander'] })
    );
    await expect(p.save()).rejects.toThrow(/allergensToAvoid/);
  });

  it('SAVES with valid allergens from whitelist', async () => {
    const doc = await BeneficiaryDietPrescription.create(
      activeOralBase({ allergensToAvoid: ['gluten', 'dairy', 'nuts'] })
    );
    expect(doc.allergensToAvoid).toContain('dairy');
  });
});

describe('W368 behavioral — discontinued invariant', () => {
  it('REJECTS discontinued without reason', async () => {
    const p = new BeneficiaryDietPrescription(baseDoc({ status: 'discontinued' }));
    await expect(p.save()).rejects.toThrow(/discontinuationReason/);
  });

  it('SAVES discontinued with reason', async () => {
    const doc = await BeneficiaryDietPrescription.create(
      baseDoc({ status: 'discontinued', discontinuationReason: 'beneficiary discharged' })
    );
    expect(doc.status).toBe('discontinued');
  });
});

describe('W368 behavioral — virtuals', () => {
  it('reviewOverdue=true when active + nextReviewDue in past', async () => {
    const doc = await BeneficiaryDietPrescription.create(
      activeOralBase({ nextReviewDue: new Date(Date.now() - 86400 * 1000) })
    );
    expect(doc.reviewOverdue).toBe(true);
  });

  it('reviewOverdue=false when draft (gate by status=active)', async () => {
    const doc = await BeneficiaryDietPrescription.create(
      baseDoc({ nextReviewDue: new Date(Date.now() - 86400 * 1000) })
    );
    expect(doc.reviewOverdue).toBe(false);
  });

  it('isEnteral=true when enteralFeeding.active', async () => {
    const doc = await BeneficiaryDietPrescription.create(
      activeOralBase({
        foodIddsiLevel: null,
        drinkIddsiLevel: null,
        enteralFeeding: {
          active: true,
          route: 'gt',
          formulaName: 'PediaSure 1.0',
          deliveryMode: 'bolus',
        },
      })
    );
    expect(doc.isEnteral).toBe(true);
  });

  it('isEnteral=false by default', async () => {
    const doc = await BeneficiaryDietPrescription.create(baseDoc());
    expect(doc.isEnteral).toBe(false);
  });
});

describe('W368 behavioral — defaults', () => {
  it('defaults status=draft, npo=false', async () => {
    const doc = await BeneficiaryDietPrescription.create(baseDoc());
    expect(doc.status).toBe('draft');
    expect(doc.npo).toBe(false);
    expect(doc.allergensToAvoid).toEqual([]);
  });
});
