/**
 * @file requestValidation.test.js
 * @description Tests for request validation middleware
 *
 * Source: backend/middleware/requestValidation.js (209 lines)
 * Batch 8 — sanitizeInput, handleValidationErrors, commonValidations
 */

'use strict';

const {
  handleValidationErrors: _handleValidationErrors,
  commonValidations,
  authValidations,
  userValidations,
  sanitizeInput,
} = require('../middleware/requestValidation');

// ═══════════════════════════════════════════════════════════════════════════
// helpers
// ═══════════════════════════════════════════════════════════════════════════
const mockRes = () => {
  const res = {
    _status: null,
    _json: null,
    status(code) {
      res._status = code;
      return res;
    },
    json(data) {
      res._json = data;
      return res;
    },
  };
  return res;
};

// ═══════════════════════════════════════════════════════════════════════════
// sanitizeInput
// ═══════════════════════════════════════════════════════════════════════════
describe('sanitizeInput', () => {
  const next = jest.fn();
  beforeEach(() => next.mockClear());

  it('should trim whitespace from string body fields', () => {
    const req = {
      body: { name: '  Hello World  ', title: '  Bold  ' },
      query: {},
      params: {},
    };
    sanitizeInput(req, mockRes(), next);
    expect(req.body.name).toBe('Hello World');
    expect(req.body.title).toBe('Bold');
    expect(next).toHaveBeenCalled();
  });

  it('should trim whitespace from query params', () => {
    const req = {
      body: {},
      query: { search: '  term  ' },
      params: {},
    };
    sanitizeInput(req, mockRes(), next);
    expect(req.query.search).toBe('term');
  });

  it('should trim whitespace from URL params', () => {
    const req = {
      body: {},
      query: {},
      params: { id: '  123  ' },
    };
    sanitizeInput(req, mockRes(), next);
    expect(req.params.id).toBe('123');
  });

  it('should recursively trim nested objects', () => {
    const req = {
      body: {
        user: {
          name: '  Test  ',
          address: {
            city: '  Riyadh  ',
          },
        },
      },
      query: {},
      params: {},
    };
    sanitizeInput(req, mockRes(), next);
    expect(req.body.user.name).toBe('Test');
    expect(req.body.user.address.city).toBe('Riyadh');
  });

  it('should trim arrays', () => {
    const req = {
      body: { tags: ['  tag1  ', '  tag2  ', 'clean'] },
      query: {},
      params: {},
    };
    sanitizeInput(req, mockRes(), next);
    expect(req.body.tags).toEqual(['tag1', 'tag2', 'clean']);
  });

  it('should leave non-string values (numbers, booleans, null) untouched', () => {
    const req = {
      body: { count: 42, active: true, data: null },
      query: {},
      params: {},
    };
    sanitizeInput(req, mockRes(), next);
    expect(req.body.count).toBe(42);
    expect(req.body.active).toBe(true);
    expect(req.body.data).toBeNull();
  });

  it('should handle missing body/query/params gracefully', () => {
    const req = { body: undefined, query: undefined, params: undefined };
    sanitizeInput(req, mockRes(), next);
    expect(next).toHaveBeenCalled();
  });

  it('should handle empty strings', () => {
    const req = {
      body: { name: '' },
      query: {},
      params: {},
    };
    sanitizeInput(req, mockRes(), next);
    expect(req.body.name).toBe('');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// handleValidationErrors
// ═══════════════════════════════════════════════════════════════════════════
describe('handleValidationErrors', () => {
  it('should call next() when there are no validation errors', () => {
    // express-validator's validationResult reads from req[Symbol]
    // We can simulate it by using the internal _validationErrors convention
    // or by creating a mock req that validationResult reads correctly.
    // Simplest: mock the module for this block.
    jest.resetModules();
    jest.doMock('express-validator', () => {
      const actual = jest.requireActual('express-validator');
      return {
        ...actual,
        validationResult: jest.fn(() => ({
          isEmpty: () => true,
          array: () => [],
        })),
      };
    });

    const { handleValidationErrors: hve } = require('../middleware/requestValidation');
    const res = mockRes();
    const next = jest.fn();
    hve({}, res, next);
    expect(next).toHaveBeenCalled();
    expect(res._status).toBeNull();
  });

  it('should return 400 with errors when validation fails', () => {
    jest.resetModules();

    const errors = [
      { param: 'email', msg: 'Invalid email', value: 'bad' },
      { path: 'name', msg: 'Required', value: '' },
    ];

    jest.doMock('express-validator', () => {
      const actual = jest.requireActual('express-validator');
      return {
        ...actual,
        validationResult: jest.fn(() => ({
          isEmpty: () => false,
          array: () => errors,
        })),
      };
    });

    const { handleValidationErrors: hve } = require('../middleware/requestValidation');
    const res = mockRes();
    const next = jest.fn();
    hve({}, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res._status).toBe(400);
    expect(res._json.success).toBe(false);
    expect(res._json.message).toBe('Validation failed');
    expect(res._json.errors).toHaveLength(2);
    expect(res._json.errors[0].field).toBe('email');
    expect(res._json.timestamp).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// commonValidations (structure)
// ═══════════════════════════════════════════════════════════════════════════
describe('commonValidations', () => {
  it('should have all expected validator keys', () => {
    const expected = [
      'email',
      'password',
      'mongoId',
      'pagination',
      'date',
      'requiredString',
      'optionalString',
      'number',
      'boolean',
      'array',
      'phone',
      'url',
    ];
    for (const key of expected) {
      expect(commonValidations).toHaveProperty(key);
    }
  });

  it('email should be a validator chain with run()', () => {
    expect(typeof commonValidations.email.run).toBe('function');
  });

  it('password should be a validator chain', () => {
    expect(typeof commonValidations.password.run).toBe('function');
  });

  it('mongoId should be a function returning a validator', () => {
    const chain = commonValidations.mongoId('id');
    expect(typeof chain.run).toBe('function');
  });

  it('pagination should be an array of validators', () => {
    expect(Array.isArray(commonValidations.pagination)).toBe(true);
    expect(commonValidations.pagination.length).toBe(2); // page, limit
  });

  it('date should be a function returning a validator', () => {
    const chain = commonValidations.date('startDate');
    expect(typeof chain.run).toBe('function');
  });

  it('requiredString should accept field and length params', () => {
    const chain = commonValidations.requiredString('title', 2, 100);
    expect(typeof chain.run).toBe('function');
  });

  it('number should accept field with min/max', () => {
    const chain = commonValidations.number('price', 0, 99999);
    expect(typeof chain.run).toBe('function');
  });

  it('boolean should return a validator', () => {
    const chain = commonValidations.boolean('active');
    expect(typeof chain.run).toBe('function');
  });

  it('array should return a validator', () => {
    const chain = commonValidations.array('items', 1, 50);
    expect(typeof chain.run).toBe('function');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// authValidations & userValidations (structure)
// ═══════════════════════════════════════════════════════════════════════════
describe('authValidations', () => {
  it('should have login, register, resetPassword, changePassword', () => {
    expect(authValidations).toHaveProperty('login');
    expect(authValidations).toHaveProperty('register');
    expect(authValidations).toHaveProperty('resetPassword');
    expect(authValidations).toHaveProperty('changePassword');
  });

  it('login should be an array with validators + error handler', () => {
    expect(Array.isArray(authValidations.login)).toBe(true);
    expect(authValidations.login.length).toBe(3);
    // Last element should be the error handler function
    expect(typeof authValidations.login[authValidations.login.length - 1]).toBe('function');
  });

  it('register should include name, email, password validators', () => {
    expect(authValidations.register.length).toBeGreaterThanOrEqual(3);
  });
});

describe('userValidations', () => {
  it('should have updateProfile and getUserById', () => {
    expect(userValidations).toHaveProperty('updateProfile');
    expect(userValidations).toHaveProperty('getUserById');
  });

  it('updateProfile should be an array', () => {
    expect(Array.isArray(userValidations.updateProfile)).toBe(true);
  });

  it('getUserById should include mongoId validator', () => {
    expect(userValidations.getUserById.length).toBeGreaterThanOrEqual(2);
  });
});
