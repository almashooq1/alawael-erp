'use strict';

/**
 * care-plan-llm-caller.service.js — Wave 48.
 *
 * Thin wrapper around the Anthropic SDK that:
 *
 *   1. Takes the Wave-44 prompt + Input Bundle.
 *   2. Calls `messages.create` with prompt-caching enabled on the
 *      system prompt (it's stable across calls).
 *   3. Pipes the raw response through the Wave-44 `validateProposal`
 *      validator — which is the chokepoint that rejects any output
 *      that doesn't satisfy schema + post-validator.
 *   4. Returns either { ok:true, proposal, confidence, usage }
 *      or { ok:false, reason, errors }.
 *
 * Dependency-injected so:
 *   • production wiring passes the real @anthropic-ai/sdk client
 *   • tests inject a fake client that returns canned JSON
 *
 * Hard guarantees:
 *   • NO direct mutation of plan state — the caller (Wave-41 service)
 *     decides whether to instantiate goals from the validated proposal.
 *   • timeout enforcement (default 30s)
 *   • request-id propagation for audit trail
 *   • retry policy: 2 retries on 5xx / network, NEVER on 4xx (validation
 *     errors are PROPOSAL_REJECTED, not retriable)
 */

const builder = require('./care-plan-recommendation-builder.service');

const REASON = Object.freeze({
  CLIENT_MISSING: 'CLIENT_MISSING',
  CLIENT_THREW: 'CLIENT_THREW',
  TIMEOUT: 'TIMEOUT',
  EMPTY_RESPONSE: 'EMPTY_RESPONSE',
  PROPOSAL_REJECTED: 'PROPOSAL_REJECTED',
  CONFIG_ERROR: 'CONFIG_ERROR',
});

const DEFAULTS = Object.freeze({
  model: 'claude-opus-4-7',
  maxTokens: 4096,
  timeoutMs: 30_000,
  maxRetries: 2,
});

function _isRetriable(err) {
  if (!err) return false;
  // Retry on transient network / 5xx; not on validation/auth
  const code = err.status || err.statusCode;
  if (code && code >= 400 && code < 500) return false;
  if (typeof err.message === 'string' && /timeout|network|ECONNRESET|EAI_AGAIN/i.test(err.message))
    return true;
  if (code && code >= 500) return true;
  return false;
}

function _sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function _backoffMs(attempt) {
  return Math.min(8000, 500 * 2 ** attempt);
}

function _withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('TIMEOUT')), ms);
    promise.then(
      v => {
        clearTimeout(t);
        resolve(v);
      },
      e => {
        clearTimeout(t);
        reject(e);
      }
    );
  });
}

/**
 * @param {object} deps
 *   - client          { messages: { create: async(...) → response } }
 *                       (e.g. new Anthropic({apiKey}))
 *   - validator       { isGoalSmart, resolveEvidenceRef } — Wave 41 + DI
 *   - model, maxTokens, timeoutMs, maxRetries
 *   - logger
 */
function createCarePlanLLMCaller({
  client = null,
  validator = {},
  model = DEFAULTS.model,
  maxTokens = DEFAULTS.maxTokens,
  timeoutMs = DEFAULTS.timeoutMs,
  maxRetries = DEFAULTS.maxRetries,
  logger = console,
} = {}) {
  function _ensureClient() {
    if (!client || typeof client?.messages?.create !== 'function') {
      return { ok: false, reason: REASON.CLIENT_MISSING };
    }
    return { ok: true };
  }

  /**
   * Generate a recommendation from raw input.
   *
   * @param {object} rawInput — passed to builder.buildInputBundle
   * @param {object} hooks    — passed to validateProposal
   *   { resolveEvidenceRef, hasRecentStandardizedAssessment, constraints }
   * @returns { ok, proposal, confidence, usage, requestId, errors }
   */
  async function recommend(rawInput, hooks = {}) {
    const clientCheck = _ensureClient();
    if (!clientCheck.ok) return clientCheck;

    const bundle = builder.buildInputBundle(rawInput);
    const { system, user } = builder.buildRecommendationPrompt(bundle);

    let attempt = 0;
    let lastErr = null;

    while (attempt <= maxRetries) {
      try {
        const callPromise = client.messages.create({
          model,
          max_tokens: maxTokens,
          // Cache the stable system prompt (50%+ cost reduction on
          // subsequent calls with the same system prompt).
          system: [
            {
              type: 'text',
              text: system,
              cache_control: { type: 'ephemeral' },
            },
          ],
          messages: [{ role: 'user', content: user }],
        });

        const response = await _withTimeout(callPromise, timeoutMs);

        // Anthropic SDK response shape:
        //   { content: [{ type: 'text', text: '...' }], usage: {...}, id: '...' }
        const textBlock = (response?.content || []).find(b => b.type === 'text');
        const raw = textBlock?.text || '';
        if (!raw) {
          return {
            ok: false,
            reason: REASON.EMPTY_RESPONSE,
            requestId: response?.id || null,
          };
        }

        const validated = await builder.validateProposal(raw, {
          isGoalSmart: validator.isGoalSmart,
          resolveEvidenceRef: hooks.resolveEvidenceRef || validator.resolveEvidenceRef,
          hasRecentStandardizedAssessment: hooks.hasRecentStandardizedAssessment,
          constraints: hooks.constraints,
        });

        if (!validated.ok) {
          return {
            ok: false,
            reason: REASON.PROPOSAL_REJECTED,
            errors: validated.errors,
            warnings: validated.warnings,
            requestId: response?.id || null,
            usage: response?.usage || null,
            // Surface the raw text for audit replay — caller can store
            // it in a "rejected proposals" audit collection.
            rawText: raw,
          };
        }

        return {
          ok: true,
          proposal: validated.proposal,
          confidence: validated.confidence,
          missingData: validated.missingData,
          humanConfirmationRequired: validated.humanConfirmationRequired,
          warnings: validated.warnings,
          requestId: response?.id || null,
          usage: response?.usage || null,
          attempts: attempt + 1,
        };
      } catch (err) {
        lastErr = err;
        if (err.message === 'TIMEOUT') {
          if (attempt < maxRetries && _isRetriable(err)) {
            await _sleep(_backoffMs(attempt));
            attempt += 1;
            continue;
          }
          return { ok: false, reason: REASON.TIMEOUT, attempts: attempt + 1 };
        }
        if (_isRetriable(err) && attempt < maxRetries) {
          logger.warn &&
            logger.warn(`[llm-caller] retriable error attempt ${attempt + 1}: ${err.message}`);
          await _sleep(_backoffMs(attempt));
          attempt += 1;
          continue;
        }
        return {
          ok: false,
          reason: REASON.CLIENT_THREW,
          error: err.message,
          status: err.status || err.statusCode || null,
          attempts: attempt + 1,
        };
      }
    }

    return {
      ok: false,
      reason: REASON.CLIENT_THREW,
      error: lastErr ? lastErr.message : 'unknown',
      attempts: attempt + 1,
    };
  }

  return Object.freeze({
    recommend,
    REASON,
  });
}

module.exports = {
  createCarePlanLLMCaller,
  REASON,
  DEFAULTS,
};
