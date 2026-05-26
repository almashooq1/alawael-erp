'use strict';

/**
 * W469 drift guard — Financial navigation + benefits navigator.
 *
 * Locks the Saudi-context benefits catalog + per-family financial
 * navigation plan model.
 *
 * Pure-lib + static analysis. No DB.
 */

const fs = require('fs');
const path = require('path');

const lib = require('../intelligence/benefits-navigator.lib');
const MODEL_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'models', 'FinancialNavigationPlan.js'),
  'utf8'
);

describe('W469 — benefits-navigator.lib surface', () => {
  it('exports public API', () => {
    expect(typeof lib.suggestPrograms).toBe('function');
    expect(typeof lib.computeFinancialStress).toBe('function');
    expect(Array.isArray(lib.BENEFIT_PROGRAMS)).toBe(true);
    expect(Array.isArray(lib.AUTHORITIES)).toBe(true);
  });

  it('module is frozen', () => {
    expect(Object.isFrozen(lib)).toBe(true);
  });

  it('catalog includes ≥6 Saudi benefit programs', () => {
    expect(lib.BENEFIT_PROGRAMS.length).toBeGreaterThanOrEqual(6);
  });

  it('every program has bilingual name + authority + descriptionAr', () => {
    for (const p of lib.BENEFIT_PROGRAMS) {
      expect(typeof p.nameAr).toBe('string');
      expect(typeof p.nameEn).toBe('string');
      expect(typeof p.authority).toBe('string');
      expect(typeof p.descriptionAr).toBe('string');
      expect(Array.isArray(p.eligibilityHints)).toBe(true);
    }
  });

  it('authorities include disability_authority + hrsd + nphies + sehhaty', () => {
    expect(lib.AUTHORITIES).toEqual(['disability_authority', 'hrsd', 'nphies', 'sehhaty']);
  });

  it('catalog includes Mowaamah employment + disability_authority programs', () => {
    const codes = lib.BENEFIT_PROGRAMS.map(p => p.code);
    expect(codes).toContain('mowaamah_employment');
    expect(codes.some(c => c.startsWith('da_'))).toBe(true);
  });
});

describe('W469 — suggestPrograms', () => {
  it('returns disability_authority programs for a card-holding Saudi family', () => {
    const r = lib.suggestPrograms({
      hasDisabilityCard: true,
      isSaudiCitizen: true,
    });
    expect(r.programs.length).toBeGreaterThan(0);
    expect(r.programs.some(p => p.authority === 'disability_authority')).toBe(true);
  });

  it('suggests Mowaamah for working-age beneficiary', () => {
    const r = lib.suggestPrograms({
      workingAge: true,
      employmentReady: true,
    });
    expect(r.programs.some(p => p.code === 'mowaamah_employment')).toBe(true);
  });

  it('returns NPHIES check when health insurance present', () => {
    const r = lib.suggestPrograms({ hasHealthInsurance: true });
    expect(r.programs.some(p => p.code === 'nphies_eligibility_check')).toBe(true);
  });

  it('returns empty programs for empty profile', () => {
    const r = lib.suggestPrograms({});
    expect(r.programs).toEqual([]);
  });

  it('sorts by relevanceScore desc', () => {
    const r = lib.suggestPrograms({
      hasDisabilityCard: true,
      isSaudiCitizen: true,
      lowIncomeHousehold: true,
      activeRehabProgram: true,
    });
    for (let i = 1; i < r.programs.length; i++) {
      expect(r.programs[i - 1].relevanceScore).toBeGreaterThanOrEqual(r.programs[i].relevanceScore);
    }
  });

  it('each suggested program carries the authority + name + descriptionAr', () => {
    const r = lib.suggestPrograms({ hasDisabilityCard: true, isSaudiCitizen: true });
    for (const p of r.programs) {
      expect(p.code).toBeDefined();
      expect(p.nameAr).toBeDefined();
      expect(p.authority).toBeDefined();
      expect(p.descriptionAr).toBeDefined();
    }
  });
});

describe('W469 — computeFinancialStress', () => {
  it('returns 1 (lowest stress) for balanced budget', () => {
    const r = lib.computeFinancialStress({
      monthlyIncome: 10000,
      monthlyExpenses: 6000,
      monthlyDisabilityCosts: 500,
      savingsMonths: 6,
    });
    expect(r).toBe(1);
  });

  it('returns 5 (highest stress) for over-budget low-savings', () => {
    const r = lib.computeFinancialStress({
      monthlyIncome: 5000,
      monthlyExpenses: 6500,
      monthlyDisabilityCosts: 2000,
      savingsMonths: 0,
    });
    expect(r).toBe(5);
  });

  it('mid-stress for tight budget with savings', () => {
    const r = lib.computeFinancialStress({
      monthlyIncome: 10000,
      monthlyExpenses: 8800,
      monthlyDisabilityCosts: 1200,
      savingsMonths: 2,
    });
    expect(r).toBeGreaterThanOrEqual(2);
    expect(r).toBeLessThanOrEqual(4);
  });

  it('returns null on insufficient data', () => {
    expect(lib.computeFinancialStress({})).toBeNull();
    expect(lib.computeFinancialStress({ monthlyIncome: 10000 })).toBeNull();
  });

  it('handles zero income safely (avoids divide-by-zero)', () => {
    const r = lib.computeFinancialStress({
      monthlyIncome: 0,
      monthlyExpenses: 5000,
    });
    // Result should be a defined number in 1..5 range (no crash)
    expect(typeof r).toBe('number');
    expect(r).toBeGreaterThanOrEqual(1);
    expect(r).toBeLessThanOrEqual(5);
  });
});

describe('W469 — FinancialNavigationPlan model', () => {
  it('registers as model "FinancialNavigationPlan"', () => {
    expect(MODEL_SRC).toMatch(
      /mongoose\.models\.FinancialNavigationPlan\s*\|\|\s*mongoose\.model\(\s*['"]FinancialNavigationPlan['"]/
    );
  });

  it('uses canonical collection financial_navigation_plans', () => {
    expect(MODEL_SRC).toMatch(/collection:\s*['"]financial_navigation_plans['"]/);
  });

  it('beneficiaryId is required + unique (1 plan per beneficiary)', () => {
    expect(MODEL_SRC).toMatch(/beneficiaryId\s*:[\s\S]+?required:\s*true[\s\S]+?unique:\s*true/);
  });

  it('declares 6 incomeBand enum values + undisclosed', () => {
    expect(MODEL_SRC).toMatch(/'under_5k'/);
    expect(MODEL_SRC).toMatch(/'5_to_10k'/);
    expect(MODEL_SRC).toMatch(/'10_to_20k'/);
    expect(MODEL_SRC).toMatch(/'20_to_40k'/);
    expect(MODEL_SRC).toMatch(/'over_40k'/);
    expect(MODEL_SRC).toMatch(/'undisclosed'/);
  });

  it('declares SuggestedProgramSchema with 6 applicationStatus values', () => {
    expect(MODEL_SRC).toMatch(/SuggestedProgramSchema/);
    expect(MODEL_SRC).toMatch(/'not_started'/);
    expect(MODEL_SRC).toMatch(/'in_progress'/);
    expect(MODEL_SRC).toMatch(/'submitted'/);
    expect(MODEL_SRC).toMatch(/'approved'/);
    expect(MODEL_SRC).toMatch(/'rejected'/);
    expect(MODEL_SRC).toMatch(/'inactive'/);
  });

  it('authority enum includes the 4 canonical authorities + other', () => {
    expect(MODEL_SRC).toMatch(/'disability_authority'/);
    expect(MODEL_SRC).toMatch(/'hrsd'/);
    expect(MODEL_SRC).toMatch(/'nphies'/);
    expect(MODEL_SRC).toMatch(/'sehhaty'/);
  });

  it('declares financialStressLikert 1-5 + financialWellbeing 0-100', () => {
    expect(MODEL_SRC).toMatch(/financialStressLikert\s*:\s*\{[^}]*min:\s*1[^}]*max:\s*5/);
    expect(MODEL_SRC).toMatch(/financialWellbeing\s*:\s*\{[^}]*min:\s*0[^}]*max:\s*100/);
  });

  it('declares profile subdoc with 9 boolean hints', () => {
    expect(MODEL_SRC).toMatch(/hasDisabilityCard/);
    expect(MODEL_SRC).toMatch(/isSaudiCitizen/);
    expect(MODEL_SRC).toMatch(/lowIncomeHousehold/);
    expect(MODEL_SRC).toMatch(/employedCaregiver/);
    expect(MODEL_SRC).toMatch(/hasHealthInsurance/);
    expect(MODEL_SRC).toMatch(/activeRehabProgram/);
    expect(MODEL_SRC).toMatch(/workingAge/);
    expect(MODEL_SRC).toMatch(/hasChronicCondition/);
    expect(MODEL_SRC).toMatch(/hasSehhatyAccount/);
  });

  it('pre-save uses navigator + family-wbci libs', () => {
    expect(MODEL_SRC).toMatch(/require\(['"]\.\.\/intelligence\/benefits-navigator\.lib['"]\)/);
    expect(MODEL_SRC).toMatch(/require\(['"]\.\.\/intelligence\/family-wbci\.lib['"]\)/);
    expect(MODEL_SRC).toMatch(/computeFinancialStress/);
    expect(MODEL_SRC).toMatch(/inverseFinancialStress/);
    expect(MODEL_SRC).toMatch(/suggestPrograms/);
  });

  it('pre-save preserves existing applicationStatus on already-listed programs', () => {
    expect(MODEL_SRC).toMatch(/existingByCode\.get\(p\.code\)/);
  });

  it('declares 5 status enum values', () => {
    expect(MODEL_SRC).toMatch(/'draft'/);
    expect(MODEL_SRC).toMatch(/'active'/);
    expect(MODEL_SRC).toMatch(/'on_hold'/);
    expect(MODEL_SRC).toMatch(/'completed'/);
    expect(MODEL_SRC).toMatch(/'archived'/);
  });
});
