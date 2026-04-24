/**
 * dashboardNarrativeFacade.service.js — selector that wires the
 * LLM-backed narrative in when available and falls back to the
 * deterministic rule-based engine otherwise.
 *
 * Phase 18 Commit 4.
 *
 * The facade is what the aggregator now calls. It exposes the same
 * `generate({ dashboardId, kpiSnapshots, context })` contract as
 * the rule-based generator so nothing downstream changes.
 *
 * Priority:
 *   1. If `llmGenerator` was injected and is non-null, try it.
 *      Any non-null narrative it produces is returned verbatim
 *      (the LLM module already merges the deterministic rule
 *      output into its response so `rulesFired` + `refs` +
 *      `confidence` stay accurate).
 *   2. Otherwise, or on any error, return the deterministic
 *      narrative. This is the C1 behaviour — never broken.
 *
 * The facade itself adds no caching or retries. Those belong to
 * the individual generators.
 */

'use strict';

const { generate: ruleGenerate } = require('./dashboardNarrative.service');

function buildNarrativeFacade({ llmGenerator = null, logger = console } = {}) {
  async function generate(options = {}) {
    if (llmGenerator && typeof llmGenerator.generate === 'function') {
      try {
        const llmResult = await llmGenerator.generate(options);
        if (llmResult) return llmResult;
      } catch (err) {
        if (logger && logger.warn) {
          logger.warn(`[narrativeFacade] llm path threw: ${err.message}`);
        }
        // Fall through to rule-based.
      }
    }
    return ruleGenerate(options);
  }

  return { generate, hasLlm: Boolean(llmGenerator) };
}

module.exports = { buildNarrativeFacade };
