'use strict';

/**
 * W485 + W486 drift guard — EquityDisparityAlert + OutcomeBenchmark (Phase G).
 *
 * Static source-shape assertions only. No mongoose runtime.
 */

const fs = require('fs');
const path = require('path');

const ALERT_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'models', 'EquityDisparityAlert.js'),
  'utf8'
);
const BENCH_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'models', 'OutcomeBenchmark.js'),
  'utf8'
);

describe('W485 — EquityDisparityAlert model', () => {
  it('registers as model "EquityDisparityAlert"', () => {
    expect(ALERT_SRC).toMatch(
      /mongoose\.models\.EquityDisparityAlert\s*\|\|\s*mongoose\.model\(\s*['"]EquityDisparityAlert['"]/
    );
  });

  it('uses collection equity_disparity_alerts', () => {
    expect(ALERT_SRC).toMatch(/collection:\s*['"]equity_disparity_alerts['"]/);
  });

  it('declares branchId required + ref Branch', () => {
    expect(ALERT_SRC).toMatch(/branchId\s*:[\s\S]+?ref:\s*['"]Branch['"][\s\S]+?required:\s*true/);
  });

  it('declares 7 dimension enum values', () => {
    expect(ALERT_SRC).toMatch(/'gender'/);
    expect(ALERT_SRC).toMatch(/'age_band'/);
    expect(ALERT_SRC).toMatch(/'disability_type'/);
    expect(ALERT_SRC).toMatch(/'region'/);
    expect(ALERT_SRC).toMatch(/'primary_language'/);
    expect(ALERT_SRC).toMatch(/'insurance_band'/);
    expect(ALERT_SRC).toMatch(/'nationality_band'/);
  });

  it('declares 7 metricKind enum values', () => {
    expect(ALERT_SRC).toMatch(/'gas_avg_tscore'/);
    expect(ALERT_SRC).toMatch(/'icf_avg_qualifier'/);
    expect(ALERT_SRC).toMatch(/'session_attendance_rate'/);
    expect(ALERT_SRC).toMatch(/'goal_achievement_rate'/);
    expect(ALERT_SRC).toMatch(/'wait_time_days'/);
    expect(ALERT_SRC).toMatch(/'complaint_rate'/);
    expect(ALERT_SRC).toMatch(/'wbci_avg'/);
  });

  it('declares 4 periodKind values', () => {
    expect(ALERT_SRC).toMatch(/'monthly'/);
    expect(ALERT_SRC).toMatch(/'quarterly'/);
    expect(ALERT_SRC).toMatch(/'annual'/);
    expect(ALERT_SRC).toMatch(/'ad-hoc'/);
  });

  it('declares 7 status values', () => {
    expect(ALERT_SRC).toMatch(/'open'/);
    expect(ALERT_SRC).toMatch(/'acknowledged'/);
    expect(ALERT_SRC).toMatch(/'investigating'/);
    expect(ALERT_SRC).toMatch(/'remediation_in_progress'/);
    expect(ALERT_SRC).toMatch(/'resolved'/);
    expect(ALERT_SRC).toMatch(/'monitoring'/);
    expect(ALERT_SRC).toMatch(/'dismissed'/);
  });

  it('signatureHash is unique + indexed for idempotency', () => {
    expect(ALERT_SRC).toMatch(
      /signatureHash\s*:[\s\S]+?required:\s*true[\s\S]+?unique:\s*true[\s\S]+?index:\s*true/
    );
  });

  it('overallSeverity bounded to 4 levels', () => {
    expect(ALERT_SRC).toMatch(
      /overallSeverity[\s\S]+?'none'[\s\S]+?'minor'[\s\S]+?'moderate'[\s\S]+?'major'/
    );
  });

  it('findings subdoc has vsReference.severity with insufficient_n + flagged', () => {
    expect(ALERT_SRC).toMatch(/'insufficient_n'/);
    expect(ALERT_SRC).toMatch(/flagged\s*:\s*\{[^}]*type:\s*Boolean/);
  });

  it('links to CapaItem for remediation tracking', () => {
    expect(ALERT_SRC).toMatch(/capaItemId\s*:[\s\S]+?ref:\s*['"]CapaItem['"]/);
  });

  it('pre-save invariant: periodStart < periodEnd', () => {
    expect(ALERT_SRC).toMatch(/periodStart must be before periodEnd/);
  });

  it('pre-save invariant: dismissed requires dismissalReason >=5', () => {
    expect(ALERT_SRC).toMatch(/dismissed status requires dismissalReason/);
  });

  it('pre-save invariant: severity=none not persisted', () => {
    expect(ALERT_SRC).toMatch(/overallSeverity=none should not be persisted/);
  });

  it('declares 3 generatedBy sources', () => {
    expect(ALERT_SRC).toMatch(/'equity_engine_cron'/);
    expect(ALERT_SRC).toMatch(/'manual_audit'/);
    expect(ALERT_SRC).toMatch(/'ad_hoc_query'/);
  });
});

describe('W486 — OutcomeBenchmark model', () => {
  it('registers as model "OutcomeBenchmark"', () => {
    expect(BENCH_SRC).toMatch(
      /mongoose\.models\.OutcomeBenchmark\s*\|\|\s*mongoose\.model\(\s*['"]OutcomeBenchmark['"]/
    );
  });

  it('uses collection outcome_benchmarks', () => {
    expect(BENCH_SRC).toMatch(/collection:\s*['"]outcome_benchmarks['"]/);
  });

  it('declares 5 scope values', () => {
    expect(BENCH_SRC).toMatch(/'national'/);
    expect(BENCH_SRC).toMatch(/'regional'/);
    expect(BENCH_SRC).toMatch(/'branch'/);
    expect(BENCH_SRC).toMatch(/'carf'/);
    expect(BENCH_SRC).toMatch(/'da_publication'/);
  });

  it('declares dimensionFilters subdoc with gender + age_band + disability_type', () => {
    expect(BENCH_SRC).toMatch(
      /dimensionFilters\s*:\s*\{[\s\S]+?gender[\s\S]+?age_band[\s\S]+?disability_type/
    );
  });

  it('declares age_band enum 0-3/3-6/6-12/12-18/18+', () => {
    expect(BENCH_SRC).toMatch(/'0-3'/);
    expect(BENCH_SRC).toMatch(/'3-6'/);
    expect(BENCH_SRC).toMatch(/'6-12'/);
    expect(BENCH_SRC).toMatch(/'12-18'/);
    expect(BENCH_SRC).toMatch(/'18\+'/);
  });

  it('declares 2 targetDirection values', () => {
    expect(BENCH_SRC).toMatch(/'higher_better'/);
    expect(BENCH_SRC).toMatch(/'lower_better'/);
  });

  it('centralTendencyKind enum mean/median', () => {
    expect(BENCH_SRC).toMatch(/centralTendencyKind\s*:\s*\{[\s\S]+?'mean'[\s\S]+?'median'/);
  });

  it('declares 3 status lifecycle values', () => {
    expect(BENCH_SRC).toMatch(/'draft'/);
    expect(BENCH_SRC).toMatch(/'published'/);
    expect(BENCH_SRC).toMatch(/'retired'/);
  });

  it('pre-save invariant: scope=branch requires branchId', () => {
    expect(BENCH_SRC).toMatch(/scope=branch requires branchId/);
  });

  it('pre-save invariant: scope=regional requires region', () => {
    expect(BENCH_SRC).toMatch(/scope=regional requires region/);
  });

  it('pre-save invariant: percentile25 <= percentile75', () => {
    expect(BENCH_SRC).toMatch(/percentile25 must be <= percentile75/);
  });

  it('pre-save invariant: periodStart < periodEnd', () => {
    expect(BENCH_SRC).toMatch(/periodStart must be before periodEnd/);
  });
});
