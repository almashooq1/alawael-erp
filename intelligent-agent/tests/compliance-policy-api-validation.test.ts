import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
const request = require('supertest');
const express = require('express');
let mongoose;
let server;
let complianceRouter;

// Mock mongoose to avoid MongoDB Memory Server issues
vi.mock('mongoose', () => {
  const mockConnection = {
    readyState: 1,
    db: {
      dropDatabase: vi.fn().mockResolvedValue(undefined),
    },
  };

  class MockSchema {
    constructor(definition: any) {
      this.definition = definition;
    }
    definition: any;
    pre(event: string, fn: Function) {
      return this;
    }
    post(event: string, fn: Function) {
      return this;
    }
  }

  // In-memory storage for policies
  const policies: any[] = [];

  // Generate valid MongoDB ObjectId-like strings
  const generateObjectId = () => {
    return Math.floor(Math.random() * 0xFFFFFFFFFFFFFFFFFFFFFFFF).toString(16).padStart(24, '0');
  };

  return {
    default: {
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
      connection: mockConnection,
      Schema: MockSchema,
      model: vi.fn().mockReturnValue({
        find: vi.fn().mockReturnValue({
          lean: vi.fn().mockImplementation(() => Promise.resolve([...policies])),
        }),
        findById: vi.fn().mockImplementation((id: string) => {
          return Promise.resolve(policies.find(p => p._id === id) || null);
        }),
        findOne: vi.fn().mockImplementation((query: any) => {
          if (query.name) {
            return Promise.resolve(policies.find(p => p.name === query.name) || null);
          }
          return Promise.resolve(null);
        }),
        create: vi.fn().mockImplementation((data: any) => {
          // Check for duplicate name
          if (policies.some(p => p.name === data.name)) {
            const err: any = new Error('Duplicate name');
            err.code = 11000;
            return Promise.reject(err);
          }
          const newPolicy = { _id: generateObjectId(), ...data };
          policies.push(newPolicy);
          return Promise.resolve(newPolicy);
        }),
        findByIdAndUpdate: vi.fn().mockImplementation((id: string, data: any) => {
          const index = policies.findIndex(p => p._id === id);
          if (index === -1) return Promise.resolve(null);
          policies[index] = { ...policies[index], ...data };
          return Promise.resolve(policies[index]);
        }),
        findByIdAndDelete: vi.fn().mockImplementation((id: string) => {
          const index = policies.findIndex(p => p._id === id);
          if (index === -1) return Promise.resolve(null);
          const deleted = policies[index];
          policies.splice(index, 1);
          return Promise.resolve(deleted);
        }),
      }),
    },
  };
});

// Mock RBAC middleware to bypass authentication
vi.mock('../src/middleware/rbac', () => ({
  requirePermission: () => (req: any, res: any, next: any) => next(),
}));

// Mock request validation middleware
vi.mock('../../../backend/middleware/requestValidation', () => ({
  sanitizeInput: (req: any, res: any, next: any) => next(),
  commonValidations: {
    requiredString: () => (req: any, res: any, next: any) => next(),
    optionalString: () => (req: any, res: any, next: any) => next(),
    boolean: () => (req: any, res: any, next: any) => next(),
    mongoId: () => (req: any, res: any, next: any) => next(),
  },
  handleValidationErrors: (req: any, res: any, next: any) => next(),
}));

beforeAll(async () => {
  mongoose = await import('mongoose');
  complianceRouter = (await import('../src/routes/compliance-policy')).default;
  const app = express();
  app.use(express.json());
  app.use('/policies', complianceRouter);
  server = app;
});

afterAll(async () => {
  // Cleanup if needed
});

describe('Compliance Policy API Validation', () => {
  let createdId = '';

  it('should reject missing name', async () => {
    const res = await request(server).post('/policies').send({ description: 'desc', enabled: true });
    expect(res.status).toBe(400);
  });

  it('should create valid policy', async () => {
    const res = await request(server).post('/policies').send({ name: 'Policy1', description: 'desc', enabled: true });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('name', 'Policy1');
    createdId = res.body._id;
  });

  it('should reject duplicate name', async () => {
    const res = await request(server).post('/policies').send({ name: 'Policy1', description: 'desc', enabled: true });
    expect(res.status).toBe(400);
  });

  it('should list all policies', async () => {
    const res = await request(server).get('/policies');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('should update policy', async () => {
    const res = await request(server).put(`/policies/${createdId}`).send({ name: 'Policy1-updated', enabled: false });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('name', 'Policy1-updated');
    expect(res.body).toHaveProperty('enabled', false);
  });

  it('should reject update with invalid id', async () => {
    const res = await request(server).put('/policies/invalid-id').send({ name: 'X' });
    expect(res.status).toBe(400);
  });

  it('should delete policy', async () => {
    const res = await request(server).delete(`/policies/${createdId}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('ok', true);
  });

  it('should reject delete with invalid id', async () => {
    const res = await request(server).delete('/policies/invalid-id');
    expect(res.status).toBe(400);
  });
});
