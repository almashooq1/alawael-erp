/**
 * W205d — DB-backed OAuth client registry.
 *
 * Verifies:
 *  - registerClient() bcrypt-hashes the secret and returns the plaintext once
 *  - verifyClient() accepts the right secret, rejects the wrong one
 *  - inactive clients are rejected even with the right secret
 *  - env-var OAUTH_CLIENT_SECRET still works as legacy fallback when no
 *    matching DB row exists
 *  - public clients (tokenEndpointAuthMethod=none) pass verification with
 *    no secret (PKCE will guard the code exchange)
 */

'use strict';

process.env.NODE_ENV = 'test';
process.env.DISABLE_REDIS = 'true';
process.env.JWT_SECRET = 'wave205d-test-secret';
process.env.OAUTH_CLIENT_SECRET = 'env-legacy-secret';

// Mock OAuthClient model (no Mongo needed)
const mockClients = new Map();

jest.mock('../models/OAuthClient', () => {
  const bcrypt = require('bcryptjs');
  return {
    findOne: jest.fn(query => {
      const result = (() => {
        for (const c of mockClients.values()) {
          const matches = Object.entries(query).every(([k, v]) => c[k] === v);
          if (matches) return c;
        }
        return null;
      })();
      // Chainable like real mongoose: .select(...).exec() OR .select(...).then(...)
      const promise = Promise.resolve(result);
      const chain = {
        select: () => chain,
        exec: () => promise,
        then: promise.then.bind(promise),
      };
      return chain;
    }),
    create: jest.fn(async doc => {
      mockClients.set(doc.clientId, {
        ...doc,
        verifyClientSecret: async function (candidate) {
          if (this.tokenEndpointAuthMethod === 'none') return true;
          return bcrypt.compare(String(candidate), this.clientSecretHash);
        },
        touchLastUsed: () => Promise.resolve(),
      });
      return mockClients.get(doc.clientId);
    }),
  };
});

const OAuthService = require('../services/oauth.service');

beforeEach(() => {
  mockClients.clear();
});

describe('W205d — DB-backed OAuth client registry', () => {
  test('registerClient persists to DB + returns plaintext secret', async () => {
    const svc = new OAuthService();
    const { client, clientSecret } = await svc.registerClient({
      clientName: 'Test App',
      redirectUris: ['https://app.test/cb'],
    });
    expect(client.clientId).toMatch(/^[a-f0-9]{32}$/);
    expect(clientSecret).toMatch(/^[a-f0-9]{64}$/);
    expect(mockClients.size).toBe(1);
    const stored = mockClients.get(client.clientId);
    expect(stored.clientSecretHash).not.toBe(clientSecret); // bcrypt-hashed
    const bcrypt = require('bcryptjs');
    expect(await bcrypt.compare(clientSecret, stored.clientSecretHash)).toBe(true);
  });

  test('exchangeAuthorizationCode accepts a DB-registered client', async () => {
    const svc = new OAuthService();
    const { client, clientSecret } = await svc.registerClient({
      clientName: 'App X',
      redirectUris: ['https://app.x/cb'],
    });

    // Stub the SSO layer so we only test the verify path
    svc.ssoService.exchangeAuthorizationCode = jest.fn(async () => ({
      accessToken: 'at',
      refreshToken: 'rt',
      idToken: 'it',
      expiresIn: 3600,
    }));

    const tokens = await svc.exchangeAuthorizationCode(
      'auth-code',
      client.clientId,
      clientSecret,
      'https://app.x/cb'
    );
    expect(tokens.accessToken).toBe('at');
  });

  test('exchangeAuthorizationCode rejects wrong secret', async () => {
    const svc = new OAuthService();
    const { client } = await svc.registerClient({
      clientName: 'App Y',
      redirectUris: ['https://app.y/cb'],
    });
    svc.ssoService.exchangeAuthorizationCode = jest.fn();

    await expect(
      svc.exchangeAuthorizationCode('c', client.clientId, 'wrong-secret', 'https://app.y/cb')
    ).rejects.toThrow(/Invalid client credentials/);
    expect(svc.ssoService.exchangeAuthorizationCode).not.toHaveBeenCalled();
  });

  test('inactive client rejected even with right secret', async () => {
    const svc = new OAuthService();
    const { client, clientSecret } = await svc.registerClient({
      clientName: 'App Z',
      redirectUris: ['https://app.z/cb'],
    });
    mockClients.get(client.clientId).isActive = false;
    svc.ssoService.exchangeAuthorizationCode = jest.fn();

    await expect(
      svc.exchangeAuthorizationCode('c', client.clientId, clientSecret, 'https://app.z/cb')
    ).rejects.toThrow(/Invalid client credentials/);
  });

  test('legacy env-var secret still works when DB has no matching client', async () => {
    const svc = new OAuthService();
    svc.ssoService.exchangeAuthorizationCode = jest.fn(async () => ({
      accessToken: 'at',
      refreshToken: 'rt',
      idToken: 'it',
    }));

    const tokens = await svc.exchangeAuthorizationCode(
      'c',
      'legacy-client',
      'env-legacy-secret', // matches process.env.OAUTH_CLIENT_SECRET
      'https://legacy.x/cb'
    );
    expect(tokens.accessToken).toBe('at');
  });

  test('public client (none) passes auth with no secret', async () => {
    const svc = new OAuthService();
    const { client, clientSecret } = await svc.registerClient({
      clientName: 'SPA',
      redirectUris: ['https://spa.test/cb'],
      tokenEndpointAuthMethod: 'none',
    });
    expect(clientSecret).toBeNull();

    svc.ssoService.exchangeAuthorizationCode = jest.fn(async () => ({
      accessToken: 'at',
      refreshToken: 'rt',
      idToken: 'it',
    }));

    const tokens = await svc.exchangeAuthorizationCode(
      'c',
      client.clientId,
      null,
      'https://spa.test/cb'
    );
    expect(tokens.accessToken).toBe('at');
  });
});
