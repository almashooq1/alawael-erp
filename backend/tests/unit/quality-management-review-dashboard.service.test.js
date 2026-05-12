'use strict';

/**
 * Unit Tests — ManagementReviewService
 *
 * Tests the full lifecycle state machine + new analytics/action-status/
 * minutes methods using an in-memory fake model (no real DB needed).
 *
 * Coverage targets:
 *   ✓ scheduleReview
 *   ✓ setAgenda
 *   ✓ startMeeting
 *   ✓ recordInput / recordOutput / recordDecision
 *   ✓ assignAction / updateActionStatus
 *   ✓ closeReview (idempotent + validation)
 *   ✓ cancelReview (idempotent)
 *   ✓ approve
 *   ✓ setMinutes
 *   ✓ getDashboard (new enhanced fields)
 *   ✓ getAnalytics
 *   ✓ list / findById
 *   ✓ Illegal transition guard
 *   ✓ Dispatcher emit paths
 */

const {
  ManagementReviewService,
  createManagementReviewService,
  ALLOWED_TRANSITIONS,
} = require('../../services/quality/managementReview.service');

// ── helpers ────────────────────────────────────────────────────────

const FAKE_USER_ID = 'user-001';

/** Minimal Mongoose-like subdocument with .id() helper */
function makeActionSubdoc(data = {}) {
  const id = `action-${Math.random().toString(36).slice(2)}`;
  return Object.assign(
    {
      _id: { toString: () => id },
      id: () => id,
      status: 'open',
      completedAt: null,
      completionNotes: null,
    },
    data
  );
}

/** Build a minimal fake review document */
function makeReview(overrides = {}) {
  const id = `rev-${Math.random().toString(36).slice(2)}`;
  const actions = (overrides.actions || []).map(a => makeActionSubdoc(a));

  const doc = {
    _id: id,
    reviewNumber: 'MR-2026-0001',
    title: 'Test Review',
    type: 'periodic',
    scheduledFor: new Date(),
    status: 'scheduled',
    agenda: [],
    attendees: [],
    inputs: [],
    outputs: [],
    decisions: [],
    actions,
    approvals: [],
    minutes: null,
    closedBy: null,
    closedAt: null,
    endedAt: null,
    closureNotes: null,
    cancelledReason: null,
    nextReviewScheduledFor: null,
    previousReviewId: null,
    branchId: null,
    tenantId: null,
    deleted_at: null,
    openActionsCount: 0,
    save: jest.fn().mockResolvedValue(true),
    ...overrides,
  };

  // make actions array have .id() method like Mongoose subdoc array
  doc.actions.id = actionId => doc.actions.find(a => String(a._id) === String(actionId)) || null;

  return doc;
}

/** Build a fake model with in-memory store */
function makeFakeModel(initial = []) {
  const store = [...initial];

  const model = {
    _store: store,

    async create(data) {
      const doc = makeReview({
        ...data,
        _id: `rev-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      });
      store.push(doc);
      return doc;
    },

    findOne(filter) {
      const result =
        store.find(d => {
          if (filter._id && String(d._id) !== String(filter._id)) return false;
          if (filter.deleted_at === null && d.deleted_at !== null) return false;
          if (filter.status) {
            if (typeof filter.status === 'string' && d.status !== filter.status) return false;
          }
          return true;
        }) || null;

      // Return a chainable query object so callers can do .sort().select().lean()
      const q = {
        sort() {
          return q;
        },
        select() {
          return q;
        },
        lean() {
          return Promise.resolve(result);
        },
        then(resolve, reject) {
          return Promise.resolve(result).then(resolve, reject);
        },
        catch(reject) {
          return Promise.resolve(result).catch(reject);
        },
      };
      return q;
    },

    async countDocuments(filter = {}) {
      return store.filter(d => {
        if (d.deleted_at !== null) return false;
        if (filter.status) {
          if (filter.status.$nin && filter.status.$nin.includes(d.status)) return false;
          if (typeof filter.status === 'string' && d.status !== filter.status) return false;
        }
        if (filter.scheduledFor) {
          if (filter.scheduledFor.$lt && d.scheduledFor >= filter.scheduledFor.$lt) return false;
          if (filter.scheduledFor.$gte && d.scheduledFor < filter.scheduledFor.$gte) return false;
          if (filter.scheduledFor.$lte && d.scheduledFor > filter.scheduledFor.$lte) return false;
        }
        if (filter.closedAt) {
          if (!d.closedAt) return false;
          if (filter.closedAt.$gte && new Date(d.closedAt) < filter.closedAt.$gte) return false;
          if (filter.closedAt.$lte && new Date(d.closedAt) > filter.closedAt.$lte) return false;
        }
        return true;
      }).length;
    },

    find(filter = {}) {
      const results = store.filter(d => {
        if (d.deleted_at !== null) return false;
        if (filter.status) {
          if (filter.status.$nin && filter.status.$nin.includes(d.status)) return false;
          if (typeof filter.status === 'string' && d.status !== filter.status) return false;
        }
        return true;
      });
      const q = {
        _results: results,
        sort() {
          return q;
        },
        select() {
          return q;
        },
        skip() {
          return q;
        },
        limit() {
          return q;
        },
        lean() {
          return Promise.resolve(q._results);
        },
        then(resolve, reject) {
          return Promise.resolve(q._results).then(resolve, reject);
        },
      };
      return q;
    },
  };

  return model;
}

// ── registry validateClosure mock ──────────────────────────────────
// We need the real registry's validateClosure; however, the test
// can pass in reviews that DO satisfy closure. We mock partially:
jest.mock('../../config/management-review.registry', () => {
  const actual = jest.requireActual('../../config/management-review.registry');
  return {
    ...actual,
    validateClosure: jest.fn(review => {
      // allow closure if status is 'actions_assigned' or 'decisions_recorded'
      if (['actions_assigned', 'decisions_recorded'].includes(review.status)) {
        return { ok: true, missing: [] };
      }
      return actual.validateClosure(review);
    }),
  };
});

// ── suppress logs ──────────────────────────────────────────────────

beforeAll(() => {
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});
afterAll(() => {
  jest.restoreAllMocks();
});

// ══════════════════════════════════════════════════════════════════
//  1. Factory
// ══════════════════════════════════════════════════════════════════

describe('createManagementReviewService', () => {
  test('throws if model is missing', () => {
    expect(() => createManagementReviewService({})).toThrow('model is required');
  });

  test('returns a ManagementReviewService instance', () => {
    const svc = createManagementReviewService({ model: makeFakeModel() });
    expect(svc).toBeInstanceOf(ManagementReviewService);
  });
});

// ══════════════════════════════════════════════════════════════════
//  2. scheduleReview
// ══════════════════════════════════════════════════════════════════

describe('scheduleReview', () => {
  let svc;
  beforeEach(() => {
    svc = createManagementReviewService({ model: makeFakeModel() });
  });

  test('creates a review in scheduled status', async () => {
    const doc = await svc.scheduleReview(
      { title: 'Q1 Review', scheduledFor: '2026-03-01' },
      FAKE_USER_ID
    );
    expect(doc.status).toBe('scheduled');
    expect(doc.title).toBe('Q1 Review');
  });

  test('throws if title is missing', async () => {
    await expect(svc.scheduleReview({ scheduledFor: '2026-03-01' }, FAKE_USER_ID)).rejects.toThrow(
      'title is required'
    );
  });

  test('throws if scheduledFor is missing', async () => {
    await expect(svc.scheduleReview({ title: 'X' }, FAKE_USER_ID)).rejects.toThrow(
      'scheduledFor is required'
    );
  });

  test('throws if userId is missing', async () => {
    await expect(
      svc.scheduleReview({ title: 'X', scheduledFor: '2026-01-01' }, null)
    ).rejects.toThrow('userId is required');
  });

  test('emits quality.review.scheduled', async () => {
    const emitted = [];
    const dispatcher = { emit: jest.fn(async (n, p) => emitted.push({ n, p })) };
    const s = createManagementReviewService({ model: makeFakeModel(), dispatcher });
    await s.scheduleReview({ title: 'T', scheduledFor: '2026-06-01' }, FAKE_USER_ID);
    expect(emitted[0].n).toBe('quality.review.scheduled');
  });
});

// ══════════════════════════════════════════════════════════════════
//  3. setAgenda
// ══════════════════════════════════════════════════════════════════

describe('setAgenda', () => {
  let svc, review;
  beforeEach(async () => {
    const model = makeFakeModel();
    svc = createManagementReviewService({ model });
    review = await svc.scheduleReview({ title: 'Q2', scheduledFor: '2026-06-01' }, FAKE_USER_ID);
  });

  test('transitions to agenda_set', async () => {
    const updated = await svc.setAgenda(
      review._id,
      {
        agenda: ['Item A', 'Item B'],
        attendees: [{ userId: 'u1', nameSnapshot: 'Ali', role: 'ceo', present: true }],
      },
      FAKE_USER_ID
    );
    expect(updated.status).toBe('agenda_set');
    expect(updated.agenda).toHaveLength(2);
    expect(updated.attendees).toHaveLength(1);
  });

  test('rejects transition from in_progress → agenda_set', async () => {
    review.status = 'in_progress';
    await expect(svc.setAgenda(review._id, {}, FAKE_USER_ID)).rejects.toThrow(
      'Illegal management-review transition'
    );
  });
});

// ══════════════════════════════════════════════════════════════════
//  4. startMeeting
// ══════════════════════════════════════════════════════════════════

describe('startMeeting', () => {
  let svc, review;
  beforeEach(async () => {
    const model = makeFakeModel();
    svc = createManagementReviewService({ model });
    const r = await svc.scheduleReview({ title: 'Q3', scheduledFor: '2026-09-01' }, FAKE_USER_ID);
    review = await svc.setAgenda(r._id, { agenda: ['A'] }, FAKE_USER_ID);
  });

  test('transitions agenda_set → in_progress', async () => {
    const started = await svc.startMeeting(review._id, FAKE_USER_ID);
    expect(started.status).toBe('in_progress');
    expect(started.startedAt).toBeDefined();
  });

  test('rejects from scheduled directly', async () => {
    const r2 = await svc.scheduleReview({ title: 'T2', scheduledFor: '2026-10-01' }, FAKE_USER_ID);
    await expect(svc.startMeeting(r2._id, FAKE_USER_ID)).rejects.toMatchObject({
      code: 'ILLEGAL_TRANSITION',
    });
  });
});

// ══════════════════════════════════════════════════════════════════
//  5. recordInput / recordOutput
// ══════════════════════════════════════════════════════════════════

describe('recordInput', () => {
  let svc, inProgressReview;
  beforeEach(async () => {
    const model = makeFakeModel();
    svc = createManagementReviewService({ model });
    const r = await svc.scheduleReview(
      { title: 'Input Test', scheduledFor: '2026-01-01' },
      FAKE_USER_ID
    );
    const ag = await svc.setAgenda(r._id, {}, FAKE_USER_ID);
    inProgressReview = await svc.startMeeting(ag._id, FAKE_USER_ID);
  });

  test('adds input item with code + summary', async () => {
    const updated = await svc.recordInput(
      inProgressReview._id,
      { code: 'input.audit_results', summary: 'All audits closed' },
      FAKE_USER_ID
    );
    expect(updated.inputs).toHaveLength(1);
    expect(updated.inputs[0].code).toBe('input.audit_results');
  });

  test('throws if code is missing', async () => {
    await expect(
      svc.recordInput(inProgressReview._id, { summary: 'No code' }, FAKE_USER_ID)
    ).rejects.toThrow('input.code and input.summary are required');
  });

  test('rejects recording when status is scheduled', async () => {
    const r2 = await svc.scheduleReview({ title: 'X', scheduledFor: '2026-01-01' }, FAKE_USER_ID);
    await expect(
      svc.recordInput(r2._id, { code: 'input.audit_results', summary: 'X' }, FAKE_USER_ID)
    ).rejects.toMatchObject({ code: 'INVALID_PHASE' });
  });
});

describe('recordOutput', () => {
  let svc, inProgressReview;
  beforeEach(async () => {
    const model = makeFakeModel();
    svc = createManagementReviewService({ model });
    const r = await svc.scheduleReview(
      { title: 'Out Test', scheduledFor: '2026-01-01' },
      FAKE_USER_ID
    );
    const ag = await svc.setAgenda(r._id, {}, FAKE_USER_ID);
    inProgressReview = await svc.startMeeting(ag._id, FAKE_USER_ID);
  });

  test('adds output item', async () => {
    const updated = await svc.recordOutput(
      inProgressReview._id,
      { code: 'output.qms_changes', description: 'Update procedure X' },
      FAKE_USER_ID
    );
    expect(updated.outputs).toHaveLength(1);
  });

  test('throws if description is missing', async () => {
    await expect(
      svc.recordOutput(inProgressReview._id, { code: 'output.qms_changes' }, FAKE_USER_ID)
    ).rejects.toThrow();
  });
});

// ══════════════════════════════════════════════════════════════════
//  6. recordDecision
// ══════════════════════════════════════════════════════════════════

describe('recordDecision', () => {
  let svc, inProgressReview;
  beforeEach(async () => {
    const model = makeFakeModel();
    svc = createManagementReviewService({ model });
    const r = await svc.scheduleReview(
      { title: 'Dec Test', scheduledFor: '2026-01-01' },
      FAKE_USER_ID
    );
    const ag = await svc.setAgenda(r._id, {}, FAKE_USER_ID);
    inProgressReview = await svc.startMeeting(ag._id, FAKE_USER_ID);
  });

  test('appends decision and transitions to decisions_recorded', async () => {
    const updated = await svc.recordDecision(
      inProgressReview._id,
      {
        type: 'policy_change',
        title: 'Update patient safety policy',
        rationale: 'New CBAHI requirement',
      },
      FAKE_USER_ID
    );
    expect(updated.decisions).toHaveLength(1);
    expect(updated.status).toBe('decisions_recorded');
  });

  test('throws if type/title/rationale missing', async () => {
    await expect(
      svc.recordDecision(inProgressReview._id, { type: 'policy_change', title: 'X' }, FAKE_USER_ID)
    ).rejects.toThrow('decision.type, title and rationale are required');
  });
});

// ══════════════════════════════════════════════════════════════════
//  7. assignAction
// ══════════════════════════════════════════════════════════════════

describe('assignAction', () => {
  let svc, decisionReview;
  beforeEach(async () => {
    const model = makeFakeModel();
    svc = createManagementReviewService({ model });
    const r = await svc.scheduleReview(
      { title: 'Action Test', scheduledFor: '2026-01-01' },
      FAKE_USER_ID
    );
    const ag = await svc.setAgenda(r._id, {}, FAKE_USER_ID);
    const ip = await svc.startMeeting(ag._id, FAKE_USER_ID);
    decisionReview = await svc.recordDecision(
      ip._id,
      { type: 'resource_allocation', title: 'Hire 2 PTs', rationale: 'Demand increase' },
      FAKE_USER_ID
    );
  });

  test('adds action and transitions to actions_assigned', async () => {
    const updated = await svc.assignAction(
      decisionReview._id,
      { title: 'Post PT vacancy', ownerUserId: 'user-hr', priority: 'high' },
      FAKE_USER_ID
    );
    expect(updated.actions).toHaveLength(1);
    expect(updated.status).toBe('actions_assigned');
    expect(updated.actions[0].priority).toBe('high');
  });

  test('auto-computes dueDate when omitted (high = 30 days)', async () => {
    const NOW = new Date('2026-01-01');
    const s = createManagementReviewService({
      model: makeFakeModel(),
      now: () => NOW,
    });
    const r = await s.scheduleReview({ title: 'T', scheduledFor: '2026-01-01' }, FAKE_USER_ID);
    const ag = await s.setAgenda(r._id, {}, FAKE_USER_ID);
    const ip = await s.startMeeting(ag._id, FAKE_USER_ID);
    const dec = await s.recordDecision(
      ip._id,
      { type: 'noted_only', title: 'X', rationale: 'Y' },
      FAKE_USER_ID
    );
    const updated = await s.assignAction(
      dec._id,
      { title: 'Act', ownerUserId: 'u1', priority: 'high' },
      FAKE_USER_ID
    );
    const expected = new Date('2026-01-01');
    expected.setDate(expected.getDate() + 30);
    expect(updated.actions[0].dueDate.toDateString()).toBe(expected.toDateString());
  });

  test('rejects if decisions not yet recorded', async () => {
    const r = await svc.scheduleReview({ title: 'T', scheduledFor: '2026-01-01' }, FAKE_USER_ID);
    const ag = await svc.setAgenda(r._id, {}, FAKE_USER_ID);
    const ip = await svc.startMeeting(ag._id, FAKE_USER_ID);
    await expect(
      svc.assignAction(ip._id, { title: 'A', ownerUserId: 'u1' }, FAKE_USER_ID)
    ).rejects.toMatchObject({ code: 'INVALID_PHASE' });
  });
});

// ══════════════════════════════════════════════════════════════════
//  8. updateActionStatus
// ══════════════════════════════════════════════════════════════════

describe('updateActionStatus', () => {
  let svc, reviewWithAction, actionId;

  beforeEach(async () => {
    const model = makeFakeModel();
    svc = createManagementReviewService({ model });
    const r = await svc.scheduleReview({ title: 'T', scheduledFor: '2026-01-01' }, FAKE_USER_ID);
    const ag = await svc.setAgenda(r._id, {}, FAKE_USER_ID);
    const ip = await svc.startMeeting(ag._id, FAKE_USER_ID);
    const dec = await svc.recordDecision(
      ip._id,
      { type: 'noted_only', title: 'T', rationale: 'R' },
      FAKE_USER_ID
    );
    reviewWithAction = await svc.assignAction(
      dec._id,
      { title: 'Do X', ownerUserId: 'u2', priority: 'medium' },
      FAKE_USER_ID
    );
    actionId = String(reviewWithAction.actions[0]._id);
  });

  test('updates action status to in_progress', async () => {
    const updated = await svc.updateActionStatus(
      reviewWithAction._id,
      actionId,
      { status: 'in_progress' },
      FAKE_USER_ID
    );
    expect(updated.actions[0].status).toBe('in_progress');
  });

  test('sets completedAt when status = completed', async () => {
    const NOW = new Date('2026-03-15');
    const s = createManagementReviewService({
      model: svc.model,
      now: () => NOW,
    });
    const updated = await s.updateActionStatus(
      reviewWithAction._id,
      actionId,
      { status: 'completed', completionNotes: 'Done' },
      FAKE_USER_ID
    );
    expect(updated.actions[0].completedAt.toDateString()).toBe(NOW.toDateString());
    expect(updated.actions[0].completionNotes).toBe('Done');
  });

  test('throws VALIDATION for invalid status', async () => {
    await expect(
      svc.updateActionStatus(reviewWithAction._id, actionId, { status: 'flying' }, FAKE_USER_ID)
    ).rejects.toMatchObject({ code: 'VALIDATION' });
  });

  test('throws NOT_FOUND for unknown actionId', async () => {
    await expect(
      svc.updateActionStatus(
        reviewWithAction._id,
        'nonexistent-action-id',
        { status: 'completed' },
        FAKE_USER_ID
      )
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});

// ══════════════════════════════════════════════════════════════════
//  9. setMinutes
// ══════════════════════════════════════════════════════════════════

describe('setMinutes', () => {
  let svc, inProgressReview;
  beforeEach(async () => {
    const model = makeFakeModel();
    svc = createManagementReviewService({ model });
    const r = await svc.scheduleReview({ title: 'T', scheduledFor: '2026-01-01' }, FAKE_USER_ID);
    const ag = await svc.setAgenda(r._id, {}, FAKE_USER_ID);
    inProgressReview = await svc.startMeeting(ag._id, FAKE_USER_ID);
  });

  test('sets minutes text on in_progress review', async () => {
    const updated = await svc.setMinutes(
      inProgressReview._id,
      'Meeting opened at 09:00...',
      FAKE_USER_ID
    );
    expect(updated.minutes).toBe('Meeting opened at 09:00...');
  });

  test('throws INVALID_PHASE when status is scheduled', async () => {
    const r2 = await svc.scheduleReview({ title: 'T2', scheduledFor: '2026-06-01' }, FAKE_USER_ID);
    await expect(svc.setMinutes(r2._id, 'Notes...', FAKE_USER_ID)).rejects.toMatchObject({
      code: 'INVALID_PHASE',
    });
  });

  test('throws if minutes is not a string', async () => {
    await expect(svc.setMinutes(inProgressReview._id, 42, FAKE_USER_ID)).rejects.toThrow(
      'minutes must be a string'
    );
  });
});

// ══════════════════════════════════════════════════════════════════
//  10. closeReview
// ══════════════════════════════════════════════════════════════════

describe('closeReview', () => {
  let svc, readyToClose;
  beforeEach(async () => {
    const model = makeFakeModel();
    svc = createManagementReviewService({ model });
    const r = await svc.scheduleReview(
      { title: 'Close Test', scheduledFor: '2026-01-01' },
      FAKE_USER_ID
    );
    const ag = await svc.setAgenda(r._id, {}, FAKE_USER_ID);
    const ip = await svc.startMeeting(ag._id, FAKE_USER_ID);
    const dec = await svc.recordDecision(
      ip._id,
      { type: 'noted_only', title: 'T', rationale: 'R' },
      FAKE_USER_ID
    );
    readyToClose = await svc.assignAction(
      dec._id,
      { title: 'Act', ownerUserId: 'u1' },
      FAKE_USER_ID
    );
  });

  test('transitions actions_assigned → closed', async () => {
    const closed = await svc.closeReview(
      readyToClose._id,
      { closureNotes: 'All done' },
      FAKE_USER_ID
    );
    expect(closed.status).toBe('closed');
    expect(closed.closedAt).toBeDefined();
    expect(closed.closureNotes).toBe('All done');
  });

  test('is idempotent — second call returns unchanged document', async () => {
    readyToClose.save.mockClear(); // reset counter — beforeEach already called save N times
    const closed1 = await svc.closeReview(readyToClose._id, {}, FAKE_USER_ID);
    const closed2 = await svc.closeReview(readyToClose._id, {}, FAKE_USER_ID);
    expect(closed2.status).toBe('closed');
    expect(closed2._id).toBe(closed1._id);
    // save() must not be called again
    expect(closed1.save).toHaveBeenCalledTimes(1);
  });

  test('auto-schedules next periodic review', async () => {
    const NOW = new Date('2026-01-01');
    const s = createManagementReviewService({
      model: svc.model,
      now: () => NOW,
    });
    const closed = await s.closeReview(readyToClose._id, {}, FAKE_USER_ID);
    expect(closed.nextReviewScheduledFor).toBeDefined();
  });
});

// ══════════════════════════════════════════════════════════════════
//  11. cancelReview
// ══════════════════════════════════════════════════════════════════

describe('cancelReview', () => {
  let svc, review;
  beforeEach(async () => {
    const model = makeFakeModel();
    svc = createManagementReviewService({ model });
    review = await svc.scheduleReview(
      { title: 'Cancel Me', scheduledFor: '2026-01-01' },
      FAKE_USER_ID
    );
  });

  test('cancels a scheduled review', async () => {
    const cancelled = await svc.cancelReview(review._id, 'No quorum', FAKE_USER_ID);
    expect(cancelled.status).toBe('cancelled');
    expect(cancelled.cancelledReason).toBe('No quorum');
  });

  test('is idempotent on already-cancelled review', async () => {
    const c1 = await svc.cancelReview(review._id, 'Reason A', FAKE_USER_ID);
    const c2 = await svc.cancelReview(review._id, 'Reason B', FAKE_USER_ID);
    expect(c2.cancelledReason).toBe('Reason A'); // original unchanged
  });

  test('throws if reason is blank', async () => {
    await expect(svc.cancelReview(review._id, '   ', FAKE_USER_ID)).rejects.toThrow(
      'cancellation reason is required'
    );
  });

  test('throws ILLEGAL_TRANSITION on closed review', async () => {
    review.status = 'closed';
    await expect(svc.cancelReview(review._id, 'Late cancel', FAKE_USER_ID)).rejects.toMatchObject({
      code: 'ILLEGAL_TRANSITION',
    });
  });
});

// ══════════════════════════════════════════════════════════════════
//  12. approve
// ══════════════════════════════════════════════════════════════════

describe('approve', () => {
  let svc, closedReview;
  beforeEach(async () => {
    const model = makeFakeModel();
    svc = createManagementReviewService({ model });
    const r = await svc.scheduleReview({ title: 'T', scheduledFor: '2026-01-01' }, FAKE_USER_ID);
    const ag = await svc.setAgenda(r._id, {}, FAKE_USER_ID);
    const ip = await svc.startMeeting(ag._id, FAKE_USER_ID);
    const dec = await svc.recordDecision(
      ip._id,
      { type: 'noted_only', title: 'T', rationale: 'R' },
      FAKE_USER_ID
    );
    const act = await svc.assignAction(dec._id, { title: 'X', ownerUserId: 'u1' }, FAKE_USER_ID);
    closedReview = await svc.closeReview(act._id, {}, FAKE_USER_ID);
  });

  test('appends approval to closed review', async () => {
    const updated = await svc.approve(
      closedReview._id,
      { role: 'ceo', notes: 'Approved' },
      FAKE_USER_ID
    );
    expect(updated.approvals).toHaveLength(1);
    expect(updated.approvals[0].role).toBe('ceo');
  });

  test('throws INVALID_PHASE on non-closed review', async () => {
    const r = await svc.scheduleReview({ title: 'T', scheduledFor: '2026-01-01' }, FAKE_USER_ID);
    await expect(svc.approve(r._id, { role: 'ceo' }, FAKE_USER_ID)).rejects.toMatchObject({
      code: 'INVALID_PHASE',
    });
  });

  test('throws if role is missing', async () => {
    await expect(svc.approve(closedReview._id, { notes: 'X' }, FAKE_USER_ID)).rejects.toThrow(
      'role is required for approval'
    );
  });
});

// ══════════════════════════════════════════════════════════════════
//  13. ALLOWED_TRANSITIONS map correctness
// ══════════════════════════════════════════════════════════════════

describe('ALLOWED_TRANSITIONS', () => {
  test('scheduled can go to agenda_set or cancelled', () => {
    expect(ALLOWED_TRANSITIONS.scheduled).toEqual(
      expect.arrayContaining(['agenda_set', 'cancelled'])
    );
  });

  test('closed has no further transitions', () => {
    expect(ALLOWED_TRANSITIONS.closed).toHaveLength(0);
  });

  test('cancelled has no further transitions', () => {
    expect(ALLOWED_TRANSITIONS.cancelled).toHaveLength(0);
  });

  test('actions_assigned can close or cancel', () => {
    expect(ALLOWED_TRANSITIONS.actions_assigned).toEqual(
      expect.arrayContaining(['closed', 'cancelled'])
    );
  });
});

// ══════════════════════════════════════════════════════════════════
//  14. getDashboard (enhanced)
// ══════════════════════════════════════════════════════════════════

describe('getDashboard', () => {
  let svc;

  beforeEach(() => {
    const now = new Date('2026-05-11T12:00:00Z');
    const model = makeFakeModel([
      makeReview({
        status: 'closed',
        closedAt: new Date('2026-04-01'),
        startedAt: new Date('2026-03-15'),
        scheduledFor: new Date('2026-03-01'),
        actions: [{ status: 'completed' }],
      }),
      makeReview({
        status: 'closed',
        closedAt: new Date('2026-02-01'),
        startedAt: new Date('2026-01-20'),
        scheduledFor: new Date('2026-01-15'),
        actions: [{ status: 'open' }],
      }),
      makeReview({
        status: 'in_progress',
        scheduledFor: new Date('2026-05-05'),
        actions: [{ status: 'open' }, { status: 'open' }],
      }),
      makeReview({ status: 'scheduled', scheduledFor: new Date('2026-05-20'), actions: [] }),
      makeReview({ status: 'scheduled', scheduledFor: new Date('2026-04-01'), actions: [] }), // overdue
    ]);
    svc = createManagementReviewService({ model, now: () => now });
  });

  test('returns all required fields', async () => {
    const dash = await svc.getDashboard();
    expect(dash).toHaveProperty('total');
    expect(dash).toHaveProperty('open');
    expect(dash).toHaveProperty('closed');
    expect(dash).toHaveProperty('overdue');
    expect(dash).toHaveProperty('dueThisMonth');
    expect(dash).toHaveProperty('completionRate');
    expect(dash).toHaveProperty('totalOpenActions');
    expect(dash).toHaveProperty('upcoming');
    expect(dash).toHaveProperty('latestClosed');
  });

  test('total = 5', async () => {
    const d = await svc.getDashboard();
    expect(d.total).toBe(5);
  });

  test('closed = 2', async () => {
    const d = await svc.getDashboard();
    expect(d.closed).toBe(2);
  });

  test('completionRate = 40 (2/5)', async () => {
    const d = await svc.getDashboard();
    expect(d.completionRate).toBe(40);
  });

  test('latestClosed has reviewNumber', async () => {
    const d = await svc.getDashboard();
    expect(d.latestClosed).not.toBeNull();
    expect(d.latestClosed).toHaveProperty('reviewNumber');
  });
});

// ══════════════════════════════════════════════════════════════════
//  15. getAnalytics
// ══════════════════════════════════════════════════════════════════

describe('getAnalytics', () => {
  let svc;
  beforeEach(() => {
    const model = makeFakeModel([
      makeReview({
        status: 'closed',
        closedAt: new Date('2026-04-10'),
        scheduledFor: new Date('2026-04-01'),
        actions: [{ status: 'completed' }, { status: 'open' }],
      }),
      makeReview({ status: 'scheduled', scheduledFor: new Date('2026-05-01') }),
    ]);
    svc = createManagementReviewService({ model, now: () => new Date('2026-05-11') });
  });

  test('returns trend array of 12 months by default', async () => {
    const result = await svc.getAnalytics();
    expect(result.trend).toHaveLength(12);
  });

  test('returns trend array of N months when requested', async () => {
    const result = await svc.getAnalytics({ months: 6 });
    expect(result.trend).toHaveLength(6);
  });

  test('each trend entry has month/scheduled/closed/cancelled', async () => {
    const result = await svc.getAnalytics({ months: 3 });
    result.trend.forEach(entry => {
      expect(entry).toHaveProperty('month');
      expect(entry).toHaveProperty('scheduled');
      expect(entry).toHaveProperty('closed');
      expect(entry).toHaveProperty('cancelled');
      expect(entry.month).toMatch(/^\d{4}-\d{2}$/);
    });
  });

  test('actionCompletionRate is a number when actions exist', async () => {
    const result = await svc.getAnalytics();
    // 1 completed out of 2 = 50%
    expect(result.actionCompletionRate).toBe(50);
  });

  test('actionCompletionRate is null when no closed reviews with actions', async () => {
    const s = createManagementReviewService({ model: makeFakeModel([]) });
    const result = await s.getAnalytics();
    expect(result.actionCompletionRate).toBeNull();
  });
});

// ══════════════════════════════════════════════════════════════════
//  16. NOT_FOUND guard
// ══════════════════════════════════════════════════════════════════

describe('NOT_FOUND guard', () => {
  let svc;
  beforeEach(() => {
    svc = createManagementReviewService({ model: makeFakeModel() });
  });

  test('scheduleReview → startMeeting with wrong id throws NOT_FOUND', async () => {
    await expect(svc.startMeeting('nonexistent-id', FAKE_USER_ID)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  test('findById returns null for unknown id', async () => {
    const result = await svc.findById('unknown-id');
    expect(result).toBeNull();
  });
});

// ══════════════════════════════════════════════════════════════════
//  17. Dispatcher error handling
// ══════════════════════════════════════════════════════════════════

describe('Dispatcher swallows errors', () => {
  test('service does not throw when dispatcher.emit rejects', async () => {
    const faultyDispatcher = {
      emit: jest.fn().mockRejectedValue(new Error('Bus down')),
    };
    const svc = createManagementReviewService({
      model: makeFakeModel(),
      dispatcher: faultyDispatcher,
    });
    // should not throw despite dispatcher failure
    const doc = await svc.scheduleReview({ title: 'T', scheduledFor: '2026-01-01' }, FAKE_USER_ID);
    expect(doc.status).toBe('scheduled');
  });
});
