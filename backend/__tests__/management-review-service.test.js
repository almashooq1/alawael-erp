'use strict';

/**
 * management-review-service.test.js — Phase 13 Commit 1 (4.0.55).
 *
 * Unit tests for the ManagementReview service state machine.
 * Uses mongodb-memory-server so indexes + pre-validate hooks + enum
 * validation all run against a real Mongoose engine.
 */

process.env.NODE_ENV = 'test';

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const { createManagementReviewService } = require('../services/quality/managementReview.service');
const {
  REVIEW_INPUTS,
  REVIEW_OUTPUTS,
  REQUIRED_ATTENDEE_ROLES,
} = require('../config/management-review.registry');

let mongoServer;
let ManagementReview;

const userA = new mongoose.Types.ObjectId();
const userB = new mongoose.Types.ObjectId();
const branch1 = new mongoose.Types.ObjectId();

function fullAttendees() {
  return REQUIRED_ATTENDEE_ROLES.slice(0, 4).map((role, i) => ({
    userId: new mongoose.Types.ObjectId(),
    nameSnapshot: `Attendee ${i}`,
    role,
    present: true,
  }));
}

function addAllRequiredInputs(svc, id, userId) {
  return Promise.all(
    REVIEW_INPUTS.filter(i => i.required).map(i =>
      svc.recordInput(id, { code: i.code, summary: `captured ${i.code}` }, userId)
    )
  );
}

function addAllRequiredOutputs(svc, id, userId) {
  return Promise.all(
    REVIEW_OUTPUTS.filter(o => o.required).map(o =>
      svc.recordOutput(id, { code: o.code, description: `decided ${o.code}` }, userId)
    )
  );
}

// ── setup ──────────────────────────────────────────────────────────

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  if (mongoose.connection.readyState !== 0) {
    try {
      await mongoose.disconnect();
    } catch {
      /* ignore */
    }
  }
  await mongoose.connect(mongoServer.getUri(), { dbName: 'mgmt-review-test' });
  ManagementReview = require('../models/quality/ManagementReview.model');
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

afterEach(async () => {
  await ManagementReview.deleteMany({});
});

// ── event capture helper ───────────────────────────────────────────

function makeDispatcher() {
  const events = [];
  return {
    events,
    async emit(name, payload) {
      events.push({ name, payload });
    },
  };
}

// ── tests ──────────────────────────────────────────────────────────

describe('ManagementReviewService', () => {
  function svc(dispatcher) {
    return createManagementReviewService({
      model: ManagementReview,
      dispatcher: dispatcher || null,
    });
  }

  describe('scheduleReview', () => {
    it('creates a review in scheduled state and auto-generates reviewNumber', async () => {
      const s = svc();
      const doc = await s.scheduleReview(
        {
          title: 'H1 2026 Review',
          scheduledFor: '2026-06-30T10:00:00Z',
          branchId: branch1,
          type: 'periodic',
          cycleLabel: 'H1-2026',
        },
        userA
      );

      expect(doc.status).toBe('scheduled');
      expect(doc.reviewNumber).toMatch(/^MR-2026-0001$/);
      expect(String(doc.createdBy)).toBe(String(userA));
      expect(doc.type).toBe('periodic');
    });

    it('emits quality.review.scheduled', async () => {
      const d = makeDispatcher();
      await svc(d).scheduleReview({ title: 'x', scheduledFor: '2026-07-01T10:00:00Z' }, userA);
      expect(d.events.map(e => e.name)).toContain('quality.review.scheduled');
    });

    it('rejects when title is missing', async () => {
      await expect(
        svc().scheduleReview({ scheduledFor: '2026-07-01T10:00:00Z' }, userA)
      ).rejects.toThrow(/title/);
    });

    it('increments counter per year', async () => {
      const s = svc();
      const a = await s.scheduleReview({ title: 'a', scheduledFor: '2026-01-01T10:00:00Z' }, userA);
      const b = await s.scheduleReview({ title: 'b', scheduledFor: '2026-07-01T10:00:00Z' }, userA);
      expect(a.reviewNumber).toBe('MR-2026-0001');
      expect(b.reviewNumber).toBe('MR-2026-0002');
    });
  });

  describe('state transitions', () => {
    async function newScheduled(s = svc()) {
      return s.scheduleReview(
        { title: 'T', scheduledFor: '2026-06-30T10:00:00Z', branchId: branch1 },
        userA
      );
    }

    it('goes scheduled → agenda_set', async () => {
      const s = svc();
      const r = await newScheduled(s);
      const updated = await s.setAgenda(
        r._id,
        { agenda: ['Review previous actions'], attendees: fullAttendees() },
        userA
      );
      expect(updated.status).toBe('agenda_set');
      expect(updated.attendees).toHaveLength(4);
    });

    it('rejects illegal skip scheduled → closed', async () => {
      const s = svc();
      const r = await newScheduled(s);
      await expect(s.closeReview(r._id, {}, userA)).rejects.toMatchObject({
        code: 'ILLEGAL_TRANSITION',
      });
    });

    it('full happy path scheduled → closed', async () => {
      const d = makeDispatcher();
      const s = svc(d);
      const r = await newScheduled(s);

      await s.setAgenda(r._id, { agenda: ['a'], attendees: fullAttendees() }, userA);
      await s.startMeeting(r._id, userA);
      await addAllRequiredInputs(s, r._id, userA);
      await addAllRequiredOutputs(s, r._id, userA);
      await s.recordDecision(
        r._id,
        { type: 'policy_change', title: 'New protocol', rationale: 'audit finding' },
        userA
      );
      await s.assignAction(
        r._id,
        { title: 'Update policy doc', ownerUserId: userB, priority: 'high' },
        userA
      );
      const closed = await s.closeReview(r._id, { closureNotes: 'all good' }, userA);

      expect(closed.status).toBe('closed');
      expect(closed.closedBy.toString()).toBe(String(userA));
      expect(closed.nextReviewScheduledFor).toBeInstanceOf(Date);

      const names = d.events.map(e => e.name);
      expect(names).toContain('quality.review.scheduled');
      expect(names).toContain('quality.review.agenda_set');
      expect(names).toContain('quality.review.started');
      expect(names).toContain('quality.review.input_recorded');
      expect(names).toContain('quality.review.output_recorded');
      expect(names).toContain('quality.review.decision_recorded');
      expect(names).toContain('quality.review.action_assigned');
      expect(names).toContain('quality.review.closed');
    });

    it('closeReview is idempotent', async () => {
      const s = svc();
      const r = await newScheduled(s);
      await s.setAgenda(r._id, { attendees: fullAttendees() }, userA);
      await s.startMeeting(r._id, userA);
      await addAllRequiredInputs(s, r._id, userA);
      await addAllRequiredOutputs(s, r._id, userA);
      await s.recordDecision(r._id, { type: 'noted_only', title: 't', rationale: 'r' }, userA);
      await s.assignAction(r._id, { title: 'x', ownerUserId: userB }, userA);
      const first = await s.closeReview(r._id, {}, userA);
      const second = await s.closeReview(r._id, {}, userA); // second call
      expect(String(first._id)).toBe(String(second._id));
      expect(second.status).toBe('closed');
    });
  });

  describe('closure validation', () => {
    it('blocks close when required inputs missing', async () => {
      const s = svc();
      const r = await s.scheduleReview(
        { title: 'T', scheduledFor: '2026-06-30', branchId: branch1 },
        userA
      );
      await s.setAgenda(r._id, { attendees: fullAttendees() }, userA);
      await s.startMeeting(r._id, userA);
      // skip inputs/outputs — add only decision + action
      await s.recordDecision(r._id, { type: 'noted_only', title: 't', rationale: 'r' }, userA);
      await s.assignAction(r._id, { title: 'x', ownerUserId: userB }, userA);

      await expect(s.closeReview(r._id, {}, userA)).rejects.toMatchObject({
        code: 'INCOMPLETE_REVIEW',
      });
    });

    it('blocks close when quorum not met', async () => {
      const s = svc();
      const r = await s.scheduleReview(
        { title: 'T', scheduledFor: '2026-06-30', branchId: branch1 },
        userA
      );
      // Only 2 attendees — below quorum of 3
      await s.setAgenda(
        r._id,
        {
          attendees: [
            { userId: userA, nameSnapshot: 'A', role: 'ceo' },
            { userId: userB, nameSnapshot: 'B', role: 'quality_manager' },
          ],
        },
        userA
      );
      await s.startMeeting(r._id, userA);
      await addAllRequiredInputs(s, r._id, userA);
      await addAllRequiredOutputs(s, r._id, userA);
      await s.recordDecision(r._id, { type: 'noted_only', title: 't', rationale: 'r' }, userA);
      await s.assignAction(r._id, { title: 'x', ownerUserId: userB }, userA);

      await expect(s.closeReview(r._id, {}, userA)).rejects.toMatchObject({
        code: 'INCOMPLETE_REVIEW',
        missing: expect.arrayContaining([expect.stringMatching(/^quorum:/)]),
      });
    });
  });

  describe('cancelReview', () => {
    it('requires reason', async () => {
      const s = svc();
      const r = await s.scheduleReview({ title: 'T', scheduledFor: '2026-06-30' }, userA);
      await expect(s.cancelReview(r._id, '', userA)).rejects.toThrow(/reason/);
    });

    it('cancels and is idempotent', async () => {
      const d = makeDispatcher();
      const s = svc(d);
      const r = await s.scheduleReview({ title: 'T', scheduledFor: '2026-06-30' }, userA);
      const c1 = await s.cancelReview(r._id, 'leadership unavailable', userA);
      const c2 = await s.cancelReview(r._id, 'again', userA);
      expect(c1.status).toBe('cancelled');
      expect(c2.status).toBe('cancelled');
      expect(c1.cancelledReason).toBe('leadership unavailable');
      // only one cancelled event emitted
      expect(d.events.filter(e => e.name === 'quality.review.cancelled')).toHaveLength(1);
    });
  });

  describe('approvals', () => {
    async function closedReview(s) {
      const r = await s.scheduleReview(
        { title: 'T', scheduledFor: '2026-06-30', branchId: branch1 },
        userA
      );
      await s.setAgenda(r._id, { attendees: fullAttendees() }, userA);
      await s.startMeeting(r._id, userA);
      await addAllRequiredInputs(s, r._id, userA);
      await addAllRequiredOutputs(s, r._id, userA);
      await s.recordDecision(r._id, { type: 'noted_only', title: 't', rationale: 'r' }, userA);
      await s.assignAction(r._id, { title: 'x', ownerUserId: userB }, userA);
      return s.closeReview(r._id, {}, userA);
    }

    it('records a signature on a closed review', async () => {
      const s = svc();
      const r = await closedReview(s);
      const after = await s.approve(r._id, { role: 'ceo', signatureHash: 'abc123' }, userA);
      expect(after.approvals).toHaveLength(1);
      expect(after.approvals[0].role).toBe('ceo');
      expect(after.approvals[0].signatureHash).toBe('abc123');
    });

    it('rejects approval on non-closed review', async () => {
      const s = svc();
      const r = await s.scheduleReview({ title: 'T', scheduledFor: '2026-06-30' }, userA);
      await expect(s.approve(r._id, { role: 'ceo' }, userA)).rejects.toMatchObject({
        code: 'INVALID_PHASE',
      });
    });
  });

  describe('dashboard', () => {
    it('counts open, closed, and overdue', async () => {
      const s = svc();
      await s.scheduleReview(
        { title: 'Past-Due', scheduledFor: '2025-01-01', branchId: branch1 },
        userA
      );
      await s.scheduleReview(
        { title: 'Future', scheduledFor: '2099-01-01', branchId: branch1 },
        userA
      );

      const snap = await s.getDashboard({ branchId: branch1 });
      expect(snap.total).toBe(2);
      expect(snap.open).toBe(2);
      expect(snap.closed).toBe(0);
      expect(snap.overdue).toBe(1);
    });
  });

  describe('list filtering', () => {
    it('filters by status and branch', async () => {
      const s = svc();
      await s.scheduleReview({ title: 'A', scheduledFor: '2026-06-30', branchId: branch1 }, userA);
      const otherBranch = new mongoose.Types.ObjectId();
      await s.scheduleReview(
        { title: 'B', scheduledFor: '2026-06-30', branchId: otherBranch },
        userA
      );

      const rows = await s.list({ branchId: branch1, status: 'scheduled' });
      expect(rows).toHaveLength(1);
      expect(rows[0].title).toBe('A');
    });
  });
});
