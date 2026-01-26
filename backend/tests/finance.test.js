/**
 * Finance Module - Integration Tests
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../server');

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-for-testing-only';

describe('Finance Module', () => {
  let userToken;
  let invoiceId;
  let expenseId;

  beforeAll(async () => {
    userToken = jwt.sign({ id: 'finance-test-user', role: 'finance_manager' }, JWT_SECRET, {
      expiresIn: '1h',
    });
  });

  describe('Invoices', () => {
    test('POST /api/finance/invoices - create invoice', async () => {
      const res = await request(app)
        .post('/api/finance/invoices')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          clientName: 'Test Client',
          clientEmail: 'client@test.com',
          amount: 1500.0,
          items: [
            { description: 'Service A', quantity: 2, price: 500 },
            { description: 'Service B', quantity: 1, price: 500 },
          ],
          dueDate: '2026-02-15',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.clientName).toBe('Test Client');
      invoiceId = res.body.data._id;
    });

    test('GET /api/finance/invoices - list all invoices', async () => {
      const res = await request(app)
        .get('/api/finance/invoices')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    test('GET /api/finance/invoices/:id - get single invoice', async () => {
      const res = await request(app)
        .get(`/api/finance/invoices/${invoiceId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data._id).toBe(invoiceId);
    });

    test('PUT /api/finance/invoices/:id - update invoice', async () => {
      const res = await request(app)
        .put(`/api/finance/invoices/${invoiceId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          amount: 1750.0,
          clientName: 'Updated Client',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('POST /api/finance/invoices - validation: missing amount', async () => {
      const res = await request(app)
        .post('/api/finance/invoices')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          clientName: 'Test',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Expenses', () => {
    test('POST /api/finance/expenses - create expense', async () => {
      const res = await request(app)
        .post('/api/finance/expenses')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          category: 'Office Supplies',
          description: 'Printer paper and ink',
          amount: 250.5,
          vendor: 'Office Depot',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expenseId = res.body.data._id;
    });

    test('GET /api/finance/expenses - list all expenses with stats', async () => {
      const res = await request(app)
        .get('/api/finance/expenses')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.expenses).toBeDefined();
      expect(res.body.data.totalExpenses).toBeDefined();
    });

    test('PATCH /api/finance/expenses/:id/approve - approve expense', async () => {
      const res = await request(app)
        .patch(`/api/finance/expenses/${expenseId}/approve`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('POST /api/finance/expenses - validation: invalid amount', async () => {
      const res = await request(app)
        .post('/api/finance/expenses')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          category: 'Test',
          amount: -100,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Budgets', () => {
    test('POST /api/finance/budgets - create budget', async () => {
      const res = await request(app)
        .post('/api/finance/budgets')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          year: 2026,
          month: 2,
          categories: {
            'Office Supplies': 5000,
            Salaries: 100000,
            Marketing: 15000,
          },
          notes: 'Q1 Budget Plan',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    test('GET /api/finance/budgets - list all budgets', async () => {
      const res = await request(app)
        .get('/api/finance/budgets')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    test('POST /api/finance/budgets - validation: invalid year', async () => {
      const res = await request(app)
        .post('/api/finance/budgets')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          year: 1999,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Cleanup', () => {
    test('DELETE /api/finance/invoices/:id - delete invoice', async () => {
      const res = await request(app)
        .delete(`/api/finance/invoices/${invoiceId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
