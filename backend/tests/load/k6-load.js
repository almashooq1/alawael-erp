import http from 'k6/http';
import { check } from 'k6';

// W1350 — Baseline load test profile.
// Stages: warm-up, climb, reach, sustain, ramp-down.
// Environment overrides: BASE_URL, TOKEN, PEAK_VUS, PEAK_DURATION.

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';
const TOKEN = __ENV.TOKEN || '';
const PEAK_VUS = parseInt(__ENV.PEAK_VUS || '50', 10);
const PEAK_DURATION = __ENV.PEAK_DURATION || '1m';

export const options = {
  stages: [
    { duration: '30s', target: Math.max(1, Math.floor(PEAK_VUS * 0.2)) }, // warm-up
    { duration: '30s', target: Math.max(1, Math.floor(PEAK_VUS * 0.5)) }, // climb
    { duration: '30s', target: PEAK_VUS }, // reach
    { duration: '1m', target: PEAK_VUS }, // sustain
    { duration: '30s', target: 0 }, // ramp-down
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    health_latency: ['p(95)<300'],
    readiness_latency: ['p(95)<300'],
  },
};

export default function () {
  const params = {
    headers: {
      Authorization: TOKEN ? `Bearer ${TOKEN}` : '',
    },
  };

  const health = http.get(`${BASE_URL}/health`, {
    ...params,
    tags: { name: 'health_latency' },
  });
  check(health, { 'health is 200': r => r.status === 200 });

  const ready = http.get(`${BASE_URL}/health/ready`, {
    ...params,
    tags: { name: 'readiness_latency' },
  });
  check(ready, { 'ready is 200': r => r.status === 200 });
}
