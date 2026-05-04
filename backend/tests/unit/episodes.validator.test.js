'use strict';
/**
 * Unit tests for episodes.validator
 * @group unit
 */

const {
  validateCreateEpisode,
  validateUpdateEpisode,
  validatePhaseTransition,
  validateDischarge,
  validateAddTeamMember,
  validate,
  VALID_TYPES,
  VALID_PHASES,
  VALID_STATUSES,
  VALID_DISCHARGE_REASONS,
  VALID_TEAM_ROLES,
} = require('../../domains/episodes/validators/episodes.validator');

const VALID_OID = '507f1f77bcf86cd799439011';

describe('episodes.validator', () => {
  // ── validateCreateEpisode ────────────────────────────────────────────────

  describe('validateCreateEpisode', () => {
    it('passes with minimal valid body', () => {
      const result = validateCreateEpisode({ beneficiaryId: VALID_OID });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('fails when beneficiaryId is missing', () => {
      const { valid: v, errors } = validateCreateEpisode({});
      expect(v).toBe(false);
      expect(errors.some(e => e.includes('beneficiaryId'))).toBe(true);
    });

    it('fails when beneficiaryId is not a valid ObjectId', () => {
      const { valid: v, errors } = validateCreateEpisode({ beneficiaryId: 'not-an-oid' });
      expect(v).toBe(false);
      expect(errors.some(e => e.includes('beneficiaryId'))).toBe(true);
    });

    it('fails with invalid type', () => {
      const { valid: v, errors } = validateCreateEpisode({
        beneficiaryId: VALID_OID,
        type: 'unknown_type',
      });
      expect(v).toBe(false);
      expect(errors.some(e => e.includes('type'))).toBe(true);
    });

    it('passes with every valid type', () => {
      VALID_TYPES.forEach(type => {
        const { valid: v } = validateCreateEpisode({ beneficiaryId: VALID_OID, type });
        expect(v).toBe(true);
      });
    });

    it('fails when expectedEndDate is before startDate', () => {
      const { valid: v, errors } = validateCreateEpisode({
        beneficiaryId: VALID_OID,
        startDate: '2025-06-01',
        expectedEndDate: '2025-01-01',
      });
      expect(v).toBe(false);
      expect(errors.some(e => e.includes('expectedEndDate'))).toBe(true);
    });

    it('fails with invalid startDate format', () => {
      const { valid: v, errors } = validateCreateEpisode({
        beneficiaryId: VALID_OID,
        startDate: 'not-a-date',
      });
      expect(v).toBe(false);
      expect(errors.some(e => e.includes('startDate'))).toBe(true);
    });

    it('fails when goals is not an array', () => {
      const { valid: v, errors } = validateCreateEpisode({
        beneficiaryId: VALID_OID,
        goals: 'not-an-array',
      });
      expect(v).toBe(false);
      expect(errors.some(e => e.includes('goals'))).toBe(true);
    });

    it('passes with valid complete body', () => {
      const { valid: v } = validateCreateEpisode({
        beneficiaryId: VALID_OID,
        type: 'standard',
        leadTherapistId: VALID_OID,
        branchId: VALID_OID,
        startDate: '2025-01-01',
        expectedEndDate: '2025-06-01',
        goals: [],
        referralSource: 'hospital',
      });
      expect(v).toBe(true);
    });
  });

  // ── validateUpdateEpisode ────────────────────────────────────────────────

  describe('validateUpdateEpisode', () => {
    it('fails with empty body', () => {
      const { valid: v, errors } = validateUpdateEpisode({});
      expect(v).toBe(false);
      expect(errors.some(e => e.includes('حقول'))).toBe(true);
    });

    it('passes with valid status update', () => {
      VALID_STATUSES.forEach(status => {
        const { valid: v } = validateUpdateEpisode({ status });
        expect(v).toBe(true);
      });
    });

    it('fails with invalid status', () => {
      const { valid: v, errors } = validateUpdateEpisode({ status: 'unknown' });
      expect(v).toBe(false);
      expect(errors.some(e => e.includes('status'))).toBe(true);
    });

    it('passes with valid phase', () => {
      VALID_PHASES.forEach(currentPhase => {
        const { valid: v } = validateUpdateEpisode({ currentPhase });
        expect(v).toBe(true);
      });
    });

    it('fails with invalid phase', () => {
      const { valid: v } = validateUpdateEpisode({ currentPhase: 'bad_phase' });
      expect(v).toBe(false);
    });

    it('fails with invalid leadTherapistId', () => {
      const { valid: v } = validateUpdateEpisode({ leadTherapistId: 'bad' });
      expect(v).toBe(false);
    });

    it('fails with invalid expectedEndDate', () => {
      const { valid: v } = validateUpdateEpisode({ expectedEndDate: 'bad-date' });
      expect(v).toBe(false);
    });
  });

  // ── validatePhaseTransition ──────────────────────────────────────────────

  describe('validatePhaseTransition', () => {
    it('fails when phase is missing', () => {
      const { valid: v, errors } = validatePhaseTransition({});
      expect(v).toBe(false);
      expect(errors.some(e => e.includes('phase'))).toBe(true);
    });

    it('fails with invalid phase value', () => {
      const { valid: v } = validatePhaseTransition({ phase: 'bad_phase' });
      expect(v).toBe(false);
    });

    it('passes with valid phase', () => {
      const { valid: v } = validatePhaseTransition({ phase: 'active_treatment' });
      expect(v).toBe(true);
    });

    it('fails with invalid completedBy ObjectId', () => {
      const { valid: v } = validatePhaseTransition({ phase: 'intake', completedBy: 'bad' });
      expect(v).toBe(false);
    });

    it('passes with valid completedBy', () => {
      const { valid: v } = validatePhaseTransition({
        phase: 'intake',
        completedBy: VALID_OID,
      });
      expect(v).toBe(true);
    });
  });

  // ── validateDischarge ────────────────────────────────────────────────────

  describe('validateDischarge', () => {
    it('fails when dischargeReason is missing', () => {
      const { valid: v, errors } = validateDischarge({});
      expect(v).toBe(false);
      expect(errors.some(e => e.includes('dischargeReason'))).toBe(true);
    });

    it('fails with invalid dischargeReason', () => {
      const { valid: v } = validateDischarge({ dischargeReason: 'unknown' });
      expect(v).toBe(false);
    });

    it('passes with every valid discharge reason', () => {
      VALID_DISCHARGE_REASONS.forEach(dischargeReason => {
        const { valid: v } = validateDischarge({ dischargeReason });
        expect(v).toBe(true);
      });
    });

    it('fails with invalid dischargeDate', () => {
      const { valid: v } = validateDischarge({
        dischargeReason: 'goals_achieved',
        dischargeDate: 'bad-date',
      });
      expect(v).toBe(false);
    });

    it('fails with invalid dischargedBy', () => {
      const { valid: v } = validateDischarge({
        dischargeReason: 'transfer',
        dischargedBy: 'bad-oid',
      });
      expect(v).toBe(false);
    });
  });

  // ── validateAddTeamMember ────────────────────────────────────────────────

  describe('validateAddTeamMember', () => {
    it('fails when userId is missing', () => {
      const { valid: v, errors } = validateAddTeamMember({ role: 'nurse' });
      expect(v).toBe(false);
      expect(errors.some(e => e.includes('userId'))).toBe(true);
    });

    it('fails when role is missing', () => {
      const { valid: v, errors } = validateAddTeamMember({ userId: VALID_OID });
      expect(v).toBe(false);
      expect(errors.some(e => e.includes('role'))).toBe(true);
    });

    it('fails with invalid userId', () => {
      const { valid: v } = validateAddTeamMember({ userId: 'bad', role: 'nurse' });
      expect(v).toBe(false);
    });

    it('fails with invalid role', () => {
      const { valid: v } = validateAddTeamMember({ userId: VALID_OID, role: 'unknown_role' });
      expect(v).toBe(false);
    });

    it('passes with all valid roles', () => {
      VALID_TEAM_ROLES.forEach(role => {
        const { valid: v } = validateAddTeamMember({ userId: VALID_OID, role });
        expect(v).toBe(true);
      });
    });

    it('fails with weeklyHours out of range', () => {
      const { valid: v } = validateAddTeamMember({
        userId: VALID_OID,
        role: 'nurse',
        weeklyHours: 999,
      });
      expect(v).toBe(false);
    });

    it('passes with weeklyHours in range', () => {
      const { valid: v } = validateAddTeamMember({
        userId: VALID_OID,
        role: 'nurse',
        weeklyHours: 20,
      });
      expect(v).toBe(true);
    });
  });

  // ── validate middleware ──────────────────────────────────────────────────

  describe('validate() middleware', () => {
    it('calls next() when validation passes', () => {
      const middleware = validate(() => ({ valid: true, errors: [] }));
      const req = { body: {} };
      const res = {};
      const next = jest.fn();
      middleware(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('returns 400 with errors when validation fails', () => {
      const middleware = validate(() => ({ valid: false, errors: ['field is required'] }));
      const req = { body: {} };
      const json = jest.fn();
      const res = { status: jest.fn(() => ({ json })) };
      const next = jest.fn();
      middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, errors: expect.any(Array) })
      );
      expect(next).not.toHaveBeenCalled();
    });
  });
});
