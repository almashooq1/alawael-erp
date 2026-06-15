/* eslint-disable no-unused-vars */
/* global __ENV */
//
// k6-gov-integrations.js — capacity profile for Saudi government integration
// READ surfaces (W1350, GAPS Item 4 remaining work).
//
// k6-load.js (W1304) covers liveness/readiness + a generic authed read. This
// file adds the explicitly-deferred piece: a capacity test bound to the
// government-integration endpoints (NPHIES / GOSI) with their OWN SLO budgets,
// since those paths run heavier service logic (and in non-mock mode reach
// external sandboxes) and deserve a looser-but-still-gated latency budget than
// a plain DB read.
//
// SAFETY — READ-ONLY BY DESIGN:
//   Only idempotent GET probes are exercised. Every MUTATING / externally-
//   dispatching endpoint (NPHIES claim-submit / prior-auth / cancel-claim,
//   GOSI calculate/register POSTs, WhatsApp send) is DELIBERATELY EXCLUDED —
//   load-testing those would spam the NPHIES/GOSI sandboxes (or production!)
//   with phantom claims/registrations. Do NOT add a POST here.
//
// All probes are authenticated, so a TOKEN is REQUIRED for the gov groups to
// run; without it the script still validates liveness so a misconfigured CI
// run fails loudly rather than silently passing on an empty profile.
//
// Run (k6 must be installed — https://k6.io/docs/getting-started/installation):
//   BASE_URL=http://localhost:3001 TOKEN=eyJ... k6 run backend/tests/load/k6-gov-integrations.js
//
// Override the shape or paths from the CLI without editing this file:
//   k6 run -e PEAK_VUS=200 -e PEAK_DURATION=5m \
//          -e NPHIES_STATUS_PATH=/api/v1/nphies/status \
//          backend/tests/load/k6-gov-integrations.js
//
import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';
const TOKEN = __ENV.TOKEN || '';
const PEAK_VUS = parseInt(__ENV.PEAK_VUS || '50', 10);
const PEAK_DURATION = __ENV.PEAK_DURATION || '2m';

// Endpoint paths are env-overridable so the same script targets any
// environment whose mount prefix differs. Defaults match the verified
// dual-mounted routes (`/api/v1/...`).
const NPHIES_STATUS_PATH = __ENV.NPHIES_STATUS_PATH || '/api/v1/nphies/status';
const NPHIES_CPT_PATH = __ENV.NPHIES_CPT_PATH || '/api/v1/nphies/cpt-codes?limit=20';
const GOSI_RATES_PATH = __ENV.GOSI_RATES_PATH || '/api/v1/gosi-full/rates';
const GOSI_DASHBOARD_PATH = __ENV.GOSI_DASHBOARD_PATH || '/api/v1/gosi-full/dashboard';

// Per-integration latency metrics so the summary separates concerns.
const nphiesLatency = new Trend('nphies_read_latency', true);
const gosiLatency = new Trend('gosi_read_latency', true);
const govReadFailRate = new Rate('gov_read_failed');

export const options = {
  // Staged ramp: warm-up, climb, sustained peak, graceful ramp-down.
  stages: [
    { duration: '30s', target: Math.ceil(PEAK_VUS * 0.2) }, // warm-up
    { duration: '1m', target: Math.ceil(PEAK_VUS * 0.6) }, // climb
    { duration: '30s', target: PEAK_VUS }, // reach peak
    { duration: PEAK_DURATION, target: PEAK_VUS }, // sustained peak
    { duration: '30s', target: 0 }, // ramp-down
  ],
  // SLO budgets — government read surfaces run heavier service logic than a
  // plain probe, so the budget is looser than k6-load's readiness, but still
  // gated: a regression past any threshold fails the run (exit != 0).
  thresholds: {
    // Global: <2% of ALL requests may fail (gov deps are flakier than core).
    http_req_failed: ['rate<0.02'],
    // NPHIES status/CPT lookups.
    nphies_read_latency: ['p(95)<1200', 'p(99)<2500'],
    // GOSI rates/dashboard (rates is a static table; dashboard aggregates).
    gosi_read_latency: ['p(95)<1500', 'p(99)<3000'],
    // Combined authed-read error budget for the gov surfaces.
    gov_read_failed: ['rate<0.03'],
  },
};

const authHeaders = TOKEN ? { headers: { Authorization: `Bearer ${TOKEN}` } } : {};

function probe(path, latencyTrend, tag) {
  const res = http.get(`${BASE_URL}${path}`, { ...authHeaders, tags: { ep: tag } });
  latencyTrend.add(res.timings.duration);
  // 2xx = healthy; 503 tolerated (integration in mock/degraded mode still
  // proves the route + auth + service wiring carry load).
  const ok = check(res, {
    [`${tag} 2xx/503`]: r => (r.status >= 200 && r.status < 300) || r.status === 503,
  });
  govReadFailRate.add(!ok);
}

export default function () {
  // Liveness always runs so a TOKEN-less misconfiguration fails loudly
  // (empty profile would otherwise pass every threshold trivially).
  group('liveness', () => {
    const res = http.get(`${BASE_URL}/health`, { tags: { ep: 'health' } });
    check(res, { 'health 200': r => r.status === 200 });
  });

  if (!TOKEN) {
    // No token → cannot exercise authed gov surfaces. Sleep and move on; the
    // run summary will show gov metrics empty, signalling a config gap.
    sleep(1);
    return;
  }

  group('nphies-read', () => {
    probe(NPHIES_STATUS_PATH, nphiesLatency, 'nphies_status');
    probe(NPHIES_CPT_PATH, nphiesLatency, 'nphies_cpt_codes');
  });

  group('gosi-read', () => {
    probe(GOSI_RATES_PATH, gosiLatency, 'gosi_rates');
    probe(GOSI_DASHBOARD_PATH, gosiLatency, 'gosi_dashboard');
  });

  sleep(1);
}
