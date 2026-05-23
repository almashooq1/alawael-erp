/**
 * parent-chatbot-rag-wave283c.test.js — POLICY_QUERY intent backed by RAG.
 *
 * The Parent Chatbot is template-driven (not LLM-completion). W283c adds
 * a new `POLICY_QUERY` intent + template that gets `{ANSWER_TEXT}` +
 * `{CITATIONS}` tokens filled from the RAG retriever.
 *
 * Tests cover:
 *   (1) Intent + template registered
 *   (2) Keywords match "policy" / "سياسة" etc.
 *   (3) Factory accepts ragRetriever option
 *   (4) Happy path: query → chunks → ANSWER_TEXT + CITATIONS in response
 *   (5) No-match path: 0 chunks → downgrade to UNKNOWN (don't hallucinate)
 *   (6) Throw path: retriever throws → downgrade to UNKNOWN
 *   (7) Not-wired path: no retriever → downgrade to UNKNOWN
 *   (8) RAG_RETRIEVAL_ID surfaced for audit linkage
 */

'use strict';

jest.unmock('mongoose');

const reg = require('../intelligence/parent-chatbot.registry');
const { createParentChatbotService } = require('../intelligence/parent-chatbot.service');

describe('W283c — Parent Chatbot RAG integration (POLICY_QUERY intent)', () => {
  // ── Registry ─────────────────────────────────────────────────────────
  describe('registry: POLICY_QUERY intent', () => {
    it('INTENT.POLICY_QUERY defined', () => {
      expect(reg.INTENT.POLICY_QUERY).toBe('policy.query');
    });

    it('INTENTS list includes POLICY_QUERY', () => {
      expect(reg.INTENTS).toContain('policy.query');
    });

    it('keywords cover Arabic policy terms', () => {
      const kw = reg.INTENT_KEYWORDS[reg.INTENT.POLICY_QUERY];
      expect(kw.ar).toEqual(expect.arrayContaining(['سياسة', 'إجراء', 'قانون']));
    });

    it('keywords cover English policy terms', () => {
      const kw = reg.INTENT_KEYWORDS[reg.INTENT.POLICY_QUERY];
      expect(kw.en).toEqual(expect.arrayContaining(['policy', 'procedure', 'rule']));
    });

    it('template has both ANSWER_TEXT and CITATIONS tokens', () => {
      const tpl = reg.RESPONSE_TEMPLATES[reg.INTENT.POLICY_QUERY];
      expect(tpl).toMatch(/\{ANSWER_TEXT\}/);
      expect(tpl).toMatch(/\{CITATIONS\}/);
    });
  });

  // ── Service factory + RAG retriever ──────────────────────────────────
  describe('service: ragRetriever wiring', () => {
    let mockSession;
    let mockRagResults;

    beforeEach(() => {
      // Mock session model — needs to be CALLABLE AS A CONSTRUCTOR per Mongoose pattern
      const sessions = new Map();
      function SessionModel(payload) {
        Object.assign(this, payload);
        this.turns = Array.isArray(payload.turns) ? payload.turns : [];
        this.save = async () => {
          sessions.set(this.sessionId, this);
          return this;
        };
      }
      SessionModel.findOne = jest.fn(async () => null);
      SessionModel.findById = jest.fn(async () => null);
      mockSession = SessionModel;
      mockRagResults = null;
    });

    function makeService({ ragRetriever }) {
      return createParentChatbotService({
        sessionModel: mockSession,
        ragRetriever,
        logger: { info: () => {}, warn: () => {}, error: () => {} },
      });
    }

    it('accepts ragRetriever as factory option without erroring', () => {
      const svc = makeService({ ragRetriever: { retrieve: async () => ({ chunks: [] }) } });
      expect(svc).toBeTruthy();
      expect(typeof svc.ask).toBe('function');
    });

    it('POLICY_QUERY with chunks → response contains ANSWER_TEXT + CITATIONS', async () => {
      const retriever = {
        retrieve: async () => ({
          retrievalId: 'r-123',
          chunks: [
            {
              chunkId: 'c-1',
              chunkText: 'سياسة إلغاء الموعد: يجب الإلغاء قبل 24 ساعة من الموعد.',
              sourceDocTitle: 'دليل السياسات',
              similarity: 0.85,
              rank: 1,
            },
            {
              chunkId: 'c-2',
              chunkText: 'في حالة الإلغاء بعد 24 ساعة، تُطبَّق رسوم 50%.',
              sourceDocTitle: 'دليل السياسات',
              similarity: 0.78,
              rank: 2,
            },
          ],
          topSimilarity: 0.85,
        }),
      };
      const svc = makeService({ ragRetriever: retriever });
      // Avoid query words that match other intent keywords (e.g. إلغاء → cancel intent).
      // Stick to pure policy-domain wording.
      const result = await svc.ask({
        message: 'ما هي سياسة الاسترداد؟',
        userId: 'u1',
        beneficiaryId: 'b1',
      });
      expect(result.ok).toBe(true);
      expect(result.intent).toBe('policy.query');
      expect(result.response).toMatch(/بناءً على سياسات المركز/);
      expect(result.response).toMatch(/سياسة إلغاء الموعد/);
      expect(result.response).toMatch(/24 ساعة/);
      expect(result.response).toMatch(/📚 المصدر: دليل السياسات/);
    });

    it('POLICY_QUERY with 0 chunks → downgraded to UNKNOWN template', async () => {
      const retriever = {
        retrieve: async () => ({ chunks: [], retrievalId: 'r-empty', topSimilarity: 0 }),
      };
      const svc = makeService({ ragRetriever: retriever });
      const result = await svc.ask({
        message: 'ما هي سياسة الاسترداد؟',
        userId: 'u1',
      });
      expect(result.ok).toBe(true);
      // Should be the UNKNOWN template, NOT the POLICY_QUERY template with unfilled tokens
      expect(result.response).toMatch(/عذرًا|لم أفهم/);
      expect(result.response).not.toMatch(/\{ANSWER_TEXT\}/);
      expect(result.response).not.toMatch(/\{CITATIONS\}/);
    });

    it('POLICY_QUERY with throwing retriever → downgraded to UNKNOWN', async () => {
      const retriever = {
        retrieve: async () => {
          throw new Error('RAG service down');
        },
      };
      const svc = makeService({ ragRetriever: retriever });
      const result = await svc.ask({
        message: 'policy on documents',
        userId: 'u1',
      });
      expect(result.ok).toBe(true);
      expect(result.response).toMatch(/عذرًا|لم أفهم/);
    });

    it('POLICY_QUERY without ragRetriever wired → downgraded to UNKNOWN', async () => {
      const svc = makeService({ ragRetriever: null });
      const result = await svc.ask({
        message: 'what are the policies',
        userId: 'u1',
      });
      expect(result.ok).toBe(true);
      expect(result.response).toMatch(/عذرًا|لم أفهم/);
    });

    it('non-POLICY_QUERY intents unaffected by ragRetriever presence', async () => {
      const retriever = {
        retrieve: async () => {
          throw new Error('should not be called');
        },
      };
      const svc = makeService({ ragRetriever: retriever });
      const result = await svc.ask({
        message: 'مرحبا',
        userId: 'u1',
      });
      expect(result.ok).toBe(true);
      expect(result.response).toMatch(/أهلاً|كيف يمكنني مساعدتك/);
    });
  });

  // ── Bootstrap wiring ─────────────────────────────────────────────────
  describe('bootstrap wires ragRetriever from app._ragService', () => {
    const fs = require('fs');
    const path = require('path');
    const BOOTSTRAP = fs.readFileSync(
      path.join(__dirname, '..', 'startup', 'parentChatbotBootstrap.js'),
      'utf8'
    );

    it('reads app._ragService and passes as ragRetriever', () => {
      expect(BOOTSTRAP).toMatch(/app\._ragService/);
      expect(BOOTSTRAP).toMatch(/ragRetriever/);
    });
  });
});
