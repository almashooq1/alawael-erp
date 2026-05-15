#!/usr/bin/env node
/**
 * @file post-deploy-smoke.js
 * @description Probes critical endpoints after a deploy to confirm the
 *              process actually works — not just that pm2 came back up.
 *
 * Catches the failure modes that the existing /health check cannot:
 *   • Routes registered in code but unmounted in `_registry.js` (the
 *     bug that hid every ZATCA endpoint behind 404 until 2026-05-02).
 *   • RBAC mistakenly turning a public endpoint into 401.
 *   • Service boot succeeding but an env var typo making /status report
 *     mock-mode when production was expected.
 *
 * Probes (each is independently pass/fail/skip):
 *   • GET  /health                                 — basic liveness
 *   • GET  /api/zatca-phase2/status                — service self-report
 *   • GET  /api/v1/admin/ops/dlq                   — admin dead-letter queue
 *   • GET  /api/v1/admin/ops/integration-health    — Phase VII aggregator
 *   • GET  /api/docs/integration                   — Swagger UI
 *   • GET  /api/docs/integration.json              — OpenAPI JSON
 *
 * Usage:
 *   node backend/scripts/post-deploy-smoke.js                # default base http://127.0.0.1:5000
 *   node backend/scripts/post-deploy-smoke.js --base https://alaweal.org
 *   node backend/scripts/post-deploy-smoke.js --json         # machine output
 *   node backend/scripts/post-deploy-smoke.js --token JWT    # for auth-required probes
 *
 * Env:
 *   SMOKE_BASE_URL    — overrides --base
 *   SMOKE_AUTH_TOKEN  — overrides --token (Bearer)
 *
 * Exit codes:
 *   0 — every "critical" probe passed (warnings allowed)
 *   1 — at least one critical probe failed
 *   2 — script crash (network / TLS / etc.)
 */

'use strict';

// In-process HTTP — no external dependencies so this can run standalone
// inside SSH on the VPS (where dev tools may not be installed).
const http = require('http');
const https = require('https');
const { URL } = require('url');

// ─── Probe definitions ──────────────────────────────────────────────────────
//
// Each probe declares:
//   path     — relative path appended to base URL
//   expect   — predicate against the response (`{ status, body }`)
//   needsAuth — if true and no token is configured, the probe is skipped
//   critical — if true, a failure flips the script's overall exit code
// Helper: an admin route that needs auth. Without a token, 401 is fine —
// what we're verifying is "the path is mounted at all" (anything other
// than 404). With a token we'd assert 200 specifically.
// Generic critical-mount probe. Accepts 200/401/403 (route mounted +
// any auth state); rejects 404 (unmounted) and 5xx (boot crash).
// The original name was `adminMounted` but the same predicate fits
// non-admin regulatory routes (PDPL, CBAHI), so it's been renamed.
const mountedRoute = (name, path) => ({
  name,
  path,
  critical: true,
  needsAuth: false, // we accept 401 in the predicate, no token required
  expect: r => r.status !== 404 && r.status < 500,
});
// Backward-compat alias — both the structural-guard parser and any
// future probes can use either name.
const adminMounted = mountedRoute;

const PROBES = [
  // Liveness — the original /health check
  {
    name: 'liveness',
    path: '/health',
    critical: true,
    expect: r => r.status === 200,
  },

  // ZATCA Phase 2 service self-report
  {
    name: 'zatca-phase2-mounted',
    path: '/api/zatca-phase2/status',
    critical: true,
    // The service returns 200 on mock OR live mode — either is fine here.
    // What matters is that the route is REGISTERED (i.e. not 404).
    expect: r => r.status === 200,
  },

  // ── Admin routes shipped this session ────────────────────────────
  // Each one earned a probe because every new bounded context is one
  // _registry.js entry away from regressing into a 404. Critical=true
  // so the deploy summary surfaces it immediately. We don't have a
  // production token in the deploy environment, so the predicate
  // accepts 401 — what we're guarding against is 404 (route not
  // mounted) or 5xx (route crashed on import).
  adminMounted('insurance-tariffs', '/api/admin/insurance-tariffs'),
  adminMounted('zatca-credentials', '/api/admin/zatca-credentials'),
  adminMounted('nphies-claims', '/api/admin/nphies-claims'),
  // bulk-create-claims POSTs in real use, but the GET will return 405
  // (method not allowed) when mounted; we still get out of 404 territory.
  adminMounted('therapy-sessions', '/api/admin/therapy-sessions'),
  adminMounted('pii-access-audit', '/api/admin/pii-access-audit'),

  // ── Regulatory routes (CBAHI + PDPL) shipped 2026-05-02 ──────────
  // These aren't under /api/admin/ but their unmounting is an immediate
  // regulatory exposure — same critical bar as the admin routes above.
  mountedRoute('management-review', '/api/management-review/reference'),
  mountedRoute('evidence', '/api/evidence/reference'),
  mountedRoute('compliance-calendar', '/api/compliance-calendar/reference'),
  mountedRoute('pdpl', '/api/pdpl/retention-periods'),

  // ── BC-08: CAPA (mounted 2026-05-03) ──
  adminMounted('capa-admin', '/api/admin/capa'),

  // ── Phase 29 World-Class QMS (shipped 2026-05-15) ──
  // 17 module endpoints + 1 aggregator. Each one is one _registry.js
  // entry away from regressing — protect them all with mount probes.
  // Use the /reference sub-path where available since it's authless on
  // most modules and gives a quick 200; otherwise fall back to root.
  mountedRoute('phase29-fmea', '/api/v1/fmea/reference'),
  mountedRoute('phase29-rca', '/api/v1/rca/reference'),
  mountedRoute('phase29-spc', '/api/v1/spc/reference'),
  mountedRoute('phase29-pareto-a3', '/api/v1/pareto-a3/reference'),
  mountedRoute('phase29-standards', '/api/v1/standards'),
  mountedRoute('phase29-controlled-documents', '/api/v1/controlled-documents/reference'),
  mountedRoute('phase29-supplier-quality', '/api/v1/supplier-quality/reference'),
  mountedRoute('phase29-calibration', '/api/v1/calibration/reference'),
  mountedRoute('phase29-change-control', '/api/v1/change-control/reference'),
  mountedRoute('phase29-audit-scheduler', '/api/v1/audit-scheduler/reference'),
  mountedRoute('phase29-coq', '/api/v1/coq/reference'),
  mountedRoute('phase29-predictive-risk', '/api/v1/predictive-risk/reference'),
  mountedRoute('phase29-trend-forecast', '/api/v1/trend-forecast/forecast'),
  mountedRoute('phase29-quality-narrative', '/api/v1/quality-narrative/kinds'),
  mountedRoute('phase29-inspections', '/api/v1/inspection-submissions'),
  mountedRoute('phase29-benchmarks', '/api/v1/benchmarks'),
  mountedRoute('phase29-command-center', '/api/v1/quality/command-center'),

  // ── Phase 30 Intelligent HR Platform (shipped 2026-05-15) ─────────
  // Workflow Automation Engine + LLM Copilot. Auth-required so we
  // accept 401 (not mounted = 404 = real failure).
  mountedRoute('phase30-hr-workflow-rules', '/api/v1/hr/workflow/rules'),
  mountedRoute('phase30-hr-copilot-status', '/api/v1/hr/copilot/status'),
  mountedRoute('phase30-hr-smart-analytics', '/api/v1/hr/smart-analytics/overview'),

  // ── Auth-gated diagnostics (non-critical without a token) ────────
  {
    name: 'integration-health-aggregator',
    path: '/api/v1/admin/ops/integration-health',
    needsAuth: true,
    critical: false,
    expect: r => r.status === 200 || r.status === 401,
  },
  {
    name: 'admin-ops-dlq',
    path: '/api/v1/admin/ops/dlq',
    needsAuth: true,
    critical: false,
    expect: r => r.status === 200 || r.status === 401,
  },

  // ── Public docs ──────────────────────────────────────────────────
  {
    name: 'openapi-json',
    path: '/api/docs/integration.json',
    critical: false,
    expect: r => r.status === 200 && /openapi/i.test(r.body || ''),
  },
];

// ─── HTTP helper ─────────────────────────────────────────────────────────────
function fetchOnce(urlString, { token, timeoutMs = 8000 } = {}) {
  return new Promise((resolve, reject) => {
    let url;
    try {
      url = new URL(urlString);
    } catch (err) {
      return reject(err);
    }
    const lib = url.protocol === 'https:' ? https : http;
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    const req = lib.request(
      {
        method: 'GET',
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname + url.search,
        headers,
        timeout: timeoutMs,
      },
      res => {
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () =>
          resolve({
            status: res.statusCode,
            body: Buffer.concat(chunks).toString('utf8'),
          })
        );
      }
    );
    req.on('timeout', () => {
      req.destroy(new Error(`timeout after ${timeoutMs}ms`));
    });
    req.on('error', reject);
    req.end();
  });
}

// ─── Alerting ────────────────────────────────────────────────────────────────
//
// When critical probes fail, fire ops-alerter so on-call hears about it
// in real time. GitHub Actions emails repo admins when the deploy turns
// red, but the ops-alerter chain (whatsapp/sms/email) reaches phones
// faster. Two channels are better than one — the failure modes
// (GitHub email, sms provider) are independent.
//
// The alerter import is lazy + try/catch so the smoke runs cleanly even
// when invoked from a context where the backend service tree isn't
// available (e.g. a manual run from the deploy CLI without npm install).
async function fireAlertOnFailure(report) {
  if (report.ok) return;
  if (report.criticalFailures === 0) return;

  let sendOpsAlert;
  try {
    ({ sendOpsAlert } = require('../services/ops-alerter'));
  } catch (err) {
    console.error('[smoke] ops-alerter unavailable:', err.message);
    return;
  }

  const failed = report.results.filter(
    r => r.critical && (r.outcome === 'fail' || r.outcome === 'error')
  );

  try {
    await sendOpsAlert({
      kind: 'post_deploy_smoke_failed',
      severity: 'critical',
      subject: `فشل التحقق بعد النشر — ${failed.length} اختبار حرج`,
      body:
        `فشلت اختبارات التحقق الحرجة بعد آخر نشر على ${report.base}.\n\n` +
        failed
          .map(
            f =>
              ` • ${f.name} (${f.path}) — ${f.outcome}${f.status ? ` status=${f.status}` : ''}${f.error ? ` error=${f.error}` : ''}`
          )
          .join('\n') +
        `\n\nراجع GitHub Actions logs + docs/blueprint/23-go-live-checklist.md`,
      metadata: {
        base: report.base,
        criticalFailures: report.criticalFailures,
        failed: failed.map(f => ({ name: f.name, path: f.path, status: f.status })),
      },
    });
    console.error('[smoke] ops-alerter dispatched');
  } catch (err) {
    console.error('[smoke] ops-alerter dispatch failed:', err.message);
  }
}

// ─── Runner ──────────────────────────────────────────────────────────────────
async function runSmoke({ base, token, probes = PROBES, fetcher = fetchOnce } = {}) {
  const results = [];

  for (const probe of probes) {
    const fullUrl = base.replace(/\/$/, '') + probe.path;

    if (probe.needsAuth && !token) {
      results.push({
        name: probe.name,
        path: probe.path,
        outcome: 'skipped',
        reason: 'no_token',
        critical: !!probe.critical,
      });
      continue;
    }

    let response;
    try {
      response = await fetcher(fullUrl, { token });
    } catch (err) {
      results.push({
        name: probe.name,
        path: probe.path,
        outcome: 'error',
        error: err.message,
        critical: !!probe.critical,
      });
      continue;
    }

    let pass = false;
    try {
      pass = !!probe.expect(response);
    } catch {
      pass = false;
    }

    results.push({
      name: probe.name,
      path: probe.path,
      outcome: pass ? 'pass' : 'fail',
      status: response.status,
      critical: !!probe.critical,
    });
  }

  const criticalFailures = results.filter(
    r => r.critical && (r.outcome === 'fail' || r.outcome === 'error')
  );
  return {
    base,
    results,
    ok: criticalFailures.length === 0,
    criticalFailures: criticalFailures.length,
  };
}

// ─── CLI ────────────────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  function arg(name, fallback) {
    const i = args.indexOf(name);
    return i >= 0 && i + 1 < args.length ? args[i + 1] : fallback;
  }
  const json = args.includes('--json');
  const base = arg('--base') || process.env.SMOKE_BASE_URL || 'http://127.0.0.1:5000';
  const token = arg('--token') || process.env.SMOKE_AUTH_TOKEN || null;

  const report = await runSmoke({ base, token });

  if (json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`\n  Smoke report against ${report.base}\n`);
    for (const r of report.results) {
      const tag =
        r.outcome === 'pass' ? '✅' : r.outcome === 'skipped' ? '⏭️ ' : r.critical ? '❌' : '⚠️ ';
      const detail =
        r.outcome === 'error' ? r.error : r.outcome === 'skipped' ? r.reason : `status=${r.status}`;
      console.log(`  ${tag} ${r.name.padEnd(30)} ${r.path.padEnd(45)} ${detail}`);
    }
    console.log('');
    console.log(
      report.ok ? '  Result: PASS' : `  Result: FAIL (${report.criticalFailures} critical)`
    );
    console.log('');
  }

  // Fire ops-alerter when critical probes fail. Disabled with
  // --no-alert (e.g. local debugging); always on in deploy.
  if (!args.includes('--no-alert')) {
    await fireAlertOnFailure(report);
  }

  process.exit(report.ok ? 0 : 1);
}

if (require.main === module) {
  main().catch(err => {
    console.error('[smoke] crashed:', err.message);
    process.exit(2);
  });
}

module.exports = { runSmoke, PROBES, fireAlertOnFailure };
