'use strict';

/**
 * registry-mount-resilience-wave778.test.js — W778 drift guard.
 * W775 deleted conversations.routes but left a bare require() that aborted
 * mountAllRoutes before admin/* routes — Admin API Smoke returned 404 for all.
 */

const fs = require('fs');
const path = require('path');
const express = require('express');

const BACKEND = path.join(__dirname, '..');
const REG = fs.readFileSync(path.join(BACKEND, 'routes', '_registry.js'), 'utf8');

describe('W778 — mountAllRoutes completes after W775 stub deletes', () => {
  it('_registry.js does not bare-require deleted conversations.routes', () => {
    expect(REG).not.toMatch(/conversations\.routes/);
  });

  it('mountAllRoutes runs without throwing (admin routes register)', () => {
    process.env.NODE_ENV = 'test';
    process.env.USE_MOCK_DB = 'true';
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-minimum-32-chars-ok!!';

    jest.resetModules();
    const { mountAllRoutes, routeHealth } = require('../routes/_registry');
    const app = express();

    expect(() => mountAllRoutes(app, { authRateLimiter: null })).not.toThrow();
    expect(routeHealth.failed.filter(f => !f.missing)).toHaveLength(0);

    const layers = [];
    const walk = stack => {
      stack.forEach(layer => {
        if (layer.route && layer.route.path) layers.push(layer.route.path);
        if (layer.name === 'router' && layer.handle?.stack) {
          walk(layer.handle.stack);
        }
      });
    };
    walk(app._router.stack);
    const hasAdminBeneficiaries = app._router.stack.some(
      layer =>
        layer.regexp &&
        String(layer.regexp).includes('admin') &&
        String(layer.regexp).includes('beneficiar')
    );
    expect(hasAdminBeneficiaries).toBe(true);
  });
});
