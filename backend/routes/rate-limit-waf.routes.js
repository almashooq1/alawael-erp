/**
 * AL-AWAEL ERP — RATE LIMITING + WAF ROUTES
 * Phase 24 — حماية متقدمة ضد هجمات DDoS
 *
 * 22 endpoints for WAF rules, IP management, DDoS status,
 * rate limits, threat intel, incidents, blocked logs, analytics, config.
 */

const express = require('express');
const router = express.Router();
const RateLimitWafService = require('../services/rate-limit-waf.service');

const wafService = new RateLimitWafService();

/* ── helper ── */
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/* ══════════════════════════════════════════════════════════════════════
   DASHBOARD & ANALYTICS
   ══════════════════════════════════════════════════════════════════════ */

// GET /api/waf-ratelimit/dashboard — لوحة التحكم الشاملة
router.get('/dashboard', wrap(async (_req, res) => {
  const data = wafService.getDashboard();
  res.json({ success: true, data });
}));

// GET /api/waf-ratelimit/ddos-status — حالة DDoS
router.get('/ddos-status', wrap(async (_req, res) => {
  const data = wafService.getDDoSStatus();
  res.json({ success: true, data });
}));

// GET /api/waf-ratelimit/analytics/reset — إعادة تعيين التحليلات
router.post('/analytics/reset', wrap(async (_req, res) => {
  const data = wafService.resetAnalytics();
  res.json({ success: true, data, message: 'تم إعادة تعيين التحليلات' });
}));

/* ══════════════════════════════════════════════════════════════════════
   WAF RULES — قواعد الجدار الناري
   ══════════════════════════════════════════════════════════════════════ */

// GET /api/waf-ratelimit/waf-rules — قائمة القواعد
router.get('/waf-rules', wrap(async (req, res) => {
  const { category, severity, enabled } = req.query;
  const filters = {};
  if (category) filters.category = category;
  if (severity) filters.severity = severity;
  if (enabled !== undefined) filters.enabled = enabled === 'true';
  const data = wafService.listWafRules(filters);
  res.json({ success: true, ...data });
}));

// POST /api/waf-ratelimit/waf-rules — إضافة قاعدة جديدة
router.post('/waf-rules', wrap(async (req, res) => {
  const rule = wafService.addWafRule(req.body);
  res.status(201).json({ success: true, data: rule, message: 'تم إضافة القاعدة بنجاح' });
}));

// PUT /api/waf-ratelimit/waf-rules/:ruleId/toggle — تمكين / تعطيل
router.put('/waf-rules/:ruleId/toggle', wrap(async (req, res) => {
  const rule = wafService.toggleWafRule(req.params.ruleId, req.body.enabled);
  res.json({ success: true, data: rule });
}));

// DELETE /api/waf-ratelimit/waf-rules/:ruleId — حذف قاعدة
router.delete('/waf-rules/:ruleId', wrap(async (req, res) => {
  const result = wafService.deleteWafRule(req.params.ruleId);
  res.json({ success: true, ...result, message: 'تم حذف القاعدة' });
}));

/* ══════════════════════════════════════════════════════════════════════
   IP MANAGEMENT — إدارة عناوين IP
   ══════════════════════════════════════════════════════════════════════ */

// GET /api/waf-ratelimit/blacklist — القائمة السوداء
router.get('/blacklist', wrap(async (_req, res) => {
  const data = wafService.getBlacklist();
  res.json({ success: true, ...data });
}));

// POST /api/waf-ratelimit/blacklist — إضافة IP للقائمة السوداء
router.post('/blacklist', wrap(async (req, res) => {
  const { ip, reason, ttlMs } = req.body;
  const user = req.user?.name || req.user?.username || 'admin';
  const result = wafService.addToBlacklist(ip, reason, user, ttlMs);
  res.status(201).json({ success: true, ...result, message: `تم حظر ${ip}` });
}));

// DELETE /api/waf-ratelimit/blacklist/:ip — إزالة من القائمة السوداء
router.delete('/blacklist/:ip', wrap(async (req, res) => {
  const result = wafService.removeFromBlacklist(req.params.ip);
  res.json({ success: true, ...result, message: `تم إلغاء حظر ${req.params.ip}` });
}));

// GET /api/waf-ratelimit/whitelist — القائمة البيضاء
router.get('/whitelist', wrap(async (_req, res) => {
  const data = wafService.getWhitelist();
  res.json({ success: true, ...data });
}));

// POST /api/waf-ratelimit/whitelist — إضافة IP للقائمة البيضاء
router.post('/whitelist', wrap(async (req, res) => {
  const { ip, reason } = req.body;
  const user = req.user?.name || req.user?.username || 'admin';
  const result = wafService.addToWhitelist(ip, reason, user);
  res.status(201).json({ success: true, ...result, message: `تم إدراج ${ip} في القائمة البيضاء` });
}));

// DELETE /api/waf-ratelimit/whitelist/:ip — إزالة من القائمة البيضاء
router.delete('/whitelist/:ip', wrap(async (req, res) => {
  const result = wafService.removeFromWhitelist(req.params.ip);
  res.json({ success: true, ...result });
}));

// GET /api/waf-ratelimit/greylist — القائمة الرمادية
router.get('/greylist', wrap(async (_req, res) => {
  const data = wafService.getGreylist();
  res.json({ success: true, ...data });
}));

/* ══════════════════════════════════════════════════════════════════════
   RATE LIMIT TIERS — مستويات تحديد المعدل
   ══════════════════════════════════════════════════════════════════════ */

// GET /api/waf-ratelimit/rate-limit-tiers
router.get('/rate-limit-tiers', wrap(async (_req, res) => {
  const data = wafService.listRateLimitTiers();
  res.json({ success: true, ...data });
}));

// POST /api/waf-ratelimit/rate-limit-tiers — إنشاء / تحديث
router.post('/rate-limit-tiers', wrap(async (req, res) => {
  const tier = wafService.upsertRateLimitTier(req.body);
  res.status(201).json({ success: true, data: tier, message: 'تم حفظ مستوى المعدل' });
}));

// PUT /api/waf-ratelimit/rate-limit-tiers/:tierId/toggle
router.put('/rate-limit-tiers/:tierId/toggle', wrap(async (req, res) => {
  const tier = wafService.toggleRateLimitTier(req.params.tierId, req.body.enabled);
  res.json({ success: true, data: tier });
}));

/* ══════════════════════════════════════════════════════════════════════
   INCIDENTS — الحوادث الأمنية
   ══════════════════════════════════════════════════════════════════════ */

// GET /api/waf-ratelimit/incidents
router.get('/incidents', wrap(async (req, res) => {
  const { status, type, limit } = req.query;
  const data = wafService.listIncidents({ status, type, limit: limit ? parseInt(limit) : 50 });
  res.json({ success: true, ...data });
}));

// POST /api/waf-ratelimit/incidents — تسجيل حادثة جديدة
router.post('/incidents', wrap(async (req, res) => {
  const incident = wafService.reportIncident(req.body);
  res.status(201).json({ success: true, data: incident, message: 'تم تسجيل الحادثة' });
}));

// PUT /api/waf-ratelimit/incidents/:id/resolve — حل حادثة
router.put('/incidents/:id/resolve', wrap(async (req, res) => {
  const incident = wafService.resolveIncident(req.params.id, req.body.resolution);
  res.json({ success: true, data: incident, message: 'تم حل الحادثة' });
}));

/* ══════════════════════════════════════════════════════════════════════
   BLOCKED REQUESTS LOG — سجل الطلبات المحظورة
   ══════════════════════════════════════════════════════════════════════ */

// GET /api/waf-ratelimit/blocked
router.get('/blocked', wrap(async (req, res) => {
  const { limit, ip } = req.query;
  const data = wafService.getBlockedRequests({ limit: limit ? parseInt(limit) : 50, ip });
  res.json({ success: true, ...data });
}));

// DELETE /api/waf-ratelimit/blocked — مسح السجل
router.delete('/blocked', wrap(async (_req, res) => {
  const result = wafService.clearBlockedRequests();
  res.json({ success: true, ...result, message: 'تم مسح سجل الطلبات المحظورة' });
}));

/* ══════════════════════════════════════════════════════════════════════
   THREAT INTEL — استخبارات التهديد
   ══════════════════════════════════════════════════════════════════════ */

// GET /api/waf-ratelimit/threat-intel
router.get('/threat-intel', wrap(async (req, res) => {
  const { type, limit } = req.query;
  const data = wafService.listThreatIntel({ type, limit: limit ? parseInt(limit) : 50 });
  res.json({ success: true, ...data });
}));

// POST /api/waf-ratelimit/threat-intel — إضافة معلومات تهديد
router.post('/threat-intel', wrap(async (req, res) => {
  const entry = wafService.addThreatIntel(req.body);
  res.status(201).json({ success: true, data: entry, message: 'تم إضافة معلومات التهديد' });
}));

/* ══════════════════════════════════════════════════════════════════════
   REQUEST ANALYSIS (test endpoint) — تحليل الطلب
   ══════════════════════════════════════════════════════════════════════ */

// POST /api/waf-ratelimit/analyze — تحليل طلب (اختباري)
router.post('/analyze', wrap(async (req, res) => {
  const result = wafService.analyzeRequest(req.body);
  res.json({ success: true, data: result });
}));

/* ══════════════════════════════════════════════════════════════════════
   CONFIGURATION — إعدادات WAF
   ══════════════════════════════════════════════════════════════════════ */

// GET /api/waf-ratelimit/config
router.get('/config', wrap(async (_req, res) => {
  const data = wafService.getConfig();
  res.json({ success: true, data });
}));

// PUT /api/waf-ratelimit/config — تحديث الإعدادات
router.put('/config', wrap(async (req, res) => {
  const data = wafService.updateConfig(req.body);
  res.json({ success: true, data, message: 'تم تحديث الإعدادات' });
}));

/* ── Error Handler ── */
router.use((err, _req, res, _next) => {
  res.status(400).json({ success: false, error: err.message || 'خطأ في خدمة WAF' });
});

module.exports = router;
