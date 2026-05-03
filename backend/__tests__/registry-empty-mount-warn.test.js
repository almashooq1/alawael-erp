'use strict';

/**
 * Regression: empty-router warning in dualMount.
 *
 * Background — when a route module is renamed/archived but still
 * referenced via `safeRequire(...) || empty Router()`, the registry
 * silently mounts a dead path. We hit this with `inventory.routes.unified`
 * (entire 34-endpoint inventory module 404'd in production) and again
 * with `purchasing.routes.unified`. The dualMount helper now logs a
 * warning when handed a router whose stack is empty so the bug class
 * surfaces in boot logs and CI.
 */

const express = require('express');
const { dualMount } = require('../routes/_registry');

describe('dualMount empty-router warning', () => {
  let warnSpy;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    delete process.env.SUPPRESS_EMPTY_MOUNT_WARN;
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  test('warns when mounting an empty Router', () => {
    const app = express();
    const empty = express.Router();
    dualMount(app, 'dead-path', empty);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('/api/dead-path mounted on EMPTY router')
    );
  });

  test('does not warn for routers with at least one endpoint', () => {
    const app = express();
    const live = express.Router();
    live.get('/', (_req, res) => res.json({ ok: true }));
    dualMount(app, 'live-path', live);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  test('respects SUPPRESS_EMPTY_MOUNT_WARN=1', () => {
    process.env.SUPPRESS_EMPTY_MOUNT_WARN = '1';
    const app = express();
    const empty = express.Router();
    dualMount(app, 'dead-path', empty);
    expect(warnSpy).not.toHaveBeenCalled();
  });
});
