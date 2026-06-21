import http from 'k6/http';
import { check } from 'k6';

// W1350 — Government integration load test.
// READ-ONLY BY DESIGN: only GET probes against read-only endpoints.
// MUTATING endpoints are DELIBERATELY EXCLUDED to avoid side effects.
// Environment overrides: BASE_URL, TOKEN.

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';
const TOKEN = __ENV.TOKEN || '';

export const options = {
  stages: [
    { duration: '30s', target: 5 },
    { duration: '1m', target: 10 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    nphies_read_latency: ['p(95)<1200'],
    gosi_read_latency: ['p(95)<1500'],
    gov_read_failed: ['rate<0.005'],
  },
};

export default function () {
  const params = {
    headers: {
      Authorization: TOKEN ? `Bearer ${TOKEN}` : '',
    },
  };

  const nphies = http.get(`${BASE_URL}/api/gov/nphies/status`, {
    ...params,
    tags: { name: 'nphies_read_latency' },
  });
  check(nphies, { 'nphies read ok': r => r.status === 200 });

  const gosi = http.get(`${BASE_URL}/api/gov/gosi/status`, {
    ...params,
    tags: { name: 'gosi_read_latency' },
  });
  check(gosi, { 'gosi read ok': r => r.status === 200 });
}
