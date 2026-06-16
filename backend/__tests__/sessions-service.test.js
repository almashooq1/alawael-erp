/**
 * sessions-service.test.js — Phase: Sessions Domain
 *
 * Unit tests for domains/sessions/services/SessionsService.js
 * Uses global mongoose mock (jest.setup.js). No DB connection.
 */

'use strict';

const mongoose = require('mongoose');

// Register ClinicalSession model with the mock mongoose before importing the service
require('../domains/sessions/models/ClinicalSession');

const { SessionsService } = require('../domains/sessions/services/SessionsService');

/* ─── helpers ──────────────────────────────────────────────────────────── */

/** Build a chainable Mongoose query mock that resolves to `result`. */
function makeFindChain(result) {
  const chain = {};
  ['sort', 'skip', 'limit', 'lean', 'select', 'populate'].forEach(m => {
    chain[m] = jest.fn().mockReturnValue(chain);
  });
  chain.then = (resolve, reject) => Promise.resolve(result).then(resolve, reject);
  chain.catch = fn => Promise.resolve(result).catch(fn);
  return chain;
}

/** Wrap a result in an object with .lean() — for findByIdAndUpdate chains. */
function makeLeanChain(result) {
  return { lean: () => Promise.resolve(result) };
}

/** Quick fixture for a session document. */
function makeSession(overrides = {}) {
  return {
    _id: 'ses001',
    beneficiaryId: 'ben001',
    episodeId: 'ep001',
    therapistId: 'th001',
    scheduledDate: new Date('2026-06-01T10:00:00Z'),
    type: 'individual',
    modality: 'in_person',
    status: 'scheduled',
    ...overrides,
  };
}

/* ─── setup ────────────────────────────────────────────────────────────── */

describe('SessionsService', () => {
  let service;
  let CS; // ClinicalSession mock model

  beforeEach(() => {
    CS = mongoose.model('ClinicalSession');
    service = new SessionsService();
    jest.clearAllMocks();
  });

  /* ═══════════════════ scheduleSession ═══════════════════════ */

  describe('scheduleSession()', () => {
    it('creates a session and returns it', async () => {
      const session = makeSession();
      CS.create.mockResolvedValueOnce(session);

      const result = await service.scheduleSession({
        beneficiaryId: 'ben001',
        scheduledDate: new Date(),
      });

      expect(CS.create).toHaveBeenCalledWith(
        expect.objectContaining({ beneficiaryId: 'ben001', status: 'scheduled' })
      );
      expect(result).toBe(session);
    });

    it('defaults type to individual and modality to in_person', async () => {
      CS.create.mockResolvedValueOnce(makeSession());
      await service.scheduleSession({ beneficiaryId: 'b1', scheduledDate: new Date() });

      const callArg = CS.create.mock.calls[0][0];
      expect(callArg.type).toBe('individual');
      expect(callArg.modality).toBe('in_person');
    });

    it('respects explicit type and modality', async () => {
      CS.create.mockResolvedValueOnce(makeSession({ type: 'group', modality: 'tele_rehab' }));
      await service.scheduleSession({
        beneficiaryId: 'b1',
        scheduledDate: new Date(),
        type: 'group',
        modality: 'tele_rehab',
      });
      const callArg = CS.create.mock.calls[0][0];
      expect(callArg.type).toBe('group');
      expect(callArg.modality).toBe('tele_rehab');
    });

    it('throws 400 when beneficiaryId is missing', async () => {
      await expect(service.scheduleSession({ scheduledDate: new Date() })).rejects.toMatchObject({
        statusCode: 400,
      });
      expect(CS.create).not.toHaveBeenCalled();
    });

    it('throws 400 when scheduledDate is missing', async () => {
      await expect(service.scheduleSession({ beneficiaryId: 'b1' })).rejects.toMatchObject({
        statusCode: 400,
      });
      expect(CS.create).not.toHaveBeenCalled();
    });

    it('emits session:scheduled event after creation', async () => {
      const session = makeSession();
      CS.create.mockResolvedValueOnce(session);

      const events = [];
      service.on('session:scheduled', e => events.push(e));

      await service.scheduleSession({ beneficiaryId: 'ben001', scheduledDate: new Date() });

      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        sessionId: 'ses001',
        beneficiaryId: 'ben001',
      });
    });
  });

  /* ═══════════════════ listSessions ═══════════════════════ */

  describe('listSessions()', () => {
    it('returns data and total', async () => {
      const sessions = [makeSession(), makeSession({ _id: 'ses002' })];
      CS.find.mockReturnValueOnce(makeFindChain(sessions));
      CS.countDocuments.mockResolvedValueOnce(2);

      const result = await service.listSessions({});

      expect(result.data).toBe(sessions);
      expect(result.total).toBe(2);
    });

    it('returns empty result when no sessions exist', async () => {
      CS.find.mockReturnValueOnce(makeFindChain([]));
      CS.countDocuments.mockResolvedValueOnce(0);

      const result = await service.listSessions({});

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('applies beneficiaryId filter', async () => {
      CS.find.mockReturnValueOnce(makeFindChain([]));
      CS.countDocuments.mockResolvedValueOnce(0);

      await service.listSessions({ beneficiaryId: 'b1' });

      const query = CS.find.mock.calls[0][0];
      expect(query.beneficiaryId).toBe('b1');
    });

    it('applies status filter', async () => {
      CS.find.mockReturnValueOnce(makeFindChain([]));
      CS.countDocuments.mockResolvedValueOnce(0);

      await service.listSessions({ status: 'completed' });

      const query = CS.find.mock.calls[0][0];
      expect(query.status).toBe('completed');
    });

    it('applies date range filter', async () => {
      CS.find.mockReturnValueOnce(makeFindChain([]));
      CS.countDocuments.mockResolvedValueOnce(0);

      const from = '2026-01-01';
      const to = '2026-12-31';
      await service.listSessions({ from, to });

      const query = CS.find.mock.calls[0][0];
      expect(query.scheduledDate).toBeDefined();
      expect(query.scheduledDate.$gte).toEqual(new Date(from));
      expect(query.scheduledDate.$lte).toEqual(new Date(to));
    });

    it('excludes soft-deleted sessions', async () => {
      CS.find.mockReturnValueOnce(makeFindChain([]));
      CS.countDocuments.mockResolvedValueOnce(0);

      await service.listSessions({});

      const query = CS.find.mock.calls[0][0];
      expect(query.isDeleted).toEqual({ $ne: true });
    });
  });

  /* ═══════════════════ getSessionById ═══════════════════════ */

  describe('getSessionById()', () => {
    it('returns the session when found', async () => {
      const session = makeSession();
      CS.findById.mockReturnValueOnce(makeFindChain(session));

      const result = await service.getSessionById('ses001');

      expect(CS.findById).toHaveBeenCalledWith('ses001');
      expect(result).toBe(session);
    });

    it('throws 404 when session does not exist', async () => {
      CS.findById.mockReturnValueOnce(makeFindChain(null));

      await expect(service.getSessionById('nonexistent')).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });

  /* ═══════════════════ getBeneficiarySessions ═══════════════════════ */

  describe('getBeneficiarySessions()', () => {
    it('returns sessions for the given beneficiary', async () => {
      const sessions = [makeSession()];
      CS.find.mockReturnValueOnce(makeFindChain(sessions));

      const result = await service.getBeneficiarySessions('ben001');

      const query = CS.find.mock.calls[0][0];
      expect(query.beneficiaryId).toBe('ben001');
      expect(result.data).toBe(sessions);
      expect(result.total).toBe(1);
    });

    it('excludes soft-deleted sessions', async () => {
      CS.find.mockReturnValueOnce(makeFindChain([]));

      await service.getBeneficiarySessions('ben001');

      const query = CS.find.mock.calls[0][0];
      expect(query.isDeleted).toEqual({ $ne: true });
    });
  });

  /* ═══════════════════ getTherapistSessions ═══════════════════════ */

  describe('getTherapistSessions()', () => {
    it('returns sessions for the given therapist', async () => {
      const sessions = [makeSession({ therapistId: 'th001' })];
      CS.find.mockReturnValueOnce(makeFindChain(sessions));

      const result = await service.getTherapistSessions('th001');

      const query = CS.find.mock.calls[0][0];
      expect(query.therapistId).toBe('th001');
      expect(result.data).toBe(sessions);
    });

    it('applies date range when provided', async () => {
      CS.find.mockReturnValueOnce(makeFindChain([]));

      const from = '2026-06-01';
      const to = '2026-06-30';
      await service.getTherapistSessions('th001', { from, to });

      const query = CS.find.mock.calls[0][0];
      expect(query.scheduledDate.$gte).toEqual(new Date(from));
      expect(query.scheduledDate.$lte).toEqual(new Date(to));
    });
  });

  /* ═══════════════════ updateSession ═══════════════════════ */

  describe('updateSession()', () => {
    it('updates and returns the session', async () => {
      const updated = makeSession({ status: 'confirmed' });
      CS.findByIdAndUpdate.mockReturnValueOnce(makeLeanChain(updated));

      const result = await service.updateSession('ses001', { status: 'confirmed' });

      expect(CS.findByIdAndUpdate).toHaveBeenCalledWith(
        'ses001',
        { $set: { status: 'confirmed' } },
        { returnDocument: 'after', runValidators: true }
      );
      expect(result).toBe(updated);
    });

    it('throws 404 when session does not exist', async () => {
      CS.findByIdAndUpdate.mockReturnValueOnce(makeLeanChain(null));

      await expect(service.updateSession('bad-id', {})).rejects.toMatchObject({ statusCode: 404 });
    });

    it('emits session:updated event on success', async () => {
      CS.findByIdAndUpdate.mockReturnValueOnce(makeLeanChain(makeSession({ _id: 'ses001' })));

      const events = [];
      service.on('session:updated', e => events.push(e));

      await service.updateSession('ses001', { status: 'confirmed' });

      expect(events[0]).toMatchObject({ sessionId: 'ses001' });
    });
  });

  /* ═══════════════════ completeSession ═══════════════════════ */

  describe('completeSession()', () => {
    it('marks session as completed with documentation', async () => {
      const completed = makeSession({ status: 'completed' });
      CS.findByIdAndUpdate.mockReturnValueOnce(makeLeanChain(completed));

      const result = await service.completeSession('ses001', {
        duration: 45,
        attendanceStatus: 'attended',
        goalProgress: [{ goalId: 'g1', progressAfter: 80 }],
        notes: 'Good session',
      });

      const updateArg = CS.findByIdAndUpdate.mock.calls[0][1];
      expect(updateArg.$set.status).toBe('completed');
      expect(updateArg.$set.attendanceStatus).toBe('attended');
      expect(updateArg.$set.goalProgress).toHaveLength(1);
      expect(result).toBe(completed);
    });

    it('defaults attendanceStatus to attended when omitted', async () => {
      CS.findByIdAndUpdate.mockReturnValueOnce(makeLeanChain(makeSession({ status: 'completed' })));

      await service.completeSession('ses001', { duration: 45 });

      const updateArg = CS.findByIdAndUpdate.mock.calls[0][1];
      expect(updateArg.$set.attendanceStatus).toBe('attended');
    });

    it('throws 404 when session does not exist', async () => {
      CS.findByIdAndUpdate.mockReturnValueOnce(makeLeanChain(null));

      await expect(service.completeSession('bad-id', {})).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it('emits session.completed canonical event', async () => {
      CS.findByIdAndUpdate.mockReturnValueOnce(makeLeanChain(makeSession({ _id: 'ses001' })));

      const events = [];
      service.on('session.completed', e => events.push(e));

      await service.completeSession('ses001', {
        goalProgress: [{ goalId: 'g1' }, { goalId: 'g2' }],
      });

      expect(events[0]).toMatchObject({ sessionId: 'ses001', sessionType: 'individual' });
    });
  });

  /* ═══════════════════ cancelSession ═══════════════════════ */

  describe('cancelSession()', () => {
    it('cancels the session with a reason', async () => {
      const cancelled = makeSession({ status: 'cancelled' });
      CS.findByIdAndUpdate.mockReturnValueOnce(makeLeanChain(cancelled));

      const result = await service.cancelSession('ses001', 'No show');

      const updateArg = CS.findByIdAndUpdate.mock.calls[0][1];
      expect(updateArg.$set.status).toBe('cancelled');
      expect(updateArg.$set['cancellation.reason']).toBe('No show');
      expect(result).toBe(cancelled);
    });

    it('throws 404 when session does not exist', async () => {
      CS.findByIdAndUpdate.mockReturnValueOnce(makeLeanChain(null));

      await expect(service.cancelSession('bad-id', 'reason')).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it('emits session:cancelled event', async () => {
      CS.findByIdAndUpdate.mockReturnValueOnce(makeLeanChain(makeSession({ _id: 'ses001' })));

      const events = [];
      service.on('session:cancelled', e => events.push(e));

      await service.cancelSession('ses001', 'Family request');

      expect(events[0]).toMatchObject({ sessionId: 'ses001', reason: 'Family request' });
    });
  });

  /* ═══════════════════ getDashboard ═══════════════════════ */

  describe('getDashboard()', () => {
    it('returns total, todaySessions, byStatus, byModality', async () => {
      CS.countDocuments
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(5); // today
      CS.aggregate
        .mockResolvedValueOnce([
          { _id: 'completed', count: 60 },
          { _id: 'scheduled', count: 40 },
        ]) // byStatus
        .mockResolvedValueOnce([
          { _id: 'in_person', count: 80 },
          { _id: 'tele_rehab', count: 20 },
        ]); // byModality

      const result = await service.getDashboard();

      expect(result.total).toBe(100);
      expect(result.todaySessions).toBe(5);
      expect(result.byStatus.completed).toBe(60);
      expect(result.byModality.in_person).toBe(80);
    });

    it('applies date range filter when provided', async () => {
      CS.countDocuments.mockResolvedValue(0);
      CS.aggregate.mockResolvedValue([]);

      await service.getDashboard({ from: '2026-01-01', to: '2026-12-31' });

      // First countDocuments call (total) should have scheduledDate filter
      const firstQuery = CS.countDocuments.mock.calls[0][0];
      expect(firstQuery.scheduledDate).toBeDefined();
      expect(firstQuery.scheduledDate.$gte).toEqual(new Date('2026-01-01'));
    });

    it('returns zero stats when no sessions exist', async () => {
      CS.countDocuments.mockResolvedValue(0);
      CS.aggregate.mockResolvedValue([]);

      const result = await service.getDashboard();

      expect(result.total).toBe(0);
      expect(result.byStatus).toEqual({});
      expect(result.byModality).toEqual({});
    });
  });
});
