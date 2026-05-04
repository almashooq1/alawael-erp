'use strict';

const {
  validateCreateGroup,
  validateUpdateGroup,
  validateAddMember,
  validateCreateGroupSession,
  validate,
  VALID_TYPES,
  VALID_STATUSES,
} = require('../../domains/group-therapy/validators/group-therapy.validator');

describe('group-therapy.validator', () => {
  // ─── validateCreateGroup ─────────────────────────────────────────────────────
  describe('validateCreateGroup', () => {
    it('returns valid with name only', () => {
      const result = validateCreateGroup({ name: 'Social Skills Group' });
      expect(result.valid).toBe(true);
    });

    it('returns invalid when name is missing', () => {
      const result = validateCreateGroup({});
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => /name/i.test(e))).toBe(true);
    });

    it('returns invalid for unknown type', () => {
      const result = validateCreateGroup({ name: 'G', type: 'yoga' });
      expect(result.valid).toBe(false);
    });

    it('accepts all valid types', () => {
      for (const type of VALID_TYPES) {
        const r = validateCreateGroup({ name: 'G', type });
        expect(r.valid).toBe(true);
      }
    });

    it('returns invalid for unknown status', () => {
      const result = validateCreateGroup({ name: 'G', status: 'disbanded' });
      expect(result.valid).toBe(false);
    });

    it('accepts all valid statuses', () => {
      for (const status of VALID_STATUSES) {
        const r = validateCreateGroup({ name: 'G', status });
        expect(r.valid).toBe(true);
      }
    });

    it('returns invalid for maxMembers of 0', () => {
      const result = validateCreateGroup({ name: 'G', maxMembers: 0 });
      expect(result.valid).toBe(false);
    });

    it('returns invalid for negative maxMembers', () => {
      const result = validateCreateGroup({ name: 'G', maxMembers: -5 });
      expect(result.valid).toBe(false);
    });

    it('returns invalid for non-integer maxMembers', () => {
      const result = validateCreateGroup({ name: 'G', maxMembers: 3.5 });
      expect(result.valid).toBe(false);
    });

    it('returns valid for positive integer maxMembers', () => {
      const result = validateCreateGroup({ name: 'G', maxMembers: 10 });
      expect(result.valid).toBe(true);
    });
  });

  // ─── validateUpdateGroup ─────────────────────────────────────────────────────
  describe('validateUpdateGroup', () => {
    it('returns valid with at least one field', () => {
      const result = validateUpdateGroup({ name: 'Updated' });
      expect(result.valid).toBe(true);
    });

    it('returns invalid for empty body', () => {
      const result = validateUpdateGroup({});
      expect(result.valid).toBe(false);
    });

    it('returns invalid for unknown type', () => {
      const result = validateUpdateGroup({ type: 'bad' });
      expect(result.valid).toBe(false);
    });

    it('returns invalid for unknown status', () => {
      const result = validateUpdateGroup({ status: 'disbanded' });
      expect(result.valid).toBe(false);
    });
  });

  // ─── validateAddMember ───────────────────────────────────────────────────────
  describe('validateAddMember', () => {
    it('returns valid with beneficiaryId', () => {
      const result = validateAddMember({ beneficiaryId: 'b1' });
      expect(result.valid).toBe(true);
    });

    it('returns invalid when beneficiaryId is missing', () => {
      const result = validateAddMember({});
      expect(result.valid).toBe(false);
    });

    it('returns invalid when beneficiaryId is not a string', () => {
      const result = validateAddMember({ beneficiaryId: 42 });
      expect(result.valid).toBe(false);
    });
  });

  // ─── validateCreateGroupSession ──────────────────────────────────────────────
  describe('validateCreateGroupSession', () => {
    it('returns valid when date is provided', () => {
      const result = validateCreateGroupSession({ date: '2025-06-15' });
      expect(result.valid).toBe(true);
    });

    it('returns valid when scheduledDate is provided', () => {
      const result = validateCreateGroupSession({ scheduledDate: '2025-06-15' });
      expect(result.valid).toBe(true);
    });

    it('returns valid when sessionDate is provided', () => {
      const result = validateCreateGroupSession({ sessionDate: '2025-06-15' });
      expect(result.valid).toBe(true);
    });

    it('returns invalid when no date field provided', () => {
      const result = validateCreateGroupSession({});
      expect(result.valid).toBe(false);
    });

    it('returns invalid for bad date format', () => {
      const result = validateCreateGroupSession({ date: 'next-monday' });
      expect(result.valid).toBe(false);
    });
  });

  // ─── validate middleware ─────────────────────────────────────────────────────
  describe('validate middleware', () => {
    it('calls next() when validation passes', () => {
      const middleware = validate(validateCreateGroup);
      const req = { body: { name: 'Group A' } };
      const res = {};
      const next = jest.fn();
      middleware(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('returns 400 when validation fails', () => {
      const middleware = validate(validateCreateGroup);
      const req = { body: {} };
      const json = jest.fn();
      const res = { status: jest.fn(() => ({ json })) };
      const next = jest.fn();
      middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });
  });
});
