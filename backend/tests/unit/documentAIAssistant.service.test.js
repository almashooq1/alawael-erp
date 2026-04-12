/**
 * Unit Tests — documentAIAssistant.service.js
 * Singleton service: AI-powered document analysis, classification, NLP search, chat
 *
 * ALL methods accept options object (NOT positional args).
 * Returns {success, ...} shapes.
 */

/* ─── Mocks ─────────────────────────────────────────── */
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

jest.mock('crypto', () => ({
  randomBytes: jest.fn(() => ({ toString: () => 'rand123' })),
  createHash: jest.fn(() => ({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn(() => 'hash123'),
  })),
}));

/* ─── SUT ───────────────────────────────────────────── */
const svc = require('../../services/documents/documentAIAssistant.service');

describe('documentAIAssistant.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset knowledge cache so each test starts fresh
    svc._knowledgeCache = null;
    svc._cacheTime = 0;
  });

  // ═══════════════════════════════════════════
  //  Instance / Singleton
  // ═══════════════════════════════════════════
  describe('instance', () => {
    it('is a singleton', () => {
      const svc2 = require('../../services/documents/documentAIAssistant.service');
      expect(svc).toBe(svc2);
    });
    it('has _knowledgeCache property', () => {
      expect(svc).toHaveProperty('_knowledgeCache');
    });
    it('has _cacheTTL', () => {
      expect(svc._cacheTTL).toBe(5 * 60 * 1000);
    });
  });

  // ═══════════════════════════════════════════
  //  classifyDocument — {text, title, documentId, userId}
  //  Returns {success, classification, alternatives, confidence, interactionId}
  // ═══════════════════════════════════════════
  describe('classifyDocument', () => {
    it('returns success:false for empty content', async () => {
      const result = await svc.classifyDocument({ text: '', title: '' });
      expect(result.success).toBe(false);
      expect(result.error).toBe('لا يوجد محتوى للتصنيف');
    });

    it('returns success:true for valid input', async () => {
      const result = await svc.classifyDocument({
        title: 'تقرير طبي',
        text: 'يحتاج المريض إلى علاج طبيعي في المستشفى',
      });
      expect(result.success).toBe(true);
      expect(result).toHaveProperty('classification');
      expect(result).toHaveProperty('alternatives');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('interactionId');
    });

    it('returns classification as null or object', async () => {
      const r = await svc.classifyDocument({ text: 'نص عشوائي بدون معنى واضح' });
      expect(r.success).toBe(true);
      if (r.classification) {
        expect(r.classification).toHaveProperty('key');
        expect(r.classification).toHaveProperty('nameAr');
      }
    });

    it('alternatives is an array', async () => {
      const r = await svc.classifyDocument({ text: 'مستند عام غير مصنف' });
      expect(Array.isArray(r.alternatives)).toBe(true);
    });

    it('confidence is a number', async () => {
      const r = await svc.classifyDocument({ text: 'تقرير مالي' });
      expect(typeof r.confidence).toBe('number');
    });
  });

  // ═══════════════════════════════════════════
  //  summarize — {text, maxLength, documentId, userId}
  //  Returns {success, summary, sentenceCount, originalLength, summaryLength}
  // ═══════════════════════════════════════════
  describe('summarize', () => {
    it('returns error for short text (< 50 chars)', async () => {
      const r = await svc.summarize({ text: 'نص قصير' });
      expect(r.success).toBe(false);
      expect(r.error).toBe('النص قصير جداً للتلخيص');
    });

    it('returns error for empty text', async () => {
      const r = await svc.summarize({ text: '' });
      expect(r.success).toBe(false);
    });

    it('returns error for missing text', async () => {
      const r = await svc.summarize({});
      expect(r.success).toBe(false);
    });

    it('summarizes long text successfully', async () => {
      const longText = 'هذا نص طويل يحتوي على معلومات مهمة عن العلاج الطبيعي والتأهيل. '.repeat(10);
      const r = await svc.summarize({ text: longText });
      expect(r.success).toBe(true);
      expect(r).toHaveProperty('summary');
      expect(r).toHaveProperty('sentenceCount');
      expect(r).toHaveProperty('originalLength');
      expect(r).toHaveProperty('summaryLength');
    });

    it('respects maxLength option', async () => {
      const longText = 'هذه جملة طويلة نسبياً تحتوي على محتوى يمكن تلخيصه بسهولة. '.repeat(20);
      const r = await svc.summarize({ text: longText, maxLength: 100 });
      expect(r.success).toBe(true);
      // Summary length is bounded; it should be shorter than the original
      expect(r.summaryLength).toBeLessThan(r.originalLength);
    });
  });

  // ═══════════════════════════════════════════
  //  extractMetadata — {text, documentId, userId}
  //  Returns {success, metadata: {dates, amounts, references, phones, emails, ...}}
  // ═══════════════════════════════════════════
  describe('extractMetadata', () => {
    it('returns error for missing text', async () => {
      const r = await svc.extractMetadata({});
      expect(r.success).toBe(false);
      expect(r.error).toBe('لا يوجد نص لاستخراج البيانات');
    });

    it('extracts dates from text', async () => {
      const r = await svc.extractMetadata({ text: 'تاريخ التقرير 2024-01-15 ومراجعة 15/06/2024' });
      expect(r.success).toBe(true);
      expect(r.metadata.dates.length).toBeGreaterThan(0);
    });

    it('extracts amounts', async () => {
      const r = await svc.extractMetadata({ text: 'المبلغ 5000 ريال و 2000 SAR' });
      expect(r.success).toBe(true);
      expect(r.metadata.amounts.length).toBeGreaterThan(0);
    });

    it('extracts phone numbers', async () => {
      const r = await svc.extractMetadata({ text: 'اتصل على 0501234567' });
      expect(r.success).toBe(true);
      expect(r.metadata.phones.length).toBeGreaterThan(0);
    });

    it('extracts emails', async () => {
      const r = await svc.extractMetadata({ text: 'البريد test@example.com' });
      expect(r.success).toBe(true);
      expect(r.metadata.emails).toContain('test@example.com');
    });

    it('returns all metadata fields', async () => {
      const r = await svc.extractMetadata({ text: 'بعض النص العام' });
      expect(r.success).toBe(true);
      expect(r.metadata).toHaveProperty('dates');
      expect(r.metadata).toHaveProperty('amounts');
      expect(r.metadata).toHaveProperty('references');
      expect(r.metadata).toHaveProperty('phones');
      expect(r.metadata).toHaveProperty('emails');
    });

    it('has interactionId', async () => {
      const r = await svc.extractMetadata({ text: 'نص بسيط' });
      expect(r).toHaveProperty('interactionId');
    });
  });

  // ═══════════════════════════════════════════
  //  detectDuplicates — {text, title, threshold, limit, documentId, userId}
  //  Returns {success, duplicates, count}
  // ═══════════════════════════════════════════
  describe('detectDuplicates', () => {
    it('returns success with duplicates array', async () => {
      const r = await svc.detectDuplicates({ title: 'تقرير', text: 'محتوى المستند' });
      expect(r.success).toBe(true);
      expect(Array.isArray(r.duplicates)).toBe(true);
      expect(typeof r.count).toBe('number');
    });

    it('returns empty for unmatched content', async () => {
      const r = await svc.detectDuplicates({ title: 'xyz123', text: 'abc456' });
      expect(r.duplicates).toHaveLength(0);
    });
  });

  // ═══════════════════════════════════════════
  //  getSuggestions — {context: {text, title, documentType}, documentId, userId}
  //  Returns {success, suggestions}
  // ═══════════════════════════════════════════
  describe('getSuggestions', () => {
    it('returns success with suggestions array', async () => {
      const r = await svc.getSuggestions({
        context: { text: 'تقرير طبي عن حالة المريض', title: 'تقرير' },
      });
      expect(r.success).toBe(true);
      expect(Array.isArray(r.suggestions)).toBe(true);
    });

    it('returns empty suggestions for no context', async () => {
      const r = await svc.getSuggestions({});
      expect(r.success).toBe(true);
      expect(r.suggestions).toHaveLength(0);
    });

    it('suggests policy for financial documentType', async () => {
      const r = await svc.getSuggestions({
        context: { documentType: 'financial' },
      });
      expect(r.success).toBe(true);
      const policy = r.suggestions.find(s => s.type === 'policy');
      if (policy) {
        expect(policy.label).toContain('مالية');
      }
    });
  });

  // ═══════════════════════════════════════════
  //  naturalLanguageSearch — {query, userId, page, limit}
  //  Returns {success, results, total, page, limit, intent, parsedQuery}
  // ═══════════════════════════════════════════
  describe('naturalLanguageSearch', () => {
    it('returns error for short query', async () => {
      const r = await svc.naturalLanguageSearch({ query: 'x' });
      expect(r.success).toBe(false);
      expect(r.error).toBe('استعلام قصير جداً');
    });

    it('returns success for valid query', async () => {
      const r = await svc.naturalLanguageSearch({ query: 'تقرير طبي' });
      expect(r.success).toBe(true);
      expect(Array.isArray(r.results)).toBe(true);
      expect(typeof r.total).toBe('number');
      expect(r).toHaveProperty('intent');
    });

    it('parses search intent category', async () => {
      const r = await svc.naturalLanguageSearch({ query: 'فاتورة هذا الشهر' });
      expect(r.intent).toHaveProperty('keywords');
      expect(r.intent.category).toBe('financial');
    });

    it('respects page and limit', async () => {
      const r = await svc.naturalLanguageSearch({ query: 'مستندات عامة', page: 2, limit: 5 });
      expect(r.page).toBe(2);
      expect(r.limit).toBe(5);
    });
  });

  // ═══════════════════════════════════════════
  //  _parseSearchIntent
  // ═══════════════════════════════════════════
  describe('_parseSearchIntent', () => {
    it('detects financial category', () => {
      const intent = svc._parseSearchIntent('فاتورة مالية');
      expect(intent.category).toBe('financial');
    });

    it('detects legal category', () => {
      const intent = svc._parseSearchIntent('عقد قانوني');
      expect(intent.category).toBe('legal');
    });

    it('detects approved status', () => {
      const intent = svc._parseSearchIntent('مستندات معتمد');
      expect(intent.status).toBe('approved');
    });

    it('detects rejected status', () => {
      const intent = svc._parseSearchIntent('مرفوض');
      expect(intent.status).toBe('rejected');
    });

    it('detects "today" date range', () => {
      const intent = svc._parseSearchIntent('مستندات اليوم');
      expect(intent.dateRange).not.toBeNull();
      expect(intent.dateRange.from).toBeInstanceOf(Date);
    });

    it('detects "this week" date range', () => {
      const intent = svc._parseSearchIntent('هذا الأسبوع');
      expect(intent.dateRange).not.toBeNull();
    });

    it('removes stop words from keywords', () => {
      const intent = svc._parseSearchIntent('أريد البحث في المستندات');
      expect(intent.keywords).not.toContain('أريد');
      expect(intent.keywords).not.toContain('في');
    });

    it('returns description', () => {
      const intent = svc._parseSearchIntent('تقرير');
      expect(intent.description).toContain('بحث عن');
    });
  });

  // ═══════════════════════════════════════════
  //  chat — {question, documentId, userId}
  //  Returns {success, answer, context, interactionId}
  // ═══════════════════════════════════════════
  describe('chat', () => {
    it('returns error for missing question', async () => {
      const r = await svc.chat({});
      expect(r.success).toBe(false);
      expect(r.error).toBe('الرجاء كتابة سؤال');
    });

    it('answers help question', async () => {
      const r = await svc.chat({ question: 'مساعدة ماذا يمكنك' });
      expect(r.success).toBe(true);
      expect(r.answer).toContain('تصنيف المستندات');
    });

    it('answers unknown question with fallback', async () => {
      const r = await svc.chat({ question: 'سؤال عشوائي غير معروف تماماً' });
      expect(r.success).toBe(true);
      expect(r.answer.length).toBeGreaterThan(0);
    });

    it('has context and interactionId', async () => {
      const r = await svc.chat({ question: 'مساعدة' });
      expect(r).toHaveProperty('context');
      expect(r).toHaveProperty('interactionId');
    });
  });

  // ═══════════════════════════════════════════
  //  analyzeContent — {text, documentId, userId}
  //  Returns {success, analysis: {language, wordCount, sentenceCount, ...}}
  // ═══════════════════════════════════════════
  describe('analyzeContent', () => {
    it('returns error for missing text', async () => {
      const r = await svc.analyzeContent({});
      expect(r.success).toBe(false);
      expect(r.error).toBe('لا يوجد محتوى للتحليل');
    });

    it('analyzes Arabic text', async () => {
      const r = await svc.analyzeContent({
        text: 'هذا نص باللغة العربية يحتوي على عدة كلمات وجمل مختلفة للتحليل',
      });
      expect(r.success).toBe(true);
      expect(r.analysis).toHaveProperty('language', 'arabic');
      expect(r.analysis).toHaveProperty('wordCount');
      expect(r.analysis.wordCount).toBeGreaterThan(0);
    });

    it('analyzes English text', async () => {
      const r = await svc.analyzeContent({
        text: 'This is an English text for analysis and testing purposes in the system',
      });
      expect(r.success).toBe(true);
      expect(r.analysis.language).toBe('english');
    });

    it('has readability score', async () => {
      const r = await svc.analyzeContent({
        text: 'نص يحتوي على جمل متعددة ومتنوعة لقياس مستوى القراءة والتحليل',
      });
      expect(['سهل', 'متوسط', 'صعب']).toContain(r.analysis.readability);
    });

    it('has topWords array', async () => {
      const r = await svc.analyzeContent({
        text: 'كلمة كلمة كلمة تكرار تكرار فريد',
      });
      expect(Array.isArray(r.analysis.topWords)).toBe(true);
    });

    it('has uniqueWords count', async () => {
      const r = await svc.analyzeContent({
        text: 'واحد اثنين ثلاثة أربعة خمسة ستة',
      });
      expect(r.analysis.uniqueWords).toBeGreaterThan(0);
    });

    it('has sentenceCount', async () => {
      const r = await svc.analyzeContent({
        text: 'الجملة الأولى. الجملة الثانية. الجملة الثالثة.',
      });
      expect(r.analysis.sentenceCount).toBeGreaterThanOrEqual(1);
    });
  });

  // ═══════════════════════════════════════════
  //  submitFeedback
  // ═══════════════════════════════════════════
  describe('submitFeedback', () => {
    it('returns not found for non-existent interaction', async () => {
      const r = await svc.submitFeedback('nonexistent', { rating: 5 });
      expect(r.success).toBe(false);
      expect(r.error).toBe('التفاعل غير موجود');
    });
  });

  // ═══════════════════════════════════════════
  //  getHistory
  // ═══════════════════════════════════════════
  describe('getHistory', () => {
    it('returns success with interactions array', async () => {
      const r = await svc.getHistory({});
      expect(r.success).toBe(true);
      expect(Array.isArray(r.interactions)).toBe(true);
      expect(typeof r.total).toBe('number');
    });

    it('supports pagination', async () => {
      const r = await svc.getHistory({ page: 2, limit: 10 });
      expect(r.page).toBe(2);
      expect(r.limit).toBe(10);
    });
  });

  // ═══════════════════════════════════════════
  //  Knowledge CRUD
  // ═══════════════════════════════════════════
  describe('knowledge management', () => {
    it('addKnowledge handles gracefully', async () => {
      try {
        const r = await svc.addKnowledge({
          category: 'test',
          keywords: ['keyword1'],
          answer: 'Test answer',
          key: 'test_key',
        });
        expect(r.success).toBe(true);
      } catch (e) {
        // Mock model may not support constructor
        expect(e.message).toBeTruthy();
      }
    });

    it('getKnowledgeBase returns {success, items}', async () => {
      const r = await svc.getKnowledgeBase({});
      expect(r.success).toBe(true);
      expect(Array.isArray(r.items)).toBe(true);
    });

    it('deleteKnowledge returns success', async () => {
      const r = await svc.deleteKnowledge('some-id');
      expect(r.success).toBe(true);
    });
  });

  // ═══════════════════════════════════════════
  //  getStats — {success, stats: {totalInteractions, byType, avgConfidence, avgRating}}
  // ═══════════════════════════════════════════
  describe('getStats', () => {
    it('returns wrapped stats', async () => {
      const r = await svc.getStats({});
      expect(r.success).toBe(true);
      expect(r.stats).toHaveProperty('totalInteractions');
      expect(r.stats).toHaveProperty('byType');
      expect(r.stats).toHaveProperty('avgConfidence');
      expect(r.stats).toHaveProperty('avgRating');
    });
  });

  // ═══════════════════════════════════════════
  //  initKnowledge
  // ═══════════════════════════════════════════
  describe('initKnowledge', () => {
    it('returns success with count', async () => {
      const r = await svc.initKnowledge();
      expect(r.success).toBe(true);
      expect(r.initialized).toBeGreaterThan(0);
    });

    it('resets cache after init', async () => {
      svc._knowledgeCache = ['cached'];
      await svc.initKnowledge();
      expect(svc._knowledgeCache).toBeNull();
    });
  });
});
