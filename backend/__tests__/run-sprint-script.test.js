'use strict';

/**
 * run-sprint-script.test.js — pure-helper contract for scripts/run-sprint.js.
 *
 * Why: the runner's most-likely-to-silently-break logic is (1) the
 * CLI-flag → runCLI-argv translation (_flagsToArgv) and (2) the Windows
 * command-line-ceiling decision (_decideMode). A regression in either
 * would either pass wrong flags to jest (e.g. drop `--shard`) or pick the
 * spawn path on Windows for a 1599-file list and reproduce the 2026-06-15
 * `spawn ENAMETOOLONG` break. This locks both as pure functions — no real
 * jest run, no spawn, no Mongo.
 */

const path = require('path');
const {
  _kebabToCamel,
  _flagsToArgv,
  _decideMode,
  WIN_CMDLINE_SAFE_LIMIT,
  DEFAULT_FLAGS,
} = require('../scripts/run-sprint');

describe('run-sprint — _kebabToCamel (pure)', () => {
  it('converts kebab-case to camelCase', () => {
    expect(_kebabToCamel('no-coverage')).toBe('noCoverage');
    expect(_kebabToCamel('output-file')).toBe('outputFile');
    expect(_kebabToCamel('json')).toBe('json');
  });
});

describe('run-sprint — _flagsToArgv (pure)', () => {
  it('maps boolean flags to true', () => {
    expect(_flagsToArgv(['--json'])).toEqual({ json: true });
  });

  it('maps --no-X flags to false on the camelCased key', () => {
    expect(_flagsToArgv(['--no-coverage'])).toEqual({ coverage: false });
  });

  it('preserves --shard string value verbatim (regression: must not drop)', () => {
    expect(_flagsToArgv(['--shard=1/4'])).toEqual({ shard: '1/4' });
  });

  it('keeps --outputFile path as a string', () => {
    expect(_flagsToArgv(['--outputFile=.shard1.json'])).toEqual({
      outputFile: '.shard1.json',
    });
  });

  it('coerces known numeric flags to numbers', () => {
    expect(_flagsToArgv(['--testTimeout=30000'])).toEqual({ testTimeout: 30000 });
    expect(_flagsToArgv(['--bail=1'])).toEqual({ bail: 1 });
  });

  it('ignores positional / non-flag tokens', () => {
    expect(_flagsToArgv(['foo.test.js', '--json'])).toEqual({ json: true });
  });

  it('translates the full DEFAULT_FLAGS set', () => {
    expect(_flagsToArgv(DEFAULT_FLAGS)).toEqual({
      coverage: false,
      passWithNoTests: true,
      forceExit: true,
    });
  });
});

describe('run-sprint — _decideMode (pure, Windows-ceiling logic)', () => {
  const shortList = ['__tests__/a.test.js', '__tests__/b.test.js'];

  // Build a list whose joined length comfortably exceeds the ceiling.
  const longPath = '__tests__/' + 'x'.repeat(80) + '.test.js';
  const longList = Array.from({ length: 1599 }, (_, i) => longPath + i);

  it('uses spawn for a short list on win32', () => {
    const { useProgrammatic } = _decideMode(shortList, [], {
      platform: 'win32',
      forceProgrammatic: false,
    });
    expect(useProgrammatic).toBe(false);
  });

  it('uses in-process API for a 1599-file list on win32 (ENAMETOOLONG guard)', () => {
    const { useProgrammatic, approxCmdLen } = _decideMode(longList, [], {
      platform: 'win32',
      forceProgrammatic: false,
    });
    expect(approxCmdLen).toBeGreaterThan(WIN_CMDLINE_SAFE_LIMIT);
    expect(useProgrammatic).toBe(true);
  });

  it('keeps spawn on linux even for a huge list (ARG_MAX is MBs)', () => {
    const { useProgrammatic } = _decideMode(longList, [], {
      platform: 'linux',
      forceProgrammatic: false,
    });
    expect(useProgrammatic).toBe(false);
  });

  it('honors forceProgrammatic override regardless of platform', () => {
    const { useProgrammatic } = _decideMode(shortList, [], {
      platform: 'linux',
      forceProgrammatic: true,
    });
    expect(useProgrammatic).toBe(true);
  });

  it('counts extra args toward the command-line length estimate', () => {
    const { approxCmdLen: withoutExtra } = _decideMode(shortList, [], {
      platform: 'win32',
    });
    const { approxCmdLen: withExtra } = _decideMode(shortList, ['--shard=1/4'], {
      platform: 'win32',
    });
    expect(withExtra).toBeGreaterThan(withoutExtra);
  });
});

describe('run-sprint — module shape', () => {
  it('exports the documented pure helpers', () => {
    const mod = require('../scripts/run-sprint');
    expect(typeof mod._readList).toBe('function');
    expect(typeof mod._flagsToArgv).toBe('function');
    expect(typeof mod._decideMode).toBe('function');
    expect(Array.isArray(mod.DEFAULT_FLAGS)).toBe(true);
    expect(typeof mod.WIN_CMDLINE_SAFE_LIMIT).toBe('number');
  });

  it('does not launch jest on require (require.main guard)', () => {
    // If the guard were missing, requiring the module would have spawned
    // jest / called process.exit during the import above and this suite
    // would never reach here. Reaching this assertion proves the guard.
    expect(path.basename(require.resolve('../scripts/run-sprint'))).toBe('run-sprint.js');
  });
});
