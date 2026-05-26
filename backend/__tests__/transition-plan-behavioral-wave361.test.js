'use strict';

/**
 * transition-plan-behavioral-wave361.test.js — behavioral counterpart to
 * `transition-plan-wave361.test.js` (static drift guard). MongoMemoryServer-based.
 *
 * Validates Wave-18 invariants:
 *   - transitionType enum (5 life-stage transitions)
 *   - status=completed ⇒ actualTransitionDate
 *   - status=in_progress ⇒ plannedTransitionDate
 *   - non-draft ⇒ transitionLead
 *   - readiness_assessed ⇒ compositeReadinessScore + domainScores[non-empty]
 *   - milestones[] ⇒ title + dueDate
 *
 * Plus `milestonesAchievedCount` + `milestonesProgressPct` + `isOverdue` virtuals.
 */

jest.unmock('mongoose');
jest.setTimeout(30000);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let TransitionPlan;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w361-behavioral-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  TransitionPlan = require('../models/TransitionPlan');
  await TransitionPlan.init();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await TransitionPlan.deleteMany({});
});

function baseDoc(overrides = {}) {
  return {
    beneficiaryId: new mongoose.Types.ObjectId(),
    branchId: new mongoose.Types.ObjectId(),
    transitionType: 'school_to_work',
    ...overrides,
  };
}

describe('W361 behavioral — transitionType enum', () => {
  it('SAVES with valid type', async () => {
    const doc = await TransitionPlan.create(baseDoc());
    expect(doc.status).toBe('draft');
  });

  it('REJECTS invalid type', async () => {
    const p = new TransitionPlan(baseDoc({ transitionType: 'not_real' }));
    await expect(p.save()).rejects.toThrow();
  });
});

describe('W361 behavioral — status=completed/in_progress invariants', () => {
  it('REJECTS completed without actualTransitionDate', async () => {
    const p = new TransitionPlan(baseDoc({ status: 'completed', transitionLeadName: 'Lead' }));
    await expect(p.save()).rejects.toThrow(/actualTransitionDate/);
  });

  it('SAVES completed with actualTransitionDate + lead', async () => {
    const doc = await TransitionPlan.create(
      baseDoc({
        status: 'completed',
        actualTransitionDate: new Date(),
        transitionLeadName: 'Coordinator Mona',
        plannedTransitionDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      })
    );
    expect(doc.status).toBe('completed');
  });

  it('REJECTS in_progress without plannedTransitionDate', async () => {
    const p = new TransitionPlan(baseDoc({ status: 'in_progress', transitionLeadName: 'Lead' }));
    await expect(p.save()).rejects.toThrow(/plannedTransitionDate/);
  });

  it('SAVES in_progress with planned date + lead', async () => {
    const doc = await TransitionPlan.create(
      baseDoc({
        status: 'in_progress',
        plannedTransitionDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        transitionLeadName: 'Lead',
      })
    );
    expect(doc.status).toBe('in_progress');
  });
});

describe('W361 behavioral — non-draft requires transitionLead', () => {
  it('REJECTS non-draft without lead', async () => {
    const p = new TransitionPlan(
      baseDoc({
        status: 'in_progress',
        plannedTransitionDate: new Date(Date.now() + 86400 * 1000),
      })
    );
    await expect(p.save()).rejects.toThrow(/transitionLeadId/);
  });

  it('SAVES non-draft with transitionLeadName', async () => {
    const doc = await TransitionPlan.create(
      baseDoc({
        status: 'in_progress',
        plannedTransitionDate: new Date(Date.now() + 86400 * 1000),
        transitionLeadName: 'Coordinator Mona',
      })
    );
    expect(doc.transitionLeadName).toBe('Coordinator Mona');
  });

  it('SAVES non-draft with transitionLeadId ObjectId', async () => {
    const doc = await TransitionPlan.create(
      baseDoc({
        status: 'in_progress',
        plannedTransitionDate: new Date(Date.now() + 86400 * 1000),
        transitionLeadId: new mongoose.Types.ObjectId(),
      })
    );
    expect(doc.transitionLeadId).toBeDefined();
  });
});

describe('W361 behavioral — readiness_assessed requires composite + scores', () => {
  it('REJECTS readiness_assessed without compositeReadinessScore', async () => {
    const p = new TransitionPlan(
      baseDoc({
        status: 'readiness_assessed',
        transitionLeadName: 'Lead',
        domainScores: [{ domain: 'self_care', score: 3 }],
      })
    );
    await expect(p.save()).rejects.toThrow(/compositeReadinessScore/);
  });

  it('REJECTS readiness_assessed without domainScores[non-empty]', async () => {
    const p = new TransitionPlan(
      baseDoc({
        status: 'readiness_assessed',
        transitionLeadName: 'Lead',
        compositeReadinessScore: 3.2,
      })
    );
    await expect(p.save()).rejects.toThrow(/domainScores/);
  });

  it('SAVES readiness_assessed with both', async () => {
    const doc = await TransitionPlan.create(
      baseDoc({
        status: 'readiness_assessed',
        transitionLeadName: 'Lead',
        compositeReadinessScore: 3.5,
        domainScores: [
          { domain: 'self_care', score: 4 },
          { domain: 'vocational', score: 3 },
        ],
      })
    );
    expect(doc.compositeReadinessScore).toBe(3.5);
  });
});

describe('W361 behavioral — milestones[] integrity', () => {
  it('REJECTS milestone with empty title', async () => {
    const p = new TransitionPlan(
      baseDoc({
        milestones: [{ title: '', dueDate: new Date() }],
      })
    );
    await expect(p.save()).rejects.toThrow();
  });

  it('REJECTS milestone without dueDate', async () => {
    const p = new TransitionPlan(
      baseDoc({
        milestones: [{ title: 'Find internship' }],
      })
    );
    await expect(p.save()).rejects.toThrow();
  });

  it('SAVES with valid milestones[]', async () => {
    const doc = await TransitionPlan.create(
      baseDoc({
        milestones: [
          {
            title: 'Find internship placement',
            dueDate: new Date(Date.now() + 30 * 86400 * 1000),
            domain: 'vocational',
          },
          {
            title: 'Complete job-shadowing week',
            dueDate: new Date(Date.now() + 60 * 86400 * 1000),
            status: 'in_progress',
          },
        ],
      })
    );
    expect(doc.milestones).toHaveLength(2);
  });
});

describe('W361 behavioral — virtuals', () => {
  it('milestonesAchievedCount + milestonesProgressPct compute correctly', async () => {
    const doc = await TransitionPlan.create(
      baseDoc({
        milestones: [
          { title: 'M1', dueDate: new Date(), status: 'achieved' },
          { title: 'M2', dueDate: new Date(), status: 'achieved' },
          { title: 'M3', dueDate: new Date(), status: 'pending' },
          { title: 'M4', dueDate: new Date(), status: 'missed' },
        ],
      })
    );
    expect(doc.milestonesAchievedCount).toBe(2);
    expect(doc.milestonesProgressPct).toBe(50);
  });

  it('milestonesProgressPct=0 with no milestones', async () => {
    const doc = await TransitionPlan.create(baseDoc());
    expect(doc.milestonesProgressPct).toBe(0);
  });

  it('isOverdue=true when in_progress + plannedDate in past', async () => {
    const doc = await TransitionPlan.create(
      baseDoc({
        status: 'in_progress',
        plannedTransitionDate: new Date(Date.now() - 86400 * 1000),
        transitionLeadName: 'Lead',
      })
    );
    expect(doc.isOverdue).toBe(true);
  });

  it('isOverdue=false when completed even if planned date passed', async () => {
    const doc = await TransitionPlan.create(
      baseDoc({
        status: 'completed',
        plannedTransitionDate: new Date(Date.now() - 86400 * 1000),
        actualTransitionDate: new Date(),
        transitionLeadName: 'Lead',
      })
    );
    expect(doc.isOverdue).toBe(false);
  });
});

describe('W361 behavioral — defaults', () => {
  it('defaults status=draft, milestones=[], reviews=[]', async () => {
    const doc = await TransitionPlan.create(baseDoc());
    expect(doc.status).toBe('draft');
    expect(doc.milestones).toEqual([]);
    expect(doc.reviews).toEqual([]);
    expect(doc.barriers).toEqual([]);
  });
});
