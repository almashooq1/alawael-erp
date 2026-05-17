/**
 * branch-scope-adoption-wave35.test.js — Wave 35.
 *
 * The drift guard for plugin adoption. CI fails the build if any
 * model listed in `BRANCH_SCOPED_MODELS_REGISTRY` has lost its
 * `branchScopePlugin` attachment.
 *
 * This is the enforcement point that turns Wave 34 from "plugin is
 * available" into "plugin is REQUIRED for models in the registry."
 *
 * Coverage:
 *   1. Plugin introspection helpers (isAppliedTo / getAppliedConfig)
 *   2. APPLIED_MARKER is a stable Symbol.for() (cross-module)
 *   3. Each registered model loads without error
 *   4. Each registered model has the plugin attached
 *   5. Each registered model's plugin config matches the registry's
 *      requireActor declaration
 *   6. Plugin's hook bodies still work on the registered models
 *      (smoke check — query mock fires the hook)
 *   7. Removing the plugin from a registered model FAILS the test
 *      (negative example for documentation)
 */

'use strict';

const mongoose = require('mongoose');
const branchScopePlugin = require('../intelligence/branchScopePlugin');
const {
  BRANCH_SCOPED_MODELS,
  loadRegistered,
} = require('../intelligence/branch-scoped-models.registry');

// ─── 1. Introspection helpers ──────────────────────────────────

describe('branchScopePlugin — introspection', () => {
  test('isAppliedTo returns true after schema.plugin()', () => {
    const schema = new mongoose.Schema({ branchId: mongoose.Schema.Types.ObjectId });
    expect(branchScopePlugin.isAppliedTo(schema)).toBe(false);
    schema.plugin(branchScopePlugin);
    expect(branchScopePlugin.isAppliedTo(schema)).toBe(true);
  });

  test('isAppliedTo works on a Model too (not just a schema)', () => {
    const schema = new mongoose.Schema({ branchId: mongoose.Schema.Types.ObjectId });
    schema.plugin(branchScopePlugin);
    const Model = mongoose.model(
      `IntrospectTest_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      schema
    );
    expect(branchScopePlugin.isAppliedTo(Model)).toBe(true);
  });

  test('getAppliedConfig returns the plugin options', () => {
    const schema = new mongoose.Schema({ branchId: mongoose.Schema.Types.ObjectId });
    schema.plugin(branchScopePlugin, { branchField: 'b_id', requireActor: false });
    const cfg = branchScopePlugin.getAppliedConfig(schema);
    expect(cfg.branchField).toBe('b_id');
    expect(cfg.requireActor).toBe(false);
    expect(cfg.strict).toBe(false);
  });

  test('isAppliedTo / getAppliedConfig handle null/undefined', () => {
    expect(branchScopePlugin.isAppliedTo(null)).toBe(false);
    expect(branchScopePlugin.isAppliedTo(undefined)).toBe(false);
    expect(branchScopePlugin.getAppliedConfig(null)).toBeNull();
  });
});

// ─── 2. Stable Symbol.for() marker ─────────────────────────────

describe('branchScopePlugin — APPLIED_MARKER', () => {
  test('marker is registered via Symbol.for (cross-module stable)', () => {
    const marker = branchScopePlugin.APPLIED_MARKER;
    expect(typeof marker).toBe('symbol');
    // Symbol.for() returns the same symbol across modules — verify
    // it's the registered one, not a unique Symbol().
    expect(Symbol.for('branchScopePlugin.applied')).toBe(marker);
  });
});

// ─── 3-5. Registry adoption drift guard ────────────────────────

describe('BRANCH_SCOPED_MODELS_REGISTRY — adoption drift guard', () => {
  test('registry has at least the Wave-35 baseline (3 models)', () => {
    expect(BRANCH_SCOPED_MODELS.length).toBeGreaterThanOrEqual(3);
  });

  test('each entry has the required metadata', () => {
    for (const entry of BRANCH_SCOPED_MODELS) {
      expect(entry.modulePath).toBeTruthy();
      expect(entry.reason).toBeTruthy();
      expect(typeof entry.addedInWave).toBe('number');
      expect(typeof entry.requireActor).toBe('boolean');
    }
  });

  test('every registered model loads without error', () => {
    const loaded = loadRegistered();
    const failed = loaded.filter(e => e.loadError);
    if (failed.length > 0) {
      throw new Error(
        `Some registered models failed to load:\n` +
          failed.map(f => `  ${f.modulePath}: ${f.loadError}`).join('\n')
      );
    }
    expect(failed).toHaveLength(0);
  });

  test('every registered model has the plugin attached (drift guard)', () => {
    const loaded = loadRegistered();
    const unprotected = loaded.filter(e => !e.loadError && !branchScopePlugin.isAppliedTo(e.model));
    if (unprotected.length > 0) {
      throw new Error(
        `\n\n❌ DRIFT — branchScopePlugin missing on registered models:\n` +
          unprotected
            .map(
              u =>
                `  • ${u.modulePath}\n` +
                `    Reason for protection: ${u.reason}\n` +
                `    Fix: add \`schema.plugin(branchScopePlugin)\` to that file.\n`
            )
            .join('\n') +
          `\nThis test enforces Constitution §8 rule #1: every API query\n` +
          `for these models MUST be branch-filtered server-side.\n`
      );
    }
    expect(unprotected).toHaveLength(0);
  });

  test('plugin config on each registered model matches registry requireActor', () => {
    const loaded = loadRegistered();
    for (const entry of loaded) {
      if (entry.loadError) continue;
      const cfg = branchScopePlugin.getAppliedConfig(entry.model);
      expect(cfg).toBeTruthy();
      expect(cfg.requireActor).toBe(entry.requireActor);
    }
  });
});

// ─── 6. Hook smoke check on the registered models ─────────────

describe('registered models — hook smoke check', () => {
  function mockQuery({ filter = {}, options = {} } = {}) {
    return {
      _filter: { ...filter },
      _opts: { ...options },
      __branchScoped: false,
      getFilter() {
        return this._filter;
      },
      getOptions() {
        return this._opts;
      },
      setQuery(newFilter) {
        this._filter = newFilter;
      },
    };
  }

  test('FollowUp schema branch scoping fires through applyReadScope', () => {
    const branchId = new mongoose.Types.ObjectId();
    const q = mockQuery({
      filter: { status: 'open' },
      options: { actor: { userId: 'u-1', roles: ['manager'], branchId } },
    });
    // Use the plugin's exported hook body, with the same config the
    // model registered.
    const { FollowUp } = require('../models/Productivity');
    const cfg = branchScopePlugin.getAppliedConfig(FollowUp);
    branchScopePlugin.applyReadScope(q, cfg);
    expect(String(q.getFilter().branchId)).toBe(String(branchId));
  });

  test('Annotation schema scoping uses the branchId field', () => {
    const branchId = new mongoose.Types.ObjectId();
    const q = mockQuery({
      filter: { kpiId: 'kpi.x' },
      options: { actor: { userId: 'u-1', roles: ['manager'], branchId } },
    });
    const { Annotation } = require('../models/Productivity');
    const cfg = branchScopePlugin.getAppliedConfig(Annotation);
    branchScopePlugin.applyReadScope(q, cfg);
    expect(String(q.getFilter().branchId)).toBe(String(branchId));
    expect(q.getFilter().kpiId).toBe('kpi.x');
  });

  test('HandoffNote schema scoping fires + GLOBAL passthrough', () => {
    const { HandoffNote } = require('../models/Productivity');
    const cfg = branchScopePlugin.getAppliedConfig(HandoffNote);

    // GLOBAL actor → no scope change
    const q1 = mockQuery({
      filter: {},
      options: { actor: { userId: 'u-admin', roles: ['super_admin'] } },
    });
    branchScopePlugin.applyReadScope(q1, cfg);
    expect(q1.getFilter()).toEqual({});

    // BRANCH actor → scope applied
    const branchId = new mongoose.Types.ObjectId();
    const q2 = mockQuery({
      filter: {},
      options: { actor: { userId: 'u-1', roles: ['manager'], branchId } },
    });
    branchScopePlugin.applyReadScope(q2, cfg);
    expect(String(q2.getFilter().branchId)).toBe(String(branchId));
  });

  test('requireActor=false (back-compat) — no actor → no scope, no throw', () => {
    const { Annotation } = require('../models/Productivity');
    const cfg = branchScopePlugin.getAppliedConfig(Annotation);
    // requireActor should be false per registry; verify and exercise the path
    expect(cfg.requireActor).toBe(false);
    const q = mockQuery({ filter: { kpiId: 'kpi.x' } });
    expect(() => branchScopePlugin.applyReadScope(q, cfg)).not.toThrow();
    expect(q.getFilter()).toEqual({ kpiId: 'kpi.x' });
  });
});

// ─── 7. Negative example (documentation) ──────────────────────

describe('plugin adoption — negative example for documentation', () => {
  test('a schema WITHOUT the plugin reports isAppliedTo=false', () => {
    const schema = new mongoose.Schema({ branchId: mongoose.Schema.Types.ObjectId });
    expect(branchScopePlugin.isAppliedTo(schema)).toBe(false);
  });
});
