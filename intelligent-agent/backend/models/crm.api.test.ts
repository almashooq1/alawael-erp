import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app';
describe('CRM API', () => {
  let customerId = '';
  it('should create a customer', async () => {
    try {
      const randomEmail = `test_${Math.random().toString(36).substring(2, 10)}@example.com`;
      const res = await request(app)
        .post('/api/customers')
        .send({ name: 'Test User', email: randomEmail, phone: '123456', company: 'TestCo' });
      if (res.status !== 201) {
        console.error('Create customer response:', res.status, res.body);
      }
      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Test User');
      customerId = res.body._id;
    } catch (err) {
      console.error('Create customer error:', err);
      throw err;
    }
  }, 20000);
  it('should get all customers', async () => {
    try {
      const res = await request(app).get('/api/customers');
      if (res.status !== 200) {
        console.error('Get all customers response:', res.status, res.body);
      }
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    } catch (err) {
      console.error('Get all customers error:', err);
      throw err;
    }
  }, 20000);
  it('should update a customer', async () => {
    try {
      const res = await request(app)
        .put(`/api/customers/${customerId}`)
        .send({ name: 'Updated User' });
      if (res.status !== 200) {
        console.error('Update customer response:', res.status, res.body);
      }
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Updated User');
    } catch (err) {
      console.error('Update customer error:', err);
      throw err;
    }
  }, 20000);
  it('should delete a customer', async () => {
    try {
      const res = await request(app).delete(`/api/customers/${customerId}`);
      if (res.status !== 200) {
        console.error('Delete customer response:', res.status, res.body);
      }
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Customer deleted');
    } catch (err) {
      console.error('Delete customer error:', err);
      throw err;
    }
  }, 20000);
});
