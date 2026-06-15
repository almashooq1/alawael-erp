/* eslint-disable no-unused-vars */
/* global __ENV */
//
// k6-load.js — realistic staged load profile (W1304, GAPS Item 4).
//
// The pre-existing k6-smoke.js hits a single /api/test endpoint at a flat
// 10 VUs/30s — enough to prove k6 wiring, not enough to find a breaking
// point or bind any path to an SLO. This profile adds:
//   - a STAGED ramp (warm-up → ramp → sustained peak → ramp-down) so you
//     see where latency degrades, not just a steady state;
//   - PER-PATH SLO thresholds (liveness vs readiness have different budgets);
//   - a token-optional authed read path (set TOKEN to exercise real routes);
//   - tagged sub-checks so the summary breaks down by endpoint group.
//
// Run (k6 must be installed — https://k6.io/docs/getting-started/installation):
//   BASE_URL=http://localhost:3001 k6 run backend/tests/load/k6-load.js
//   BASE_URL=https://staging... TOKEN=eyJ... k6 run backend/tests/load/k6-load.js
//
// Override the shape from the CLI without editing this file:
//   k6 run -e PEAK_VUS=300 -e PEAK_DURATION=5m backend/tests/load/k6-load.js
//
import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';
const TOKEN = __ENV.TOKEN || '';
const PEAK_VUS = parseInt(__ENV.PEAK_VUS || '100', 10);
const PEAK_DURATION = __ENV.PEAK_DURATION || '2m';

// Custom metrics so the end-of-run summary separates concerns.
const healthLatency = new Trend('health_latency', true);
const readyLatency = new Trend('readiness_latency', true);
const authReadFailRate = new Rate('auth_read_failed');

export const options = {
  // Staged ramp: warm-up, climb, sustained peak, graceful ramp-down.
  stages: [
    { duration: '30s', target: Math.ceil(PEAK_VUS * 0.1) }, // warm-up
    { duration: '1m', target: Math.ceil(PEAK_VUS * 0.5) }, // climb
    { duration: '30s', target: PEAK_VUS }, // reach peak
    { duration: PEAK_DURATION, target: PEAK_VUS }, // sustained peak
    { duration: '30s', target: 0 }, // ramp-down
  ],
  // SLO budgets — a regression past any of these fails the run (exit != 0),
  // so this file is CI-gateable once a target environment exists.
  thresholds: {
    // Global: <1% of ALL requests may fail.
    http_req_failed: ['rate<0.01'],
    // Liveness is cheap — tight budget.
    health_latency: ['p(95)<200', 'p(99)<400'],
    // Readiness touches DB/deps — looser budget.
    readiness_latency: ['p(95)<800', 'p(99)<1500'],
    // Authed reads (only meaningful when TOKEN is set).
    auth_read_failed: ['rate<0.02'],
  },
};

const authHeaders = TOKEN ? { headers: { Authorization: `Bearer ${TOKEN}` } } : {};

export default function () {
  // 1) Liveness — must stay fast under load.
  group('liveness', () => {
    const res = http.get(`${BASE_URL}/health`, { tags: { ep: 'health' } });
    healthLatency.add(res.timings.duration);
    check(res, { 'health 200': r => r.status === 200 });
  });

  // 2) Readiness — exercises DB/dependency probes.
  group('readiness', () => {
    const res = http.get(`${BASE_URL}/readiness`, { tags: { ep: 'readiness' } });
    readyLatency.add(res.timings.duration);
    check(res, { 'readiness 2xx/503': r => r.status === 200 || r.status === 503 });
  });

  // 3) Authed read path — only when a TOKEN is supplied. Pick a cheap,
  //    high-traffic GET that every authed surface depends on. Adjust the
  //    path to your environment's busiest read endpoint.
  if (TOKEN) {
    group('authed-read', () => {
      const res = http.get(`${BASE_URL}/api/v1/beneficiaries?limit=20`, {
        ...authHeaders,
        tags: { ep: 'beneficiaries_list' },
      });
      const ok = check(res, { 'authed read 2xx': r => r.status >= 200 && r.status < 300 });
      authReadFailRate.add(!ok);
    });
  }

  sleep(1);
}
