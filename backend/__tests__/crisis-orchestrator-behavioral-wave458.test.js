'use strict';

/**
 * crisis-orchestrator-behavioral-wave458.test.js — behavioral counterpart
 * to the static-analysis drift guard `crisis-orchestrator-wave458.test.js`.
 *
 * The static guard checks SOURCE TEXT (regex matches against EmergencyPlan.js
 * + CrisisIncident.js + crisisOrchestrator.service.js) but cannot catch
 * behavioral bugs: a Wave-18 invariant whose regex looks right but whose
 * conditional path never fires at runtime, an enum that names the wrong value,
 * or an index that's declared but not created. This file fills that gap by
 * instantiating both models against an in-memory MongoDB and asserting actual
 * save/save-rejection behavior + virtuals + indexes.
 *
 * Pairs the W356-W384 doctrine (CLAUDE.md): "Pair every static drift guard
 * with a behavioral counterpart" — proven 11× in the W356-W384 series.
 *
 * Run: cd backend && npx jest --config=jest.config.js __tests__/crisis-orchestrator-behavioral-wave458.test.js --runInBand
 */

jest.unmock('mongoose');
jest.setTimeout(30000);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let EmergencyPlan;
let CrisisIncident;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w458-behavioral-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  // Load the Mongoose 9 legacy-hook compat shim BEFORE requiring any model
  // that declares `pre('save', function (next) { ...next(); })` style hooks
  // (both W458 models do). Without the shim, Mongoose 9 calls those hooks
  // without a `next` argument and they throw `TypeError: next is not a
  // function` on every save. Production loads this via server.js:40.
  require('../config/mongoose.plugins');
  EmergencyPlan = require('../models/EmergencyPlan');
  CrisisIncident = require('../models/CrisisIncident');
  await EmergencyPlan.init();
  await CrisisIncident.init();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await EmergencyPlan.deleteMany({});
  await CrisisIncident.deleteMany({});
});

// ─── Fixtures ─────────────────────────────────────────────────────────

const oid = () => new mongoose.Types.ObjectId();

function basePlan(overrides = {}) {
  return {
    beneficiaryId: oid(),
    branchId: oid(),
    ...overrides,
  };
}

function baseIncident(overrides = {}) {
  return {
    beneficiaryId: oid(),
    branchId: oid(),
    crisisType: 'medical_seizure',
    severity: 'urgent',
    occurredAt: new Date(),
    reportedBy: oid(),
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// EmergencyPlan
// ═══════════════════════════════════════════════════════════════════════

describe('W458 behavioral — EmergencyPlan required-field invariants', () => {
  it('REJECTS without beneficiaryId', async () => {
    const p = new EmergencyPlan({ branchId: oid() });
    await expect(p.save()).rejects.toThrow(/beneficiaryId/);
  });

  it('REJECTS without branchId', async () => {
    const p = new EmergencyPlan({ beneficiaryId: oid() });
    await expect(p.save()).rejects.toThrow(/branchId/);
  });

  it('SAVES with both refs present (defaults populate)', async () => {
    const doc = await EmergencyPlan.create(basePlan());
    expect(doc.status).toBe('active');
    expect(doc.knownConditions).toEqual([]);
    expect(doc.escalationChain).toEqual([]);
    expect(doc.emergencyContacts).toEqual([]);
    expect(doc.reviewCadenceMonths).toBe(6);
  });
});

describe('W458 behavioral — EmergencyPlan beneficiaryId uniqueness', () => {
  it('REJECTS second plan for the same beneficiaryId (E11000)', async () => {
    const benId = oid();
    await EmergencyPlan.create(basePlan({ beneficiaryId: benId }));
    await expect(EmergencyPlan.create(basePlan({ beneficiaryId: benId }))).rejects.toThrow(
      /E11000|duplicate/i
    );
  });
});

describe('W458 behavioral — EmergencyPlan primary-contact invariant', () => {
  it('SAVES when at most one contact is isPrimary', async () => {
    const doc = await EmergencyPlan.create(
      basePlan({
        emergencyContacts: [
          { name: 'أم المستفيد', relationship: 'أم', isPrimary: true },
          { name: 'أب المستفيد', relationship: 'أب', isPrimary: false },
        ],
      })
    );
    expect(doc.emergencyContacts).toHaveLength(2);
  });

  it('REJECTS when two contacts both isPrimary:true', async () => {
    const p = new EmergencyPlan(
      basePlan({
        emergencyContacts: [
          { name: 'أم المستفيد', relationship: 'أم', isPrimary: true },
          { name: 'أخت المستفيد', relationship: 'أخت', isPrimary: true },
        ],
      })
    );
    await expect(p.save()).rejects.toThrow(/at most one contact may have isPrimary/);
  });
});

describe('W458 behavioral — EmergencyPlan auto-fill nextReviewDue', () => {
  it('SETS nextReviewDue from lastReviewedAt + reviewCadenceMonths on save', async () => {
    const reviewDate = new Date('2026-01-15T00:00:00Z');
    const doc = await EmergencyPlan.create(
      basePlan({ lastReviewedAt: reviewDate, reviewCadenceMonths: 6 })
    );
    expect(doc.nextReviewDue).toBeInstanceOf(Date);
    const expected = new Date(reviewDate);
    expected.setMonth(expected.getMonth() + 6);
    expect(doc.nextReviewDue.toISOString()).toBe(expected.toISOString());
  });

  it('does NOT override nextReviewDue when explicitly provided', async () => {
    const reviewDate = new Date('2026-01-15T00:00:00Z');
    const explicitDue = new Date('2026-07-01T00:00:00Z');
    const doc = await EmergencyPlan.create(
      basePlan({
        lastReviewedAt: reviewDate,
        nextReviewDue: explicitDue,
        reviewCadenceMonths: 6,
      })
    );
    expect(doc.nextReviewDue.toISOString()).toBe(explicitDue.toISOString());
  });
});

describe('W458 behavioral — EmergencyPlan enum validation', () => {
  it('REJECTS invalid knownCondition.type', async () => {
    const p = new EmergencyPlan(
      basePlan({ knownConditions: [{ type: 'unknown_condition', description: 'x' }] })
    );
    await expect(p.save()).rejects.toThrow();
  });

  it('SAVES with valid knownCondition.type (seizure)', async () => {
    const doc = await EmergencyPlan.create(
      basePlan({
        knownConditions: [
          {
            type: 'seizure',
            description: 'tonic-clonic',
            rescueProtocol: 'Place on side, time the seizure',
            rescueMedications: ['Diazepam rectal 10mg'],
          },
        ],
      })
    );
    expect(doc.knownConditions[0].type).toBe('seizure');
  });

  it('REJECTS invalid escalationChain.role', async () => {
    const p = new EmergencyPlan(
      basePlan({ escalationChain: [{ order: 1, role: 'janitor', contactMethod: 'phone' }] })
    );
    await expect(p.save()).rejects.toThrow();
  });

  it('REJECTS invalid escalationChain.contactMethod', async () => {
    const p = new EmergencyPlan(
      basePlan({ escalationChain: [{ order: 1, role: 'caregiver', contactMethod: 'telegram' }] })
    );
    await expect(p.save()).rejects.toThrow();
  });

  it('REJECTS escalationChain.order < 1', async () => {
    const p = new EmergencyPlan(
      basePlan({ escalationChain: [{ order: 0, role: 'caregiver', contactMethod: 'phone' }] })
    );
    await expect(p.save()).rejects.toThrow();
  });

  it('REJECTS escalationChain.order > 20', async () => {
    const p = new EmergencyPlan(
      basePlan({ escalationChain: [{ order: 21, role: 'caregiver', contactMethod: 'phone' }] })
    );
    await expect(p.save()).rejects.toThrow();
  });

  it('REJECTS invalid status enum', async () => {
    const p = new EmergencyPlan(basePlan({ status: 'in_progress' }));
    await expect(p.save()).rejects.toThrow();
  });
});

describe('W458 behavioral — EmergencyPlan indexes', () => {
  it('beneficiaryId carries a UNIQUE index', async () => {
    const indexes = await EmergencyPlan.collection.indexes();
    const benIdx = indexes.find(i => Object.keys(i.key).join('+') === 'beneficiaryId');
    expect(benIdx).toBeDefined();
    expect(benIdx.unique).toBe(true);
  });

  it('declares non-unique branchId + nextReviewDue + status indexes', async () => {
    const indexes = await EmergencyPlan.collection.indexes();
    const keys = indexes.map(i => Object.keys(i.key).join('+'));
    expect(keys).toContain('branchId');
    expect(keys).toContain('nextReviewDue');
    expect(keys).toContain('status');
  });

  it('uses canonical collection name emergency_plans', () => {
    expect(EmergencyPlan.collection.collectionName).toBe('emergency_plans');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// CrisisIncident
// ═══════════════════════════════════════════════════════════════════════

describe('W458 behavioral — CrisisIncident required-field invariants', () => {
  it('REJECTS without beneficiaryId', async () => {
    const p = new CrisisIncident({
      branchId: oid(),
      crisisType: 'medical_seizure',
      severity: 'urgent',
      occurredAt: new Date(),
      reportedBy: oid(),
    });
    await expect(p.save()).rejects.toThrow(/beneficiaryId/);
  });

  it('REJECTS without branchId', async () => {
    const p = new CrisisIncident({
      beneficiaryId: oid(),
      crisisType: 'medical_seizure',
      severity: 'urgent',
      occurredAt: new Date(),
      reportedBy: oid(),
    });
    await expect(p.save()).rejects.toThrow(/branchId/);
  });

  it('REJECTS without crisisType', async () => {
    const p = new CrisisIncident({
      beneficiaryId: oid(),
      branchId: oid(),
      severity: 'urgent',
      occurredAt: new Date(),
      reportedBy: oid(),
    });
    await expect(p.save()).rejects.toThrow(/crisisType/);
  });

  it('REJECTS without severity', async () => {
    const p = new CrisisIncident({
      beneficiaryId: oid(),
      branchId: oid(),
      crisisType: 'medical_seizure',
      occurredAt: new Date(),
      reportedBy: oid(),
    });
    await expect(p.save()).rejects.toThrow(/severity/);
  });

  it('REJECTS without occurredAt', async () => {
    const p = new CrisisIncident({
      beneficiaryId: oid(),
      branchId: oid(),
      crisisType: 'medical_seizure',
      severity: 'urgent',
      reportedBy: oid(),
    });
    await expect(p.save()).rejects.toThrow(/occurredAt/);
  });

  it('REJECTS without reportedBy', async () => {
    const p = new CrisisIncident({
      beneficiaryId: oid(),
      branchId: oid(),
      crisisType: 'medical_seizure',
      severity: 'urgent',
      occurredAt: new Date(),
    });
    await expect(p.save()).rejects.toThrow(/reportedBy/);
  });

  it('SAVES with all required fields + defaults populate', async () => {
    const doc = await CrisisIncident.create(baseIncident());
    expect(doc.status).toBe('active');
    expect(doc.rcaTriggered).toBe(false);
    expect(doc.escalationActions).toEqual([]);
    expect(doc.reportedAt).toBeInstanceOf(Date);
  });
});

describe('W458 behavioral — CrisisIncident enum validation', () => {
  it('REJECTS invalid crisisType', async () => {
    const p = new CrisisIncident(baseIncident({ crisisType: 'alien_invasion' }));
    await expect(p.save()).rejects.toThrow();
  });

  it('REJECTS invalid severity', async () => {
    const p = new CrisisIncident(baseIncident({ severity: 'extremely_critical' }));
    await expect(p.save()).rejects.toThrow();
  });

  it('REJECTS invalid status', async () => {
    const p = new CrisisIncident(baseIncident({ status: 'pending_review' }));
    await expect(p.save()).rejects.toThrow();
  });

  it('REJECTS invalid escalationAction.actionType', async () => {
    const p = new CrisisIncident(
      baseIncident({
        escalationActions: [{ actionType: 'social_media_post', performedAt: new Date() }],
      })
    );
    await expect(p.save()).rejects.toThrow();
  });

  it('REJECTS invalid escalationAction.outcome', async () => {
    const p = new CrisisIncident(
      baseIncident({
        escalationActions: [{ actionType: 'physician_called', outcome: 'maybe' }],
      })
    );
    await expect(p.save()).rejects.toThrow();
  });

  it('SAVES with valid escalationAction (outcome defaults to pending)', async () => {
    const doc = await CrisisIncident.create(
      baseIncident({
        escalationActions: [{ actionType: 'caregiver_notified', performedBy: oid() }],
      })
    );
    expect(doc.escalationActions[0].outcome).toBe('pending');
  });
});

describe('W458 behavioral — CrisisIncident status-terminal auto-fill', () => {
  it('AUTO-FILLS resolvedAt when status=resolved on save', async () => {
    const doc = await CrisisIncident.create(baseIncident({ status: 'resolved' }));
    expect(doc.resolvedAt).toBeInstanceOf(Date);
    expect(doc.closedAt).toBeUndefined();
  });

  it('AUTO-FILLS resolvedAt AND closedAt when status=closed', async () => {
    const doc = await CrisisIncident.create(baseIncident({ status: 'closed' }));
    expect(doc.resolvedAt).toBeInstanceOf(Date);
    expect(doc.closedAt).toBeInstanceOf(Date);
  });

  it('does NOT override an existing resolvedAt when status flips to resolved', async () => {
    const explicit = new Date('2026-05-20T10:00:00Z');
    const doc = await CrisisIncident.create(
      baseIncident({ status: 'resolved', resolvedAt: explicit })
    );
    expect(doc.resolvedAt.toISOString()).toBe(explicit.toISOString());
  });

  it('LEAVES resolvedAt/closedAt null when status remains active', async () => {
    const doc = await CrisisIncident.create(baseIncident());
    expect(doc.resolvedAt).toBeUndefined();
    expect(doc.closedAt).toBeUndefined();
  });
});

describe('W458 behavioral — CrisisIncident indexes', () => {
  it('declares the canonical compound + per-field indexes', async () => {
    const indexes = await CrisisIncident.collection.indexes();
    const keys = indexes.map(i => Object.keys(i.key).join('+'));
    // Compound declared in the schema
    expect(keys).toContain('branchId+occurredAt+severity');
    expect(keys).toContain('beneficiaryId+occurredAt');
    expect(keys).toContain('status+severity');
    // Per-field (from the inline `index: true` declarations)
    expect(keys).toContain('crisisType');
    expect(keys).toContain('severity');
    expect(keys).toContain('occurredAt');
    expect(keys).toContain('seizureEventId');
    expect(keys).toContain('safeguardingConcernId');
    expect(keys).toContain('correlationId');
  });

  it('uses canonical collection name crisis_incidents', () => {
    expect(CrisisIncident.collection.collectionName).toBe('crisis_incidents');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// End-to-end lifecycle
// ═══════════════════════════════════════════════════════════════════════

describe('W458 behavioral — end-to-end crisis lifecycle persistence', () => {
  it('active → escalated → resolved with escalation actions accumulated', async () => {
    const benId = oid();
    const branchId = oid();
    const reporterId = oid();

    // 1. Initial report — active
    const incident = await CrisisIncident.create({
      beneficiaryId: benId,
      branchId,
      crisisType: 'medical_seizure',
      severity: 'critical',
      occurredAt: new Date(),
      reportedBy: reporterId,
      description: 'Tonic-clonic seizure during morning session',
    });
    expect(incident.status).toBe('active');

    // 2. Walk escalation chain — add actions
    incident.escalationActions.push({
      actionType: 'caregiver_notified',
      performedBy: reporterId,
      outcome: 'success',
    });
    incident.escalationActions.push({
      actionType: 'rescue_protocol_initiated',
      performedBy: reporterId,
      outcome: 'success',
    });
    incident.status = 'escalated';
    await incident.save();
    expect(incident.escalationActions).toHaveLength(2);

    // 3. Resolve — auto-fill resolvedAt
    incident.status = 'resolved';
    await incident.save();
    expect(incident.resolvedAt).toBeInstanceOf(Date);

    // 4. Reload + verify persistence
    const reloaded = await CrisisIncident.findById(incident._id);
    expect(reloaded.status).toBe('resolved');
    expect(reloaded.escalationActions).toHaveLength(2);
    expect(reloaded.escalationActions[0].actionType).toBe('caregiver_notified');
    expect(reloaded.resolvedAt).toBeInstanceOf(Date);
  });
});
