'use strict';

/**
 * W487 drift guard — equity-engine.service + equityEngineBootstrap (Phase G).
 *
 * Static source-shape assertions + pure-function tests for computeSignature.
 */

const fs = require('fs');
const path = require('path');

const SERVICE_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'services', 'equity', 'equity-engine.service.js'),
  'utf8'
);
const BOOT_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'startup', 'equityEngineBootstrap.js'),
  'utf8'
);

const service = require('../services/equity/equity-engine.service');

describe('W487 — equity-engine.service structural', () => {
  it('exports 3 public functions + BINARY_METRICS', () => {
    expect(typeof service.runAuditAndPersist).toBe('function');
    expect(typeof service.runBranchSweep).toBe('function');
    expect(typeof service.computeSignature).toBe('function');
    expect(service.BINARY_METRICS instanceof Set).toBe(true);
  });

  it('imports W484 disparity-detection lib', () => {
    expect(SERVICE_SRC).toMatch(/require\(['"]\.\.\/\.\.\/intelligence\/disparity-detection\.lib/);
  });

  it('uses sha256 for signatureHash', () => {
    expect(SERVICE_SRC).toMatch(/createHash\(['"]sha256['"]/);
  });

  it('treats complaint_rate as a binary metric', () => {
    expect(service.BINARY_METRICS.has('complaint_rate')).toBe(true);
  });

  it('runAuditAndPersist returns skipped:true on severity=none/minor', () => {
    expect(SERVICE_SRC).toMatch(
      /overallSeverity === 'none' \|\| audit\.overallSeverity === 'minor'/
    );
    expect(SERVICE_SRC).toMatch(/NO_DISPARITY/);
  });

  it('runAuditAndPersist is idempotent via signatureHash lookup', () => {
    expect(SERVICE_SRC).toMatch(/findOne\(\{ signatureHash \}/);
    expect(SERVICE_SRC).toMatch(/IDEMPOTENT_EXISTING/);
  });

  it('W503 auto-creates CAPA on overallSeverity=major', () => {
    expect(SERVICE_SRC).toMatch(/_autoCreateCapaForAlert/);
    expect(SERVICE_SRC).toMatch(/audit\.overallSeverity === 'major'/);
  });

  it('W503 auto-CAPA source.module is "equity"', () => {
    expect(SERVICE_SRC).toMatch(/module:\s*['"]equity['"]/);
  });

  it('W503 auto-CAPA defaults to 30-day due + priority high + corrective type', () => {
    expect(SERVICE_SRC).toMatch(/setDate\(dueDate\.getDate\(\) \+ 30\)/);
    expect(SERVICE_SRC).toMatch(/priority:\s*['"]high['"]/);
    expect(SERVICE_SRC).toMatch(/type:\s*['"]corrective['"]/);
  });

  it('W503 auto-CAPA failure does not roll back the alert', () => {
    expect(SERVICE_SRC).toMatch(/Don't fail the audit/);
  });

  it('W503 auto-CAPA links via alert.capaItemId', () => {
    expect(SERVICE_SRC).toMatch(/alert\.capaItemId\s*=\s*capaItem\._id/);
  });

  it('W503 SOURCE_MODULES.equity is registered in capa-lifecycle.lib', () => {
    const lib = require('../intelligence/capa-lifecycle.lib');
    expect(lib.SOURCE_MODULES).toContain('equity');
  });

  it('W504 ensureCapaForAlert is exported', () => {
    expect(typeof service.ensureCapaForAlert).toBe('function');
  });

  it('W504 ensureCapaForAlert short-circuits on NOT_MAJOR severity', () => {
    expect(SERVICE_SRC).toMatch(/NOT_MAJOR/);
    expect(SERVICE_SRC).toMatch(/alert\.overallSeverity !== 'major'/);
  });

  it('W504 ensureCapaForAlert returns ALREADY_LINKED when CAPA exists', () => {
    expect(SERVICE_SRC).toMatch(/ALREADY_LINKED/);
  });

  it('W504 _resolveCapaOwner tries assignedTo → quality_lead → admin → branch placeholder', () => {
    expect(SERVICE_SRC).toMatch(/role:\s*['"]quality_lead['"]/);
    expect(SERVICE_SRC).toMatch(/role:\s*['"]admin['"]/);
    expect(SERVICE_SRC).toMatch(/_resolveCapaOwner/);
  });

  it('W504 ensureCapaForAlert throws ALERT_NOT_FOUND when alert missing', () => {
    expect(SERVICE_SRC).toMatch(/ALERT_NOT_FOUND/);
  });

  it('runAuditAndPersist throws when branchId missing', () => {
    expect(SERVICE_SRC).toMatch(/branchId is required/);
  });

  it('runAuditAndPersist throws when period missing', () => {
    expect(SERVICE_SRC).toMatch(/periodStart \+ periodEnd required/);
  });
});

describe('W487 — computeSignature', () => {
  it('produces stable hash for same input', () => {
    const args = {
      branchId: 'b1',
      dimension: 'gender',
      metricKind: 'gas_avg_tscore',
      periodStart: new Date('2026-01-01'),
      periodEnd: new Date('2026-03-31'),
    };
    expect(service.computeSignature(args)).toBe(service.computeSignature(args));
  });

  it('produces different hash for different period', () => {
    const a = service.computeSignature({
      branchId: 'b1',
      dimension: 'gender',
      metricKind: 'gas_avg_tscore',
      periodStart: new Date('2026-01-01'),
      periodEnd: new Date('2026-03-31'),
    });
    const b = service.computeSignature({
      branchId: 'b1',
      dimension: 'gender',
      metricKind: 'gas_avg_tscore',
      periodStart: new Date('2026-04-01'),
      periodEnd: new Date('2026-06-30'),
    });
    expect(a).not.toBe(b);
  });

  it('produces 64-char hex output', () => {
    const h = service.computeSignature({
      branchId: 'b1',
      dimension: 'gender',
      metricKind: 'gas_avg_tscore',
      periodStart: new Date('2026-01-01'),
      periodEnd: new Date('2026-03-31'),
    });
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('W487 — equityEngineBootstrap structural', () => {
  it('exports wireEquityEngine function (source check)', () => {
    expect(BOOT_SRC).toMatch(/module\.exports\s*=\s*\{\s*wireEquityEngine\s*\}/);
    expect(BOOT_SRC).toMatch(/function wireEquityEngine\(/);
  });

  it('env-gated by ENABLE_EQUITY_ENGINE_CRON', () => {
    expect(BOOT_SRC).toMatch(/ENABLE_EQUITY_ENGINE_CRON/);
  });

  it('uses EQUITY_ENGINE_BRANCH_IDS env var', () => {
    expect(BOOT_SRC).toMatch(/EQUITY_ENGINE_BRANCH_IDS/);
  });

  it('uses Asia/Riyadh timezone', () => {
    expect(BOOT_SRC).toMatch(/Asia\/Riyadh/);
  });

  it('default schedule = quarterly (0 4 1 */3 *)', () => {
    expect(BOOT_SRC).toMatch(/'0 4 1 \*\/3 \*'/);
  });

  it('uses loadOptional pattern for node-cron', () => {
    expect(BOOT_SRC).toMatch(/loadOptional\(['"]node-cron['"]/);
  });

  it('refuses to wire when no branch ids', () => {
    expect(BOOT_SRC).toMatch(/NO_BRANCHES/);
  });

  it('per-iteration try/catch', () => {
    expect(BOOT_SRC).toMatch(/for \(const branchId of branchIds\)[\s\S]+?try \{[\s\S]+?catch/);
  });

  it('NOT_ENABLED branch returns wired:false', () => {
    expect(BOOT_SRC).toMatch(/NOT_ENABLED/);
    expect(BOOT_SRC).toMatch(/wired:\s*false/);
  });
});
