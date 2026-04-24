'use strict';

/**
 * meeting-governance-service.test.js — Phase 16 Commit 6 (4.0.71).
 *
 * Behaviour tests for the meeting-governance service, including:
 *   - endMeeting / publishMinutes with minutes SLA
 *   - assignDecision with decision SLA activation
 *   - updateDecisionStatus state-machine + SLA hooks
 *   - getFollowUpBoard grouping + counts
 *   - sweepOverdue auto-flip
 */

process.env.NODE_ENV = 'test';

const {
  createMeetingGovernanceService,
} = require('../services/operations/meetingGovernance.service');

// ── fakes ─────────────────────────────────────────────────────────

function makeFakeMeetingModel() {
  const docs = [];
  let counter = 0;
  return {
    docs,
    findById: async id => docs.find(d => d._id === id) || null,
    create: async data => {
      const d = {
        _id: `meeting-${++counter}`,
        meetingId: `MEET-${counter}`,
        status: 'in_progress',
        minutes: [],
        ...data,
        save: async function () {
          return this;
        },
      };
      docs.push(d);
      return d;
    },
    _docs: () => docs,
  };
}

function makeFakeDecisionModel() {
  const docs = [];
  let counter = 0;
  return {
    docs,
    findById: async id => docs.find(d => d._id === id) || null,
    create: async data => {
      const d = {
        _id: `dec-${++counter}`,
        decisionNumber: `DEC-TEST-${counter}`,
        statusHistory: [],
        status: 'open',
        ...data,
        save: async function () {
          return this;
        },
      };
      docs.push(d);
      return d;
    },
    find: filter => {
      let rows = docs.filter(d => matches(d, filter));
      const api = {
        sort: () => api,
        skip: n => {
          rows = rows.slice(n);
          return api;
        },
        limit: n => {
          rows = rows.slice(0, n);
          return api;
        },
        then: (resolve, reject) => Promise.resolve(rows).then(resolve, reject),
      };
      return api;
    },
    _docs: () => docs,
  };
}

function matches(d, filter) {
  for (const [k, v] of Object.entries(filter || {})) {
    if (v == null) {
      if (d[k] != null) return false;
      continue;
    }
    if (typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)) {
      if (v.$in && !v.$in.includes(d[k])) return false;
      if (v.$gte !== undefined && !(d[k] >= v.$gte)) return false;
      if (v.$lt !== undefined && !(d[k] < v.$lt)) return false;
    } else if (d[k] !== v) return false;
  }
  return true;
}

function makeSlaEngineRecorder() {
  const calls = [];
  let slaCounter = 0;
  return {
    calls,
    async activate(args) {
      const sla = { _id: `sla-${++slaCounter}`, ...args };
      calls.push({ kind: 'activate', args });
      return sla;
    },
    async observe(args) {
      calls.push({ kind: 'observe', args });
      return { _id: args.slaId };
    },
    async observeBySubject(args) {
      calls.push({ kind: 'observeBySubject', args });
      return { _id: 'subject-sla' };
    },
  };
}

function makeDispatcher() {
  const events = [];
  return {
    events,
    async emit(name, payload) {
      events.push({ name, payload });
    },
  };
}

// ── tests: endMeeting + publishMinutes ────────────────────────────

describe('MeetingGovernance — endMeeting', () => {
  it('flips meeting to completed and activates minutes SLA', async () => {
    const meetingModel = makeFakeMeetingModel();
    const decisionModel = makeFakeDecisionModel();
    const engine = makeSlaEngineRecorder();
    const dispatcher = makeDispatcher();
    const svc = createMeetingGovernanceService({
      meetingModel,
      decisionModel,
      slaEngine: engine,
      dispatcher,
    });
    const m = await meetingModel.create({ title: 'Weekly sync', branchId: 'branch-1' });

    const ended = await svc.endMeeting(m._id);
    expect(ended.status).toBe('completed');
    expect(
      engine.calls.some(c => c.kind === 'activate' && c.args.policyId === 'meeting.minutes.publish')
    ).toBe(true);
    expect(dispatcher.events.some(e => e.name === 'ops.meeting.ended')).toBe(true);
  });

  it('is idempotent — re-ending a completed meeting does nothing', async () => {
    const meetingModel = makeFakeMeetingModel();
    const decisionModel = makeFakeDecisionModel();
    const engine = makeSlaEngineRecorder();
    const svc = createMeetingGovernanceService({
      meetingModel,
      decisionModel,
      slaEngine: engine,
    });
    const m = await meetingModel.create({ title: 'x', status: 'completed' });
    await svc.endMeeting(m._id);
    expect(engine.calls.filter(c => c.kind === 'activate').length).toBe(0);
  });

  it('refuses to end a cancelled meeting', async () => {
    const meetingModel = makeFakeMeetingModel();
    const decisionModel = makeFakeDecisionModel();
    const svc = createMeetingGovernanceService({ meetingModel, decisionModel });
    const m = await meetingModel.create({ title: 'x', status: 'cancelled' });
    await expect(svc.endMeeting(m._id)).rejects.toMatchObject({
      code: 'ILLEGAL_TRANSITION',
    });
  });
});

describe('MeetingGovernance — publishMinutes', () => {
  it('resolves minutes SLA via observeBySubject', async () => {
    const meetingModel = makeFakeMeetingModel();
    const decisionModel = makeFakeDecisionModel();
    const engine = makeSlaEngineRecorder();
    const svc = createMeetingGovernanceService({
      meetingModel,
      decisionModel,
      slaEngine: engine,
    });
    const m = await meetingModel.create({ title: 'x', status: 'completed' });
    await svc.publishMinutes(m._id, { minutesContent: 'Full minutes text' });
    expect(
      engine.calls.some(c => c.kind === 'observeBySubject' && c.args.eventType === 'resolved')
    ).toBe(true);
    expect(meetingModel._docs()[0].minutes.length).toBe(1);
  });

  it('rejects publishMinutes before meeting ends', async () => {
    const meetingModel = makeFakeMeetingModel();
    const decisionModel = makeFakeDecisionModel();
    const svc = createMeetingGovernanceService({ meetingModel, decisionModel });
    const m = await meetingModel.create({ title: 'x', status: 'in_progress' });
    await expect(svc.publishMinutes(m._id)).rejects.toMatchObject({
      code: 'ILLEGAL_TRANSITION',
    });
  });
});

// ── tests: assignDecision ─────────────────────────────────────────

describe('MeetingGovernance — assignDecision', () => {
  it('creates a decision, activates SLA, emits event', async () => {
    const meetingModel = makeFakeMeetingModel();
    const decisionModel = makeFakeDecisionModel();
    const engine = makeSlaEngineRecorder();
    const dispatcher = makeDispatcher();
    const svc = createMeetingGovernanceService({
      meetingModel,
      decisionModel,
      slaEngine: engine,
      dispatcher,
    });
    const m = await meetingModel.create({
      title: 'board meeting',
      branchId: 'branch-1',
    });
    const decision = await svc.assignDecision(m._id, {
      title: 'Approve Q3 budget',
      ownerUserId: 'user-1',
      priority: 'high',
    });
    expect(decision.status).toBe('open');
    expect(decision.meetingId).toBe(m._id);
    expect(decision.priority).toBe('high');
    expect(decision.dueDate).toBeInstanceOf(Date);
    expect(decision.slaId).toBeTruthy();
    expect(
      engine.calls.some(
        c => c.kind === 'activate' && c.args.policyId === 'meeting.decision.execution'
      )
    ).toBe(true);
    expect(dispatcher.events.some(e => e.name === 'ops.meeting.decision_assigned')).toBe(true);
  });

  it('uses priority-based default dueDate when none given', async () => {
    const meetingModel = makeFakeMeetingModel();
    const decisionModel = makeFakeDecisionModel();
    const svc = createMeetingGovernanceService({ meetingModel, decisionModel });
    const m = await meetingModel.create({ title: 'x' });
    const dec = await svc.assignDecision(m._id, {
      title: 'Do X',
      ownerUserId: 'u',
      priority: 'critical',
    });
    const diffMs = dec.dueDate.getTime() - Date.now();
    const diffDays = Math.round(diffMs / (24 * 3600 * 1000));
    expect(diffDays).toBe(3); // critical → 3-day offset
  });

  it('throws MISSING_FIELD when title or ownerUserId is missing', async () => {
    const meetingModel = makeFakeMeetingModel();
    const decisionModel = makeFakeDecisionModel();
    const svc = createMeetingGovernanceService({ meetingModel, decisionModel });
    const m = await meetingModel.create({ title: 'x' });
    await expect(svc.assignDecision(m._id, { title: 'Do X' })).rejects.toMatchObject({
      code: 'MISSING_FIELD',
    });
  });
});

// ── tests: updateDecisionStatus ───────────────────────────────────

describe('MeetingGovernance — updateDecisionStatus', () => {
  async function seed() {
    const meetingModel = makeFakeMeetingModel();
    const decisionModel = makeFakeDecisionModel();
    const engine = makeSlaEngineRecorder();
    const dispatcher = makeDispatcher();
    const svc = createMeetingGovernanceService({
      meetingModel,
      decisionModel,
      slaEngine: engine,
      dispatcher,
    });
    const m = await meetingModel.create({ title: 'x' });
    const d = await svc.assignDecision(m._id, {
      title: 'Do X',
      ownerUserId: 'u',
      priority: 'medium',
    });
    return { svc, engine, dispatcher, decision: d, decisionModel };
  }

  it('open → in_progress fires state_changed on SLA', async () => {
    const { svc, engine, decision } = await seed();
    await svc.updateDecisionStatus(decision._id, 'in_progress', { actorId: 'u' });
    expect(
      engine.calls.some(
        c =>
          c.kind === 'observe' &&
          c.args.eventType === 'state_changed' &&
          c.args.state === 'in_progress'
      )
    ).toBe(true);
  });

  it('in_progress → completed requires executionNotes', async () => {
    const { svc, decision } = await seed();
    await svc.updateDecisionStatus(decision._id, 'in_progress', { actorId: 'u' });
    await expect(
      svc.updateDecisionStatus(decision._id, 'completed', { actorId: 'u' })
    ).rejects.toMatchObject({ code: 'MISSING_FIELD', fields: ['executionNotes'] });
  });

  it('completed transition with patch resolves SLA', async () => {
    const { svc, engine, decision } = await seed();
    await svc.updateDecisionStatus(decision._id, 'in_progress', { actorId: 'u' });
    await svc.updateDecisionStatus(decision._id, 'completed', {
      actorId: 'u',
      patch: { executionNotes: 'Done' },
    });
    expect(engine.calls.some(c => c.kind === 'observe' && c.args.eventType === 'resolved')).toBe(
      true
    );
  });

  it('cancelled transition fires SLA cancelled', async () => {
    const { svc, engine, decision } = await seed();
    await svc.updateDecisionStatus(decision._id, 'cancelled', { actorId: 'u' });
    expect(engine.calls.some(c => c.kind === 'observe' && c.args.eventType === 'cancelled')).toBe(
      true
    );
  });

  it('deferred transition requires deferReason and fires resolved', async () => {
    const { svc, engine, decision } = await seed();
    await expect(
      svc.updateDecisionStatus(decision._id, 'deferred', { actorId: 'u' })
    ).rejects.toMatchObject({ code: 'MISSING_FIELD', fields: ['deferReason'] });
    await svc.updateDecisionStatus(decision._id, 'deferred', {
      actorId: 'u',
      patch: { deferReason: 'next cycle' },
    });
    expect(engine.calls.some(c => c.kind === 'observe' && c.args.eventType === 'resolved')).toBe(
      true
    );
  });

  it('illegal transition throws ILLEGAL_TRANSITION', async () => {
    const { svc, decision } = await seed();
    await expect(
      svc.updateDecisionStatus(decision._id, 'cancelled', { actorId: 'u' })
    ).resolves.toBeDefined();
    // cancelled → anything should be illegal
    await expect(
      svc.updateDecisionStatus(decision._id, 'in_progress', { actorId: 'u' })
    ).rejects.toMatchObject({ code: 'ILLEGAL_TRANSITION' });
  });

  it('completed → any is illegal (terminal)', async () => {
    const { svc, decision } = await seed();
    await svc.updateDecisionStatus(decision._id, 'completed', {
      actorId: 'u',
      patch: { executionNotes: 'x' },
    });
    await expect(
      svc.updateDecisionStatus(decision._id, 'in_progress', { actorId: 'u' })
    ).rejects.toMatchObject({ code: 'ILLEGAL_TRANSITION' });
  });

  it('emits ops.meeting.decision_<event> + transitioned', async () => {
    const { svc, dispatcher, decision } = await seed();
    await svc.updateDecisionStatus(decision._id, 'in_progress', { actorId: 'u' });
    const names = dispatcher.events.map(e => e.name);
    expect(names).toEqual(
      expect.arrayContaining(['ops.meeting.decision_started', 'ops.meeting.decision_transitioned'])
    );
  });
});

// ── tests: getFollowUpBoard ───────────────────────────────────────

describe('MeetingGovernance — getFollowUpBoard', () => {
  it('groups open/in_progress/blocked and counts dues', async () => {
    const meetingModel = makeFakeMeetingModel();
    const decisionModel = makeFakeDecisionModel();
    const svc = createMeetingGovernanceService({ meetingModel, decisionModel });
    // Past-due but still open (the overdue bucket counts it via flag).
    const pastDue = new Date(Date.now() - 2 * 24 * 3600 * 1000);
    const futureDue = new Date(Date.now() + 2 * 24 * 3600 * 1000);
    const todayDue = new Date();
    todayDue.setHours(23, 0, 0, 0);

    await decisionModel.create({
      title: 'A',
      ownerUserId: 'u1',
      branchId: 'b1',
      status: 'open',
      dueDate: futureDue,
      deleted_at: null,
    });
    await decisionModel.create({
      title: 'B',
      ownerUserId: 'u1',
      branchId: 'b1',
      status: 'in_progress',
      dueDate: todayDue,
      deleted_at: null,
    });
    await decisionModel.create({
      title: 'C',
      ownerUserId: 'u2',
      branchId: 'b1',
      status: 'overdue',
      dueDate: pastDue,
      deleted_at: null,
    });
    await decisionModel.create({
      title: 'D',
      ownerUserId: 'u1',
      branchId: 'b1',
      status: 'completed',
      dueDate: futureDue,
      deleted_at: null,
    });

    const board = await svc.getFollowUpBoard({ branchId: 'b1' });
    expect(board.decisions.length).toBe(3); // completed excluded
    expect(board.counts.open).toBe(1);
    expect(board.counts.in_progress).toBe(1);
    expect(board.counts.overdue).toBe(1);
    expect(board.counts.due_today).toBe(1);
    expect(board.counts.due_this_week).toBeGreaterThanOrEqual(2);
  });

  it('overdueOnly filter narrows to overdue only', async () => {
    const meetingModel = makeFakeMeetingModel();
    const decisionModel = makeFakeDecisionModel();
    const svc = createMeetingGovernanceService({ meetingModel, decisionModel });
    await decisionModel.create({
      title: 'A',
      ownerUserId: 'u',
      branchId: 'b',
      status: 'open',
      dueDate: new Date(),
      deleted_at: null,
    });
    await decisionModel.create({
      title: 'B',
      ownerUserId: 'u',
      branchId: 'b',
      status: 'overdue',
      dueDate: new Date(),
      deleted_at: null,
    });
    const board = await svc.getFollowUpBoard({ includeOverdueOnly: true });
    expect(board.decisions.length).toBe(1);
    expect(board.decisions[0].status).toBe('overdue');
  });
});

// ── tests: sweepOverdue ───────────────────────────────────────────

describe('MeetingGovernance — sweepOverdue', () => {
  it('flips past-due open decisions to overdue and emits event', async () => {
    const meetingModel = makeFakeMeetingModel();
    const decisionModel = makeFakeDecisionModel();
    const dispatcher = makeDispatcher();
    const svc = createMeetingGovernanceService({
      meetingModel,
      decisionModel,
      dispatcher,
    });
    await decisionModel.create({
      title: 'Old',
      ownerUserId: 'u',
      status: 'open',
      dueDate: new Date(Date.now() - 24 * 3600 * 1000),
      statusHistory: [],
      deleted_at: null,
    });
    await decisionModel.create({
      title: 'Future',
      ownerUserId: 'u',
      status: 'open',
      dueDate: new Date(Date.now() + 24 * 3600 * 1000),
      statusHistory: [],
      deleted_at: null,
    });
    const report = await svc.sweepOverdue();
    expect(report.scanned).toBe(1);
    expect(report.flipped).toBe(1);
    expect(decisionModel._docs()[0].status).toBe('overdue');
    expect(decisionModel._docs()[0].overdueFlaggedAt).toBeInstanceOf(Date);
    expect(dispatcher.events.some(e => e.name === 'ops.meeting.decision_overdue')).toBe(true);
  });

  it('is idempotent — completed / already-overdue decisions are skipped', async () => {
    const meetingModel = makeFakeMeetingModel();
    const decisionModel = makeFakeDecisionModel();
    const svc = createMeetingGovernanceService({ meetingModel, decisionModel });
    await decisionModel.create({
      title: 'Already-overdue',
      ownerUserId: 'u',
      status: 'overdue',
      dueDate: new Date(Date.now() - 24 * 3600 * 1000),
      statusHistory: [],
      deleted_at: null,
    });
    await decisionModel.create({
      title: 'Completed',
      ownerUserId: 'u',
      status: 'completed',
      dueDate: new Date(Date.now() - 24 * 3600 * 1000),
      statusHistory: [],
      deleted_at: null,
    });
    const report = await svc.sweepOverdue();
    expect(report.flipped).toBe(0);
  });
});

// ── tests: findDecisionById + listDecisions ───────────────────────

describe('MeetingGovernance — find + list', () => {
  it('findDecisionById returns null for deleted doc', async () => {
    const meetingModel = makeFakeMeetingModel();
    const decisionModel = makeFakeDecisionModel();
    const svc = createMeetingGovernanceService({ meetingModel, decisionModel });
    const d = await decisionModel.create({
      title: 'x',
      ownerUserId: 'u',
      dueDate: new Date(),
      deleted_at: new Date(),
      statusHistory: [],
    });
    expect(await svc.findDecisionById(d._id)).toBeNull();
  });

  it('listDecisions filters by status', async () => {
    const meetingModel = makeFakeMeetingModel();
    const decisionModel = makeFakeDecisionModel();
    const svc = createMeetingGovernanceService({ meetingModel, decisionModel });
    await decisionModel.create({
      title: 'A',
      ownerUserId: 'u',
      status: 'open',
      dueDate: new Date(),
      deleted_at: null,
      statusHistory: [],
    });
    await decisionModel.create({
      title: 'B',
      ownerUserId: 'u',
      status: 'completed',
      dueDate: new Date(),
      deleted_at: null,
      statusHistory: [],
    });
    const opens = await svc.listDecisions({ status: 'open' });
    expect(opens.length).toBe(1);
    expect(opens[0].title).toBe('A');
  });
});
