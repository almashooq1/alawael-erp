# 🚀 Performance Test Script - k6
# Load testing for AlAwael ERP System

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 100 },  // Ramp up to 100 users
    { duration: '5m', target: 100 },  // Stay at 100 users
    { duration: '2m', target: 200 },  // Ramp up to 200 users
    { duration: '5m', target: 200 },  // Stay at 200 users
    { duration: '2m', target: 0 },    // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% of requests must complete below 500ms
    http_req_failed: ['rate<0.01'],    // Less than 1% of requests should fail
    errors: ['rate<0.1'],              // Less than 10% errors
  },
};

const BASE_URL = __ENV.BASE_URL || 'https://staging.alawael.sa';

export default function () {
  // Test scenarios
  testHomePage();
  testAPIEndpoint();
  testAuthentication();
  testGraphQL();
  
  sleep(1);
}

function testHomePage() {
  const res = http.get(`${BASE_URL}/`);
  const success = check(res, {
    'homepage status is 200': (r) => r.status === 200,
    'homepage response time < 1s': (r) => r.timings.duration < 1000,
  });
  
  errorRate.add(!success);
}

function testAPIEndpoint() {
  const res = http.get(`${BASE_URL}/api/health`);
  const success = check(res, {
    'API health status is 200': (r) => r.status === 200,
    'API response time < 200ms': (r) => r.timings.duration < 200,
  });
  
  errorRate.add(!success);
}

function testAuthentication() {
  const payload = JSON.stringify({
    username: 'testuser',
    password: 'testpass'
  });
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  const res = http.post(`${BASE_URL}/api/auth/login`, payload, params);
  const success = check(res, {
    'login returns token': (r) => r.json('token') !== undefined,
    'login response time < 500ms': (r) => r.timings.duration < 500,
  });
  
  errorRate.add(!success);
}

function testGraphQL() {
  const query = `
    query {
      users(pagination: { first: 10 }) {
        edges {
          node {
            id
            username
            email
          }
        }
      }
    }
  `;
  
  const payload = JSON.stringify({ query });
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  const res = http.post(`${BASE_URL}/graphql`, payload, params);
  const success = check(res, {
    'GraphQL status is 200': (r) => r.status === 200,
    'GraphQL has data': (r) => r.json('data') !== undefined,
    'GraphQL response time < 300ms': (r) => r.timings.duration < 300,
  });
  
  errorRate.add(!success);
}
