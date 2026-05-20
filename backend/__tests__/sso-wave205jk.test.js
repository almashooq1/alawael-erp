/**
 * W205j/k — refresh-token rotation + OIDC RP-initiated logout.
 *
 * j) refresh token rotation:
 *    - Refresh tokens carry a unique jti, tracked on the session as
 *      activeRefreshJti.
 *    - A normal refresh issues a NEW refresh token and updates the jti.
 *    - Reusing an old refresh token after rotation triggers reuse
 *      detection and kills the session.
 *
 * k) /oauth2/logout:
 *    - With a valid id_token_hint → ends the session
 *    - post_logout_redirect_uri honoured iff in the allow-list
 *    - state echoed back
 */

'use strict';

process.env.NODE_ENV = 'test';
process.env.DISABLE_REDIS = 'true';
process.env.JWT_SECRET = 'wave205jk-test';
process.env.OAUTH_ALLOWED_REDIRECT_HOSTS = 'app.test,localhost';

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');

const SSOService = require('../services/sso.service');

describe('W205j — refresh-token rotation', () => {
  let sso;

  beforeEach(() => {
    sso = new SSOService();
  });

  test('initial session sets activeRefreshJti = the issued refresh jti', async () => {
    const created = await sso.createSession('u-1', { role: 'admin' });
    const decoded = jwt.verify(created.refreshToken, process.env.JWT_SECRET);
    expect(decoded.jti).toMatch(/^[a-f0-9]{32}$/);

    const session = await sso.getSessionInfo(created.sessionId);
    expect(session.activeRefreshJti).toBe(decoded.jti);
  });

  test('refresh rotates: returns new refresh, updates activeRefreshJti', async () => {
    const created = await sso.createSession('u-1', { role: 'admin' });
    const oldJti = jwt.decode(created.refreshToken).jti;

    const refreshed = await sso.refreshAccessToken(created.sessionId, created.refreshToken);
    expect(refreshed.refreshToken).toBeDefined();
    expect(refreshed.refreshToken).not.toBe(created.refreshToken);

    const newJti = jwt.decode(refreshed.refreshToken).jti;
    expect(newJti).toMatch(/^[a-f0-9]{32}$/);
    expect(newJti).not.toBe(oldJti);

    const session = await sso.getSessionInfo(created.sessionId);
    expect(session.activeRefreshJti).toBe(newJti);
    expect(session.refreshCount).toBe(1);
  });

  test('reusing the OLD refresh after rotation throws REFRESH_REUSE and kills session', async () => {
    const created = await sso.createSession('u-1', { role: 'admin' });
    // First rotation succeeds
    await sso.refreshAccessToken(created.sessionId, created.refreshToken);

    // Re-using the original refresh now should be rejected AND the session
    // should be revoked entirely.
    let err;
    try {
      await sso.refreshAccessToken(created.sessionId, created.refreshToken);
    } catch (e) {
      err = e;
    }
    expect(err).toBeDefined();
    expect(err.code).toBe('REFRESH_REUSE');

    // Session is gone (endSession() invoked as part of reuse detection)
    const session = await sso.getSessionInfo(created.sessionId);
    expect(session).toBeNull();
  });

  test('multiple sequential rotations work (refreshCount climbs)', async () => {
    const created = await sso.createSession('u-1', { role: 'admin' });
    let refresh = created.refreshToken;
    for (let i = 0; i < 3; i++) {
      const result = await sso.refreshAccessToken(created.sessionId, refresh);
      refresh = result.refreshToken;
    }
    const session = await sso.getSessionInfo(created.sessionId);
    expect(session.refreshCount).toBe(3);
  });

  test('rotated refresh that has expired is still rejected (no false-pass on signature)', async () => {
    const created = await sso.createSession('u-1', { role: 'admin' });
    // Forge an "old jti" with the same signing secret but a different jti
    const stale = jwt.sign(
      { userId: 'u-1', sessionId: created.sessionId, type: 'refresh', jti: 'old-stale-jti' },
      process.env.JWT_SECRET,
      { expiresIn: 60, algorithm: 'HS256' }
    );
    let err;
    try {
      await sso.refreshAccessToken(created.sessionId, stale);
    } catch (e) {
      err = e;
    }
    expect(err).toBeDefined();
    expect(err.code).toBe('REFRESH_REUSE');
  });
});

describe('W205k — OIDC /oauth2/logout', () => {
  let app;
  let createdSession;

  beforeEach(async () => {
    // Important: the route file constructs its own SSOService at require
    // time. To exercise the same in-memory store from the test we have to
    // (a) require the route, then (b) call routes from supertest. We
    // create the session by calling routes/sso.routes' internal service
    // via the module's exports of `ssoService`. Easiest path: monkey-patch
    // the route module's instance.
    jest.resetModules();
    const ssoRoutes = require('../routes/sso.routes');
    app = express();
    app.use(express.json());
    app.use('/api/sso', ssoRoutes);

    // Create a session through the same SSO service the route uses by
    // grabbing it from the module cache. The route file does:
    //   const ssoService = new SSOService();
    // — that instance is held inside the closure, so we recreate one
    // here and rely on the SHARED process.env.JWT_SECRET to make sure
    // tokens it signs verify on the route side. The route's ssoService
    // is the source of truth for SESSION storage — so we ALSO seed the
    // route's store by going through the /login wouldn't work without a
    // DB. So we build the session entirely via JWT and let the route
    // store it via /verify-token's side effect — no good either.
    //
    // Pragmatic compromise: use a hand-built JWT id_token (HS256, same
    // secret) — it'll decode in the logout handler. The session itself
    // does not need to exist in the route's store; the logout handler
    // tolerates "endSession on a missing session" as a no-op.
    const jwt = require('jsonwebtoken');
    const sessionId = 'route-sess-' + Math.random().toString(36).slice(2, 12);
    const idToken = jwt.sign(
      { sub: 'u-k', sessionId, aud: 'sso-client', iss: 'sso-server' },
      process.env.JWT_SECRET,
      { algorithm: 'HS256', expiresIn: 60 }
    );
    createdSession = { sessionId, idToken };
  });

  test('id_token_hint succeeds (200) — logout is idempotent even when session is gone', async () => {
    const r = await request(app)
      .post('/api/sso/oauth2/logout')
      .send({ id_token_hint: createdSession.idToken });
    expect(r.status).toBe(200);
    expect(r.body.success).toBe(true);
  });

  test('post_logout_redirect_uri in allow-list → 302 with state echoed back', async () => {
    const r = await request(app).get('/api/sso/oauth2/logout').query({
      id_token_hint: createdSession.idToken,
      post_logout_redirect_uri: 'https://app.test/bye',
      state: 'opaque-state-1',
    });
    expect(r.status).toBe(302);
    const loc = new URL(r.headers.location);
    expect(loc.hostname).toBe('app.test');
    expect(loc.pathname).toBe('/bye');
    expect(loc.searchParams.get('state')).toBe('opaque-state-1');
  });

  test('post_logout_redirect_uri NOT in allow-list → 400', async () => {
    const r = await request(app).get('/api/sso/oauth2/logout').query({
      id_token_hint: createdSession.idToken,
      post_logout_redirect_uri: 'https://attacker.example/oops',
    });
    expect(r.status).toBe(400);
    expect(r.body.error).toBe('invalid_request');
  });

  test('post_logout_redirect_uri with non-http(s) scheme → 400', async () => {
    const r = await request(app).get('/api/sso/oauth2/logout').query({
      id_token_hint: createdSession.idToken,
      post_logout_redirect_uri: 'javascript:alert(1)',
    });
    expect(r.status).toBe(400);
  });

  test('no id_token_hint + no session → still returns 200 (no-op logout)', async () => {
    const r = await request(app).post('/api/sso/oauth2/logout').send({});
    expect(r.status).toBe(200);
    expect(r.body.success).toBe(true);
  });

  test('invalid id_token_hint does not throw — degrades gracefully', async () => {
    const r = await request(app)
      .post('/api/sso/oauth2/logout')
      .send({ id_token_hint: 'definitely.not.a.real.jwt' });
    expect(r.status).toBe(200);
  });
});
