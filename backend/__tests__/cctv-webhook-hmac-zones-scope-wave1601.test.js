/**
 * cctv-webhook-hmac-zones-scope-wave1601.test.js
 * ════════════════════════════════════════════════════════════════════
 * W1601 — close the last two CCTV P2s on a child-safety system.
 *
 * 1) ai.routes.js `GET /zones/:cameraId` was the only route in the file with
 *    NO role gate — any authenticated user could read a camera's detection-zone
 *    layout. Now requires the sibling `['admin','security_officer']` set.
 *
 * 2) webhooks.routes.js accepted forged CCTV event pushes (fail-OPEN):
 *      - `POST /nvr/:nvrCode` skipped HMAC entirely when webhookSecret was unset
 *        (`if (secret && !verifyHmac(...))`) — knowing an NVR code was enough to
 *        inject fake face/plate/alert events.
 *      - `POST /camera/:code` had NO signature check at all — fully anonymous
 *        event injection for any camera code.
 *    Both now fail CLOSED: a configured secret AND a valid HMAC are required
 *    (`/camera/:code` resolves the camera's owning NVR for the secret).
 *
 * Static route-shape assertions + a behavioral test of the exported verifyHmac.
 * Static-only file; NOT enumerated in sprint-tests.txt.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const dir = path.join(__dirname, '..', 'routes', 'cctv');
const read = (f) => fs.readFileSync(path.join(dir, f), 'utf8');

describe('W1601 — CCTV zones role gate', () => {
  const src = read('ai.routes.js');

  it('GET /zones/:cameraId now requires a role', () => {
    expect(src).toMatch(
      /router\.get\(\s*'\/zones\/:cameraId',\s*requireRole\(\[\s*'admin',\s*'security_officer'\s*\]\)/
    );
  });

  it('does not leave zones as an ungated handler', () => {
    // the old shape was: router.get('/zones/:cameraId', async (req, res)
    expect(src).not.toMatch(/router\.get\(\s*'\/zones\/:cameraId',\s*async/);
  });
});

describe('W1601 — CCTV webhook HMAC fail-closed', () => {
  const src = read('webhooks.routes.js');

  it('no longer skips HMAC when the secret is unset (fail-open pattern gone)', () => {
    // old: if (secret && !verifyHmac(...))  → skipped when !secret
    expect(src).not.toMatch(/if\s*\(\s*secret\s*&&\s*!verifyHmac/);
  });

  it('/nvr and /camera both require a secret AND a valid signature', () => {
    const failClosed = (src.match(/if\s*\(\s*!secret\s*\|\|\s*!verifyHmac\(/g) || []).length;
    expect(failClosed).toBe(2);
    // both emit WEBHOOK_NOT_CONFIGURED when no secret is set
    expect((src.match(/WEBHOOK_NOT_CONFIGURED/g) || []).length).toBeGreaterThanOrEqual(2);
  });

  it('/camera/:code resolves the owning NVR for the secret (was anonymous)', () => {
    expect(src).toMatch(/cameraService\.findByCode\(req\.params\.code\)/);
    expect(src).toMatch(/camera\.nvrId\s*\?\s*await CctvNvr\.findById\(camera\.nvrId\)/);
  });
});

describe('W1601 — verifyHmac behavioral', () => {
  // Pull only the exported helper; the module also registers CCTV schemas but
  // requiring for the pure function is fine (no DB connection needed).
  const { verifyHmac } = require('../routes/cctv/webhooks.routes');
  const secret = 'test-secret-123';
  const raw = Buffer.from('<EventNotificationAlert><eventType>VMD</eventType></EventNotificationAlert>');
  const goodSig = 'sha256=' + crypto.createHmac('sha256', secret).update(raw).digest('hex');

  it('is exported as a function', () => {
    expect(typeof verifyHmac).toBe('function');
  });

  it('accepts a correctly-signed body', () => {
    expect(verifyHmac(secret, raw, goodSig)).toBe(true);
  });

  it('rejects when the secret is missing (the fail-open case)', () => {
    expect(verifyHmac('', raw, goodSig)).toBe(false);
    expect(verifyHmac(undefined, raw, goodSig)).toBe(false);
  });

  it('rejects a wrong signature and a missing signature header', () => {
    expect(verifyHmac(secret, raw, 'sha256=deadbeef')).toBe(false);
    expect(verifyHmac(secret, raw, undefined)).toBe(false);
  });

  it('rejects a body tampered after signing', () => {
    const tampered = Buffer.from(raw.toString() + 'x');
    expect(verifyHmac(secret, tampered, goodSig)).toBe(false);
  });
});
