/**
 * WhatsApp complaint-resolved subscriber (W1513) — M6 reverse status tracking
 * ═══════════════════════════════════════════════════════════════════════════
 * Env-gated, default-OFF subscriber: when a complaint with a linked beneficiary
 * is resolved (`complaint.complaint.resolved` on the integration bus), notify
 * the guardian via WhatsApp that their complaint is closed. The blueprint's M6
 * "تتبّع حالة الشكوى عكسيًا" scenario.
 *
 * The producer (models/Complaint.js) only emits when status→resolved AND
 * beneficiaryId is set, so non-beneficiary (employee/anonymous) complaints never
 * trigger a family message.
 *
 * Safety: DEFAULT OFF (ENABLE_WHATSAPP_COMPLAINT_RESOLVED); consent-gated
 * (WhatsAppConsent.canMessage); auto-stubs when WhatsApp disabled; per-event
 * try/catch. Verified in-process (no HTTP boot) — see the wave1513 guard.
 *
 * @module services/whatsapp/whatsappComplaintResolvedSubscriber
 */

'use strict';

const mongoose = require('mongoose');
const logger = require('../../utils/logger');
const { getGuardianPhone } = require('./whatsappGuardianResolver');

const ENV_FLAG = 'ENABLE_WHATSAPP_COMPLAINT_RESOLVED';
const EVENT = 'complaint.complaint.resolved';

function getModel(name) {
  try {
    return mongoose.model(name);
  } catch {
    return null;
  }
}

/**
 * Core handler: resolve guardian → consent → send. Deps injected for testability.
 * @returns {Promise<{sent:boolean, reason:string}>}
 */
async function handleComplaintResolved(payload, deps = {}) {
  const { whatsappService, Consent, log } = deps;
  if (!payload || !payload.beneficiaryId) return { sent: false, reason: 'no_beneficiary' };

  const resolver = deps.getGuardianPhone || getGuardianPhone;
  const resolved = await resolver(payload.beneficiaryId);
  if (!resolved || !resolved.phone) return { sent: false, reason: 'no_guardian_phone' };

  const verdict = await Consent.canMessage(resolved.phone);
  if (!verdict || !verdict.allowed) {
    return { sent: false, reason: `consent:${(verdict && verdict.reason) || 'denied'}` };
  }

  const ref = payload.complaintNumber ? ` رقم ${payload.complaintNumber}` : '';
  const title = 'تحديث الشكوى';
  const body = `تم حل شكواك${ref}. شكراً لتعاونك — لأي استفسار راسلونا هنا.`;
  const r = await whatsappService.sendNotification(resolved.phone, title, body);
  if (r && r.success) {
    log?.info?.(
      `[whatsapp-complaint-resolved] ${r.stub ? 'stub' : 'sent'} for beneficiary=${payload.beneficiaryId}`
    );
    return { sent: true, reason: r.stub ? 'stub' : 'sent' };
  }
  return { sent: false, reason: 'send_failed' };
}

/**
 * Register the subscriber on the bus. Env-gated; returns the unsubscribe fn or
 * null when disabled / no bus.
 */
function wireWhatsappComplaintResolved(bus, deps = {}) {
  const log = deps.logger || logger;
  if (process.env[ENV_FLAG] !== 'true') {
    log?.info?.(`[whatsapp-complaint-resolved] disabled (set ${ENV_FLAG}=true to enable)`);
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
      await handleComplaintResolved(payload, handlerDeps);
    } catch (err) {
      log?.warn?.('[whatsapp-complaint-resolved] handler failed', { error: err.message });
    }
  });
  log?.info?.(`[whatsapp-complaint-resolved] subscriber wired on ${EVENT}`);
  return unsubscribe;
}

module.exports = {
  wireWhatsappComplaintResolved,
  handleComplaintResolved,
  ENV_FLAG,
  EVENT,
};
