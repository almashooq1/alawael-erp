// Simple smoke test for Phase 13 routes with JWT auth
// Uses built-in http to avoid extra dependencies

const http = require('http');
const jwt = require('jsonwebtoken');

const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;
const BASE = `http://localhost:${PORT}`;

// Match server's JWT secret (from backend/.env)
const SECRET = process.env.JWT_SECRET || 'alawael-erp-secret-key-2026-change-in-production';
const token = jwt.sign({ id: 'tester', role: 'admin' }, SECRET, { expiresIn: '1h' });

const endpoints = ['/api/notifications-advanced/statistics', '/api/payments-advanced/statistics'];

function get(path) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const opts = {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
    const req = http.request(url, opts, res => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        resolve({ status: res.statusCode, body: data });
      });
    });
    req.on('error', reject);
    req.end();
  });
}

(async () => {
  try {
    for (const ep of endpoints) {
      const { status, body } = await get(ep);
      console.log(`[OK] GET ${ep} -> ${status}`);
      console.log(body);
    }
    process.exit(0);
  } catch (err) {
    console.error('[ERROR] Smoke test failed:', err.message);
    process.exit(1);
  }
})();
