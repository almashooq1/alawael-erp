/**
 * AL-AWAEL ERP — Phase 24: Rate Limiting + WAF Tests
 * حماية متقدمة ضد هجمات DDoS — اختبارات شاملة
 */

const request = require('supertest');
const express = require('express');

/* ── Bypass auth ── */
jest.mock('../middleware/auth', () => (_req, _res, next) => next());

const wafRoutes = require('../routes/rate-limit-waf.routes');
const RateLimitWafService = require('../services/rate-limit-waf.service');

/* ── App setup ── */
let app;
beforeAll(() => {
  app = express();
  app.use(express.json());
  app.use('/api/waf-ratelimit', wafRoutes);
});

/* ══════════════════════════════════════════════════════════════════════
   1. DASHBOARD & ANALYTICS
   ══════════════════════════════════════════════════════════════════════ */

describe('Phase 24 — Dashboard & Analytics', () => {
  test('GET /dashboard — should return dashboard data', async () => {
    const res = await request(app).get('/api/waf-ratelimit/dashboard');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('threatLevel');
    expect(res.body.data).toHaveProperty('analytics');
    expect(res.body.data).toHaveProperty('wafEnabled');
    expect(res.body.data).toHaveProperty('blacklistSize');
  });

  test('GET /ddos-status — should return DDoS status', async () => {
    const res = await request(app).get('/api/waf-ratelimit/ddos-status');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('threatLevel');
    expect(res.body.data).toHaveProperty('totalRequests');
    expect(res.body.data).toHaveProperty('thresholds');
  });

  test('POST /analytics/reset — should reset analytics', async () => {
    const res = await request(app).post('/api/waf-ratelimit/analytics/reset');
    expect(res.status).toBe(200);
    expect(res.body.data.totalRequests).toBe(0);
    expect(res.body.data.blockedRequests).toBe(0);
  });
});

/* ══════════════════════════════════════════════════════════════════════
   2. WAF RULES
   ══════════════════════════════════════════════════════════════════════ */

describe('Phase 24 — WAF Rules', () => {
  test('GET /waf-rules — should list default rules', async () => {
    const res = await request(app).get('/api/waf-ratelimit/waf-rules');
    expect(res.status).toBe(200);
    expect(res.body.rules.length).toBeGreaterThanOrEqual(10);
  });

  test('GET /waf-rules?category=sqli — should filter by category', async () => {
    const res = await request(app).get('/api/waf-ratelimit/waf-rules?category=sqli');
    expect(res.status).toBe(200);
    res.body.rules.forEach(r => expect(r.category).toBe('sqli'));
  });

  test('POST /waf-rules — should add a custom rule', async () => {
    const res = await request(app).post('/api/waf-ratelimit/waf-rules').send({
      name: 'Test Custom Rule', category: 'custom', severity: 'high', pattern: 'test.*pattern', description: 'للاختبار',
    });
    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.data.custom).toBe(true);
  });

  test('POST /waf-rules — should reject without name', async () => {
    const res = await request(app).post('/api/waf-ratelimit/waf-rules').send({ category: 'xss' });
    expect(res.status).toBe(400);
  });

  test('PUT /waf-rules/:id/toggle — should toggle rule', async () => {
    const list = await request(app).get('/api/waf-ratelimit/waf-rules');
    const ruleId = list.body.rules[0].id;
    const res = await request(app).put(`/api/waf-ratelimit/waf-rules/${ruleId}/toggle`).send({ enabled: false });
    expect(res.status).toBe(200);
    expect(res.body.data.enabled).toBe(false);
    // re-enable
    await request(app).put(`/api/waf-ratelimit/waf-rules/${ruleId}/toggle`).send({ enabled: true });
  });

  test('DELETE /waf-rules/:id — should delete a rule', async () => {
    const addRes = await request(app).post('/api/waf-ratelimit/waf-rules').send({
      name: 'To Delete', category: 'custom', severity: 'low',
    });
    const id = addRes.body.data.id;
    const res = await request(app).delete(`/api/waf-ratelimit/waf-rules/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.deleted).toBe(true);
  });

  test('DELETE /waf-rules/:id — invalid ID should 400', async () => {
    const res = await request(app).delete('/api/waf-ratelimit/waf-rules/non-existent');
    expect(res.status).toBe(400);
  });
});

/* ══════════════════════════════════════════════════════════════════════
   3. IP MANAGEMENT
   ══════════════════════════════════════════════════════════════════════ */

describe('Phase 24 — IP Management', () => {
  test('GET /blacklist — should return blacklist', async () => {
    const res = await request(app).get('/api/waf-ratelimit/blacklist');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('entries');
  });

  test('POST /blacklist — should add IP to blacklist', async () => {
    const res = await request(app).post('/api/waf-ratelimit/blacklist').send({ ip: '10.0.0.1', reason: 'Test block' });
    expect(res.status).toBe(201);
    expect(res.body.ip).toBe('10.0.0.1');
  });

  test('POST /blacklist — should reject without IP', async () => {
    const res = await request(app).post('/api/waf-ratelimit/blacklist').send({ reason: 'no ip' });
    expect(res.status).toBe(400);
  });

  test('DELETE /blacklist/:ip — should remove from blacklist', async () => {
    await request(app).post('/api/waf-ratelimit/blacklist').send({ ip: '10.0.0.2', reason: 'temp' });
    const res = await request(app).delete('/api/waf-ratelimit/blacklist/10.0.0.2');
    expect(res.status).toBe(200);
  });

  test('DELETE /blacklist/:ip — non-existent should 400', async () => {
    const res = await request(app).delete('/api/waf-ratelimit/blacklist/99.99.99.99');
    expect(res.status).toBe(400);
  });

  test('GET /whitelist — should return whitelist with defaults', async () => {
    const res = await request(app).get('/api/waf-ratelimit/whitelist');
    expect(res.status).toBe(200);
    expect(res.body.total).toBeGreaterThanOrEqual(1);
  });

  test('POST /whitelist — should add IP to whitelist', async () => {
    const res = await request(app).post('/api/waf-ratelimit/whitelist').send({ ip: '192.168.1.1', reason: 'Office' });
    expect(res.status).toBe(201);
    expect(res.body.action).toBe('whitelisted');
  });

  test('DELETE /whitelist/:ip — should remove from whitelist', async () => {
    await request(app).post('/api/waf-ratelimit/whitelist').send({ ip: '192.168.1.50' });
    const res = await request(app).delete('/api/waf-ratelimit/whitelist/192.168.1.50');
    expect(res.status).toBe(200);
  });

  test('GET /greylist — should return greylist', async () => {
    const res = await request(app).get('/api/waf-ratelimit/greylist');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('entries');
  });
});

/* ══════════════════════════════════════════════════════════════════════
   4. RATE LIMIT TIERS
   ══════════════════════════════════════════════════════════════════════ */

describe('Phase 24 — Rate Limit Tiers', () => {
  test('GET /rate-limit-tiers — should list default tiers', async () => {
    const res = await request(app).get('/api/waf-ratelimit/rate-limit-tiers');
    expect(res.status).toBe(200);
    expect(res.body.tiers.length).toBeGreaterThanOrEqual(4);
  });

  test('POST /rate-limit-tiers — should create a new tier', async () => {
    const res = await request(app).post('/api/waf-ratelimit/rate-limit-tiers').send({
      name: 'Custom Tier', scope: 'ip', limit: 50, windowMs: 30000,
    });
    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty('id');
  });

  test('POST /rate-limit-tiers — should reject missing fields', async () => {
    const res = await request(app).post('/api/waf-ratelimit/rate-limit-tiers').send({ name: 'No scope' });
    expect(res.status).toBe(400);
  });

  test('PUT /rate-limit-tiers/:id/toggle — should toggle tier', async () => {
    const res = await request(app).put('/api/waf-ratelimit/rate-limit-tiers/per-ip/toggle').send({ enabled: false });
    expect(res.status).toBe(200);
    expect(res.body.data.enabled).toBe(false);
    // re-enable
    await request(app).put('/api/waf-ratelimit/rate-limit-tiers/per-ip/toggle').send({ enabled: true });
  });
});

/* ══════════════════════════════════════════════════════════════════════
   5. INCIDENTS
   ══════════════════════════════════════════════════════════════════════ */

describe('Phase 24 — Incidents', () => {
  test('GET /incidents — initially empty', async () => {
    const res = await request(app).get('/api/waf-ratelimit/incidents');
    expect(res.status).toBe(200);
    expect(res.body.incidents).toBeInstanceOf(Array);
  });

  test('POST /incidents — should create incident', async () => {
    const res = await request(app).post('/api/waf-ratelimit/incidents').send({
      type: 'ddos', severity: 'critical', description: 'Test DDoS attack',
    });
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('active');
  });

  test('PUT /incidents/:id/resolve — should resolve incident', async () => {
    const addRes = await request(app).post('/api/waf-ratelimit/incidents').send({
      type: 'waf', severity: 'high', description: 'WAF test',
    });
    const id = addRes.body.data.id;
    const res = await request(app).put(`/api/waf-ratelimit/incidents/${id}/resolve`).send({ resolution: 'Resolved' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('resolved');
  });

  test('PUT /incidents/:id/resolve — invalid ID should 400', async () => {
    const res = await request(app).put('/api/waf-ratelimit/incidents/bad-id/resolve').send({});
    expect(res.status).toBe(400);
  });
});

/* ══════════════════════════════════════════════════════════════════════
   6. BLOCKED REQUESTS LOG
   ══════════════════════════════════════════════════════════════════════ */

describe('Phase 24 — Blocked Requests Log', () => {
  test('GET /blocked — should return blocked log', async () => {
    const res = await request(app).get('/api/waf-ratelimit/blocked');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('requests');
  });

  test('DELETE /blocked — should clear log', async () => {
    const res = await request(app).delete('/api/waf-ratelimit/blocked');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('cleared');
  });
});

/* ══════════════════════════════════════════════════════════════════════
   7. THREAT INTELLIGENCE
   ══════════════════════════════════════════════════════════════════════ */

describe('Phase 24 — Threat Intelligence', () => {
  test('GET /threat-intel — initially empty', async () => {
    const res = await request(app).get('/api/waf-ratelimit/threat-intel');
    expect(res.status).toBe(200);
    expect(res.body.entries).toBeInstanceOf(Array);
  });

  test('POST /threat-intel — should add threat entry', async () => {
    const res = await request(app).post('/api/waf-ratelimit/threat-intel').send({
      ip: '203.0.113.5', source: 'manual', type: 'scanner', confidence: 85,
    });
    expect(res.status).toBe(201);
    expect(res.body.data.ip).toBe('203.0.113.5');
  });

  test('POST /threat-intel — high confidence should auto-blacklist', async () => {
    await request(app).post('/api/waf-ratelimit/threat-intel').send({
      ip: '198.51.100.9', source: 'feed', type: 'botnet', confidence: 95,
    });
    const bl = await request(app).get('/api/waf-ratelimit/blacklist');
    const found = bl.body.entries.find(e => e.ip === '198.51.100.9');
    expect(found).toBeDefined();
  });

  test('POST /threat-intel — should reject without IP', async () => {
    const res = await request(app).post('/api/waf-ratelimit/threat-intel').send({ source: 'manual' });
    expect(res.status).toBe(400);
  });
});

/* ══════════════════════════════════════════════════════════════════════
   8. REQUEST ANALYSIS (Test Endpoint)
   ══════════════════════════════════════════════════════════════════════ */

describe('Phase 24 — Request Analysis', () => {
  test('POST /analyze — whitelisted IP should pass', async () => {
    const res = await request(app).post('/api/waf-ratelimit/analyze').send({ ip: '127.0.0.1', path: '/', method: 'GET' });
    expect(res.status).toBe(200);
    expect(res.body.data.allowed).toBe(true);
  });

  test('POST /analyze — blacklisted IP should be blocked', async () => {
    await request(app).post('/api/waf-ratelimit/blacklist').send({ ip: '10.10.10.10', reason: 'test' });
    const res = await request(app).post('/api/waf-ratelimit/analyze').send({ ip: '10.10.10.10', path: '/', method: 'GET' });
    expect(res.body.data.allowed).toBe(false);
    expect(res.body.data.action).toBe('block');
  });

  test('POST /analyze — SQL injection payload should be blocked', async () => {
    const res = await request(app).post('/api/waf-ratelimit/analyze').send({
      ip: '172.16.0.1', path: '/api/users', method: 'POST',
      body: "' OR 1=1 --",
    });
    expect(res.body.data.allowed).toBe(false);
    expect(res.body.data.reason).toContain('WAF');
  });

  test('POST /analyze — XSS payload should be blocked', async () => {
    const res = await request(app).post('/api/waf-ratelimit/analyze').send({
      ip: '172.16.0.2', path: '/api/posts', method: 'POST',
      body: '<script>alert("xss")</script>',
    });
    expect(res.body.data.allowed).toBe(false);
  });

  test('POST /analyze — path traversal should be blocked', async () => {
    const res = await request(app).post('/api/waf-ratelimit/analyze').send({
      ip: '172.16.0.3', path: '/api/files/../../etc/passwd', method: 'GET',
    });
    expect(res.body.data.allowed).toBe(false);
  });

  test('POST /analyze — clean request should pass', async () => {
    const res = await request(app).post('/api/waf-ratelimit/analyze').send({
      ip: '172.16.0.50', path: '/api/dashboard', method: 'GET', headers: { 'user-agent': 'Mozilla/5.0' },
    });
    expect(res.body.data.allowed).toBe(true);
  });
});

/* ══════════════════════════════════════════════════════════════════════
   9. CONFIGURATION
   ══════════════════════════════════════════════════════════════════════ */

describe('Phase 24 — Configuration', () => {
  test('GET /config — should return configuration', async () => {
    const res = await request(app).get('/api/waf-ratelimit/config');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('wafEnabled');
    expect(res.body.data).toHaveProperty('globalRateLimit');
  });

  test('PUT /config — should update configuration', async () => {
    const res = await request(app).put('/api/waf-ratelimit/config').send({ wafMode: 'detect', ipRateLimit: 200 });
    expect(res.status).toBe(200);
    expect(res.body.data.wafMode).toBe('detect');
    expect(res.body.data.ipRateLimit).toBe(200);
    // restore
    await request(app).put('/api/waf-ratelimit/config').send({ wafMode: 'block', ipRateLimit: 100 });
  });

  test('PUT /config — should ignore disallowed keys', async () => {
    const res = await request(app).put('/api/waf-ratelimit/config').send({ secret: 'bad', wafEnabled: false });
    expect(res.status).toBe(200);
    expect(res.body.data).not.toHaveProperty('secret');
  });
});

/* ══════════════════════════════════════════════════════════════════════
   10. SERVICE UNIT TESTS
   ══════════════════════════════════════════════════════════════════════ */

describe('Phase 24 — RateLimitWafService Unit Tests', () => {
  let svc;
  beforeEach(() => { svc = new RateLimitWafService(); });

  test('constructor sets defaults', () => {
    expect(svc.config.wafEnabled).toBe(true);
    expect(svc.config.globalRateLimit).toBe(1000);
    expect(svc.ipWhitelist.has('127.0.0.1')).toBe(true);
  });

  test('addToBlacklist / removeFromBlacklist', () => {
    svc.addToBlacklist('1.2.3.4', 'test', 'admin');
    expect(svc.ipBlacklist.has('1.2.3.4')).toBe(true);
    svc.removeFromBlacklist('1.2.3.4');
    expect(svc.ipBlacklist.has('1.2.3.4')).toBe(false);
  });

  test('addToWhitelist removes from blacklist', () => {
    svc.addToBlacklist('5.5.5.5', 'test');
    svc.addToWhitelist('5.5.5.5', 'now trusted');
    expect(svc.ipWhitelist.has('5.5.5.5')).toBe(true);
    expect(svc.ipBlacklist.has('5.5.5.5')).toBe(false);
  });

  test('analyzeRequest passes whitelisted IP', () => {
    const r = svc.analyzeRequest({ ip: '127.0.0.1' });
    expect(r.allowed).toBe(true);
  });

  test('analyzeRequest blocks blacklisted IP', () => {
    svc.addToBlacklist('9.9.9.9', 'bad');
    const r = svc.analyzeRequest({ ip: '9.9.9.9' });
    expect(r.allowed).toBe(false);
  });

  test('expired blacklist entry is removed', () => {
    svc.ipBlacklist.set('8.8.8.8', { reason: 'test', addedAt: new Date(), expiresAt: new Date(Date.now() - 1000) });
    const r = svc.analyzeRequest({ ip: '8.8.8.8' });
    expect(r.allowed).toBe(true);
    expect(svc.ipBlacklist.has('8.8.8.8')).toBe(false);
  });

  test('WAF detects SQL injection', () => {
    const r = svc.analyzeRequest({ ip: '1.1.1.1', body: "' OR 1=1 --" });
    expect(r.allowed).toBe(false);
  });

  test('WAF detect mode allows request through', () => {
    svc.config.wafMode = 'detect';
    const r = svc.analyzeRequest({ ip: '1.1.1.2', body: '<script>alert(1)</script>' });
    expect(r.allowed).toBe(true);
  });

  test('DDoS status returns correct shape', () => {
    const s = svc.getDDoSStatus();
    expect(s).toHaveProperty('threatLevel');
    expect(s).toHaveProperty('blockRate');
  });

  test('reportIncident and resolveIncident', () => {
    const i = svc.reportIncident({ type: 'ddos', severity: 'critical', description: 'test' });
    expect(i.status).toBe('active');
    const r = svc.resolveIncident(i.id, 'fixed');
    expect(r.status).toBe('resolved');
  });

  test('addThreatIntel auto-blacklists high confidence', () => {
    svc.addThreatIntel({ ip: '77.77.77.77', confidence: 95, source: 'test' });
    expect(svc.ipBlacklist.has('77.77.77.77')).toBe(true);
  });

  test('getConfig and updateConfig', () => {
    svc.updateConfig({ ipRateLimit: 300, secret: 'no' });
    expect(svc.config.ipRateLimit).toBe(300);
    expect(svc.config.secret).toBeUndefined();
  });

  test('geo-blocking works', () => {
    svc.config.geoBlockEnabled = true;
    svc.config.blockedCountries = ['XX'];
    const r = svc.analyzeRequest({ ip: '2.2.2.2', country: 'XX' });
    expect(r.allowed).toBe(false);
    expect(r.action).toBe('geo-block');
  });

  test('greylist challenge for high-score IPs', () => {
    svc.ipGreylist.set('3.3.3.3', { score: 80, lastSeen: new Date(), challengeRequired: true });
    const r = svc.analyzeRequest({ ip: '3.3.3.3' });
    expect(r.action).toBe('challenge');
  });
});
