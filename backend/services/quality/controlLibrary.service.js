'use strict';

/**
 * controlLibrary.service.js — Phase 13 Commit 4 (4.0.58).
 *
 * Owns the QualityControl lifecycle: seeding from the registry,
 * recording test runs, deprecating / re-activating, and serving
 * snapshots to the executive dashboard (Phase 13 Commit 9).
 *
 * DI:
 *
 *   createControlLibraryService({
 *     model,               // QualityControl (required)
 *     autoCheckRunners,    // optional { hintCheck: async ctx => result }
 *     dispatcher,
 *     logger,
 *     now,
 *   })
 *
 * An `autoCheckRunner` implements one of the `autoTestHint.check`
 * tokens referenced in the registry (e.g. `scfhs_licenses_valid`).
 * The runner returns `{ outcome, score?, details? }` which the
 * service records as a test run. Unknown or missing runners yield
 * `outcome = 'not_tested'` so the caller still gets a row and the
 * reason is surfaced in `gaps[]`.
 */

const {
  CONTROL_LIBRARY,
  CONTROL_FREQUENCIES,
  TEST_RESULT_OUTCOMES,
} = require('../../config/control-library.registry');

// ── frequency → next-due helper ────────────────────────────────────

const FREQUENCY_DAYS = Object.freeze({
  continuous: 30, // re-verify monthly so stale "continuous" rows still age out
  daily: 1,
  weekly: 7,
  monthly: 30,
  quarterly: 90,
  semi_annual: 180,
  annual: 365,
  on_event: null, // no automatic cadence
});

function computeNextDue(frequency, from = new Date()) {
  const days = FREQUENCY_DAYS[frequency];
  if (days == null) return null;
  return new Date(from.getTime() + days * 86400000);
}

// ── class ──────────────────────────────────────────────────────────

class ControlLibraryService {
  constructor({
    model,
    autoCheckRunners = {},
    dispatcher = null,
    logger = console,
    now = () => new Date(),
  } = {}) {
    if (!model) throw new Error('ControlLibraryService: model is required');
    this.model = model;
    this.autoCheckRunners = autoCheckRunners;
    this.dispatcher = dispatcher;
    this.logger = logger;
    this.now = now;
  }

  async _emit(name, payload) {
    if (!this.dispatcher || typeof this.dispatcher.emit !== 'function') return;
    try {
      await this.dispatcher.emit(name, payload);
    } catch (err) {
      this.logger.warn(`[ControlLibrary] dispatch ${name} failed: ${err.message}`);
    }
  }

  // ── seeding ────────────────────────────────────────────────────

  /**
   * Idempotent seed: for each control in the registry, upsert one
   * row scoped to the provided tenant/branch. Existing rows keep
   * their status + testRuns + ownerUserId; other fields are
   * refreshed to the registry value so registry edits propagate.
   *
   * Returns { created, updated, skipped, total }.
   */
  async seed({ tenantId = null, branchId = null } = {}) {
    let created = 0;
    let updated = 0;
    for (const entry of CONTROL_LIBRARY) {
      const existing = await this.model.findOne({
        controlId: entry.id,
        tenantId: tenantId || null,
        branchId: branchId || null,
        deleted_at: null,
      });
      if (existing) {
        existing.nameAr = entry.nameAr;
        existing.nameEn = entry.nameEn;
        existing.assertion = entry.assertion;
        existing.category = entry.category;
        existing.type = entry.type;
        existing.frequency = entry.frequency;
        existing.criticality = entry.criticality;
        existing.testMethod = entry.testMethod;
        existing.regulationRefs = entry.regulationRefs;
        existing.autoTestHint = entry.autoTestHint || null;
        await existing.save();
        updated++;
      } else {
        await this.model.create({
          controlId: entry.id,
          nameAr: entry.nameAr,
          nameEn: entry.nameEn,
          assertion: entry.assertion,
          category: entry.category,
          type: entry.type,
          frequency: entry.frequency,
          criticality: entry.criticality,
          testMethod: entry.testMethod,
          regulationRefs: entry.regulationRefs,
          autoTestHint: entry.autoTestHint || null,
          status: 'active',
          tenantId,
          branchId,
        });
        created++;
      }
    }
    await this._emit('compliance.controls.seeded', {
      tenantId: tenantId ? String(tenantId) : null,
      branchId: branchId ? String(branchId) : null,
      created,
      updated,
      total: CONTROL_LIBRARY.length,
    });
    return { created, updated, skipped: 0, total: CONTROL_LIBRARY.length };
  }

  // ── test runs ──────────────────────────────────────────────────

  /**
   * Record a test run on a specific control (by _id or controlId).
   * Updates the latest-result mirror and the `nextDueAt` field based
   * on frequency.
   */
  async recordTestRun(selector, run, userId) {
    if (!run) throw new Error('run is required');
    if (!run.outcome || !TEST_RESULT_OUTCOMES.includes(run.outcome)) {
      throw new Error('valid outcome is required');
    }
    const doc = await this._loadBySelector(selector);

    const testedAt = run.testedAt ? new Date(run.testedAt) : this.now();
    doc.testRuns.push({
      outcome: run.outcome,
      method: run.method || doc.testMethod,
      score: run.score ?? null,
      testedBy: userId || null,
      testedAt,
      evidenceIds: run.evidenceIds || [],
      narrative: run.narrative || null,
      gaps: run.gaps || [],
      autoCheckDetails: run.autoCheckDetails || null,
    });
    doc.lastResult = run.outcome;
    doc.lastScore = run.score ?? null;
    doc.lastTestedAt = testedAt;
    doc.nextDueAt = computeNextDue(doc.frequency, testedAt);
    await doc.save();

    await this._emit('compliance.control.tested', {
      controlId: doc.controlId,
      branchId: doc.branchId ? String(doc.branchId) : null,
      outcome: run.outcome,
      score: run.score ?? null,
      by: userId ? String(userId) : null,
    });
    return doc;
  }

  /**
   * Run the autoTestHint against the provided runner registry. If
   * no runner matches the hint, record a `not_tested` run with a
   * gap explaining why — so the dashboard has an entry rather than
   * a silent missing value.
   */
  async runAutoCheck(selector, ctx = {}, userId = null) {
    const doc = await this._loadBySelector(selector);
    if (!doc.autoTestHint || !doc.autoTestHint.check) {
      return this.recordTestRun(
        doc,
        {
          outcome: 'not_tested',
          method: doc.testMethod,
          gaps: ['no autoTestHint on this control'],
        },
        userId
      );
    }
    const runner = this.autoCheckRunners[doc.autoTestHint.check];
    if (typeof runner !== 'function') {
      return this.recordTestRun(
        doc,
        {
          outcome: 'not_tested',
          method: 'automatic',
          gaps: [`runner missing: ${doc.autoTestHint.check}`],
        },
        userId
      );
    }

    let result;
    try {
      result = await runner({ control: doc, ...ctx });
    } catch (err) {
      return this.recordTestRun(
        doc,
        {
          outcome: 'fail',
          method: 'automatic',
          narrative: `runner error: ${err.message}`,
          gaps: ['runner_error'],
        },
        userId
      );
    }
    if (!result || !result.outcome) {
      return this.recordTestRun(
        doc,
        {
          outcome: 'not_tested',
          method: 'automatic',
          gaps: ['runner returned no outcome'],
        },
        userId
      );
    }
    return this.recordTestRun(
      doc,
      {
        outcome: result.outcome,
        method: 'automatic',
        score: result.score ?? null,
        autoCheckDetails: result.details || null,
        narrative: result.narrative || null,
        gaps: result.gaps || [],
      },
      userId
    );
  }

  // ── lifecycle transitions ──────────────────────────────────────

  async deprecate(selector, reason, userId) {
    if (!reason || !String(reason).trim()) {
      throw new Error('deprecation reason is required');
    }
    const doc = await this._loadBySelector(selector);
    if (doc.status === 'deprecated') return doc;
    doc.status = 'deprecated';
    doc.deprecatedReason = String(reason).trim();
    await doc.save();
    await this._emit('compliance.control.deprecated', {
      controlId: doc.controlId,
      by: userId ? String(userId) : null,
    });
    return doc;
  }

  async markNotApplicable(selector, reason, userId) {
    if (!reason || !String(reason).trim()) {
      throw new Error('reason is required');
    }
    const doc = await this._loadBySelector(selector);
    doc.status = 'not_applicable';
    doc.notApplicableReason = String(reason).trim();
    await doc.save();
    await this._emit('compliance.control.not_applicable', {
      controlId: doc.controlId,
      by: userId ? String(userId) : null,
    });
    return doc;
  }

  async reactivate(selector, userId) {
    const doc = await this._loadBySelector(selector);
    doc.status = 'active';
    doc.deprecatedReason = null;
    doc.notApplicableReason = null;
    await doc.save();
    await this._emit('compliance.control.reactivated', {
      controlId: doc.controlId,
      by: userId ? String(userId) : null,
    });
    return doc;
  }

  // ── queries ────────────────────────────────────────────────────

  async findByControlId(controlId, { tenantId = null, branchId = null } = {}) {
    return this.model.findOne({
      controlId,
      tenantId: tenantId || null,
      branchId: branchId || null,
      deleted_at: null,
    });
  }

  async list({
    branchId,
    tenantId,
    status = 'active',
    category,
    criticality,
    framework,
    lastResult,
    overdueOnly = false,
    limit = 200,
  } = {}) {
    const q = { deleted_at: null };
    if (branchId !== undefined) q.branchId = branchId || null;
    if (tenantId !== undefined) q.tenantId = tenantId || null;
    if (status) q.status = status;
    if (category) q.category = category;
    if (criticality) q.criticality = criticality;
    if (framework) q['regulationRefs.standard'] = framework;
    if (lastResult) q.lastResult = lastResult;
    if (overdueOnly) q.nextDueAt = { $ne: null, $lt: this.now() };

    return this.model
      .find(q)
      .sort({ criticality: -1, controlId: 1 })
      .limit(Math.min(Number(limit) || 200, 500));
  }

  /**
   * Aggregate coverage: pass-rate per framework/category for
   * dashboards. Used by the health-score aggregator (C9).
   */
  async getCoverage({ branchId, tenantId } = {}) {
    const rows = await this.list({ branchId, tenantId, limit: 500 });
    const coverage = { total: 0, byOutcome: {}, byFramework: {}, byCriticality: {} };
    for (const r of rows) {
      coverage.total++;
      const outcome = r.lastResult || 'not_tested';
      coverage.byOutcome[outcome] = (coverage.byOutcome[outcome] || 0) + 1;

      for (const ref of r.regulationRefs) {
        const key = ref.standard;
        coverage.byFramework[key] = coverage.byFramework[key] || {
          total: 0,
          pass: 0,
          fail: 0,
          partial: 0,
          not_tested: 0,
        };
        coverage.byFramework[key].total++;
        const bucket = coverage.byFramework[key][outcome] ?? null;
        if (bucket != null) coverage.byFramework[key][outcome]++;
      }

      const c = r.criticality;
      coverage.byCriticality[c] = coverage.byCriticality[c] || {
        total: 0,
        pass: 0,
        fail: 0,
        partial: 0,
      };
      coverage.byCriticality[c].total++;
      if (outcome === 'pass') coverage.byCriticality[c].pass++;
      else if (outcome === 'fail') coverage.byCriticality[c].fail++;
      else if (outcome === 'partial') coverage.byCriticality[c].partial++;
    }
    return coverage;
  }

  // ── internals ──────────────────────────────────────────────────

  async _loadBySelector(selector) {
    if (!selector) {
      const err = new Error('selector required');
      err.code = 'NOT_FOUND';
      throw err;
    }
    if (selector instanceof this.model) return selector;
    // Selector could be: mongo _id, controlId string, or { controlId, tenantId, branchId }
    let doc;
    if (typeof selector === 'string') {
      if (/^[a-f0-9]{24}$/i.test(selector)) {
        doc = await this.model.findOne({ _id: selector, deleted_at: null });
      } else {
        doc = await this.model.findOne({ controlId: selector, deleted_at: null });
      }
    } else if (selector && typeof selector === 'object') {
      if (selector._id && typeof selector.save === 'function') return selector;
      if (selector._id) {
        doc = await this.model.findOne({ _id: selector._id, deleted_at: null });
      } else {
        doc = await this.model.findOne({
          controlId: selector.controlId,
          tenantId: selector.tenantId || null,
          branchId: selector.branchId || null,
          deleted_at: null,
        });
      }
    }
    if (!doc) {
      const err = new Error('QualityControl not found');
      err.code = 'NOT_FOUND';
      throw err;
    }
    return doc;
  }
}

// ── factory + singleton ────────────────────────────────────────────

function createControlLibraryService(deps) {
  return new ControlLibraryService(deps);
}

let _defaultInstance = null;
function getDefault() {
  if (!_defaultInstance) {
    const model = require('../../models/quality/QualityControl.model');
    _defaultInstance = new ControlLibraryService({ model });
  }
  return _defaultInstance;
}

function _replaceDefault(instance) {
  _defaultInstance = instance;
}

module.exports = {
  ControlLibraryService,
  createControlLibraryService,
  getDefault,
  _replaceDefault,
  computeNextDue,
};
