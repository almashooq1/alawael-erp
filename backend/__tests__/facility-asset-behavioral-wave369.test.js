'use strict';

/**
 * facility-asset-behavioral-wave369.test.js — behavioral counterpart to
 * `facility-asset-wave369.test.js` (static drift guard). MongoMemoryServer-based.
 *
 * Validates Wave-18 invariants:
 *   - category enum (26 categories: elevators, lifts, ramps, HVAC, fire, water,
 *     power, medical gas, therapy spaces, security, etc.)
 *   - status enum (5: in_service/inspection_failed/maintenance/out_of_service/retired)
 *   - criticality enum (low/medium/high/life_safety)
 *   - assetTag + name required non-empty
 *   - status=out_of_service ⇒ outOfServiceReason + outOfServiceSince
 *   - status=retired ⇒ retiredAt + retirementReason
 *   - status=inspection_failed ⇒ at least one inspection w/ outcome=fail + defectsFound[]
 *   - inspections[] entries: kind + performedAt + outcome required
 *   - inspection outcome=fail ⇒ defectsFound[]
 *   - certificates[] if any field set ⇒ number + issuingAuthority + expiresAt
 *   - (assetTag, branchId) unique
 *
 * Plus `isInspectionOverdue`, `isMaintenanceOverdue`, `hasExpiredCertificate` virtuals.
 */

jest.unmock('mongoose');
jest.setTimeout(30000);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let FacilityAsset;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w369-behavioral-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  FacilityAsset = require('../models/FacilityAsset');
  await FacilityAsset.init();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await FacilityAsset.deleteMany({});
});

let tagCounter = 0;
function baseDoc(overrides = {}) {
  tagCounter++;
  return {
    assetTag: `FA-${tagCounter}-${Date.now()}`,
    name: 'Main building elevator A',
    category: 'elevator',
    branchId: new mongoose.Types.ObjectId(),
    ...overrides,
  };
}

describe('W369 behavioral — identity invariants + uniqueness', () => {
  it('SAVES with required fields', async () => {
    const doc = await FacilityAsset.create(baseDoc());
    expect(doc.status).toBe('in_service');
    expect(doc.criticality).toBe('medium');
  });

  it('REJECTS duplicate (assetTag, branchId)', async () => {
    const bid = new mongoose.Types.ObjectId();
    const tag = `DUP-${Date.now()}`;
    await FacilityAsset.create(baseDoc({ assetTag: tag, branchId: bid }));
    await expect(FacilityAsset.create(baseDoc({ assetTag: tag, branchId: bid }))).rejects.toThrow();
  });

  it('ALLOWS same assetTag across different branches', async () => {
    const tag = `XB-${Date.now()}`;
    await FacilityAsset.create(baseDoc({ assetTag: tag }));
    const doc2 = await FacilityAsset.create(baseDoc({ assetTag: tag }));
    expect(doc2.assetTag).toBe(tag);
  });

  it('REJECTS empty assetTag', async () => {
    const p = new FacilityAsset(baseDoc({ assetTag: '   ' }));
    await expect(p.save()).rejects.toThrow();
  });

  it('REJECTS empty name', async () => {
    const p = new FacilityAsset(baseDoc({ name: '' }));
    await expect(p.save()).rejects.toThrow();
  });
});

describe('W369 behavioral — enums', () => {
  it('REJECTS invalid category', async () => {
    const p = new FacilityAsset(baseDoc({ category: 'not_a_category' }));
    await expect(p.save()).rejects.toThrow();
  });

  it('REJECTS invalid criticality', async () => {
    const p = new FacilityAsset(baseDoc({ criticality: 'extreme' }));
    await expect(p.save()).rejects.toThrow();
  });

  it('SAVES life_safety criticality', async () => {
    const doc = await FacilityAsset.create(
      baseDoc({ category: 'fire_alarm_panel', criticality: 'life_safety' })
    );
    expect(doc.criticality).toBe('life_safety');
  });
});

describe('W369 behavioral — status=out_of_service invariants', () => {
  it('REJECTS out_of_service without reason', async () => {
    const p = new FacilityAsset(
      baseDoc({ status: 'out_of_service', outOfServiceSince: new Date() })
    );
    await expect(p.save()).rejects.toThrow(/outOfServiceReason/);
  });

  it('REJECTS out_of_service without since', async () => {
    const p = new FacilityAsset(
      baseDoc({ status: 'out_of_service', outOfServiceReason: 'pending parts' })
    );
    await expect(p.save()).rejects.toThrow(/outOfServiceSince/);
  });

  it('SAVES out_of_service with both', async () => {
    const doc = await FacilityAsset.create(
      baseDoc({
        status: 'out_of_service',
        outOfServiceReason: 'awaiting replacement parts',
        outOfServiceSince: new Date(),
      })
    );
    expect(doc.status).toBe('out_of_service');
  });
});

describe('W369 behavioral — status=retired invariants', () => {
  it('REJECTS retired without retiredAt', async () => {
    const p = new FacilityAsset(baseDoc({ status: 'retired', retirementReason: 'replaced' }));
    await expect(p.save()).rejects.toThrow(/retiredAt/);
  });

  it('REJECTS retired without retirementReason', async () => {
    const p = new FacilityAsset(baseDoc({ status: 'retired', retiredAt: new Date() }));
    await expect(p.save()).rejects.toThrow(/retirementReason/);
  });

  it('SAVES retired with both', async () => {
    const doc = await FacilityAsset.create(
      baseDoc({
        status: 'retired',
        retiredAt: new Date(),
        retirementReason: 'replaced with newer model',
      })
    );
    expect(doc.status).toBe('retired');
  });
});

describe('W369 behavioral — status=inspection_failed invariant', () => {
  it('REJECTS inspection_failed without a fail inspection', async () => {
    const p = new FacilityAsset(baseDoc({ status: 'inspection_failed' }));
    await expect(p.save()).rejects.toThrow(/inspections/);
  });

  it('REJECTS inspection_failed when fail-outcome has no defectsFound', async () => {
    const p = new FacilityAsset(
      baseDoc({
        status: 'inspection_failed',
        inspections: [
          {
            kind: 'regulatory_annual',
            performedAt: new Date(),
            outcome: 'fail',
            defectsFound: [],
          },
        ],
      })
    );
    await expect(p.save()).rejects.toThrow();
  });

  it('SAVES inspection_failed with fail inspection + defects', async () => {
    const doc = await FacilityAsset.create(
      baseDoc({
        status: 'inspection_failed',
        inspections: [
          {
            kind: 'regulatory_annual',
            performedAt: new Date(),
            outcome: 'fail',
            defectsFound: ['Door sensor misaligned', 'Emergency button unresponsive'],
          },
        ],
      })
    );
    expect(doc.status).toBe('inspection_failed');
  });
});

describe('W369 behavioral — inspections[] integrity', () => {
  it('REJECTS inspection with invalid kind', async () => {
    const p = new FacilityAsset(
      baseDoc({
        inspections: [{ kind: 'not_real', performedAt: new Date(), outcome: 'pass' }],
      })
    );
    await expect(p.save()).rejects.toThrow();
  });

  it('REJECTS inspection with invalid outcome', async () => {
    const p = new FacilityAsset(
      baseDoc({
        inspections: [{ kind: 'regulatory_annual', performedAt: new Date(), outcome: 'maybe' }],
      })
    );
    await expect(p.save()).rejects.toThrow();
  });

  it('SAVES inspections array with valid entries', async () => {
    const doc = await FacilityAsset.create(
      baseDoc({
        inspections: [
          { kind: 'safety_check', performedAt: new Date(), outcome: 'pass' },
          {
            kind: 'preventive_maintenance',
            performedAt: new Date(),
            outcome: 'pass_with_observations',
          },
        ],
      })
    );
    expect(doc.inspections).toHaveLength(2);
  });
});

describe('W369 behavioral — certificates[] all-or-nothing', () => {
  it('REJECTS certificate with number but missing issuingAuthority', async () => {
    const p = new FacilityAsset(
      baseDoc({
        certificates: [{ number: 'CD-2026-001', expiresAt: new Date() }],
      })
    );
    await expect(p.save()).rejects.toThrow(/issuingAuthority/);
  });

  it('REJECTS certificate with number+authority but missing expiresAt', async () => {
    const p = new FacilityAsset(
      baseDoc({
        certificates: [{ number: 'CD-2026-001', issuingAuthority: 'Civil Defence' }],
      })
    );
    await expect(p.save()).rejects.toThrow(/expiresAt/);
  });

  it('SAVES certificate with full chain', async () => {
    const doc = await FacilityAsset.create(
      baseDoc({
        certificates: [
          {
            number: 'CD-2026-001',
            issuingAuthority: 'Saudi Civil Defence',
            expiresAt: new Date(Date.now() + 365 * 86400 * 1000),
          },
        ],
      })
    );
    expect(doc.certificates).toHaveLength(1);
  });

  it('SAVES with empty certificates[]', async () => {
    const doc = await FacilityAsset.create(baseDoc());
    expect(doc.certificates).toEqual([]);
  });
});

describe('W369 behavioral — virtuals', () => {
  it('isInspectionOverdue=true when in_service + nextInspectionDue past', async () => {
    const doc = await FacilityAsset.create(
      baseDoc({ nextInspectionDue: new Date(Date.now() - 86400 * 1000) })
    );
    expect(doc.isInspectionOverdue).toBe(true);
  });

  it('isInspectionOverdue=false when retired (gate by status)', async () => {
    const doc = await FacilityAsset.create(
      baseDoc({
        status: 'retired',
        retiredAt: new Date(),
        retirementReason: 'replaced',
        nextInspectionDue: new Date(Date.now() - 86400 * 1000),
      })
    );
    expect(doc.isInspectionOverdue).toBe(false);
  });

  it('isMaintenanceOverdue=true when in_service + past due', async () => {
    const doc = await FacilityAsset.create(
      baseDoc({ nextMaintenanceDue: new Date(Date.now() - 86400 * 1000) })
    );
    expect(doc.isMaintenanceOverdue).toBe(true);
  });

  it('hasExpiredCertificate=true when at least one expired', async () => {
    const doc = await FacilityAsset.create(
      baseDoc({
        certificates: [
          {
            number: 'OLD-001',
            issuingAuthority: 'Civil Defence',
            expiresAt: new Date(Date.now() - 86400 * 1000),
          },
          {
            number: 'NEW-001',
            issuingAuthority: 'Civil Defence',
            expiresAt: new Date(Date.now() + 365 * 86400 * 1000),
          },
        ],
      })
    );
    expect(doc.hasExpiredCertificate).toBe(true);
  });

  it('hasExpiredCertificate=false when all valid', async () => {
    const doc = await FacilityAsset.create(
      baseDoc({
        certificates: [
          {
            number: 'NEW-001',
            issuingAuthority: 'Civil Defence',
            expiresAt: new Date(Date.now() + 365 * 86400 * 1000),
          },
        ],
      })
    );
    expect(doc.hasExpiredCertificate).toBe(false);
  });

  it('hasExpiredCertificate=false with no certificates', async () => {
    const doc = await FacilityAsset.create(baseDoc());
    expect(doc.hasExpiredCertificate).toBe(false);
  });
});

describe('W369 behavioral — defaults', () => {
  it('defaults status=in_service, criticality=medium, installationCost=0', async () => {
    const doc = await FacilityAsset.create(baseDoc());
    expect(doc.status).toBe('in_service');
    expect(doc.criticality).toBe('medium');
    expect(doc.installationCost).toBe(0);
    expect(doc.inspections).toEqual([]);
    expect(doc.certificates).toEqual([]);
  });
});
