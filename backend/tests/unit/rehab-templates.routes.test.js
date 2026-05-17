'use strict';
/**
 * Unit tests — routes/rehab-templates.routes.js
 * Verifies route registration without HTTP server.
 *
 * NOTE: jest.config.js has clearMocks:true which wipes mock.calls before every
 * test. We snapshot the recorded paths in beforeAll (runs before clearMocks)
 * and assert against the snapshot in each it() block.
 */

const mockRouter = {
  get: jest.fn().mockReturnThis(),
  post: jest.fn().mockReturnThis(),
  put: jest.fn().mockReturnThis(),
  patch: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  use: jest.fn().mockReturnThis(),
  all: jest.fn().mockReturnThis(),
};

jest.mock('express', () => ({
  Router: jest.fn(() => mockRouter),
  json: jest.fn(() => jest.fn()),
  urlencoded: jest.fn(() => jest.fn()),
}));

// Require the route file at module scope so the mock intercepts express.Router()
require('../../routes/rehab-templates.routes');

// Snapshot captured paths BEFORE clearMocks wipes them
let registeredGet = [];
let registeredPost = [];
let deleteCalled = false;
let routerFactoryCalled = false;

beforeAll(() => {
  const { Router } = require('express');
  routerFactoryCalled = Router.mock.calls.length > 0;
  registeredGet = mockRouter.get.mock.calls.map(c => c[0]);
  registeredPost = mockRouter.post.mock.calls.map(c => c[0]);
  deleteCalled = mockRouter.delete.mock.calls.length > 0;
});

describe('rehab-templates.routes.js — route registration', () => {
  it('called express Router factory', () => {
    expect(routerFactoryCalled).toBe(true);
  });

  it('registers GET / (list templates)', () => {
    expect(registeredGet).toContain('/');
  });

  it('registers GET /:key (template detail)', () => {
    expect(registeredGet).toContain('/:key');
  });

  it('registers POST /match', () => {
    expect(registeredPost).toContain('/match');
  });

  it('registers POST /:key/build-plan', () => {
    expect(registeredPost).toContain('/:key/build-plan');
  });

  it('no DELETE routes registered', () => {
    expect(deleteCalled).toBe(false);
  });
});
