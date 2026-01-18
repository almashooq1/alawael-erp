const express = require('express');
const request = require('supertest');

// MOCKS
const mockRehabService = {
  createAssessment: jest.fn(),
  getAssessment: jest.fn(),
  updateAssessment: jest.fn(),
  createPlan: jest.fn(),
};

jest.mock('../services/rehabilitation.service', () => mockRehabService);

// Mock error handler
jest.mock('../utils/errorHandler', () => ({
  asyncHandler: fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next),
}));

const rehabilitationRoutes = require('../routes/rehabilitation.routes');

describe('Rehabilitation Routes Comprehensive Tests', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/rehabilitation', rehabilitationRoutes);

    app.use((err, req, res, next) => {
      res.status(500).json({ success: false, error: err.message });
    });
  });

  describe('POST /api/rehabilitation/assessments', () => {
    it('should create assessment', async () => {
      mockRehabService.createAssessment.mockResolvedValue({ success: true, data: {}, assessment_id: 'a1' });

      const res = await request(app).post('/api/rehabilitation/assessments').send({ patientId: 'p1' });

      expect(res.status).toBe(201);
      expect(mockRehabService.createAssessment).toHaveBeenCalled();
    });
  });

  describe('GET /api/rehabilitation/assessments/:assessmentId', () => {
    it('should get assessment', async () => {
      mockRehabService.getAssessment.mockResolvedValue({ id: 'a1' });

      const res = await request(app).get('/api/rehabilitation/assessments/a1');

      expect(res.status).toBe(200);
      expect(mockRehabService.getAssessment).toHaveBeenCalledWith('a1');
    });
  });
});
