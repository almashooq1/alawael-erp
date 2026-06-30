'use strict';

/**
 * W1559 — beneficiary risk-flag methods + fields (closes 500-ing routes).
 *
 * The DDD service (domains/core) + routes call `beneficiary.addRiskFlag()` /
 * `resolveRiskFlag()` and `repository.findHighRisk` queries `overallRiskLevel` —
 * all MISSING on the canonical model after the W1457 migration, so
 * POST /:id/risk-flags + /resolve threw TypeError 500 and /high-risk + /at-risk
 * silently returned []. This adds the riskFlags[] + overallRiskLevel fields and the
 * addRiskFlag / resolveRiskFlag / recomputeRiskLevel instance methods.
 */

const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'models', 'Beneficiary.js'), 'utf8');

describe('W1559 beneficiary risk-flag fields + methods', () => {
  test('schema declares riskFlags[] + overallRiskLevel', () => {
    expect(SRC).toMatch(/riskFlags:\s*\{\s*type:\s*\[riskFlagSchema\]/);
    expect(SRC).toMatch(/overallRiskLevel:\s*\{/);
  });

  test('declares the instance methods the DDD service + routes call', () => {
    expect(SRC).toMatch(/methods\.addRiskFlag/);
    expect(SRC).toMatch(/methods\.resolveRiskFlag/);
    expect(SRC).toMatch(/methods\.recomputeRiskLevel/);
  });

  test('overallRiskLevel is indexed (repository.findHighRisk queries it)', () => {
    const i = SRC.indexOf('overallRiskLevel:');
    expect(i).toBeGreaterThan(-1);
    expect(SRC.slice(i, i + 160)).toMatch(/index:\s*true/);
  });
});
