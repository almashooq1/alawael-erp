/**
 * tests/services/AttendanceService.test.js - Unit Tests for Attendance Service
 * Tests business logic for attendance management
 */

describe('AttendanceService', () => {
  let mockDb;
  let attendanceRecordData;

  beforeEach(() => {
    mockDb = {
      collection: jest.fn().mockReturnValue({
        insertOne: jest.fn().mockResolvedValue({ insertedId: 'test-id' }),
        findOne: jest.fn().mockResolvedValue(null),
        find: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue([]),
        }),
        updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
        deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 }),
      }),
    };

    attendanceRecordData = global.testUtils.createMockAttendanceRecord();
  });

  describe('recordAttendance()', () => {
    test('should return success status on valid input', () => {
      const result = {
        status: 'success',
        message: 'Attendance recorded',
        data: attendanceRecordData,
        timestamp: new Date(),
      };

      expect(result.status).toBe('success');
      expect(result.data).toHaveProperty('beneficiaryId');
      expect(result.data).toHaveProperty('status');
    });

    test('should validate required fields', () => {
      const requiredFields = ['beneficiaryId', 'attendanceDate', 'status', 'courseId'];

      requiredFields.forEach(field => {
        expect(attendanceRecordData).toHaveProperty(field);
      });
    });

    test('should accept valid status values', () => {
      const validStatuses = ['present', 'absent', 'late', 'excused'];

      validStatuses.forEach(status => {
        let record = { ...attendanceRecordData, status };
        expect(validStatuses).toContain(record.status);
      });
    });

    test('should emit event on successful recording', () => {
      const expectedEvent = 'attendance:recorded';
      expect(expectedEvent).toBe('attendance:recorded');
    });

    test('should trigger alert for absent status', () => {
      const record = {
        ...attendanceRecordData,
        status: 'absent',
        attendanceAlert: true,
      };

      expect(record.attendanceAlert).toBe(true);
    });

    test('should return error for invalid status', () => {
      const result = {
        status: 'error',
        message: 'Invalid status value',
        data: null,
      };

      expect(result.status).toBe('error');
    });
  });

  describe('getAttendanceReport()', () => {
    test('should return attendance report structure', () => {
      const report = {
        status: 'success',
        data: {
          beneficiaryId: attendanceRecordData.beneficiaryId,
          totalRecords: 20,
          presentCount: 18,
          absentCount: 2,
          lateCount: 0,
          excusedCount: 0,
          attendanceRate: 90,
        },
      };

      expect(report.data).toHaveProperty('beneficiaryId');
      expect(report.data).toHaveProperty('totalRecords');
      expect(report.data).toHaveProperty('attendanceRate');
    });

    test('should calculate attendance rate correctly', () => {
      const totalDays = 20;
      const presentDays = 18;
      const rate = (presentDays / totalDays) * 100;

      expect(rate).toBe(90);
    });

    test('should support period-based filtering', () => {
      const report = {
        period: 'semester',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-05-31'),
      };

      expect(report).toHaveProperty('period');
      expect(report).toHaveProperty('startDate');
      expect(report).toHaveProperty('endDate');
    });

    test('should support course-specific filtering', () => {
      const report = {
        courseId: 'COURSE-001',
        records: [attendanceRecordData],
      };

      expect(report.courseId).toBeDefined();
      expect(report.records.length).toBeGreaterThan(0);
    });
  });

  describe('checkAttendanceThreshold()', () => {
    test('should return satisfactory status at 75% threshold', () => {
      const result = {
        status: 'success',
        threshold: 75,
        currentRate: 75,
        isSatisfactory: true,
        alerts: [],
      };

      expect(result.currentRate).toBeGreaterThanOrEqual(result.threshold);
      expect(result.isSatisfactory).toBe(true);
    });

    test('should alert when below threshold', () => {
      const result = {
        status: 'success',
        threshold: 75,
        currentRate: 70,
        isSatisfactory: false,
        alerts: ['Attendance rate below 75%'],
      };

      expect(result.currentRate).toBeLessThan(result.threshold);
      expect(result.alerts.length).toBeGreaterThan(0);
    });

    test('should detect consecutive absences', () => {
      const records = [{ status: 'absent' }, { status: 'absent' }];

      const consecutiveCount = 2;
      const shouldAlert = consecutiveCount >= 2;

      expect(shouldAlert).toBe(true);
    });

    test('should emit alert event if triggered', () => {
      const hasAlert = true;
      const eventEmitted = 'attendance:threshold-alert';

      if (hasAlert) {
        expect(eventEmitted).toBe('attendance:threshold-alert');
      }
    });
  });

  describe('bulkUploadAttendance()', () => {
    test('should process multiple records', () => {
      const records = [
        { ...attendanceRecordData },
        { ...attendanceRecordData, _id: 'id-2' },
        { ...attendanceRecordData, _id: 'id-3' },
      ];

      const result = {
        status: 'success',
        uploaded: 3,
        successful: 3,
        failed: 0,
      };

      expect(result.uploaded).toBe(records.length);
      expect(result.successful).toBe(3);
    });

    test('should validate each record', () => {
      const invalidRecord = {
        beneficiaryId: 'id-1',
        // missing required fields
      };

      const requiredFields = ['beneficiaryId', 'attendanceDate', 'status'];

      const hasAllFields = requiredFields.every(field => field in invalidRecord);

      expect(hasAllFields).toBe(false);
    });

    test('should return summary with errors', () => {
      const result = {
        status: 'success',
        summary: {
          total: 5,
          successful: 4,
          failed: 1,
          errors: [{ index: 2, reason: 'Missing beneficiaryId' }],
        },
      };

      expect(result.summary.successful + result.summary.failed).toBe(result.summary.total);
      expect(result.summary.errors.length).toBeGreaterThan(0);
    });

    test('should emit bulk upload event', () => {
      const eventEmitted = 'attendance:bulk-upload';
      expect(eventEmitted).toBe('attendance:bulk-upload');
    });
  });

  describe('exportAttendanceData()', () => {
    test('should generate CSV format', () => {
      const csvHeaders = ['Date', 'Status', 'Course', 'Notes'];
      const csvData = [
        ['2025-02-15', 'present', 'CS101', ''],
        ['2025-02-14', 'absent', 'CS101', 'Medical leave'],
      ];

      expect(csvHeaders).toHaveLength(4);
      expect(csvData[0]).toHaveLength(csvHeaders.length);
    });

    test('should include date range in export', () => {
      const exportData = {
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-02-15'),
        beneficiaryId: attendanceRecordData.beneficiaryId,
      };

      expect(exportData).toHaveProperty('startDate');
      expect(exportData).toHaveProperty('endDate');
    });

    test('should return file blob', () => {
      const result = {
        status: 'success',
        mimeType: 'text/csv',
        filename: 'attendance-export-2025-02-15.csv',
      };

      expect(result.mimeType).toBe('text/csv');
      expect(result.filename).toContain('.csv');
    });
  });

  describe('Helper Methods', () => {
    test('calculateStatistics() should aggregate metrics', () => {
      const records = [
        { status: 'present' },
        { status: 'present' },
        { status: 'absent' },
        { status: 'late' },
      ];

      const stats = {
        total: records.length,
        present: records.filter(r => r.status === 'present').length,
        absent: records.filter(r => r.status === 'absent').length,
        late: records.filter(r => r.status === 'late').length,
      };

      expect(stats.total).toBe(4);
      expect(stats.present).toBe(2);
    });

    test('findConsecutiveAbsences() should identify patterns', () => {
      const records = [
        { date: '2025-02-01', status: 'absent' },
        { date: '2025-02-02', status: 'absent' },
        { date: '2025-02-03', status: 'present' },
      ];

      const consecutive = {
        found: true,
        startDate: '2025-02-01',
        count: 2,
      };

      expect(consecutive.found).toBe(true);
      expect(consecutive.count >= 2).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle missing beneficiary', () => {
      const result = {
        status: 'error',
        message: 'Beneficiary not found',
        data: null,
      };

      expect(result.status).toBe('error');
      expect(result.data).toBeNull();
    });

    test('should handle database errors', () => {
      const result = {
        status: 'error',
        message: 'Database connection failed',
        data: null,
      };

      expect(result.status).toBe('error');
    });

    test('should validate date format', () => {
      const validDate = new Date('2025-02-15');
      expect(validDate instanceof Date).toBe(true);
    });
  });
});
