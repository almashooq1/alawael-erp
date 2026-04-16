/**
 * KPI compute engine (scaffold).
 *
 * Strategy:
 *   - Each KPI definition has a matching compute function registered here.
 *   - The engine runs computations per branch (or consolidated) and per period.
 *   - Outputs are written to a KpiValue store (to be modeled in P1).
 *
 * This file provides the engine skeleton + stubs for the most-requested
 * KPIs. Real queries are filled in as collections grow stable.
 */

'use strict';

const { definitions, byId } = require('./definitions');

class KpiComputeEngine {
  constructor() {
    /** @type {Map<string, Function>} */
    this.computers = new Map();
  }

  register(id, computeFn) {
    if (!byId(id)) throw new Error(`Unknown KPI id: ${id}`);
    this.computers.set(id, computeFn);
  }

  /**
   * Compute one KPI value.
   * @param {string} id
   * @param {{ branchId?: string, period: {from: Date, to: Date} }} ctx
   * @returns {Promise<{ id: string, value: number | null, computedAt: Date, ctx: object }>}
   */
  async compute(id, ctx) {
    const def = byId(id);
    if (!def) throw new Error(`Unknown KPI id: ${id}`);
    const fn = this.computers.get(id);
    let value = null;
    let error;
    try {
      if (fn) value = await fn(ctx);
    } catch (err) {
      error = err.message;
    }
    return {
      id,
      definition: def,
      value,
      computedAt: new Date(),
      ctx,
      error,
    };
  }

  /**
   * Compute all KPIs with registered computers.
   */
  async computeAll(ctx) {
    const results = [];
    for (const id of this.computers.keys()) {
      results.push(await this.compute(id, ctx));
    }
    return results;
  }

  /** KPIs that have no computer yet (for coverage reporting). */
  missingComputers() {
    return definitions.map(d => d.id).filter(id => !this.computers.has(id));
  }
}

module.exports = { KpiComputeEngine };
