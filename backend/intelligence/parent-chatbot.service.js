'use strict';

/**
 * parent-chatbot.service.js — Wave 120 / P3.6 Phase 1.
 *
 * Parent-facing chatbot service. Phase 1 = rule-based intent
 * classifier + canned response templates + conversation persistence.
 * Phase 2 (Wave 121+) will swap the classifier + responder for an
 * LLM-backed pipeline behind the same `ask()` contract.
 *
 * Closes the final P3 deliverable from blueprint/09-roadmap.md §5.
 *
 * Public API:
 *   classifyIntent(message)                                   pure
 *   generateResponse(intent, context?)                        pure
 *   ask({sessionId?, userId, beneficiaryId?, message, context?, branchId?})
 *     → { ok, sessionId, intent, confidence, response, turnIndex,
 *         clarification?, escalated? }
 *     | { ok:false, reason, ... }
 *   getSession(sessionId, { actorUserId, isAdmin? })
 *     → { ok, session } | { ok:false, reason }
 *
 * Audit posture:
 *   - Every ask() writes a turn to ParentChatbotSession (or returns a
 *     fresh one). Conversation text + resolved intent are stored;
 *     clinical detail is never included in templates.
 *   - getSession enforces ownership: parents can only read their own
 *     sessions. Admin/support callers must pass `isAdmin:true` (caller
 *     wires this from the auth/RBAC layer).
 */

const crypto = require('crypto');
const reg = require('./parent-chatbot.registry');

function createParentChatbotService({
  sessionModel = null,
  contextService = null, // Wave 122: optional context resolver
  llmClassifier = null, // Wave 123: optional LLM classifier
  ragRetriever = null, // W283c: optional RAG retriever for POLICY_QUERY intent
  logger = console,
  now = () => new Date(),
} = {}) {
  if (!sessionModel) {
    throw new Error('parent-chatbot: sessionModel is required');
  }

  // ─── Pure: intent classifier ────────────────────────────────────

  function classifyIntent(message) {
    const normalized = reg.normalizeText(message);
    if (!normalized) {
      return {
        intent: reg.INTENT.UNKNOWN,
        confidence: 0,
        matchedKeywords: [],
        runnerUp: null,
      };
    }
    const scores = [];
    for (const intent of reg.INTENTS) {
      if (intent === reg.INTENT.UNKNOWN) continue;
      const r = reg.scoreIntent(normalized, intent);
      if (r.score > 0) scores.push({ intent, ...r });
    }
    scores.sort((a, b) => b.score - a.score);
    const top = scores[0];
    const runnerUp = scores[1] || null;

    if (!top || top.score < reg.CONFIDENCE_THRESHOLDS.CLARIFY) {
      return {
        intent: reg.INTENT.UNKNOWN,
        confidence: 0,
        matchedKeywords: [],
        runnerUp: null,
      };
    }
    return {
      intent: top.intent,
      confidence: top.score,
      matchedKeywords: top.matched,
      runnerUp: runnerUp ? { intent: runnerUp.intent, confidence: runnerUp.score } : null,
    };
  }

  // ─── Pure: response generator ───────────────────────────────────

  /**
   * Resolves the canned template for an intent and, when a `tokens`
   * map is provided, substitutes `{TOKEN}` placeholders. Wave 120
   * (Phase 1) returned templates verbatim; Wave 122 (Phase 2a) accepts
   * a pre-resolved token map (typically from the context service) and
   * fills them. Missing tokens are left as `{TOKEN}` so QA can spot
   * unfilled placeholders.
   *
   * Token filling is delegated to `contextService.fillTemplate` when
   * available (single source of truth for the substitution pattern);
   * a local fallback preserves Phase-1 behavior when the service
   * isn't wired.
   */
  function generateResponse(intent, tokens = null) {
    const template = reg.RESPONSE_TEMPLATES[intent] || reg.RESPONSE_TEMPLATES[reg.INTENT.UNKNOWN];
    const forbidden = reg.forbiddenTokenInTemplate(template);
    if (forbidden) {
      // Templates are author-controlled, so this is a guard against
      // future template edits sneaking forbidden tokens in.
      return {
        ok: false,
        reason: reg.REASON.RESPONSE_FORBIDDEN_CONTENT,
        details: { forbidden, intent },
      };
    }
    if (tokens && typeof tokens === 'object') {
      const filled =
        contextService && typeof contextService.fillTemplate === 'function'
          ? contextService.fillTemplate(template, tokens)
          : _localFillTemplate(template, tokens);
      // Re-check the filled text for forbidden content — a token VALUE
      // could carry a banned word (e.g. a free-text branch address).
      const filledForbidden = reg.forbiddenTokenInTemplate(filled);
      if (filledForbidden) {
        return {
          ok: false,
          reason: reg.REASON.RESPONSE_FORBIDDEN_CONTENT,
          details: { forbidden: filledForbidden, intent, source: 'token-value' },
        };
      }
      return { ok: true, text: filled, intent, filled: true };
    }
    return { ok: true, text: template, intent, filled: false };
  }

  function _localFillTemplate(template, tokens) {
    if (!template || typeof template !== 'string') return '';
    if (!tokens || typeof tokens !== 'object') return template;
    return template.replace(/\{([A-Z_][A-Z0-9_]*)\}/g, (match, name) => {
      if (Object.prototype.hasOwnProperty.call(tokens, name)) {
        const val = tokens[name];
        if (val === null || val === undefined) return match;
        return String(val);
      }
      return match;
    });
  }

  // ─── ID helpers ─────────────────────────────────────────────────

  function _newSessionId() {
    return `cs-${crypto.randomBytes(8).toString('hex')}`;
  }

  // ─── Orchestrator ───────────────────────────────────────────────

  async function ask({
    sessionId = null,
    userId = null,
    beneficiaryId = null,
    message = '',
    context = null,
    branchId = null,
  } = {}) {
    if (!message || typeof message !== 'string' || message.trim() === '') {
      return { ok: false, reason: reg.REASON.MESSAGE_REQUIRED };
    }
    if (message.length > reg.MAX_MESSAGE_LENGTH) {
      return {
        ok: false,
        reason: reg.REASON.MESSAGE_TOO_LONG,
        details: { maxLength: reg.MAX_MESSAGE_LENGTH, actualLength: message.length },
      };
    }

    // Wave 123: prefer LLM classifier when wired, fall back to the
    // rule-based one. The LLM call is async + best-effort; any
    // degraded path (CLIENT_MISSING / TIMEOUT / INVALID_RESPONSE /
    // CLIENT_THREW) silently falls through to the rule-based
    // classifier. The `classifierSource` field on the response
    // exposes which path won.
    let classified = null;
    let classifierSource = 'rule';
    if (llmClassifier && typeof llmClassifier.classify === 'function') {
      try {
        const llmResult = await llmClassifier.classify(message);
        if (llmResult && llmResult.ok) {
          classified = {
            intent: llmResult.intent,
            confidence: llmResult.confidence,
            matchedKeywords: [],
            runnerUp: null,
          };
          classifierSource = llmResult.source === 'cache' ? 'llm-cache' : 'llm';
        }
      } catch (err) {
        logger.warn(`[parent-chatbot] llmClassifier threw: ${err.message}`);
      }
    }
    if (!classified) {
      classified = classifyIntent(message);
      classifierSource = 'rule';
    }
    const askedAt = now();

    // Decide whether to auto-respond, clarify, or escalate.
    let intentToRespond = classified.intent;
    let clarification = null;
    if (
      classified.intent !== reg.INTENT.UNKNOWN &&
      classified.confidence < reg.CONFIDENCE_THRESHOLDS.AUTO_RESPOND
    ) {
      // Confidence in [CLARIFY, AUTO_RESPOND) → emit a clarification
      // prompt rather than guessing.
      clarification = {
        topIntent: classified.intent,
        runnerUp: classified.runnerUp ? classified.runnerUp.intent : null,
        confidence: classified.confidence,
      };
      intentToRespond = reg.INTENT.UNKNOWN; // emit UNKNOWN template + clarification context
    }

    // Wave 122: if a context service is wired, resolve token values
    // from DB for the chosen intent. Caller-supplied `context` (a raw
    // token map) takes precedence — useful for testing + future LLM
    // wave that may build its own token graph.
    let resolvedTokens = context && typeof context === 'object' ? { ...context } : null;
    let contextStatus = 'unresolved';
    if (
      !resolvedTokens &&
      contextService &&
      typeof contextService.resolveContext === 'function' &&
      intentToRespond !== reg.INTENT.UNKNOWN
    ) {
      try {
        const r = await contextService.resolveContext({
          intent: intentToRespond,
          userId,
          beneficiaryId,
          branchId,
        });
        if (r && r.ok) {
          resolvedTokens = r.tokens || {};
          contextStatus = 'resolved';
        } else {
          contextStatus = r && r.reason ? `degraded:${r.reason}` : 'degraded';
        }
      } catch (err) {
        logger.warn(`[parent-chatbot] contextService threw: ${err.message}`);
        contextStatus = 'degraded:threw';
      }
    } else if (resolvedTokens) {
      contextStatus = 'caller-supplied';
    }

    // W283c — POLICY_QUERY intent: call ragRetriever and merge ANSWER_TEXT
    // + CITATIONS tokens. If retrieval returns 0 chunks above threshold,
    // downgrade to UNKNOWN so the user is not lied to with a synthesized
    // answer based on irrelevant chunks.
    if (intentToRespond === reg.INTENT.POLICY_QUERY) {
      if (ragRetriever && typeof ragRetriever.retrieve === 'function') {
        try {
          const ragResult = await ragRetriever.retrieve(message, {
            topK: 3,
            similarityThreshold: 0.6,
            branchId,
            queryLang: 'ar',
            // W283e: enable keyword fallback. When embedding provider is
            // weak (mock-mode or under-tuned production provider), vector
            // pass may return 0 above threshold. Keyword fallback rescues
            // via Arabic-normalized token overlap so POLICY_QUERY answers
            // something useful instead of always degrading to UNKNOWN.
            keywordFallback: 'auto',
          });
          if (ragResult && ragResult.chunks && ragResult.chunks.length > 0) {
            const answerText = ragResult.chunks.map(c => c.chunkText).join('\n\n---\n\n');
            const citations = [...new Set(ragResult.chunks.map(c => c.sourceDocTitle))].join(', ');
            resolvedTokens = {
              ...(resolvedTokens || {}),
              ANSWER_TEXT: answerText,
              CITATIONS: citations,
              RAG_RETRIEVAL_ID: ragResult.retrievalId ? String(ragResult.retrievalId) : null,
            };
            contextStatus =
              contextStatus === 'unresolved' ? 'rag-resolved' : contextStatus + '+rag';
          } else {
            // No relevant chunks → downgrade to UNKNOWN
            intentToRespond = reg.INTENT.UNKNOWN;
            contextStatus = 'rag-no-match';
          }
        } catch (err) {
          logger.warn(`[parent-chatbot] ragRetriever threw: ${err.message}`);
          // Downgrade to UNKNOWN so we don't emit a template with unfilled tokens
          intentToRespond = reg.INTENT.UNKNOWN;
          contextStatus = 'rag-threw';
        }
      } else {
        // RAG not wired → cannot answer policy queries → fall through to UNKNOWN
        intentToRespond = reg.INTENT.UNKNOWN;
        contextStatus = 'rag-not-wired';
      }
    }

    const gen = generateResponse(intentToRespond, resolvedTokens);
    if (!gen.ok) {
      return gen;
    }

    // Persist a turn. Either upsert the existing session or create a new one.
    let session = null;
    const turn = {
      askedAt,
      message: message.slice(0, reg.MAX_MESSAGE_LENGTH),
      intent: classified.intent,
      confidence: classified.confidence,
      respondedIntent: intentToRespond,
      response: gen.text,
      clarification: clarification || undefined,
    };

    try {
      if (sessionId) {
        const existing = await _loadSession(sessionId);
        if (existing) {
          if (userId && String(existing.userId) !== String(userId)) {
            return { ok: false, reason: reg.REASON.SESSION_NOT_OWNED };
          }
          session = existing;
          session.turns = Array.isArray(session.turns) ? session.turns : [];
          session.turns.push(turn);
          session.lastActivityAt = askedAt;
          session.turnCount = session.turns.length;
          await _persistSession(session);
        } else {
          // Caller passed a sessionId that doesn't exist — create a
          // fresh session under that id rather than failing, so the
          // client doesn't need a separate "create session" round-trip.
          session = await _createSession({
            sessionId,
            userId,
            beneficiaryId,
            branchId,
            firstTurn: turn,
          });
        }
      } else {
        session = await _createSession({
          sessionId: _newSessionId(),
          userId,
          beneficiaryId,
          branchId,
          firstTurn: turn,
        });
      }
    } catch (err) {
      logger.warn(`[parent-chatbot] persist failed: ${err.message}`);
      return { ok: false, reason: reg.REASON.CHATBOT_UNAVAILABLE, message: err.message };
    }

    return {
      ok: true,
      sessionId: session.sessionId,
      intent: classified.intent,
      confidence: classified.confidence,
      response: gen.text,
      contextStatus,
      filled: Boolean(gen.filled),
      classifierSource,
      turnIndex: session.turnCount - 1,
      clarification: clarification || null,
      escalated: classified.intent === reg.INTENT.ESCALATE_HUMAN,
    };
  }

  // ─── Session loader ─────────────────────────────────────────────

  async function getSession(sessionId, { actorUserId = null, isAdmin = false } = {}) {
    if (!sessionId) {
      return { ok: false, reason: reg.REASON.SESSION_NOT_FOUND };
    }
    let s;
    try {
      s = await _loadSession(sessionId);
    } catch (err) {
      logger.warn(`[parent-chatbot] getSession failed: ${err.message}`);
      return { ok: false, reason: reg.REASON.CHATBOT_UNAVAILABLE, message: err.message };
    }
    if (!s) {
      return { ok: false, reason: reg.REASON.SESSION_NOT_FOUND };
    }
    if (!isAdmin && actorUserId && String(s.userId) !== String(actorUserId)) {
      return { ok: false, reason: reg.REASON.SESSION_NOT_OWNED };
    }
    const turns = Array.isArray(s.turns) ? s.turns : [];
    return {
      ok: true,
      session: {
        sessionId: s.sessionId,
        userId: s.userId,
        beneficiaryId: s.beneficiaryId,
        branchId: s.branchId,
        startedAt: s.startedAt,
        lastActivityAt: s.lastActivityAt,
        turnCount: s.turnCount || turns.length,
        turns: turns.slice(-reg.MAX_TURNS_IN_RESPONSE),
      },
    };
  }

  // ─── Wave 124: Admin visibility ─────────────────────────────────

  /**
   * Admin-only: list recent sessions across all users. Filters are
   * optional and AND-composed. Supports pagination via limit + offset.
   * Returns lightweight summaries (sessionId, ownership, timestamps,
   * turnCount, last intent + escalated flag); full turns are fetched
   * via getSession.
   */
  async function listSessions({
    userId = null,
    beneficiaryId = null,
    branchId = null,
    since = null,
    intent = null,
    escalatedOnly = false,
    limit = 50,
    offset = 0,
  } = {}) {
    const q = {};
    if (userId) q.userId = userId;
    if (beneficiaryId) q.beneficiaryId = beneficiaryId;
    if (branchId) q.branchId = branchId;
    if (since) q.lastActivityAt = { $gte: new Date(since) };

    let items;
    try {
      const cursor = sessionModel.find(q);
      const chained =
        cursor && typeof cursor.sort === 'function' ? cursor.sort({ lastActivityAt: -1 }) : cursor;
      items = await _resolveCursor(chained);
    } catch (err) {
      logger.warn(`[parent-chatbot] listSessions failed: ${err.message}`);
      return { ok: false, reason: reg.REASON.CHATBOT_UNAVAILABLE, message: err.message };
    }
    items = Array.isArray(items) ? items : [];

    // Post-filter on intent (substring match against turns) + escalated
    if (intent || escalatedOnly) {
      items = items.filter(s => {
        const turns = Array.isArray(s.turns) ? s.turns : [];
        if (intent) {
          const hasIntent = turns.some(t => t && t.intent === intent);
          if (!hasIntent) return false;
        }
        if (escalatedOnly) {
          const wasEscalated = turns.some(t => t && t.intent === reg.INTENT.ESCALATE_HUMAN);
          if (!wasEscalated) return false;
        }
        return true;
      });
    }

    const total = items.length;
    const slice = items.slice(offset, offset + limit);
    const summaries = slice.map(s => {
      const turns = Array.isArray(s.turns) ? s.turns : [];
      const lastTurn = turns[turns.length - 1] || null;
      return {
        sessionId: s.sessionId,
        userId: s.userId ? String(s.userId) : null,
        beneficiaryId: s.beneficiaryId ? String(s.beneficiaryId) : null,
        branchId: s.branchId ? String(s.branchId) : null,
        startedAt: s.startedAt,
        lastActivityAt: s.lastActivityAt,
        turnCount: s.turnCount || turns.length,
        lastIntent: lastTurn ? lastTurn.intent : null,
        lastAskedAt: lastTurn ? lastTurn.askedAt : null,
        escalated: turns.some(t => t && t.intent === reg.INTENT.ESCALATE_HUMAN),
      };
    });

    return {
      ok: true,
      total,
      limit,
      offset,
      sessions: summaries,
    };
  }

  /**
   * Admin-only: aggregate stats over the rolling window.
   *   - byIntent: count per intent across all turns
   *   - byClassifierSource: rule / llm / llm-cache hit counts (when
   *     the turn payload preserved that — Wave 123+ writes preserve
   *     `intent` per turn; classifier source is not in the schema yet)
   *   - escalationRate: turns with intent=ESCALATE_HUMAN / total turns
   *   - avgConfidence: mean of turn confidences (skips zero/null)
   *   - sessionCount, turnCount
   *   - oldestSessionAt, newestSessionAt
   */
  async function getStats({ since = null, branchId = null } = {}) {
    const sinceDate = since ? new Date(since) : new Date(now().getTime() - 7 * 24 * 3600 * 1000);
    const q = { lastActivityAt: { $gte: sinceDate } };
    if (branchId) q.branchId = branchId;

    let items;
    try {
      const cursor = sessionModel.find(q);
      items = await _resolveCursor(cursor);
    } catch (err) {
      logger.warn(`[parent-chatbot] getStats failed: ${err.message}`);
      return { ok: false, reason: reg.REASON.CHATBOT_UNAVAILABLE };
    }
    items = Array.isArray(items) ? items : [];

    const byIntent = {};
    let turnCount = 0;
    let escalatedCount = 0;
    let confidenceSum = 0;
    let confidenceN = 0;
    let oldestSessionAt = null;
    let newestSessionAt = null;

    for (const s of items) {
      if (s.startedAt) {
        const t = new Date(s.startedAt).getTime();
        if (oldestSessionAt === null || t < oldestSessionAt) oldestSessionAt = t;
        if (newestSessionAt === null || t > newestSessionAt) newestSessionAt = t;
      }
      const turns = Array.isArray(s.turns) ? s.turns : [];
      turnCount += turns.length;
      for (const t of turns) {
        if (!t) continue;
        if (t.intent) {
          byIntent[t.intent] = (byIntent[t.intent] || 0) + 1;
        }
        if (t.intent === reg.INTENT.ESCALATE_HUMAN) escalatedCount++;
        if (Number.isFinite(t.confidence) && t.confidence > 0) {
          confidenceSum += t.confidence;
          confidenceN++;
        }
      }
    }

    return {
      ok: true,
      branchId: branchId ? String(branchId) : null,
      since: sinceDate.toISOString(),
      sessionCount: items.length,
      turnCount,
      escalationRate: turnCount > 0 ? round4(escalatedCount / turnCount) : 0,
      avgConfidence: confidenceN > 0 ? round4(confidenceSum / confidenceN) : null,
      byIntent,
      oldestSessionAt: oldestSessionAt ? new Date(oldestSessionAt).toISOString() : null,
      newestSessionAt: newestSessionAt ? new Date(newestSessionAt).toISOString() : null,
    };
  }

  async function _resolveCursor(cursor) {
    if (cursor == null) return [];
    if (Array.isArray(cursor)) return cursor;
    if (typeof cursor.lean === 'function') return cursor.lean();
    if (typeof cursor.then === 'function') return cursor;
    return cursor;
  }

  function round4(n) {
    return Math.round(Number(n) * 10000) / 10000;
  }

  // ─── Internal model helpers ─────────────────────────────────────

  async function _loadSession(sessionId) {
    const q = sessionModel.findOne
      ? sessionModel.findOne({ sessionId })
      : sessionModel.find({ sessionId });
    let r = await (q && typeof q.lean === 'function' ? q.lean() : q);
    if (Array.isArray(r)) r = r[0];
    return r || null;
  }

  async function _persistSession(session) {
    if (typeof sessionModel.updateOne === 'function' && session.sessionId) {
      await sessionModel.updateOne(
        { sessionId: session.sessionId },
        {
          $set: {
            turns: session.turns,
            lastActivityAt: session.lastActivityAt,
            turnCount: session.turnCount,
          },
        }
      );
      return session;
    }
    if (typeof session.save === 'function') {
      await session.save();
      return session;
    }
    throw new Error('sessionModel has no updateOne and document has no save');
  }

  async function _createSession({ sessionId, userId, beneficiaryId, branchId, firstTurn }) {
    const doc = new sessionModel({
      sessionId,
      userId: userId || null,
      beneficiaryId: beneficiaryId || null,
      branchId: branchId || null,
      startedAt: firstTurn.askedAt,
      lastActivityAt: firstTurn.askedAt,
      turns: [firstTurn],
      turnCount: 1,
    });
    if (typeof doc.save === 'function') {
      await doc.save();
      return doc;
    }
    // Defensive fallback for plain-object mocks.
    return doc;
  }

  /**
   * Wave 126: surfaces the LLM classifier's rolling telemetry to the
   * admin endpoint. Returns ok:false with LLM_UNAVAILABLE when the
   * classifier isn't wired (env without ANTHROPIC_API_KEY).
   */
  function getLlmStats(opts = {}) {
    if (!llmClassifier || typeof llmClassifier.getTelemetry !== 'function') {
      return { ok: false, reason: 'LLM_UNAVAILABLE' };
    }
    return llmClassifier.getTelemetry(opts);
  }

  return {
    classifyIntent,
    getLlmStats,
    listSessions,
    getStats,
    generateResponse,
    ask,
    getSession,
  };
}

module.exports = { createParentChatbotService };
