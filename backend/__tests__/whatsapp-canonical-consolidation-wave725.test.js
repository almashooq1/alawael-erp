/**
 * whatsapp-canonical-consolidation — W725 drift guard (static)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * WHY: `backend/communication/whatsapp-service.js` was a ~1,410-line SECOND
 * WhatsApp implementation (Meta Cloud API + Twilio + local-gateway HTTP
 * clients, own Mongoose schemas, own webhook handling) that duplicated the
 * canonical hardened service in `backend/services/whatsapp/`. W725 collapsed
 * it into a thin compatibility ADAPTER that delegates to the canonical
 * service while preserving the legacy public surface.
 *
 * This guard fails CI if anyone re-introduces a parallel WhatsApp HTTP/provider
 * implementation in the legacy file, or breaks the adapter→canonical wiring or
 * the legacy export contract that downstream consumers still depend on
 * (auth/otp-service.js, students/report-scheduler-service.js,
 * communication/index.js, services/notifications/notification-enhanced.service.js).
 *
 * Static analysis only — reads source as text. No DB, no boot, no network.
 *
 * @module __tests__/whatsapp-canonical-consolidation-wave725.test.js
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ADAPTER_PATH = path.join(__dirname, '..', 'communication', 'whatsapp-service.js');
const OTP_SERVICE_PATH = path.join(__dirname, '..', 'auth', 'otp-service.js');

const adapterSrc = fs.readFileSync(ADAPTER_PATH, 'utf8');
const otpSrc = fs.readFileSync(OTP_SERVICE_PATH, 'utf8');

describe('W725 — legacy whatsapp-service.js is a thin adapter, not a 2nd impl', () => {
  it('delegates to the canonical service in ../services/whatsapp', () => {
    expect(adapterSrc).toMatch(/require\(['"]\.\.\/services\/whatsapp['"]\)/);
    // Destructures the canonical service object off the barrel (it is a
    // PROPERTY on the barrel, not the default export).
    expect(adapterSrc).toMatch(/whatsappService:\s*canonical/);
  });

  it('contains NO parallel HTTP/provider implementation', () => {
    // No axios — the canonical service uses built-in https only.
    expect(adapterSrc).not.toMatch(/require\(['"]axios['"]\)/);
    // No raw Graph API host string (the only place that talks to Meta is the
    // canonical service).
    expect(adapterSrc).not.toMatch(/graph\.facebook\.com/);
    // No Twilio / local-gateway provider branches resurrected.
    expect(adapterSrc).not.toMatch(/require\(['"]twilio['"]\)/);
    // No Mongoose schema definitions in the adapter (logs/conversations live
    // in the canonical models).
    expect(adapterSrc).not.toMatch(/new\s+mongoose\.Schema/);
    expect(adapterSrc).not.toMatch(/mongoose\.model\(/);
  });

  it('preserves the legacy export contract for downstream consumers', () => {
    const required = [
      'WhatsAppService',
      'whatsappService',
      'whatsappConfig',
      'WhatsAppTemplates',
      'InteractiveBuilders',
      'sendWhatsAppOTP',
      'sendWhatsAppNotification',
      'sendWhatsAppText',
      'sendWhatsAppImage',
      'sendWhatsAppDocument',
    ];
    for (const name of required) {
      expect(adapterSrc).toContain(name);
    }
  });

  it('routes inbound webhooks to the canonical processWebhook', () => {
    expect(adapterSrc).toMatch(/whatsappWebhook:\s*webhookService/);
    expect(adapterSrc).toMatch(/webhookService\.processWebhook/);
  });
});

describe('W725 — otp-service delivers OTP via the canonical sendOtp', () => {
  it('imports the canonical whatsappService (not the legacy module)', () => {
    expect(otpSrc).toMatch(/require\(['"]\.\.\/services\/whatsapp['"]\)/);
    expect(otpSrc).toMatch(/\{\s*whatsappService\s*\}/);
    // Must NOT require the old communication/whatsapp-service path (a comment
    // referencing it for historical context is fine).
    expect(otpSrc).not.toMatch(/require\(['"][^'"]*communication\/whatsapp-service['"]\)/);
  });

  it('calls whatsappService.sendOtp for OTP delivery', () => {
    expect(otpSrc).toMatch(/whatsappService\.sendOtp\(/);
  });
});
