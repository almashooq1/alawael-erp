/**
 * branchApi.service.js — خدمة API الموحدة لنظام إدارة الفروع
 *
 * Centralized API layer for all branch management endpoints.
 * Features:
 * - Automatic JWT injection
 * - Request deduplication
 * - Response caching (configurable TTL)
 * - Error normalization
 * - Request retry (3x on network errors)
 * - Abort controller support
 */

import { getToken } from '../utils/tokenStorage';

const API_BASE = '/api/branch-management';
const DEFAULT_CACHE_TTL = 2 * 60 * 1000; // 2 minutes

// ─── Cache Store ──────────────────────────────────────────────────────────────
const cache = new Map();
const pendingRequests = new Map();

// ─── Core Fetch Wrapper ───────────────────────────────────────────────────────
async function apiFetch(url, options = {}, cacheKey = null, cacheTTL = DEFAULT_CACHE_TTL) {
  // Cache check
  if (cacheKey && cache.has(cacheKey)) {
    const { data, expiry } = cache.get(cacheKey);
    if (Date.now() < expiry) return data;
    cache.delete(cacheKey);
  }

  // Dedup in-flight requests
  if (cacheKey && pendingRequests.has(cacheKey)) {
    return pendingRequests.get(cacheKey);
  }

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getToken()}`,
    ...options.headers,
  };

  const fetchPromise = fetchWithRetry(url, { ...options, headers }, 3);

  if (cacheKey) pendingRequests.set(cacheKey, fetchPromise);

  try {
    const result = await fetchPromise;
    if (cacheKey && cacheTTL > 0) {
      cache.set(cacheKey, { data: result, expiry: Date.now() + cacheTTL });
    }
    return result;
  } finally {
    if (cacheKey) pendingRequests.delete(cacheKey);
  }
}

async function fetchWithRetry(url, options, retries = 3) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, options);

      if (res.status === 401) {
        throw Object.assign(new Error('Unauthorized — رجاءً تسجيل الدخول مجدداً'), {
          code: 'UNAUTHORIZED',
          status: 401,
        });
      }
      if (res.status === 403) {
        throw Object.assign(new Error('ليس لديك صلاحية للوصول إلى هذه البيانات'), {
          code: 'FORBIDDEN',
          status: 403,
        });
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw Object.assign(new Error(body.message || `HTTP ${res.status}`), {
          code: 'API_ERROR',
          status: res.status,
          body,
        });
      }

      return res.json();
    } catch (err) {
      const isRetryable = !err.status && attempt < retries; // network errors only
      if (!isRetryable) throw err;
      await new Promise(r => setTimeout(r, 500 * Math.pow(2, attempt)));
    }
  }
}

function clearCache(pattern = null) {
  if (!pattern) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (key.includes(pattern)) cache.delete(key);
  }
}

// ─── HQ Endpoints ─────────────────────────────────────────────────────────────

const hq = {
  /** GET /hq/dashboard — لوحة تحكم المقر الرئيسي */
  getDashboard: () => apiFetch(`${API_BASE}/hq/dashboard`, {}, 'hq:dashboard', 60_000),

  /** GET /hq/alerts — التنبيهات */
  getAlerts: () => apiFetch(`${API_BASE}/hq/alerts`, {}, 'hq:alerts', 30_000),

  /** GET /hq/financials — الماليات الموحدة */
  getFinancials: (period = 'month') =>
    apiFetch(
      `${API_BASE}/hq/financials?period=${period}`,
      {},
      `hq:financials:${period}`,
      2 * 60_000
    ),

  /** GET /hq/comparison?metric=X&branches=A,B,C */
  getComparison: (metric = 'capacity_utilization', branches = []) => {
    const q = new URLSearchParams({ metric });
    if (branches.length > 0) q.set('branches', branches.join(','));
    return apiFetch(`${API_BASE}/hq/comparison?${q}`, {}, `hq:comparison:${metric}`, 2 * 60_000);
  },

  /** GET /hq/analytics?days=30 — تحليلات الشبكة */
  getAnalytics: (days = 30) =>
    apiFetch(`${API_BASE}/hq/analytics?days=${days}`, {}, `hq:analytics:${days}`, 5 * 60_000),

  /** GET /hq/rankings?date=YYYY-MM-DD */
  getRankings: (date = null) => {
    const q = date ? `?date=${date}` : '';
    return apiFetch(
      `${API_BASE}/hq/rankings${q}`,
      {},
      `hq:rankings:${date || 'today'}`,
      5 * 60_000
    );
  },

  /** GET /hq/forecast?metric=X&days=7 */
  getForecast: (metric = 'revenue', days = 7) =>
    apiFetch(
      `${API_BASE}/hq/forecast?metric=${metric}&days=${days}`,
      {},
      `hq:forecast:${metric}:${days}`,
      15 * 60_000
    ),

  /** GET /hq/network-digest */
  getNetworkDigest: () => apiFetch(`${API_BASE}/hq/network-digest`, {}, 'hq:digest', 60 * 60_000),

  /** GET /hq/staff-optimizer */
  getStaffOptimizer: () =>
    apiFetch(`${API_BASE}/hq/staff-optimizer`, {}, 'hq:staff-optimizer', 5 * 60_000),

  /** POST /hq/emergency-override */
  executeEmergencyAction: payload =>
    apiFetch(`${API_BASE}/hq/emergency-override`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  /** GET /hq/audit-log?page=1&limit=50 */
  getAuditLog: (page = 1, limit = 50, filters = {}) => {
    const q = new URLSearchParams({ page, limit, ...filters });
    return apiFetch(`${API_BASE}/hq/audit-log?${q}`, {}, null, 0);
  },

  clearCache: () => clearCache('hq:'),
};

// ─── Branch Endpoints ─────────────────────────────────────────────────────────

const branch = {
  /** GET / — list all branches */
  list: () => apiFetch(`${API_BASE}/`, {}, 'branches:list', 5 * 60_000),

  /** GET /:code */
  get: code => apiFetch(`${API_BASE}/${code}`, {}, `branch:${code}:info`, 5 * 60_000),

  /** POST / — create branch (HQ only) */
  create: data => {
    clearCache('branches:list');
    return apiFetch(`${API_BASE}/`, { method: 'POST', body: JSON.stringify(data) });
  },

  /** PUT /:code */
  update: (code, data) => {
    clearCache(`branch:${code}`);
    return apiFetch(`${API_BASE}/${code}`, { method: 'PUT', body: JSON.stringify(data) });
  },

  /** DELETE /:code */
  deactivate: code => {
    clearCache(`branch:${code}`);
    clearCache('branches:list');
    return apiFetch(`${API_BASE}/${code}`, { method: 'DELETE' });
  },

  /** GET /:code/dashboard */
  getDashboard: code =>
    apiFetch(`${API_BASE}/${code}/dashboard`, {}, `branch:${code}:dashboard`, 60_000),

  /** GET /:code/patients?search=X&therapist_id=Y */
  getPatients: (code, filters = {}) => {
    const q = new URLSearchParams(filters);
    return apiFetch(`${API_BASE}/${code}/patients?${q}`, {}, `branch:${code}:patients`, 60_000);
  },

  /** GET /:code/schedule?date=YYYY-MM-DD&status=X */
  getSchedule: (code, filters = {}) => {
    const q = new URLSearchParams(filters);
    return apiFetch(
      `${API_BASE}/${code}/schedule?${q}`,
      {},
      `branch:${code}:schedule:${JSON.stringify(filters)}`,
      30_000
    );
  },

  /** POST /:code/schedule */
  createScheduleEntry: (code, data) => {
    clearCache(`branch:${code}:schedule`);
    return apiFetch(`${API_BASE}/${code}/schedule`, { method: 'POST', body: JSON.stringify(data) });
  },

  /** GET /:code/staff */
  getStaff: code => apiFetch(`${API_BASE}/${code}/staff`, {}, `branch:${code}:staff`, 2 * 60_000),

  /** GET /:code/finance?period=month */
  getFinance: (code, period = 'month') =>
    apiFetch(
      `${API_BASE}/${code}/finance?period=${period}`,
      {},
      `branch:${code}:finance:${period}`,
      2 * 60_000
    ),

  /** GET /:code/transport */
  getTransport: code =>
    apiFetch(`${API_BASE}/${code}/transport`, {}, `branch:${code}:transport`, 30_000),

  /** GET /:code/reports */
  getReports: code =>
    apiFetch(`${API_BASE}/${code}/reports`, {}, `branch:${code}:reports`, 5 * 60_000),

  /** GET /:code/kpis */
  getKPIs: code => apiFetch(`${API_BASE}/${code}/kpis`, {}, `branch:${code}:kpis`, 2 * 60_000),

  /** GET /:code/analytics?days=30 */
  getAnalytics: (code, days = 30) =>
    apiFetch(
      `${API_BASE}/${code}/analytics?days=${days}`,
      {},
      `branch:${code}:analytics:${days}`,
      5 * 60_000
    ),

  /** GET /:code/trends?days=30 */
  getTrends: (code, days = 30) =>
    apiFetch(
      `${API_BASE}/${code}/trends?days=${days}`,
      {},
      `branch:${code}:trends:${days}`,
      5 * 60_000
    ),

  /** GET /:code/forecast?metric=X&days=7 */
  getForecast: (code, metric = 'revenue', days = 7) =>
    apiFetch(
      `${API_BASE}/${code}/forecast?metric=${metric}&days=${days}`,
      {},
      `branch:${code}:forecast:${metric}:${days}`,
      10 * 60_000
    ),

  /** GET /:code/recommendations */
  getRecommendations: code =>
    apiFetch(
      `${API_BASE}/${code}/recommendations`,
      {},
      `branch:${code}:recommendations`,
      5 * 60_000
    ),

  /** GET /:code/targets */
  getTargets: (code, year, month) => {
    const q = new URLSearchParams();
    if (year) q.set('year', year);
    if (month) q.set('month', month);
    return apiFetch(
      `${API_BASE}/${code}/targets?${q}`,
      {},
      `branch:${code}:targets:${year}:${month}`,
      10 * 60_000
    );
  },

  /** POST /:code/targets */
  setTargets: (code, data) => {
    clearCache(`branch:${code}:targets`);
    return apiFetch(`${API_BASE}/${code}/targets`, { method: 'POST', body: JSON.stringify(data) });
  },

  /** PUT /:code/settings */
  updateSettings: (code, data) => {
    clearCache(`branch:${code}`);
    return apiFetch(`${API_BASE}/${code}/settings`, { method: 'PUT', body: JSON.stringify(data) });
  },

  /** GET /:code/audit-log */
  getAuditLog: (code, page = 1, limit = 50, filters = {}) => {
    const q = new URLSearchParams({ page, limit, ...filters });
    return apiFetch(`${API_BASE}/${code}/audit-log?${q}`, {}, null, 0);
  },

  /** POST /:code/snapshot — trigger daily snapshot manually */
  triggerSnapshot: (code, data) =>
    apiFetch(`${API_BASE}/${code}/snapshot`, { method: 'POST', body: JSON.stringify(data) }),

  clearCache: code => clearCache(code ? `branch:${code}` : null),
};

// ─── Permissions ──────────────────────────────────────────────────────────────

const permissions = {
  /** GET /permissions/matrix */
  getMatrix: () =>
    apiFetch(`${API_BASE}/permissions/matrix`, {}, 'permissions:matrix', 30 * 60_000),
};

// ─── Exports ──────────────────────────────────────────────────────────────────

const BranchApiService = {
  hq,
  branch,
  permissions,
  clearCache,
  /** Invalidate everything (e.g., after major data change) */
  invalidateAll: () => cache.clear(),
};

export default BranchApiService;
export { hq, branch, permissions };
