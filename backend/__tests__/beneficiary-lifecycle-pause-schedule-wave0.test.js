/**
 * beneficiary-lifecycle-pause-schedule-wave0.test.js
 *
 * W0-LifecycleAlign: Verify pause-schedule + resume-schedule side-effects
 * pause and resume future appointments correctly.
 */

'use strict';

const {
  createBeneficiaryLifecycleSideEffectHandlers,
} = require('../intelligence/beneficiary-lifecycle-side-effects.service');

describe('Lifecycle side-effects — pause/resume schedule', () => {
  function makeAppointmentModel() {
    const calls = [];
    return {
      updateMany: jest.fn(async (filter, update) => {
        calls.push({ filter, update });
        return { modifiedCount: 2 };
      }),
      _calls: calls,
    };
  }

  test('pause-schedule pauses future actionable appointments', async () => {
    const appointmentModel = makeAppointmentModel();
    const handlers = createBeneficiaryLifecycleSideEffectHandlers({ appointmentModel });
    const now = new Date('2026-06-18T10:00:00Z');

    const res = await handlers['pause-schedule']({
      beneficiaryId: 'b1',
      transitionId: 'suspend',
      fromState: 'active',
      toState: 'suspended',
    });

    expect(res.name).toBe('pause-schedule');
    expect(res.category).toBe('data');
    expect(res.pausedAppointments).toBe(2);
    expect(appointmentModel.updateMany).toHaveBeenCalledTimes(1);
    const call = appointmentModel.updateMany.mock.calls[0];
    expect(call[0]).toMatchObject({
      beneficiary: 'b1',
      status: {
        $in: expect.arrayContaining(['PENDING', 'CONFIRMED', 'CHECKED_IN', 'RESCHEDULED']),
      },
    });
    expect(call[0].date).toBeDefined();
    expect(call[1].$set.status).toBe('PAUSED');
    expect(call[1].$set.pausedReason).toBe('beneficiary-suspended');
  });

  test('resume-schedule resumes paused appointments', async () => {
    const appointmentModel = makeAppointmentModel();
    const handlers = createBeneficiaryLifecycleSideEffectHandlers({ appointmentModel });

    const res = await handlers['resume-schedule']({
      beneficiaryId: 'b1',
      transitionId: 'reactivate',
      fromState: 'suspended',
      toState: 'active',
    });

    expect(res.name).toBe('resume-schedule');
    expect(res.category).toBe('data');
    expect(res.resumedAppointments).toBe(2);
    expect(appointmentModel.updateMany).toHaveBeenCalledTimes(1);
    const call = appointmentModel.updateMany.mock.calls[0];
    expect(call[0]).toMatchObject({ beneficiary: 'b1', status: 'PAUSED' });
    expect(call[1].$set.status).toBe('CONFIRMED');
  });

  test('pause/resume self-skip when appointment model unavailable', async () => {
    const handlers = createBeneficiaryLifecycleSideEffectHandlers({});
    const pause = await handlers['pause-schedule']({ beneficiaryId: 'b1' });
    const resume = await handlers['resume-schedule']({ beneficiaryId: 'b1' });

    expect(pause.skipped).toBe(true);
    expect(pause.reason).toBe('appointment-model-unavailable');
    expect(resume.skipped).toBe(true);
    expect(resume.reason).toBe('appointment-model-unavailable');
  });
});
