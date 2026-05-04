'use strict';

const {
  validateScheduleSession,
  validateCompleteSession,
  validateRecordQuality,
  validateSubmitSatisfaction,
  validate,
  VALID_PLATFORMS,
} = require('../../domains/tele-rehab/validators/tele-rehab.validator');

describe('tele-rehab.validator', () => {
  // ── validateScheduleSession ───────────────────────────────────────────────
  describe('validateScheduleSession', () => {
    const base = { beneficiaryId: 'b1', therapistId: 't1', scheduledAt: '2025-06-01T09:00:00Z' };

    it('valid — full base fields', () => {
      expect(validateScheduleSession(base).valid).toBe(true);
    });

    it('valid — uses date field instead of scheduledAt', () => {
      const r = validateScheduleSession({
        beneficiaryId: 'b1',
        therapistId: 't1',
        date: '2025-06-01',
      });
      expect(r.valid).toBe(true);
    });

    it('valid — uses sessionDate field', () => {
      const r = validateScheduleSession({
        beneficiaryId: 'b1',
        therapistId: 't1',
        sessionDate: '2025-06-01',
      });
      expect(r.valid).toBe(true);
    });

    it('invalid — missing beneficiaryId', () => {
      const r = validateScheduleSession({ therapistId: 't1', scheduledAt: '2025-06-01T09:00:00Z' });
      expect(r.valid).toBe(false);
      expect(r.errors.length).toBeGreaterThan(0);
    });

    it('invalid — missing therapistId', () => {
      const r = validateScheduleSession({
        beneficiaryId: 'b1',
        scheduledAt: '2025-06-01T09:00:00Z',
      });
      expect(r.valid).toBe(false);
    });

    it('invalid — no time field', () => {
      const r = validateScheduleSession({ beneficiaryId: 'b1', therapistId: 't1' });
      expect(r.valid).toBe(false);
    });

    it('valid — all VALID_PLATFORMS accepted', () => {
      VALID_PLATFORMS.forEach(platform => {
        const r = validateScheduleSession({ ...base, platform });
        expect(r.valid).toBe(true);
      });
    });

    it('invalid — unknown platform', () => {
      const r = validateScheduleSession({ ...base, platform: 'skype' });
      expect(r.valid).toBe(false);
    });
  });

  // ── validateCompleteSession ───────────────────────────────────────────────
  describe('validateCompleteSession', () => {
    it('valid — with notes', () => {
      expect(validateCompleteSession({ notes: 'الجلسة ممتازة' }).valid).toBe(true);
    });

    it('valid — with outcome', () => {
      expect(validateCompleteSession({ outcome: 'تحسن واضح' }).valid).toBe(true);
    });

    it('valid — with summary', () => {
      expect(validateCompleteSession({ summary: 'ملخص الجلسة' }).valid).toBe(true);
    });

    it('valid — with sessionNotes', () => {
      expect(validateCompleteSession({ sessionNotes: 'ملاحظات' }).valid).toBe(true);
    });

    it('invalid — empty body', () => {
      const r = validateCompleteSession({});
      expect(r.valid).toBe(false);
      expect(r.errors.length).toBeGreaterThan(0);
    });
  });

  // ── validateRecordQuality ─────────────────────────────────────────────────
  describe('validateRecordQuality', () => {
    it('valid — score = 4', () => {
      expect(validateRecordQuality({ score: 4 }).valid).toBe(true);
    });

    it('valid — rating = 3', () => {
      expect(validateRecordQuality({ rating: 3 }).valid).toBe(true);
    });

    it('valid — qualityScore = 5', () => {
      expect(validateRecordQuality({ qualityScore: 5 }).valid).toBe(true);
    });

    it('invalid — no score field', () => {
      const r = validateRecordQuality({});
      expect(r.valid).toBe(false);
      expect(r.errors.length).toBeGreaterThan(0);
    });

    it('invalid — score out of range (0)', () => {
      const r = validateRecordQuality({ score: 0 });
      expect(r.valid).toBe(false);
    });

    it('invalid — score out of range (6)', () => {
      const r = validateRecordQuality({ score: 6 });
      expect(r.valid).toBe(false);
    });

    it('invalid — score is NaN string', () => {
      const r = validateRecordQuality({ score: 'abc' });
      expect(r.valid).toBe(false);
    });
  });

  // ── validateSubmitSatisfaction ────────────────────────────────────────────
  describe('validateSubmitSatisfaction', () => {
    it('valid — rating = 5', () => {
      expect(validateSubmitSatisfaction({ rating: 5 }).valid).toBe(true);
    });

    it('valid — satisfactionScore = 1', () => {
      expect(validateSubmitSatisfaction({ satisfactionScore: 1 }).valid).toBe(true);
    });

    it('all integer ratings 1-5 accepted', () => {
      [1, 2, 3, 4, 5].forEach(rating => {
        expect(validateSubmitSatisfaction({ rating }).valid).toBe(true);
      });
    });

    it('invalid — no rating field', () => {
      const r = validateSubmitSatisfaction({});
      expect(r.valid).toBe(false);
      expect(r.errors.length).toBeGreaterThan(0);
    });

    it('invalid — rating = 0', () => {
      const r = validateSubmitSatisfaction({ rating: 0 });
      expect(r.valid).toBe(false);
    });

    it('invalid — rating = 6', () => {
      const r = validateSubmitSatisfaction({ rating: 6 });
      expect(r.valid).toBe(false);
    });

    it('invalid — float rating', () => {
      const r = validateSubmitSatisfaction({ rating: 3.5 });
      expect(r.valid).toBe(false);
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
