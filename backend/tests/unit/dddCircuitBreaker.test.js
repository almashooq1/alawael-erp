'use strict';

jest.mock('../../models/DddCircuitBreaker', () => ({
  DDDCircuitState: {},
  DDDCircuitEvent: {},


}));

const svc = require('../../services/dddCircuitBreaker');

describe('dddCircuitBreaker service', () => {
  test('module exports', () => { expect(svc).toBeDefined(); });
});
