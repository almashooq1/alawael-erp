/**
 * redFlagMongoStateStore.js — Beneficiary-360 Foundation Commit 6.
 *
 * Persistent adapter for red-flag state. Implements the EXACT same
 * contract as `redFlagStateStore` (in-memory) — same method shapes,
 * same transition verdicts, same cooldown/autoResolve policy. The
 * shared test suite `__tests__/helpers/red-flag-store-contract.js`
 * runs identically against both.
 *
 * Design decisions:
 *
 *   1. One factory function; no module-level singleton. Callers at
 *      bootstrap: `const store = createMongoStateStore();` after
 *      `mongoose.connect(...)` is done. The registry and model are
 *      both injectable so tests can run against a fixture registry
 *      + in-memory Mongo without touching production collections.
 *
 *   2. Every public method returns a Promise. The contract suite's
 *      `await`s tolerate both sync (in-memory) and async (this
 *      adapter) flavors.
 *
 *   3. Records come out of Mongo with Date instances; the store
 *      converts them to ISO strings so the contract matches the
 *      in-memory adapter verbatim. Callers never see raw Mongo
 *      documents.
 *
 *   4. `clear()` is for tests and admin-only reset workflows. It
 *      wipes the red_flag_states collection; nothing else. In
 *      production, cooldown rows naturally age out as the
 *      `cooldownUntil > now` check fails.
 *
 *   5. Concurrency: the unique index on (beneficiaryId, flagId,
 *      status) guarantees at most one active and one cooldown per
 *      pair. Two writers racing on "raise the same flag" — the
 *      second insert throws E11000; the store catches it and
 *      treats that verdict as `stillRaised` (the record the first
 *      writer just inserted). Better than exploding the digest
 *      run; documented so the behavior is predictable.
 */

'use strict';

const DEFAULT_REGISTRY = require('../config/red-flags.registry');
const DEFAULT_MODEL = require('../models/RedFlagState');

const MS_PER_HOUR = 3600 * 1000;

// ─── Date helpers ───────────────────────────────────────────────

function toMs(dateOrString) {
  if (dateOrString instanceof Date) return dateOrString.getTime();
  if (typeof dateOrString === 'string') return new Date(dateOrString).getTime();
  if (typeof dateOrString === 'number') return dateOrString;
  return Date.now();
}

function toIso(dateOrString) {
  if (dateOrString instanceof Date) return dateOrString.toISOString();
  if (typeof dateOrString === 'string') return new Date(dateOrString).toISOString();
  if (typeof dateOrString === 'number') return new Date(dateOrString).toISOString();
  return new Date().toISOString();
}

function isDuplicateKeyError(err) {
  return err && (err.code === 11000 || (err.name === 'MongoServerError' && err.code === 11000));
}

// ─── Document → contract-shape adapters ─────────────────────────

function toActiveRecord(doc) {
  if (doc == null) return null;
  return {
    beneficiaryId: doc.beneficiaryId,
    flagId: doc.flagId,
    severity: doc.severity,
    domain: doc.domain,
    blocking: doc.blocking === true,
    raisedAt: doc.raisedAt ? doc.raisedAt.toISOString() : null,
    lastObservedAt: doc.lastObservedAt ? doc.lastObservedAt.toISOString() : null,
    observedValue: doc.observedValue,
  };
}

function toCooldownRecord(doc) {
  if (doc == null) return null;
  return {
    beneficiaryId: doc.beneficiaryId,
    flagId: doc.flagId,
    resolvedAt: doc.resolvedAt ? doc.resolvedAt.toISOString() : null,
    cooldownUntil: doc.cooldownUntil ? doc.cooldownUntil.toISOString() : null,
  };
}

// ─── Factory ────────────────────────────────────────────────────

function createMongoStateStore(deps = {}) {
  const registry = deps.registry || DEFAULT_REGISTRY;
  const Model = deps.model || DEFAULT_MODEL;
  if (typeof registry.byId !== 'function') {
    throw new Error('redFlagMongoStateStore: registry must expose byId()');
  }

  async function getActiveState(beneficiaryId, flagId) {
    const doc = await Model.findOne({
      beneficiaryId,
      flagId,
      status: 'active',
    }).lean();
    return toActiveRecord(doc);
  }

  async function getAllActive(beneficiaryId) {
    const docs = await Model.find({ beneficiaryId, status: 'active' }).lean();
    return docs.map(toActiveRecord);
  }

  async function getCooldown(beneficiaryId, flagId) {
    const doc = await Model.findOne({
      beneficiaryId,
      flagId,
      status: 'cooldown',
    }).lean();
    return toCooldownRecord(doc);
  }

  async function insertActive(record) {
    try {
      await Model.create({
        beneficiaryId: record.beneficiaryId,
        flagId: record.flagId,
        status: 'active',
        severity: record.severity,
        domain: record.domain,
        blocking: record.blocking,
        raisedAt: new Date(record.raisedAt),
        lastObservedAt: new Date(record.lastObservedAt),
        observedValue: record.observedValue,
      });
      return { inserted: true };
    } catch (err) {
      if (isDuplicateKeyError(err)) return { inserted: false };
      throw err;
    }
  }

  async function updateActiveObservation(beneficiaryId, flagId, observedValue, nowIso) {
    await Model.updateOne(
      { beneficiaryId, flagId, status: 'active' },
      { $set: { lastObservedAt: new Date(nowIso), observedValue } }
    );
  }

  async function removeActive(beneficiaryId, flagId) {
    await Model.deleteOne({ beneficiaryId, flagId, status: 'active' });
  }

  async function upsertCooldown(
    beneficiaryId,
    flagId,
    nowIso,
    cooldownUntilIso,
    resolvedBy,
    resolution
  ) {
    await Model.updateOne(
      { beneficiaryId, flagId, status: 'cooldown' },
      {
        $set: {
          beneficiaryId,
          flagId,
          status: 'cooldown',
          resolvedAt: new Date(nowIso),
          cooldownUntil: new Date(cooldownUntilIso),
          ...(resolvedBy !== undefined ? { resolvedBy } : {}),
          ...(resolution !== undefined ? { resolution } : {}),
        },
      },
      { upsert: true }
    );
  }

  async function applyVerdicts(beneficiaryId, verdicts, options = {}) {
    if (beneficiaryId == null || beneficiaryId === '') {
      throw new Error('redFlagMongoStateStore: beneficiaryId is required');
    }
    if (!Array.isArray(verdicts)) {
      throw new Error('redFlagMongoStateStore: verdicts must be an array');
    }

    const nowMs = toMs(options.now);
    const nowIso = toIso(nowMs);

    const out = {
      beneficiaryId,
      evaluatedAt: nowIso,
      newlyRaised: [],
      stillRaised: [],
      newlyResolved: [],
      stillClear: [],
      suppressedByCooldown: [],
      errored: [],
    };

    for (const verdict of verdicts) {
      if (verdict == null || typeof verdict.flagId !== 'string') continue;

      if (verdict.kind === 'error') {
        out.errored.push({ ...verdict });
        continue;
      }

      const flag = registry.byId(verdict.flagId);
      if (!flag) {
        out.errored.push({ ...verdict, reason: 'unknown-flag' });
        continue;
      }

      const priorDoc = await Model.findOne({
        beneficiaryId,
        flagId: verdict.flagId,
        status: 'active',
      }).lean();
      const cooldownDoc = await Model.findOne({
        beneficiaryId,
        flagId: verdict.flagId,
        status: 'cooldown',
      }).lean();
      const prior = toActiveRecord(priorDoc);
      const cooldown = toCooldownRecord(cooldownDoc);

      if (verdict.kind === 'raised') {
        if (prior) {
          await updateActiveObservation(
            beneficiaryId,
            verdict.flagId,
            verdict.observedValue,
            nowIso
          );
          out.stillRaised.push({
            ...prior,
            lastObservedAt: nowIso,
            observedValue: verdict.observedValue,
          });
          continue;
        }

        if (cooldown && toMs(cooldown.cooldownUntil) > nowMs) {
          out.suppressedByCooldown.push({
            beneficiaryId,
            flagId: verdict.flagId,
            observedValue: verdict.observedValue,
            evaluatedAt: verdict.evaluatedAt,
            cooldownUntil: cooldown.cooldownUntil,
          });
          continue;
        }

        const record = {
          beneficiaryId,
          flagId: verdict.flagId,
          severity: flag.severity,
          domain: flag.domain,
          blocking: flag.response && flag.response.blocking === true,
          raisedAt: nowIso,
          lastObservedAt: nowIso,
          observedValue: verdict.observedValue,
        };
        const { inserted } = await insertActive(record);
        if (inserted) {
          out.newlyRaised.push(record);
        } else {
          // Race: another writer raced us to this (bId, flagId, active).
          // Treat as stillRaised — the winning writer already reported
          // newlyRaised. No double-notification.
          const winner = await Model.findOne({
            beneficiaryId,
            flagId: verdict.flagId,
            status: 'active',
          }).lean();
          if (winner) out.stillRaised.push(toActiveRecord(winner));
        }
        continue;
      }

      // verdict.kind === 'clear'
      if (!prior) {
        out.stillClear.push({
          beneficiaryId,
          flagId: verdict.flagId,
          observedValue: verdict.observedValue,
          evaluatedAt: verdict.evaluatedAt,
        });
        continue;
      }

      const policy = flag.autoResolve;

      if (policy === null || (policy && policy.type === 'manual')) {
        await updateActiveObservation(beneficiaryId, verdict.flagId, verdict.observedValue, nowIso);
        out.stillRaised.push({
          ...prior,
          lastObservedAt: nowIso,
          observedValue: verdict.observedValue,
        });
        continue;
      }

      if (policy.type === 'condition_cleared') {
        const cooldownUntilMs = nowMs + (flag.cooldownHours || 0) * MS_PER_HOUR;
        const cooldownUntilIso = toIso(cooldownUntilMs);
        await removeActive(beneficiaryId, verdict.flagId);
        await upsertCooldown(beneficiaryId, verdict.flagId, nowIso, cooldownUntilIso, 'auto');
        out.newlyResolved.push({
          ...prior,
          resolvedAt: nowIso,
          resolvedBy: 'auto',
          cooldownUntil: cooldownUntilIso,
        });
        continue;
      }

      if (policy.type === 'timer') {
        const elapsedMs = nowMs - toMs(prior.raisedAt);
        const thresholdMs = (policy.afterHours || 0) * MS_PER_HOUR;
        if (elapsedMs >= thresholdMs) {
          const cooldownUntilMs = nowMs + (flag.cooldownHours || 0) * MS_PER_HOUR;
          const cooldownUntilIso = toIso(cooldownUntilMs);
          await removeActive(beneficiaryId, verdict.flagId);
          await upsertCooldown(beneficiaryId, verdict.flagId, nowIso, cooldownUntilIso, 'timer');
          out.newlyResolved.push({
            ...prior,
            resolvedAt: nowIso,
            resolvedBy: 'timer',
            cooldownUntil: cooldownUntilIso,
          });
        } else {
          await updateActiveObservation(
            beneficiaryId,
            verdict.flagId,
            verdict.observedValue,
            nowIso
          );
          out.stillRaised.push({
            ...prior,
            lastObservedAt: nowIso,
            observedValue: verdict.observedValue,
          });
        }
        continue;
      }

      // Unknown policy shape — treat as manual to fail safe.
      out.stillRaised.push({ ...prior });
    }

    return out;
  }

  async function manualResolve(beneficiaryId, flagId, options = {}) {
    const priorDoc = await Model.findOne({
      beneficiaryId,
      flagId,
      status: 'active',
    }).lean();
    if (!priorDoc) return null;

    const nowMs = toMs(options.now);
    const nowIso = toIso(nowMs);
    const flag = registry.byId(flagId);
    const cooldownUntilMs =
      nowMs + (flag && flag.cooldownHours ? flag.cooldownHours : 0) * MS_PER_HOUR;
    const cooldownUntilIso = toIso(cooldownUntilMs);

    await removeActive(beneficiaryId, flagId);
    await upsertCooldown(
      beneficiaryId,
      flagId,
      nowIso,
      cooldownUntilIso,
      options.resolvedBy || 'manual',
      options.resolution || null
    );

    return {
      ...toActiveRecord(priorDoc),
      resolvedAt: nowIso,
      resolvedBy: options.resolvedBy || 'manual',
      resolution: options.resolution || null,
      cooldownUntil: cooldownUntilIso,
    };
  }

  async function clear() {
    await Model.deleteMany({});
  }

  return Object.freeze({
    getActiveState,
    getAllActive,
    getCooldown,
    applyVerdicts,
    manualResolve,
    clear,
  });
}

module.exports = { createMongoStateStore };
