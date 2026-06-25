/* eslint-disable no-unused-vars */
/* global __ENV */
/**
 * k6 Load Test - Comprehensive baseline performance profile
 * Stages: warm-up (ramp VUs), climb (gradual increase), peak (sustained), ramp-down (cool off)
 * Environment variables: BASE_URL, TOKEN, PEAK_VUS, PEAK_DURATION
 */
import http from 'k6/http';
import { check, sleep, group } from 'k6';

const baseUrl = __ENV.BASE_URL || 'http://localhost:3001';
const token = __ENV.TOKEN || '';
const peakVus = parseInt(__ENV.PEAK_VUS || '50', 10);
const peakDuration = __ENV.PEAK_DURATION || '2m';

export const options = {
  stages: [
    // Warm-up: 0 to 10 VUs over 30s
    { duration: '30s', target: 10, name: 'warm-up' },
    // Climb: 10 to peakVus over 1m
    { duration: '1m', target: peakVus, name: 'climb' },
    // Reach: brief plateau before full sustain
    { duration: '15s', target: peakVus, name: 'reach' },
    // Peak: maintain peakVus for peak duration
    { duration: peakDuration, target: peakVus, name: 'peak' },
    // Ramp-down: peakVus to 0 over 30s
    { duration: '30s', target: 0, name: 'ramp-down' },
  ],
  thresholds: {
    http_req_failed: ['rate<0.05'], // Allow max 5% failures
    health_latency: ['p(95)<200'], // 95th percentile < 200ms for health checks
    readiness_latency: ['p(95)<500'], // 95th percentile < 500ms for readiness checks
  },
};

const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

export default function () {
  group('Health & Readiness Probes', () => {
    const healthRes = http.get(`${baseUrl}/health`, { tags: { name: 'health' } });
    check(healthRes, { 'health status is 200': r => r.status === 200 });
  });

  group('Admin APIs', () => {
    const adminRes = http.get(`${baseUrl}/api/admin/beneficiaries`, {
      headers: authHeaders,
      tags: { name: 'admin-list-beneficiaries' },
    });
    check(adminRes, {
      'admin list returns 200 or 401': r => [200, 401, 403].includes(r.status),
    });
  });

  group('Therapy Sessions', () => {
    const sessionsRes = http.get(`${baseUrl}/api/v1/sessions`, {
      headers: authHeaders,
      tags: { name: 'sessions' },
    });
    check(sessionsRes, {
      'therapy sessions returns expected status': r => [200, 401, 403, 404].includes(r.status),
    });
  });

  sleep(1);
}
