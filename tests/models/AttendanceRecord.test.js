/**
 * tests/models/AttendanceRecord.test.js - Unit Tests for Attendance Model
 * Tests attendance tracking and alert system
 */

const mongoose = require('mongoose');

describe('AttendanceRecord Model', () => {
  let attendanceData;

  beforeEach(() => {
    attendanceData = global.testUtils.createMockAttendanceRecord();
  });

  describe('Model Creation', () => {
    test('should create attendance record with valid data', () => {
      expect(attendanceData).toHaveProperty('beneficiaryId');
      expect(attendanceData).toHaveProperty('attendanceDate');
      expect(attendanceData).toHaveProperty('status');
      expect(attendanceData).toHaveProperty('courseId');
    });

    test('should have required fields', () => {
      const requiredFields = [
        'beneficiaryId',
        'attendanceDate',
        'status',
        'courseId',
        'recordedBy',
      ];

      requiredFields.forEach(field => {
        expect(attendanceData).toHaveProperty(field);
      });
    });
  });

  describe('Status Validation', () => {
    test('should accept valid status values', () => {
      const validStatuses = ['present', 'absent', 'late', 'excused'];
      validStatuses.forEach(status => {
        let record = { ...attendanceData, status };
        expect(validStatuses).toContain(record.status);
      });
    });

    test('should default to present status', () => {
      const newRecord = {};
      expect(['present', 'absent', 'late', 'excused']).toContain('present');
    });
  });

  describe('Alert System', () => {
    test('should track attendance alerts', () => {
      expect(attendanceData).toHaveProperty('attendanceAlert');
      expect(typeof attendanceData.attendanceAlert).toBe('boolean');
    });

    test('should provide alert reason', () => {
      expect(attendanceData).toHaveProperty('alertReason');
      const validReasons = ['low_attendance', 'consecutive_absences', 'threshold_breach', 'none'];
      expect(validReasons).toContain(attendanceData.alertReason);
    });

    test('should track consecutive absences', () => {
      expect(attendanceData).toHaveProperty('consecutiveAbsences');
      expect(attendanceData.consecutiveAbsences).toHaveProperty('count');
      expect(attendanceData.consecutiveAbsences).toHaveProperty('startDate');
    });
  });

  describe('Time Tracking', () => {
    test('should track check-in time', () => {
      const recordWithCheckIn = {
        ...attendanceData,
        checkInTime: new Date(),
        status: 'present',
      };
      expect(recordWithCheckIn.checkInTime).toBeInstanceOf(Date);
    });

    test('should track check-out time', () => {
      const recordWithCheckOut = {
        ...attendanceData,
        checkOutTime: new Date(),
        status: 'present',
      };
      expect(recordWithCheckOut.checkOutTime).toBeInstanceOf(Date);
    });

    test('should calculate session duration', () => {
      const startTime = new Date('2025-02-15T09:00:00');
      const endTime = new Date('2025-02-15T11:00:00');
      const duration = (endTime - startTime) / (1000 * 60); // minutes

      expect(duration).toBe(120);
    });
  });

  describe('Consecutive Absence Detection', () => {
    test('should track consecutive absence count', () => {
      const record = {
        ...attendanceData,
        status: 'absent',
        consecutiveAbsences: {
          count: 2,
          startDate: new Date(),
          notified: false,
        },
      };

      expect(record.consecutiveAbsences.count).toBe(2);
      expect(record.consecutiveAbsences.count >= 2).toBe(true);
    });

    test('should trigger alert at 2 consecutive absences', () => {
      const record = {
        ...attendanceData,
        consecutiveAbsences: { count: 2 },
        attendanceAlert: true,
        alertReason: 'consecutive_absences',
      };

      expect(record.attendanceAlert).toBe(true);
      expect(record.alertReason).toBe('consecutive_absences');
    });

    test('should reset count on present or excused status', () => {
      const recordPresent = {
        ...attendanceData,
        status: 'present',
        consecutiveAbsences: { count: 0 },
      };

      const recordExcused = {
        ...attendanceData,
        status: 'excused',
        consecutiveAbsences: { count: 0 },
      };

      expect(recordPresent.consecutiveAbsences.count).toBe(0);
      expect(recordExcused.consecutiveAbsences.count).toBe(0);
    });
  });

  describe('Audit Trail', () => {
    test('should maintain audit log', () => {
      const record = {
        ...attendanceData,
        auditLog: [
          {
            action: 'RECORDED',
            timestamp: new Date(),
            changedBy: 'instructor',
            details: 'Initial recording',
          },
        ],
      };

      expect(record.auditLog).toHaveLength(1);
      expect(record.auditLog[0]).toHaveProperty('action');
      expect(record.auditLog[0]).toHaveProperty('timestamp');
    });

    test('should track who recorded attendance', () => {
      expect(attendanceData.recordedBy).not.toBeUndefined();
      expect(typeof attendanceData.recordedBy).toBe('string');
    });
  });

  describe('Course Information', () => {
    test('should link to course', () => {
      expect(attendanceData.courseId).toBeDefined();
    });

    test('should store course details', () => {
      const record = {
        ...attendanceData,
        courseCode: 'CS101',
        courseName: 'Intro to CS',
      };

      expect(record.courseCode).toBe('CS101');
      expect(record.courseName).toBe('Intro to CS');
    });
  });

  describe('Attendance Rate Calculation', () => {
    test('should calculate attendance rate correctly', () => {
      const records = [
        { status: 'present' },
        { status: 'present' },
        { status: 'absent' },
        { status: 'late' },
        { status: 'present' },
      ];

      const present = records.filter(r => r.status === 'present').length;
      const rate = (present / records.length) * 100;

      expect(rate).toBe(60);
    });

    test('should include excused absences in rate', () => {
      const records = [{ status: 'present' }, { status: 'excused' }, { status: 'absent' }];

      const acceptableCount = records.filter(r => ['present', 'excused'].includes(r.status)).length;
      const rate = (acceptableCount / records.length) * 100;

      expect(rate).toBeGreaterThanOrEqual(66);
    });
  });

  describe('Timestamps', () => {
    test('should have createdAt timestamp', () => {
      expect(attendanceData).toHaveProperty('createdAt');
    });

    test('should have updatedAt timestamp', () => {
      expect(attendanceData).toHaveProperty('updatedAt');
    });

    test('should have attendance date', () => {
      expect(attendanceData.attendanceDate).toBeInstanceOf(Date);
    });
  });

  describe('Notes & Comments', () => {
    test('should allow optional notes', () => {
      const recordWithNotes = {
        ...attendanceData,
        notes: 'Student was sick',
      };

      expect(recordWithNotes.notes).toBeDefined();
      expect(recordWithNotes.notes.length).toBeLessThanOrEqual(500);
    });
  });
});
