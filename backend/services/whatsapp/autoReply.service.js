'use strict';

/**
 * WhatsApp Auto-Reply Decision Engine — محرك قرار الرد التلقائي
 * ═══════════════════════════════════════════════════════════════════════════
 * Sits between `whatsappAI.classifyIntent()` (what the message means) and
 * the actual send call (what we do about it). Takes a classification +
 * conversation context and emits ONE of four actions:
 *
 *   - `template`   — send a pre-approved Meta template (works outside 24h
 *                    customer-service window too). Includes the template
 *                    name + params for the caller to dispatch.
 *   - `text`       — send a free-form text reply. Only valid INSIDE the
 *                    service window, which an inbound message always opens.
 *   - `escalate`   — emit an internal alert (notification + CRM ticket).
 *                    Do NOT auto-reply — a human must.
 *   - `none`       — manual review required; staff dashboard will surface.
 *
 * Why a separate module:
 *   - The current `whatsappAI.getAutoReply()` only handles 2 of the 9 intent
 *     classes and returns plain text. A clinical context needs all 9 mapped
 *     deliberately, with the choice of REPLY versus TEMPLATE versus ESCALATE
 *     made explicit and auditable.
 *   - Decision policy needs to be testable in isolation from LLM calls. The
 *     engine is pure data-in / data-out; the dispatcher (webhook handler)
 *     does the side effects.
 *   - Future per-org overrides plug in here without touching the webhook.
 *
 * Decision matrix (default policy — see `getPolicy()` for env overrides):
 *
 *   intent                  urgency=low/med            urgency=critical
 *   ─────────────────────── ────────────────────────── ──────────────────
 *   emergency               escalate (always)          escalate (always)
 *   complaint               escalate                   escalate
 *   session_inquiry         text (suggestReplies)      escalate
 *   progress_inquiry        text (suggestReplies)      escalate
 *   homework_feedback       text (acknowledgment)      none
 *   absent_notification     text (acknowledgment)      none
 *   document_request        template(doc_acknowledge)  escalate
 *   positive_feedback       text (thanks)              none
 *   general_question        none (human review)        escalate
 *
 * Rules:
 *   1. `urgency=critical` ALWAYS escalates EXCEPT where the policy says
 *      `none` — i.e. nothing is auto-sent on critical without human.
 *   2. `requiresHumanReview=true` flag from the classifier overrides any
 *      auto path and forces `none` + escalation.
 *   3. If we have NEVER messaged this phone before (no consent record AND
 *      not in 24h window), we cannot send free-form text — fall back to
 *      template path OR none.
 *
 * @module services/whatsapp/autoReply.service
 */

const logger = require('../../utils/logger');

// ─── Action types ──────────────────────────────────────────────────────────
const ACTION = Object.freeze({
  TEMPLATE: 'template',
  TEXT: 'text',
  ESCALATE: 'escalate',
  NONE: 'none',
});

// ─── Default policy ────────────────────────────────────────────────────────
// Keyed by intent. Each entry: { normal, critical } actions.
// `template` actions carry a `templateName` + a `paramsBuilder(ctx)` that
// returns the components array.
const DEFAULT_POLICY = Object.freeze({
  emergency: {
    normal: { action: ACTION.ESCALATE, severity: 'critical', notify: 'on_call_supervisor' },
    critical: { action: ACTION.ESCALATE, severity: 'critical', notify: 'on_call_supervisor' },
  },
  complaint: {
    normal: { action: ACTION.ESCALATE, severity: 'high', notify: 'service_manager' },
    critical: { action: ACTION.ESCALATE, severity: 'critical', notify: 'service_manager' },
  },
  session_inquiry: {
    normal: { action: ACTION.TEXT, replyIntent: 'session_inquiry' },
    critical: { action: ACTION.ESCALATE, severity: 'high', notify: 'case_manager' },
  },
  progress_inquiry: {
    normal: { action: ACTION.TEXT, replyIntent: 'progress_inquiry' },
    critical: { action: ACTION.ESCALATE, severity: 'high', notify: 'case_manager' },
  },
  homework_feedback: {
    normal: { action: ACTION.TEXT, replyIntent: 'homework_feedback' },
    critical: { action: ACTION.NONE },
  },
  absent_notification: {
    normal: { action: ACTION.TEXT, replyIntent: 'absent_notification' },
    critical: { action: ACTION.NONE },
  },
  document_request: {
    normal: { action: ACTION.TEMPLATE, templateName: 'document_request_ack' },
    critical: { action: ACTION.ESCALATE, severity: 'high', notify: 'documentation_team' },
  },
  positive_feedback: {
    normal: { action: ACTION.TEXT, replyIntent: 'positive_feedback' },
    critical: { action: ACTION.NONE },
  },
  general_question: {
    normal: { action: ACTION.NONE },
    critical: { action: ACTION.ESCALATE, severity: 'medium', notify: 'staff_inbox' },
  },
});

let activePolicyOverride = null;
function setPolicyOverride(policy) {
  activePolicyOverride = policy;
}
function resetPolicyOverride() {
  activePolicyOverride = null;
}
function getPolicy() {
  return activePolicyOverride || DEFAULT_POLICY;
}

// ─── Core decision ─────────────────────────────────────────────────────────

/**
 * Pure decision: classification + context → action plan. No side effects,
 * no network. The dispatcher (webhook handler) executes the plan.
 *
 * @param {object} classified - { intent, urgencyLevel, requiresHumanReview, sentiment, confidence }
 * @param {object} [context] - { canReplyFreeForm: boolean, beneficiaryName?: string, hasConsent?: boolean }
 * @returns {{
 *   action: 'template'|'text'|'escalate'|'none',
 *   reason: string,
 *   templateName?: string,
 *   replyIntent?: string,
 *   severity?: 'medium'|'high'|'critical',
 *   notify?: string,
 * }}
 */
function decide(classified = {}, context = {}) {
  const intent = classified.intent || 'general_question';
  const urgency = classified.urgencyLevel || 'low';
  const confidence = classified.confidence ?? 0.5;

  // ─── Rule 0: low-confidence classification → no auto-action.
  // Below ~0.4 the classifier is essentially guessing; a wrong reply is
  // worse than no reply.
  if (confidence < 0.4 && urgency !== 'critical') {
    return {
      action: ACTION.NONE,
      reason: `low_confidence (${confidence.toFixed(2)})`,
    };
  }

  // ─── Rule 1: classifier-flagged human review wins everything except
  // emergency escalation.
  if (classified.requiresHumanReview && intent !== 'emergency') {
    return { action: ACTION.NONE, reason: 'requires_human_review_flag' };
  }

  const policy = getPolicy();
  const entry = policy[intent] || policy.general_question;
  const branch = urgency === 'critical' ? entry.critical : entry.normal;

  // ─── Rule 2: text actions require an open service window (24h since last
  // inbound). The webhook handler should pass canReplyFreeForm=true after
  // recording the inbound; if for some reason it's false (e.g. consent
  // model unavailable), downgrade to template if defined, else none.
  if (branch.action === ACTION.TEXT && context.canReplyFreeForm === false) {
    if (entry.normal.templateName) {
      return {
        action: ACTION.TEMPLATE,
        templateName: entry.normal.templateName,
        reason: `downgraded_from_text_no_service_window`,
      };
    }
    return { action: ACTION.NONE, reason: 'no_service_window' };
  }

  return { ...branch, reason: `policy:${intent}/${urgency}` };
}

// ─── Helpers ───────────────────────────────────────────────────────────────

/**
 * After `decide()` returns a TEXT action, this resolves the actual reply
 * string by delegating to whatsappAI.suggestReplies (LLM-personalized when
 * available, falls back to REPLY_BANK).
 *
 * Separated from decide() so the decision is testable without LLM calls.
 */
async function resolveTextReply(decision, context = {}) {
  if (decision.action !== ACTION.TEXT) return null;
  try {
    const whatsappAI = require('./whatsappAI.service');
    const suggestions = await whatsappAI.suggestReplies(
      decision.replyIntent || 'general_question',
      context,
      1
    );
    return suggestions?.[0]?.text || null;
  } catch (err) {
    logger.warn(`[WhatsApp AutoReply] resolveTextReply failed: ${err.message}`);
    return null;
  }
}

/**
 * For TEMPLATE actions, build the parameter components from context.
 * Default builder uses (beneficiaryName, guardianName) — override per
 * template by registering custom builders here.
 */
function buildTemplateParams(decision, context = {}) {
  if (decision.action !== ACTION.TEMPLATE) return null;
  const params = [];
  if (context.guardianName) params.push({ type: 'text', text: context.guardianName });
  if (context.beneficiaryName) params.push({ type: 'text', text: context.beneficiaryName });
  return params.length ? [{ type: 'body', parameters: params }] : [];
}

module.exports = {
  ACTION,
  decide,
  resolveTextReply,
  buildTemplateParams,
  getPolicy,
  setPolicyOverride,
  resetPolicyOverride,
  // For testing only
  _DEFAULT_POLICY: DEFAULT_POLICY,
};
