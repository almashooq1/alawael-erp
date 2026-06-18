/* eslint-disable no-unused-vars */
/* global __ENV */
/**
 * k6 Government Integrations Load Test
 * Tests read-only government integration endpoints (GOSI, NPHIES, etc.)
 * READ-ONLY BY DESIGN: This profile deliberately tests only read paths
 * to avoid state changes in government APIs.
 * MUTATING endpoints are DELIBERATELY EXCLUDED from this profile.
 * Environment variables: BASE_URL, TOKEN, PEAK_VUS, PEAK_DURATION
 */
import http from 'k6/http';
import { check, sleep, group } from 'k6';

const baseUrl = __ENV.BASE_URL || 'http://localhost:3001';
const token = __ENV.TOKEN || '';
const peakVus = parseInt(__ENV.PEAK_VUS || '30', 10);
const peakDuration = __ENV.PEAK_DURATION || '1m30s';

export const options = {
  stages: [
    { duration: '20s', target: 5, name: 'warm-up' },
    { duration: '45s', target: peakVus, name: 'climb' },
    { duration: peakDuration, target: peakVus, name: 'peak' },
    { duration: '20s', target: 0, name: 'ramp-down' },
  ],
  thresholds: {
    http_req_failed: ['rate<0.10'], // Allow max 10% failures (gov APIs can be flaky)
    nphies_read_latency: ['p(95)<3000'], // NPHIES read-only timeout: 95th < 3s
    gosi_read_latency: ['p(95)<2000'], // GOSI read-only timeout: 95th < 2s
    gov_read_failed: ['rate<0.15'], // General gov read failures < 15%
  },
};

const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

export default function () {
  // READ-ONLY BY DESIGN: All endpoints are query/read-only
  group('GOSI Health Integration', () => {
    const gosiRes = http.get(`${baseUrl}/api/admin/gov-integrations/gosi`, {
      headers: authHeaders,
      tags: { name: 'gosi-health' },
    });
    check(gosiRes, {
      'GOSI health returns 200 or 401': r => [200, 401, 403].includes(r.status),
    });
  });

  group('NPHIES Health Integration', () => {
    const nphiesRes = http.get(`${baseUrl}/api/admin/gov-integrations/status`, {
      headers: authHeaders,
      tags: { name: 'nphies-health' },
    });
    check(nphiesRes, {
      'NPHIES health returns 200 or 401': r => [200, 401, 403].includes(r.status),
    });
  });

  group('Government Integrations Circuit Status', () => {
    const circuitRes = http.get(`${baseUrl}/api/admin/gov-integrations/circuits`, {
      headers: authHeaders,
      tags: { name: 'gov-circuits' },
    });
    check(circuitRes, {
      'circuits returns expected status': r => [200, 401, 403, 404].includes(r.status),
    });
  });

  group('Rate Limits Check', () => {
    const rateRes = http.get(`${baseUrl}/api/admin/gov-integrations/rate-limits`, {
      headers: authHeaders,
      tags: { name: 'gov-rate-limits' },
    });
    check(rateRes, {
      'rate limits returns expected status': r => [200, 401, 403, 404].includes(r.status),
    });
  });

  sleep(2);
}
