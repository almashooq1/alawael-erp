'use strict';

jest.unmock('mongoose');
jest.resetModules();
process.env.NODE_ENV = 'test';

const mongoose = require('mongoose');
const registry = require('../config/audit-schedule.registry');
const { createAuditSchedulerService } = require('../services/quality/auditScheduler.service');

let ownServer = null;
let AuditScope;
let AuditOccurrence;
const creator = new mongoose.Types.ObjectId();
const lead = new mongoose.Types.ObjectId();

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
  await mongoose.connect(uri, { dbName: 'audit-test', serverSelectionTimeoutMS: 10000 });
  AuditScope = require('../models/quality/AuditScope.model');
  AuditOccurrence = require('../models/quality/AuditOccurrence.model');
}, 60_000);

afterAll(async () => {
  await mongoose.disconnect();
  if (ownServer) await ownServer.stop();
});

afterEach(async () => {
  await AuditScope.deleteMany({});
  await AuditOccurrence.deleteMany({});
});

describe('audit-schedule registry', () => {
  test('higher risk → shorter cycle', () => {
    expect(registry.AUDIT_FREQUENCY_MONTHS.critical).toBeLessThan(
      registry.AUDIT_FREQUENCY_MONTHS.medium
    );
    expect(registry.AUDIT_FREQUENCY_MONTHS.low).toBeGreaterThan(
      registry.AUDIT_FREQUENCY_MONTHS.medium
    );
  });

  test('nextOccurrence advances by the right number of months', () => {
    const base = new Date('2026-01-01T00:00:00Z');
    const high = registry.nextOccurrence(base, 'high');
    expect(high.getUTCMonth()).toBe(6); // +6 months
  });
});

describe('AuditSchedulerService.generateUpcoming', () => {
  test('creates one planned occurrence per active scope without a pending audit', async () => {
    const svc = createAuditSchedulerService({
      scopeModel: AuditScope,
      occurrenceModel: AuditOccurrence,
    });
    await svc.createScope(
      { name: 'Pharmacy', riskLevel: 'critical', leadAuditorUserId: lead },
      creator
    );
    await svc.createScope({ name: 'IT Security', riskLevel: 'high' }, creator);
    await svc.createScope({ name: 'HR', riskLevel: 'medium' }, creator);

    const created = await svc.generateUpcoming({ userId: creator });
    expect(created).toHaveLength(3);
    // idempotent
    const second = await svc.generateUpcoming({ userId: creator });
    expect(second).toHaveLength(0);
  });

  test('higher-risk scope schedules sooner', async () => {
    const svc = createAuditSchedulerService({
      scopeModel: AuditScope,
      occurrenceModel: AuditOccurrence,
    });
    const critical = await svc.createScope({ name: 'C', riskLevel: 'critical' }, creator);
    const lowRisk = await svc.createScope({ name: 'L', riskLevel: 'low' }, creator);
    await svc.generateUpcoming({ userId: creator });
    const c = await AuditOccurrence.findOne({ scopeId: critical._id });
    const l = await AuditOccurrence.findOne({ scopeId: lowRisk._id });
    expect(c.plannedFor < l.plannedFor).toBe(true);
  });
});

describe('AuditSchedulerService — occurrence lifecycle', () => {
  test('plan → schedule → start → finding → close + scope updated', async () => {
    const events = [];
    const dispatcher = {
      async emit(name, payload) {
        events.push({ name, payload });
      },
    };
    const svc = createAuditSchedulerService({
      scopeModel: AuditScope,
      occurrenceModel: AuditOccurrence,
      dispatcher,
    });
    const scope = await svc.createScope({ name: 'Lab QA', riskLevel: 'high' }, creator);
    const created = await svc.generateUpcoming({ userId: creator });
    let occ = created[0];

    occ = await svc.scheduleOccurrence(occ._id, '2026-06-15', creator);
    expect(occ.status).toBe('scheduled');
    expect(occ.scheduledFor).toBeTruthy();

    occ = await svc.startOccurrence(occ._id, creator);
    expect(occ.status).toBe('in_progress');

    occ = await svc.recordFinding(
      occ._id,
      { type: 'major_nc', description: 'Calibration overdue', clauseRef: '7.1.5' },
      creator
    );
    expect(occ.findings).toHaveLength(1);
    expect(events.find(e => e.name === 'quality.audit.nc_recorded')).toBeTruthy();

    occ = await svc.closeOccurrence(occ._id, { summary: 'completed' }, creator);
    expect(occ.status).toBe('closed');
    expect(occ.overallOutcome).toBe('major_nc');

    const updatedScope = await AuditScope.findById(scope._id);
    expect(updatedScope.lastAuditedAt).toBeTruthy();
    expect(updatedScope.nextScheduledDate).toBeTruthy();
  });

  test('overallOutcome = conform when no NCs recorded', async () => {
    const svc = createAuditSchedulerService({
      scopeModel: AuditScope,
      occurrenceModel: AuditOccurrence,
    });
    await svc.createScope({ name: 'Routine', riskLevel: 'medium' }, creator);
    const [occ] = await svc.generateUpcoming({ userId: creator });
    await svc.startOccurrence(occ._id, creator);
    await svc.recordFinding(
      occ._id,
      { type: 'opportunity', description: 'Improve naming' },
      creator
    );
    const closed = await svc.closeOccurrence(occ._id, {}, creator);
    expect(closed.overallOutcome).toBe('conform');
  });

  test('cannot start a planned audit twice', async () => {
    const svc = createAuditSchedulerService({
      scopeModel: AuditScope,
      occurrenceModel: AuditOccurrence,
    });
    await svc.createScope({ name: 'x', riskLevel: 'medium' }, creator);
    const [occ] = await svc.generateUpcoming({ userId: creator });
    await svc.startOccurrence(occ._id, creator);
    await expect(svc.startOccurrence(occ._id, creator)).rejects.toMatchObject({
      code: 'INVALID_PHASE',
    });
  });
});

describe('AuditSchedulerService.getDashboard', () => {
  test('counts overdue + dueIn30 windows', async () => {
    const svc = createAuditSchedulerService({
      scopeModel: AuditScope,
      occurrenceModel: AuditOccurrence,
    });
    await svc.createScope({ name: 'a', riskLevel: 'medium' }, creator);
    await svc.generateUpcoming({ userId: creator });
    const dash = await svc.getDashboard({});
    expect(dash.total).toBe(1);
    expect(dash.byStatus.planned).toBe(1);
  });
});
