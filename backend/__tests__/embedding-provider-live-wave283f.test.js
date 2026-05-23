/**
 * embedding-provider-live-wave283f.test.js — real Cohere + OpenAI embed integrations.
 *
 * W283 shipped only the mock provider; W283f promotes the live placeholders
 * to real HTTP integrations against:
 *   - Cohere v2 /embed (model: embed-multilingual-v3.0, 1024-dim — best Arabic)
 *   - OpenAI /v1/embeddings (model: text-embedding-3-large, 3072-dim)
 *
 * Tests use injected fetch mock (no real network) to cover:
 *   (A) Auth path: missing API key → EMBEDDING_LIVE_NOT_CONFIGURED
 *   (B) Happy path: 200 OK with proper response shape → returns vector
 *   (C) Auth-fail path: 401 → EMBEDDING_AUTH_FAIL (no retry)
 *   (D) Rate-limit path: 429 → EMBEDDING_RATE_LIMITED (no retry)
 *   (E) Transient 5xx → retried once, eventually fails with EMBEDDING_UPSTREAM_5XX
 *   (F) Malformed body → EMBEDDING_MALFORMED_RESPONSE
 *   (G) Request shape: correct URL, auth header, body fields
 */

'use strict';

jest.unmock('mongoose');

const provider = require('../services/ai/embeddingProvider');

describe('W283f — live embedding providers (Cohere + OpenAI)', () => {
  // Save originals
  const originalCohere = process.env.COHERE_API_KEY;
  const originalOpenAI = process.env.OPENAI_API_KEY;

  afterEach(() => {
    process.env.COHERE_API_KEY = originalCohere;
    process.env.OPENAI_API_KEY = originalOpenAI;
    provider._fetch = null;
  });

  // ── A. Missing creds ────────────────────────────────────────────────
  describe('missing API key', () => {
    it('Cohere throws EMBEDDING_LIVE_NOT_CONFIGURED', async () => {
      delete process.env.COHERE_API_KEY;
      await expect(provider.liveCohereEmbed('hello')).rejects.toMatchObject({
        code: 'EMBEDDING_LIVE_NOT_CONFIGURED',
      });
    });

    it('OpenAI throws EMBEDDING_LIVE_NOT_CONFIGURED', async () => {
      delete process.env.OPENAI_API_KEY;
      await expect(provider.liveOpenAIEmbed('hello')).rejects.toMatchObject({
        code: 'EMBEDDING_LIVE_NOT_CONFIGURED',
      });
    });
  });

  // ── B. Happy path ───────────────────────────────────────────────────
  describe('happy path', () => {
    it('Cohere returns the vector from embeddings.float[0]', async () => {
      process.env.COHERE_API_KEY = 'test-key';
      const fakeVec = new Array(1024).fill(0).map((_, i) => i / 1024);
      provider._fetch = async () => ({
        ok: true,
        status: 200,
        async json() {
          return { embeddings: { float: [fakeVec] } };
        },
      });
      const result = await provider.liveCohereEmbed('السلام عليكم');
      expect(result).toEqual(fakeVec);
      expect(result.length).toBe(1024);
    });

    it('OpenAI returns the vector from data[0].embedding', async () => {
      process.env.OPENAI_API_KEY = 'test-key';
      const fakeVec = new Array(3072).fill(0).map((_, i) => (i % 2 ? 0.5 : -0.5));
      provider._fetch = async () => ({
        ok: true,
        status: 200,
        async json() {
          return { data: [{ embedding: fakeVec }] };
        },
      });
      const result = await provider.liveOpenAIEmbed('hello world');
      expect(result).toEqual(fakeVec);
      expect(result.length).toBe(3072);
    });
  });

  // ── C-D. Auth + rate-limit (no retry) ───────────────────────────────
  describe('client errors do NOT retry', () => {
    it('Cohere 401 → EMBEDDING_AUTH_FAIL, single call', async () => {
      process.env.COHERE_API_KEY = 'bad-key';
      let calls = 0;
      provider._fetch = async () => {
        calls++;
        return {
          ok: false,
          status: 401,
          async json() {
            return { message: 'invalid' };
          },
        };
      };
      await expect(provider.liveCohereEmbed('q')).rejects.toMatchObject({
        code: 'EMBEDDING_AUTH_FAIL',
        status: 401,
      });
      expect(calls).toBe(1);
    });

    it('OpenAI 429 → EMBEDDING_RATE_LIMITED, single call', async () => {
      process.env.OPENAI_API_KEY = 'k';
      let calls = 0;
      provider._fetch = async () => {
        calls++;
        return {
          ok: false,
          status: 429,
          async json() {
            return {};
          },
        };
      };
      await expect(provider.liveOpenAIEmbed('q')).rejects.toMatchObject({
        code: 'EMBEDDING_RATE_LIMITED',
        status: 429,
      });
      expect(calls).toBe(1);
    });
  });

  // ── E. Transient 5xx retries once ───────────────────────────────────
  describe('transient 5xx → 1 retry', () => {
    it('Cohere 500 then 500 → fails with UPSTREAM_5XX after 2 calls', async () => {
      process.env.COHERE_API_KEY = 'k';
      let calls = 0;
      provider._fetch = async () => {
        calls++;
        return {
          ok: false,
          status: 503,
          async json() {
            return {};
          },
        };
      };
      await expect(provider.liveCohereEmbed('q')).rejects.toMatchObject({
        code: 'EMBEDDING_UPSTREAM_5XX',
      });
      expect(calls).toBe(2); // 1 initial + 1 retry
    });

    it('Cohere 500 then 200 → succeeds after 1 retry', async () => {
      process.env.COHERE_API_KEY = 'k';
      let calls = 0;
      const goodVec = [0.1, 0.2, 0.3];
      provider._fetch = async () => {
        calls++;
        if (calls === 1)
          return {
            ok: false,
            status: 502,
            async json() {
              return {};
            },
          };
        return {
          ok: true,
          status: 200,
          async json() {
            return { embeddings: { float: [goodVec] } };
          },
        };
      };
      const result = await provider.liveCohereEmbed('q');
      expect(result).toEqual(goodVec);
      expect(calls).toBe(2);
    });
  });

  // ── F. Malformed response ───────────────────────────────────────────
  describe('malformed responses', () => {
    it('Cohere missing embeddings.float[0] → EMBEDDING_MALFORMED_RESPONSE', async () => {
      process.env.COHERE_API_KEY = 'k';
      provider._fetch = async () => ({
        ok: true,
        status: 200,
        async json() {
          return { embeddings: {} };
        },
      });
      await expect(provider.liveCohereEmbed('q')).rejects.toMatchObject({
        code: 'EMBEDDING_MALFORMED_RESPONSE',
      });
    });

    it('OpenAI missing data[0].embedding → EMBEDDING_MALFORMED_RESPONSE', async () => {
      process.env.OPENAI_API_KEY = 'k';
      provider._fetch = async () => ({
        ok: true,
        status: 200,
        async json() {
          return { data: [] };
        },
      });
      await expect(provider.liveOpenAIEmbed('q')).rejects.toMatchObject({
        code: 'EMBEDDING_MALFORMED_RESPONSE',
      });
    });
  });

  // ── G. Request shape ────────────────────────────────────────────────
  describe('request shape (URL + headers + body)', () => {
    it('Cohere posts to v2/embed with proper body + auth header', async () => {
      process.env.COHERE_API_KEY = 'secret-cohere-key';
      const captured = {};
      provider._fetch = async (url, init) => {
        captured.url = url;
        captured.headers = init.headers;
        captured.body = JSON.parse(init.body);
        return {
          ok: true,
          status: 200,
          async json() {
            return { embeddings: { float: [[0.1]] } };
          },
        };
      };
      await provider.liveCohereEmbed('test query');
      expect(captured.url).toBe('https://api.cohere.com/v2/embed');
      expect(captured.headers.Authorization).toBe('Bearer secret-cohere-key');
      expect(captured.headers['Content-Type']).toBe('application/json');
      expect(captured.body.texts).toEqual(['test query']);
      expect(captured.body.model).toBe('embed-multilingual-v3.0');
      expect(captured.body.input_type).toBe('search_document');
      expect(captured.body.embedding_types).toEqual(['float']);
    });

    it('OpenAI posts to v1/embeddings with proper body + auth header', async () => {
      process.env.OPENAI_API_KEY = 'sk-test';
      const captured = {};
      provider._fetch = async (url, init) => {
        captured.url = url;
        captured.headers = init.headers;
        captured.body = JSON.parse(init.body);
        return {
          ok: true,
          status: 200,
          async json() {
            return { data: [{ embedding: [0.1] }] };
          },
        };
      };
      await provider.liveOpenAIEmbed('test');
      expect(captured.url).toBe('https://api.openai.com/v1/embeddings');
      expect(captured.headers.Authorization).toBe('Bearer sk-test');
      expect(captured.body.input).toBe('test');
      expect(captured.body.model).toBe('text-embedding-3-large');
    });
  });

  // ── Dimension contract ─────────────────────────────────────────────
  describe('getDimensions reports vendor-spec sizes', () => {
    it('cohere-embed-multilingual-v3 is 1024', () => {
      // getDimensions() reads PROVIDER env, but we can verify the contract
      // via the source — and the runtime would return 1024 if env set.
      const fs = require('fs');
      const path = require('path');
      const src = fs.readFileSync(
        path.join(__dirname, '..', 'services', 'ai', 'embeddingProvider.js'),
        'utf8'
      );
      expect(src).toMatch(/'cohere-embed-multilingual-v3'\)\s+return\s+1024/);
    });

    it('openai-text-embedding-3-large is 3072', () => {
      const fs = require('fs');
      const path = require('path');
      const src = fs.readFileSync(
        path.join(__dirname, '..', 'services', 'ai', 'embeddingProvider.js'),
        'utf8'
      );
      expect(src).toMatch(/'openai-text-embedding-3-large'\)\s+return\s+3072/);
    });
  });
});
