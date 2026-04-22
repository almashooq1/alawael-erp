/**
 * executiveReportBuilder.js — real builders for the 2 executive
 * composite reports:
 *   - exec.programs.semiannual → buildProgramsReview
 *   - exec.annual.report       → buildAnnualReport
 *
 * Phase 10 Commit 7h.
 *
 * Both are composite: they call other real builders for their subject
 * areas (rehab / quality / finance / hr) and merge the results. The
 * `ctx.builders` hook lets tests inject mocks; the default uses the
 * sibling modules directly.
 *
 * The builders are intentionally thin — they defer almost everything
 * to the specialized builders. Their contribution is picking the right
 * sub-reports and synthesising a single top-line narrative.
 */

'use strict';

const { parsePeriodKey, parseScopeKey } = require('./periodKey');
const kpiBuilder = require('./kpiReportBuilder');
const qualityBuilder = require('./qualityReportBuilder');
const financeBuilder = require('./financeReportBuilder');
const hrBuilder = require('./hrReportBuilder');
const rehabReportBuilders = require('../../rehabReportBuilders');

function baseResult(report, fallbackId, periodKey, scopeKey, range) {
  return {
    reportType: (report && report.id) || fallbackId,
    periodKey,
    scopeKey: scopeKey || null,
    generatedAt: new Date().toISOString(),
    range: range ? { start: range.start.toISOString(), end: range.end.toISOString() } : null,
    branch: null,
    summary: { items: [], headlineMetric: null },
  };
}

function degradeOnBadPeriod(result, periodKey) {
  result.summary.items.push(`Unrecognised periodKey '${periodKey}' — report built empty.`);
  return result;
}

function pickBuilder(ctx, moduleKey, fnName, fallback) {
  const injected = ctx.builders && ctx.builders[moduleKey] && ctx.builders[moduleKey][fnName];
  return typeof injected === 'function' ? injected : fallback;
}

// ─── 1. buildProgramsReview (semi-annual, confidential) ──────────
//
// Focus: rehab programs + clinical outcomes + care-plan review
// compliance. Pulls rehab-domain KPIs from the aggregator, CBAHI
// evidence pack from quality, and review-compliance stats from the
// existing Phase-9 rehab report builder.

async function buildProgramsReview({ report, periodKey, scopeKey, ctx = {} }) {
  const range = parsePeriodKey(periodKey);
  const scope = parseScopeKey(scopeKey);
  const result = baseResult(report, 'exec.programs.semiannual', periodKey, scopeKey, range);
  Object.assign(result, {
    kpis: null,
    cbahi: null,
    reviewCompliance: null,
  });
  if (!range) return degradeOnBadPeriod(result, periodKey);

  // Rehab KPI slice via the aggregator — filter by domain='rehab'.
  try {
    const { aggregate } = require('./kpiAggregator');
    const registry =
      (ctx.models && ctx.models.kpiRegistry) || require('../../../config/kpi.registry');
    result.kpis = await aggregate(registry, {
      valueResolver: ctx.valueResolver,
      ctx: { ...ctx, scope, periodKey },
      filter: { domain: 'rehab' },
    });
  } catch (_) {
    result.kpis = null;
  }

  // CBAHI evidence for the semi-annual window (composed of two
  // quarters — we run the quarterly builder twice OR pass the full
  // semiannual range through; simpler: run the quality builder for the
  // whole semi-annual period and let rollupIncidents do the work).
  try {
    const cbahiBuild = pickBuilder(
      ctx,
      'qualityReportBuilder',
      'buildCbahiEvidence',
      qualityBuilder.buildCbahiEvidence
    );
    result.cbahi = await cbahiBuild({
      report: { id: 'quality.cbahi.evidence.quarterly' },
      periodKey,
      scopeKey,
      ctx,
    });
  } catch (_) {
    result.cbahi = null;
  }

  // Care-plan review compliance via Phase-9 rehab report builder.
  try {
    const reviewBuild = pickBuilder(
      ctx,
      'rehabReportBuilders',
      'buildReviewComplianceReport',
      rehabReportBuilders.buildReviewComplianceReport
    );
    // This builder takes pre-fetched input shapes (not our ctx wrapper);
    // pass through any caller-provided fixture via ctx.reviewInputs.
    if (ctx.reviewInputs) {
      result.reviewCompliance = await reviewBuild(ctx.reviewInputs);
    }
  } catch (_) {
    result.reviewCompliance = null;
  }

  const summaryLines = ['Semi-annual programs review composite:'];
  if (result.kpis) {
    summaryLines.push(
      `Rehab KPIs: green ${result.kpis.counts.green}; red ${result.kpis.counts.red}`
    );
  }
  if (result.cbahi && result.cbahi.totals) {
    summaryLines.push(
      `Incidents (cat/maj): ${result.cbahi.totals.catastrophicOrMajor}; RCA rate: ${result.cbahi.rcaCompletionRate != null ? `${Math.round(result.cbahi.rcaCompletionRate * 1000) / 10}%` : '—'}`
    );
  }
  if (result.reviewCompliance) {
    summaryLines.push(`Care-plan reviews: included`);
  }
  result.summary.items = summaryLines;
  result.summary.headlineMetric =
    result.kpis && result.kpis.counts
      ? { label: 'rehab KPIs red', value: String(result.kpis.counts.red) }
      : null;
  return result;
}

// ─── 2. buildAnnualReport (annual, confidential) ─────────────────
//
// Top-of-the-pyramid composite: executive KPI digest over the full
// year + 4 domain digests (quality / finance / hr / rehab
// programs). Produces a single section-per-domain document the
// board consumes as a 20-page PDF.

async function buildAnnualReport({ report, periodKey, scopeKey, ctx = {} }) {
  const range = parsePeriodKey(periodKey);
  const scope = parseScopeKey(scopeKey);
  const result = baseResult(report, 'exec.annual.report', periodKey, scopeKey, range);
  Object.assign(result, {
    sections: {
      kpis: null,
      quality: null,
      finance: null,
      hr: null,
      programs: null,
    },
  });
  if (!range) return degradeOnBadPeriod(result, periodKey);

  // Section 1: full KPI pack.
  const boardBuild = pickBuilder(
    ctx,
    'kpiReportBuilder',
    'buildBoardPack',
    kpiBuilder.buildBoardPack
  );
  try {
    result.sections.kpis = await boardBuild({
      report: { id: 'exec.kpi.board.quarterly' },
      periodKey,
      scopeKey,
      ctx,
    });
  } catch (_) {
    result.sections.kpis = null;
  }

  // Section 2: quality — incidents monthly run over annual window.
  try {
    const qBuild = pickBuilder(
      ctx,
      'qualityReportBuilder',
      'buildIncidentsPack',
      qualityBuilder.buildIncidentsPack
    );
    result.sections.quality = await qBuild({
      report: { id: 'quality.incidents.monthly' },
      periodKey,
      scopeKey,
      ctx,
    });
  } catch (_) {
    result.sections.quality = null;
  }

  // Section 3: finance revenue review over annual window.
  try {
    const fBuild = pickBuilder(
      ctx,
      'financeReportBuilder',
      'buildRevenueReview',
      financeBuilder.buildRevenueReview
    );
    result.sections.finance = await fBuild({
      report: { id: 'finance.revenue.quarterly' },
      periodKey,
      scopeKey,
      ctx,
    });
  } catch (_) {
    result.sections.finance = null;
  }

  // Section 4: hr — turnover.
  try {
    const hBuild = pickBuilder(ctx, 'hrReportBuilder', 'buildTurnover', hrBuilder.buildTurnover);
    result.sections.hr = await hBuild({
      report: { id: 'hr.turnover.monthly' },
      periodKey,
      scopeKey,
      ctx,
    });
  } catch (_) {
    result.sections.hr = null;
  }

  // Section 5: programs review.
  try {
    result.sections.programs = await buildProgramsReview({
      report: { id: 'exec.programs.semiannual' },
      periodKey,
      scopeKey,
      ctx,
    });
  } catch (_) {
    result.sections.programs = null;
  }

  const lines = ['Annual report composite:'];
  if (result.sections.kpis && result.sections.kpis.counts) {
    const c = result.sections.kpis.counts;
    lines.push(`KPIs: green ${c.green}; amber ${c.amber}; red ${c.red}`);
  }
  if (result.sections.finance && result.sections.finance.totals) {
    lines.push(`Booked revenue: ${result.sections.finance.totals.booked}`);
  }
  if (result.sections.hr && result.sections.hr.totals) {
    lines.push(
      `Departures: ${result.sections.hr.totals.total} (active at year-end: ${result.sections.hr.totals.endOfPeriodActive})`
    );
  }
  if (result.sections.quality && result.sections.quality.totals) {
    lines.push(`Incidents (year): ${result.sections.quality.totals.total}`);
  }
  result.summary.items = lines;
  result.summary.headlineMetric =
    result.sections.kpis && result.sections.kpis.counts
      ? {
          label: 'annual scorecard',
          value: `${result.sections.kpis.counts.green}G / ${result.sections.kpis.counts.amber}A / ${result.sections.kpis.counts.red}R`,
        }
      : null;
  return result;
}

module.exports = {
  buildProgramsReview,
  buildAnnualReport,
  // exposed for tests
  pickBuilder,
};
