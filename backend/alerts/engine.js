/**
 * Smart Alerts Engine.
 *
 * - Registers rules.
 * - Runs them with an injected context (models, now()).
 * - Dedupes alerts by (rule.id, alert.key) — emits each alert at most once
 *   per unresolved session unless explicitly re-raised.
 * - Returns a list of new alerts produced during a run.
 *
 * Persisting alerts and notifying recipients are left to the caller
 * (via the engine event hooks) so we can keep the engine pure.
 *
 * Wave 12 (2026-05-16): three new behaviors layered on top of the
 * existing dedup loop — cooldown, dependency suppression, and re-open
 * detection. All of them stay opt-in: the caller supplies
 * `ctx.getRecentResolve` and the engine consults the rule's optional
 * `cooldownMin` / `suppressIf` fields. When neither is supplied the
 * engine behaves exactly as it did in Phase 11.
 */

'use strict';

const { getCooldownMin, getSuppressedBy } = require('./rule-introspection');

class AlertsEngine {
  constructor({ now = () => new Date() } = {}) {
    /** @type {Map<string, object>} */
    this.rules = new Map();
    /** @type {Map<string, { firstSeenAt: Date, lastSeenAt: Date }>} */
    this.activeAlerts = new Map();
    this.now = now;
  }

  register(rule) {
    if (!rule || !rule.id || typeof rule.evaluate !== 'function') {
      throw new Error('AlertsEngine.register: rule must have id + evaluate()');
    }
    if (this.rules.has(rule.id)) {
      throw new Error(`AlertsEngine.register: duplicate rule id ${rule.id}`);
    }
    this.rules.set(rule.id, rule);
    return this;
  }

  registerAll(list) {
    for (const r of list) this.register(r);
    return this;
  }

  /**
   * Run every registered rule and produce the engine's tick output.
   *
   * @param {object} ctx Context plumbed by the dispatcher.
   * @param {object} [ctx.models]            Model registry (existing).
   * @param {object} [ctx.logger]            Logger (existing).
   * @param {object} [ctx.kpiHistoryStore]   Wave 5 EWMA series store.
   * @param {(ruleId: string, key: string) => Promise<{resolvedAt: Date|null}>}
   *        [ctx.getRecentResolve]
   *        Wave 12: optional callback the dispatcher provides to look
   *        up the most-recent resolvedAt for (ruleId, key). Used for
   *        cooldown enforcement + re-open detection. When absent, the
   *        engine falls back to in-memory state and the new behaviors
   *        degrade to the Phase 11 semantics.
   *
   * @returns {Promise<{
   *   raised:    Array<object>,
   *   resolved:  Array<{compoundKey, firstSeenAt, resolvedAt}>,
   *   reopened:  Array<{compoundKey, ruleId, key, previousResolvedAt}>,
   *   suppressed: Array<{compoundKey, ruleId, key, suppressedBy: string[]}>,
   *   cooledDown: Array<{compoundKey, ruleId, key, cooldownExpiresAt}>,
   *   activeCount: number,
   * }>}
   */
  async runAll(ctx = {}) {
    const now = this.now();
    const seenKeys = new Set();

    // Phase 1: evaluate every rule, collect raw findings BEFORE
    // applying cooldown/suppression so we can still surface
    // suppressed/cooled rows in the tick report for observability.
    const rawFindings = []; // [{ rule, finding }]
    for (const rule of this.rules.values()) {
      let findings;
      try {
        findings = (await rule.evaluate({ ...ctx, now })) || [];
      } catch (err) {
        findings = [];
        if (ctx.logger && ctx.logger.error)
          ctx.logger.error(`rule ${rule.id} failed: ${err.message}`);
      }
      for (const f of findings) {
        rawFindings.push({ rule, finding: f });
        seenKeys.add(`${rule.id}::${f.key}`);
      }
    }

    // Build a quick "which rules currently active?" index for
    // dependency suppression. A rule is considered active if it
    // produced any finding this tick OR has an in-flight entry from
    // the previous tick. This catches the common "X reported, Y
    // depends on X" pattern without a second engine pass.
    const activeRuleIds = new Set(rawFindings.map(r => r.rule.id));
    for (const compoundKey of this.activeAlerts.keys()) {
      const [ruleId] = compoundKey.split('::');
      activeRuleIds.add(ruleId);
    }

    const raised = [];
    const suppressed = [];
    const cooledDown = [];
    const reopened = [];

    for (const { rule, finding } of rawFindings) {
      const compoundKey = `${rule.id}::${finding.key}`;
      const existing = this.activeAlerts.get(compoundKey);

      // Bump lastSeenAt on re-detected findings; nothing new to raise.
      if (existing) {
        existing.lastSeenAt = now;
        continue;
      }

      // ── Wave 12 — dependency suppression ─────────────────
      const suppressors = getSuppressedBy(rule).filter(id => activeRuleIds.has(id));
      if (suppressors.length > 0) {
        suppressed.push({
          compoundKey,
          ruleId: rule.id,
          key: finding.key,
          suppressedBy: suppressors,
        });
        continue;
      }

      // ── Wave 12 — cooldown after resolve ─────────────────
      // The dispatcher provides `getRecentResolve` so the engine
      // can ask "was this (ruleId, key) resolved recently?". When
      // the answer is yes and within `cooldownMin`, we hold the
      // raise back. Without the callback we keep Phase 11 semantics.
      if (typeof ctx.getRecentResolve === 'function') {
        let recent;
        try {
          recent = await ctx.getRecentResolve(rule.id, finding.key);
        } catch {
          recent = null;
        }
        if (recent && recent.resolvedAt) {
          const cooldownMin = getCooldownMin(rule);
          if (cooldownMin > 0) {
            const resolvedTime = new Date(recent.resolvedAt).getTime();
            const cooldownEnds = resolvedTime + cooldownMin * 60 * 1000;
            if (now.getTime() < cooldownEnds) {
              cooledDown.push({
                compoundKey,
                ruleId: rule.id,
                key: finding.key,
                cooldownExpiresAt: new Date(cooldownEnds),
              });
              continue;
            }
          }
          // ── Wave 12 — re-open detection ─────────────────
          // Past cooldown + previously resolved = re-open. We
          // still emit a "raised" entry so the dispatcher writes
          // the new state to Mongo, plus a reopened row that the
          // workflow service records as a reopen event.
          reopened.push({
            compoundKey,
            ruleId: rule.id,
            key: finding.key,
            previousResolvedAt: recent.resolvedAt,
          });
        }
      }

      // Standard raise path.
      this.activeAlerts.set(compoundKey, { firstSeenAt: now, lastSeenAt: now });
      raised.push({
        ruleId: rule.id,
        severity: rule.severity,
        category: rule.category,
        description: rule.description,
        firstSeenAt: now,
        ...finding,
      });
    }

    // Auto-resolve any active alerts not seen this run.
    const resolved = [];
    for (const [compound, meta] of this.activeAlerts.entries()) {
      if (!seenKeys.has(compound)) {
        this.activeAlerts.delete(compound);
        resolved.push({ compoundKey: compound, firstSeenAt: meta.firstSeenAt, resolvedAt: now });
      }
    }

    return {
      raised,
      resolved,
      reopened,
      suppressed,
      cooledDown,
      activeCount: this.activeAlerts.size,
    };
  }

  reset() {
    this.activeAlerts.clear();
  }
}

module.exports = { AlertsEngine };
