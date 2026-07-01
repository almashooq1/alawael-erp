'use strict';

/**
 * W1424q — PDPL self-service withdrawal (STOP keyword opt-out).
 *
 * A guardian replying STOP / إيقاف / إلغاء الاشتراك can now opt OUT of WhatsApp
 * messaging. Critically the check runs BEFORE recordInbound — which otherwise
 * treats every inbound as an implicit opt-in and re-opens the 24h window (the
 * audit's exact finding: "a STOP reply actually re-opens their service window").
 */

const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(
  path.join(__dirname, '..', 'services', 'whatsapp', 'whatsappWebhook.service.js'),
  'utf8'
);

describe('W1424q STOP keyword self-opt-out', () => {
  test('opt-out runs BEFORE recordInbound (so STOP does not re-opt-in)', () => {
    const f = SRC.indexOf('async function handleIncomingMessage');
    expect(f).toBeGreaterThan(-1);
    const region = SRC.slice(f);
    const stopIdx = region.indexOf('opted out via STOP');
    const recordIdx = region.indexOf('Consent.recordInbound');
    expect(stopIdx).toBeGreaterThan(-1);
    expect(recordIdx).toBeGreaterThan(-1);
    expect(stopIdx).toBeLessThan(recordIdx);
  });

  test('calls setConsent(..., false) for an explicit withdrawal', () => {
    // NB: the first arg is normalizePhone(fromPhone) — inner ')' breaks a [^)]* match.
    expect(SRC).toMatch(/setConsent\(.*\bfalse\b/);
  });

  test('STOP matcher includes stop/unsubscribe + Arabic stop words', () => {
    const region = SRC.slice(SRC.indexOf('async function handleIncomingMessage'));
    expect(region).toMatch(/stop\|unsubscribe/i);
    expect(region).toMatch(/الاشتراك/);
  });
});
