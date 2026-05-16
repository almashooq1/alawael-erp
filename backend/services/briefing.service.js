'use strict';

/**
 * briefing.service.js — Wave 4 (Premium AI Layer).
 *
 * Generates two operator-facing AI artifacts on top of the existing
 * alerts + KPI machinery:
 *
 *   1. Morning Briefing — a bilingual, role-aware 5-bullet summary
 *      of yesterday's outcomes and today's priorities. Refreshed at
 *      most once per 12h per (role, branchId) cache slot.
 *
 *   2. Next Best Action — a ranked list of 3-5 concrete actions the
 *      operator can take right now, derived from active alerts and
 *      red-flag KPIs. Refreshed at most once per 30min per slot.
 *
 * Designed in lock-step with the existing AI services so we don't
 * fork prompt-caching, redaction, or graceful-degradation patterns:
 *
 *   - SDK is INJECTED (same as hrCopilot.service.js + llmNarrative).
 *     When `anthropicClient` is null, every method returns
 *     { available: false } and the route falls back to a rule-based
 *     digest. Wave 3's 18 alert rules already produce structured
 *     findings — those are the rule-based fallback.
 *   - PII redactor (utils/piiRedactor) runs on every payload.
 *   - Default model: Claude Haiku 4.5 (same as siblings).
 *   - System prompts flagged `cache_control: ephemeral` for prompt
 *     caching across requests.
 *   - Strict JSON output, soft fail on parse errors.
 *   - Never throws.
 */

const crypto = require('crypto');
const { redact } = require('../utils/piiRedactor');

const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';

// Briefings are mostly static through the day, so an aggressive TTL
// keeps the model bill down. Next-best-action refreshes faster
// because alerts churn faster than KPIs.
const MORNING_TTL_MS = 12 * 60 * 60 * 1000; // 12h
const NBA_TTL_MS = 30 * 60 * 1000; // 30min

// ─── System prompts ──────────────────────────────────────────────

const MORNING_SYSTEM = `أنت مساعد تنفيذي لمنصة إدارة مراكز التأهيل. مهمتك إنتاج "إيجاز الصباح" بـ 5 نقاط بالعربية + الإنجليزية، مخصّصاً لدور المستخدم وفرعه.

قواعد صارمة:
  - لا تخترع أرقاماً أو حوادث غير الواردة في المدخلات.
  - تجاهل أي [REDACTED] واستبدله بـ "أحد المستفيدين/الموظفين".
  - لا تذكر أسماء أو معرفات.
  - استخدم نبرة مهنية واضحة (يُلاحظ، يستدعي الانتباه).
  - رتّب النقاط من الأعلى أولوية للأدنى.
  - أخرج JSON واحد فقط، بدون markdown.

JSON schema:
{
  "headlineAr": string,               // عنوان موجز (≤ 80 حرف)
  "headlineEn": string,
  "bulletsAr": [string, ...],          // 3-5 نقاط أولوية (1-2 سطر لكل نقطة)
  "bulletsEn": [string, ...],          // same count + order
  "focusAr": string,                   // الجملة الواحدة: "اليوم ركّز على..."
  "focusEn": string,
  "confidence": "high" | "medium" | "low"
}`;

const NBA_SYSTEM = `أنت مستشار عمليات. مهمتك تحويل قائمة التنبيهات والمؤشرات النشطة إلى 3-5 إجراءات يجب على المستخدم القيام بها الآن، مرتبة حسب الأثر.

قواعد:
  - الإجراء يجب أن يكون قابلاً للتنفيذ خلال ≤ 30 دقيقة (افتح، راجع، اتصل، أنشئ تذكرة...).
  - استند فقط إلى ما يظهر في المدخلات.
  - لا تذكر أسماء أو معرّفات حقيقية — استخدم وصف الكيان (مستفيد، موظف، فاتورة).
  - لكل إجراء: عنوان مختصر، سبب موجز، رابط داخلي (deepLink) إن أمكن.
  - أخرج JSON واحد فقط.

JSON schema:
{
  "actions": [
    {
      "titleAr": string,
      "titleEn": string,
      "reasonAr": string,            // why this matters now (1 sentence)
      "reasonEn": string,
      "urgency": "now" | "today" | "this-week",
      "deepLink": string | null,     // internal path like /quality/incidents/abc
      "category": "clinical" | "compliance" | "financial" | "hr" | "operational" | "quality"
    }
  ]
}`;

// ─── LRU + helpers (mirror of hrCopilot.service.js) ──────────────

function createLruCache({ maxEntries = 100 } = {}) {
  const store = new Map();
  return {
    get(key) {
      const e = store.get(key);
      if (!e) return undefined;
      if (e.expiresAt < Date.now()) {
        store.delete(key);
        return undefined;
      }
      // Re-insert to maintain LRU order.
      store.delete(key);
      store.set(key, e);
      return e.value;
    },
    set(key, value, ttl) {
      store.set(key, { value, expiresAt: Date.now() + ttl });
      while (store.size > maxEntries) {
        const oldest = store.keys().next().value;
        store.delete(oldest);
      }
    },
    clear() {
      store.clear();
    },
    size() {
      return store.size;
    },
  };
}

function hashKey(prefix, payload) {
  const json = JSON.stringify(payload);
  return `${prefix}:${crypto.createHash('sha1').update(json).digest('hex').slice(0, 16)}`;
}

function extractText(response) {
  if (!response) return null;
  if (typeof response === 'string') return response;
  if (Array.isArray(response.content)) {
    const block = response.content.find(b => b && b.type === 'text' && typeof b.text === 'string');
    return block ? block.text : null;
  }
  if (typeof response.text === 'string') return response.text;
  return null;
}

function parseJsonLoose(raw) {
  if (typeof raw !== 'string') return null;
  const trimmed = raw
    .trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

function redactAll(obj) {
  if (obj == null || typeof obj !== 'object') return obj;
  try {
    return redact(obj);
  } catch {
    return obj;
  }
}

// ─── Rule-based fallback (used when LLM disabled) ────────────────

/**
 * Produce a deterministic, non-LLM briefing from the supplied
 * context. Used as the fallback whenever the LLM call fails or
 * isn't configured. Keeps the UX shape identical so the front-end
 * doesn't need to know which path produced the output.
 */
function fallbackMorning({ role, alerts = [], kpis = [] }) {
  const critical = alerts.filter(a => a.severity === 'critical' || a.severity === 'high');
  const warnings = alerts.filter(a => a.severity === 'warning');
  const redKpis = kpis.filter(k => k.classification === 'red');
  const amberKpis = kpis.filter(k => k.classification === 'amber');

  const bulletsAr = [];
  const bulletsEn = [];

  if (critical.length > 0) {
    bulletsAr.push(`${critical.length} تنبيه حرج يستدعي مراجعة فورية.`);
    bulletsEn.push(`${critical.length} critical alert(s) requiring immediate review.`);
  }
  if (redKpis.length > 0) {
    bulletsAr.push(`${redKpis.length} مؤشر/مؤشرات خارج المستهدف (منطقة حمراء).`);
    bulletsEn.push(`${redKpis.length} KPI(s) breaching target (red zone).`);
  }
  if (warnings.length > 0) {
    bulletsAr.push(`${warnings.length} تحذير قيد المراقبة.`);
    bulletsEn.push(`${warnings.length} warning(s) under watch.`);
  }
  if (amberKpis.length > 0) {
    bulletsAr.push(`${amberKpis.length} مؤشر في المنطقة الكهرمانية — ترصد قبل أن يصبح أحمر.`);
    bulletsEn.push(`${amberKpis.length} amber KPI(s) — watch before they go red.`);
  }
  if (bulletsAr.length === 0) {
    bulletsAr.push('لا توجد تنبيهات أو مؤشرات حرجة هذا الصباح.');
    bulletsEn.push('No critical alerts or KPIs flagged this morning.');
  }

  return {
    headlineAr:
      critical.length > 0 ? `صباح بـ ${critical.length} تنبيه حرج` : 'صباح هادئ — لا تنبيهات حرجة',
    headlineEn:
      critical.length > 0
        ? `${critical.length} critical alert(s) this morning`
        : 'Quiet morning — no critical alerts',
    bulletsAr,
    bulletsEn,
    focusAr:
      critical.length > 0
        ? 'ابدأ بمعالجة التنبيهات الحرجة قبل أي عمل آخر.'
        : 'راجع المؤشرات الكهرمانية لمنع تدهورها.',
    focusEn:
      critical.length > 0
        ? 'Address critical alerts first — before anything else.'
        : 'Review amber KPIs to prevent deterioration.',
    confidence: 'medium',
    source: 'rule',
    role,
  };
}

function fallbackNextBestActions({ role, alerts = [] }) {
  // Rank by severity, then by first-fired-at (oldest first).
  const rank = { critical: 0, high: 1, warning: 2, info: 3 };
  const sorted = alerts.slice().sort((a, b) => {
    const ra = rank[a.severity] ?? 9;
    const rb = rank[b.severity] ?? 9;
    if (ra !== rb) return ra - rb;
    return (a.firstFiredAt || 0) - (b.firstFiredAt || 0);
  });
  const top = sorted.slice(0, 5);

  return {
    actions: top.map(a => ({
      titleAr: `راجع: ${a.headlineAr || a.ruleId || 'تنبيه'}`,
      titleEn: `Review: ${a.headlineEn || a.ruleId || 'alert'}`,
      reasonAr: `${a.severity === 'critical' ? 'حرج' : a.severity === 'warning' ? 'تحذير' : 'متابعة'} — يستلزم اتخاذ إجراء.`,
      reasonEn: `${a.severity === 'critical' ? 'Critical' : a.severity === 'warning' ? 'Warning' : 'Watch'} — action required.`,
      urgency: a.severity === 'critical' || a.severity === 'high' ? 'now' : 'today',
      deepLink: a.deepLink || null,
      category: a.category || 'operational',
    })),
    source: 'rule',
    role,
  };
}

// ─── Factory ─────────────────────────────────────────────────────

/**
 * @param {object} opts
 *   - anthropicClient: { messages.create({...}) } | null (injected)
 *   - model:         optional Claude model override
 *   - logger:        console-compatible logger
 */
function createBriefingService({
  anthropicClient = null,
  model = DEFAULT_MODEL,
  logger = console,
} = {}) {
  const morningCache = createLruCache({ maxEntries: 50 });
  const nbaCache = createLruCache({ maxEntries: 100 });

  function isAvailable() {
    return !!(anthropicClient && typeof anthropicClient.messages?.create === 'function');
  }

  async function callModel({ system, userPayload, maxTokens }) {
    let response;
    try {
      response = await anthropicClient.messages.create({
        model,
        max_tokens: maxTokens,
        system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
        messages: [
          {
            role: 'user',
            content: [{ type: 'text', text: JSON.stringify(userPayload) }],
          },
        ],
      });
    } catch (err) {
      logger.warn('[briefing] model call failed: ' + (err.message || err));
      return null;
    }
    const raw = extractText(response);
    const parsed = parseJsonLoose(raw);
    return parsed ? { parsed, modelUsed: response.model || model } : null;
  }

  /**
   * @param {object} ctx
   *   - role:     string (drives prompt context)
   *   - branchId: string | null
   *   - alerts:   Array<{ severity, ruleId, headlineAr?, headlineEn?, ... }>
   *   - kpis:     Array<{ id, classification, value, target, direction }>
   */
  async function morningBriefing(ctx = {}) {
    const role = ctx.role || 'unknown';
    const branchId = ctx.branchId || 'all';
    const alerts = Array.isArray(ctx.alerts) ? ctx.alerts : [];
    const kpis = Array.isArray(ctx.kpis) ? ctx.kpis : [];

    // Day bucket — keep cache keys stable across the morning so
    // multiple operators hitting the endpoint share a single LLM
    // call. Day-of-year is sufficient granularity (briefings are
    // morning-only).
    const dayBucket = new Date().toISOString().slice(0, 10);
    const cacheKey = hashKey('morning', { role, branchId, dayBucket });
    const hit = morningCache.get(cacheKey);
    if (hit) return { ...hit, cached: true };

    const payload = redactAll({
      role,
      branchId,
      dateIso: dayBucket,
      alertsSummary: alerts.slice(0, 25).map(a => ({
        severity: a.severity,
        ruleId: a.ruleId,
        category: a.category,
        headlineAr: a.headlineAr || null,
        headlineEn: a.headlineEn || null,
        firstFiredAt: a.firstFiredAt || null,
      })),
      kpiSnapshot: kpis.slice(0, 20).map(k => ({
        id: k.id,
        classification: k.classification,
        delta: k.delta,
        target: k.target,
        direction: k.direction,
        unit: k.unit,
      })),
    });

    if (!isAvailable()) {
      const result = {
        available: true,
        source: 'rule',
        data: fallbackMorning({ role, alerts, kpis }),
      };
      morningCache.set(cacheKey, result, MORNING_TTL_MS);
      return result;
    }

    const llm = await callModel({
      system: MORNING_SYSTEM,
      userPayload: payload,
      maxTokens: 700,
    });

    if (!llm) {
      // Soft-fall to rule-based — keeps the UX identical even when
      // the model trips on a malformed response.
      const result = {
        available: true,
        source: 'rule',
        data: fallbackMorning({ role, alerts, kpis }),
      };
      morningCache.set(cacheKey, result, MORNING_TTL_MS);
      return result;
    }

    const result = {
      available: true,
      source: 'llm',
      data: { ...llm.parsed, role, source: 'llm' },
      model: llm.modelUsed,
    };
    morningCache.set(cacheKey, result, MORNING_TTL_MS);
    return result;
  }

  /**
   * @param {object} ctx — same shape as morningBriefing
   */
  async function nextBestActions(ctx = {}) {
    const role = ctx.role || 'unknown';
    const branchId = ctx.branchId || 'all';
    const alerts = Array.isArray(ctx.alerts) ? ctx.alerts : [];

    const cacheKey = hashKey('nba', {
      role,
      branchId,
      alertIds: alerts
        .slice(0, 25)
        .map(a => `${a.ruleId}::${a.key || a.correlationKey || ''}`)
        .sort(),
    });
    const hit = nbaCache.get(cacheKey);
    if (hit) return { ...hit, cached: true };

    if (!isAvailable() || alerts.length === 0) {
      const result = {
        available: true,
        source: 'rule',
        data: fallbackNextBestActions({ role, alerts }),
      };
      nbaCache.set(cacheKey, result, NBA_TTL_MS);
      return result;
    }

    const payload = redactAll({
      role,
      branchId,
      alerts: alerts.slice(0, 25).map(a => ({
        severity: a.severity,
        ruleId: a.ruleId,
        category: a.category,
        headlineAr: a.headlineAr || null,
        headlineEn: a.headlineEn || null,
        firstFiredAt: a.firstFiredAt || null,
        deepLink: a.deepLink || null,
      })),
    });

    const llm = await callModel({
      system: NBA_SYSTEM,
      userPayload: payload,
      maxTokens: 600,
    });

    if (!llm || !llm.parsed || !Array.isArray(llm.parsed.actions)) {
      const result = {
        available: true,
        source: 'rule',
        data: fallbackNextBestActions({ role, alerts }),
      };
      nbaCache.set(cacheKey, result, NBA_TTL_MS);
      return result;
    }

    const result = {
      available: true,
      source: 'llm',
      data: { ...llm.parsed, role, source: 'llm' },
      model: llm.modelUsed,
    };
    nbaCache.set(cacheKey, result, NBA_TTL_MS);
    return result;
  }

  function stats() {
    return {
      available: isAvailable(),
      model,
      morningCacheSize: morningCache.size(),
      nbaCacheSize: nbaCache.size(),
    };
  }

  function clearCache() {
    morningCache.clear();
    nbaCache.clear();
  }

  return {
    isAvailable,
    morningBriefing,
    nextBestActions,
    stats,
    clearCache,
  };
}

module.exports = {
  createBriefingService,
  // Exposed for tests + fallback consumers in routes that want
  // identical output without the LLM round-trip.
  _internal: { fallbackMorning, fallbackNextBestActions },
};
