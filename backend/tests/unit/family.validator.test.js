'use strict';

const {
  validateAddFamilyMember,
  validateUpdateFamilyMember,
  validateLogCommunication,
  validateAssignHomework,
  validateUpdateHomeworkStatus,
  validate,
  VALID_RELATIONSHIPS,
  VALID_COMMUNICATION_TYPES,
  VALID_HOMEWORK_STATUSES,
} = require('../../domains/family/validators/family.validator');

describe('family.validator', () => {
  // ─── validateAddFamilyMember ─────────────────────────────────────────────────
  describe('validateAddFamilyMember', () => {
    it('returns valid for required fields', () => {
      const result = validateAddFamilyMember({
        beneficiaryId: 'b1',
        name: 'Ahmed',
        relationship: 'father',
      });
      expect(result.valid).toBe(true);
    });

    it('returns invalid when beneficiaryId is missing', () => {
      const result = validateAddFamilyMember({ name: 'Ahmed', relationship: 'father' });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => /beneficiaryId/i.test(e))).toBe(true);
    });

    it('returns invalid when name is missing', () => {
      const result = validateAddFamilyMember({ beneficiaryId: 'b1', relationship: 'father' });
      expect(result.valid).toBe(false);
    });

    it('returns invalid when relationship is missing', () => {
      const result = validateAddFamilyMember({ beneficiaryId: 'b1', name: 'Ahmed' });
      expect(result.valid).toBe(false);
    });

    it('returns invalid for unknown relationship', () => {
      const result = validateAddFamilyMember({
        beneficiaryId: 'b1',
        name: 'Ahmed',
        relationship: 'cousin',
      });
      expect(result.valid).toBe(false);
    });

    it('accepts all valid relationships', () => {
      for (const relationship of VALID_RELATIONSHIPS) {
        const r = validateAddFamilyMember({ beneficiaryId: 'b1', name: 'X', relationship });
        expect(r.valid).toBe(true);
      }
    });
  });

  // ─── validateUpdateFamilyMember ──────────────────────────────────────────────
  describe('validateUpdateFamilyMember', () => {
    it('returns valid with at least one field', () => {
      const result = validateUpdateFamilyMember({ name: 'New Name' });
      expect(result.valid).toBe(true);
    });

    it('returns invalid for empty body', () => {
      const result = validateUpdateFamilyMember({});
      expect(result.valid).toBe(false);
    });

    it('returns invalid for unknown relationship', () => {
      const result = validateUpdateFamilyMember({ relationship: 'alien' });
      expect(result.valid).toBe(false);
    });
  });

  // ─── validateLogCommunication ────────────────────────────────────────────────
  describe('validateLogCommunication', () => {
    it('returns valid with beneficiaryId + type + summary', () => {
      const result = validateLogCommunication({
        beneficiaryId: 'b1',
        type: 'phone',
        summary: 'Discussed progress',
      });
      expect(result.valid).toBe(true);
    });

    it('returns valid with notes instead of summary', () => {
      const result = validateLogCommunication({
        beneficiaryId: 'b1',
        type: 'in-person',
        notes: 'Met at clinic',
      });
      expect(result.valid).toBe(true);
    });

    it('returns valid with content instead of summary', () => {
      const result = validateLogCommunication({
        beneficiaryId: 'b1',
        type: 'email',
        content: 'Email body',
      });
      expect(result.valid).toBe(true);
    });

    it('returns invalid when beneficiaryId is missing', () => {
      const result = validateLogCommunication({ type: 'phone', summary: 'x' });
      expect(result.valid).toBe(false);
    });

    it('returns invalid when type is missing', () => {
      const result = validateLogCommunication({ beneficiaryId: 'b1', summary: 'x' });
      expect(result.valid).toBe(false);
    });

    it('returns invalid for unknown communication type', () => {
      const result = validateLogCommunication({
        beneficiaryId: 'b1',
        type: 'telepathy',
        summary: 'x',
      });
      expect(result.valid).toBe(false);
    });

    it('accepts all valid communication types', () => {
      for (const type of VALID_COMMUNICATION_TYPES) {
        const r = validateLogCommunication({ beneficiaryId: 'b1', type, summary: 'ok' });
        expect(r.valid).toBe(true);
      }
    });

    it('returns invalid when no content field provided', () => {
      const result = validateLogCommunication({ beneficiaryId: 'b1', type: 'phone' });
      expect(result.valid).toBe(false);
    });
  });

  // ─── validateAssignHomework ──────────────────────────────────────────────────
  describe('validateAssignHomework', () => {
    it('returns valid with required fields', () => {
      const result = validateAssignHomework({
        beneficiaryId: 'b1',
        task: 'Practice walking',
        dueDate: '2025-12-31',
      });
      expect(result.valid).toBe(true);
    });

    it('accepts description instead of task', () => {
      const result = validateAssignHomework({
        beneficiaryId: 'b1',
        description: 'Daily exercises',
        dueDate: '2025-12-31',
      });
      expect(result.valid).toBe(true);
    });

    it('returns invalid when beneficiaryId is missing', () => {
      const result = validateAssignHomework({ task: 'Do exercises', dueDate: '2025-12-31' });
      expect(result.valid).toBe(false);
    });

    it('returns invalid when no task/description/title provided', () => {
      const result = validateAssignHomework({ beneficiaryId: 'b1', dueDate: '2025-12-31' });
      expect(result.valid).toBe(false);
    });

    it('returns invalid when dueDate is missing', () => {
      const result = validateAssignHomework({ beneficiaryId: 'b1', task: 'Walk' });
      expect(result.valid).toBe(false);
    });

    it('returns invalid for bad dueDate format', () => {
      const result = validateAssignHomework({ beneficiaryId: 'b1', task: 'Walk', dueDate: 'soon' });
      expect(result.valid).toBe(false);
    });
  });

  // ─── validateUpdateHomeworkStatus ────────────────────────────────────────────
  describe('validateUpdateHomeworkStatus', () => {
    it('returns valid for each valid status', () => {
      for (const status of VALID_HOMEWORK_STATUSES) {
        const r = validateUpdateHomeworkStatus({ status });
        expect(r.valid).toBe(true);
      }
    });

    it('returns invalid when status is missing', () => {
      const result = validateUpdateHomeworkStatus({});
      expect(result.valid).toBe(false);
    });

    it('returns invalid for unknown status', () => {
      const result = validateUpdateHomeworkStatus({ status: 'late' });
      expect(result.valid).toBe(false);
    });
  });

  // ─── validate middleware ─────────────────────────────────────────────────────
  describe('validate middleware', () => {
    it('calls next() when validation passes', () => {
      const middleware = validate(validateAddFamilyMember);
      const req = { body: { beneficiaryId: 'b1', name: 'Ahmed', relationship: 'father' } };
      const res = {};
      const next = jest.fn();
      middleware(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('returns 400 when validation fails', () => {
      const middleware = validate(validateAddFamilyMember);
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
