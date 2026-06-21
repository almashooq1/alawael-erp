/**
 * beneficiary-lifecycle-notifications-wave0.test.js
 *
 * W0-LifecycleAlign: Verify family notification side-effects dispatch through
 * the unified notifier when a beneficiary contact is available.
 */

'use strict';

const {
  createBeneficiaryLifecycleSideEffectHandlers,
} = require('../intelligence/beneficiary-lifecycle-side-effects.service');

const mongoose = require('mongoose');

const mockBeneficiary = {
  _id: new mongoose.Types.ObjectId(),
  firstName: 'علي',
  fullNameArabic: 'علي أحمد',
  contactInfo: { primaryPhone: '966501234567', email: 'ali@example.com' },
};

function makeBeneficiaryModel(doc = mockBeneficiary) {
  const chain = {
    select: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(doc),
  };
  return {
    findById: jest.fn().mockReturnValue(chain),
  };
}

describe('Lifecycle side-effects — family notifications', () => {
  test('notify-family-welcome sends SMS when phone exists', async () => {
    const notifier = jest.fn().mockResolvedValue({});
    const handlers = createBeneficiaryLifecycleSideEffectHandlers({
      beneficiaryModel: makeBeneficiaryModel(),
      notifier,
    });

    const res = await handlers['notify-family-welcome']({
      beneficiaryId: mockBeneficiary._id,
      transitionId: 'admit',
      fromState: 'draft',
      toState: 'active',
    });

    expect(res.sent).toBe(true);
    expect(res.channel).toBe('sms');
    expect(notifier).toHaveBeenCalledTimes(1);
    const call = notifier.mock.calls[0][0];
    expect(call.to).toBe('966501234567');
    expect(call.templateKey).toBe('beneficiary.lifecycle.welcome');
    expect(call.body).toContain('علي');
  });

  test('notification self-skips when notifier unavailable', async () => {
    const handlers = createBeneficiaryLifecycleSideEffectHandlers({
      beneficiaryModel: makeBeneficiaryModel(),
    });
    const res = await handlers['notify-family-suspension']({
      beneficiaryId: 'b1',
      transitionId: 'suspend',
      fromState: 'active',
      toState: 'suspended',
    });

    expect(res.skipped).toBe(true);
    expect(res.reason).toBe('notifier-unavailable');
  });

  test('notification self-skips when beneficiary has no contact', async () => {
    const notifier = jest.fn().mockResolvedValue({});
    const noContactId = new mongoose.Types.ObjectId();
    const beneficiaryModel = makeBeneficiaryModel({
      _id: noContactId,
      firstName: 'NoContact',
      contactInfo: {},
    });
    const handlers = createBeneficiaryLifecycleSideEffectHandlers({
      beneficiaryModel,
      notifier,
    });

    const res = await handlers['notify-family-discharge']({
      beneficiaryId: noContactId,
      transitionId: 'discharge',
      fromState: 'active',
      toState: 'discharged',
    });

    expect(res.skipped).toBe(true);
    expect(res.reason).toBe('no-contact');
    expect(notifier).not.toHaveBeenCalled();
  });

  test('also sends in-app copy to verified guardians when guardianModel is wired', async () => {
    const guardianUserId = new mongoose.Types.ObjectId();
    const guardianModel = {
      find: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([{ userId: guardianUserId }]),
      }),
    };
    const notifier = jest.fn().mockResolvedValue({ success: true });
    const handlers = createBeneficiaryLifecycleSideEffectHandlers({
      beneficiaryModel: makeBeneficiaryModel(),
      guardianModel,
      notifier,
    });

    const res = await handlers['notify-family-welcome']({
      beneficiaryId: mockBeneficiary._id,
      transitionId: 'admit',
      fromState: 'draft',
      toState: 'active',
    });

    expect(res.sent).toBe(true);
    expect(res.inApp).toMatchObject({ sent: true, recipients: [String(guardianUserId)] });
    expect(notifier).toHaveBeenCalledTimes(2); // external SMS + in-app
    const inAppCall = notifier.mock.calls.find(([args]) => args.channels?.includes('in-app'));
    expect(inAppCall).toBeTruthy();
    expect(inAppCall[0].recipientId).toBe(String(guardianUserId));
    expect(inAppCall[0].channels).toEqual(['in-app']);
    expect(inAppCall[0].subject).toBe('تم قبول المستفيد');
  });

  test('in-app copy is skipped silently when no verified guardian user exists', async () => {
    const guardianModel = {
      find: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      }),
    };
    const notifier = jest.fn().mockResolvedValue({ success: true });
    const handlers = createBeneficiaryLifecycleSideEffectHandlers({
      beneficiaryModel: makeBeneficiaryModel(),
      guardianModel,
      notifier,
    });

    const res = await handlers['notify-family-welcome']({
      beneficiaryId: mockBeneficiary._id,
      transitionId: 'admit',
      fromState: 'draft',
      toState: 'active',
    });

    expect(res.sent).toBe(true);
    expect(res.inApp).toMatchObject({ sent: false, reason: 'no-verified-guardian-users' });
    expect(notifier).toHaveBeenCalledTimes(1); // external only
  });
});
