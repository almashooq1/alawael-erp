'use strict';

/**
 * llm-anomaly-detector.service.js — Wave 142.
 *
 * Mirrors the Wave 113 (Hikvision) anomaly detector pattern, applied
 * to the LLM telemetry stack from Waves 126/128/131/134. Pure rule
 * application over `llmRegistry.getAllTelemetry()` output — no I/O.
 *
 * Detection rules (5):
 *
 *   1. COST_SPIKE              cross-service costUsd in the latest
 *                              hour is ≥ N× the average over the
 *                              prior 24-hour rolling window
 *                              (default N=5). severity=critical.
 *
 *   2. FALLBACK_RATE_HIGH      cross-service fallbackRate ≥ threshold
 *                              (default 0.5). severity=warning.
 *                              Per-service variant emits if a single
 *                              service crosses 0.7.
 *
 *   3. FAILURE_RATE_HIGH       cross-service failureRate ≥ threshold
 *                              (default 0.3). severity=critical.
 *
 *   4. CACHE_INEFFECTIVE       per-service cacheHitRate < threshold
 *                              (default 0.05) with >100 calls.
 *                              severity=info (config issue, not
 *                              outage). Per-service so the kind
 *                              matches the broken service.
 *
 *   5. SERVICE_DOWN            a registered service has 0 LLM calls
 *                              in the window AND non-zero rejects.
 *                              severity=warning. Per-service.
 *
 * Output mirrors Wave 113 shape: `{id, kind, severity, summaryAr,
 * details, suggestedAction, deepLink, detectedAt}`. Anomaly ids are
 * deterministic — re-running the detector returns the same id for
 * the same underlying issue, so an alerts subsystem (or webhook)
 * can collapse duplicates without keeping its own state.
 *
 * Cache: 30-second TTL like Wave 113.
 */

const ANOMALY_KIND = Object.freeze({
  COST_SPIKE: 'llm-cost-spike',
  FALLBACK_RATE_HIGH: 'llm-fallback-rate-high',
  FAILURE_RATE_HIGH: 'llm-failure-rate-high',
  CACHE_INEFFECTIVE: 'llm-cache-ineffective',
  SERVICE_DOWN: 'llm-service-down',
});
const ANOMALY_KINDS = Object.freeze(Object.values(ANOMALY_KIND));

const ANOMALY_SEVERITY = Object.freeze({
  INFO: 'info',
  WARNING: 'warning',
  CRITICAL: 'critical',
});
const ANOMALY_SEVERITIES = Object.freeze(Object.values(ANOMALY_SEVERITY));

const ANOMALY_THRESHOLDS = Object.freeze({
  COST_SPIKE_MULTIPLIER: 5, // latest-hour cost ≥ Nx 24h average
  FALLBACK_RATE_CROSS: 0.5, // cross-service trigger
  FALLBACK_RATE_PER_SERVICE: 0.7, // per-service trigger
  FAILURE_RATE_CROSS: 0.3,
  CACHE_INEFFECTIVE_RATE: 0.05,
  CACHE_INEFFECTIVE_MIN_CALLS: 100,
  SERVICE_DOWN_MIN_REJECTS: 1,
});

const REASON = Object.freeze({
  DETECTOR_UNAVAILABLE: 'LLM_ANOMALY_DETECTOR_UNAVAILABLE',
});

function createLlmAnomalyDetector({
  llmRegistry = null,
  thresholds = ANOMALY_THRESHOLDS,
  cacheTtlMs = 30_000,
  logger = console,
  now = () => new Date(),
} = {}) {
  if (!llmRegistry || typeof llmRegistry.getAllTelemetry !== 'function') {
    throw new Error('llm-anomaly-detector: llmRegistry is required');
  }

  let cache = null;

  function _cacheGet() {
    if (!cache) return null;
    if (now().getTime() > cache.expiresAt) {
      cache = null;
      return null;
    }
    return cache.value;
  }

  function _cacheSet(value) {
    cache = { value, expiresAt: now().getTime() + cacheTtlMs };
  }

  function _clearCache() {
    cache = null;
  }

  function _makeAnomaly({ kind, severity, summaryAr, details, suggestedAction, dedupSeed }) {
    return {
      id: `${kind}:${dedupSeed}`,
      kind,
      severity,
      summaryAr,
      details,
      suggestedAction,
      deepLink: '/ai/parent-chatbot', // closest dashboard with LLM telemetry
      detectedAt: now().toISOString(),
    };
  }

  // ─── Rules ───────────────────────────────────────────────────────

  function _costSpike(latestHour, prior24h) {
    const items = [];
    const latest = (latestHour && latestHour.merged && latestHour.merged.totals.costUsd) || 0;
    const priorAvg = prior24h && prior24h.merged ? (prior24h.merged.totals.costUsd || 0) / 24 : 0;
    if (latest === 0 || priorAvg === 0) return items;
    const ratio = latest / priorAvg;
    if (ratio >= thresholds.COST_SPIKE_MULTIPLIER) {
      items.push(
        _makeAnomaly({
          kind: ANOMALY_KIND.COST_SPIKE,
          severity: ANOMALY_SEVERITY.CRITICAL,
          summaryAr: `تكلفة LLM في آخر ساعة (${latest.toFixed(4)}$) ${ratio.toFixed(1)}× المتوسّط`,
          details: {
            latestHourCostUsd: Number(latest.toFixed(6)),
            priorHourlyAvgUsd: Number(priorAvg.toFixed(6)),
            ratio: Number(ratio.toFixed(2)),
            threshold: thresholds.COST_SPIKE_MULTIPLIER,
          },
          suggestedAction:
            'افحص /llm-telemetry للتعرّف على الـ service صاحب الزيادة. إن تكرّر السبب نفسه (intent غامض)، أضف rule-based shortcut.',
          dedupSeed: 'global',
        })
      );
    }
    return items;
  }

  function _fallbackRateHigh(latestHour) {
    const items = [];
    if (!latestHour || !latestHour.merged) return items;
    const totals = latestHour.merged.totals;
    // Skip when traffic is too low to be meaningful (≤20 calls).
    if ((totals.calls || 0) < 20) return items;

    // Cross-service trigger
    if ((totals.fallbackRate || 0) >= thresholds.FALLBACK_RATE_CROSS) {
      items.push(
        _makeAnomaly({
          kind: ANOMALY_KIND.FALLBACK_RATE_HIGH,
          severity: ANOMALY_SEVERITY.WARNING,
          summaryAr: `معدّل fallback عبر الخدمات ${Math.round(totals.fallbackRate * 100)}% (≥ ${Math.round(thresholds.FALLBACK_RATE_CROSS * 100)}%)`,
          details: {
            fallbackRate: totals.fallbackRate,
            calls: totals.calls,
            threshold: thresholds.FALLBACK_RATE_CROSS,
          },
          suggestedAction:
            'تحقّق من حالة Anthropic API (status.anthropic.com). إن استمر، راجع ANTHROPIC_API_KEY + الـ rate limits.',
          dedupSeed: 'cross-service',
        })
      );
    }

    // Per-service trigger (higher threshold — one service can spike alone)
    const services = latestHour.services || {};
    for (const [name, svc] of Object.entries(services)) {
      if (!svc || !svc.ok || !svc.totals) continue;
      if ((svc.totals.calls || 0) < 20) continue;
      if ((svc.totals.fallbackRate || 0) >= thresholds.FALLBACK_RATE_PER_SERVICE) {
        items.push(
          _makeAnomaly({
            kind: ANOMALY_KIND.FALLBACK_RATE_HIGH,
            severity: ANOMALY_SEVERITY.WARNING,
            summaryAr: `الخدمة ${name}: fallback ${Math.round(svc.totals.fallbackRate * 100)}%`,
            details: {
              service: name,
              fallbackRate: svc.totals.fallbackRate,
              calls: svc.totals.calls,
            },
            suggestedAction: `راجع سجلات ${name} — قد تكون المشكلة في API key أو في رفض LLM لتنسيق الاستجابة.`,
            dedupSeed: name,
          })
        );
      }
    }
    return items;
  }

  function _failureRateHigh(latestHour) {
    const items = [];
    if (!latestHour || !latestHour.merged) return items;
    const totals = latestHour.merged.totals;
    if ((totals.calls || 0) < 20) return items;
    if ((totals.failureRate || 0) >= thresholds.FAILURE_RATE_CROSS) {
      items.push(
        _makeAnomaly({
          kind: ANOMALY_KIND.FAILURE_RATE_HIGH,
          severity: ANOMALY_SEVERITY.CRITICAL,
          summaryAr: `معدّل فشل LLM ${Math.round(totals.failureRate * 100)}% — يفوق العتبة`,
          details: {
            failureRate: totals.failureRate,
            failures: totals.failures,
            calls: totals.calls,
            threshold: thresholds.FAILURE_RATE_CROSS,
          },
          suggestedAction:
            'افحص byReason في /llm-telemetry للتعرّف على نمط الفشل (TIMEOUT vs INVALID_RESPONSE vs CLIENT_THREW).',
          dedupSeed: 'global',
        })
      );
    }
    return items;
  }

  function _cacheIneffective(window) {
    const items = [];
    if (!window || !window.services) return items;
    for (const [name, svc] of Object.entries(window.services)) {
      if (!svc || !svc.ok || !svc.totals) continue;
      const t = svc.totals;
      if ((t.calls || 0) < thresholds.CACHE_INEFFECTIVE_MIN_CALLS) continue;
      if ((t.cacheHitRate || 0) < thresholds.CACHE_INEFFECTIVE_RATE) {
        items.push(
          _makeAnomaly({
            kind: ANOMALY_KIND.CACHE_INEFFECTIVE,
            severity: ANOMALY_SEVERITY.INFO,
            summaryAr: `الخدمة ${name}: cache hit ${Math.round(t.cacheHitRate * 100)}% فقط (${t.calls} مكالمة)`,
            details: {
              service: name,
              cacheHitRate: t.cacheHitRate,
              calls: t.calls,
              threshold: thresholds.CACHE_INEFFECTIVE_RATE,
            },
            suggestedAction:
              'مراجعة دالة normalizeText للتأكد من أن الرسائل المتكرّرة فعليًا تشترك في cache key.',
            dedupSeed: name,
          })
        );
      }
    }
    return items;
  }

  function _serviceDown(window) {
    const items = [];
    if (!window || !window.services) return items;
    for (const [name, svc] of Object.entries(window.services)) {
      if (!svc || !svc.ok || !svc.totals) continue;
      const t = svc.totals;
      // Definition: 0 successful LLM calls but ≥1 reject in the
      // window. A service that simply isn't getting traffic isn't
      // "down" — we need active rejection as evidence the upstream
      // is failing.
      if ((t.llmCalls || 0) === 0 && (t.rejects || 0) >= thresholds.SERVICE_DOWN_MIN_REJECTS) {
        items.push(
          _makeAnomaly({
            kind: ANOMALY_KIND.SERVICE_DOWN,
            severity: ANOMALY_SEVERITY.WARNING,
            summaryAr: `الخدمة ${name}: 0 مكالمات LLM + ${t.rejects} رفض في النافذة`,
            details: {
              service: name,
              llmCalls: 0,
              rejects: t.rejects,
            },
            suggestedAction: `الخدمة ${name} ترفض كل المكالمات قبل الوصول للـ LLM. تحقّق من تواجد ANTHROPIC_API_KEY + من حالة الـ client.`,
            dedupSeed: name,
          })
        );
      }
    }
    return items;
  }

  // ─── Public ──────────────────────────────────────────────────────

  function detect({ skipCache = false } = {}) {
    if (!skipCache) {
      const hit = _cacheGet();
      if (hit) return hit;
    }

    let latestHour;
    let prior24h;
    try {
      const nowMs = now().getTime();
      const lastHourSince = new Date(nowMs - 3600 * 1000).toISOString();
      const prior24hSince = new Date(nowMs - 25 * 3600 * 1000).toISOString();
      latestHour = llmRegistry.getAllTelemetry({ since: lastHourSince });
      prior24h = llmRegistry.getAllTelemetry({ since: prior24hSince });
    } catch (err) {
      logger.warn && logger.warn(`[llm-anomaly] registry threw: ${err.message}`);
      return {
        ok: false,
        reason: REASON.DETECTOR_UNAVAILABLE,
        message: err.message,
      };
    }

    const items = [
      ..._costSpike(latestHour, prior24h),
      ..._fallbackRateHigh(latestHour),
      ..._failureRateHigh(latestHour),
      ..._cacheIneffective(latestHour),
      ..._serviceDown(latestHour),
    ];

    const sevRank = { critical: 0, warning: 1, info: 2 };
    items.sort((a, b) => {
      const sa = sevRank[a.severity] ?? 99;
      const sb = sevRank[b.severity] ?? 99;
      if (sa !== sb) return sa - sb;
      return a.kind.localeCompare(b.kind);
    });

    const value = {
      ok: true,
      generatedAt: now().toISOString(),
      items,
      summary: {
        total: items.length,
        critical: items.filter(a => a.severity === ANOMALY_SEVERITY.CRITICAL).length,
        warning: items.filter(a => a.severity === ANOMALY_SEVERITY.WARNING).length,
        info: items.filter(a => a.severity === ANOMALY_SEVERITY.INFO).length,
      },
    };
    _cacheSet(value);
    return value;
  }

  return { detect, _clearCache };
}

module.exports = {
  createLlmAnomalyDetector,
  ANOMALY_KIND,
  ANOMALY_KINDS,
  ANOMALY_SEVERITY,
  ANOMALY_SEVERITIES,
  ANOMALY_THRESHOLDS,
  REASON,
};
