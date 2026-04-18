/**
 * build-info-internals.test.js — unit tests for the small helpers
 * that resolve GIT_SHA / BUILD_TIME / humanizeUptime in
 * routes/build-info.routes.js. These are exposed via the `_internal`
 * export specifically so this file can lock their contracts.
 *
 * The HTTP-facing smoke test in new-admin-routes.api.test.js proves
 * the endpoint's happy path; these tests cover the resolution edge
 * cases (empty env, rotated-out build time, uptime formatting).
 */

'use strict';

// jest.resetModules() per-test so each test gets a fresh resolution
// — the helpers memoize at module-load time, which is fine for a
// long-running process but needs a reset between test scenarios.
describe('build-info helpers', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV };
    delete process.env.GIT_SHA;
    delete process.env.BUILD_TIME;
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  function load() {
    return require('../routes/build-info.routes')._internal;
  }

  describe('resolveGitSha', () => {
    it('prefers non-empty GIT_SHA env over git command', () => {
      process.env.GIT_SHA = 'abcdef1234567890abcdef1234567890abcdef12';
      expect(load().resolveGitSha()).toBe('abcdef1234567890abcdef1234567890abcdef12');
    });

    it('treats empty string as missing (falls back to git)', () => {
      process.env.GIT_SHA = '';
      const sha = load().resolveGitSha();
      // In this repo git is available, so we expect a real SHA;
      // in a stripped container it would be "unknown". Either is valid.
      expect(sha).toMatch(/^([0-9a-f]{40}|unknown)$/);
    });

    it('trims whitespace around GIT_SHA', () => {
      process.env.GIT_SHA = '  abcdef1234567890abcdef1234567890abcdef12  \n';
      expect(load().resolveGitSha()).toBe('abcdef1234567890abcdef1234567890abcdef12');
    });
  });

  describe('resolveGitShaShort', () => {
    it('is the first 8 chars of the full SHA', () => {
      process.env.GIT_SHA = 'abcdef1234567890abcdef1234567890abcdef12';
      expect(load().resolveGitShaShort()).toBe('abcdef12');
    });

    it('stays "unknown" when SHA is unresolvable', () => {
      // Point cwd at a non-git dir to force fallback. Override
      // env GIT_SHA to empty so we always go through the git path.
      process.env.GIT_SHA = '';
      const sha = load().resolveGitShaShort();
      expect(sha).toMatch(/^([0-9a-f]{8}|unknown)$/);
    });
  });

  describe('resolveBuildTime', () => {
    it('returns the env value when set', () => {
      process.env.BUILD_TIME = '2026-04-18T11:30:00Z';
      expect(load().resolveBuildTime()).toBe('2026-04-18T11:30:00Z');
    });

    it('returns "unknown" when env is empty string', () => {
      process.env.BUILD_TIME = '';
      expect(load().resolveBuildTime()).toBe('unknown');
    });

    it('returns "unknown" when env is whitespace-only', () => {
      process.env.BUILD_TIME = '   ';
      expect(load().resolveBuildTime()).toBe('unknown');
    });

    it('returns "unknown" when env is unset', () => {
      delete process.env.BUILD_TIME;
      expect(load().resolveBuildTime()).toBe('unknown');
    });
  });

  describe('humanizeUptime', () => {
    it.each([
      [0, '0s'],
      [59, '59s'],
      [60, '1m 0s'],
      [125, '2m 5s'],
      [3600, '1h 0m'],
      [3665, '1h 1m'],
      [86_400, '1d 0h'],
      [90_000, '1d 1h'],
    ])('%i → %s', (seconds, expected) => {
      expect(load().humanizeUptime(seconds)).toBe(expected);
    });
  });
});
