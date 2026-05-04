'use strict';

const {
  validateCreateEmployee,
  validateUpdateEmployee,
  validateRequestLeave,
  validateCheckIn,
  validate,
  VALID_LEAVE_TYPES,
} = require('../../domains/hr/validators/hr.validator');

describe('hr.validator', () => {
  // ── validateCreateEmployee ────────────────────────────────────────────────
  describe('validateCreateEmployee', () => {
    it('valid with firstName', () => {
      const r = validateCreateEmployee({ firstName: 'أحمد', lastName: 'علي' });
      expect(r.valid).toBe(true);
      expect(r.errors.length).toBe(0);
    });

    it('valid with name field', () => {
      const r = validateCreateEmployee({ name: 'أحمد علي' });
      expect(r.valid).toBe(true);
    });

    it('invalid — no name fields', () => {
      const r = validateCreateEmployee({});
      expect(r.valid).toBe(false);
      expect(r.errors.length).toBeGreaterThan(0);
    });

    it('invalid — bad email format', () => {
      const r = validateCreateEmployee({ firstName: 'أحمد', email: 'not-email' });
      expect(r.valid).toBe(false);
      expect(r.errors.length).toBeGreaterThan(0);
    });

    it('valid — good email format', () => {
      const r = validateCreateEmployee({ firstName: 'أحمد', email: 'a@b.com' });
      expect(r.valid).toBe(true);
    });
  });

  // ── validateUpdateEmployee ────────────────────────────────────────────────
  describe('validateUpdateEmployee', () => {
    it('valid — has fields', () => {
      const r = validateUpdateEmployee({ department: 'العيادة' });
      expect(r.valid).toBe(true);
    });

    it('invalid — empty body', () => {
      const r = validateUpdateEmployee({});
      expect(r.valid).toBe(false);
      expect(r.errors.length).toBeGreaterThan(0);
    });

    it('invalid — null body', () => {
      const r = validateUpdateEmployee(null);
      expect(r.valid).toBe(false);
    });

    it('invalid — bad email', () => {
      const r = validateUpdateEmployee({ email: 'bad@@email' });
      expect(r.valid).toBe(false);
    });
  });

  // ── validateRequestLeave ─────────────────────────────────────────────────
  describe('validateRequestLeave', () => {
    const base = { type: 'annual', startDate: '2025-01-01', endDate: '2025-01-10' };

    it('valid leave request', () => {
      const r = validateRequestLeave(base);
      expect(r.valid).toBe(true);
    });

    it('invalid — missing type', () => {
      const r = validateRequestLeave({ startDate: '2025-01-01', endDate: '2025-01-10' });
      expect(r.valid).toBe(false);
      expect(r.errors.length).toBeGreaterThan(0);
    });

    it('invalid — unknown leave type', () => {
      const r = validateRequestLeave({ ...base, type: 'vacation' });
      expect(r.valid).toBe(false);
    });

    it('invalid — missing startDate', () => {
      const r = validateRequestLeave({ type: 'sick', endDate: '2025-01-10' });
      expect(r.valid).toBe(false);
    });

    it('invalid — missing endDate', () => {
      const r = validateRequestLeave({ type: 'sick', startDate: '2025-01-01' });
      expect(r.valid).toBe(false);
    });

    it('invalid — endDate before startDate', () => {
      const r = validateRequestLeave({
        type: 'sick',
        startDate: '2025-01-10',
        endDate: '2025-01-01',
      });
      expect(r.valid).toBe(false);
    });

    it('all VALID_LEAVE_TYPES are accepted', () => {
      VALID_LEAVE_TYPES.forEach(type => {
        const r = validateRequestLeave({ type, startDate: '2025-01-01', endDate: '2025-01-10' });
        expect(r.valid).toBe(true);
      });
    });
  });

  // ── validateCheckIn ───────────────────────────────────────────────────────
  describe('validateCheckIn', () => {
    it('valid — empty body', () => {
      expect(validateCheckIn({}).valid).toBe(true);
    });

    it('valid — with notes', () => {
      expect(validateCheckIn({ notes: 'some text' }).valid).toBe(true);
    });

    it('valid — location as object', () => {
      expect(validateCheckIn({ location: { lat: 24, lng: 46 } }).valid).toBe(true);
    });

    it('invalid — location as string', () => {
      const r = validateCheckIn({ location: 'Riyadh' });
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
      expect(json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
      expect(next).not.toHaveBeenCalled();
    });
  });
});
