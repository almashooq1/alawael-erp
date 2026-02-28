const express = require('express');
const request = require('supertest');

// Mock Mongoose models
jest.mock('../models/Driver', () => ({
  findById: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  updateOne: jest.fn(),
  deleteOne: jest.fn(),
}));

jest.mock('../models/User', () => ({
  findById: jest.fn(),
}));

// Mock Driver Controller
const mockDriverController = {
  createDriver: jest.fn((req, res) => res.status(201).json({ success: true })),
  getAllDrivers: jest.fn((req, res) => res.status(200).json({ success: true, data: [] })),
  getDriver: jest.fn((req, res) => res.status(200).json({ success: true, data: {} })),
  updateDriver: jest.fn((req, res) => res.status(200).json({ success: true })),
  deleteDriver: jest.fn((req, res) => res.status(200).json({ success: true })),
  getPerformance: jest.fn((req, res) => res.status(200).json({ success: true })),
  ratePerformance: jest.fn((req, res) => res.status(200).json({ success: true })),
  renewLicense: jest.fn((req, res) => res.status(200).json({ success: true })),
};

jest.mock('../controllers/driver.controller', () => mockDriverController);

jest.mock('../utils/logger', () => ({
  error: jest.fn(),
  info: jest.fn(),
}));

jest.mock('../middleware/auth.middleware', () => ({
  authenticateToken: (req, res, next) => {
    req.user = { id: 'test-user-id', role: 'admin' };
    next();
  },
  requireRole: (...roles) => (req, res, next) => next(),
}));

const driverRoutes = require('../routes/drivers');

describe('Driver Routes Comprehensive Tests', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/drivers', driverRoutes);
  });

  describe('GET /api/drivers', () => {
    it('should get all drivers', async () => {
      mockDriverController.getAllDrivers.mockImplementation((req, res) => {
        res.status(200).json({ success: true, data: [] });
      });

      const res = await request(app).get('/api/drivers');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockDriverController.getAllDrivers).toHaveBeenCalled();
    });
  });

  describe('GET /api/drivers/:id', () => {
    it('should get driver details', async () => {
      mockDriverController.getDriver.mockImplementation((req, res) => {
        res.status(200).json({ success: true, data: { id: 'd1' } });
      });

      const res = await request(app).get('/api/drivers/d1');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockDriverController.getDriver).toHaveBeenCalled();
    });
  });

  describe('POST /api/drivers', () => {
    it('should add a driver', async () => {
      mockDriverController.createDriver.mockImplementation((req, res) => {
        res.status(201).json({ success: true, data: { id: 'd2' } });
      });

      const res = await request(app)
        .post('/api/drivers')
        .send({ firstName: 'John', lastName: 'Doe' });
      
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(mockDriverController.createDriver).toHaveBeenCalled();
    });
  });

  describe('PUT /api/drivers/:id', () => {
    it('should update a driver', async () => {
      mockDriverController.updateDriver.mockImplementation((req, res) => {
        res.status(200).json({ success: true });
      });

      const res = await request(app)
        .put('/api/drivers/d1')
        .send({ firstName: 'Jane' });
      
      expect(res.status).toBe(200);
      expect(mockDriverController.updateDriver).toHaveBeenCalled();
    });
  });

  describe('DELETE /api/drivers/:id', () => {
    it('should delete a driver', async () => {
      mockDriverController.deleteDriver.mockImplementation((req, res) => {
        res.status(200).json({ success: true });
      });

      const res = await request(app).delete('/api/drivers/d1');
      expect(res.status).toBe(200);
      expect(mockDriverController.deleteDriver).toHaveBeenCalled();
    });
  });
});
