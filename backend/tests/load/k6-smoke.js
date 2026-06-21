import http from 'k6/http';
import { check } from 'k6';

// W1304 — Smoke test (informational, no thresholds).
// Environment overrides: BASE_URL, TOKEN.

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';
const TOKEN = __ENV.TOKEN || '';

export default function () {
  const params = {
    headers: {
      Authorization: TOKEN ? `Bearer ${TOKEN}` : '',
    },
  };

  const res = http.get(`${BASE_URL}/health`, params);
  check(res, {
    'smoke: health returns 200': r => r.status === 200,
  });
}
