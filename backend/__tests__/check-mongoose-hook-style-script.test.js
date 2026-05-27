'use strict';

/**
 * check-mongoose-hook-style-script.test.js — exit-code + classification
 * contract for scripts/check-mongoose-hook-style.js (Cycle 12 gate 4).
 *
 * Two layers of coverage:
 *
 *   1. Pure helpers (classifyHook + analyze) tested via direct require —
 *      catches regex/classification regressions silently breaking the
 *      gate without anyone noticing.
 *
 *   2. CLI exit-code contract via spawnSync — ensures the actual
 *      pre-push gate keeps returning the right status. Mirrors the
 *      check-speech-s3-ready-script.test.js pattern.
 *
 * Why this matters: a static drift guard whose detector silently
 * weakens is WORSE than no guard at all (false sense of security).
 * Memory: project_pre_push_prevention_stack_2026-05-26.md +
 * feedback_pair_static_with_behavioral_tests.md.
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'check-mongoose-hook-style.js');
const {
  classifyHook,
  analyze,
  hasCallbackHook,
  KNOWN_CALLBACK_HOOK_BASELINE,
} = require('../scripts/check-mongoose-hook-style');

describe('check-mongoose-hook-style — classifyHook (pure)', () => {
  it('classifies async function () as async', () => {
    expect(classifyHook(true, '', '')).toBe('async');
  });

  it('classifies async function (next) as async (param ignored, async wins)', () => {
    expect(classifyHook(true, 'next', '')).toBe('async');
  });

  it('classifies function () as sync (no next param)', () => {
    expect(classifyHook(false, '', '')).toBe('sync');
  });

  it('classifies function (next) WITH next() call in body as callback', () => {
    expect(classifyHook(false, 'next', 'doStuff(); next();')).toBe('callback');
  });

  it('classifies function (next) WITHOUT next() call in body as sync', () => {
    // Param is declared but never invoked — treat as sync because it
    // won't surprise Kareem when paired with async siblings.
    expect(classifyHook(false, 'next', 'doStuff(); return;')).toBe('sync');
  });
});

describe('check-mongoose-hook-style — analyze (file-level)', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hook-style-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function writeFixture(name, body) {
    const p = path.join(tmpDir, name);
    fs.writeFileSync(p, body, 'utf8');
    return p;
  }

  it('returns [] for a file with a single async hook', () => {
    const file = writeFixture(
      'safe-single-async.js',
      `
        const mongoose = require('mongoose');
        const TestSchema = new mongoose.Schema({ x: Number });
        TestSchema.pre('save', async function () { this.x = 1; });
      `
    );
    expect(analyze(file)).toEqual([]);
  });

  it('returns [] for a file with TWO async hooks on same event', () => {
    const file = writeFixture(
      'safe-two-async.js',
      `
        const TestSchema = new mongoose.Schema({ x: Number });
        TestSchema.pre('save', async function () { this.x = 1; });
        TestSchema.pre('save', async function () { this.x = 2; });
      `
    );
    expect(analyze(file)).toEqual([]);
  });

  it('returns [] for a file with TWO callback hooks on same event', () => {
    const file = writeFixture(
      'safe-two-callback.js',
      `
        const TestSchema = new mongoose.Schema({ x: Number });
        TestSchema.pre('save', function (next) { this.x = 1; next(); });
        TestSchema.pre('save', function (next) { this.x = 2; next(); });
      `
    );
    expect(analyze(file)).toEqual([]);
  });

  it('returns [] for callback + async on DIFFERENT events (validate vs save)', () => {
    const file = writeFixture(
      'safe-diff-events.js',
      `
        const TestSchema = new mongoose.Schema({ x: Number });
        TestSchema.pre('save', async function () { this.x = 1; });
        TestSchema.pre('validate', function (next) { next(); });
      `
    );
    expect(analyze(file)).toEqual([]);
  });

  it('DETECTS callback + async mixed on same event (the W483 bug)', () => {
    const file = writeFixture(
      'bug-mixed.js',
      `
        const TestSchema = new mongoose.Schema({ x: Number });
        TestSchema.pre('save', function (next) { this.x = 1; next(); });
        TestSchema.pre('save', async function () { this.x = 2; });
      `
    );
    const drift = analyze(file);
    expect(drift).toHaveLength(1);
    expect(drift[0].key).toBe("TestSchema.pre('save')");
    expect(drift[0].hooks.map(h => h.style).sort()).toEqual(['async', 'callback']);
  });

  it('DETECTS the bug regardless of declaration order (async first, callback second)', () => {
    const file = writeFixture(
      'bug-reverse-order.js',
      `
        const TestSchema = new mongoose.Schema({ x: Number });
        TestSchema.pre('save', async function () { this.x = 1; });
        TestSchema.pre('save', function (next) { this.x = 2; next(); });
      `
    );
    expect(analyze(file)).toHaveLength(1);
  });

  it('reports DIFFERENT mixed groups separately (save + validate both broken)', () => {
    const file = writeFixture(
      'bug-multi-event.js',
      `
        const TestSchema = new mongoose.Schema({ x: Number });
        TestSchema.pre('save', function (next) { next(); });
        TestSchema.pre('save', async function () {});
        TestSchema.pre('validate', function (next) { next(); });
        TestSchema.pre('validate', async function () {});
      `
    );
    const drift = analyze(file);
    expect(drift).toHaveLength(2);
    const keys = drift.map(d => d.key).sort();
    expect(keys).toEqual(["TestSchema.pre('save')", "TestSchema.pre('validate')"]);
  });

  it('also catches mixed POST hooks (gate covers pre AND post)', () => {
    const file = writeFixture(
      'bug-post-mixed.js',
      `
        const TestSchema = new mongoose.Schema({ x: Number });
        TestSchema.post('save', function (doc, next) { next(); });
        TestSchema.post('save', async function (doc) {});
      `
    );
    const drift = analyze(file);
    expect(drift).toHaveLength(1);
    expect(drift[0].key).toBe("TestSchema.post('save')");
  });
});

describe('check-mongoose-hook-style — hasCallbackHook + W494 baseline', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hook-w494-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function writeFixture(name, body) {
    const p = path.join(tmpDir, name);
    fs.writeFileSync(p, body, 'utf8');
    return p;
  }

  it('returns true for a file with a single callback-style hook (W494 risk)', () => {
    const file = writeFixture(
      'callback-only.js',
      `
        const TestSchema = new mongoose.Schema({ x: Number });
        TestSchema.pre('save', function (next) { this.x = 1; next(); });
      `
    );
    expect(hasCallbackHook(file)).toBe(true);
  });

  it('returns false for a file with only async hooks (W494-safe)', () => {
    const file = writeFixture(
      'async-only.js',
      `
        const TestSchema = new mongoose.Schema({ x: Number });
        TestSchema.pre('save', async function () { this.x = 1; });
        TestSchema.pre('validate', async function () { this.x = 2; });
      `
    );
    expect(hasCallbackHook(file)).toBe(false);
  });

  it('returns false for a file with sync hooks (no `next` param)', () => {
    const file = writeFixture(
      'sync-only.js',
      `
        const TestSchema = new mongoose.Schema({ x: Number });
        TestSchema.pre('save', function () { this.x = 1; });
      `
    );
    expect(hasCallbackHook(file)).toBe(false);
  });

  it('returns true if ANY hook is callback (mixed with async still flags)', () => {
    const file = writeFixture(
      'mixed.js',
      `
        const TestSchema = new mongoose.Schema({ x: Number });
        TestSchema.pre('save', async function () { this.x = 1; });
        TestSchema.pre('validate', function (next) { next(); });
      `
    );
    expect(hasCallbackHook(file)).toBe(true);
  });
});

describe('check-mongoose-hook-style — KNOWN_CALLBACK_HOOK_BASELINE structure', () => {
  it('is a Set instance', () => {
    expect(KNOWN_CALLBACK_HOOK_BASELINE).toBeInstanceOf(Set);
  });

  it('contains at least 50 entries (W494 baseline reality — was 99 at install)', () => {
    expect(KNOWN_CALLBACK_HOOK_BASELINE.size).toBeGreaterThanOrEqual(50);
  });

  it('every entry uses POSIX paths (no backslashes, no absolute paths)', () => {
    for (const entry of KNOWN_CALLBACK_HOOK_BASELINE) {
      expect(entry).not.toMatch(/\\/);
      expect(entry).not.toMatch(/^[A-Z]:\//);
      expect(entry).not.toMatch(/^\//);
    }
  });

  it('contains the W494 historical entries (Story + Equity models)', () => {
    // Note: the W494 fix commit `b0a487856` already converted these
    // four files to async — so they should NOT be in baseline anymore.
    // The historical context test verifies the OPPOSITE: these files
    // shouldn't be re-added. We assert they're absent.
    expect(KNOWN_CALLBACK_HOOK_BASELINE.has('models/StoryBook.js')).toBe(false);
    expect(KNOWN_CALLBACK_HOOK_BASELINE.has('models/StorySurfaceVariant.js')).toBe(false);
    expect(KNOWN_CALLBACK_HOOK_BASELINE.has('models/EquityDisparityAlert.js')).toBe(false);
    expect(KNOWN_CALLBACK_HOOK_BASELINE.has('models/OutcomeBenchmark.js')).toBe(false);
  });
});

describe('check-mongoose-hook-style — CLI exit-code contract', () => {
  it('exits 0 against the real backend/models (current state must be clean)', () => {
    const r = spawnSync('node', [SCRIPT], { encoding: 'utf8', timeout: 30000 });
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/No mixed async\/callback hook styles found/);
  });

  it('--json mode prints valid JSON with scanned + drift + baseline fields', () => {
    const r = spawnSync('node', [SCRIPT, '--json'], { encoding: 'utf8', timeout: 30000 });
    expect(r.status).toBe(0);
    const parsed = JSON.parse(r.stdout);
    expect(parsed.scanned).toBeGreaterThan(100);
    expect(Array.isArray(parsed.mixedStyleDrift)).toBe(true);
    expect(Array.isArray(parsed.newCallbackFiles)).toBe(true);
    expect(Array.isArray(parsed.staleBaselineEntries)).toBe(true);
    expect(parsed.mixedStyleDrift).toEqual([]);
    expect(parsed.newCallbackFiles).toEqual([]);
    expect(parsed.staleBaselineEntries).toEqual([]);
    expect(typeof parsed.callbackBaselineSize).toBe('number');
  });
});
