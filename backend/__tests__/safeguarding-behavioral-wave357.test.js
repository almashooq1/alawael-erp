'use strict';

/**
 * safeguarding-behavioral-wave357.test.js — behavioral counterpart to
 * `safeguarding-wave357.test.js` (static drift guard). MongoMemoryServer-based.
 *
 * Validates Wave-18 invariants actually fire at save():
 *   - category/subjectKind enum
 *   - subjectKind=beneficiary ⇒ subjectBeneficiaryId
 *   - description required (non-empty)
 *   - severity=critical ⇒ supervisorNotifiedAt (1h SLA at runtime)
 *   - status=substantiated ⇒ outcome='substantiated' + actionPlan
 *   - status=escalated_to_authority ⇒ authorityName + authorityReportedAt
 *   - status=closed ⇒ outcomeSummary + closedBy + closedAt
 *
 * Plus `isCriticalAwaitingSupervisor` virtual + defaults + indexes.
 */

jest.unmock('mongoose');
jest.setTimeout(30000);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let SafeguardingConcern;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w357-behavioral-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  SafeguardingConcern = require('../models/SafeguardingConcern');
  await SafeguardingConcern.init();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await SafeguardingConcern.deleteMany({});
});

function baseDoc(overrides = {}) {
  return {
    subjectKind: 'beneficiary',
    subjectBeneficiaryId: new mongoose.Types.ObjectId(),
    branchId: new mongoose.Types.ObjectId(),
    reportedBy: new mongoose.Types.ObjectId(),
    reportedByName: 'Reporter Name',
    category: 'neglect',
    severity: 'medium',
    description: 'Some described concern with enough detail',
    ...overrides,
  };
}

describe('W357 behavioral — subjectKind invariants', () => {
  it('SAVES with subjectKind=beneficiary + subjectBeneficiaryId', async () => {
    const doc = await SafeguardingConcern.create(baseDoc());
    expect(doc.subjectKind).toBe('beneficiary');
  });

  it('REJECTS subjectKind=beneficiary without subjectBeneficiaryId', async () => {
    const p = new SafeguardingConcern(baseDoc({ subjectBeneficiaryId: undefined }));
    await expect(p.save()).rejects.toThrow(/subjectBeneficiaryId/);
  });

  it('SAVES with subjectKind=staff (no beneficiary id needed)', async () => {
    const doc = await SafeguardingConcern.create(
      baseDoc({ subjectKind: 'staff', subjectBeneficiaryId: undefined, subjectName: 'Staff X' })
    );
    expect(doc.subjectKind).toBe('staff');
  });

  it('REJECTS invalid category', async () => {
    const p = new SafeguardingConcern(baseDoc({ category: 'not_real' }));
    await expect(p.save()).rejects.toThrow();
  });
});

describe('W357 behavioral — description required', () => {
  it('REJECTS empty description', async () => {
    const p = new SafeguardingConcern(baseDoc({ description: '' }));
    await expect(p.save()).rejects.toThrow(/description/);
  });

  it('REJECTS whitespace-only description', async () => {
    const p = new SafeguardingConcern(baseDoc({ description: '   ' }));
    await expect(p.save()).rejects.toThrow(/description/);
  });
});

describe('W357 behavioral — severity=critical SLA invariant', () => {
  it('REJECTS critical severity without supervisorNotifiedAt', async () => {
    const p = new SafeguardingConcern(baseDoc({ severity: 'critical' }));
    await expect(p.save()).rejects.toThrow(/supervisorNotifiedAt/);
  });

  it('SAVES critical severity WITH supervisor notification', async () => {
    const doc = await SafeguardingConcern.create(
      baseDoc({ severity: 'critical', supervisorNotifiedAt: new Date() })
    );
    expect(doc.severity).toBe('critical');
  });
});

describe('W357 behavioral — status=substantiated invariants', () => {
  it('REJECTS substantiated without outcome', async () => {
    const p = new SafeguardingConcern(
      baseDoc({ status: 'substantiated', actionPlan: 'Remove access; retrain.' })
    );
    await expect(p.save()).rejects.toThrow(/outcome/);
  });

  it('REJECTS substantiated without actionPlan', async () => {
    const p = new SafeguardingConcern(
      baseDoc({ status: 'substantiated', outcome: 'substantiated' })
    );
    await expect(p.save()).rejects.toThrow(/actionPlan/);
  });

  it('SAVES substantiated with outcome + actionPlan', async () => {
    const doc = await SafeguardingConcern.create(
      baseDoc({
        status: 'substantiated',
        outcome: 'substantiated',
        actionPlan: 'Remove access; retrain caregivers.',
      })
    );
    expect(doc.status).toBe('substantiated');
  });
});

describe('W357 behavioral — status=escalated_to_authority invariants', () => {
  it('REJECTS escalated without authorityName', async () => {
    const p = new SafeguardingConcern(
      baseDoc({ status: 'escalated_to_authority', authorityReportedAt: new Date() })
    );
    await expect(p.save()).rejects.toThrow(/authorityName/);
  });

  it('REJECTS escalated without authorityReportedAt', async () => {
    const p = new SafeguardingConcern(
      baseDoc({ status: 'escalated_to_authority', authorityName: 'Saudi Child Protection' })
    );
    await expect(p.save()).rejects.toThrow(/authorityReportedAt/);
  });

  it('SAVES escalated with full authority chain', async () => {
    const doc = await SafeguardingConcern.create(
      baseDoc({
        status: 'escalated_to_authority',
        authorityName: 'Saudi Child Protection Authority',
        authorityReportedAt: new Date(),
        authorityReferenceNumber: 'SCPA-2026-001',
      })
    );
    expect(doc.status).toBe('escalated_to_authority');
  });
});

describe('W357 behavioral — status=closed invariants', () => {
  it('REJECTS closed without outcomeSummary', async () => {
    const p = new SafeguardingConcern(
      baseDoc({
        status: 'closed',
        closedByName: 'Supervisor',
        closedAt: new Date(),
      })
    );
    await expect(p.save()).rejects.toThrow(/outcomeSummary/);
  });

  it('REJECTS closed without closer', async () => {
    const p = new SafeguardingConcern(
      baseDoc({
        status: 'closed',
        outcomeSummary: 'Resolved after retraining',
        closedAt: new Date(),
      })
    );
    await expect(p.save()).rejects.toThrow(/closedBy/);
  });

  it('REJECTS closed without closedAt', async () => {
    const p = new SafeguardingConcern(
      baseDoc({
        status: 'closed',
        outcomeSummary: 'Resolved',
        closedByName: 'Supervisor',
      })
    );
    await expect(p.save()).rejects.toThrow(/closedAt/);
  });

  it('SAVES closed with full closure chain', async () => {
    const doc = await SafeguardingConcern.create(
      baseDoc({
        status: 'closed',
        outcomeSummary: 'Resolved after retraining; family notified',
        closedByName: 'Supervisor Khalid',
        closedAt: new Date(),
      })
    );
    expect(doc.status).toBe('closed');
  });
});

describe('W357 behavioral — isCriticalAwaitingSupervisor virtual', () => {
  it('returns false for non-critical severity', async () => {
    const doc = await SafeguardingConcern.create(baseDoc({ severity: 'medium' }));
    expect(doc.isCriticalAwaitingSupervisor).toBe(false);
  });

  it('returns false for critical WITH supervisor notification', async () => {
    const doc = await SafeguardingConcern.create(
      baseDoc({ severity: 'critical', supervisorNotifiedAt: new Date() })
    );
    expect(doc.isCriticalAwaitingSupervisor).toBe(false);
  });
});

describe('W357 behavioral — defaults', () => {
  it('defaults severity=medium, confidentiality=restricted', async () => {
    const doc = await SafeguardingConcern.create(baseDoc({ severity: undefined }));
    expect(doc.severity).toBe('medium');
    expect(doc.confidentiality).toBe('restricted');
    expect(doc.authorityReported).toBe(false);
  });
});

describe('W357 behavioral — indexes', () => {
  it('compound indexes exist for query patterns', async () => {
    const indexes = await SafeguardingConcern.collection.indexes();
    const keys = indexes.map(i => Object.keys(i.key).join('+'));
    expect(keys).toContain('status+severity+reportedAt');
    expect(keys).toContain('subjectBeneficiaryId+reportedAt');
    expect(keys).toContain('branchId+reportedAt');
    expect(keys).toContain('authorityReported+reportedAt');
  });
});
