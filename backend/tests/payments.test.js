/**
 * Payments Module - Integration Tests
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../server');

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-for-testing-only';

describe('Payments Module', () => {
  let userToken;
  let adminToken;

  beforeAll(async () => {
    userToken = jwt.sign({ id: 'user-test', role: 'user' }, JWT_SECRET, { expiresIn: '1h' });
    adminToken = jwt.sign({ id: 'admin-test', role: 'admin' }, JWT_SECRET, { expiresIn: '1h' });
  });

  afterAll(async () => {
    // No DB connection needed; server uses in-memory DB in tests
  });

  test('POST /api/payments/stripe - process Stripe payment (mock)', async () => {
    const res = await request(app)
      .post('/api/payments/stripe')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ amount: 123.45, currency: 'SAR' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  test('POST /api/payments/debug/stripe - service without auth', async () => {
    const res = await request(app)
      .post('/api/payments/debug/stripe')
      .send({ amount: 99.99, currency: 'SAR' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  test('POST /api/payments/paypal - process PayPal payment (mock)', async () => {
    const res = await request(app)
      .post('/api/payments/paypal')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ amount: 50, description: 'Test purchase' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('POST /api/payments/installment - create installment plan', async () => {
    const res = await request(app)
      .post('/api/payments/installment')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ amount: 600, months: 6 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.installments.length).toBe(6);
  });

  test('POST /api/payments/subscriptions/create - create subscription', async () => {
    const res = await request(app)
      .post('/api/payments/subscriptions/create')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ plan: 'basic', billingCycle: 'monthly' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('POST /api/payments/invoices/create - create invoice (admin only)', async () => {
    const res = await request(app)
      .post('/api/payments/invoices/create')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        userId: 'user-test',
        items: [
          { productId: 'prod-1', quantity: 2, price: 100, total: 200 },
          { productId: 'prod-2', quantity: 1, price: 50, total: 50 },
        ],
        notes: 'Test invoice',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.invoiceNumber).toMatch(/INV-/);
  });

  test('GET /api/payments/history - should return history for authenticated user', async () => {
    const res = await request(app)
      .get('/api/payments/history')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('GET /api/payments/ping - router health', async () => {
    const res = await request(app).get('/api/payments/ping');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('POST /api/payments/echo - validator sanity', async () => {
    const res = await request(app).post('/api/payments/echo').send({ foo: 'bar' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.foo).toBe('bar');
  });

  test('POST /api/payments/debug/body - raw body shape', async () => {
    const payload = { amount: 12.34, currency: 'SAR', months: 3 };
    const res = await request(app).post('/api/payments/debug/body').send(payload);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.body).toEqual(payload);
  });
});
