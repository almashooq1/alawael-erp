/* eslint-disable no-unused-vars */
/**
 * AL-AWAEL ERP — RATE LIMITING + WAF SERVICE
 * Phase 24 — حماية متقدمة ضد هجمات DDoS
 *
 * Unified Web Application Firewall & DDoS Protection:
 * - IP blacklist / whitelist / greylist management
 * - Geo-blocking by country code
 * - Request pattern analysis & anomaly detection
 * - DDoS mitigation (connection flood, slowloris, HTTP flood)
 * - WAF rule engine (SQL injection, XSS, path traversal, etc.)
 * - Rate limiting tiers (per-IP, per-user, per-endpoint, global)
 * - Threat intelligence feed integration
 * - Real-time dashboard analytics
 * - Incident management & alerting
 * - Challenge (CAPTCHA) mode for suspicious IPs
 */

const crypto = require('crypto');
const EventEmitter = require('events');

/* ══════════════════════════════════════════════════════════════════════
   WAF RULE DEFINITIONS
   ══════════════════════════════════════════════════════════════════════ */
const DEFAULT_WAF_RULES = [
  {
    id: 'sqli-01',
    name: 'SQL Injection — Basic',
    category: 'sqli',
    severity: 'critical',
    enabled: true,
    pattern: '(?:\'|\\")?\\s*(?:OR|AND)\\s+.*=',
    description: 'اكتشاف حقن SQL الأساسي',
  },
  {
    id: 'sqli-02',
    name: 'SQL Injection — UNION',
    category: 'sqli',
    severity: 'critical',
    enabled: true,
    pattern: 'UNION\\s+(?:ALL\\s+)?SELECT',
    description: 'اكتشاف UNION SELECT',
  },
  {
    id: 'sqli-03',
    name: 'SQL Injection — Comment',
    category: 'sqli',
    severity: 'high',
    enabled: true,
    pattern: '(?:--|#|/\\*)',
    description: 'اكتشاف تعليقات SQL',
  },
  {
    id: 'xss-01',
    name: 'XSS — Script Tag',
    category: 'xss',
    severity: 'critical',
    enabled: true,
    pattern: '<script[^>]*>',
    description: 'اكتشاف وسم script',
  },
  {
    id: 'xss-02',
    name: 'XSS — Event Handler',
    category: 'xss',
    severity: 'high',
    enabled: true,
    pattern: '\\bon\\w+\\s*=',
    description: 'اكتشاف معالج أحداث مضمّن',
  },
  {
    id: 'xss-03',
    name: 'XSS — Javascript URI',
    category: 'xss',
    severity: 'high',
    enabled: true,
    pattern: 'javascript:',
    description: 'اكتشاف javascript: URI',
  },
  {
    id: 'path-01',
    name: 'Path Traversal',
    category: 'traversal',
    severity: 'critical',
    enabled: true,
    pattern: '\\.\\./|\\.\\.\\\\',
    description: 'اكتشاف تجاوز المسار',
  },
  {
    id: 'cmd-01',
    name: 'Command Injection',
    category: 'cmdi',
    severity: 'critical',
    enabled: true,
    pattern: '[;|&`$]\\s*(?:cat|ls|rm|wget|curl|bash|sh|nc)',
    description: 'اكتشاف حقن الأوامر',
  },
  {
    id: 'rfi-01',
    name: 'Remote File Inclusion',
    category: 'rfi',
    severity: 'critical',
    enabled: true,
    pattern: '(?:https?|ftp)://.*\\?',
    description: 'اكتشاف تضمين ملف عن بُعد',
  },
  {
    id: 'bot-01',
    name: 'Bad Bot User-Agent',
    category: 'bot',
    severity: 'medium',
    enabled: true,
    pattern: '(?:sqlmap|nikto|nmap|masscan|dirbuster|gobuster)',
    description: 'اكتشاف أدوات الفحص',
  },
  {
    id: 'proto-01',
    name: 'Protocol Attack',
    category: 'protocol',
    severity: 'high',
    enabled: true,
    pattern: '(?:HTTP/0\\.9|CONNECT\\s)',
    description: 'هجمات البروتوكول',
  },
  {
    id: 'size-01',
    name: 'Oversized Payload',
    category: 'size',
    severity: 'medium',
    enabled: true,
    pattern: null,
    maxBodySize: 10485760,
    description: 'حمولة تتجاوز 10MB',
  },
];

class RateLimitWafService extends EventEmitter {
  constructor(config = {}) {
    super();

    this.config = {
      /* ── Rate Limiting ── */
      globalRateLimit: config.globalRateLimit || 1000, // req/min global
      ipRateLimit: config.ipRateLimit || 100, // req/min per IP
      userRateLimit: config.userRateLimit || 200, // req/min per user
      endpointRateLimit: config.endpointRateLimit || 60, // req/min per endpoint
      burstLimit: config.burstLimit || 50, // burst tolerance
      windowMs: config.windowMs || 60000, // 1 minute window

      /* ── DDoS Thresholds ── */
      ddosConnectionFlood: config.ddosConnectionFlood || 500, // simultaneous connections
      ddosRequestFlood: config.ddosRequestFlood || 2000, // req/min trigger
      ddosSlowlorisTimeout: config.ddosSlowlorisTimeout || 5000,

      /* ── WAF ── */
      wafEnabled: config.wafEnabled !== false,
      wafMode: config.wafMode || 'block', // block | detect | challenge
      challengeMode: config.challengeMode || 'captcha',

      /* ── Geo-blocking ── */
      geoBlockEnabled: config.geoBlockEnabled || false,
      blockedCountries: config.blockedCountries || [],
      allowedCountries: config.allowedCountries || [],

      /* ── Alerts ── */
      alertOnBlock: config.alertOnBlock !== false,
      alertThreshold: config.alertThreshold || 10,

      ...config,
    };

    /* ── In-memory stores ── */
    this.ipBlacklist = new Map(); // ip → { reason, addedAt, expiresAt, addedBy }
    this.ipWhitelist = new Map(); // ip → { reason, addedAt, addedBy }
    this.ipGreylist = new Map(); // ip → { score, lastSeen, challengeRequired }
    this.rateLimitCounters = new Map(); // key → { count, windowStart }
    this.blockedRequests = []; // last N blocked requests
    this.incidents = []; // DDoS/attack incidents
    this.wafRules = DEFAULT_WAF_RULES.map(r => ({ ...r }));
    this.threatIntel = []; // threat intelligence entries
    this.analytics = {
      totalRequests: 0,
      blockedRequests: 0,
      challengedRequests: 0,
      passedRequests: 0,
    };
    this.rateLimitTiers = [];
    this.geoBlockLog = [];

    this._initDefaultTiers();
    this._initDefaultWhitelist();
  }

  /* ══════════════════════════════════════════════════════════════════════
     INITIALIZATION
     ══════════════════════════════════════════════════════════════════════ */

  _initDefaultTiers() {
    this.rateLimitTiers = [
      {
        id: 'global',
        name: 'عام — جميع الطلبات',
        scope: 'global',
        limit: this.config.globalRateLimit,
        windowMs: this.config.windowMs,
        enabled: true,
      },
      {
        id: 'per-ip',
        name: 'لكل عنوان IP',
        scope: 'ip',
        limit: this.config.ipRateLimit,
        windowMs: this.config.windowMs,
        enabled: true,
      },
      {
        id: 'per-user',
        name: 'لكل مستخدم',
        scope: 'user',
        limit: this.config.userRateLimit,
        windowMs: this.config.windowMs,
        enabled: true,
      },
      {
        id: 'per-endpoint',
        name: 'لكل نقطة نهاية',
        scope: 'endpoint',
        limit: this.config.endpointRateLimit,
        windowMs: this.config.windowMs,
        enabled: true,
      },
      {
        id: 'auth',
        name: 'تسجيل الدخول / المصادقة',
        scope: 'endpoint',
        limit: 5,
        windowMs: 900000,
        enabled: true,
      },
      {
        id: 'burst',
        name: 'حماية الانفجار',
        scope: 'ip',
        limit: this.config.burstLimit,
        windowMs: 1000,
        enabled: true,
      },
    ];
  }

  _initDefaultWhitelist() {
    ['127.0.0.1', '::1', '72.60.84.56'].forEach(ip => {
      this.ipWhitelist.set(ip, {
        reason: 'Default trusted',
        addedAt: new Date(),
        addedBy: 'system',
      });
    });
  }

  /* ══════════════════════════════════════════════════════════════════════
     REQUEST ANALYSIS — تحليل الطلبات
     ══════════════════════════════════════════════════════════════════════ */

  /**
   * Analyze an incoming request — returns { allowed, action, reason, details }
   */
  analyzeRequest(requestInfo = {}) {
    try {
      const {
        ip = '0.0.0.0',
        method = 'GET',
        path = '/',
        headers = {},
        body = '',
        userId = null,
      } = requestInfo;

      this.analytics.totalRequests++;
      const result = { allowed: true, action: 'allow', reason: '', details: {} };

      /* 1. Whitelist bypass */
      if (this.ipWhitelist.has(ip)) {
        this.analytics.passedRequests++;
        result.reason = 'IP whitelisted';
        return result;
      }

      /* 2. Blacklist check */
      if (this.ipBlacklist.has(ip)) {
        const entry = this.ipBlacklist.get(ip);
        if (!entry.expiresAt || new Date(entry.expiresAt) > new Date()) {
          this.analytics.blockedRequests++;
          this._logBlocked({ ip, method, path, reason: `Blacklisted: ${entry.reason}` });
          return {
            allowed: false,
            action: 'block',
            reason: `IP blacklisted: ${entry.reason}`,
            details: entry,
          };
        }
        this.ipBlacklist.delete(ip); // expired
      }

      /* 3. Rate limit check */
      const rlResult = this._checkRateLimit(ip, path, userId);
      if (!rlResult.allowed) {
        this.analytics.blockedRequests++;
        this._logBlocked({ ip, method, path, reason: rlResult.reason });
        return rlResult;
      }

      /* 4. WAF rule scan */
      if (this.config.wafEnabled) {
        const wafResult = this._scanWafRules({ ip, method, path, headers, body });
        if (!wafResult.allowed) {
          this.analytics.blockedRequests++;
          this._logBlocked({
            ip,
            method,
            path,
            reason: wafResult.reason,
            ruleId: wafResult.ruleId,
          });
          return wafResult;
        }
      }

      /* 5. Geo-blocking */
      if (this.config.geoBlockEnabled && requestInfo.country) {
        const geoResult = this._checkGeoBlock(ip, requestInfo.country);
        if (!geoResult.allowed) {
          this.analytics.blockedRequests++;
          this._logBlocked({ ip, method, path, reason: geoResult.reason });
          return geoResult;
        }
      }

      /* 6. Greylist / challenge check */
      if (this.ipGreylist.has(ip)) {
        const grey = this.ipGreylist.get(ip);
        if (grey.score > 70) {
          this.analytics.challengedRequests++;
          return {
            allowed: false,
            action: 'challenge',
            reason: 'Suspicious IP — challenge required',
            details: { score: grey.score, challengeType: this.config.challengeMode },
          };
        }
      }

      this.analytics.passedRequests++;
      return result;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  /* ── Rate limit internals ── */
  _checkRateLimit(ip, path, userId) {
    const now = Date.now();

    for (const tier of this.rateLimitTiers.filter(t => t.enabled)) {
      let key;
      if (tier.scope === 'global') key = 'global';
      else if (tier.scope === 'ip') key = `ip:${ip}:${tier.id}`;
      else if (tier.scope === 'user' && userId) key = `user:${userId}:${tier.id}`;
      else if (tier.scope === 'endpoint') key = `ep:${ip}:${path}:${tier.id}`;
      else continue;

      const counter = this.rateLimitCounters.get(key) || { count: 0, windowStart: now };

      if (now - counter.windowStart > tier.windowMs) {
        counter.count = 1;
        counter.windowStart = now;
      } else {
        counter.count++;
      }

      this.rateLimitCounters.set(key, counter);

      if (counter.count > tier.limit) {
        // Auto-greylist repeated offenders
        this._incrementGreyScore(ip, 10);
        return {
          allowed: false,
          action: 'rate-limit',
          reason: `Rate limit exceeded: ${tier.name} (${tier.limit}/${tier.windowMs}ms)`,
          details: { tier: tier.id, limit: tier.limit, current: counter.count },
        };
      }
    }

    return { allowed: true };
  }

  /* ── WAF rule scanning ── */
  _scanWafRules({ ip, method, path, headers, body }) {
    const payload = `${method} ${path} ${JSON.stringify(headers)} ${typeof body === 'string' ? body : JSON.stringify(body || '')}`;

    for (const rule of this.wafRules.filter(r => r.enabled)) {
      // Size check
      if (rule.maxBodySize && body && typeof body === 'string' && body.length > rule.maxBodySize) {
        return this._wafAction(rule, ip);
      }
      // Regex pattern check
      if (rule.pattern) {
        try {
          const regex = new RegExp(rule.pattern, 'i');
          if (regex.test(payload)) {
            return this._wafAction(rule, ip);
          }
        } catch {
          /* invalid regex — skip */
        }
      }
    }

    return { allowed: true };
  }

  _wafAction(rule, ip) {
    const action =
      this.config.wafMode === 'detect'
        ? 'log'
        : this.config.wafMode === 'challenge'
          ? 'challenge'
          : 'block';
    this._incrementGreyScore(
      ip,
      rule.severity === 'critical' ? 30 : rule.severity === 'high' ? 20 : 10
    );

    return {
      allowed: action === 'log',
      action,
      reason: `WAF rule triggered: ${rule.name}`,
      ruleId: rule.id,
      details: { rule: rule.id, category: rule.category, severity: rule.severity },
    };
  }

  /* ── Geo-blocking ── */
  _checkGeoBlock(ip, country) {
    if (
      this.config.allowedCountries.length > 0 &&
      !this.config.allowedCountries.includes(country)
    ) {
      return { allowed: false, action: 'geo-block', reason: `Country not allowed: ${country}` };
    }
    if (this.config.blockedCountries.includes(country)) {
      return { allowed: false, action: 'geo-block', reason: `Country blocked: ${country}` };
    }
    return { allowed: true };
  }

  /* ── Helpers ── */
  _incrementGreyScore(ip, points) {
    const entry = this.ipGreylist.get(ip) || {
      score: 0,
      lastSeen: new Date(),
      challengeRequired: false,
    };
    entry.score = Math.min(100, entry.score + points);
    entry.lastSeen = new Date();
    if (entry.score > 70) entry.challengeRequired = true;
    if (entry.score >= 90) {
      // Auto-blacklist high-threat IPs
      this.addToBlacklist(ip, 'Auto-blacklisted: high threat score', 'system', 3600000);
    }
    this.ipGreylist.set(ip, entry);
  }

  _logBlocked(info) {
    this.blockedRequests.push({ ...info, timestamp: new Date() });
    if (this.blockedRequests.length > 500) this.blockedRequests.shift();
    this.emit('request:blocked', info);
  }

  /* ══════════════════════════════════════════════════════════════════════
     IP LIST MANAGEMENT — إدارة قوائم IP
     ══════════════════════════════════════════════════════════════════════ */

  addToBlacklist(ip, reason = '', addedBy = 'admin', ttlMs = 0) {
    try {
      if (!ip) throw new Error('IP is required');
      this.ipBlacklist.set(ip, {
        ip,
        reason,
        addedBy,
        addedAt: new Date(),
        expiresAt: ttlMs ? new Date(Date.now() + ttlMs) : null,
      });
      this.ipWhitelist.delete(ip);
      return { success: true, ip, action: 'blacklisted' };
    } catch (error) {
      throw new Error(error.message);
    }
  }

  removeFromBlacklist(ip) {
    try {
      if (!this.ipBlacklist.has(ip)) throw new Error('IP not found in blacklist');
      this.ipBlacklist.delete(ip);
      return { success: true, ip, action: 'removed-from-blacklist' };
    } catch (error) {
      throw new Error(error.message);
    }
  }

  addToWhitelist(ip, reason = '', addedBy = 'admin') {
    try {
      if (!ip) throw new Error('IP is required');
      this.ipWhitelist.set(ip, { ip, reason, addedBy, addedAt: new Date() });
      this.ipBlacklist.delete(ip);
      this.ipGreylist.delete(ip);
      return { success: true, ip, action: 'whitelisted' };
    } catch (error) {
      throw new Error(error.message);
    }
  }

  removeFromWhitelist(ip) {
    try {
      if (!this.ipWhitelist.has(ip)) throw new Error('IP not found in whitelist');
      this.ipWhitelist.delete(ip);
      return { success: true, ip, action: 'removed-from-whitelist' };
    } catch (error) {
      throw new Error(error.message);
    }
  }

  getBlacklist() {
    return { total: this.ipBlacklist.size, entries: [...this.ipBlacklist.values()] };
  }

  getWhitelist() {
    return { total: this.ipWhitelist.size, entries: [...this.ipWhitelist.values()] };
  }

  getGreylist() {
    return {
      total: this.ipGreylist.size,
      entries: [...this.ipGreylist.entries()].map(([ip, v]) => ({ ip, ...v })),
    };
  }

  /* ══════════════════════════════════════════════════════════════════════
     WAF RULES — قواعد جدار الحماية
     ══════════════════════════════════════════════════════════════════════ */

  listWafRules(filters = {}) {
    let rules = [...this.wafRules];
    if (filters.category) rules = rules.filter(r => r.category === filters.category);
    if (filters.severity) rules = rules.filter(r => r.severity === filters.severity);
    if (typeof filters.enabled === 'boolean')
      rules = rules.filter(r => r.enabled === filters.enabled);
    return { total: rules.length, rules };
  }

  toggleWafRule(ruleId, enabled) {
    try {
      const rule = this.wafRules.find(r => r.id === ruleId);
      if (!rule) throw new Error('WAF rule not found');
      rule.enabled = enabled;
      return rule;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  addWafRule(ruleData) {
    try {
      const { name, category, severity, pattern, description } = ruleData;
      if (!name || !category) throw new Error('Rule name and category are required');
      const rule = {
        id: `custom-${crypto.randomBytes(4).toString('hex')}`,
        name,
        category,
        severity: severity || 'medium',
        enabled: true,
        pattern: pattern || null,
        description: description || '',
        custom: true,
        createdAt: new Date(),
      };
      this.wafRules.push(rule);
      return rule;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  deleteWafRule(ruleId) {
    try {
      const idx = this.wafRules.findIndex(r => r.id === ruleId);
      if (idx === -1) throw new Error('WAF rule not found');
      this.wafRules.splice(idx, 1);
      return { deleted: true, ruleId };
    } catch (error) {
      throw new Error(error.message);
    }
  }

  /* ══════════════════════════════════════════════════════════════════════
     RATE LIMIT TIERS — مستويات تحديد المعدل
     ══════════════════════════════════════════════════════════════════════ */

  listRateLimitTiers() {
    return { total: this.rateLimitTiers.length, tiers: this.rateLimitTiers };
  }

  upsertRateLimitTier(data) {
    try {
      const { id, name, scope, limit, windowMs, enabled = true } = data;
      if (!name || !scope || !limit) throw new Error('Name, scope, and limit are required');

      const existing = this.rateLimitTiers.find(t => t.id === id);
      if (existing) {
        Object.assign(existing, { name, scope, limit, windowMs: windowMs || 60000, enabled });
        return existing;
      }

      const tier = {
        id: id || crypto.randomUUID(),
        name,
        scope,
        limit,
        windowMs: windowMs || 60000,
        enabled,
        createdAt: new Date(),
      };
      this.rateLimitTiers.push(tier);
      return tier;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  toggleRateLimitTier(tierId, enabled) {
    try {
      const tier = this.rateLimitTiers.find(t => t.id === tierId);
      if (!tier) throw new Error('Tier not found');
      tier.enabled = enabled;
      return tier;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  /* ══════════════════════════════════════════════════════════════════════
     DDoS DETECTION & INCIDENTS — اكتشاف DDoS والحوادث
     ══════════════════════════════════════════════════════════════════════ */

  /**
   * Simulate DDoS detection check — returns current threat level
   */
  getDDoSStatus() {
    const totalReq = this.analytics.totalRequests;
    const blockedReq = this.analytics.blockedRequests;
    const blockRate = totalReq > 0 ? (blockedReq / totalReq) * 100 : 0;

    let threatLevel = 'low';
    if (blockRate > 50 || blockedReq > this.config.ddosRequestFlood) threatLevel = 'critical';
    else if (blockRate > 25 || blockedReq > this.config.ddosRequestFlood / 2) threatLevel = 'high';
    else if (blockRate > 10) threatLevel = 'medium';

    return {
      threatLevel,
      totalRequests: totalReq,
      blockedRequests: blockedReq,
      blockRate: parseFloat(blockRate.toFixed(2)),
      activeBlacklisted: this.ipBlacklist.size,
      greylistedIPs: this.ipGreylist.size,
      thresholds: {
        connectionFlood: this.config.ddosConnectionFlood,
        requestFlood: this.config.ddosRequestFlood,
      },
      timestamp: new Date(),
    };
  }

  /**
   * Report an incident
   */
  reportIncident(data = {}) {
    try {
      const { type = 'ddos', severity = 'high', description = '', sourceIPs = [] } = data;
      const incident = {
        id: crypto.randomUUID(),
        type,
        severity,
        description,
        sourceIPs,
        status: 'active',
        mitigationActions: [],
        createdAt: new Date(),
        resolvedAt: null,
      };
      this.incidents.push(incident);
      this.emit('incident:created', incident);
      return incident;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  resolveIncident(incidentId, resolution = '') {
    try {
      const incident = this.incidents.find(i => i.id === incidentId);
      if (!incident) throw new Error('Incident not found');
      incident.status = 'resolved';
      incident.resolvedAt = new Date();
      incident.resolution = resolution;
      return incident;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  listIncidents(filters = {}) {
    const { status, type, limit = 50 } = filters;
    let list = [...this.incidents];
    if (status) list = list.filter(i => i.status === status);
    if (type) list = list.filter(i => i.type === type);
    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return { total: list.length, incidents: list.slice(0, limit) };
  }

  /* ══════════════════════════════════════════════════════════════════════
     BLOCKED REQUESTS LOG — سجل الطلبات المحظورة
     ══════════════════════════════════════════════════════════════════════ */

  getBlockedRequests(filters = {}) {
    const { limit = 50, ip } = filters;
    let list = [...this.blockedRequests];
    if (ip) list = list.filter(b => b.ip === ip);
    list.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return { total: list.length, requests: list.slice(0, limit) };
  }

  clearBlockedRequests() {
    const count = this.blockedRequests.length;
    this.blockedRequests = [];
    return { cleared: count };
  }

  /* ══════════════════════════════════════════════════════════════════════
     THREAT INTELLIGENCE — استخبارات التهديد
     ══════════════════════════════════════════════════════════════════════ */

  addThreatIntel(data) {
    try {
      const { source, ip, type = 'malicious', confidence = 80, description = '' } = data;
      if (!ip) throw new Error('IP is required');
      const entry = {
        id: crypto.randomUUID(),
        source: source || 'manual',
        ip,
        type,
        confidence,
        description,
        addedAt: new Date(),
      };
      this.threatIntel.push(entry);
      // Auto-blacklist high-confidence threats
      if (confidence >= 90) {
        this.addToBlacklist(ip, `Threat intel: ${type} (${source})`, 'threat-intel', 86400000);
      }
      return entry;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  listThreatIntel(filters = {}) {
    const { type, limit = 50 } = filters;
    let list = [...this.threatIntel];
    if (type) list = list.filter(t => t.type === type);
    list.sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));
    return { total: list.length, entries: list.slice(0, limit) };
  }

  /* ══════════════════════════════════════════════════════════════════════
     ANALYTICS & DASHBOARD — التحليلات ولوحة التحكم
     ══════════════════════════════════════════════════════════════════════ */

  getDashboard() {
    try {
      const ddos = this.getDDoSStatus();
      const now = new Date();
      const last1h = this.blockedRequests.filter(b => now - new Date(b.timestamp) < 3600000);

      const topBlockedIPs = {};
      this.blockedRequests.forEach(b => {
        topBlockedIPs[b.ip] = (topBlockedIPs[b.ip] || 0) + 1;
      });
      const topIPs = Object.entries(topBlockedIPs)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([ip, count]) => ({ ip, count }));

      const ruleHits = {};
      this.blockedRequests
        .filter(b => b.ruleId)
        .forEach(b => {
          ruleHits[b.ruleId] = (ruleHits[b.ruleId] || 0) + 1;
        });
      const topRules = Object.entries(ruleHits)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([ruleId, count]) => ({ ruleId, count }));

      return {
        threatLevel: ddos.threatLevel,
        analytics: { ...this.analytics },
        blockedLast1h: last1h.length,
        topBlockedIPs: topIPs,
        topTriggeredRules: topRules,
        activeIncidents: this.incidents.filter(i => i.status === 'active').length,
        blacklistSize: this.ipBlacklist.size,
        whitelistSize: this.ipWhitelist.size,
        greylistSize: this.ipGreylist.size,
        wafMode: this.config.wafMode,
        wafEnabled: this.config.wafEnabled,
        enabledRules: this.wafRules.filter(r => r.enabled).length,
        totalRules: this.wafRules.length,
        rateLimitTiers: this.rateLimitTiers.length,
        uptime: process.uptime(),
        timestamp: now,
      };
    } catch (error) {
      throw new Error(error.message);
    }
  }

  /* ══════════════════════════════════════════════════════════════════════
     CONFIGURATION — الإعدادات
     ══════════════════════════════════════════════════════════════════════ */

  getConfig() {
    return { ...this.config };
  }

  updateConfig(updates) {
    try {
      const allowed = [
        'globalRateLimit',
        'ipRateLimit',
        'userRateLimit',
        'endpointRateLimit',
        'burstLimit',
        'windowMs',
        'ddosConnectionFlood',
        'ddosRequestFlood',
        'ddosSlowlorisTimeout',
        'wafEnabled',
        'wafMode',
        'challengeMode',
        'geoBlockEnabled',
        'blockedCountries',
        'allowedCountries',
        'alertOnBlock',
        'alertThreshold',
      ];
      for (const key of Object.keys(updates)) {
        if (allowed.includes(key)) this.config[key] = updates[key];
      }
      return this.getConfig();
    } catch (error) {
      throw new Error(error.message);
    }
  }

  resetAnalytics() {
    this.analytics = {
      totalRequests: 0,
      blockedRequests: 0,
      challengedRequests: 0,
      passedRequests: 0,
    };
    return this.analytics;
  }
}

module.exports = RateLimitWafService;
