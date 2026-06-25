/**
 * WhatsApp post-session summary subscriber (W1511) — M5 automation
 * ═══════════════════════════════════════════════════════════════════════════
 * Env-gated, default-OFF event subscriber: when a clinical session completes
 * (`sessions.session.completed` on the integration bus), send the beneficiary's
 * guardian a brief WhatsApp note. The blueprint's "post-session" automation
 * scenario — the first wired event→message producer.
 *
 * Safety (high-stakes auto-messaging, so layered):
 *   - DEFAULT OFF (ENABLE_WHATSAPP_POST_SESSION_SUMMARY). Inert until activated.
 *   - Consent-gated: WhatsAppConsent.canMessage(phone) must allow.
 *   - Auto-stubs when WhatsApp itself is disabled (no real send in non-prod).
 *   - Per-event try/catch; a handler failure never disturbs other subscribers.
 *
 * Verified in-process (no HTTP boot) — see whatsapp-post-session-subscriber-wave1511.
 *
 * @module services/whatsapp/whatsappPostSessionSubscriber
 */

'use strict';

const mongoose = require('mongoose');
const logger = require('../../utils/logger');

const ENV_FLAG = 'ENABLE_WHATSAPP_POST_SESSION_SUMMARY';
const EVENT = 'sessions.session.completed';

function getModel(name) {
  try {
    return mongoose.model(name);
  } catch {
    return null;
  }
}

// ─── Pure helper (exported for the drift guard) ──────────────────────────────
// Pick the best contactable guardian: legal guardian → primary caregiver →
// first member with a phone. Returns the member or null. Pure + testable.
function pickGuardian(familyMembers) {
  if (!Array.isArray(familyMembers) || !familyMembers.length) return null;
  return (
    familyMembers.find(m => m && m.hasLegalGuardianship && m.phone) ||
    familyMembers.find(m => m && m.isPrimaryCaregiver && m.phone) ||
    familyMembers.find(m => m && m.phone) ||
    null
  );
}

async function getGuardianPhone(beneficiaryId) {
  const Beneficiary = getModel('Beneficiary');
  if (!Beneficiary || !beneficiaryId) return null;
  const ben = await Beneficiary.findById(beneficiaryId).select('familyMembers firstName').lean();
  const g = pickGuardian(ben && ben.familyMembers);
  return g ? { phone: g.phone, beneficiaryName: (ben && ben.firstName) || null } : null;
}

/**
 * Core handler: resolve guardian → consent → send. Deps are injected so the
 * full loop is unit + integration testable without DB/network.
 * @returns {Promise<{sent:boolean, reason:string}>}
 */
async function handleSessionCompleted(payload, deps = {}) {
  const { whatsappService, Consent, log } = deps;
  if (!payload || !payload.beneficiaryId) return { sent: false, reason: 'no_beneficiary' };

  const resolver = deps.getGuardianPhone || getGuardianPhone;
  const resolved = await resolver(payload.beneficiaryId);
  if (!resolved || !resolved.phone) return { sent: false, reason: 'no_guardian_phone' };

  const verdict = await Consent.canMessage(resolved.phone);
  if (!verdict || !verdict.allowed) {
    return { sent: false, reason: `consent:${(verdict && verdict.reason) || 'denied'}` };
  }

  const title = 'تحديث الجلسة';
  const body =
    `تم إكمال جلسة ${payload.sessionType || ''} اليوم. شكراً لمتابعتكم — لأي استفسار راسلونا هنا.`.trim();
  const r = await whatsappService.sendNotification(resolved.phone, title, body);
  if (r && r.success) {
    log?.info?.(`[whatsapp-post-session] ${r.stub ? 'stub' : 'sent'} for beneficiary=${payload.beneficiaryId}`);
    return { sent: true, reason: r.stub ? 'stub' : 'sent' };
  }
  return { sent: false, reason: 'send_failed' };
}

/**
 * Register the subscriber on the bus. Env-gated; returns the unsubscribe fn or
 * null when disabled / no bus.
 */
function wireWhatsappPostSessionSummary(bus, deps = {}) {
  const log = deps.logger || logger;
  if (process.env[ENV_FLAG] !== 'true') {
    log?.info?.(`[whatsapp-post-session] disabled (set ${ENV_FLAG}=true to enable)`);
    return null;
  }
  if (!bus || typeof bus.subscribe !== 'function') return null;

  const whatsappService = deps.whatsappService || require('./whatsappService');
  const Consent = deps.Consent || getModel('WhatsAppConsent') || require('../../models/WhatsAppConsent');
  const handlerDeps = {
    whatsappService,
    Consent,
    log,
    ...(deps.getGuardianPhone ? { getGuardianPhone: deps.getGuardianPhone } : {}),
  };

  const unsubscribe = bus.subscribe(EVENT, async envelope => {
    try {
      const payload = (envelope && envelope.payload) || envelope || {};
      await handleSessionCompleted(payload, handlerDeps);
    } catch (err) {
      log?.warn?.('[whatsapp-post-session] handler failed', { error: err.message });
    }
  });
  log?.info?.(`[whatsapp-post-session] subscriber wired on ${EVENT}`);
  return unsubscribe;
}

module.exports = {
  wireWhatsappPostSessionSummary,
  handleSessionCompleted,
  getGuardianPhone,
  pickGuardian,
  ENV_FLAG,
  EVENT,
};
