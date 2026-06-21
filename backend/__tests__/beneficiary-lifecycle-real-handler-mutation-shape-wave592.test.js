'use strict';

/**
 * beneficiary-lifecycle-real-handler-mutation-shape-wave592.test.js — Wave 592.
 *
 * W585 proves the three REAL data side-effect handlers RUN end-to-end and
 * return their modified counts, but it asserts only the *number* of
 * `updateMany` calls — never the filter / update / options actually sent to
 * Mongoose. That leaves the clinically-sensitive query shape unguarded:
 *
 *   - a regression that dropped the `date: { $gte: now }` clause on
 *     end-active-schedules would silently CANCEL PAST appointments,
 *   - writing an out-of-enum `dischargeReason: 'deceased'` on
 *     close-open-episodes would corrupt episode records (updateMany bypasses
 *     validators),
 *   - dropping the positional `arrayFilters` on release-care-team would flip
 *     EVERY embedded care-team member instead of only the active ones,
 *
 * ...and W585 would stay green for all three.
 *
 * This guard pins the exact mutation shape of each real handler by invoking it
 * directly with arg-capturing mock models and a frozen `now`. Pure unit — no
 * DB, no Express boot, no registry mutation.
 */

const {
  createBeneficiaryLifecycleSideEffectHandlers,
  OP,
  CANCELLABLE_APPOINTMENT_STATUSES,
  OPEN_EPISODE_STATUSES,
} = require('../intelligence/beneficiary-lifecycle-side-effects.service');
const reg = require('../intelligence/beneficiary-lifecycle.registry');

const FROZEN = new Date('2026-05-30T00:00:00.000Z');
const now = () => FROZEN;
const BENE = 'bene-123';

/** Build a fresh handler map with arg-capturing mock models (no jest spies, so
 *  `clearMocks:true` cannot wipe the captured call records). */
function build() {
  const apptCalls = [];
  const epiCalls = [];
  const appointmentModel = {
    updateMany(filter, update, options) {
      apptCalls.push({ filter, update, options });
      return Promise.resolve({ modifiedCount: 1 });
    },
  };
  const episodeModel = {
    updateMany(filter, update, options) {
      epiCalls.push({ filter, update, options });
      return Promise.resolve({ modifiedCount: 1 });
    },
  };
  const handlers = createBeneficiaryLifecycleSideEffectHandlers({
    appointmentModel,
    episodeModel,
    now,
  });
  return { handlers, apptCalls, epiCalls };
}

describe('W592 — real data handler mutation shape', () => {
  describe('end-active-schedules (appointments)', () => {
    let call;
    let result;
    beforeAll(async () => {
      const { handlers, apptCalls } = build();
      result = await handlers[OP.END_ACTIVE_SCHEDULES]({ beneficiaryId: BENE });
      call = apptCalls[0];
    });

    it('issues exactly one updateMany', () => {
      expect(call).toBeDefined();
    });

    it('targets ONLY this beneficiary', () => {
      expect(call.filter.beneficiary).toBe(BENE);
    });

    it('targets ONLY the four cancellable statuses (exact set)', () => {
      expect(call.filter.status).toEqual({ $in: CANCELLABLE_APPOINTMENT_STATUSES });
      expect([...CANCELLABLE_APPOINTMENT_STATUSES].sort()).toEqual([
        'CHECKED_IN',
        'CONFIRMED',
        'PENDING',
        'RESCHEDULED',
      ]);
    });

    it('targets ONLY FUTURE appointments (date >= now) — never the past', () => {
      expect(call.filter.date).toEqual({ $gte: FROZEN });
    });

    it('uses an aggregation pipeline that sets status CANCELLED and tags the transition', () => {
      expect(Array.isArray(call.update)).toBe(true);
      expect(call.update[0].$set.status).toBe('CANCELLED');
      expect(call.update[0].$set.lifecycleCancellationTag).toMatchObject({
        transitionId: null,
        originalStatus: '$status',
      });
    });

    it('returns the cancelled count under the data category', () => {
      expect(result).toMatchObject({ category: 'data', cancelledAppointments: 1 });
    });
  });

  describe('close-open-episodes', () => {
    it('targets this beneficiary + only open episode statuses', async () => {
      const { handlers, epiCalls } = build();
      await handlers[OP.CLOSE_OPEN_EPISODES]({ beneficiaryId: BENE, toState: 'discharged' });
      const call = epiCalls[0];
      expect(call.filter.beneficiaryId).toBe(BENE);
      expect(call.filter.status).toEqual({ $in: OPEN_EPISODE_STATUSES });
    });

    it('maps DECEASED toState → dischargeReason medical_reason (in-enum, never "deceased")', async () => {
      const { handlers, epiCalls } = build();
      await handlers[OP.CLOSE_OPEN_EPISODES]({
        beneficiaryId: BENE,
        toState: reg.LIFECYCLE_STATES.DECEASED,
      });
      expect(epiCalls[0].update[0].$set.dischargeReason).toBe('medical_reason');
      expect(epiCalls[0].update[0].$set.dischargeReason).not.toBe('deceased');
    });

    it('non-deceased toState → dischargeReason other', async () => {
      const { handlers, epiCalls } = build();
      await handlers[OP.CLOSE_OPEN_EPISODES]({ beneficiaryId: BENE, toState: 'discharged' });
      expect(epiCalls[0].update[0].$set.dischargeReason).toBe('other');
    });

    it('closes to completed + stamps actualEndDate = now + tags the transition', async () => {
      const { handlers, epiCalls } = build();
      await handlers[OP.CLOSE_OPEN_EPISODES]({ beneficiaryId: BENE, toState: 'discharged' });
      expect(epiCalls[0].update[0].$set.status).toBe('completed');
      expect(epiCalls[0].update[0].$set.actualEndDate).toBe(FROZEN);
      expect(epiCalls[0].update[0].$set.lifecycleClosureTag).toMatchObject({
        originalStatus: '$status',
      });
    });
  });

  describe('release-care-team', () => {
    let call;
    beforeAll(async () => {
      const { handlers, epiCalls } = build();
      await handlers[OP.RELEASE_CARE_TEAM]({ beneficiaryId: BENE });
      call = epiCalls[0];
    });

    it('targets episodes of this beneficiary that have an active member', () => {
      expect(call.filter.beneficiaryId).toBe(BENE);
      expect(call.filter['careTeam.isActive']).toBe(true);
    });

    it('flips only active members via positional arrayFilter and tags the transition', () => {
      expect(call.update.$set['careTeam.$[m].isActive']).toBe(false);
      expect(call.update.$set['careTeam.$[m].removedAt']).toBe(FROZEN);
      expect(call.update.$set['careTeam.$[m].lifecycleReleaseTag']).toMatchObject({
        transitionId: null,
      });
      expect(call.options.arrayFilters).toEqual([{ 'm.isActive': true }]);
    });
  });

  describe('self-skip when models absent (no silent mutation)', () => {
    it('all three real handlers self-skip with their canonical reasons', async () => {
      const handlers = createBeneficiaryLifecycleSideEffectHandlers({ now });
      const a = await handlers[OP.END_ACTIVE_SCHEDULES]({ beneficiaryId: BENE });
      const c = await handlers[OP.CLOSE_OPEN_EPISODES]({ beneficiaryId: BENE, toState: 'x' });
      const r = await handlers[OP.RELEASE_CARE_TEAM]({ beneficiaryId: BENE });
      expect(a).toMatchObject({ skipped: true, reason: 'appointment-model-unavailable' });
      expect(c).toMatchObject({ skipped: true, reason: 'episode-model-unavailable' });
      expect(r).toMatchObject({ skipped: true, reason: 'episode-model-unavailable' });
    });
  });
});
