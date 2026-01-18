const express = require('express');
const request = require('supertest');

// MOCKS
const mockAiService = {
  predictPerformance: jest.fn(),
  predictChurn: jest.fn(),
};

jest.mock('../services/ai-predictions.service', () => mockAiService);
jest.mock('../models/prediction.model', () => ({})); // If needed

jest.mock('../middleware/auth', () => ({
  authenticateToken: (req, res, next) => {
    req.user = { id: 'test-user', _id: 'test-user' };
    next();
  },
}));

const predictionRoutes = require('../routes/predictions.routes');

describe('Prediction Routes Comprehensive Tests', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/predictions', predictionRoutes);
  });

  describe('POST /api/predictions/predict-performance', () => {
    it('should predict performance', async () => {
      mockAiService.predictPerformance.mockResolvedValue({ score: 95 });

      const res = await request(app)
        .post('/api/predictions/predict-performance')
        .send({ data: { metrics: [1, 2, 3] } });

      expect(res.status).toBe(200);
      expect(mockAiService.predictPerformance).toHaveBeenCalled();
      expect(res.body.success).toBe(true);
    });

    it('should fail if data is missing', async () => {
      const res = await request(app).post('/api/predictions/predict-performance').send({});

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/predictions/predict-churn/:userId', () => {
    it('should predict churn', async () => {
      mockAiService.predictChurn.mockResolvedValue({ probability: 0.1 });

      const res = await request(app).get('/api/predictions/predict-churn/u1');

      expect(res.status).toBe(200);
      expect(mockAiService.predictChurn).toHaveBeenCalledWith('u1');
    });
  });
});
