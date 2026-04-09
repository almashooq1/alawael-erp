'use strict';

/**
 * Document Intelligence Service — خدمة الذكاء الاصطناعي للمستندات
 * ═══════════════════════════════════════════════════════════════
 * نظام ذكي متكامل للتصنيف التلقائي، اكتشاف التكرار،
 * استخراج البيانات، التلخيص، والتوصيات
 */

const crypto = require('crypto');
const logger = require('../../utils/logger');

// ─────────────────────────────────────────────
// التصنيف الذكي المتقدم
// ─────────────────────────────────────────────

const CLASSIFICATION_RULES = {
  // تقارير
  تقارير: {
    label: 'تقارير',
    labelEn: 'Reports',
    icon: '📊',
    color: '#3B82F6',
    keywords: {
      ar: [
        'تقرير',
        'إحصائية',
        'بيانات',
        'نتائج',
        'تحليل',
        'مؤشر',
        'أداء',
        'ملخص',
        'تقييم',
        'متابعة',
        'رصد',
        'مراقبة',
      ],
      en: [
        'report',
        'statistics',
        'data',
        'results',
        'analysis',
        'performance',
        'summary',
        'kpi',
        'metrics',
        'dashboard',
      ],
    },
    patterns: [
      /تقرير\s*(شهري|سنوي|أسبوعي|ربعي|يومي)/i,
      /report\s*(monthly|annual|weekly|quarterly|daily)/i,
    ],
    weight: 1.0,
  },
  // عقود
  عقود: {
    label: 'عقود',
    labelEn: 'Contracts',
    icon: '📜',
    color: '#8B5CF6',
    keywords: {
      ar: [
        'عقد',
        'اتفاقية',
        'التزام',
        'شروط',
        'أحكام',
        'طرف',
        'توقيع',
        'تعاقد',
        'مناقصة',
        'عطاء',
        'ضمان',
        'كفالة',
      ],
      en: [
        'contract',
        'agreement',
        'terms',
        'conditions',
        'party',
        'signature',
        'tender',
        'bid',
        'guarantee',
        'warranty',
      ],
    },
    patterns: [
      /عقد\s*(توظيف|إيجار|شراء|بيع|خدمات)/i,
      /contract\s*(employment|lease|purchase|sale|service)/i,
    ],
    weight: 1.2,
  },
  // سياسات
  سياسات: {
    label: 'سياسات',
    labelEn: 'Policies',
    icon: '📋',
    color: '#EC4899',
    keywords: {
      ar: [
        'سياسة',
        'لائحة',
        'نظام',
        'قانون',
        'إجراء',
        'تنظيم',
        'قواعد',
        'معايير',
        'ضوابط',
        'توجيه',
      ],
      en: [
        'policy',
        'regulation',
        'procedure',
        'standard',
        'guideline',
        'rule',
        'compliance',
        'governance',
      ],
    },
    patterns: [
      /سياسة\s*(الجودة|الأمان|الخصوصية|الاستخدام)/i,
      /policy\s*(quality|security|privacy|usage)/i,
    ],
    weight: 1.1,
  },
  // تدريب
  تدريب: {
    label: 'تدريب',
    labelEn: 'Training',
    icon: '🎓',
    color: '#F59E0B',
    keywords: {
      ar: [
        'تدريب',
        'دورة',
        'تعليم',
        'تأهيل',
        'ورشة',
        'منهج',
        'شهادة',
        'تطوير',
        'مهارة',
        'حقيبة تدريبية',
      ],
      en: [
        'training',
        'course',
        'education',
        'workshop',
        'curriculum',
        'certificate',
        'development',
        'skill',
      ],
    },
    patterns: [/دورة\s*(تدريبية|تأهيلية|تطويرية)/i, /training\s*(course|workshop|program)/i],
    weight: 1.0,
  },
  // مالي
  مالي: {
    label: 'مالي',
    labelEn: 'Financial',
    icon: '💰',
    color: '#10B981',
    keywords: {
      ar: [
        'فاتورة',
        'مالي',
        'ميزانية',
        'مصروف',
        'إيراد',
        'حساب',
        'ضريبة',
        'راتب',
        'دفع',
        'استلام',
        'قبض',
        'صرف',
      ],
      en: [
        'invoice',
        'financial',
        'budget',
        'expense',
        'revenue',
        'account',
        'tax',
        'salary',
        'payment',
        'receipt',
      ],
    },
    patterns: [
      /فاتورة\s*(رقم|ضريبية|شراء|بيع)/i,
      /invoice\s*(number|tax|purchase|sale)/i,
      /\d+[\.,]\d+\s*(ريال|SAR|USD|EUR)/i,
    ],
    weight: 1.3,
  },
  // شهادات
  شهادات: {
    label: 'شهادات',
    labelEn: 'Certificates',
    icon: '🏆',
    color: '#F97316',
    keywords: {
      ar: ['شهادة', 'اعتماد', 'ترخيص', 'تصريح', 'سجل', 'رخصة', 'إذن', 'تصنيف', 'أهلية'],
      en: [
        'certificate',
        'accreditation',
        'license',
        'permit',
        'registration',
        'authorization',
        'qualification',
      ],
    },
    patterns: [
      /شهادة\s*(حضور|إتمام|تدريب|تقدير)/i,
      /certificate\s*(attendance|completion|training|appreciation)/i,
    ],
    weight: 1.0,
  },
  // مراسلات
  مراسلات: {
    label: 'مراسلات',
    labelEn: 'Correspondence',
    icon: '✉️',
    color: '#6366F1',
    keywords: {
      ar: ['خطاب', 'رسالة', 'مراسلة', 'طلب', 'إفادة', 'تعميم', 'إشعار', 'تنويه', 'بلاغ', 'مذكرة'],
      en: [
        'letter',
        'correspondence',
        'request',
        'memo',
        'notice',
        'notification',
        'circular',
        'communication',
      ],
    },
    patterns: [/خطاب\s*(رسمي|داخلي|خارجي|موجه)/i, /letter\s*(official|internal|external)/i],
    weight: 1.0,
  },
  // أخرى
  أخرى: {
    label: 'أخرى',
    labelEn: 'Other',
    icon: '📎',
    color: '#6B7280',
    keywords: { ar: [], en: [] },
    patterns: [],
    weight: 0.5,
  },
};

// مستويات الأمان
const SECURITY_LEVELS = {
  public: { label: 'عام', labelEn: 'Public', level: 1, icon: '🌐', color: '#10B981' },
  internal: { label: 'داخلي', labelEn: 'Internal', level: 2, icon: '🏢', color: '#3B82F6' },
  confidential: { label: 'سري', labelEn: 'Confidential', level: 3, icon: '🔒', color: '#F59E0B' },
  secret: { label: 'سري للغاية', labelEn: 'Top Secret', level: 4, icon: '🛡️', color: '#EF4444' },
};

// مستويات الأولوية
const PRIORITY_LEVELS = {
  low: { label: 'منخفضة', labelEn: 'Low', level: 1, icon: '🟢', color: '#10B981' },
  medium: { label: 'متوسطة', labelEn: 'Medium', level: 2, icon: '🟡', color: '#F59E0B' },
  high: { label: 'عالية', labelEn: 'High', level: 3, icon: '🟠', color: '#F97316' },
  urgent: { label: 'عاجلة', labelEn: 'Urgent', level: 4, icon: '🔴', color: '#EF4444' },
};

class DocumentIntelligenceService {
  constructor() {
    this.classificationCache = new Map();
    this.hashCache = new Map();
    this.CACHE_TTL = 30 * 60 * 1000; // 30 دقيقة
  }

  // ═══════════════════════════════════════════════════════════
  //  1. التصنيف التلقائي الذكي
  // ═══════════════════════════════════════════════════════════

  /**
   * تصنيف المستند تلقائياً بناءً على العنوان والوصف والمحتوى
   */
  classifyDocument(title = '', description = '', content = '', fileName = '') {
    const text = `${title} ${description} ${content} ${fileName}`.toLowerCase();
    const cacheKey = crypto.createHash('md5').update(text).digest('hex');

    // فحص الكاش
    if (this.classificationCache.has(cacheKey)) {
      const cached = this.classificationCache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.CACHE_TTL) {
        return cached.result;
      }
    }

    const scores = {};
    let totalKeywords = 0;

    for (const [category, config] of Object.entries(CLASSIFICATION_RULES)) {
      if (category === 'أخرى') continue;

      let score = 0;

      // فحص الكلمات المفتاحية العربية
      for (const keyword of config.keywords.ar) {
        const regex = new RegExp(keyword, 'gi');
        const matches = text.match(regex);
        if (matches) {
          score += matches.length * config.weight;
          totalKeywords += matches.length;
        }
      }

      // فحص الكلمات المفتاحية الإنجليزية
      for (const keyword of config.keywords.en) {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        const matches = text.match(regex);
        if (matches) {
          score += matches.length * config.weight * 0.9;
          totalKeywords += matches.length;
        }
      }

      // فحص الأنماط المتقدمة
      for (const pattern of config.patterns) {
        if (pattern.test(text)) {
          score += 3 * config.weight;
          totalKeywords += 3;
        }
      }

      // مكافأة لتطابق اسم الملف
      if (fileName) {
        const ext = fileName.split('.').pop()?.toLowerCase();
        if (category === 'مالي' && ['xlsx', 'xls', 'csv'].includes(ext)) score += 2;
        if (category === 'تقارير' && ['pdf', 'docx'].includes(ext)) score += 1;
        if (category === 'شهادات' && ['pdf', 'jpg', 'png'].includes(ext)) score += 1;
      }

      if (score > 0) scores[category] = score;
    }

    // حساب النتائج بنسب مئوية
    const maxScore = Math.max(...Object.values(scores), 1);
    const results = Object.entries(scores)
      .map(([category, score]) => ({
        category,
        ...CLASSIFICATION_RULES[category],
        confidence: Math.min(score / maxScore, 1),
        score,
      }))
      .sort((a, b) => b.confidence - a.confidence);

    const primary = results[0] || {
      category: 'أخرى',
      ...CLASSIFICATION_RULES['أخرى'],
      confidence: 0.3,
    };

    const result = {
      primary: {
        category: primary.category,
        label: primary.label,
        labelEn: primary.labelEn,
        icon: primary.icon,
        color: primary.color,
        confidence: Math.round(primary.confidence * 100) / 100,
      },
      alternatives: results.slice(1, 4).map(r => ({
        category: r.category,
        label: r.label,
        confidence: Math.round(r.confidence * 100) / 100,
      })),
      securityLevel: this._detectSecurityLevel(text),
      priority: this._detectPriority(text),
      suggestedTags: this._extractTags(text),
      entities: this._extractEntities(text),
      language: this._detectLanguage(text),
      keywordsFound: totalKeywords,
    };

    // حفظ في الكاش
    this.classificationCache.set(cacheKey, { result, timestamp: Date.now() });

    return result;
  }

  /**
   * اكتشاف مستوى الأمان تلقائياً
   */
  _detectSecurityLevel(text) {
    const secretPatterns = [/سري للغاية|top\s*secret|classified/i];
    const confidentialPatterns = [/سري|خاص|confidential|private|restricted/i];
    const internalPatterns = [/داخلي|internal|internal\s*use/i];

    for (const p of secretPatterns) if (p.test(text)) return 'secret';
    for (const p of confidentialPatterns) if (p.test(text)) return 'confidential';
    for (const p of internalPatterns) if (p.test(text)) return 'internal';
    return 'public';
  }

  /**
   * اكتشاف الأولوية تلقائياً
   */
  _detectPriority(text) {
    const urgentPatterns = [/عاجل|فوري|طارئ|urgent|emergency|immediate|asap/i];
    const highPatterns = [/مهم|أولوية|priority|important|critical/i];
    const mediumPatterns = [/متوسط|معتاد|medium|normal/i];

    for (const p of urgentPatterns) if (p.test(text)) return 'urgent';
    for (const p of highPatterns) if (p.test(text)) return 'high';
    for (const p of mediumPatterns) if (p.test(text)) return 'medium';
    return 'low';
  }

  /**
   * استخراج الوسوم المقترحة تلقائياً
   */
  _extractTags(text) {
    const tags = new Set();

    // استخراج من الأنماط
    const dateMatch = text.match(/\d{4}[-/]\d{1,2}[-/]\d{1,2}/);
    if (dateMatch) tags.add(`تاريخ:${dateMatch[0]}`);

    const amountMatch = text.match(/(\d[\d,]*\.?\d*)\s*(ريال|SAR|USD|EUR)/i);
    if (amountMatch) tags.add('مالي');

    // تواريخ هجرية
    if (/\d{2}\/\d{2}\/14\d{2}/i.test(text)) tags.add('تاريخ-هجري');

    // أسماء الأقسام
    const departments = [
      'الموارد البشرية',
      'المالية',
      'التقنية',
      'الإدارة',
      'القانونية',
      'المشتريات',
      'التسويق',
    ];
    for (const dept of departments) {
      if (text.includes(dept.toLowerCase()) || text.includes(dept)) tags.add(dept);
    }

    // كلمات مفتاحية عامة
    const commonTags = {
      'محضر اجتماع': 'اجتماع',
      'خطة عمل': 'تخطيط',
      ميزانية: 'مالي',
      'meeting minutes': 'اجتماع',
      'action plan': 'تخطيط',
      budget: 'مالي',
    };
    for (const [pattern, tag] of Object.entries(commonTags)) {
      if (text.includes(pattern.toLowerCase())) tags.add(tag);
    }

    return [...tags].slice(0, 10);
  }

  /**
   * استخراج الكيانات (أسماء، أرقام، تواريخ، مبالغ)
   */
  _extractEntities(text) {
    const entities = {
      dates: [],
      amounts: [],
      references: [],
      emails: [],
      phones: [],
      urls: [],
    };

    // استخراج التواريخ
    const datePatterns = [
      /\d{4}[-/]\d{1,2}[-/]\d{1,2}/g,
      /\d{1,2}[-/]\d{1,2}[-/]\d{4}/g,
      /\d{2}\/\d{2}\/14\d{2}/g, // تاريخ هجري
    ];
    for (const pattern of datePatterns) {
      const matches = text.match(pattern);
      if (matches) entities.dates.push(...matches);
    }

    // استخراج المبالغ
    const amountPattern = /(\d[\d,]*\.?\d*)\s*(ريال|SAR|USD|EUR|دولار|يورو)/gi;
    let amountMatch;
    while ((amountMatch = amountPattern.exec(text)) !== null) {
      entities.amounts.push({ value: amountMatch[1], currency: amountMatch[2] });
    }

    // استخراج المراجع والأرقام
    const refPatterns = [/(?:رقم|ref|no)[\s:.#]*(\w[\w-/]*\w)/gi, /[A-Z]{2,}-\d{4,}/g];
    for (const pattern of refPatterns) {
      const matches = text.match(pattern);
      if (matches) entities.references.push(...matches);
    }

    // استخراج الإيميلات
    const emailPattern = /[\w.-]+@[\w.-]+\.\w{2,}/g;
    const emails = text.match(emailPattern);
    if (emails) entities.emails.push(...emails);

    // استخراج أرقام الهواتف
    const phonePattern = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/g;
    const phones = text.match(phonePattern);
    if (phones) entities.phones.push(...phones.filter(p => p.replace(/\D/g, '').length >= 7));

    return entities;
  }

  /**
   * اكتشاف اللغة
   */
  _detectLanguage(text) {
    const arabicChars = (text.match(/[\u0600-\u06FF]/g) || []).length;
    const englishChars = (text.match(/[a-zA-Z]/g) || []).length;
    const total = arabicChars + englishChars;

    if (total === 0) return { primary: 'unknown', isMultilingual: false };

    const arabicRatio = arabicChars / total;
    const englishRatio = englishChars / total;

    return {
      primary: arabicRatio > englishRatio ? 'ar' : 'en',
      arabicPercentage: Math.round(arabicRatio * 100),
      englishPercentage: Math.round(englishRatio * 100),
      isMultilingual: arabicRatio > 0.15 && englishRatio > 0.15,
    };
  }

  // ═══════════════════════════════════════════════════════════
  //  2. اكتشاف التكرار
  // ═══════════════════════════════════════════════════════════

  /**
   * إنشاء بصمة محتوى للمستند
   */
  generateContentFingerprint(content) {
    if (!content) return null;
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * حساب تشابه النصوص (Jaccard Similarity)
   */
  calculateTextSimilarity(text1, text2) {
    if (!text1 || !text2) return 0;

    const words1 = new Set(
      text1
        .toLowerCase()
        .split(/\s+/)
        .filter(w => w.length > 2)
    );
    const words2 = new Set(
      text2
        .toLowerCase()
        .split(/\s+/)
        .filter(w => w.length > 2)
    );

    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);

    return union.size > 0 ? intersection.size / union.size : 0;
  }

  /**
   * فحص التكرار المحتمل مقابل قائمة مستندات
   */
  findDuplicates(targetDoc, existingDocs, threshold = 0.7) {
    const targetText = `${targetDoc.title || ''} ${targetDoc.description || ''} ${targetDoc.extractedText || ''}`;
    const targetHash = this.generateContentFingerprint(targetText);

    const duplicates = [];

    for (const doc of existingDocs) {
      // تطابق تام بالبصمة
      const docText = `${doc.title || ''} ${doc.description || ''} ${doc.extractedText || ''}`;
      const docHash = this.generateContentFingerprint(docText);

      if (targetHash && docHash && targetHash === docHash) {
        duplicates.push({
          documentId: doc._id,
          title: doc.title,
          similarity: 1.0,
          type: 'exact',
          reason: 'تطابق تام في المحتوى',
        });
        continue;
      }

      // تشابه الحجم واسم الملف
      const sizeSimilarity =
        targetDoc.fileSize && doc.fileSize
          ? 1 -
            Math.abs(targetDoc.fileSize - doc.fileSize) / Math.max(targetDoc.fileSize, doc.fileSize)
          : 0;

      const nameSimilarity = this.calculateTextSimilarity(
        targetDoc.originalFileName || targetDoc.fileName || '',
        doc.originalFileName || doc.fileName || ''
      );

      // تشابه المحتوى
      const contentSimilarity = this.calculateTextSimilarity(targetText, docText);

      // النتيجة المركبة
      const combinedScore = contentSimilarity * 0.6 + nameSimilarity * 0.25 + sizeSimilarity * 0.15;

      if (combinedScore >= threshold) {
        duplicates.push({
          documentId: doc._id,
          title: doc.title,
          similarity: Math.round(combinedScore * 100) / 100,
          type: combinedScore > 0.95 ? 'near-exact' : 'similar',
          reason: combinedScore > 0.95 ? 'تشابه شبه تام' : 'تشابه كبير في المحتوى',
          details: {
            contentSimilarity: Math.round(contentSimilarity * 100),
            nameSimilarity: Math.round(nameSimilarity * 100),
            sizeSimilarity: Math.round(sizeSimilarity * 100),
          },
        });
      }
    }

    return duplicates.sort((a, b) => b.similarity - a.similarity);
  }

  // ═══════════════════════════════════════════════════════════
  //  3. التلخيص التلقائي
  // ═══════════════════════════════════════════════════════════

  /**
   * تلخيص المستند تلقائياً
   */
  summarizeDocument(text, maxSentences = 3) {
    if (!text || text.trim().length === 0) {
      return { summary: '', keyPoints: [], wordCount: 0 };
    }

    // تقسيم إلى جمل
    const sentences = text
      .split(/[.!?؟。\n]+/)
      .map(s => s.trim())
      .filter(s => s.length > 15);

    if (sentences.length === 0) {
      return {
        summary: text.substring(0, 200),
        keyPoints: [],
        wordCount: text.split(/\s+/).length,
      };
    }

    // حساب أهمية كل جملة بناءً على الكلمات المفتاحية ومكانها
    const wordFreq = {};
    const allWords = text.toLowerCase().split(/\s+/);
    for (const word of allWords) {
      if (word.length > 2) {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      }
    }

    const scored = sentences.map((sentence, idx) => {
      const words = sentence.toLowerCase().split(/\s+/);
      let score = 0;

      // أهمية الكلمات
      for (const word of words) {
        score += wordFreq[word] || 0;
      }

      // مكافأة للجمل الأولى
      if (idx < 3) score *= 1.5;

      // مكافأة للجمل الطويلة المعقولة
      if (words.length >= 8 && words.length <= 30) score *= 1.2;

      return { sentence, score, index: idx };
    });

    // اختيار أفضل الجمل مع الحفاظ على الترتيب الأصلي
    const topSentences = scored
      .sort((a, b) => b.score - a.score)
      .slice(0, maxSentences)
      .sort((a, b) => a.index - b.index);

    // استخراج النقاط الرئيسية
    const keyPoints = scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(s => s.sentence.substring(0, 100));

    return {
      summary: topSentences.map(s => s.sentence).join('. ') + '.',
      keyPoints,
      wordCount: allWords.length,
      sentenceCount: sentences.length,
      readingTimeMinutes: Math.ceil(allWords.length / 200),
    };
  }

  // ═══════════════════════════════════════════════════════════
  //  4. التوصيات الذكية
  // ═══════════════════════════════════════════════════════════

  /**
   * إنشاء توصيات ذكية للمستند
   */
  generateRecommendations(document) {
    const recommendations = [];

    // توصيات الأمان
    if (!document.isEncrypted && document.classification?.securityLevel !== 'public') {
      recommendations.push({
        type: 'security',
        priority: 'high',
        icon: '🔒',
        title: 'تشفير المستند',
        titleEn: 'Encrypt Document',
        message: 'هذا المستند يحتوي على معلومات حساسة ويُنصح بتشفيره',
        action: 'encrypt',
      });
    }

    // توصيات انتهاء الصلاحية
    if (document.expiryDate) {
      const daysUntilExpiry = Math.floor(
        (new Date(document.expiryDate) - new Date()) / (1000 * 60 * 60 * 24)
      );
      if (daysUntilExpiry <= 30 && daysUntilExpiry > 0) {
        recommendations.push({
          type: 'expiry',
          priority: 'medium',
          icon: '⏰',
          title: 'قرب انتهاء الصلاحية',
          titleEn: 'Expiry Approaching',
          message: `ينتهي المستند خلال ${daysUntilExpiry} يوم`,
          action: 'renew',
        });
      } else if (daysUntilExpiry <= 0) {
        recommendations.push({
          type: 'expiry',
          priority: 'urgent',
          icon: '🚨',
          title: 'منتهي الصلاحية',
          titleEn: 'Expired',
          message: 'هذا المستند منتهي الصلاحية ويحتاج إلى تجديد أو أرشفة',
          action: 'archive_or_renew',
        });
      }
    }

    // توصيات الموافقة
    if (document.requiresApproval && document.approvalStatus === 'معلق') {
      recommendations.push({
        type: 'approval',
        priority: 'high',
        icon: '✅',
        title: 'بانتظار الموافقة',
        titleEn: 'Pending Approval',
        message: 'هذا المستند يحتاج إلى موافقة',
        action: 'approve',
      });
    }

    // توصيات الوسوم
    if (!document.tags || document.tags.length === 0) {
      recommendations.push({
        type: 'metadata',
        priority: 'low',
        icon: '🏷️',
        title: 'إضافة وسوم',
        titleEn: 'Add Tags',
        message: 'أضف وسوماً لتسهيل البحث والتنظيم',
        action: 'add_tags',
      });
    }

    // توصيات المشاركة
    if (document.viewCount > 20 && (!document.sharedWith || document.sharedWith.length === 0)) {
      recommendations.push({
        type: 'sharing',
        priority: 'low',
        icon: '📤',
        title: 'مشاركة المستند',
        titleEn: 'Share Document',
        message: 'هذا المستند يُعرض كثيراً، قد ترغب في مشاركته مباشرة',
        action: 'share',
      });
    }

    // توصيات OCR
    if (
      ['jpg', 'jpeg', 'png', 'tiff', 'tif', 'bmp'].includes(document.fileType) &&
      document.ocrStatus === 'none'
    ) {
      recommendations.push({
        type: 'ocr',
        priority: 'medium',
        icon: '👁️',
        title: 'استخراج النص (OCR)',
        titleEn: 'Extract Text (OCR)',
        message: 'يمكن استخراج النص من هذه الصورة لتسهيل البحث',
        action: 'ocr',
      });
    }

    // توصيات النسخ الاحتياطي
    if (document.version > 5 && document.previousVersions?.length > 3) {
      recommendations.push({
        type: 'maintenance',
        priority: 'low',
        icon: '🧹',
        title: 'تنظيف الإصدارات القديمة',
        titleEn: 'Clean Old Versions',
        message: 'يوجد عدد كبير من الإصدارات السابقة، يمكن تنظيف القديمة',
        action: 'clean_versions',
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
      return (priorityOrder[a.priority] || 4) - (priorityOrder[b.priority] || 4);
    });
  }

  // ═══════════════════════════════════════════════════════════
  //  5. تحليلات ذكية
  // ═══════════════════════════════════════════════════════════

  /**
   * تحليل مجموعة مستندات
   */
  analyzeDocumentCollection(documents) {
    if (!documents || documents.length === 0) {
      return this._emptyAnalytics();
    }

    const now = new Date();

    // إحصائيات أساسية
    const totalDocs = documents.length;
    const totalSize = documents.reduce((sum, d) => sum + (d.fileSize || 0), 0);
    const avgSize = totalSize / totalDocs;

    // التوزيع حسب الفئة
    const categoryDistribution = {};
    for (const doc of documents) {
      const cat = doc.category || 'أخرى';
      if (!categoryDistribution[cat]) {
        categoryDistribution[cat] = {
          count: 0,
          totalSize: 0,
          config: CLASSIFICATION_RULES[cat] || CLASSIFICATION_RULES['أخرى'],
        };
      }
      categoryDistribution[cat].count++;
      categoryDistribution[cat].totalSize += doc.fileSize || 0;
    }

    // التوزيع حسب نوع الملف
    const typeDistribution = {};
    for (const doc of documents) {
      const type = doc.fileType || 'other';
      typeDistribution[type] = (typeDistribution[type] || 0) + 1;
    }

    // التوزيع حسب الحالة
    const statusDistribution = {};
    for (const doc of documents) {
      const status = doc.status || 'نشط';
      statusDistribution[status] = (statusDistribution[status] || 0) + 1;
    }

    // أنشطة الشهر الحالي
    const thisMonth = documents.filter(d => {
      const created = new Date(d.createdAt);
      return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
    });

    // المستندات المنتهية / قريبة الانتهاء
    const expired = documents.filter(d => d.expiryDate && new Date(d.expiryDate) < now);
    const expiringSoon = documents.filter(d => {
      if (!d.expiryDate) return false;
      const days = Math.floor((new Date(d.expiryDate) - now) / (1000 * 60 * 60 * 24));
      return days > 0 && days <= 30;
    });

    // المستندات الأكثر تنزيلاً
    const topDownloaded = [...documents]
      .sort((a, b) => (b.downloadCount || 0) - (a.downloadCount || 0))
      .slice(0, 10)
      .map(d => ({ id: d._id, title: d.title, downloads: d.downloadCount || 0 }));

    // المستندات الأكثر مشاهدة
    const topViewed = [...documents]
      .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
      .slice(0, 10)
      .map(d => ({ id: d._id, title: d.title, views: d.viewCount || 0 }));

    // معدل التحميل اليومي (آخر 30 يوم)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const recentDocs = documents.filter(d => new Date(d.createdAt) >= thirtyDaysAgo);
    const dailyUploadRate = (recentDocs.length / 30).toFixed(1);

    // توزيع شهري (آخر 12 شهر)
    const monthlyTrend = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthDocs = documents.filter(d => {
        const created = new Date(d.createdAt);
        return (
          created.getMonth() === date.getMonth() && created.getFullYear() === date.getFullYear()
        );
      });
      monthlyTrend.push({
        month: date.toLocaleDateString('ar-SA', { month: 'long', year: 'numeric' }),
        monthEn: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        count: monthDocs.length,
        totalSize: monthDocs.reduce((sum, d) => sum + (d.fileSize || 0), 0),
      });
    }

    // صحة المستندات
    const healthScore = this._calculateHealthScore(documents);

    return {
      overview: {
        totalDocuments: totalDocs,
        totalSize,
        totalSizeFormatted: this._formatFileSize(totalSize),
        averageSize: Math.round(avgSize),
        averageSizeFormatted: this._formatFileSize(avgSize),
        thisMonthUploads: thisMonth.length,
        dailyUploadRate: parseFloat(dailyUploadRate),
        expiredCount: expired.length,
        expiringSoonCount: expiringSoon.length,
      },
      distributions: {
        byCategory: Object.entries(categoryDistribution).map(([key, val]) => ({
          category: key,
          label: val.config?.label || key,
          icon: val.config?.icon || '📎',
          color: val.config?.color || '#6B7280',
          count: val.count,
          percentage: Math.round((val.count / totalDocs) * 100),
          totalSize: val.totalSize,
          totalSizeFormatted: this._formatFileSize(val.totalSize),
        })),
        byType: Object.entries(typeDistribution)
          .map(([type, count]) => ({
            type,
            count,
            percentage: Math.round((count / totalDocs) * 100),
          }))
          .sort((a, b) => b.count - a.count),
        byStatus: Object.entries(statusDistribution).map(([status, count]) => ({
          status,
          count,
          percentage: Math.round((count / totalDocs) * 100),
        })),
      },
      trends: {
        monthly: monthlyTrend,
      },
      topContent: {
        mostDownloaded: topDownloaded,
        mostViewed: topViewed,
      },
      health: healthScore,
    };
  }

  /**
   * حساب درجة صحة قاعدة المستندات
   */
  _calculateHealthScore(documents) {
    let score = 100;
    const issues = [];

    const total = documents.length;
    if (total === 0) return { score: 100, grade: 'A+', issues: [] };

    // فحص المستندات بدون وصف
    const noDescription = documents.filter(
      d => !d.description || d.description.trim() === ''
    ).length;
    const noDescPercentage = (noDescription / total) * 100;
    if (noDescPercentage > 50) {
      score -= 15;
      issues.push({
        type: 'warning',
        message: `${Math.round(noDescPercentage)}% من المستندات بدون وصف`,
        icon: '⚠️',
      });
    } else if (noDescPercentage > 20) {
      score -= 5;
      issues.push({
        type: 'info',
        message: `${Math.round(noDescPercentage)}% من المستندات بدون وصف`,
        icon: 'ℹ️',
      });
    }

    // فحص المستندات بدون وسوم
    const noTags = documents.filter(d => !d.tags || d.tags.length === 0).length;
    const noTagsPercentage = (noTags / total) * 100;
    if (noTagsPercentage > 60) {
      score -= 10;
      issues.push({
        type: 'warning',
        message: `${Math.round(noTagsPercentage)}% من المستندات بدون وسوم`,
        icon: '🏷️',
      });
    }

    // فحص المستندات المنتهية
    const expired = documents.filter(
      d => d.expiryDate && new Date(d.expiryDate) < new Date()
    ).length;
    if (expired > 0) {
      score -= Math.min(expired * 2, 20);
      issues.push({ type: 'error', message: `${expired} مستند منتهي الصلاحية`, icon: '🚨' });
    }

    // فحص المستندات في سلة المحذوفات
    const deleted = documents.filter(d => d.status === 'محذوف').length;
    if (deleted > total * 0.1) {
      score -= 5;
      issues.push({
        type: 'info',
        message: `${deleted} مستند في المحذوفات (${Math.round((deleted / total) * 100)}%)`,
        icon: '🗑️',
      });
    }

    score = Math.max(0, Math.min(100, score));

    let grade;
    if (score >= 95) grade = 'A+';
    else if (score >= 90) grade = 'A';
    else if (score >= 85) grade = 'B+';
    else if (score >= 80) grade = 'B';
    else if (score >= 70) grade = 'C';
    else if (score >= 60) grade = 'D';
    else grade = 'F';

    return { score, grade, issues, totalChecked: total };
  }

  _emptyAnalytics() {
    return {
      overview: {
        totalDocuments: 0,
        totalSize: 0,
        totalSizeFormatted: '0 Bytes',
        averageSize: 0,
        averageSizeFormatted: '0 Bytes',
        thisMonthUploads: 0,
        dailyUploadRate: 0,
        expiredCount: 0,
        expiringSoonCount: 0,
      },
      distributions: { byCategory: [], byType: [], byStatus: [] },
      trends: { monthly: [] },
      topContent: { mostDownloaded: [], mostViewed: [] },
      health: { score: 100, grade: 'A+', issues: [], totalChecked: 0 },
    };
  }

  _formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // ═══════════════════════════════════════════════════════════
  //  تصدير الثوابت
  // ═══════════════════════════════════════════════════════════

  getClassificationRules() {
    return CLASSIFICATION_RULES;
  }
  getSecurityLevels() {
    return SECURITY_LEVELS;
  }
  getPriorityLevels() {
    return PRIORITY_LEVELS;
  }
}

module.exports = new DocumentIntelligenceService();
