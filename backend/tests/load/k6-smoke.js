import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 10,
  duration: '30s',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500'],
  },
};

const baseUrl = __ENV.BASE_URL || 'http://localhost:3001';

export default function () {
  const res = http.get(`${baseUrl}/api/test`);
  check(res, {
    'status is 200': r => r.status === 200,
  });
  sleep(1);
}
