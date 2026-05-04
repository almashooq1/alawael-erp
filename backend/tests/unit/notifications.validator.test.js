'use strict';

const {
  validateSendNotification,
  validateSendBulk,
  validateScheduleNotification,
  validateSnoozeNotification,
  validate,
  VALID_CHANNELS,
} = require('../../domains/notifications/validators/notifications.validator');

describe('notifications.validator', () => {
  // ── validateSendNotification ──────────────────────────────────────────────
  describe('validateSendNotification', () => {
    it('valid — title + recipientId', () => {
      const r = validateSendNotification({ title: 'تنبيه', recipientId: 'u123' });
      expect(r.valid).toBe(true);
    });

    it('valid — message + userId', () => {
      const r = validateSendNotification({ message: 'رسالة', userId: 'u123' });
      expect(r.valid).toBe(true);
    });

    it('valid — type + targetGroup', () => {
      const r = validateSendNotification({ type: 'reminder', targetGroup: 'staff' });
      expect(r.valid).toBe(true);
    });

    it('valid — branchId as recipient fallback', () => {
      const r = validateSendNotification({ title: 'تنبيه', branchId: 'b1' });
      expect(r.valid).toBe(true);
    });

    it('invalid — no title/message/type', () => {
      const r = validateSendNotification({ recipientId: 'u123' });
      expect(r.valid).toBe(false);
      expect(r.errors.length).toBeGreaterThan(0);
    });

    it('invalid — no recipient fields', () => {
      const r = validateSendNotification({ title: 'تنبيه' });
      expect(r.valid).toBe(false);
    });

    it('invalid — unknown channel', () => {
      const r = validateSendNotification({
        title: 'تنبيه',
        recipientId: 'u1',
        channel: 'telegram',
      });
      expect(r.valid).toBe(false);
    });

    it('valid — all VALID_CHANNELS accepted', () => {
      VALID_CHANNELS.forEach(channel => {
        const r = validateSendNotification({ title: 'تنبيه', recipientId: 'u1', channel });
        expect(r.valid).toBe(true);
      });
    });
  });

  // ── validateSendBulk ──────────────────────────────────────────────────────
  describe('validateSendBulk', () => {
    it('valid — non-empty array + title', () => {
      const r = validateSendBulk({ recipientIds: ['u1', 'u2'], title: 'تنبيه جماعي' });
      expect(r.valid).toBe(true);
    });

    it('invalid — missing recipientIds', () => {
      const r = validateSendBulk({ title: 'تنبيه' });
      expect(r.valid).toBe(false);
      expect(r.errors.length).toBeGreaterThan(0);
    });

    it('invalid — empty recipientIds array', () => {
      const r = validateSendBulk({ recipientIds: [], title: 'تنبيه' });
      expect(r.valid).toBe(false);
    });

    it('invalid — recipientIds not an array', () => {
      const r = validateSendBulk({ recipientIds: 'u1', title: 'تنبيه' });
      expect(r.valid).toBe(false);
    });

    it('invalid — no title/message/type', () => {
      const r = validateSendBulk({ recipientIds: ['u1'] });
      expect(r.valid).toBe(false);
    });
  });

  // ── validateScheduleNotification ─────────────────────────────────────────
  describe('validateScheduleNotification', () => {
    it('valid — scheduledAt + title', () => {
      const r = validateScheduleNotification({
        scheduledAt: '2025-06-01T10:00:00Z',
        title: 'تذكير',
      });
      expect(r.valid).toBe(true);
    });

    it('valid — sendAt field', () => {
      const r = validateScheduleNotification({ sendAt: '2025-06-01T10:00:00Z', message: 'رسالة' });
      expect(r.valid).toBe(true);
    });

    it('valid — scheduledTime field', () => {
      const r = validateScheduleNotification({
        scheduledTime: '2025-06-01T10:00:00Z',
        type: 'reminder',
      });
      expect(r.valid).toBe(true);
    });

    it('invalid — no scheduled time', () => {
      const r = validateScheduleNotification({ title: 'تذكير' });
      expect(r.valid).toBe(false);
      expect(r.errors.length).toBeGreaterThan(0);
    });

    it('invalid — no title/message/type', () => {
      const r = validateScheduleNotification({ scheduledAt: '2025-06-01T10:00:00Z' });
      expect(r.valid).toBe(false);
    });
  });

  // ── validateSnoozeNotification ────────────────────────────────────────────
  describe('validateSnoozeNotification', () => {
    it('valid — snoozeUntil provided', () => {
      const r = validateSnoozeNotification({ snoozeUntil: '2025-06-01T10:00:00Z' });
      expect(r.valid).toBe(true);
    });

    it('invalid — missing snoozeUntil', () => {
      const r = validateSnoozeNotification({});
      expect(r.valid).toBe(false);
      expect(r.errors.length).toBeGreaterThan(0);
    });
  });

  // ── validate middleware ───────────────────────────────────────────────────
  describe('validate middleware factory', () => {
    it('calls next() when valid', () => {
      const mw = validate(() => ({ valid: true, errors: [] }));
      const next = jest.fn();
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      mw({ body: {} }, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('returns 400 when invalid', () => {
      const mw = validate(() => ({ valid: false, errors: ['خطأ'] }));
      const next = jest.fn();
      const json = jest.fn();
      const res = { status: jest.fn().mockReturnValue({ json }) };
      mw({ body: {} }, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });
  });
});
