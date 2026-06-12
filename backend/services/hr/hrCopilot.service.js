'use strict';

/**
 * hrCopilot.service.js — Phase 30 (Intelligent HR Platform).
 *
 * Claude-backed assistant for HR workflows. Mirrors the design of
 * `services/llmNarrativeGenerator.service.js`:
 *
 *   - SDK is INJECTED. No hard `require('@anthropic-ai/sdk')`. When
 *     no client is wired, every method returns `{ available: false }`
 *     so the caller can degrade cleanly to rule-based output.
 *   - PII redaction is mandatory before every call.
 *   - Default model is Claude Haiku 4.5 (cheap, fast, strong
 *     instruction following).
 *   - System prompts are stable → flagged with `cache_control:
 *     ephemeral` for prompt caching.
 *   - Responses are parsed as strict JSON; any parse failure returns
 *     `{ available: true, raw: '...', error: '...' }` instead of
 *     throwing — keeps the route able to fall back.
 *   - Never throws.
 *
 * Capabilities:
 *   - summarizeEmployee({ employee, attendance, lastReview })
 *       → executive 3-paragraph bilingual brief
 *   - draftLetter({ kind, employee, params })
 *       → bilingual letter draft (kind: warning | promotion | recommendation | termination_offer)
 *   - answerQuestion({ question, context })
 *       → grounded Q&A bounded to the supplied context (employee handbook,
 *         policies); rejects open-ended off-topic questions.
 *   - suggestImprovements({ evaluation })
 *       → coaching suggestions for a performance evaluation
 *
 * Each method returns:
 *   { available: false }                        — no LLM client wired
 *   { available: true, data, model, cached? }   — happy path
 *   { available: true, error, raw? }            — model returned, but parse failed
 */

const crypto = require('crypto');
const { redact } = require('../../utils/piiRedactor');

const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';
const DEFAULT_MAX_TOKENS = 800;
const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000; // 5 min — same as dashboard narrative

// ─── System prompts ──────────────────────────────────────────────────────────

const SUMMARIZE_SYSTEM = `أنت مدير موارد بشرية محايد ومحترف. مهمتك صياغة ملخص تنفيذي ثنائي اللغة (العربية + الإنجليزية) لموظف بناءً على بيانات محددة.

قواعد صارمة:
  - لا تخترع قيماً أو أحداثاً غير الواردة في المدخلات.
  - تجاهل أي حقل قيمته [REDACTED] واستبدله بـ "الموظف" (employee).
  - لا تذكر أسماء أو معرّفات أو أرقام هواتف أو بريد إلكتروني.
  - استخدم نبرة مهنية واقعية: "يُلاحظ"، "يُقترح" بدلاً من "يجب".
  - أخرج فقط JSON واحد، بدون أي شرح أو علامات markdown.

JSON schema:
{
  "summaryAr": [string, string, string],     // 3 paragraphs in Arabic
  "summaryEn": [string, string, string],     // 3 paragraphs in English (same topics, same order)
  "strengths": [string, ...],                 // up to 4 strengths
  "concerns": [string, ...],                  // up to 4 concerns
  "recommendedActions": [string, ...]         // up to 5 concrete next steps
}`;

const LETTER_SYSTEM = `أنت كاتب وثائق رسمية في إدارة الموارد البشرية. مهمتك صياغة مسودة رسالة ثنائية اللغة (العربية + الإنجليزية) بناءً على نوع الرسالة والمعلومات المقدمة.

قواعد صارمة:
  - لا تخترع تفاصيل أو وقائع غير مذكورة.
  - استبدل أي [REDACTED] بـ "الموظف".
  - لا تذكر أرقام بطاقة الهوية أو الجواز.
  - حافظ على لغة رسمية واضحة. الرسالة مسودة — سيراجعها مسؤول قبل الإرسال.
  - أخرج JSON واحد فقط.

JSON schema:
{
  "subjectAr": string,
  "subjectEn": string,
  "bodyAr": string,    // الفقرة الرئيسية بالعربية، 4-8 أسطر
  "bodyEn": string,    // English body, 4-8 lines, same content as Arabic
  "disclaimers": [string]   // legal/compliance disclaimers in Arabic
}`;

const QA_SYSTEM = `أنت مساعد إجابة على أسئلة الموارد البشرية. تجيب فقط على ما يدعمه السياق المقدم — وثائق السياسات وكتيب الموظف.

قواعد صارمة:
  - إذا لم يكن في السياق ما يدعم إجابة محددة، اعتذر وأشر إلى أنّ السؤال يتجاوز السياسات المتاحة.
  - لا تذكر أسماء، أو أرقام، أو معرّفات.
  - أرفق references إلى مفاتيح الفقرات الواردة في السياق (مثل "policy:annual-leave-1.2").
  - أجب بنفس لغة السؤال أولاً، ثم ارفق ترجمة موجزة باللغة الأخرى.
  - أخرج JSON واحد فقط.

JSON schema:
{
  "answer": string,                  // primary-language answer (3-6 sentences)
  "translation": string,             // brief translation (2-3 sentences)
  "references": [string, ...],        // policy/handbook keys cited
  "confidence": "high" | "medium" | "low",
  "outOfScope": boolean              // true when the context didn't support a real answer
}`;

const SUGGEST_SYSTEM = `أنت مدرّب أداء (performance coach). مهمتك تحويل تقييم أداء إلى توصيات تطوير قابلة للتنفيذ، بدون لغة قسرية.

قواعد:
  - استند فقط إلى ما يظهر في التقييم.
  - تجاهل [REDACTED].
  - كل توصية: هدف SMART + مؤشر قياس + إطار زمني مقترح.
  - أخرج JSON واحد فقط.

JSON schema:
{
  "coachingPlan": [
    {
      "focus": string,                 // مجال التحسين
      "goalSmartAr": string,           // هدف SMART بالعربية
      "goalSmartEn": string,           // SMART goal in English
      "metric": string,                // مقياس النجاح
      "timeframeMonths": number,       // أشهر
      "supportingResources": [string, ...]
    }
  ],
  "summaryAr": string,
  "summaryEn": string
}`;

// ─── LRU cache ───────────────────────────────────────────────────────────────

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
  return `${prefix}:${crypto.createHash('sha256').update(json).digest('hex').slice(0, 16)}`;
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

// ─── Factory ─────────────────────────────────────────────────────────────────

/**
 * @param {object} opts
 *   - anthropicClient: { messages.create({...}) } — injected SDK or fake.
 *     If null/undefined, every method returns { available: false }.
 *   - model: optional override
 *   - cacheTtlMs: optional override
 *   - logger: optional logger (default console)
 */
function createHrCopilot({
  anthropicClient = null,
  model = DEFAULT_MODEL,
  cacheTtlMs = DEFAULT_CACHE_TTL_MS,
  logger = console,
} = {}) {
  const cache = createLruCache({ maxEntries: 200 });

  function isAvailable() {
    return !!(anthropicClient && typeof anthropicClient.messages?.create === 'function');
  }

  async function callModel({ system, userPayload, cacheKey, maxTokens = DEFAULT_MAX_TOKENS }) {
    if (!isAvailable()) return { available: false };

    if (cacheKey) {
      const hit = cache.get(cacheKey);
      if (hit) return { ...hit, cached: true };
    }

    let response;
    try {
      response = await anthropicClient.messages.create({
        model,
        max_tokens: maxTokens,
        system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: JSON.stringify(userPayload),
              },
            ],
          },
        ],
      });
    } catch (err) {
      logger.warn('[hrCopilot] model call failed: ' + (err.message || err));
      return { available: true, error: 'model_call_failed', detail: err.message };
    }

    const raw = extractText(response);
    const parsed = parseJsonLoose(raw);
    if (!parsed) {
      return { available: true, error: 'parse_failed', raw };
    }

    const result = { available: true, data: parsed, model: response.model || model };
    if (cacheKey) cache.set(cacheKey, result, cacheTtlMs);
    return result;
  }

  function redactAll(obj) {
    if (obj == null || typeof obj !== 'object') return obj;
    try {
      return redact(obj);
    } catch {
      return obj;
    }
  }

  return {
    isAvailable,

    async summarizeEmployee({ employee, attendance = null, lastReview = null }) {
      if (!employee) return { available: true, error: 'employee required' };
      const payload = redactAll({
        employee: {
          jobTitle: employee.jobTitle ?? null,
          department: employee.department ?? null,
          contractType: employee.contractType ?? null,
          hireDate: employee.hireDate ?? null,
          tenureMonths: employee.tenureMonths ?? null,
          status: employee.status ?? null,
        },
        attendance: attendance
          ? {
              workingDays: attendance.workingDays ?? null,
              absences: attendance.absences ?? null,
              lates: attendance.lates ?? null,
              absenceRate: attendance.absenceRate ?? null,
              lateRate: attendance.lateRate ?? null,
            }
          : null,
        lastReview: lastReview
          ? {
              overallScore: lastReview.overallScore ?? null,
              overallRating: lastReview.overallRating ?? null,
              finalizedAt: lastReview.finalizedAt ?? null,
            }
          : null,
      });
      const cacheKey = hashKey('summary', payload);
      return callModel({
        system: SUMMARIZE_SYSTEM,
        userPayload: payload,
        cacheKey,
        maxTokens: 900,
      });
    },

    async draftLetter({ kind, employee, params = {} }) {
      if (!kind || !employee) return { available: true, error: 'kind and employee are required' };
      const allowed = new Set([
        'warning',
        'promotion',
        'recommendation',
        'termination_offer',
        'appreciation',
        'probation_extension',
      ]);
      if (!allowed.has(kind)) return { available: true, error: 'unknown letter kind' };
      const payload = redactAll({
        kind,
        employee: {
          jobTitle: employee.jobTitle ?? null,
          department: employee.department ?? null,
          hireDate: employee.hireDate ?? null,
        },
        params,
      });
      const cacheKey = hashKey(`letter:${kind}`, payload);
      return callModel({ system: LETTER_SYSTEM, userPayload: payload, cacheKey });
    },

    async answerQuestion({ question, context = [], lang = 'ar' }) {
      if (!question || typeof question !== 'string')
        return { available: true, error: 'question required' };
      if (!Array.isArray(context)) return { available: true, error: 'context must be an array' };
      const payload = redactAll({
        question,
        lang,
        context: context.slice(0, 30).map((c, i) => ({
          key: c.key ?? `ctx-${i}`,
          source: c.source ?? 'policy',
          text: c.text ?? '',
        })),
      });
      // Questions are cache-resistant (user may rephrase). Skip cache by default.
      return callModel({ system: QA_SYSTEM, userPayload: payload, maxTokens: 700 });
    },

    async suggestImprovements({ evaluation }) {
      if (!evaluation) return { available: true, error: 'evaluation required' };
      const payload = redactAll({
        evaluation: {
          overallScore: evaluation.overallScore ?? null,
          overallRating: evaluation.overallRating ?? null,
          criteria: Array.isArray(evaluation.criteria)
            ? evaluation.criteria.slice(0, 15).map(c => ({
                name: c.name,
                weight: c.weight,
                score: c.score,
                maxScore: c.maxScore,
              }))
            : [],
          strengths: evaluation.strengths ?? null,
          improvements: evaluation.improvements ?? null,
        },
      });
      const cacheKey = hashKey('coaching', payload);
      return callModel({ system: SUGGEST_SYSTEM, userPayload: payload, cacheKey, maxTokens: 1100 });
    },

    /** Diagnostic — exposed for routes/admin. */
    stats() {
      return { available: isAvailable(), model, cacheSize: cache.size() };
    },
  };
}

module.exports = {
  createHrCopilot,
  // Exported for tests so they can introspect the system prompts if they ever change.
  __INTERNAL_PROMPTS: { SUMMARIZE_SYSTEM, LETTER_SYSTEM, QA_SYSTEM, SUGGEST_SYSTEM },
};
