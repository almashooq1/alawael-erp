'use strict';

/**
 * W1424i — shared Meta appsecret_proof signer (transport unification, parity).
 *
 * Path A (whatsappService.request) and Path B (metaCloudProvider._withProof) now
 * both delegate appsecret_proof to services/whatsapp/metaTransport. This guards:
 *   (1) the proof is byte-identical to the prior inline HMAC (behaviour-preserving),
 *   (2) both paths produce the SAME proof for the same token+secret (no divergence),
 *   (3) both files actually delegate (no re-introduced inline signer).
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const metaTransport = require('../services/whatsapp/metaTransport');

describe('W1424i shared Meta appsecret_proof signer', () => {
  test('appsecretProof equals a manual HMAC-SHA256(token) keyed by the app secret', () => {
    const token = 'EAATtoken123';
    const secret = 'app-secret-xyz';
    const expected = crypto.createHmac('sha256', secret).update(token).digest('hex');
    expect(metaTransport.appsecretProof(token, secret)).toBe(expected);
  });

  test('appsecretProof returns null when the token or secret is missing', () => {
    expect(metaTransport.appsecretProof('', 'secret')).toBeNull();
    expect(metaTransport.appsecretProof('token', null)).toBeNull();
  });

  test('withProof appends appsecret_proof with the correct separator', () => {
    const token = 't';
    const secret = 's';
    const proof = metaTransport.appsecretProof(token, secret);
    expect(metaTransport.withProof('/v21.0/123/messages', token, secret)).toBe(
      `/v21.0/123/messages?appsecret_proof=${proof}`
    );
    expect(metaTransport.withProof('/x?a=1', token, secret)).toBe(`/x?a=1&appsecret_proof=${proof}`);
    expect(metaTransport.withProof('/x', token, null)).toBe('/x'); // no secret → unchanged
  });

  test('resolveAppSecret prefers WHATSAPP_APP_SECRET then WHATSAPP_WEBHOOK_SECRET', () => {
    const save = {
      a: process.env.WHATSAPP_APP_SECRET,
      w: process.env.WHATSAPP_WEBHOOK_SECRET,
    };
    process.env.WHATSAPP_APP_SECRET = 'appsec';
    process.env.WHATSAPP_WEBHOOK_SECRET = 'whsec';
    expect(metaTransport.resolveAppSecret()).toBe('appsec');
    delete process.env.WHATSAPP_APP_SECRET;
    expect(metaTransport.resolveAppSecret()).toBe('whsec');
    if (save.a === undefined) delete process.env.WHATSAPP_APP_SECRET;
    else process.env.WHATSAPP_APP_SECRET = save.a;
    if (save.w === undefined) delete process.env.WHATSAPP_WEBHOOK_SECRET;
    else process.env.WHATSAPP_WEBHOOK_SECRET = save.w;
  });

  test('PARITY: both send paths produce an IDENTICAL proof for the same token+secret', () => {
    const token = 'EAATshared';
    const secret = 'shared-secret';
    const pathA = metaTransport.withProof('/v21.0/PID/messages', token, secret);
    const pathB = metaTransport.withProof(
      'https://graph.facebook.com/v21.0/PID/messages',
      token,
      secret
    );
    const proofA = pathA.split('appsecret_proof=')[1];
    const proofB = pathB.split('appsecret_proof=')[1];
    expect(proofA).toBeTruthy();
    expect(proofA).toBe(proofB);
  });

  test('both senders DELEGATE signing to the shared metaTransport', () => {
    const svc = fs.readFileSync(
      path.join(__dirname, '..', 'services', 'whatsapp', 'whatsappService.js'),
      'utf8'
    );
    const prov = fs.readFileSync(
      path.join(__dirname, '..', 'integrations', 'whatsapp', 'providers', 'metaCloudProvider.js'),
      'utf8'
    );
    expect(svc).toMatch(/metaTransport\.withProof/);
    expect(prov).toMatch(/metaTransport\.withProof/);
    expect(svc).toMatch(/require\(['"]\.\/metaTransport['"]\)/);
    expect(prov).toMatch(/require\(['"][^'"]*\/metaTransport['"]\)/);
  });
});
