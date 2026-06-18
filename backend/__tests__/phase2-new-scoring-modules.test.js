'use strict';

const scoring = require('../measures/scoring');

const NEW_CODES = ['VB-MAPP', 'ABLLS-R', 'BAYLEY-4', 'WHODAS-36', 'ABAS-3', 'GAS', 'COPM'];

describe('Phase 2 — new clinical scoring modules', () => {
  beforeAll(() => scoring.reload());

  it.each(NEW_CODES)('%s is registered in the scoring registry', code => {
    expect(scoring.has(code)).toBe(true);
    expect(scoring.resolve(code)).not.toBeNull();
  });

  it.each(NEW_CODES)('%s exposes a valid itemBank', code => {
    const mod = scoring.resolve(code);
    expect(mod.itemBank).toBeDefined();
    expect(mod.itemBank.items.length).toBeGreaterThan(0);
  });

  it('VB-MAPP sums domain milestone counts', () => {
    const mod = scoring.resolve('VB-MAPP');
    const raw = Object.fromEntries(mod.itemBank.domains.map(d => [d.key, 2]));
    const derived = mod.computeDerived(raw);
    expect(derived.value).toBe(mod.itemBank.domains.length * 2);
    expect(derived.subscales.mand.value).toBe(2);
  });

  it('ABLLS-R sums domain skill levels', () => {
    const mod = scoring.resolve('ABLLS-R');
    const raw = Object.fromEntries(mod.itemBank.domains.slice(0, 5).map(d => [d.key, 4]));
    const derived = mod.computeDerived(raw);
    expect(derived.value).toBe(20);
  });

  it('Bayley-4 sums domain raw scores', () => {
    const mod = scoring.resolve('BAYLEY-4');
    const raw = { cognitive: 10, language: 12, motor: 8, social_emotional: 6, adaptive: 7 };
    expect(mod.computeDerived(raw).value).toBe(43);
  });

  it('WHODAS-36 sums 36 item responses', () => {
    const mod = scoring.resolve('WHODAS-36');
    const raw = Array(36).fill(1);
    const derived = mod.computeDerived(raw);
    expect(derived.value).toBe(36);
    expect(derived.subscales.cognition.value).toBe(6);
  });

  it('ABAS-3 sums adaptive skill domain scores', () => {
    const mod = scoring.resolve('ABAS-3');
    const raw = Object.fromEntries(mod.itemBank.domains.map(d => [d.key, 3]));
    expect(mod.computeDerived(raw).value).toBe(mod.itemBank.domains.length * 3);
  });

  it('GAS computes mean attainment across goals', () => {
    const mod = scoring.resolve('GAS');
    const derived = mod.computeDerived({ g1: -1, g2: 0, g3: 1 });
    expect(derived.value).toBe(0);
  });

  it('COPM computes performance + satisfaction mean', () => {
    const mod = scoring.resolve('COPM');
    const derived = mod.computeDerived({
      problems: [
        { performance: 4, satisfaction: 5 },
        { performance: 6, satisfaction: 7 },
      ],
    });
    expect(derived.value).toBe(11);
  });
});
