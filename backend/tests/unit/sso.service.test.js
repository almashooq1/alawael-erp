/**
 * Unit tests for sso.service.js — SSO Service
 * Exports the SSOService CLASS (not instantiated).
 * Uses jsonwebtoken (wrapped), crypto, ioredis, logger.
 * We do NOT set USE_MOCK_CACHE — instead mock ioredis with in-memory store
 * so all methods that use this.redisClient directly will work.
 */

/* ── Mock jsonwebtoken — store payloads so verify returns them ──────── */
jest.mock('jsonwebtoken', () => {
  const _store = new Map();
  let _seq = 0;
  return {
    sign: jest.fn((payload, secret) => {
      const token = `tok_${++_seq}_${Date.now()}`;
      _store.set(token, { ...payload });
      return token;
    }),
    verify: jest.fn((token, secret) => {
      const data = _store.get(token);
      if (!data) throw new Error('invalid token');
      return data;
    }),
    __store: _store,
  };
});

/* ── Mock ioredis — full in-memory Redis substitute ─────────────────── */
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => {
    const kv = new Map();
    const sets = new Map();
    return {
      get: jest.fn(async key => kv.get(key) || null),
      setex: jest.fn(async (key, ttl, value) => {
        kv.set(key, value);
      }),
      set: jest.fn(async (key, value) => {
        kv.set(key, value);
      }),
      del: jest.fn(async key => {
        kv.delete(key);
        sets.delete(key);
      }),
      sadd: jest.fn(async (key, member) => {
        if (!sets.has(key)) sets.set(key, new Set());
        sets.get(key).add(member);
      }),
      smembers: jest.fn(async key => {
        const s = sets.get(key);
        return s ? Array.from(s) : [];
      }),
      srem: jest.fn(async (key, member) => {
        const s = sets.get(key);
        if (s) s.delete(member);
      }),
      disconnect: jest.fn().mockResolvedValue('OK'),
      on: jest.fn(),
    };
  });
});

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

/* ── Env — NOT mock cache, so constructor creates redisClient ───────── */
process.env.USE_MOCK_CACHE = 'false';
process.env.DISABLE_REDIS = 'false';
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-unit-tests';

/* ── SUT ────────────────────────────────────────────────────────────── */
const SSOService = require('../../services/sso.service');

beforeEach(() => jest.clearAllMocks());

/* ═══════════════════════════════════════════════════════════════════════ */
describe('SSOService', () => {
  let sso;

  beforeEach(() => {
    sso = new SSOService();
  });

  /* ── generateTokens (pure) ───────────────────────────────────────── */
  describe('generateTokens', () => {
    test('returns accessToken, refreshToken, idToken', () => {
      const tokens = sso.generateTokens('u1', { role: 'admin' }, 'sess1');
      expect(tokens.accessToken).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();
      expect(tokens.idToken).toBeDefined();
    });
  });

  /* ── generateAccessToken (pure) ──────────────────────────────────── */
  describe('generateAccessToken', () => {
    test('returns a token string', () => {
      const token = sso.generateAccessToken('u1', { role: 'admin' }, 'sess1');
      expect(typeof token).toBe('string');
    });
  });

  /* ── createSession ───────────────────────────────────────────────── */
  describe('createSession', () => {
    test('returns session with tokens', async () => {
      const result = await sso.createSession('u1', { role: 'admin' }, { ip: '127.0.0.1' });
      expect(result.sessionId).toBeDefined();
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.expiresIn).toBeDefined();
      expect(result.tokenType).toBe('Bearer');
    });

    test('stores session in Redis', async () => {
      const result = await sso.createSession('u1', { role: 'admin' }, {});
      const info = await sso.getSessionInfo(result.sessionId);
      expect(info).toBeDefined();
      expect(info.userId).toBe('u1');
      expect(info.status).toBe('active');
    });
  });

  /* ── verifySession ───────────────────────────────────────────────── */
  describe('verifySession', () => {
    test('valid session returns valid=true', async () => {
      const session = await sso.createSession('u1', { role: 'admin' }, {});
      const result = await sso.verifySession(session.sessionId, session.accessToken);
      expect(result.valid).toBe(true);
      expect(result.session).toBeDefined();
    });

    test('non-existent session returns valid=false', async () => {
      const result = await sso.verifySession('nonexistent', 'sometoken');
      expect(result.valid).toBe(false);
    });
  });

  /* ── refreshAccessToken ──────────────────────────────────────────── */
  describe('refreshAccessToken', () => {
    test('returns new access token', async () => {
      const session = await sso.createSession('u1', { role: 'admin' }, {});
      const result = await sso.refreshAccessToken(session.sessionId, session.refreshToken);
      expect(result.accessToken).toBeDefined();
      expect(result.tokenType).toBe('Bearer');
    });

    test('non-existent session throws', async () => {
      await expect(sso.refreshAccessToken('nonexistent', 'tok')).rejects.toThrow(
        'Session not found'
      );
    });
  });

  /* ── endSession ──────────────────────────────────────────────────── */
  describe('endSession', () => {
    test('removes session', async () => {
      const session = await sso.createSession('u1', { role: 'admin' }, {});
      const res = await sso.endSession(session.sessionId);
      expect(res.success).toBe(true);
      const info = await sso.getSessionInfo(session.sessionId);
      expect(info).toBeNull();
    });
  });

  /* ── endAllUserSessions ──────────────────────────────────────────── */
  describe('endAllUserSessions', () => {
    test('ends all sessions for a user', async () => {
      await sso.createSession('u1', { role: 'admin' }, {});
      await sso.createSession('u1', { role: 'admin' }, {});
      const result = await sso.endAllUserSessions('u1');
      expect(result.success).toBe(true);
      expect(result.sessionsEnded).toBe(2);
    });
  });

  /* ── getUserActiveSessions ───────────────────────────────────────── */
  describe('getUserActiveSessions', () => {
    test('returns active sessions for user', async () => {
      await sso.createSession('u1', { role: 'admin' }, {});
      const sessions = await sso.getUserActiveSessions('u1');
      expect(Array.isArray(sessions)).toBe(true);
      expect(sessions.length).toBeGreaterThanOrEqual(1);
    });
  });

  /* ── updateSessionMetadata ───────────────────────────────────────── */
  describe('updateSessionMetadata', () => {
    test('updates metadata', async () => {
      const session = await sso.createSession('u1', { role: 'admin' }, {});
      const updated = await sso.updateSessionMetadata(session.sessionId, { browser: 'Chrome' });
      expect(updated.metadata.browser).toBe('Chrome');
    });

    test('throws for non-existent session', async () => {
      await expect(sso.updateSessionMetadata('nonexistent', {})).rejects.toThrow(
        'Session not found'
      );
    });
  });

  /* ── getSessionInfo ──────────────────────────────────────────────── */
  describe('getSessionInfo', () => {
    test('returns session info', async () => {
      const session = await sso.createSession('u1', { role: 'admin' }, {});
      const info = await sso.getSessionInfo(session.sessionId);
      expect(info).toBeDefined();
      expect(info.sessionId).toBe(session.sessionId);
    });

    test('returns null for non-existent', async () => {
      const info = await sso.getSessionInfo('nonexistent');
      expect(info).toBeNull();
    });
  });

  /* ── validateOAuthRequest ────────────────────────────────────────── */
  describe('validateOAuthRequest', () => {
    test('returns valid for proper request', async () => {
      const result = await sso.validateOAuthRequest(
        'client1',
        'https://example.com/callback',
        'openid profile',
        'state123'
      );
      expect(result.valid).toBe(true);
      expect(result.clientId).toBe('client1');
      expect(result.scope).toEqual(['openid', 'profile']);
    });

    test('rejects missing redirect_uri', async () => {
      const result = await sso.validateOAuthRequest('client1', '', 'openid', 'state');
      expect(result.valid).toBe(false);
    });

    test('rejects fragment in redirect_uri', async () => {
      const result = await sso.validateOAuthRequest(
        'client1',
        'https://example.com/cb#frag',
        'openid',
        'state'
      );
      expect(result.valid).toBe(false);
    });

    test('rejects missing clientId', async () => {
      const result = await sso.validateOAuthRequest(
        '',
        'https://example.com/cb',
        'openid',
        'state'
      );
      expect(result.valid).toBe(false);
    });
  });

  /* ── generateAuthorizationCode ───────────────────────────────────── */
  describe('generateAuthorizationCode', () => {
    test('returns auth code string', async () => {
      const code = await sso.generateAuthorizationCode(
        'u1',
        'client1',
        'openid',
        'https://example.com/cb'
      );
      expect(code).toBeDefined();
      expect(typeof code).toBe('string');
    });
  });

  /* ── introspectToken ─────────────────────────────────────────────── */
  describe('introspectToken', () => {
    test('returns active for valid token', async () => {
      const tokens = sso.generateTokens('u1', { role: 'admin' }, 'sess1');
      const result = await sso.introspectToken(tokens.accessToken);
      expect(result.active).toBe(true);
      expect(result.sub).toBe('u1');
    });

    test('returns inactive for invalid token', async () => {
      const result = await sso.introspectToken('invalid-token-xyz');
      expect(result.active).toBe(false);
    });
  });

  /* ── disconnect ──────────────────────────────────────────────────── */
  describe('disconnect', () => {
    test('does not throw', async () => {
      await expect(sso.disconnect()).resolves.not.toThrow();
    });
  });
});
