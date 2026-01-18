const express = require('express');
const request = require('supertest');

// MOCKS
const mockFinanceModels = {
  Invoice: { create: jest.fn(), findAll: jest.fn(), findById: jest.fn(), delete: jest.fn() },
  Expense: { create: jest.fn(), findAll: jest.fn() },
  Budget: { create: jest.fn(), findAll: jest.fn() },
  Payment: { create: jest.fn(), findAll: jest.fn() },
};

jest.mock('../models/Finance.memory', () => mockFinanceModels);

jest.mock('../middleware/auth', () => ({
  authenticateToken: (req, res, next) => {
    req.user = { id: 'user-123' };
    next();
  },
}));

const financeRoutes = require('../routes/finance.routes');

describe('Finance Routes Comprehensive Tests', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/finance', financeRoutes);
  });

  // Invoices
  describe('POST /api/finance/invoices', () => {
    it('should create an invoice', async () => {
      mockFinanceModels.Invoice.create.mockReturnValue({ id: 'inv1', amount: 100 });

      const res = await request(app).post('/api/finance/invoices').send({ clientName: 'ACME', amount: 100 });

      expect(res.status).toBe(201);
      expect(mockFinanceModels.Invoice.create).toHaveBeenCalled();
    });

    it('should fail if missing required fields', async () => {
      const res = await request(app).post('/api/finance/invoices').send({ amount: 100 });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/finance/invoices', () => {
    it('should get all invoices', async () => {
      mockFinanceModels.Invoice.findAll.mockReturnValue([]);
      const res = await request(app).get('/api/finance/invoices');
      expect(res.status).toBe(200);
    });
  });
});
