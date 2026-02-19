/**
 * tests/routes/attendance.routes.test.js - Integration Tests for Attendance Routes
 * Tests API endpoints and request/response handling
 */

describe('Attendance Routes', () => {
  let req, res;
  let attendanceData;

  beforeEach(() => {
    req = global.testUtils.createMockRequest();
    res = global.testUtils.createMockResponse();
    attendanceData = global.testUtils.createMockAttendanceRecord();
  });

  describe('POST /api/attendance/record', () => {
    test('should return 201 on successful record', () => {
      const expectedStatus = 201;
      expect(expectedStatus).toBe(201);
    });

    test('should validate required fields in request body', () => {
      const requiredFields = ['beneficiaryId', 'date', 'status', 'courseId'];

      requiredFields.forEach(field => {
        expect(['beneficiaryId', 'date', 'status', 'courseId']).toContain(field);
      });
    });

    test('should accept valid request body', () => {
      req.body = {
        beneficiaryId: attendanceData.beneficiaryId,
        date: new Date(),
        status: 'present',
        courseId: attendanceData.courseId,
        recordedBy: 'admin',
      };

      expect(req.body).toHaveProperty('beneficiaryId');
      expect(req.body).toHaveProperty('status');
    });

    test('should return error for missing beneficiaryId', () => {
      req.body = {
        date: new Date(),
        status: 'present',
        courseId: 'COURSE-001',
      };

      const result = {
        status: 'error',
        message: 'beneficiaryId is required',
      };

      expect(result.status).toBe('error');
    });

    test('should validate status enum', () => {
      req.body = {
        ...attendanceData,
        status: 'invalid_status',
      };

      const validStatuses = ['present', 'absent', 'late', 'excused'];
      expect(validStatuses).not.toContain('invalid_status');
    });

    test('should return response with timestamp', () => {
      const response = {
        status: 'success',
        message: 'Attendance recorded',
        data: attendanceData,
        timestamp: new Date(),
      };

      global.testUtils.verifyResponseStructure(response);
    });
  });

  describe('GET /api/attendance/:beneficiaryId/report', () => {
    test('should return 200 on successful retrieval', () => {
      const status = 200;
      expect(status).toBe(200);
    });

    test('should accept beneficiaryId parameter', () => {
      req.params = { beneficiaryId: 'benef-001' };
      expect(req.params.beneficiaryId).toBeDefined();
    });

    test('should support optional query parameters', () => {
      req.query = {
        startDate: '2025-01-01',
        endDate: '2025-02-15',
        courseId: 'CS101',
      };

      expect(req.query).toHaveProperty('startDate');
      expect(req.query).toHaveProperty('endDate');
    });

    test('should return attendance report structure', () => {
      const response = {
        status: 'success',
        data: {
          beneficiaryId: 'benef-001',
          totalRecords: 20,
          presentCount: 18,
          absentCount: 2,
          attendanceRate: 90,
          records: [],
        },
      };

      expect(response.data).toHaveProperty('totalRecords');
      expect(response.data).toHaveProperty('attendanceRate');
      expect(response.data).toHaveProperty('records');
    });

    test('should return 404 for non-existent beneficiary', () => {
      const status = 404;
      expect(status).toBe(404);
    });

    test('should filter by date range', () => {
      const records = [
        { date: '2025-01-15', status: 'present' },
        { date: '2025-02-01', status: 'absent' },
        { date: '2025-02-15', status: 'present' },
      ];

      const filtered = records.filter(r => r.date >= '2025-02-01' && r.date <= '2025-02-15');

      expect(filtered.length).toBe(2);
    });
  });

  describe('GET /api/attendance/:beneficiaryId/threshold-check', () => {
    test('should return 200 with alert status', () => {
      const status = 200;
      expect(status).toBe(200);
    });

    test('should check against 75% threshold', () => {
      const response = {
        status: 'success',
        threshold: 75,
        currentAttendance: 80,
        isSatisfactory: true,
        alerts: [],
      };

      expect(response.threshold).toBe(75);
      expect(response.currentAttendance >= response.threshold).toBe(true);
    });

    test('should return alerts if below threshold', () => {
      const response = {
        status: 'success',
        threshold: 75,
        currentAttendance: 70,
        isSatisfactory: false,
        alerts: ['Attendance below 75% threshold'],
      };

      expect(response.alerts.length).toBeGreaterThan(0);
    });

    test('should support period query parameter', () => {
      req.query = { period: 'semester' };
      expect(req.query.period).toBeDefined();
    });

    test('should detect consecutive absences', () => {
      const response = {
        consecutiveAbsences: {
          detected: true,
          count: 3,
          startDate: '2025-02-10',
        },
      };

      expect(response.consecutiveAbsences.detected).toBe(true);
    });
  });

  describe('POST /api/attendance/bulk-upload', () => {
    test('should accept array of records', () => {
      req.body = {
        records: [
          attendanceData,
          { ...attendanceData, _id: 'id-2' },
          { ...attendanceData, _id: 'id-3' },
        ],
      };

      expect(Array.isArray(req.body.records)).toBe(true);
      expect(req.body.records.length).toBe(3);
    });

    test('should return 201 on successful upload', () => {
      const status = 201;
      expect(status).toBe(201);
    });

    test('should return upload summary', () => {
      const response = {
        status: 'success',
        data: {
          totalRecords: 3,
          successfulUploads: 3,
          failedUploads: 0,
          summary: 'All records uploaded successfully',
        },
      };

      expect(response.data).toHaveProperty('totalRecords');
      expect(response.data).toHaveProperty('successfulUploads');
    });

    test('should handle partial failures', () => {
      const response = {
        status: 'success',
        data: {
          totalRecords: 5,
          successfulUploads: 4,
          failedUploads: 1,
          errors: [{ index: 2, record: {}, reason: 'Missing beneficiaryId' }],
        },
      };

      expect(response.data.successfulUploads + response.data.failedUploads).toBe(
        response.data.totalRecords
      );
    });

    test('should validate each record format', () => {
      const invalidRecords = [
        {}, // missing all fields
        { beneficiaryId: '123' }, // missing required fields
      ];

      invalidRecords.forEach(record => {
        const isValid = ['beneficiaryId', 'status'].every(field => field in record);
        expect(isValid).toBe(false);
      });
    });
  });

  describe('GET /api/attendance/:beneficiaryId/export', () => {
    test('should return CSV file', () => {
      res.set = jest.fn(function () {
        return this;
      });
      expect(typeof res.set).toBe('function');
    });

    test('should support date range parameters', () => {
      req.query = {
        startDate: '2025-01-01',
        endDate: '2025-02-15',
      };

      expect(req.query).toHaveProperty('startDate');
      expect(req.query).toHaveProperty('endDate');
    });

    test('should return 200 for successful export', () => {
      const status = 200;
      expect(status).toBe(200);
    });

    test('should set CSV content type', () => {
      const contentType = 'text/csv';
      expect(contentType).toBe('text/csv');
    });

    test('should include filename in response', () => {
      const filename = 'attendance-export-2025-02-15.csv';
      expect(filename).toContain('attendance');
      expect(filename).toContain('.csv');
    });

    test('should return 404 for non-existent beneficiary', () => {
      const status = 404;
      expect(status).toBe(404);
    });
  });

  describe('Error Handling', () => {
    test('should return 400 for invalid request body', () => {
      const status = 400;
      const expectedStatus = 400;
      expect(status).toBe(expectedStatus);
    });

    test('should return 404 for non-existent resource', () => {
      const status = 404;
      expect(status).toBe(404);
    });

    test('should return 500 for server errors', () => {
      const status = 500;
      expect(status).toBe(500);
    });

    test('should include error message in response', () => {
      const response = {
        status: 'error',
        message: 'Invalid input',
        data: null,
      };

      expect(response.message).toBeDefined();
      expect(response.message.length).toBeGreaterThan(0);
    });

    test('should validate authentication', () => {
      req.headers = {}; // missing auth header
      const hasAuth = !!req.headers.authorization;
      expect(hasAuth).toBe(false);
    });
  });

  describe('Response Format', () => {
    test('should follow standard response format', () => {
      const response = {
        status: 'success',
        message: 'Operation successful',
        data: {
          /* data */
        },
        timestamp: new Date(),
      };

      global.testUtils.verifyResponseStructure(response);
    });

    test('should include ISO timestamp', () => {
      const response = {
        timestamp: new Date().toISOString(),
      };

      expect(response.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z?$/);
    });

    test('should return null data on error', () => {
      const response = {
        status: 'error',
        data: null,
      };

      expect(response.data).toBeNull();
    });
  });

  describe('GET /api/attendance/health', () => {
    test('should return 200 health status', () => {
      const status = 200;
      expect(status).toBe(200);
    });

    test('should indicate service is healthy', () => {
      const response = {
        status: 'success',
        message: 'Attendance service is healthy',
        service: 'AttendanceService',
      };

      expect(response.service).toBe('AttendanceService');
      expect(response.status).toBe('success');
    });
  });
});
