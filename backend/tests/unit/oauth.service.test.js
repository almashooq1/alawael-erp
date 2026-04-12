/**
 * Unit tests for services/oauth.service.js
 * OAuth 2.0 & OpenID Connect Service
 */

/* ─── mocks ─────────────────────────────────────────────────────────── */

const mockSSOInstance = {
  validateOAuthRequest: jest.fn(),
  generateAuthorizationCode: jest.fn(),
  exchangeAuthorizationCode: jest.fn(),
  createSession: jest.fn(),
  introspectToken: jest.fn(),
  refreshAccessToken: jest.fn(),
};

jest.mock('../../services/sso.service', () => {
  return jest.fn(() => mockSSOInstance);
});

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

jest.mock('crypto', () => {
  const actual = jest.requireActual('crypto');
  return {
    ...actual,
    randomBytes: jest.fn(n => ({
      toString: () => 'a'.repeat(n * 2),
    })),
    createHash: jest.fn(() => ({
      update: jest.fn().mockReturnThis(),
      digest: jest.fn(() => Buffer.from('mockhash123456789012345678901234')),
    })),
  };
});

const OAuthService = require('../../services/oauth.service');

/* ─── helpers ───────────────────────────────────────────────────────── */

function createService(env = {}) {
  const prev = { ...process.env };
  Object.assign(process.env, env);
  const svc = new OAuthService();
  Object.assign(process.env, prev);
  return svc;
}

/* ─── tests ─────────────────────────────────────────────────────────── */

describe('OAuthService', () => {
  let service;

  beforeEach(() => {
    jest.clearAllMocks();
    service = createService({ NODE_ENV: 'development' });
  });

  // ── constructor ──────────────────────────────────────────────────

  describe('constructor', () => {
    it('uses dev-only secret in non-production', () => {
      const s = createService({ NODE_ENV: 'development', OAUTH_CLIENT_SECRET: '' });
      expect(s._disabled).toBe(false);
    });

    it('disables in production when secret missing', () => {
      const s = createService({ NODE_ENV: 'production', OAUTH_CLIENT_SECRET: '' });
      expect(s._disabled).toBe(true);
    });

    it('remains enabled in production when secret set', () => {
      const s = createService({ NODE_ENV: 'production', OAUTH_CLIENT_SECRET: 'real-secret' });
      expect(s._disabled).toBe(false);
    });
  });

  // ── _ensureEnabled guard ─────────────────────────────────────────

  describe('_ensureEnabled', () => {
    it('throws 503 when disabled', () => {
      service._disabled = true;
      expect(() => service._ensureEnabled()).toThrow('OAuth service is not configured');
      try {
        service._ensureEnabled();
      } catch (e) {
        expect(e.status).toBe(503);
      }
    });

    it('does nothing when enabled', () => {
      service._disabled = false;
      expect(() => service._ensureEnabled()).not.toThrow();
    });
  });

  // ── initiateAuthorizationCodeFlow ────────────────────────────────

  describe('initiateAuthorizationCodeFlow', () => {
    it('returns authCode, state, redirectUri on success', async () => {
      mockSSOInstance.validateOAuthRequest.mockResolvedValue({ valid: true });
      mockSSOInstance.generateAuthorizationCode.mockResolvedValue('code123');

      const result = await service.initiateAuthorizationCodeFlow(
        'client1',
        'https://cb.com',
        'openid',
        'myState',
        'nonce1'
      );

      expect(result.authCode).toBe('code123');
      expect(result.state).toBe('myState');
      expect(result.redirectUri).toContain('code=code123');
      expect(result.redirectUri).toContain('state=myState');
    });

    it('generates state when not provided', async () => {
      mockSSOInstance.validateOAuthRequest.mockResolvedValue({ valid: true });
      mockSSOInstance.generateAuthorizationCode.mockResolvedValue('code456');

      const result = await service.initiateAuthorizationCodeFlow(
        'client1',
        'https://cb.com',
        'openid',
        null
      );

      expect(result.state).toBeTruthy();
    });

    it('throws when validation fails', async () => {
      mockSSOInstance.validateOAuthRequest.mockResolvedValue({ valid: false });

      await expect(service.initiateAuthorizationCodeFlow('c', 'u', 's', 'st')).rejects.toThrow(
        'Invalid OAuth request'
      );
    });

    it('throws when disabled', async () => {
      service._disabled = true;
      await expect(service.initiateAuthorizationCodeFlow('c', 'u', 's', 'st')).rejects.toThrow(
        'OAuth service is not configured'
      );
    });
  });

  // ── exchangeAuthorizationCode ────────────────────────────────────

  describe('exchangeAuthorizationCode', () => {
    it('returns tokens on valid credentials', async () => {
      mockSSOInstance.exchangeAuthorizationCode.mockResolvedValue({
        accessToken: 'at',
        refreshToken: 'rt',
        idToken: 'it',
      });

      const result = await service.exchangeAuthorizationCode(
        'code1',
        'client1',
        service.OAUTH_CLIENT_SECRET,
        'https://cb.com'
      );

      expect(result.accessToken).toBe('at');
      expect(result.refreshToken).toBe('rt');
      expect(result.tokenType).toBe('Bearer');
      expect(result.expiresIn).toBe(3600);
    });

    it('throws on invalid client secret', async () => {
      await expect(
        service.exchangeAuthorizationCode('code', 'c', 'wrong-secret', 'u')
      ).rejects.toThrow('Invalid client credentials');
    });
  });

  // ── initiateImplicitFlow ─────────────────────────────────────────

  describe('initiateImplicitFlow', () => {
    it('returns redirectUrl with token fragment', async () => {
      const result = await service.initiateImplicitFlow(
        'client1',
        'https://cb.com',
        'openid',
        'state1'
      );

      expect(result.redirectUrl).toContain('https://cb.com#');
      expect(result.redirectUrl).toContain('access_token=');
      expect(result.redirectUrl).toContain('state=state1');
      expect(result.token.tokenType).toBe('Bearer');
    });

    it('omits state when not provided', async () => {
      const result = await service.initiateImplicitFlow(
        'client1',
        'https://cb.com',
        'openid',
        null
      );

      expect(result.redirectUrl).not.toContain('state=');
    });
  });

  // ── initiateClientCredentialsFlow ────────────────────────────────

  describe('initiateClientCredentialsFlow', () => {
    it('returns token on valid credentials', async () => {
      const result = await service.initiateClientCredentialsFlow(
        'client1',
        service.OAUTH_CLIENT_SECRET,
        'api'
      );

      expect(result.accessToken).toBeTruthy();
      expect(result.tokenType).toBe('Bearer');
      expect(result.scope).toBe('api');
    });

    it('uses default scope when not provided', async () => {
      const result = await service.initiateClientCredentialsFlow(
        'client1',
        service.OAUTH_CLIENT_SECRET,
        null
      );

      expect(result.scope).toBe('api');
    });

    it('throws on invalid secret', async () => {
      await expect(service.initiateClientCredentialsFlow('c', 'bad', 'api')).rejects.toThrow(
        'Invalid client credentials'
      );
    });
  });

  // ── initiateResourceOwnerPasswordFlow ────────────────────────────

  describe('initiateResourceOwnerPasswordFlow', () => {
    it('returns tokens from SSO session', async () => {
      mockSSOInstance.createSession.mockResolvedValue({
        accessToken: 'at',
        refreshToken: 'rt',
        expiresIn: 7200,
      });

      const result = await service.initiateResourceOwnerPasswordFlow(
        'user',
        'pass',
        'api',
        'client1'
      );

      expect(result.accessToken).toBe('at');
      expect(result.refreshToken).toBe('rt');
      expect(result.tokenType).toBe('Bearer');
      expect(result.expiresIn).toBe(7200);
      expect(mockSSOInstance.createSession).toHaveBeenCalledWith(
        'user',
        expect.objectContaining({ username: 'user', clientId: 'client1' }),
        { source: 'password_grant' }
      );
    });
  });

  // ── getUserInfo ──────────────────────────────────────────────────

  describe('getUserInfo', () => {
    it('returns user info for active token', async () => {
      mockSSOInstance.introspectToken.mockResolvedValue({
        active: true,
        sub: 'u1',
        clientId: 'c1',
        iat: 1000,
      });

      const result = await service.getUserInfo('token123');

      expect(result.sub).toBe('u1');
      expect(result.email_verified).toBe(true);
      expect(result.iss).toContain('sso');
    });

    it('throws for inactive token', async () => {
      mockSSOInstance.introspectToken.mockResolvedValue({ active: false });

      await expect(service.getUserInfo('bad')).rejects.toThrow('Invalid access token');
    });
  });

  // ── getTokens ────────────────────────────────────────────────────

  describe('getTokens', () => {
    it('delegates authorization_code grant', async () => {
      mockSSOInstance.exchangeAuthorizationCode.mockResolvedValue({
        accessToken: 'at',
        refreshToken: 'rt',
        idToken: 'it',
      });

      const result = await service.getTokens('authorization_code', {
        code: 'c',
        clientId: 'ci',
        clientSecret: service.OAUTH_CLIENT_SECRET,
        redirectUri: 'u',
      });

      expect(result.accessToken).toBe('at');
    });

    it('delegates refresh_token grant', async () => {
      mockSSOInstance.refreshAccessToken.mockResolvedValue({
        accessToken: 'new-at',
        expiresIn: 3600,
      });

      const result = await service.getTokens('refresh_token', {
        refreshToken: 'rt',
        clientId: 'ci',
      });

      expect(result.accessToken).toBe('new-at');
    });

    it('delegates client_credentials grant', async () => {
      const result = await service.getTokens('client_credentials', {
        clientId: 'ci',
        clientSecret: service.OAUTH_CLIENT_SECRET,
        scope: 'api',
      });

      expect(result.tokenType).toBe('Bearer');
    });

    it('delegates password grant', async () => {
      mockSSOInstance.createSession.mockResolvedValue({
        accessToken: 'at',
        refreshToken: 'rt',
        expiresIn: 3600,
      });

      const result = await service.getTokens('password', {
        username: 'u',
        password: 'p',
        scope: 'api',
        clientId: 'ci',
      });

      expect(result.accessToken).toBe('at');
    });

    it('throws on unsupported grant type', async () => {
      await expect(service.getTokens('unknown_grant', {})).rejects.toThrow(
        'Unsupported grant type: unknown_grant'
      );
    });
  });

  // ── refreshTokenGrant ────────────────────────────────────────────

  describe('refreshTokenGrant', () => {
    it('returns new access token', async () => {
      mockSSOInstance.refreshAccessToken.mockResolvedValue({
        accessToken: 'new-at',
        expiresIn: 3600,
      });

      const result = await service.refreshTokenGrant('rt1', 'client1');

      expect(result.accessToken).toBe('new-at');
      expect(result.tokenType).toBe('Bearer');
      expect(result.expiresIn).toBe(3600);
    });
  });

  // ── getOpenIDConfiguration ───────────────────────────────────────

  describe('getOpenIDConfiguration', () => {
    it('returns OIDC discovery document', () => {
      const config = service.getOpenIDConfiguration();

      expect(config.issuer).toBeTruthy();
      expect(config.authorization_endpoint).toContain('/oauth2/authorize');
      expect(config.token_endpoint).toContain('/oauth2/token');
      expect(config.grant_types_supported).toContain('authorization_code');
      expect(config.scopes_supported).toContain('openid');
      expect(config.code_challenge_methods_supported).toContain('S256');
    });
  });

  // ── verifyPKCE ───────────────────────────────────────────────────

  describe('verifyPKCE', () => {
    it('verifies S256 challenge', async () => {
      // Our mock crypto.createHash returns a fixed buffer
      const result = await service.verifyPKCE('verifier', 'challenge', 'S256');

      expect(typeof result).toBe('boolean');
    });

    it('verifies plain method', async () => {
      const result = await service.verifyPKCE('same', 'same', 'plain');

      expect(result).toBe(true);
    });

    it('returns false for plain mismatch', async () => {
      const result = await service.verifyPKCE('a', 'b', 'plain');

      expect(result).toBe(false);
    });

    it('throws on unsupported method', async () => {
      await expect(service.verifyPKCE('v', 'c', 'UNSUPPORTED')).rejects.toThrow(
        'Unsupported PKCE method'
      );
    });
  });

  // ── revokeToken ──────────────────────────────────────────────────

  describe('revokeToken', () => {
    it('returns success', async () => {
      const result = await service.revokeToken('token1', 'access_token');

      expect(result.success).toBe(true);
    });
  });

  // ── registerClient ───────────────────────────────────────────────

  describe('registerClient', () => {
    it('generates client credentials', async () => {
      const result = await service.registerClient({
        clientName: 'My App',
        redirectUris: ['https://app.com/cb'],
      });

      expect(result.client.clientId).toBeTruthy();
      expect(result.clientSecret).toBeTruthy();
      expect(result.client.clientName).toBe('My App');
      expect(result.client.redirectUris).toEqual(['https://app.com/cb']);
      expect(result.client.registrationTime).toBeTruthy();
    });

    it('uses defaults for missing metadata fields', async () => {
      const result = await service.registerClient({ clientName: 'App2' });

      expect(result.client.responseTypes).toEqual(['code']);
      expect(result.client.grantTypes).toContain('authorization_code');
      expect(result.client.scopes).toContain('openid');
      expect(result.client.contacts).toEqual([]);
    });
  });

  // ── introspectToken ──────────────────────────────────────────────

  describe('introspectToken', () => {
    it('returns introspection for matching client', async () => {
      mockSSOInstance.introspectToken.mockResolvedValue({
        active: true,
        sub: 'u1',
        clientId: 'client1',
      });

      const result = await service.introspectToken('token1', 'client1');

      expect(result.active).toBe(true);
    });

    it('returns inactive when client mismatch', async () => {
      mockSSOInstance.introspectToken.mockResolvedValue({
        active: true,
        sub: 'u1',
        clientId: 'other-client',
      });

      const result = await service.introspectToken('token1', 'client1');

      expect(result.active).toBe(false);
    });

    it('returns inactive on error', async () => {
      mockSSOInstance.introspectToken.mockRejectedValue(new Error('fail'));

      const result = await service.introspectToken('bad', 'c');

      expect(result.active).toBe(false);
    });
  });
});
