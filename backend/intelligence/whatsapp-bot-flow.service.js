'use strict';

/**
 * whatsapp-bot-flow.service.js — W1372 (+ W1381 interactive, W1382 intelligence,
 * W1383 bilingual).
 *
 * The **stateful finite-state machine** for the menu-driven WhatsApp bot. It is
 * PURE: `handleTurn(flowState, rawText, ctx)` takes the persisted flow state +
 * the inbound message + light context and returns a plan:
 *
 *   {
 *     reply: string,            // the text to send back (in the active language)
 *     nextFlowState: object,    // persist this (idle = {unit:null}); carries `lang`
 *     sideEffect: { kind, unit, collected } | null,  // dispatcher acts on this
 *     handled: boolean,         // false ⇒ engine declined; caller may fall through
 *     menu: boolean,            // true ⇒ reply is the main menu (render as a list)
 *   }
 *
 * No DB, no network, no `Date.now()`-dependent branching (except the injectable
 * isFlowStale clock). The dispatcher owns ALL I/O.
 *
 * W1383: every user-facing string is resolved through the i18n overlay by the
 * effective language, which is sticky on `flowState.lang` (default Arabic) and
 * switchable via an explicit language trigger ("english" / "عربي").
 *
 * @module intelligence/whatsapp-bot-flow.service
 */

const reg = require('./whatsapp-bot-flow.registry');
const i18n = require('./whatsapp-bot-flow.i18n');

const IDLE = Object.freeze({ unit: null, step: 0, collected: {}, phase: null });

// W1382: TTL after which an untouched active flow is considered abandoned.
const FLOW_TTL_MS = 6 * 60 * 60 * 1000;

/** Is the user currently inside a flow? */
function isActive(flowState) {
  return !!(flowState && flowState.unit && reg.UNIT_BY_ID[flowState.unit]);
}

/** W1382: is a persisted flow stale (active but untouched beyond the TTL)? Pure. */
function isFlowStale(flowState, nowMs, ttlMs = FLOW_TTL_MS) {
  if (!isActive(flowState)) return false;
  const updated = flowState.updatedAt ? new Date(flowState.updatedAt).getTime() : NaN;
  if (!Number.isFinite(updated)) return false; // unknown age → don't reset
  return nowMs - updated > ttlMs;
}

/** W1382: classify a handled turn for usage analytics. Pure. */
function deriveBotEvent(plan, priorState) {
  if (!plan) return { event: 'idle', unit: null };
  if (plan.menu) return { event: 'menu', unit: null };
  if (plan.sideEffect) return { event: 'complete', unit: plan.sideEffect.unit };
  const nextUnit = plan.nextFlowState && plan.nextFlowState.unit;
  const priorUnit = priorState && priorState.unit;
  if (nextUnit && nextUnit !== priorUnit) return { event: 'enter', unit: nextUnit };
  if (nextUnit) return { event: 'step', unit: nextUnit };
  return { event: 'idle', unit: null };
}

// ─── Rendering helpers (W1383: all language-aware) ──────────────────────────

/** Build the welcome + numbered main menu in the active language. */
function renderWelcome(ctx = {}) {
  const lang = i18n.normLang(ctx.lang);
  const greeting = ctx.guardianName
    ? i18n.fw('greetingNamed', lang, ctx.guardianName)
    : i18n.fw('greeting', lang);
  const lines = [
    greeting,
    i18n.fw('intro', lang, reg.CENTER.nameAr, reg.CENTER.cityAr),
    i18n.fw('help', lang),
    i18n.fw('humanHint', lang),
    '',
    i18n.fw('choose', lang),
    '',
  ];
  reg.UNITS.forEach((u, i) => lines.push(`${i + 1}) ${i18n.unitLabel(u.id, u.label, lang)}`));
  lines.push('');
  lines.push(i18n.fw('menuHint', lang));
  return lines.join('\n');
}

/** Prompt text for a given unit + step index, localized. */
function stepPrompt(unit, stepIndex, lang) {
  const step = unit.steps[stepIndex];
  return step ? i18n.stepPrompt(unit.id, step.key, step.prompt, lang) : '';
}

/** First message when entering a multi-step unit: optional intro + step 0. */
function enterUnitMessage(unit, lang) {
  const first = stepPrompt(unit, 0, lang);
  const intro = i18n.unitIntro(unit.id, unit.intro, lang);
  return intro ? `${intro}\n\n${first}` : first;
}

/** Build the "please review" summary from collected answers, localized. */
function renderSummary(unit, collected, lang) {
  const label = i18n.unitLabel(unit.id, unit.label, lang);
  const lines = [i18n.fw('summaryHeader', lang, label), ''];
  for (const step of unit.steps) {
    const val = collected[step.key];
    if (val == null || String(val).trim() === '') continue;
    const promptText = i18n.stepPrompt(unit.id, step.key, step.prompt, lang);
    const fieldLabel = promptText
      .replace(/[:：].*$/s, '')
      .replace(/\s*\(.*\)\s*$/s, '')
      .trim();
    lines.push(`• ${fieldLabel}: ${val}`);
  }
  lines.push('');
  lines.push(i18n.fw('confirmQ', lang));
  return lines.join('\n');
}

/** Closing message after a flow completes, localized; always appends the hint. */
function renderClosing(unit, collected, lang) {
  let body;
  if (unit.id === 'info') {
    body = i18n.contentBlock('info', reg.INFO_TEXT, lang);
  } else if (unit.id === 'notifications') {
    body = i18n.contentBlock('notifications', reg.NOTIFICATIONS_INFO, lang);
  } else if (unit.id === 'location') {
    body = i18n.contentBlock('location', reg.LOCATION_INFO, lang);
  } else if (unit.id === 'faq') {
    body = reg.resolveFaqAnswer(collected.faqTopic); // Arabic content (translation follow-up)
  } else if (unit.id === 'home_exercises') {
    const key = reg.resolveDepartmentKey(collected.department || '');
    if (key) body = reg.HOME_EXERCISES[key]; // Arabic content (translation follow-up)
    else
      body =
        i18n.normLang(lang) === 'en'
          ? "I couldn't identify the department. Available: occupational / speech / special education / behavior. Try again from the menu or type \"agent\"."
          : [
              'لم أتعرّف على القسم المطلوب بدقة. القسم المتاح: وظيفي / نطق / تربية خاصة / سلوك.',
              'يمكنك إعادة المحاولة من القائمة، أو اكتب "موظف" للمساعدة.',
            ].join('\n');
  } else {
    const fallback = i18n.normLang(lang) === 'en' ? 'Your request was received ✅' : 'تم استلام طلبك بنجاح ✅';
    body = i18n.unitClosing(unit.id, unit.closing || fallback, lang);
  }
  return `${body}\n\n${i18n.fw('menuHint', lang)}`;
}

// ─── Core state machine ──────────────────────────────────────────────────────

function result(reply, nextFlowState, sideEffect = null, handled = true) {
  return { reply, nextFlowState, sideEffect, handled };
}

/** Attach the active language to a (cloned) state object. */
function withLang(state, lang) {
  return { ...state, lang: i18n.normLang(lang) };
}

// W1381: the main-menu result carries `menu: true` so the dispatcher can render
// it as a native interactive list. `prefix` prepends a one-line notice (used by
// the W1383 language-switch acknowledgement). Always carries the active lang.
function menuResult(ctx, prefix) {
  const lang = i18n.normLang(ctx.lang);
  let reply = renderWelcome(ctx);
  if (prefix) reply = `${prefix}\n\n${reply}`;
  return { reply, nextFlowState: { ...IDLE, lang }, sideEffect: null, handled: true, menu: true };
}

/**
 * Enter a unit from idle: zero-step units finalize immediately (and emit any
 * side effect); multi-step units start collecting at step 0.
 */
function enterUnit(unitId, ctx = {}) {
  const lang = i18n.normLang(ctx.lang);
  const unit = reg.UNIT_BY_ID[unitId];
  if (!unit) return menuResult(ctx);

  if (!unit.steps.length) {
    const sideEffect =
      unit.sideEffect && unit.sideEffect !== reg.SIDE_EFFECT.NONE
        ? { kind: unit.sideEffect, unit: unit.id, collected: {} }
        : null;
    return result(renderClosing(unit, {}, lang), { ...IDLE, lang }, sideEffect);
  }

  return result(enterUnitMessage(unit, lang), {
    unit: unit.id,
    step: 0,
    collected: {},
    phase: reg.PHASE.COLLECTING,
    lang,
  });
}

/** Advance a collecting flow after storing the current answer. */
function advanceCollecting(unit, state, rawText) {
  const lang = i18n.normLang(state.lang);
  const collected = { ...(state.collected || {}) };
  const step = unit.steps[state.step];
  collected[step.key] = step.optional && reg.isSkip(rawText) ? '' : String(rawText).trim();

  const nextIndex = state.step + 1;
  if (nextIndex < unit.steps.length) {
    return result(stepPrompt(unit, nextIndex, lang), {
      unit: unit.id,
      step: nextIndex,
      collected,
      phase: reg.PHASE.COLLECTING,
      lang,
    });
  }

  if (unit.confirm) {
    return result(renderSummary(unit, collected, lang), {
      unit: unit.id,
      step: state.step,
      collected,
      phase: reg.PHASE.CONFIRMING,
      lang,
    });
  }

  const sideEffect =
    unit.sideEffect && unit.sideEffect !== reg.SIDE_EFFECT.NONE
      ? { kind: unit.sideEffect, unit: unit.id, collected }
      : null;
  return result(renderClosing(unit, collected, lang), { ...IDLE, lang }, sideEffect);
}

/**
 * Handle one inbound turn.
 *
 * @param {object|null} flowState - persisted state ({unit:null} when idle); may carry `lang`
 * @param {string} rawText - the inbound message text (raw, not normalized)
 * @param {object} [ctx] - { guardianName?, beneficiaryName?, lang? }
 */
function handleTurn(flowState, rawText, ctx = {}) {
  const text = rawText == null ? '' : String(rawText);
  const active = isActive(flowState);

  // W1383: resolve the effective (sticky) language + honor an explicit switch.
  const current = i18n.normLang((flowState && flowState.lang) || ctx.lang);
  const lang = i18n.detectLangPreference(text, current);
  const lctx = { ...ctx, lang };

  // Explicit language switch → acknowledge + show the menu in the new language.
  if (text.trim() && lang !== current) {
    return menuResult(lctx, i18n.fw('switched', lang));
  }

  // Empty / media-only inbound: if mid-flow, re-ask current prompt; else menu.
  if (!text.trim()) {
    if (active) {
      const unit = reg.UNIT_BY_ID[flowState.unit];
      if (flowState.phase === reg.PHASE.CONFIRMING) {
        return result(i18n.fw('confirmPrompt', lang), withLang(flowState, lang));
      }
      return result(stepPrompt(unit, flowState.step, lang), withLang(flowState, lang));
    }
    return menuResult(lctx);
  }

  // Menu trigger ALWAYS resets to the main menu, even mid-flow.
  if (reg.isMenuTrigger(text)) {
    return menuResult(lctx);
  }

  // ─── Idle: route to a unit or show the menu ──────────────────────────────
  if (!active) {
    const unitId = reg.resolveUnitId(text);
    if (unitId) return enterUnit(unitId, lctx);
    return menuResult(lctx);
  }

  // ─── Active flow ─────────────────────────────────────────────────────────
  const unit = reg.UNIT_BY_ID[flowState.unit];

  // Abort words (distinct from "إلغاء" so unit-3 action answers survive).
  if (reg.isCancelTrigger(text)) {
    return result(`${i18n.fw('cancelled', lang)}\n\n${i18n.fw('menuHint', lang)}`, { ...IDLE, lang });
  }

  if (flowState.phase === reg.PHASE.CONFIRMING) {
    if (reg.isYes(text)) {
      const collected = flowState.collected || {};
      const sideEffect =
        unit.sideEffect && unit.sideEffect !== reg.SIDE_EFFECT.NONE
          ? { kind: unit.sideEffect, unit: unit.id, collected }
          : null;
      return result(renderClosing(unit, collected, lang), { ...IDLE, lang }, sideEffect);
    }
    if (reg.isNo(text)) {
      return result(`${i18n.fw('notSent', lang)}\n\n${i18n.fw('menuHint', lang)}`, { ...IDLE, lang });
    }
    return result(i18n.fw('confirmPrompt', lang), withLang(flowState, lang));
  }

  // Collecting phase.
  return advanceCollecting(unit, withLang(flowState, lang), text);
}

module.exports = {
  IDLE,
  FLOW_TTL_MS,
  isActive,
  isFlowStale,
  deriveBotEvent,
  handleTurn,
  // exported for tests / dispatcher reuse
  renderWelcome,
  renderSummary,
  renderClosing,
  enterUnit,
};
