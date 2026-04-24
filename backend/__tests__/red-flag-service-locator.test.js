/**
 * red-flag-service-locator.test.js — Beneficiary-360 Commit 3a.
 *
 * The locator is the single boundary where `trigger.source.service`
 * strings become real callables. These tests pin its contract:
 * predictable errors on misconfig, fresh instances are independent,
 * and there is no hidden global state.
 */

'use strict';

const { createLocator } = require('../services/redFlagServiceLocator');

describe('createLocator — registration', () => {
  it('returns a fresh, frozen locator per call', () => {
    const a = createLocator();
    const b = createLocator();
    expect(a).not.toBe(b);
    expect(Object.isFrozen(a)).toBe(true);
    expect(Object.isFrozen(b)).toBe(true);
  });

  it('keeps registered services per-instance (no global leak)', () => {
    const a = createLocator();
    const b = createLocator();
    a.register('svc', { ping: () => 'a' });
    expect(a.has('svc')).toBe(true);
    expect(b.has('svc')).toBe(false);
  });

  it('register() rejects a non-string name', () => {
    const l = createLocator();
    expect(() => l.register('', {})).toThrow(/non-empty string/);
    expect(() => l.register(null, {})).toThrow(/non-empty string/);
    expect(() => l.register(42, {})).toThrow(/non-empty string/);
  });

  it('register() rejects a non-object instance', () => {
    const l = createLocator();
    expect(() => l.register('svc', null)).toThrow(/object instance/);
    expect(() => l.register('svc', 'str')).toThrow(/object instance/);
    expect(() => l.register('svc', 42)).toThrow(/object instance/);
  });

  it('list() returns registered names sorted', () => {
    const l = createLocator();
    l.register('bravo', {});
    l.register('alpha', {});
    l.register('charlie', {});
    expect(l.list()).toEqual(['alpha', 'bravo', 'charlie']);
  });

  it('clear() empties the locator', () => {
    const l = createLocator();
    l.register('svc', { ping: () => 1 });
    l.clear();
    expect(l.has('svc')).toBe(false);
    expect(l.list()).toEqual([]);
  });
});

describe('createLocator — resolution', () => {
  it('resolves a registered method as a bound function', () => {
    const l = createLocator();
    const instance = {
      state: 42,
      getState() {
        return this.state;
      },
    };
    l.register('svc', instance);
    const fn = l.resolve('svc', 'getState');
    expect(typeof fn).toBe('function');
    expect(fn()).toBe(42);
  });

  it('throws descriptively when service is unknown', () => {
    const l = createLocator();
    expect(() => l.resolve('nope', 'any')).toThrow(/service 'nope' is not registered/);
  });

  it('includes the flag id in the error when provided', () => {
    const l = createLocator();
    expect(() => l.resolve('nope', 'any', { forFlagId: 'clinical.test.flag' })).toThrow(
      /flag 'clinical.test.flag'/
    );
  });

  it('throws when the method is missing on the service', () => {
    const l = createLocator();
    l.register('svc', { otherMethod: () => 1 });
    expect(() => l.resolve('svc', 'missingMethod')).toThrow(/is not a function/);
  });

  it('throws when the "method" is a non-function property', () => {
    const l = createLocator();
    l.register('svc', { config: { flag: true } });
    expect(() => l.resolve('svc', 'config')).toThrow(/is not a function/);
  });

  it('returns different bindings for different instances even with shared names', () => {
    const a = createLocator();
    const b = createLocator();
    a.register('svc', { ping: () => 'from-a' });
    b.register('svc', { ping: () => 'from-b' });
    expect(a.resolve('svc', 'ping')()).toBe('from-a');
    expect(b.resolve('svc', 'ping')()).toBe('from-b');
  });
});
