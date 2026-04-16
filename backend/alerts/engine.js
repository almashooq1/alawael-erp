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
 */

'use strict';

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

  async runAll(ctx = {}) {
    const now = this.now();
    const raised = [];
    const seenKeys = new Set();

    for (const rule of this.rules.values()) {
      let findings;
      try {
        findings = (await rule.evaluate({ ...ctx, now })) || [];
      } catch (err) {
        findings = [];
        // Engine never throws — log and continue to next rule.
        if (ctx.logger && ctx.logger.error)
          ctx.logger.error(`rule ${rule.id} failed: ${err.message}`);
      }
      for (const f of findings) {
        const compoundKey = `${rule.id}::${f.key}`;
        seenKeys.add(compoundKey);
        const existing = this.activeAlerts.get(compoundKey);
        if (existing) {
          existing.lastSeenAt = now;
        } else {
          this.activeAlerts.set(compoundKey, { firstSeenAt: now, lastSeenAt: now });
          raised.push({
            ruleId: rule.id,
            severity: rule.severity,
            category: rule.category,
            description: rule.description,
            firstSeenAt: now,
            ...f,
          });
        }
      }
    }

    // Auto-resolve any active alerts not seen this run.
    const resolved = [];
    for (const [compound, meta] of this.activeAlerts.entries()) {
      if (!seenKeys.has(compound)) {
        this.activeAlerts.delete(compound);
        resolved.push({ compoundKey: compound, firstSeenAt: meta.firstSeenAt, resolvedAt: now });
      }
    }

    return { raised, resolved, activeCount: this.activeAlerts.size };
  }

  reset() {
    this.activeAlerts.clear();
  }
}

module.exports = { AlertsEngine };
