/**
 * WhatsApp event-binding dispatcher (W1517) — M5 configurable automation
 * ═══════════════════════════════════════════════════════════════════════════
 * The generic engine behind WhatsAppEventBinding: at startup it subscribes once
 * to every bindable producer event; on each event it looks up the ENABLED
 * bindings for that event (branch-aware) and messages the beneficiary's guardian
 * with each binding's rendered title/body — the same consent-gated send path the
 * hardcoded subscribers use.
 *
 * Relationship to the hardcoded subscribers (W1511 post-session, W1513
 * complaint): both default OFF. Use EITHER a hardcoded env flag OR a binding for
 * a given event — never both (would double-send). This configurable layer is the
 * go-forward mechanism + covers the other catalogued events too.
 *
 * Safety: DEFAULT OFF (ENABLE_WHATSAPP_EVENT_BINDINGS); consent-gated; auto-stubs
 * when WhatsApp disabled; per-event + per-binding try/catch. Verified in-process.
 *
 * @module services/whatsapp/whatsappEventBindingDispatcher
 */

'use strict';

const mongoose = require('mongoose');
const logger = require('../../utils/logger');
// W1519: shared guardian resolver (was a local copy) — single source of truth.
const { pickGuardian, getGuardianPhone } = require('./whatsappGuardianResolver');

const ENV_FLAG = 'ENABLE_WHATSAPP_EVENT_BINDINGS';

function getModel(name) {
  try {
    return mongoose.model(name);
  } catch {
    return null;
  }
}

// ─── Pure helpers (exported for the drift guard) ─────────────────────────────

// Render a binding body, substituting {beneficiaryName} (and trimming length).
// Unknown placeholders are left intact; missing name → empty. Pure + testable.
function renderMessage(template, ctx = {}) {
  const name = ctx.beneficiaryName || '';
  return String(template || '')
    .replace(/\{beneficiaryName\}/g, name)
    .replace(/\{sessionType\}/g, ctx.sessionType || '')
    .slice(0, 1024);
}

/**
 * Dispatch one event: find enabled bindings → resolve guardian → consent → send.
 * Deps injected for testability. Returns a per-event summary.
 */
async function handleEvent(event, payload, deps = {}) {
  const Binding = deps.Binding || getModel('WhatsAppEventBinding');
  const { whatsappService, Consent, log } = deps;
  if (!Binding || !payload || !payload.beneficiaryId) return { sent: 0, matched: 0 };

  const bindings = await Binding.find(
    Binding.dispatchFilter(event, payload.branchId || null)
  ).lean();
  if (!bindings.length) return { sent: 0, matched: 0 };

  const resolver = deps.getGuardianPhone || getGuardianPhone;
  const resolved = await resolver(payload.beneficiaryId);
  if (!resolved || !resolved.phone) return { sent: 0, matched: bindings.length };

  const verdict = await Consent.canMessage(resolved.phone);
  if (!verdict || !verdict.allowed) return { sent: 0, matched: bindings.length };

  let sent = 0;
  for (const b of bindings) {
    try {
      const body = renderMessage(b.body, {
        beneficiaryName: resolved.beneficiaryName,
        sessionType: payload.sessionType,
      });
      const r = await whatsappService.sendNotification(resolved.phone, b.title, body);
      if (r && r.success) sent += 1;
    } catch (err) {
      log?.warn?.(`[wa-event-bindings] send failed binding=${b._id}: ${err.message}`);
    }
  }
  if (sent) log?.info?.(`[wa-event-bindings] ${event} → sent ${sent}/${bindings.length}`);
  return { sent, matched: bindings.length };
}

/**
 * Subscribe to every bindable event (env-gated). Returns the array of
 * unsubscribe fns, or [] when disabled.
 */
function wireEventBindingDispatcher(bus, deps = {}) {
  const log = deps.logger || logger;
  if (process.env[ENV_FLAG] !== 'true') {
    log?.info?.(`[wa-event-bindings] disabled (set ${ENV_FLAG}=true to enable)`);
    return [];
  }
  if (!bus || typeof bus.subscribe !== 'function') return [];

  const Binding = deps.Binding || getModel('WhatsAppEventBinding') || require('../../models/WhatsAppEventBinding');
  const whatsappService = deps.whatsappService || require('./whatsappService');
  const Consent = deps.Consent || getModel('WhatsAppConsent') || require('../../models/WhatsAppConsent');
  const events = Binding.BINDABLE_EVENTS || require('../../models/WhatsAppEventBinding').BINDABLE_EVENTS;
  const handlerDeps = {
    Binding,
    whatsappService,
    Consent,
    log,
    ...(deps.getGuardianPhone ? { getGuardianPhone: deps.getGuardianPhone } : {}),
  };

  const unsubs = events.map(event =>
    bus.subscribe(event, async envelope => {
      try {
        const payload = (envelope && envelope.payload) || envelope || {};
        await handleEvent(event, payload, handlerDeps);
      } catch (err) {
        log?.warn?.(`[wa-event-bindings] handler failed for ${event}`, { error: err.message });
      }
    })
  );
  log?.info?.(`[wa-event-bindings] dispatcher wired on ${events.length} events`);
  return unsubs;
}

module.exports = {
  wireEventBindingDispatcher,
  handleEvent,
  renderMessage,
  pickGuardian,
  getGuardianPhone,
  ENV_FLAG,
};
