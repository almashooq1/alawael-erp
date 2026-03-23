/**
 * AL-AWAEL ERP — WAF & Rate Limit Frontend Service
 * Phase 24 — خدمة WAF وتحديد المعدل
 */

import api from './api';

const BASE = '/api/waf-ratelimit';

const wafRateLimitService = {
  /* ── Dashboard & Analytics ── */
  getDashboard:      ()            => api.get(`${BASE}/dashboard`),
  getDDoSStatus:     ()            => api.get(`${BASE}/ddos-status`),
  resetAnalytics:    ()            => api.post(`${BASE}/analytics/reset`),

  /* ── WAF Rules ── */
  listWafRules:      (params = {}) => api.get(`${BASE}/waf-rules`, { params }),
  addWafRule:        (data)        => api.post(`${BASE}/waf-rules`, data),
  toggleWafRule:     (id, enabled) => api.put(`${BASE}/waf-rules/${id}/toggle`, { enabled }),
  deleteWafRule:     (id)          => api.delete(`${BASE}/waf-rules/${id}`),

  /* ── IP Management ── */
  getBlacklist:      ()            => api.get(`${BASE}/blacklist`),
  addToBlacklist:    (data)        => api.post(`${BASE}/blacklist`, data),
  removeFromBlack:   (ip)          => api.delete(`${BASE}/blacklist/${encodeURIComponent(ip)}`),
  getWhitelist:      ()            => api.get(`${BASE}/whitelist`),
  addToWhitelist:    (data)        => api.post(`${BASE}/whitelist`, data),
  removeFromWhite:   (ip)          => api.delete(`${BASE}/whitelist/${encodeURIComponent(ip)}`),
  getGreylist:       ()            => api.get(`${BASE}/greylist`),

  /* ── Rate Limit Tiers ── */
  listTiers:         ()            => api.get(`${BASE}/rate-limit-tiers`),
  upsertTier:        (data)        => api.post(`${BASE}/rate-limit-tiers`, data),
  toggleTier:        (id, enabled) => api.put(`${BASE}/rate-limit-tiers/${id}/toggle`, { enabled }),

  /* ── Incidents ── */
  listIncidents:     (params = {}) => api.get(`${BASE}/incidents`, { params }),
  reportIncident:    (data)        => api.post(`${BASE}/incidents`, data),
  resolveIncident:   (id, res)     => api.put(`${BASE}/incidents/${id}/resolve`, { resolution: res }),

  /* ── Blocked Log ── */
  getBlockedRequests:(params = {}) => api.get(`${BASE}/blocked`, { params }),
  clearBlocked:      ()            => api.delete(`${BASE}/blocked`),

  /* ── Threat Intel ── */
  listThreatIntel:   (params = {}) => api.get(`${BASE}/threat-intel`, { params }),
  addThreatIntel:    (data)        => api.post(`${BASE}/threat-intel`, data),

  /* ── Request Analysis ── */
  analyzeRequest:    (data)        => api.post(`${BASE}/analyze`, data),

  /* ── Config ── */
  getConfig:         ()            => api.get(`${BASE}/config`),
  updateConfig:      (data)        => api.put(`${BASE}/config`, data),
};

export default wafRateLimitService;
