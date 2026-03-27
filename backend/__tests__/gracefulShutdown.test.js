'use strict';

// ── Top-level mocks (hoisted) ────────────────────────────────────────────────
jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

jest.mock('mongoose', () => ({
  connection: { readyState: 0, close: jest.fn().mockResolvedValue() },
}));

jest.mock('../config/performance', () => ({
  getRedisClient: jest.fn(() => null),
}));

jest.mock('readline', () => ({
  createInterface: jest.fn(() => ({ on: jest.fn(), close: jest.fn() })),
}));

// ─────────────────────────────────────────────────────────────────────────────
describe('gracefulShutdown', () => {
  let originalExit;
  let savedSIGTERM;
  let savedSIGINT;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();

    // Save and clear signal listeners to avoid cross-test leaks
    savedSIGTERM = process.rawListeners('SIGTERM').slice();
    savedSIGINT = process.rawListeners('SIGINT').slice();
    process.removeAllListeners('SIGTERM');
    process.removeAllListeners('SIGINT');

    // Mock process.exit
    originalExit = process.exit;
    process.exit = jest.fn();
  });

  afterEach(() => {
    // Remove listeners added by tests
    process.removeAllListeners('SIGTERM');
    process.removeAllListeners('SIGINT');

    // Restore original listeners
    savedSIGTERM.forEach(fn => process.on('SIGTERM', fn));
    savedSIGINT.forEach(fn => process.on('SIGINT', fn));

    // Restore process.exit
    process.exit = originalExit;
  });

  function freshRequire() {
    return require('../utils/gracefulShutdown');
  }

  // ── Exports ──────────────────────────────────────────────────────────────
  it('exports setupGracefulShutdown and shutdownMiddleware', () => {
    const { setupGracefulShutdown, shutdownMiddleware } = freshRequire();
    expect(typeof setupGracefulShutdown).toBe('function');
    expect(typeof shutdownMiddleware).toBe('function');
  });

  // ── shutdownMiddleware — not shutting down ───────────────────────────────
  it('calls next() when server is not shutting down', () => {
    const { shutdownMiddleware } = freshRequire();
    const next = jest.fn();
    shutdownMiddleware(
      {},
      { set: jest.fn(), status: jest.fn().mockReturnThis(), json: jest.fn() },
      next
    );
    expect(next).toHaveBeenCalled();
  });

  // ── shutdownMiddleware — after shutdown triggered ────────────────────────
  it('returns 503 after shutdown is triggered', async () => {
    const { setupGracefulShutdown, shutdownMiddleware } = freshRequire();

    const mockServer = {
      close: jest.fn(cb => cb && cb()),
      _kpiInterval: null,
      _dashboardInterval: null,
    };

    setupGracefulShutdown(mockServer);

    // Trigger shutdown (sync part sets isShuttingDown = true)
    process.emit('SIGTERM');

    // Allow async operations to settle
    await new Promise(r => { setTimeout(r, 50); });

    const res = {
      set: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();
    shutdownMiddleware({}, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, code: 'SERVICE_UNAVAILABLE' })
    );
  });

  // ── Registers signal handlers ────────────────────────────────────────────
  it('registers SIGTERM and SIGINT handlers', () => {
    const { setupGracefulShutdown } = freshRequire();
    const before = { t: process.listenerCount('SIGTERM'), i: process.listenerCount('SIGINT') };
    setupGracefulShutdown({ close: jest.fn(), _kpiInterval: null, _dashboardInterval: null });
    expect(process.listenerCount('SIGTERM')).toBeGreaterThan(before.t);
    expect(process.listenerCount('SIGINT')).toBeGreaterThan(before.i);
  });

  // ── Calls server.close ──────────────────────────────────────────────────
  it('calls server.close on shutdown', async () => {
    const { setupGracefulShutdown } = freshRequire();
    const mockServer = {
      close: jest.fn(cb => cb && cb()),
      _kpiInterval: null,
      _dashboardInterval: null,
    };
    setupGracefulShutdown(mockServer);
    process.emit('SIGTERM');
    await new Promise(r => { setTimeout(r, 50); });
    expect(mockServer.close).toHaveBeenCalled();
  });

  // ── Closes mongoose when connected ──────────────────────────────────────
  it('closes mongoose connection when readyState is 1', async () => {
    const mongoose = require('mongoose');
    mongoose.connection.readyState = 1;
    mongoose.connection.close = jest.fn().mockResolvedValue();

    const { setupGracefulShutdown } = freshRequire();
    const mockServer = {
      close: jest.fn(cb => cb && cb()),
      _kpiInterval: null,
      _dashboardInterval: null,
    };
    setupGracefulShutdown(mockServer);
    process.emit('SIGTERM');
    await new Promise(r => { setTimeout(r, 100); });
    expect(mongoose.connection.close).toHaveBeenCalled();
  });

  // ── Closes Socket.IO when provided ──────────────────────────────────────
  it('closes Socket.IO when io is provided', async () => {
    const { setupGracefulShutdown } = freshRequire();
    const mockIo = { close: jest.fn(cb => cb && cb()) };
    const mockServer = {
      close: jest.fn(cb => cb && cb()),
      _kpiInterval: null,
      _dashboardInterval: null,
    };
    setupGracefulShutdown(mockServer, mockIo);
    process.emit('SIGTERM');
    await new Promise(r => { setTimeout(r, 50); });
    expect(mockIo.close).toHaveBeenCalled();
  });

  // ── Idempotent shutdown ─────────────────────────────────────────────────
  it('ignores duplicate shutdown signals', async () => {
    const { setupGracefulShutdown } = freshRequire();
    const mockServer = {
      close: jest.fn(cb => cb && cb()),
      _kpiInterval: null,
      _dashboardInterval: null,
    };
    setupGracefulShutdown(mockServer);
    process.emit('SIGTERM');
    process.emit('SIGTERM');
    await new Promise(r => { setTimeout(r, 50); });
    // server.close called only once (second signal returns early)
    expect(mockServer.close).toHaveBeenCalledTimes(1);
  });
});
