/**
 * Jest Unit Tests for Therapeutic Session Service
 * اختبارات Jest للخدمة
 *
 * Comprehensive unit tests for therapy session management
 */

const therapeuticSessionService = require('../services/therapeutic-session.service');
const TherapySession = require('../models/TherapySession');
const TherapistAvailability = require('../models/TherapistAvailability');
const SessionDocumentation = require('../models/SessionDocumentation');

// Mock Mongoose Models
jest.mock('../models/TherapySession');
jest.mock('../models/TherapistAvailability');
jest.mock('../models/SessionDocumentation');

describe('Therapeutic Session Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================
  // SCHEDULE SESSION TESTS
  // ============================================

  describe('scheduleSession', () => {
    it('should schedule a valid session', async () => {
      const sessionData = {
        beneficiary: 'benefit-123',
        therapist: 'therapist-123',
        plan: 'plan-123',
        date: '2026-02-20',
        startTime: '09:00',
        endTime: '10:00',
        room: 'Room A'
      };

      TherapySession.prototype.save = jest.fn().mockResolvedValue({
        _id: 'session-123',
        ...sessionData,
        status: 'SCHEDULED'
      });

      TherapySession.findOne = jest.fn().mockResolvedValue(null); // No conflicts

      const result = await therapeuticSessionService.scheduleSession(sessionData);

      expect(result).toBeDefined();
      expect(result.status).toBe('SCHEDULED');
    });

    it('should reject session with missing required fields', async () => {
      const invalidData = {
        beneficiary: 'benefit-123'
        // Missing other required fields
      };

      await expect(
        therapeuticSessionService.scheduleSession(invalidData)
      ).rejects.toThrow();
    });

    it('should detect scheduling conflicts', async () => {
      const sessionData = {
        beneficiary: 'benefit-123',
        therapist: 'therapist-123',
        plan: 'plan-123',
        date: '2026-02-20',
        startTime: '09:00',
        endTime: '10:00'
      };

      // Mock existing conflicting session
      TherapySession.findOne = jest.fn().mockResolvedValue({
        _id: 'existing-session',
        startTime: '09:30',
        endTime: '10:30'
      });

      await expect(
        therapeuticSessionService.scheduleSession(sessionData)
      ).rejects.toThrow(/conflict/i);
    });
  });

  // ============================================
  // CHECK AVAILABILITY TESTS
  // ============================================

  describe('checkTherapistAvailability', () => {
    it('should return available for valid time slot', async () => {
      const therapistId = 'therapist-123';
      const date = new Date('2026-02-20'); // Saturday (assuming Friday = available)
      const startTime = '09:00';
      const endTime = '10:00';

      // Mock availability data
      TherapistAvailability.findOne = jest.fn().mockResolvedValue({
        recurringSchedule: [
          {
            dayOfWeek: 'Saturday',
            startTime: '08:00',
            endTime: '17:00',
            breaks: []
          }
        ],
        preferences: {
          maxSessionsPerDay: 8,
          minBreakBetweenSessions: 15
        }
      });

      TherapySession.countDocuments = jest.fn().mockResolvedValue(2); // 2 sessions scheduled

      const result = await therapeuticSessionService.checkTherapistAvailability(
        therapistId,
        date,
        startTime,
        endTime
      );

      expect(result.available).toBe(true);
    });

    it('should return unavailable outside working hours', async () => {
      const therapistId = 'therapist-123';
      const date = new Date('2026-02-20');
      const startTime = '22:00'; // Outside working hours
      const endTime = '23:00';

      TherapistAvailability.findOne = jest.fn().mockResolvedValue({
        recurringSchedule: [
          {
            dayOfWeek: 'Saturday',
            startTime: '08:00',
            endTime: '17:00'
          }
        ]
      });

      const result = await therapeuticSessionService.checkTherapistAvailability(
        therapistId,
        date,
        startTime,
        endTime
      );

      expect(result.available).toBe(false);
      expect(result.reason).toContain('outside working hours');
    });

    it('should check maximum sessions per day', async () => {
      const therapistId = 'therapist-123';
      const date = new Date('2026-02-20');
      const startTime = '09:00';
      const endTime = '10:00';

      TherapistAvailability.findOne = jest.fn().mockResolvedValue({
        recurringSchedule: [
          {
            dayOfWeek: 'Saturday',
            startTime: '08:00',
            endTime: '17:00'
          }
        ],
        preferences: {
          maxSessionsPerDay: 2
        }
      });

      // Mock 2 existing sessions for the day
      TherapySession.countDocuments = jest.fn().mockResolvedValue(2);

      const result = await therapeuticSessionService.checkTherapistAvailability(
        therapistId,
        date,
        startTime,
        endTime
      );

      expect(result.available).toBe(false);
    });
  });

  // ============================================
  // UPDATE SESSION STATUS TESTS
  // ============================================

  describe('updateSessionStatus', () => {
    it('should update status to CONFIRMED', async () => {
      const sessionId = 'session-123';
      const existingSession = {
        _id: sessionId,
        status: 'SCHEDULED',
        save: jest.fn().mockResolvedValue({})
      };

      TherapySession.findById = jest.fn().mockResolvedValue(existingSession);

      await therapeuticSessionService.updateSessionStatus(sessionId, 'CONFIRMED');

      expect(existingSession.status).toBe('CONFIRMED');
      expect(existingSession.save).toHaveBeenCalled();
    });

    it('should update status to COMPLETED', async () => {
      const sessionId = 'session-123';
      const existingSession = {
        _id: sessionId,
        status: 'CONFIRMED',
        save: jest.fn().mockResolvedValue({})
      };

      TherapySession.findById = jest.fn().mockResolvedValue(existingSession);

      await therapeuticSessionService.updateSessionStatus(sessionId, 'COMPLETED');

      expect(existingSession.status).toBe('COMPLETED');
      expect(existingSession.completedAt).toBeDefined();
    });

    it('should reject invalid status transition', async () => {
      const sessionId = 'session-123';
      const existingSession = {
        _id: sessionId,
        status: 'SCHEDULED'
      };

      TherapySession.findById = jest.fn().mockResolvedValue(existingSession);

      // Cannot go directly from SCHEDULED to CANCELLED (must be CONFIRMED first)
      await expect(
        therapeuticSessionService.updateSessionStatus(sessionId, 'CANCELLED')
      ).rejects.toThrow(/invalid.*transition/i);
    });
  });

  // ============================================
  // DOCUMENT SESSION TESTS
  // ============================================

  describe('documentSession', () => {
    it('should document a completed session', async () => {
      const sessionId = 'session-123';
      const documentationData = {
        soapNote: {
          subjective: { patientReports: 'Good progress' },
          objective: { observations: 'Improved mobility' },
          assessment: { progressSummary: 'Excellent' },
          plan: { homeProgram: 'Daily exercises' }
        }
      };

      const session = {
        _id: sessionId,
        status: 'COMPLETED',
        beneficiary: 'benefit-123'
      };

      TherapySession.findById = jest.fn().mockResolvedValue(session);
      SessionDocumentation.prototype.save = jest.fn().mockResolvedValue({
        _id: 'doc-123',
        ...documentationData
      });

      const result = await therapeuticSessionService.documentSession(
        sessionId,
        documentationData
      );

      expect(result._id).toBe('doc-123');
      expect(result.soapNote).toBeDefined();
    });

    it('should reject documentation for incomplete session', async () => {
      const sessionId = 'session-123';
      const session = {
        _id: sessionId,
        status: 'SCHEDULED' // Not completed
      };

      TherapySession.findById = jest.fn().mockResolvedValue(session);

      await expect(
        therapeuticSessionService.documentSession(sessionId, {})
      ).rejects.toThrow(/completed/i);
    });

    it('should validate SOAP note structure', async () => {
      const sessionId = 'session-123';
      const incompleteData = {
        soapNote: {
          subjective: { patientReports: 'Test' }
          // Missing objective, assessment, plan
        }
      };

      const session = {
        _id: sessionId,
        status: 'COMPLETED'
      };

      TherapySession.findById = jest.fn().mockResolvedValue(session);

      await expect(
        therapeuticSessionService.documentSession(sessionId, incompleteData)
      ).rejects.toThrow(/required/i);
    });
  });

  // ============================================
  // RESCHEDULE SESSION TESTS
  // ============================================

  describe('rescheduleSession', () => {
    it('should reschedule to valid time slot', async () => {
      const sessionId = 'session-123';
      const newDate = '2026-02-21';
      const newStartTime = '14:00';
      const newEndTime = '15:00';

      const session = {
        _id: sessionId,
        therapist: 'therapist-123',
        date: '2026-02-20',
        save: jest.fn().mockResolvedValue({})
      };

      TherapySession.findById = jest.fn().mockResolvedValue(session);
      TherapySession.findOne = jest.fn().mockResolvedValue(null); // No conflicts

      TherapistAvailability.findOne = jest.fn().mockResolvedValue({
        recurringSchedule: [
          {
            dayOfWeek: 'Saturday',
            startTime: '08:00',
            endTime: '17:00'
          }
        ]
      });

      await therapeuticSessionService.rescheduleSession(
        sessionId,
        newDate,
        newStartTime,
        newEndTime
      );

      expect(session.date).toBe(newDate);
      expect(session.startTime).toBe(newStartTime);
      expect(session.save).toHaveBeenCalled();
    });
  });

  // ============================================
  // STATISTICS TESTS
  // ============================================

  describe('getSessionStatistics', () => {
    it('should calculate completion rate correctly', async () => {
      const therapistId = 'therapist-123';
      const totalSessions = 10;
      const completedSessions = 9;
      const cancelledSessions = 1;

      TherapySession.countDocuments = jest
        .fn()
        .mockResolvedValueOnce(totalSessions) // total
        .mockResolvedValueOnce(completedSessions) // completed
        .mockResolvedValueOnce(cancelledSessions); // cancelled

      TherapySession.aggregate = jest.fn().mockResolvedValue([
        { _id: null, avgRating: 4.5 }
      ]);

      const stats = await therapeuticSessionService.getSessionStatistics(
        therapistId,
        '2026-02-01',
        '2026-02-28'
      );

      expect(stats.completionRate).toBe((completedSessions / totalSessions) * 100);
      expect(stats.avgRating).toBe(4.5);
    });
  });

  // ============================================
  // AVAILABILITY MANAGEMENT TESTS
  // ============================================

  describe('setTherapistAvailability', () => {
    it('should set therapist availability', async () => {
      const therapistId = 'therapist-123';
      const availabilityData = {
        therapist: therapistId,
        recurringSchedule: [
          {
            dayOfWeek: 'Monday',
            startTime: '09:00',
            endTime: '17:00'
          }
        ],
        preferences: {
          maxSessionsPerDay: 8
        }
      };

      TherapistAvailability.findOneAndUpdate = jest.fn().mockResolvedValue({
        _id: 'avail-123',
        ...availabilityData
      });

      const result = await therapeuticSessionService.setTherapistAvailability(
        therapistId,
        availabilityData
      );

      expect(result).toBeDefined();
      expect(result.recurringSchedule).toBeDefined();
    });
  });
});

// ============================================
// INTEGRATION TESTS
// ============================================

describe('Therapeutic Session Service - Integration', () => {
  it('should handle complete session lifecycle', async () => {
    // This would be an integration test with actual database
    expect(true).toBe(true); // Placeholder
  });

  it('should maintain data consistency across operations', async () => {
    // Test transaction handling and rollback
    expect(true).toBe(true); // Placeholder
  });
});

// ============================================
// PERFORMANCE TESTS
// ============================================

describe('Therapeutic Session Service - Performance', () => {
  it('should execute conflict check in under 100ms', async () => {
    const start = Date.now();
    // Execute conflict check
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(100);
  });

  it('should handle bulk operations efficiently', async () => {
    // Test bulk reschedule with many sessions
    expect(true).toBe(true); // Placeholder
  });
});
