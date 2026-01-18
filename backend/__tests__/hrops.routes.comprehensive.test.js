const express = require('express');
const request = require('supertest');

// MOCKS
const mockAttendanceModel = {
  create: jest.fn(),
  findByEmployeeRange: jest.fn(),
  getStatsByEmployee: jest.fn(),
};

const mockEmployeeModel = {
  findById: jest.fn(),
};

// Also mock Leave model since it is required in the routes file
const mockLeaveModel = {
  create: jest.fn(),
  findAll: jest.fn(),
  findByEmployeeId: jest.fn(),
};

jest.mock('../models/Attendance.memory', () => mockAttendanceModel);
jest.mock('../models/Employee.memory', () => mockEmployeeModel);
jest.mock('../models/Leave.memory', () => mockLeaveModel);

jest.mock('../middleware/auth', () => ({
  protect: (req, res, next) => {
    req.user = { id: 'admin', role: 'admin' };
    next();
  },
  authorize:
    (...roles) =>
    (req, res, next) =>
      next(),
}));

jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
}));

jest.mock('../middleware/validator.middleware', () => ({
  validateCheckIn: (req, res, next) => next(),
  validateCheckOut: (req, res, next) => next(),
  validateAttendance: (req, res, next) => next(),
  validateLeave: (req, res, next) => next(),
}));

const hropsRoutes = require('../routes/hrops.routes');

describe('HROps Routes Comprehensive Tests', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());

    // Mock Response Handler
    app.use((req, res, next) => {
      res.success = (data, message = 'Success', statusCode = 200) => {
        return res.status(statusCode).json({ success: true, message, data });
      };
      res.error = (message = 'Error', statusCode = 500, data = null) => {
        return res.status(statusCode).json({ success: false, message, data });
      };
      next();
    });

    app.use('/api/hrops', hropsRoutes);
  });

  describe('POST /api/hrops/attendance', () => {
    it('should check in successfully', async () => {
      mockEmployeeModel.findById.mockReturnValue({ id: 'emp1' });
      mockAttendanceModel.create.mockReturnValue({ id: 'att1', status: 'checked-in' });

      const res = await request(app).post('/api/hrops/attendance').send({ employeeId: 'emp1', location: 'Office' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(mockAttendanceModel.create).toHaveBeenCalled();
    });

    it('should fail if employee not found', async () => {
      mockEmployeeModel.findById.mockReturnValue(null);

      const res = await request(app).post('/api/hrops/attendance').send({ employeeId: 'invalid' });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/hrops/attendance/:employeeId', () => {
    it('should get attendance history', async () => {
      mockAttendanceModel.findByEmployeeRange.mockResolvedValue([{ id: 'att1' }]);
      mockAttendanceModel.getStatsByEmployee.mockResolvedValue({ total: 1 });

      const res = await request(app).get('/api/hrops/attendance/emp1?startDate=2023-01-01&endDate=2023-01-31');

      expect(res.status).toBe(200);
      expect(mockAttendanceModel.findByEmployeeRange).toHaveBeenCalled();
    });

    it('should fail without date range', async () => {
      const res = await request(app).get('/api/hrops/attendance/emp1');
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/hrops/leaves', () => {
    it('should create leave request', async () => {
      mockEmployeeModel.findById.mockReturnValue({ id: 'emp1' });
      mockLeaveModel.create.mockReturnValue({ id: 'leave1' });

      const res = await request(app).post('/api/hrops/leaves').send({ employeeId: 'emp1', type: 'Annual' });

      expect(res.status).toBe(201);
      expect(mockLeaveModel.create).toHaveBeenCalled();
    });
  });
});
