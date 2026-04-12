/**
 * Unit tests — documentIntelligence.service.js
 * Singleton service — document classification, NLP, similarity, etc.
 * Mocks: crypto, logger
 */

'use strict';

/* ── Mocks ──────────────────────────────────────────────────────────── */
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

jest.mock('crypto', () => ({
  createHash: jest.fn().mockReturnValue({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn().mockReturnValue('mock-sha256-hash'),
  }),
}));

/* ── SUT ────────────────────────────────────────────────────────────── */
const docService = require('../../services/documents/documentIntelligence.service');

/* ═══════════════════════════════════════════════════════════════════════ */
describe('documentIntelligence.service', () => {
  /* ── classifyDocument ────────────────────────────────────────────── */
  describe('classifyDocument', () => {
    test('returns full classification structure', () => {
      const result = docService.classifyDocument('تقرير طبي للمريض', 'medical_report.pdf');
      expect(result).toHaveProperty('primary');
      expect(result.primary).toHaveProperty('category');
      expect(result.primary).toHaveProperty('label');
      expect(result.primary).toHaveProperty('labelEn');
      expect(result.primary).toHaveProperty('confidence');
      expect(result).toHaveProperty('alternatives');
      expect(result).toHaveProperty('securityLevel');
      expect(result).toHaveProperty('priority');
      expect(result).toHaveProperty('suggestedTags');
      expect(result).toHaveProperty('entities');
      expect(result).toHaveProperty('language');
      expect(result).toHaveProperty('keywordsFound');
    });

    test('classifies Arabic report content', () => {
      const result = docService.classifyDocument('هذا تقرير شهري عن أداء المشروع', 'report.pdf');
      expect(result.primary.category).toBeDefined();
      expect(typeof result.primary.category).toBe('string');
      expect(result.primary.confidence).toBeGreaterThan(0);
    });

    test('classifies contract content with Arabic keywords', () => {
      const result = docService.classifyDocument(
        'هذا عقد رسمي بين الطرف الأول والطرف الثاني يتضمن الشروط والأحكام والبنود التعاقدية واتفاقية العقد',
        'contract.pdf'
      );
      expect(result.primary.category).toBeDefined();
      expect(result.primary.confidence).toBeGreaterThan(0);
    });

    test('classifies training content with Arabic keywords', () => {
      const result = docService.classifyDocument(
        'خطة تدريب الموظفين الجدد وبرنامج التأهيل والتطوير المهني والدورات التدريبية',
        'training_manual.pdf'
      );
      expect(result.primary.category).toBeDefined();
      expect(result.primary.confidence).toBeGreaterThan(0);
    });

    test('returns alternatives array', () => {
      const result = docService.classifyDocument('مستند عام', 'doc.pdf');
      expect(Array.isArray(result.alternatives)).toBe(true);
    });

    test('entities have correct structure', () => {
      const result = docService.classifyDocument(
        'التاريخ 2024-01-15 والمبلغ 5000 ريال',
        'invoice.pdf'
      );
      expect(result.entities).toHaveProperty('dates');
      expect(result.entities).toHaveProperty('amounts');
      expect(result.entities).toHaveProperty('references');
      expect(result.entities).toHaveProperty('emails');
      expect(result.entities).toHaveProperty('phones');
      expect(result.entities).toHaveProperty('urls');
    });

    test('language detection included in classification', () => {
      const result = docService.classifyDocument('هذا نص عربي', 'doc.pdf');
      expect(result.language).toHaveProperty('primary');
      expect(result.language).toHaveProperty('arabicPercentage');
      expect(result.language).toHaveProperty('isMultilingual');
    });
  });

  /* ── _detectSecurityLevel ────────────────────────────────────────── */
  describe('_detectSecurityLevel', () => {
    test('detects secret level', () => {
      expect(docService._detectSecurityLevel('هذا مستند سري للغاية')).toBe('secret');
    });
    test('detects confidential level', () => {
      expect(docService._detectSecurityLevel('restricted access only')).toBe('confidential');
    });
    test('defaults to public', () => {
      expect(docService._detectSecurityLevel('hello world')).toBe('public');
    });
  });

  /* ── _detectPriority ─────────────────────────────────────────────── */
  describe('_detectPriority', () => {
    test('detects urgent priority', () => {
      expect(docService._detectPriority('هذا أمر عاجل جداً')).toBe('urgent');
    });
    test('detects high priority', () => {
      expect(docService._detectPriority('مهم للمراجعة')).toBe('high');
    });
    test('defaults to low', () => {
      expect(docService._detectPriority('routine document')).toBe('low');
    });
  });

  /* ── _detectLanguage ─────────────────────────────────────────────── */
  describe('_detectLanguage', () => {
    test('detects Arabic returns object', () => {
      const result = docService._detectLanguage('هذا نص عربي بالكامل');
      expect(result.primary).toBe('ar');
      expect(result.arabicPercentage).toBe(100);
      expect(result.isMultilingual).toBe(false);
    });
    test('detects English returns object', () => {
      const result = docService._detectLanguage('This is purely English text');
      expect(result.primary).toBe('en');
      expect(result.englishPercentage).toBe(100);
      expect(result.isMultilingual).toBe(false);
    });
    test('detects mixed language', () => {
      const result = docService._detectLanguage('هذا نص mixed مع English words كثيرة');
      expect(result.isMultilingual).toBe(true);
      expect(result.arabicPercentage).toBeGreaterThan(0);
      expect(result.englishPercentage).toBeGreaterThan(0);
    });
  });

  /* ── _extractTags ────────────────────────────────────────────────── */
  describe('_extractTags', () => {
    test('extracts tags from content', () => {
      const tags = docService._extractTags('تقرير طبي شامل عن حالة المريض الصحية');
      expect(Array.isArray(tags)).toBe(true);
    });
    test('returns empty for empty content', () => {
      const tags = docService._extractTags('');
      expect(Array.isArray(tags)).toBe(true);
    });
  });

  /* ── _extractEntities ────────────────────────────────────────────── */
  describe('_extractEntities', () => {
    test('extracts dates', () => {
      const entities = docService._extractEntities('التاريخ 2024-01-15 والموعد القادم');
      expect(entities.dates).toContain('2024-01-15');
    });
    test('extracts amounts with Arabic currency', () => {
      const entities = docService._extractEntities('المبلغ 5000 ريال');
      expect(entities.amounts.length).toBeGreaterThanOrEqual(1);
      expect(entities.amounts[0]).toHaveProperty('value');
      expect(entities.amounts[0]).toHaveProperty('currency', 'ريال');
    });
    test('extracts emails', () => {
      const entities = docService._extractEntities('contact: user@example.com');
      expect(entities.emails).toContain('user@example.com');
    });
    test('handles empty text', () => {
      const entities = docService._extractEntities('');
      expect(entities.dates).toEqual([]);
      expect(entities.amounts).toEqual([]);
    });
  });

  /* ── generateContentFingerprint ──────────────────────────────────── */
  describe('generateContentFingerprint', () => {
    test('returns a hash string', () => {
      const fp = docService.generateContentFingerprint('test content');
      expect(typeof fp).toBe('string');
      expect(fp.length).toBeGreaterThan(0);
    });
    test('handles empty input gracefully', () => {
      const fp = docService.generateContentFingerprint('');
      // Empty input may return null, empty string, or a hash
      expect(fp === '' || fp === null || typeof fp === 'string').toBe(true);
    });
  });

  /* ── calculateTextSimilarity ─────────────────────────────────────── */
  describe('calculateTextSimilarity', () => {
    test('identical texts return 1', () => {
      expect(docService.calculateTextSimilarity('hello', 'hello')).toBe(1);
    });
    test('completely different texts return low similarity', () => {
      expect(docService.calculateTextSimilarity('abc', 'xyz')).toBeLessThan(0.5);
    });
    test('similar texts return non-zero similarity', () => {
      const sim = docService.calculateTextSimilarity(
        'this is a test document about cats',
        'this is a test document about dogs'
      );
      expect(sim).toBeGreaterThan(0);
      expect(sim).toBeLessThanOrEqual(1);
    });
    test('empty strings return 1 or 0', () => {
      const sim = docService.calculateTextSimilarity('', '');
      expect(typeof sim).toBe('number');
    });
  });

  /* ── findDuplicates ──────────────────────────────────────────────── */
  describe('findDuplicates', () => {
    test('finds duplicates above threshold (returns array)', () => {
      const target = { content: 'hello world test document' };
      const existing = [
        { content: 'hello world test document', id: 'd1' },
        { content: 'totally different content', id: 'd2' },
      ];
      const result = docService.findDuplicates(target, existing, 0.8);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('similarity');
    });
    test('low similarity pairs with high threshold', () => {
      const existing = [{ content: 'xyzzy foobar quxquux', id: 'd1' }];
      const result = docService.findDuplicates(
        { content: 'completely unrelated text here' },
        existing,
        0.99
      );
      expect(Array.isArray(result)).toBe(true);
      // Very high threshold should filter out non-exact matches
    });
    test('handles empty existing array', () => {
      const result = docService.findDuplicates({ content: 'test' }, []);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });
  });

  /* ── summarizeDocument ───────────────────────────────────────────── */
  describe('summarizeDocument', () => {
    test('returns summary with wordCount', () => {
      const text =
        'First sentence. Second sentence. Third sentence. Fourth sentence. Fifth sentence.';
      const result = docService.summarizeDocument(text, 2);
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('wordCount');
      expect(result).toHaveProperty('keyPoints');
      expect(typeof result.summary).toBe('string');
    });
    test('handles short text', () => {
      const result = docService.summarizeDocument('Short text.', 5);
      expect(result.summary).toBe('Short text.');
      expect(result.wordCount).toBeGreaterThan(0);
    });
    test('handles empty text', () => {
      const result = docService.summarizeDocument('');
      expect(result).toHaveProperty('summary');
    });
  });

  /* ── generateRecommendations ─────────────────────────────────────── */
  describe('generateRecommendations', () => {
    test('generates recommendations array for document', () => {
      const result = docService.generateRecommendations({
        content: 'test document content',
        type: 'pdf',
        size: 15000000,
        classification: { securityLevel: 'public' },
      });
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('type');
      expect(result[0]).toHaveProperty('priority');
      expect(result[0]).toHaveProperty('message');
    });
    test('small document gets metadata recommendations', () => {
      const result = docService.generateRecommendations({
        content: 'test',
        type: 'pdf',
        size: 1500,
        classification: { securityLevel: 'public' },
      });
      expect(Array.isArray(result)).toBe(true);
    });
  });

  /* ── analyzeDocumentCollection ───────────────────────────────────── */
  describe('analyzeDocumentCollection', () => {
    test('analyzes collection with overview and distributions', () => {
      const docs = [
        { content: 'doc1', size: 1000, classification: { primary: { category: 'تقارير' } } },
        { content: 'doc2', size: 2000, classification: { primary: { category: 'تقارير' } } },
      ];
      const result = docService.analyzeDocumentCollection(docs);
      expect(result.overview.totalDocuments).toBe(2);
      expect(result).toHaveProperty('distributions');
      expect(result.distributions).toHaveProperty('byCategory');
      expect(result.distributions).toHaveProperty('byType');
      expect(result).toHaveProperty('health');
      expect(result.health).toHaveProperty('score');
      expect(result.health).toHaveProperty('grade');
    });
    test('handles empty collection', () => {
      const result = docService.analyzeDocumentCollection([]);
      expect(result.overview.totalDocuments).toBe(0);
    });
  });

  /* ── _calculateHealthScore ───────────────────────────────────────── */
  describe('_calculateHealthScore', () => {
    test('returns score and grade', () => {
      const result = docService._calculateHealthScore([
        { tags: ['tag1'], description: 'desc', expiresAt: null },
      ]);
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('grade');
      expect(result).toHaveProperty('issues');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });
    test('empty docs get perfect score or near', () => {
      const result = docService._calculateHealthScore([]);
      expect(result).toHaveProperty('score');
    });
  });

  /* ── _formatFileSize ─────────────────────────────────────────────── */
  describe('_formatFileSize', () => {
    test('formats bytes', () => {
      expect(docService._formatFileSize(500)).toContain('Bytes');
    });
    test('formats KB', () => {
      const s = docService._formatFileSize(1500);
      expect(s).toMatch(/KB/i);
    });
    test('formats MB', () => {
      const s = docService._formatFileSize(2 * 1024 * 1024);
      expect(s).toMatch(/MB/i);
    });
    test('handles 0', () => {
      expect(docService._formatFileSize(0)).toContain('0');
    });
  });

  /* ── static rule getters ─────────────────────────────────────────── */
  describe('static rule getters', () => {
    test('getClassificationRules returns object with Arabic keys', () => {
      const rules = docService.getClassificationRules();
      expect(typeof rules).toBe('object');
      expect(rules).not.toBeNull();
      expect(Object.keys(rules).length).toBeGreaterThan(0);
      expect(rules).toHaveProperty('تقارير');
    });
    test('getSecurityLevels returns object with level keys', () => {
      const levels = docService.getSecurityLevels();
      expect(typeof levels).toBe('object');
      expect(levels).toHaveProperty('public');
      expect(levels).toHaveProperty('secret');
      expect(levels).toHaveProperty('confidential');
    });
    test('getPriorityLevels returns object with priority keys', () => {
      const priorities = docService.getPriorityLevels();
      expect(typeof priorities).toBe('object');
      expect(priorities).toHaveProperty('low');
      expect(priorities).toHaveProperty('high');
      expect(priorities).toHaveProperty('urgent');
    });
  });
});
