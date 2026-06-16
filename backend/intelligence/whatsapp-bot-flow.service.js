'use strict';

/**
 * whatsapp-bot-flow.service.js — W1372.
 *
 * The **stateful finite-state machine** for the menu-driven WhatsApp bot. It is
 * PURE: `handleTurn(flowState, rawText, ctx)` takes the persisted flow state +
 * the inbound message + light context and returns a plan:
 *
 *   {
 *     reply: string,            // the text to send back
 *     nextFlowState: object,    // persist this on the conversation (idle = {unit:null})
 *     sideEffect: { kind, unit, collected } | null,  // dispatcher acts on this
 *     handled: boolean,         // false ⇒ engine declined; caller may fall through
 *   }
 *
 * No DB, no network, no `Date.now()`-dependent branching. The dispatcher
 * (whatsappWebhook.service) owns ALL I/O: sending the reply, persisting
 * `nextFlowState`, and acting on `sideEffect` (escalate / create record).
 *
 * State shape (persisted on WhatsAppConversation.botFlow):
 *   { unit: <unitId|null>, step: <int>, collected: {…}, phase: 'collecting'|'confirming' }
 * An "idle" state is `{ unit: null }` (or null/undefined).
 *
 * @module intelligence/whatsapp-bot-flow.service
 */

const reg = require('./whatsapp-bot-flow.registry');

const IDLE = Object.freeze({ unit: null, step: 0, collected: {}, phase: null });

/** Is the user currently inside a flow? */
function isActive(flowState) {
  return !!(flowState && flowState.unit && reg.UNIT_BY_ID[flowState.unit]);
}

// ─── Rendering helpers ───────────────────────────────────────────────────────

/**
 * Build the welcome + numbered main menu (spec §4). Discloses the bot identity
 * and offers human escalation — required for WhatsApp business-bot policy. When
 * `ctx.guardianName` is known, personalize the greeting.
 */
function renderWelcome(ctx = {}) {
  const greeting = ctx.guardianName ? `مرحباً ${ctx.guardianName} 👋` : 'مرحباً بك 👋';
  const lines = [
    greeting,
    `أنا *مساعد الأوائل الذكي* (بوت افتراضي 🤖) الخاص بـ ${reg.CENTER.nameAr} – ${reg.CENTER.cityAr}.`,
    'أسعد بخدمتك في كل ما يتعلق بتأهيل ورعاية أبنائكم وبناتكم ❤️',
    'يمكنك في أي وقت كتابة "موظف" للتحدث مع شخص بشري.',
    '',
    'يرجى اختيار أحد الخيارات بكتابة رقمه:',
    '',
  ];
  reg.UNITS.forEach((u, i) => lines.push(`${i + 1}) ${u.label}`));
  lines.push('');
  lines.push(reg.MENU_HINT);
  return lines.join('\n');
}

/** Prompt text for a given unit + step index. */
function stepPrompt(unit, stepIndex) {
  const step = unit.steps[stepIndex];
  return step ? step.prompt : '';
}

/** First message when entering a multi-step unit: optional intro + step 0. */
function enterUnitMessage(unit) {
  const first = stepPrompt(unit, 0);
  return unit.intro ? `${unit.intro}\n\n${first}` : first;
}

/**
 * Build the "please review" summary from collected answers (spec: every flow
 * summarizes before confirming). Skips empty optional fields.
 */
function renderSummary(unit, collected) {
  const lines = [`📋 *ملخص طلبك (${unit.label}):*`, ''];
  for (const step of unit.steps) {
    const val = collected[step.key];
    if (val == null || String(val).trim() === '') continue;
    const label = step.prompt
      .replace(/[:：].*$/s, '')
      .replace(/\s*\(.*\)\s*$/s, '')
      .trim();
    lines.push(`• ${label}: ${val}`);
  }
  lines.push('');
  lines.push('هل تؤكد إرسال الطلب؟ (نعم / لا)');
  return lines.join('\n');
}

/**
 * Closing message after a flow completes. Unit 6 (home exercises) resolves
 * department-specific content; everything else uses the unit's `closing` (or a
 * `finalize()` for the static units). Always appends the menu hint.
 */
function renderClosing(unit, collected) {
  let body;
  if (typeof unit.finalize === 'function') {
    body = unit.finalize(collected);
  } else if (unit.id === 'home_exercises') {
    const key = reg.resolveDepartmentKey(collected.department || '');
    body = key
      ? reg.HOME_EXERCISES[key]
      : [
          'لم أتعرّف على القسم المطلوب بدقة. القسم المتاح: وظيفي / نطق / تربية خاصة / سلوك.',
          'يمكنك إعادة المحاولة من القائمة، أو اكتب "موظف" للمساعدة.',
        ].join('\n');
  } else {
    body = unit.closing || 'تم استلام طلبك بنجاح ✅';
  }
  return `${body}\n\n${reg.MENU_HINT}`;
}

// ─── Core state machine ──────────────────────────────────────────────────────

function result(reply, nextFlowState, sideEffect = null, handled = true) {
  return { reply, nextFlowState, sideEffect, handled };
}

// W1381: the main-menu result carries `menu: true` so the dispatcher can render
// it as a native interactive WhatsApp list (when interactive mode is enabled)
// instead of the numbered-text fallback. The text reply is always present so
// non-interactive clients still work.
function menuResult(ctx) {
  return { reply: renderWelcome(ctx), nextFlowState: { ...IDLE }, sideEffect: null, handled: true, menu: true };
}

/**
 * Enter a unit from idle: zero-step units finalize immediately (and emit any
 * side effect); multi-step units start collecting at step 0.
 */
function enterUnit(unitId, ctx) {
  const unit = reg.UNIT_BY_ID[unitId];
  if (!unit) return menuResult(ctx);

  if (!unit.steps.length) {
    // Static / zero-step unit (info, notifications): reply + back to idle.
    const sideEffect =
      unit.sideEffect && unit.sideEffect !== reg.SIDE_EFFECT.NONE
        ? { kind: unit.sideEffect, unit: unit.id, collected: {} }
        : null;
    return result(renderClosing(unit, {}), { ...IDLE }, sideEffect);
  }

  return result(enterUnitMessage(unit), {
    unit: unit.id,
    step: 0,
    collected: {},
    phase: reg.PHASE.COLLECTING,
  });
}

/**
 * Advance a collecting flow after storing the current answer.
 * Returns the next plan (more prompts, summary→confirm, or immediate closing).
 */
function advanceCollecting(unit, state, rawText) {
  const collected = { ...(state.collected || {}) };
  const step = unit.steps[state.step];
  // Store the answer. Optional steps accept a skip token → empty string.
  collected[step.key] = step.optional && reg.isSkip(rawText) ? '' : String(rawText).trim();

  const nextIndex = state.step + 1;
  if (nextIndex < unit.steps.length) {
    return result(stepPrompt(unit, nextIndex), {
      unit: unit.id,
      step: nextIndex,
      collected,
      phase: reg.PHASE.COLLECTING,
    });
  }

  // Collection complete.
  if (unit.confirm) {
    return result(renderSummary(unit, collected), {
      unit: unit.id,
      step: state.step,
      collected,
      phase: reg.PHASE.CONFIRMING,
    });
  }

  // Read-only / informational unit: finalize now.
  const sideEffect =
    unit.sideEffect && unit.sideEffect !== reg.SIDE_EFFECT.NONE
      ? { kind: unit.sideEffect, unit: unit.id, collected }
      : null;
  return result(renderClosing(unit, collected), { ...IDLE }, sideEffect);
}

/**
 * Handle one inbound turn.
 *
 * @param {object|null} flowState - persisted state ({unit:null} when idle)
 * @param {string} rawText - the inbound message text (raw, not normalized)
 * @param {object} [ctx] - { guardianName?, beneficiaryName? } for personalization
 * @returns {{reply:string, nextFlowState:object, sideEffect:object|null, handled:boolean}}
 */
function handleTurn(flowState, rawText, ctx = {}) {
  const text = rawText == null ? '' : String(rawText);
  const active = isActive(flowState);

  // Empty / media-only inbound: if mid-flow, re-ask current prompt; else menu.
  if (!text.trim()) {
    if (active) {
      const unit = reg.UNIT_BY_ID[flowState.unit];
      if (flowState.phase === reg.PHASE.CONFIRMING) {
        return result('يرجى الرد بـ (نعم) للتأكيد أو (لا) للإلغاء.', flowState);
      }
      return result(stepPrompt(unit, flowState.step), flowState);
    }
    return menuResult(ctx);
  }

  // Menu trigger ALWAYS resets to the main menu, even mid-flow.
  if (reg.isMenuTrigger(text)) {
    return menuResult(ctx);
  }

  // ─── Idle: route to a unit or show the menu ──────────────────────────────
  if (!active) {
    const unitId = reg.resolveUnitId(text);
    if (unitId) return enterUnit(unitId, ctx);
    // Unrecognized while idle → greet + show the menu (safe default, spec §15).
    return menuResult(ctx);
  }

  // ─── Active flow ─────────────────────────────────────────────────────────
  const unit = reg.UNIT_BY_ID[flowState.unit];

  // Abort words (distinct from "إلغاء" so unit-3 action answers survive).
  if (reg.isCancelTrigger(text)) {
    return result(`تم إلغاء العملية الحالية.\n\n${reg.MENU_HINT}`, { ...IDLE });
  }

  if (flowState.phase === reg.PHASE.CONFIRMING) {
    if (reg.isYes(text)) {
      const collected = flowState.collected || {};
      const sideEffect =
        unit.sideEffect && unit.sideEffect !== reg.SIDE_EFFECT.NONE
          ? { kind: unit.sideEffect, unit: unit.id, collected }
          : null;
      return result(renderClosing(unit, collected), { ...IDLE }, sideEffect);
    }
    if (reg.isNo(text)) {
      return result(`تم إلغاء الطلب ولم يُرسَل.\n\n${reg.MENU_HINT}`, { ...IDLE });
    }
    return result('يرجى الرد بـ (نعم) للتأكيد أو (لا) للإلغاء.', flowState);
  }

  // Collecting phase.
  return advanceCollecting(unit, flowState, text);
}

module.exports = {
  IDLE,
  isActive,
  handleTurn,
  // exported for tests / dispatcher reuse
  renderWelcome,
  renderSummary,
  renderClosing,
  enterUnit,
};
