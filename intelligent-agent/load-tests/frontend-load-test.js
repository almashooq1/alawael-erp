import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Trend, Counter, Rate } from 'k6/metrics';

// Custom metrics
const pageLoadTime = new Trend('page_load_time');
const elementLoadTime = new Trend('element_load_time');
const userInteractionTime = new Trend('interaction_time');
const renderErrors = new Counter('render_errors');
const interactionSuccesses = new Counter('interaction_successes');

// Configuration
export const options = {
  stages: [
    // Ramp up: 50 users over 2 minutes
    { duration: '2m', target: 50 },
    // Steady state: 50 users for 5 minutes
    { duration: '5m', target: 50 },
    // Ramp down: Down to 0 over 1 minute
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    // Page load time: 95% under 3s
    page_load_time: ['p(95)<3000', 'p(99)<4000'],
    // Element load time: 95% under 1s
    element_load_time: ['p(95)<1000'],
    // Interaction response: 95% under 500ms
    interaction_time: ['p(95)<500'],
    // Error rate: less than 2%
    http_req_failed: ['rate<0.02'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

/**
 * Frontend User Experience Load Test
 * Simulates realistic user interactions and page loads
 */
export default function () {
  // Scenario 1: Landing page load
  group('Landing Page Load', () => {
    const pageStart = Date.now();

    // Main HTML page
    const pageRes = http.get(`${BASE_URL}/`);
    check(pageRes, {
      'page status is 200': r => r.status === 200,
      'page content type is HTML': r => r.headers['Content-Type'].includes('text/html'),
      'page size reasonable': r => r.body.length > 1000,
    });

    pageLoadTime.add(Date.now() - pageStart);
    sleep(1);
  });

  // Scenario 2: Asset loading (CSS, JS, etc)
  group('Asset Loading', () => {
    const assets = [
      `${BASE_URL}/static/css/main.css`,
      `${BASE_URL}/static/js/main.js`,
      `${BASE_URL}/static/js/vendors.js`,
    ];

    assets.forEach(asset => {
      const assetStart = Date.now();
      const res = http.get(asset, { tags: { name: asset } });
      check(res, {
        'asset loads successfully': r => r.status === 200 || r.status === 304,
      });
      elementLoadTime.add(Date.now() - assetStart, { asset: asset });
    });
  });

  sleep(2);

  // Scenario 3: Dashboard interaction
  group('Dashboard Interaction', () => {
    const dashStart = Date.now();

    const dashRes = http.get(`${BASE_URL}/dashboard`);
    check(dashRes, {
      'dashboard loads': r => r.status === 200,
      'dashboard has content': r => r.body.length > 5000,
    });

    userInteractionTime.add(Date.now() - dashStart);
    sleep(1);

    // API call from dashboard
    const apiRes = http.get(`${BASE_URL}/api/dashboard`);
    check(apiRes, {
      'dashboard API responds': r => r.status === 200,
    });
  });

  sleep(1);

  // Scenario 4: Analytics page load
  group('Analytics Page', () => {
    const analyticsStart = Date.now();

    const analyticsRes = http.get(`${BASE_URL}/analytics`);
    check(analyticsRes, {
      'analytics page loads': r => r.status === 200,
    });

    userInteractionTime.add(Date.now() - analyticsStart);
  });

  sleep(1);

  // Scenario 5: Form submission
  group('Form Submission', () => {
    const formStart = Date.now();

    const formRes = http.post(
      `${BASE_URL}/api/forms/submit`,
      JSON.stringify({
        name: 'Test User',
        email: 'test@example.com',
        message: 'Load test form submission',
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );

    const isSuccess = check(formRes, {
      'form submission status is 200-201': r => r.status === 200 || r.status === 201,
      'form response time < 1s': r => r.timings.duration < 1000,
    });

    userInteractionTime.add(Date.now() - formStart);
    isSuccess ? interactionSuccesses.add(1) : renderErrors.add(1);
  });

  sleep(2);

  // Scenario 6: Search functionality
  group('Search Functionality', () => {
    const searchStart = Date.now();

    const searchRes = http.get(`${BASE_URL}/api/search?q=intelligent&limit=10`);
    check(searchRes, {
      'search returns 200': r => r.status === 200,
      'search response time < 1s': r => r.timings.duration < 1000,
    });

    userInteractionTime.add(Date.now() - searchStart);
  });

  sleep(1);

  // Scenario 7: Real-time updates (WebSocket equivalent via polling)
  group('Real-time Updates', () => {
    const updateStart = Date.now();

    const updateRes = http.get(`${BASE_URL}/api/updates?timestamp=${Date.now()}`);
    check(updateRes, {
      'updates endpoint responds': r => r.status === 200 || r.status === 304,
    });

    userInteractionTime.add(Date.now() - updateStart);
  });

  sleep(3);
}

/**
 * Handle test summary
 */
export function handleSummary(data) {
  console.log('='.repeat(60));
  console.log('FRONTEND LOAD TEST SUMMARY');
  console.log('='.repeat(60));

  if (data.metrics) {
    // Page Load Metrics
    if (data.metrics.page_load_time) {
      const plt = data.metrics.page_load_time.values;
      console.log(`\nPage Load Time:`);
      console.log(`  Average: ${plt.avg?.toFixed(2)}ms`);
      console.log(`  P95:     ${plt['p(95)']?.toFixed(2)}ms`);
      console.log(`  Max:     ${plt.max?.toFixed(2)}ms`);
    }

    // Element Load Metrics
    if (data.metrics.element_load_time) {
      const elt = data.metrics.element_load_time.values;
      console.log(`\nElement Load Time:`);
      console.log(`  Average: ${elt.avg?.toFixed(2)}ms`);
      console.log(`  P95:     ${elt['p(95)']?.toFixed(2)}ms`);
    }

    // HTTP metrics
    if (data.metrics.http_req_failed) {
      const errorRate = data.metrics.http_req_failed.values.rate;
      console.log(`\nError Rate: ${(errorRate * 100).toFixed(2)}%`);
    }

    if (data.metrics.http_reqs) {
      console.log(`Total Requests: ${data.metrics.http_reqs.values.count}`);
    }
  }

  console.log('='.repeat(60));

  return {
    stdout: 'Test complete',
  };
}
