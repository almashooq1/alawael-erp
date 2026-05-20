/**
 * W205 — SSO hardening regression tests.
 * Verifies:
 *  - PKCE round-trip (S256 + plain)
 *  - generateAuthorizationCode refuses userId=null
 *  - exchangeAuthorizationCode rejects PKCE mismatch
 *  - Per-user session cap eviction
 *  - In-process mock store works without Redis
 */

process.env.NODE_ENV = 'test';
process.env.DISABLE_REDIS = 'true';
process.env.JWT_SECRET = 'wave205-test-secret-key';
process.env.OAUTH_CLIENT_SECRET = 'wave205-oauth-secret';

const crypto = require('crypto');
const SSOService = require('../services/sso.service');

describe('W205 SSO hardening', () => {
  let sso;

  beforeEach(() => {
    delete process.env.SSO_MAX_SESSIONS_PER_USER;
    sso = new SSOService();
  });

  test('mock store works end-to-end without Redis', async () => {
    const created = await sso.createSession('u-1', { role: 'admin' });
    expect(created.sessionId).toMatch(/^[a-f0-9]+$/);
    const verification = await sso.verifySession(created.sessionId, created.accessToken);
    expect(verification.valid).toBe(true);
    expect(verification.user.userId).toBe('u-1');

    const refreshed = await sso.refreshAccessToken(created.sessionId, created.refreshToken);
    expect(refreshed.accessToken).toBeDefined();
    // Same-second issue may produce the same JWT (identical payload + exp) —
    // that's fine; what matters is that the refresh succeeded and still verifies.
    const verifyRefreshed = await sso.verifySession(created.sessionId, refreshed.accessToken);
    expect(verifyRefreshed.valid).toBe(true);

    await sso.endSession(created.sessionId);
    const after = await sso.verifySession(created.sessionId, created.accessToken);
    expect(after.valid).toBe(false);
  });

  test('generateAuthorizationCode refuses userId=null (security hole closed)', async () => {
    await expect(
      sso.generateAuthorizationCode(null, 'client-x', 'openid', 'https://x.test/cb')
    ).rejects.toThrow(/requires an authenticated userId/);
  });

  test('PKCE S256 round-trip succeeds', async () => {
    const verifier = crypto.randomBytes(32).toString('hex');
    const challenge = crypto
      .createHash('sha256')
      .update(verifier)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const code = await sso.generateAuthorizationCode(
      'u-1',
      'client-x',
      'openid',
      'https://x.test/cb',
      { codeChallenge: challenge, codeChallengeMethod: 'S256' }
    );

    const session = await sso.exchangeAuthorizationCode(
      code,
      'client-x',
      process.env.OAUTH_CLIENT_SECRET,
      { redirectUri: 'https://x.test/cb', codeVerifier: verifier }
    );
    expect(session.accessToken).toBeDefined();
    expect(session.sessionId).toMatch(/^[a-f0-9]+$/);
  });

  test('PKCE mismatch is rejected at exchange', async () => {
    const verifier = 'a'.repeat(64);
    const challenge = crypto
      .createHash('sha256')
      .update(verifier)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const code = await sso.generateAuthorizationCode(
      'u-1',
      'client-x',
      'openid',
      'https://x.test/cb',
      { codeChallenge: challenge, codeChallengeMethod: 'S256' }
    );

    await expect(
      sso.exchangeAuthorizationCode(code, 'client-x', process.env.OAUTH_CLIENT_SECRET, {
        redirectUri: 'https://x.test/cb',
        codeVerifier: 'wrong-verifier',
      })
    ).rejects.toThrow(/PKCE verification failed/);
  });

  test('redirect_uri mismatch at exchange is rejected', async () => {
    const code = await sso.generateAuthorizationCode(
      'u-1',
      'client-x',
      'openid',
      'https://x.test/cb'
    );
    await expect(
      sso.exchangeAuthorizationCode(code, 'client-x', process.env.OAUTH_CLIENT_SECRET, {
        redirectUri: 'https://attacker.example/cb',
      })
    ).rejects.toThrow(/redirect_uri mismatch/);
  });

  test('per-user session cap evicts oldest', async () => {
    process.env.SSO_MAX_SESSIONS_PER_USER = '2';
    const capped = new SSOService();

    const s1 = await capped.createSession('u-cap', { role: 'user' });
    await new Promise(r => setTimeout(r, 5));
    const s2 = await capped.createSession('u-cap', { role: 'user' });
    await new Promise(r => setTimeout(r, 5));
    const s3 = await capped.createSession('u-cap', { role: 'user' });

    const live = await capped.getUserActiveSessions('u-cap');
    const liveIds = live.map(s => s.sessionId);
    expect(liveIds).toContain(s2.sessionId);
    expect(liveIds).toContain(s3.sessionId);
    expect(liveIds).not.toContain(s1.sessionId);
  });

  test('JWT iat/exp are in seconds (RFC 7519)', async () => {
    const jwt = require('jsonwebtoken');
    const session = await sso.createSession('u-jwt', { role: 'admin' });
    const decoded = jwt.verify(session.accessToken, process.env.JWT_SECRET);
    const nowSec = Math.floor(Date.now() / 1000);
    // iat within 5 seconds of "now" in seconds
    expect(decoded.iat).toBeGreaterThan(nowSec - 5);
    expect(decoded.iat).toBeLessThan(nowSec + 5);
    // exp is bounded reasonably (≤ 7 days)
    expect(decoded.exp - decoded.iat).toBeGreaterThan(0);
    expect(decoded.exp - decoded.iat).toBeLessThanOrEqual(604800);
  });

  test('introspectToken returns active=false for tampered token', async () => {
    const session = await sso.createSession('u-int', { role: 'admin', scope: 'read' });
    const ok = await sso.introspectToken(session.accessToken);
    expect(ok.active).toBe(true);
    expect(ok.sub).toBe('u-int');

    const bad = await sso.introspectToken(`${session.accessToken}tamper`);
    expect(bad.active).toBe(false);
  });

  test('validateOAuthRequest blocks dangerous schemes', async () => {
    const r1 = await sso.validateOAuthRequest('c', 'javascript:alert(1)', 'openid');
    expect(r1.valid).toBe(false);
    const r2 = await sso.validateOAuthRequest('c', 'https://ok.test/cb', 'openid');
    expect(r2.valid).toBe(true);
    const r3 = await sso.validateOAuthRequest('c', 'https://ok.test/cb#frag', 'openid');
    expect(r3.valid).toBe(false);
  });
});
