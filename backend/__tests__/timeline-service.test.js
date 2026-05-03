'use strict';

/**
 * @file timeline-service.test.js
 * Unit tests for TimelineService
 */

const mongoose = require('mongoose');

// Register CareTimeline model in the global mock
require('../domains/timeline/models/CareTimeline');
const { TimelineService } = require('../domains/timeline/services/TimelineService');

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Chainable query mock (for .find / .findById chains) */
function makeFindChain(result) {
  const chain = {};
  ['sort', 'skip', 'limit', 'lean', 'select', 'populate'].forEach(m => {
    chain[m] = jest.fn().mockReturnValue(chain);
  });
  chain.then = (resolve, reject) => Promise.resolve(result).then(resolve, reject);
  chain.catch = fn => Promise.resolve(result).catch(fn);
  return chain;
}

/** findById — returns { lean: () => Promise } */
function makeLeanChain(result) {
  return { lean: () => Promise.resolve(result) };
}

/** Build a minimal timeline event fixture */
function makeEvent(overrides = {}) {
  return {
    _id: 'evt001',
    beneficiaryId: 'ben001',
    episodeId: 'ep001',
    eventType: 'session_completed',
    category: 'clinical',
    severity: 'info',
    title: 'Session Completed',
    description: 'Physiotherapy session done',
    metadata: {},
    occurredAt: new Date('2026-05-01T10:00:00Z'),
    isVisible: true,
    visibleTo: [],
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('TimelineService', () => {
  let CT; // CareTimeline mock model
  let service;

  beforeEach(() => {
    CT = mongoose.model('CareTimeline');
    service = new TimelineService();
    jest.clearAllMocks();
  });

  // ─── addEvent ─────────────────────────────────────────────────────────────

  describe('addEvent', () => {
    it('creates event with all provided fields', async () => {
      const evt = makeEvent();
      CT.create.mockResolvedValueOnce(evt);

      const result = await service.addEvent({
        beneficiaryId: 'ben001',
        episodeId: 'ep001',
        eventType: 'session_completed',
        category: 'clinical',
        title: 'Session Completed',
        metadata: {},
      });

      expect(CT.create).toHaveBeenCalledWith(
        expect.objectContaining({
          beneficiaryId: 'ben001',
          episodeId: 'ep001',
          eventType: 'session_completed',
          category: 'clinical',
        })
      );
      expect(result._id).toBe('evt001');
    });

    it('defaults category to clinical and severity to info', async () => {
      const evt = makeEvent();
      CT.create.mockResolvedValueOnce(evt);

      await service.addEvent({ beneficiaryId: 'ben001', eventType: 'note_added' });

      expect(CT.create).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'clinical', severity: 'info' })
      );
    });

    it('accepts eventDate alias and maps to occurredAt', async () => {
      const evt = makeEvent();
      CT.create.mockResolvedValueOnce(evt);

      const dateStr = '2026-04-01T08:00:00Z';
      await service.addEvent({
        beneficiaryId: 'ben001',
        eventType: 'registration',
        eventDate: dateStr,
      });

      const callArg = CT.create.mock.calls[0][0];
      expect(callArg.occurredAt).toEqual(new Date(dateStr));
    });

    it('throws 400 when beneficiaryId is missing', async () => {
      await expect(service.addEvent({ eventType: 'session_completed' })).rejects.toMatchObject({
        statusCode: 400,
      });
    });

    it('throws 400 when eventType is missing', async () => {
      await expect(service.addEvent({ beneficiaryId: 'ben001' })).rejects.toMatchObject({
        statusCode: 400,
      });
    });

    it('emits timeline:event-added after creation', async () => {
      const evt = makeEvent();
      CT.create.mockResolvedValueOnce(evt);

      const emitted = [];
      service.on('timeline:event-added', payload => emitted.push(payload));

      await service.addEvent({ beneficiaryId: 'ben001', eventType: 'session_completed' });

      expect(emitted).toHaveLength(1);
      expect(emitted[0]).toMatchObject({
        beneficiaryId: evt.beneficiaryId,
        eventType: evt.eventType,
      });
    });
  });

  // ─── getBeneficiaryTimeline ────────────────────────────────────────────────

  describe('getBeneficiaryTimeline', () => {
    it('returns data and total for a beneficiary', async () => {
      const events = [makeEvent(), makeEvent({ _id: 'evt002' })];
      CT.find.mockReturnValueOnce(makeFindChain(events));
      CT.countDocuments.mockResolvedValueOnce(2);

      const result = await service.getBeneficiaryTimeline('ben001');

      expect(CT.find).toHaveBeenCalledWith({ beneficiaryId: 'ben001' });
      expect(result).toEqual({ data: events, total: 2 });
    });

    it('applies eventType and category filters', async () => {
      CT.find.mockReturnValueOnce(makeFindChain([]));
      CT.countDocuments.mockResolvedValueOnce(0);

      await service.getBeneficiaryTimeline('ben001', {
        eventType: 'session_completed',
        category: 'clinical',
      });

      expect(CT.find).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'session_completed', category: 'clinical' })
      );
    });

    it('applies date range filter (from and to)', async () => {
      CT.find.mockReturnValueOnce(makeFindChain([]));
      CT.countDocuments.mockResolvedValueOnce(0);

      await service.getBeneficiaryTimeline('ben001', { from: '2026-01-01', to: '2026-12-31' });

      const callArg = CT.find.mock.calls[0][0];
      expect(callArg.occurredAt.$gte).toEqual(new Date('2026-01-01'));
      expect(callArg.occurredAt.$lte).toEqual(new Date('2026-12-31'));
    });

    it('supports pagination skip and limit', async () => {
      CT.find.mockReturnValueOnce(makeFindChain([]));
      CT.countDocuments.mockResolvedValueOnce(0);

      await service.getBeneficiaryTimeline('ben001', {}, { limit: 10, skip: 20 });

      const chain = CT.find.mock.results[0].value;
      expect(chain.skip).toHaveBeenCalledWith(20);
      expect(chain.limit).toHaveBeenCalledWith(10);
    });
  });

  // ─── getEpisodeTimeline ────────────────────────────────────────────────────

  describe('getEpisodeTimeline', () => {
    it('returns data and total for an episode', async () => {
      const events = [makeEvent()];
      CT.find.mockReturnValueOnce(makeFindChain(events));
      CT.countDocuments.mockResolvedValueOnce(1);

      const result = await service.getEpisodeTimeline('ep001');

      expect(CT.find).toHaveBeenCalledWith({ episodeId: 'ep001' });
      expect(result).toEqual({ data: events, total: 1 });
    });

    it('applies eventType filter', async () => {
      CT.find.mockReturnValueOnce(makeFindChain([]));
      CT.countDocuments.mockResolvedValueOnce(0);

      await service.getEpisodeTimeline('ep001', { eventType: 'care_plan_created' });

      expect(CT.find).toHaveBeenCalledWith(
        expect.objectContaining({ episodeId: 'ep001', eventType: 'care_plan_created' })
      );
    });
  });

  // ─── getEventById ──────────────────────────────────────────────────────────

  describe('getEventById', () => {
    it('returns the event when found', async () => {
      const evt = makeEvent();
      CT.findById.mockReturnValueOnce(makeLeanChain(evt));

      const result = await service.getEventById('evt001');

      expect(CT.findById).toHaveBeenCalledWith('evt001');
      expect(result._id).toBe('evt001');
    });

    it('throws 404 when event not found', async () => {
      CT.findById.mockReturnValueOnce(makeLeanChain(null));

      await expect(service.getEventById('nonexistent')).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });
});
