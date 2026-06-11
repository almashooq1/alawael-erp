/**
 * W954 — regression guard for the legacy-hook adapter in
 * config/mongoose.plugins.js.
 *
 * THE BUG (root cause of "البيانات لا تُحفظ" / data won't save):
 *   The adapter wrapped ANY hook function with exactly one declared parameter,
 *   assuming that param is the legacy `next` continuation. But a `post` hook
 *   receives the DOCUMENT as its sole param — `post('save', function (doc) {…})`.
 *   Wrapping it passed the wrapper's `next` callback in AS `doc`; since a sync
 *   post hook neither calls next() nor returns a thenable, the wrapper Promise
 *   NEVER resolved → mongoose awaited it forever → every .save()/.create() on
 *   any model carrying such a post hook HUNG until the caller timed out. The
 *   shim is registered globally in server.js, so it silently broke saves in
 *   production across ~24+ models (Beneficiary, Appointment, Invoice, MAR,
 *   Complaint, …).
 *
 * THE FIX:
 *   Only adapt a hook whose sole parameter is literally named `next` (a true
 *   legacy `function (next) {…}` callback). `(doc)` / `(docs)` / `(err)` hooks
 *   are left untouched. When the source can't be parsed, fall through and wrap
 *   (preserves the W946 legacy-callback rescue).
 *
 * This is a PURE-helper static guard (no mongoose, no DB) so it runs fast and
 * deterministically in CI. End-to-end no-hang behaviour is covered by
 * legacy-hook-no-hang-behavioral-wave954.test.js.
 */

'use strict';

const { legacyHookAdapter, firstParamName } = require('../config/mongoose.plugins');

describe('W954 — firstParamName extracts the sole declared parameter', () => {
  it('reads a classic function expression param', () => {
    expect(firstParamName(function (doc) {})).toBe('doc');
    expect(firstParamName(function (next) {})).toBe('next');
  });

  it('reads an async function param', () => {
    expect(firstParamName(async function (next) {})).toBe('next');
  });

  it('reads a named function param', () => {
    expect(firstParamName(function deriveBranch(next) {})).toBe('next');
  });

  it('reads arrow-function params (parenthesised + bare)', () => {
    expect(firstParamName(doc => {})).toBe('doc');

    expect(firstParamName(next => {})).toBe('next');
  });
});

describe('W954 — legacyHookAdapter ONLY wraps true `(next)` callbacks', () => {
  it('does NOT wrap a sync 1-param POST hook `function (doc)` (the prod-hang bug)', () => {
    const postHook = function (doc) {
      return doc;
    };
    // Must be returned untouched — wrapping it is what hung every save().
    expect(legacyHookAdapter(postHook)).toBe(postHook);
  });

  it('does NOT wrap `(docs)` / `(err)` / `(result)` single-param hooks', () => {
    const a = function (docs) {};
    const b = function (err) {};
    const c = function (result) {};
    expect(legacyHookAdapter(a)).toBe(a);
    expect(legacyHookAdapter(b)).toBe(b);
    expect(legacyHookAdapter(c)).toBe(c);
  });

  it('does NOT wrap modern (0-param) or parallel (2-param) hooks', () => {
    const zero = function () {};
    const two = function (doc, next) {};
    expect(legacyHookAdapter(zero)).toBe(zero);
    expect(legacyHookAdapter(two)).toBe(two);
  });

  it('DOES wrap a genuine legacy `function (next)` hook (W946 rescue preserved)', () => {
    const legacy = function (next) {
      next();
    };
    const wrapped = legacyHookAdapter(legacy);
    expect(wrapped).not.toBe(legacy);
    expect(typeof wrapped).toBe('function');
  });

  it('the wrapped legacy hook RESOLVES when next() is called synchronously', async () => {
    let ran = false;
    const wrapped = legacyHookAdapter(function (next) {
      ran = true;
      next();
    });
    await expect(wrapped.call({})).resolves.toBeUndefined();
    expect(ran).toBe(true);
  });

  it('the wrapped legacy hook REJECTS when next(err) is called', async () => {
    const wrapped = legacyHookAdapter(function (next) {
      next(new Error('boom'));
    });
    await expect(wrapped.call({})).rejects.toThrow('boom');
  });

  it('a sync `(doc)` post hook, left unwrapped, runs synchronously and returns (never hangs)', () => {
    const postHook = function (doc) {
      return doc && doc.id;
    };
    const fn = legacyHookAdapter(postHook); // === postHook
    // Calling it returns immediately (no Promise that could hang the save chain).
    expect(fn.call({}, { id: 7 })).toBe(7);
  });

  it('is idempotent — re-adapting a genuine wrapped hook does not double-wrap', () => {
    const wrapped1 = legacyHookAdapter(function (next) {
      next();
    });
    const wrapped2 = legacyHookAdapter(wrapped1);
    expect(wrapped2).toBe(wrapped1);
  });
});
