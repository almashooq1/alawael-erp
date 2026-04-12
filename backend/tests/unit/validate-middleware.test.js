/* eslint-disable no-undef */
'use strict';
/**
 * Unit Tests — validate() middleware
 * ══════════════════════════════════
 * Tests the shared express-validator wrapper middleware.
 */

const { body } = require('express-validator');
const { validate } = require('../../middleware/validate');

function mockReq(bodyData = {}) {
  return { body: bodyData, params: {}, query: {}, headers: {} };
}

function mockRes() {
  const res = {
    statusCode: 200,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.payload = data;
      return this;
    },
  };
  return res;
}

describe('validate middleware', () => {
  it('calls next() when validation passes', async () => {
    const rules = [body('name').notEmpty()];
    const middleware = validate(rules);

    const req = mockReq({ name: 'Test' });
    const res = mockRes();
    const next = jest.fn();

    await middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
  });

  it('returns 400 when validation fails', async () => {
    const rules = [body('name').notEmpty().withMessage('الاسم مطلوب')];
    const middleware = validate(rules);

    const req = mockReq({});
    const res = mockRes();
    const next = jest.fn();

    await middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
    expect(res.payload.success).toBe(false);
    expect(res.payload.message).toBe('الاسم مطلوب');
  });

  it('returns all validation errors', async () => {
    const rules = [
      body('name').notEmpty().withMessage('الاسم مطلوب'),
      body('email').isEmail().withMessage('البريد غير صالح'),
    ];
    const middleware = validate(rules);

    const req = mockReq({});
    const res = mockRes();
    const next = jest.fn();

    await middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
    expect(res.payload.errors.length).toBe(2);
    expect(res.payload.errors[0]).toHaveProperty('field');
    expect(res.payload.errors[0]).toHaveProperty('message');
  });

  it('returns the first error as message', async () => {
    const rules = [
      body('a').notEmpty().withMessage('first error'),
      body('b').notEmpty().withMessage('second error'),
    ];
    const middleware = validate(rules);

    const req = mockReq({});
    const res = mockRes();
    const next = jest.fn();

    await middleware(req, res, next);

    expect(res.payload.message).toBe('first error');
  });

  it('handles multiple rules on same field', async () => {
    const rules = [body('age').isInt({ min: 0 }).withMessage('age must be integer >= 0')];
    const middleware = validate(rules);

    const req = mockReq({ age: -5 });
    const res = mockRes();
    const next = jest.fn();

    await middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
  });

  it('passes with valid complex data', async () => {
    const rules = [
      body('name').notEmpty(),
      body('age').isInt({ min: 0, max: 150 }),
      body('email').isEmail(),
    ];
    const middleware = validate(rules);

    const req = mockReq({ name: 'Ahmad', age: 25, email: 'ahmad@example.com' });
    const res = mockRes();
    const next = jest.fn();

    await middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});
