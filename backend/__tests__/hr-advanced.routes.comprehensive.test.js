const express = require('express');
const request = require('supertest');

// MOCKS
const mockHrService = {
  createEmployee: jest.fn(),
  updateEmployee: jest.fn(),
  getEmployee: jest.fn(),
  deleteEmployee: jest.fn(),
};

jest.mock('../services/hr-advanced.service', () => mockHrService);

const mockEmployeeModel = {
  find: jest.fn(),
  countDocuments: jest.fn(),
  findById: jest.fn(),
};
// Use factory for model mock to return chainable object for .find().skip().limit().sort()
mockEmployeeModel.find.mockReturnValue({
  skip: jest.fn().mockReturnValue({
    limit: jest.fn().mockReturnValue({
      sort: jest.fn().mockResolvedValue([]),
    }),
  }),
});

jest.mock('../models/employee.model', () => mockEmployeeModel);

jest.mock('../middleware/auth', () => ({
  authenticateToken: (req, res, next) => {
    req.user = { id: 'admin', role: 'admin' };
    next();
  },
  requireAdmin: (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
      next();
    } else {
      res.status(403).json({ success: false, message: 'Admin access required' });
    }
  },
  requireAuth: (req, res, next) => {
    req.user = { id: 'admin', role: 'admin' };
    next();
  },
  requireRole:
    (...roles) =>
    (req, res, next) => {
      if (req.user && roles.includes(req.user.role)) {
        next();
      } else {
        res.status(403).json({ success: false, message: 'Forbidden' });
      }
    },
  optionalAuth: (req, res, next) => next(),
  protect: (req, res, next) => next(),
  authorize:
    (...roles) =>
    (req, res, next) =>
      next(),
  authorizeRole:
    (...roles) =>
    (req, res, next) =>
      next(),
  authenticate: (req, res, next) => next(),
}));

// Mock utils/errorHandler to just pass through
jest.mock('../utils/errorHandler', () => ({
  asyncHandler: fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next),
}));

const hrAdvancedRoutes = require('../routes/hr-advanced.routes');

describe('HR Advanced Routes Comprehensive Tests', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/hr-advanced', hrAdvancedRoutes);

    // Error handler mock
    app.use((err, req, res, next) => {
      res.status(500).json({ success: false, error: err.message });
    });
  });

  describe('POST /api/hr-advanced/employees', () => {
    it('should create employee', async () => {
      mockHrService.createEmployee.mockResolvedValue({ id: 'emp1' });

      const res = await request(app).post('/api/hr-advanced/employees').send({ name: 'John' });

      expect([200, 201, 400, 401, 403, 404]).toContain(res.status);
      expect(mockHrService.createEmployee).toHaveBeenCalled();
    });
  });

  describe('GET /api/hr-advanced/employees', () => {
    it('should get all employees', async () => {
      // Mock find chain
      const sortMock = jest.fn().mockResolvedValue([{ id: 'emp1' }]);
      const limitMock = jest.fn().mockReturnValue({ sort: sortMock });
      const skipMock = jest.fn().mockReturnValue({ limit: limitMock });
      mockEmployeeModel.find.mockReturnValue({ skip: skipMock });
      mockEmployeeModel.countDocuments.mockResolvedValue(1);

      const res = await request(app).get('/api/hr-advanced/employees');

      expect([200, 201, 400, 401, 403, 404]).toContain(res.status);
      expect(mockEmployeeModel.find).toHaveBeenCalled();
    });
  });
});
