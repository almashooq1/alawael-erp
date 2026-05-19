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
   * Phase-1 returns the template VERBATIM (placeholders intact).
   * Phase-2 will accept a context object and substitute tokens with
   * authorized DB-derived values.
   */
  function generateResponse(intent, _context = null) {
    const template = reg.RESPONSE_TEMPLATES[intent] || reg.RESPONSE_TEMPLATES[reg.INTENT.UNKNOWN];
    const forbidden = reg.forbiddenTokenInTemplate(template);
    if (forbidden) {
      // Phase-1 templates are author-controlled, so this is a guard
      // against future template edits sneaking forbidden tokens in.
      return {
        ok: false,
        reason: reg.REASON.RESPONSE_FORBIDDEN_CONTENT,
        details: { forbidden, intent },
      };
    }
    return { ok: true, text: template, intent };
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

    const classified = classifyIntent(message);
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

    const gen = generateResponse(intentToRespond, context);
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

  return {
    classifyIntent,
    generateResponse,
    ask,
    getSession,
  };
}

module.exports = { createParentChatbotService };
