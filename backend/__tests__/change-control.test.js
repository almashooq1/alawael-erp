'use strict';

jest.unmock('mongoose');
jest.resetModules();
process.env.NODE_ENV = 'test';

const mongoose = require('mongoose');
const registry = require('../config/change-control.registry');
const { createChangeControlService } = require('../services/quality/changeControl.service');

let ownServer = null;
let ChangeRequest;
const requester = new mongoose.Types.ObjectId();
const cabA = new mongoose.Types.ObjectId();
const cabB = new mongoose.Types.ObjectId();
const cabC = new mongoose.Types.ObjectId();

beforeAll(async () => {
  const { MongoMemoryServer } = require('mongodb-memory-server');
  ownServer = await MongoMemoryServer.create();
  const uri = ownServer.getUri();
  if (mongoose.connection.readyState !== 0) {
    try {
      await mongoose.disconnect();
    } catch {
      /* ignore */
    }
  }
  await mongoose.connect(uri, { dbName: 'cc-test', serverSelectionTimeoutMS: 10000 });
  ChangeRequest = require('../models/quality/ChangeRequest.model');
}, 60_000);

afterAll(async () => {
  await mongoose.disconnect();
  if (ownServer) await ownServer.stop();
});

afterEach(async () => {
  await ChangeRequest.deleteMany({});
});

describe('change-control registry', () => {
  test('shouldGoToCab — low does not, medium/high/critical do', () => {
    expect(registry.shouldGoToCab('low')).toBe(false);
    expect(registry.shouldGoToCab('medium')).toBe(true);
    expect(registry.shouldGoToCab('high')).toBe(true);
    expect(registry.shouldGoToCab('critical')).toBe(true);
  });
});

describe('ChangeControlService — happy path', () => {
  test('full lifecycle: draft → CAB → approved → implementation → verified → closed', async () => {
    const svc = createChangeControlService({ model: ChangeRequest });
    let doc = await svc.createRequest(
      {
        title: 'Upgrade EMR module',
        rationale: 'Address security audit findings',
        type: 'software',
        riskLevel: 'high',
      },
      requester
    );
    expect(doc.crNumber).toMatch(/^CR-\d{4}-\d{4}$/);
    expect(doc.cabRequired).toBe(true);

    doc = await svc.setStatus(doc._id, 'submitted', requester);
    doc = await svc.submitImpactAssessment(
      doc._id,
      {
        impactAssessment: 'Affects auth + scheduler',
        rollbackPlan: 'Roll back to v3.4',
        testingPlan: 'Stage 7 day soak',
      },
      requester
    );
    expect(doc.status).toBe('impact_assessment');

    // CAB votes
    doc = await svc.castCabVote(doc._id, 'approve', cabA, { role: 'ceo' });
    expect(doc.status).toBe('cab_review');
    await svc.castCabVote(doc._id, 'approve', cabB, { role: 'quality_manager' });
    await svc.castCabVote(doc._id, 'reject', cabC, { role: 'security' });
    doc = await svc.decideCab(doc._id, requester);
    expect(doc.status).toBe('approved');

    doc = await svc.setStatus(doc._id, 'in_implementation', requester);
    expect(doc.actualStart).toBeTruthy();
    doc = await svc.setStatus(doc._id, 'verification', requester);
    expect(doc.actualEnd).toBeTruthy();
    doc = await svc.verify(doc._id, 'successful', 'all smoke tests pass', requester);
    expect(doc.status).toBe('closed');
    expect(doc.verificationOutcome).toBe('successful');
  });

  test('CAB rejection sets status to rejected with reason', async () => {
    const svc = createChangeControlService({ model: ChangeRequest });
    let doc = await svc.createRequest(
      { title: 't', rationale: 'r', type: 'process', riskLevel: 'critical' },
      requester
    );
    doc = await svc.setStatus(doc._id, 'submitted', requester);
    doc = await svc.submitImpactAssessment(
      doc._id,
      { impactAssessment: 'a', rollbackPlan: 'r' },
      requester
    );
    await svc.castCabVote(doc._id, 'reject', cabA);
    await svc.castCabVote(doc._id, 'reject', cabB);
    doc = await svc.decideCab(doc._id, requester);
    expect(doc.status).toBe('rejected');
    expect(doc.rejectedReason).toMatch(/reject/);
  });

  test('CAB voter can change their vote', async () => {
    const svc = createChangeControlService({ model: ChangeRequest });
    let doc = await svc.createRequest({ title: 't', rationale: 'r', type: 'process' }, requester);
    doc = await svc.setStatus(doc._id, 'submitted', requester);
    doc = await svc.submitImpactAssessment(doc._id, { impactAssessment: 'a' }, requester);
    doc = await svc.castCabVote(doc._id, 'approve', cabA);
    doc = await svc.castCabVote(doc._id, 'reject', cabA);
    const votesA = doc.cabVotes.filter(v => String(v.voterUserId) === String(cabA));
    expect(votesA).toHaveLength(1);
    expect(votesA[0].vote).toBe('reject');
  });

  test('illegal transition is rejected', async () => {
    const svc = createChangeControlService({ model: ChangeRequest });
    const doc = await svc.createRequest({ title: 't', rationale: 'r', type: 'process' }, requester);
    await expect(svc.setStatus(doc._id, 'closed', requester)).rejects.toMatchObject({
      code: 'ILLEGAL_TRANSITION',
    });
  });

  test('implementation steps lifecycle', async () => {
    const svc = createChangeControlService({ model: ChangeRequest });
    let doc = await svc.createRequest({ title: 't', rationale: 'r', type: 'process' }, requester);
    doc = await svc.addStep(
      doc._id,
      { description: 'update SOP', ownerUserId: cabA, dueDate: '2026-06-01' },
      requester
    );
    const stepId = doc.implementationSteps[0]._id;
    doc = await svc.setStepStatus(doc._id, stepId, 'completed', requester);
    expect(doc.implementationSteps[0].status).toBe('completed');
    expect(doc.implementationSteps[0].completedAt).toBeTruthy();
  });

  test('low-risk CR has cabRequired = false', async () => {
    const svc = createChangeControlService({ model: ChangeRequest });
    const doc = await svc.createRequest(
      { title: 't', rationale: 'r', type: 'document', riskLevel: 'low' },
      requester
    );
    expect(doc.cabRequired).toBe(false);
  });
});

describe('ChangeControlService.getDashboard', () => {
  test('aggregates by status + riskLevel', async () => {
    const svc = createChangeControlService({ model: ChangeRequest });
    await svc.createRequest(
      { title: 'a', rationale: 'r', type: 'process', riskLevel: 'low' },
      requester
    );
    await svc.createRequest(
      { title: 'b', rationale: 'r', type: 'process', riskLevel: 'high' },
      requester
    );
    const dash = await svc.getDashboard({});
    expect(dash.total).toBe(2);
    expect(dash.byRisk.low).toBe(1);
    expect(dash.byRisk.high).toBe(1);
  });
});
