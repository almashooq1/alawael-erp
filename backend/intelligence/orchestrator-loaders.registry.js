'use strict';

/**
 * orchestrator-loaders.registry.js — Wave 28.
 *
 * Each Intelligence generator needs a different ctx shape on every
 * tick. This registry is the bridge — it maps a generator id to a
 * loader factory: `(deps) => async () => ctx`.
 *
 * Why a registry (not inline in app.js):
 *   • Loaders compose with Mongoose models + services injected at
 *     boot, so they're testable in isolation
 *   • Adding a new generator means adding a loader factory here, not
 *     touching app.js
 *   • Loaders can be DISABLED individually (return `null` → scheduler
 *     skips, no crash)
 *
 * Wave 28 ships one REFERENCE loader (data-quality.v1) + stub loaders
 * for the other 5 that return empty results. Wave 29+ will wire the
 * real loaders one-by-one as each domain has its data ready.
 *
 * Loader contract:
 *   loaderFactory(deps) → async () => ctx
 *
 *   `deps` includes whatever the loader needs (mongoose models, the
 *   DQ registry, etc.) — injected at boot so the loader is pure.
 *
 *   The returned function takes no args and returns the ctx the
 *   generator's evaluate() expects.
 */

// ─── Reference loader: data-quality.v1 ─────────────────────────
// data-quality generator wants `{ snapshots: [...] }` where each
// snapshot has the per-dataset diagnostic numbers. In a real
// deployment, the data-quality service would fan out to each
// dataset's source-of-truth collection and tally the numbers.
//
// For now we ship a minimal loader: it reads the registered dataset
// catalog and emits a "synthetic clean" snapshot for each — useful
// as a smoke check the scheduler is wired, but doesn't surface real
// quality issues until each dataset gets its own data tally (Wave 29).

function dataQualityLoader({ dqRegistry, logger = console }) {
  void logger;
  if (!dqRegistry) return null;
  return async () => {
    const now = new Date();
    const snapshots = dqRegistry.listRegisteredDatasets().map(datasetId => {
      const cfg = dqRegistry.getDatasetConfig(datasetId);
      // Synthetic clean snapshot — Wave 29 replaces this with real
      // per-dataset queries.
      return {
        datasetId,
        lastRefreshAt: now,
        arrivalLatencyMs: Math.min(cfg.slaMs || 30_000, 5_000),
        sampleSize: 100,
        presentCount: 100,
        ruleViolations: 0,
        crossSourceDelta: 0,
        duplicates: 0,
        sources: cfg.sources,
      };
    });
    return { now, snapshots };
  };
}

// ─── Stub loaders for the other 5 generators ───────────────────
// Each returns the minimum-empty ctx its generator expects. They
// fire on cadence (the scheduler doesn't know they're stubs) but
// the generators emit zero payloads because their input is empty.
//
// As each domain's data is wired, replace its stub with a real
// loader in this file.

function careGapStub() {
  return async () => ({ beneficiaries: [] });
}

function anomalyStub() {
  return async () => ({ series: [] });
}

function trendDeviationStub() {
  return async () => ({ series: [] });
}

function endOfDayStub() {
  return async () => ({ summaries: [] });
}

function executiveDigestStub() {
  return async () => ({ comparisons: [] });
}

// ─── Registry ──────────────────────────────────────────────────

/**
 * Build the dataLoaders map the Wave-20 orchestrator expects:
 *   { [generatorId]: async () => ctx }
 *
 * Pass `realLoaders` to override stubs with actual implementations.
 * Anything not in `realLoaders` falls through to the stub.
 *
 * Returns { loaders, stubbedGeneratorIds[] } so the boot can log
 * which generators are running stubs (and therefore won't surface
 * real data yet).
 */
function buildLoaders({ deps = {}, realLoaders = {}, logger = console } = {}) {
  void logger;

  const reference = {
    'data-quality.v1': dataQualityLoader(deps),
  };

  const stubs = {
    'care-gap.v1': careGapStub(),
    'anomaly.v1': anomalyStub(),
    'trend-deviation.v1': trendDeviationStub(),
    'end-of-day.v1': endOfDayStub(),
    'executive-digest.v1': executiveDigestStub(),
  };

  const merged = { ...stubs, ...reference, ...realLoaders };
  const stubbedGeneratorIds = Object.keys(stubs).filter(
    gid => !realLoaders[gid] && !reference[gid]
  );

  // Drop any entries that are null (loader factory said "I can't run
  // without my deps") — scheduler will skip those generators.
  for (const k of Object.keys(merged)) {
    if (merged[k] == null) delete merged[k];
  }

  return { loaders: merged, stubbedGeneratorIds };
}

module.exports = {
  buildLoaders,
  dataQualityLoader,
  _stubs: {
    careGapStub,
    anomalyStub,
    trendDeviationStub,
    endOfDayStub,
    executiveDigestStub,
  },
};
