'use strict';

/**
 * beneficiary-auto-transition-notify-wave0.test.js — Phase C.
 *
 * Tests the subscriber that fans out in-app + email notifications when the
 * journey-score scheduler auto-requests a lifecycle transition.
 */

const mongoose = require('mongoose');
const {
  wireBeneficiaryLifecycleAutoTransitionNotify,
  EVENT_PATTERN,
  TEMPLATE_KEY,
} = require('../services/beneficiary-lifecycle-auto-transition-notify.service');

describe('Beneficiary auto-transition notify subscriber', () => {
  function makeBus() {
    const handlers = new Map();
    return {
      subscribe: jest.fn((pattern, handler) => {
        handlers.set(pattern, handler);
        return () => handlers.delete(pattern);
      }),
      publish: jest.fn(async (domain, eventType, payload) => {
        const pattern = `${domain}.${eventType}`;
        const handler = handlers.get(pattern);
        if (handler) {
          await handler({ domain, eventType, payload });
        }
      }),
      _handlers: handlers,
    };
  }

  function makeRecipient(overrides = {}) {
    return {
      _id: new mongoose.Types.ObjectId(),
      email: 'supervisor@example.com',
      firstName: 'Sara',
      lastName: 'Supervisor',
      role: 'supervisor',
      ...overrides,
    };
  }

  function makePayload(overrides = {}) {
    return {
      beneficiaryId: new mongoose.Types.ObjectId(),
      branchId: new mongoose.Types.ObjectId(),
      transitionId: 'discharge',
      transitionRecordId: new mongoose.Types.ObjectId(),
      score: 88,
      confidence: 0.9,
      ...overrides,
    };
  }

  test('wires and exposes pattern constants', () => {
    const bus = makeBus();
    const result = wireBeneficiaryLifecycleAutoTransitionNotify({
      integrationBus: bus,
      logger: { info: () => {}, warn: () => {}, error: () => {} },
    });
    expect(bus.subscribe).toHaveBeenCalledWith(EVENT_PATTERN, expect.any(Function));
    expect(result.EVENT_PATTERN).toBe(EVENT_PATTERN);
    expect(result.TEMPLATE_KEY).toBe(TEMPLATE_KEY);
    expect(typeof result.unsubscribe).toBe('function');
  });

  test('sends in-app and email notifications to resolved recipients', async () => {
    const bus = makeBus();
    const recipient = makeRecipient();
    const payload = makePayload();
    const send = jest.fn(async () => ({ success: true, channel: 'inApp' }));
    const notify = jest.fn(async () => ({ success: true, results: [] }));

    wireBeneficiaryLifecycleAutoTransitionNotify({
      integrationBus: bus,
      logger: { info: () => {}, warn: () => {}, error: () => {} },
      notificationService: { send },
      notify,
      resolveRecipients: jest.fn(async () => [recipient]),
    });

    await bus.publish('beneficiary', 'lifecycle.auto_requested', payload);

    expect(send).toHaveBeenCalledTimes(1);
    const inAppCall = send.mock.calls[0][0];
    expect(inAppCall.recipientId).toBe(String(recipient._id));
    expect(inAppCall.channels).toEqual(['inApp']);
    expect(inAppCall.category).toBe('beneficiary.lifecycle');
    expect(inAppCall.metadata.transitionId).toBe('discharge');

    expect(notify).toHaveBeenCalledTimes(1);
    const emailCall = notify.mock.calls[0][0];
    expect(emailCall.to).toBe(recipient.email);
    expect(emailCall.channels).toEqual(['email']);
    expect(emailCall.templateKey).toBe(TEMPLATE_KEY);
    expect(emailCall.metadata.transitionId).toBe('discharge');
  });

  test('skips malformed events without sending notifications', async () => {
    const bus = makeBus();
    const send = jest.fn(async () => ({ success: true }));
    const notify = jest.fn(async () => ({ success: true }));

    const result = wireBeneficiaryLifecycleAutoTransitionNotify({
      integrationBus: bus,
      logger: { info: () => {}, warn: () => {}, error: () => {} },
      notificationService: { send },
      notify,
      resolveRecipients: jest.fn(async () => [
        { _id: new mongoose.Types.ObjectId(), email: 'x@y.com' },
      ]),
    });

    await bus.publish('beneficiary', 'lifecycle.auto_requested', { beneficiaryId: 'b1' });

    expect(send).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
    expect(result.ranSinceBoot().skipped).toBeGreaterThan(0);
  });

  test('continues notifying other recipients when one send fails', async () => {
    const bus = makeBus();
    const r1 = makeRecipient({ email: 'r1@example.com' });
    const r2 = makeRecipient({ email: 'r2@example.com' });
    const payload = makePayload();

    const send = jest.fn(async () => ({ success: true }));
    const notify = jest.fn(async ({ to }) => {
      if (to === 'r1@example.com') throw new Error('SMTP down');
      return { success: true };
    });

    wireBeneficiaryLifecycleAutoTransitionNotify({
      integrationBus: bus,
      logger: { info: () => {}, warn: () => {}, error: () => {} },
      notificationService: { send },
      notify,
      resolveRecipients: jest.fn(async () => [r1, r2]),
    });

    await bus.publish('beneficiary', 'lifecycle.auto_requested', payload);

    expect(send).toHaveBeenCalledTimes(2);
    expect(notify).toHaveBeenCalledTimes(2);
  });

  test('tracks received and notified stats', async () => {
    const bus = makeBus();
    const payload = makePayload();
    const send = jest.fn(async () => ({ success: true }));
    const notify = jest.fn(async () => ({ success: true }));

    const result = wireBeneficiaryLifecycleAutoTransitionNotify({
      integrationBus: bus,
      logger: { info: () => {}, warn: () => {}, error: () => {} },
      notificationService: { send },
      notify,
      resolveRecipients: jest.fn(async () => [makeRecipient(), makeRecipient()]),
    });

    await bus.publish('beneficiary', 'lifecycle.auto_requested', payload);

    const stats = result.ranSinceBoot();
    expect(stats.received).toBe(1);
    expect(stats.notified).toBe(2);
  });
});
