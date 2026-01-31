import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const apiDuration = new Trend('api_duration');
const apiErrors = new Counter('api_errors');
const apiSuccesses = new Counter('api_successes');
const customErrorRate = new Rate('custom_error_rate');

// Configuration
export const options = {
  stages: [
    // Warm up: Gradually ramp to 100 users
    { duration: '2m', target: 100 },
    // Peak: Hold at 100 users
    { duration: '5m', target: 100 },
    // Stress test: Ramp to 500 users
    { duration: '2m', target: 500 },
    // Peak stress: Hold at 500 users
    { duration: '5m', target: 500 },
    // Cool down: Ramp down to 0 users
    { duration: '2m', target: 0 },
  ],
  thresholds: {
    // API response time: 95% under 2s
    http_req_duration: ['p(95)<2000', 'p(99)<3000'],
    // Error rate: less than 5%
    http_req_failed: ['rate<0.05'],
    // Custom metrics
    api_duration: ['p(95)<2000'],
    custom_error_rate: ['rate<0.05'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';

/**
 * Frontend API Load Test - Comprehensive Scenario
 * Tests all major endpoints with realistic user behavior
 */
export default function () {
  // Group 1: Health Checks
  group('Health Checks', () => {
    const healthRes = http.get(`${BASE_URL}/health`);
    check(healthRes, {
      'health status is 200': r => r.status === 200,
      'health response time < 100ms': r => r.timings.duration < 100,
    });
    apiDuration.add(healthRes.timings.duration, { endpoint: 'health' });
  });

  sleep(1);

  // Group 2: API Health Check
  group('API Health', () => {
    const apiHealthRes = http.get(`${BASE_URL}/api/health`);
    check(apiHealthRes, {
      'API health is 200': r => r.status === 200,
      'API health response time < 100ms': r => r.timings.duration < 100,
    });
    apiDuration.add(apiHealthRes.timings.duration, { endpoint: 'api_health' });
  });

  sleep(1);

  // Group 3: Dashboard Data Endpoint
  group('Dashboard Data', () => {
    const dashboardRes = http.get(`${BASE_URL}/api/dashboard`);
    const isSuccess = check(dashboardRes, {
      'dashboard status is 200': r => r.status === 200,
      'dashboard has data': r => r.body.includes('data'),
      'dashboard response time < 1000ms': r => r.timings.duration < 1000,
    });

    apiDuration.add(dashboardRes.timings.duration, { endpoint: 'dashboard' });
    isSuccess ? apiSuccesses.add(1) : (apiErrors.add(1), customErrorRate.add(1));
  });

  sleep(1);

  // Group 4: AI Endpoints
  group('AI Deep Learning', () => {
    // Initialize model
    const initRes = http.post(
      `${BASE_URL}/api/ai/deeplearning/init`,
      JSON.stringify({
        inputSize: 10,
        hiddenLayers: [64, 32, 16],
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

    const isInitSuccess = check(initRes, {
      'model init status is 200 or 201': r => r.status === 200 || r.status === 201,
      'model init response time < 500ms': r => r.timings.duration < 500,
    });

    apiDuration.add(initRes.timings.duration, { endpoint: 'ai_init' });
    isInitSuccess ? apiSuccesses.add(1) : (apiErrors.add(1), customErrorRate.add(1));

    // Predict
    if (isInitSuccess) {
      sleep(0.5);
      const predictRes = http.post(
        `${BASE_URL}/api/ai/deeplearning/predict`,
        JSON.stringify({
          input: Array(10).fill(Math.random()),
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );

      const isPredictSuccess = check(predictRes, {
        'prediction status is 200 or 201': r => r.status === 200 || r.status === 201,
        'prediction response time < 500ms': r => r.timings.duration < 500,
      });

      apiDuration.add(predictRes.timings.duration, { endpoint: 'ai_predict' });
      isPredictSuccess ? apiSuccesses.add(1) : (apiErrors.add(1), customErrorRate.add(1));
    }
  });

  sleep(1);

  // Group 5: ML Endpoints
  group('AI Machine Learning', () => {
    // Model training
    const trainRes = http.post(
      `${BASE_URL}/api/ai/machine-learning/train`,
      JSON.stringify({
        features: Array(5)
          .fill(0)
          .map(() => Array(10).fill(Math.random())),
        labels: Array(5)
          .fill(0)
          .map(() => Math.random()),
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

    const isTrainSuccess = check(trainRes, {
      'training status is 200 or 201': r => r.status === 200 || r.status === 201,
      'training response time < 2000ms': r => r.timings.duration < 2000,
    });

    apiDuration.add(trainRes.timings.duration, { endpoint: 'ml_train' });
    isTrainSuccess ? apiSuccesses.add(1) : (apiErrors.add(1), customErrorRate.add(1));
  });

  sleep(1);

  // Group 6: Analytics Endpoints
  group('Analytics', () => {
    const analyticsRes = http.get(`${BASE_URL}/api/analytics`);
    const isSuccess = check(analyticsRes, {
      'analytics status is 200': r => r.status === 200,
      'analytics response time < 500ms': r => r.timings.duration < 500,
    });

    apiDuration.add(analyticsRes.timings.duration, { endpoint: 'analytics' });
    isSuccess ? apiSuccesses.add(1) : (apiErrors.add(1), customErrorRate.add(1));
  });

  sleep(2);
}

/**
 * Threshold compliance test
 * Logs summary statistics
 */
export function handleSummary(data) {
  return {
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

/**
 * Simple text summary formatter
 */
function textSummary(data, options = {}) {
  const indent = options.indent || '';
  const lines = [];

  // Metrics summary
  if (data.metrics) {
    lines.push(`\n${indent}📊 METRICS SUMMARY`);
    lines.push(`${indent}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    // HTTP metrics
    if (data.metrics.http_reqs) {
      const httpReqs = data.metrics.http_reqs;
      lines.push(`${indent}Total Requests: ${httpReqs.values.count}`);
    }

    if (data.metrics.http_req_duration) {
      const duration = data.metrics.http_req_duration;
      lines.push(`${indent}Response Time (avg): ${duration.values.avg.toFixed(2)}ms`);
      if (duration.values['p(95)']) {
        lines.push(`${indent}Response Time (p95): ${duration.values['p(95)'].toFixed(2)}ms`);
      }
      if (duration.values['p(99)']) {
        lines.push(`${indent}Response Time (p99): ${duration.values['p(99)'].toFixed(2)}ms`);
      }
    }

    if (data.metrics.http_req_failed) {
      const failed = data.metrics.http_req_failed.values.rate;
      lines.push(`${indent}Error Rate: ${(failed * 100).toFixed(2)}%`);
    }
  }

  return lines.join('\n');
}
