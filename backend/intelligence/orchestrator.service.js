'use strict';

/**
 * orchestrator.service.js — Wave 20 (Intelligence Layer).
 *
 * Periodic runner for the intelligence generators. Each tick:
 *
 *   1. For each registered generator, asks its data-loader to build
 *      the ctx the generator's evaluate() needs (beneficiaries list,
 *      KPI series, etc.). The loader is INJECTED so the orchestrator
 *      stays Mongo-free + test-isolated.
 *   2. Calls generator.evaluate(ctx) → Array<InsightPayload>.
 *   3. Passes each payload through insightsService.upsertInsight().
 *      That enforces the 5 G-guarantees + (generatorId, inputDigest)
 *      dedup, so the same condition doesn't spawn duplicates.
 *   4. Records per-generator metrics (success/skipped/failed) into a
 *      lightweight in-memory counter; emits a tick summary.
 *
 * Why a separate orchestrator (vs. baking the schedule into each
 * generator):
 *   - Generators stay pure functions; no setInterval, no DB hits.
 *   - One scheduler tunes the whole layer (one tick = N generators).
 *   - Skip/disable a generator by removing it from the registered set
 *     at boot (env flag) without touching its source.
 *
 * The orchestrator IS the layer's "boot" — `intelligence/bootstrap.js`
 * (Wave 21) wires it into app.js similar to AlertEngine.
 */

const DefaultInsightsService = require('./insights.service');

const DEFAULT_TICK_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
const DEFAULT_MAX_PER_GENERATOR = 500; // safety bound on payloads/tick

function nowDate() {
  return new Date();
}

/**
 * @param {object} opts
 *   - generators:        Array<{ id, kind, evaluate(ctx) }>
 *   - dataLoaders:       Record<generatorId, async () => ctx>
 *                        Each loader returns the ctx for ONE generator.
 *                        Missing loaders = "skip this generator".
 *   - insightsService:   defaults to createInsightsService(...)
 *   - logger:            console-compatible
 *   - now:               clock injection
 *   - maxPerGenerator:   safety cap on payloads emitted per generator
 *                        per tick (default 500)
 */
function createOrchestrator({
  generators = [],
  dataLoaders = {},
  insightsService = null,
  logger = console,
  now = nowDate,
  maxPerGenerator = DEFAULT_MAX_PER_GENERATOR,
} = {}) {
  if (!insightsService) {
    insightsService = DefaultInsightsService.createInsightsService({ logger });
  }

  // Per-generator running counters — visible via `getMetrics()`.
  const metrics = new Map(); // generatorId → { runs, successes, skipped, failures, lastRunAt, lastErr }

  function recordMetric(generatorId, field, delta = 1) {
    const m = metrics.get(generatorId) || {
      runs: 0,
      successes: 0,
      skipped: 0,
      failures: 0,
      lastRunAt: null,
      lastErr: null,
    };
    m[field] = (m[field] || 0) + delta;
    metrics.set(generatorId, m);
    return m;
  }

  /**
   * Run one generator through a single tick. Catches its own errors
   * so a single failing generator doesn't break the whole tick.
   *
   * Returns { generatorId, emitted, deduped, failures, error }.
   */
  async function runOne(generator) {
    const generatorId = generator.id;
    const loader = dataLoaders[generatorId];
    const result = {
      generatorId,
      emitted: 0,
      deduped: 0,
      failures: 0,
      skipped: false,
      error: null,
    };

    if (!loader) {
      // No loader registered = silently skip (acceptable for staged
      // rollouts where the generator exists but the data wiring isn't
      // there yet).
      result.skipped = true;
      recordMetric(generatorId, 'skipped');
      return result;
    }

    const m = recordMetric(generatorId, 'runs');
    m.lastRunAt = now();

    let ctx;
    try {
      ctx = await loader();
    } catch (loaderErr) {
      result.error = `loader: ${loaderErr.message}`;
      result.failures = 1;
      recordMetric(generatorId, 'failures');
      m.lastErr = result.error;
      logger.warn &&
        logger.warn(`[intelligence] ${generatorId} loader failed: ${loaderErr.message}`);
      return result;
    }

    let payloads;
    try {
      payloads = await generator.evaluate(ctx || {});
    } catch (evalErr) {
      result.error = `evaluate: ${evalErr.message}`;
      result.failures = 1;
      recordMetric(generatorId, 'failures');
      m.lastErr = result.error;
      logger.warn &&
        logger.warn(`[intelligence] ${generatorId} evaluate failed: ${evalErr.message}`);
      return result;
    }

    if (!Array.isArray(payloads) || payloads.length === 0) {
      // No insights this tick — that's normal, not an error.
      recordMetric(generatorId, 'successes');
      return result;
    }

    // Apply safety cap.
    const bounded = payloads.slice(0, maxPerGenerator);
    if (bounded.length < payloads.length) {
      logger.warn &&
        logger.warn(
          `[intelligence] ${generatorId} produced ${payloads.length} payloads; capped at ${maxPerGenerator}`
        );
    }

    // Upsert each; aggregate counters.
    for (const payload of bounded) {
      try {
        const out = await insightsService.upsertInsight(payload);
        if (out.ok) {
          if (out.deduped || out.noop) {
            result.deduped += 1;
          } else {
            result.emitted += 1;
          }
        } else {
          result.failures += 1;
        }
      } catch (upsertErr) {
        result.failures += 1;
        m.lastErr = `upsert: ${upsertErr.message}`;
      }
    }

    recordMetric(generatorId, 'successes');
    return result;
  }

  /**
   * Run all registered generators once. Errors in any single
   * generator are isolated (caught + counted, never thrown).
   *
   * Returns { tickAt, generatorsRun, emitted, deduped, failures, perGenerator }.
   */
  async function runTick() {
    const tickAt = now();
    const perGenerator = [];
    let emitted = 0;
    let deduped = 0;
    let failures = 0;
    let generatorsRun = 0;

    for (const g of generators) {
      if (!g || typeof g.evaluate !== 'function') continue;
      const r = await runOne(g);
      perGenerator.push(r);
      if (!r.skipped) generatorsRun += 1;
      emitted += r.emitted;
      deduped += r.deduped;
      failures += r.failures;
    }

    const summary = { tickAt, generatorsRun, emitted, deduped, failures, perGenerator };
    if (emitted || failures) {
      logger.info &&
        logger.info(
          `[intelligence] tick: generators=${generatorsRun}, emitted=${emitted}, deduped=${deduped}, failures=${failures}`
        );
    }
    return summary;
  }

  /**
   * Run a single named generator on demand. Useful for cron triggers
   * and admin "run now" controls. Returns the same shape as runOne.
   */
  async function runGenerator(generatorId) {
    const g = generators.find(x => x && x.id === generatorId);
    if (!g) return { generatorId, error: 'GENERATOR_NOT_FOUND', failures: 1 };
    return runOne(g);
  }

  function getMetrics() {
    const out = {};
    for (const [id, m] of metrics.entries()) {
      out[id] = { ...m };
    }
    return out;
  }

  function listGenerators() {
    return generators.map(g => ({
      id: g.id,
      kind: g.kind,
      category: g.category,
      scope: g.scope,
      hasLoader: typeof dataLoaders[g.id] === 'function',
    }));
  }

  return {
    runTick,
    runGenerator,
    runOne,
    getMetrics,
    listGenerators,
  };
}

module.exports = { createOrchestrator };
