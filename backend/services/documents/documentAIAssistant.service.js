/**
 * Document AI Assistant Service — المساعد الذكي للمستندات
 * ──────────────────────────────────────────────────────────────
 * تصنيف تلقائي، استخراج بيانات، توصيات ذكية، بحث باللغة الطبيعية،
 * ملخصات تلقائية، كشف التكرار، تحليل المحتوى
 *
 * @module documentAIAssistant.service
 */

const mongoose = require('mongoose');
const crypto = require('crypto');

/* ─── AI Interaction Model ───────────────────────────────────── */
const aiInteractionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
    type: {
      type: String,
      enum: [
        'chat',
        'classify',
        'summarize',
        'extract',
        'suggest',
        'search',
        'translate',
        'detect_duplicates',
        'analyze',
      ],
      required: true,
    },
    input: { type: mongoose.Schema.Types.Mixed },
    output: { type: mongoose.Schema.Types.Mixed },
    confidence: { type: Number, min: 0, max: 1 },
    feedback: {
      rating: { type: Number, min: 1, max: 5 },
      helpful: Boolean,
      comment: String,
    },
    processingTime: Number, // ms
    model: String,
  },
  { timestamps: true, collection: 'ai_interactions' }
);

aiInteractionSchema.index({ userId: 1, type: 1 });
aiInteractionSchema.index({ documentId: 1 });

const AIInteraction =
  mongoose.models.AIInteraction || mongoose.model('AIInteraction', aiInteractionSchema);

/* ─── AI Knowledge Base Model ────────────────────────────────── */
const aiKnowledgeSchema = new mongoose.Schema(
  {
    entity: {
      type: String,
      enum: ['category', 'tag', 'department', 'rule', 'pattern'],
    },
    key: { type: String, unique: true },
    nameAr: String,
    nameEn: String,
    description: String,
    keywords: [String],
    patterns: [String],
    confidence: { type: Number, default: 0.8 },
    usageCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, collection: 'ai_knowledge_base' }
);

aiKnowledgeSchema.index({ entity: 1 });
aiKnowledgeSchema.index({ keywords: 1 });

const AIKnowledge = mongoose.models.AIKnowledge || mongoose.model('AIKnowledge', aiKnowledgeSchema);

/* ─── Default Knowledge ──────────────────────────────────────── */
const DEFAULT_KNOWLEDGE = [
  {
    entity: 'category',
    key: 'financial',
    nameAr: 'مالي',
    nameEn: 'Financial',
    keywords: [
      'فاتورة',
      'ميزانية',
      'مصروفات',
      'إيرادات',
      'ضريبة',
      'محاسبة',
      'تكلفة',
      'ربح',
      'خسارة',
      'رصيد',
      'حساب',
      'بنك',
      'شيك',
      'تحويل',
      'قيد',
    ],
    patterns: ['\\bINV[-/]\\d+\\b', '\\bفاتورة\\s+رقم\\b'],
    confidence: 0.85,
  },
  {
    entity: 'category',
    key: 'legal',
    nameAr: 'قانوني',
    nameEn: 'Legal',
    keywords: [
      'عقد',
      'اتفاقية',
      'قانون',
      'محكمة',
      'قضية',
      'توكيل',
      'حكم',
      'نظام',
      'لائحة',
      'ترخيص',
      'تصريح',
      'معاملة',
      'شهادة',
    ],
    patterns: ['\\bعقد\\s+رقم\\b', '\\bاتفاقية\\b'],
    confidence: 0.85,
  },
  {
    entity: 'category',
    key: 'hr',
    nameAr: 'موارد بشرية',
    nameEn: 'Human Resources',
    keywords: [
      'موظف',
      'راتب',
      'إجازة',
      'تعيين',
      'استقالة',
      'تقييم',
      'أداء',
      'تدريب',
      'حضور',
      'انصراف',
      'بدل',
      'مكافأة',
      'نهاية خدمة',
    ],
    patterns: ['\\bEMP[-/]\\d+\\b', '\\bموظف\\s+رقم\\b'],
    confidence: 0.85,
  },
  {
    entity: 'category',
    key: 'procurement',
    nameAr: 'مشتريات',
    nameEn: 'Procurement',
    keywords: [
      'أمر شراء',
      'مناقصة',
      'عطاء',
      'مورد',
      'توريد',
      'استلام',
      'مستودع',
      'مخزون',
      'طلب شراء',
      'عرض سعر',
    ],
    patterns: ['\\bPO[-/]\\d+\\b', '\\bأمر\\s+شراء\\b'],
    confidence: 0.85,
  },
  {
    entity: 'category',
    key: 'correspondence',
    nameAr: 'مراسلات',
    nameEn: 'Correspondence',
    keywords: [
      'خطاب',
      'مذكرة',
      'تعميم',
      'إعلان',
      'دعوة',
      'رد',
      'صادر',
      'وارد',
      'سري',
      'محضر',
      'اجتماع',
    ],
    patterns: ['\\bرقم\\s+الصادر\\b', '\\bرقم\\s+الوارد\\b'],
    confidence: 0.8,
  },
];

/* ─── AI Engine Helpers ──────────────────────────────────────── */
/** Simple Arabic stemmer (removes common suffixes/prefixes) */
function stemArabic(word) {
  let stem = word;
  const prefixes = ['ال', 'و', 'ب', 'ك', 'ل', 'لل', 'فال', 'بال', 'وال'];
  for (const p of prefixes) {
    if (stem.startsWith(p) && stem.length > p.length + 2) {
      stem = stem.slice(p.length);
      break;
    }
  }
  const suffixes = ['ات', 'ين', 'ون', 'ان', 'ية', 'ها', 'هم', 'كم', 'نا'];
  for (const s of suffixes) {
    if (stem.endsWith(s) && stem.length > s.length + 2) {
      stem = stem.slice(0, -s.length);
      break;
    }
  }
  return stem;
}

/** Compute text similarity (Jaccard-like) */
function textSimilarity(textA, textB) {
  if (!textA || !textB) return 0;
  const tokenize = t =>
    new Set(
      t
        .toLowerCase()
        .replace(/[^\w\u0600-\u06FF\s]/g, '')
        .split(/\s+/)
        .filter(Boolean)
        .map(stemArabic)
    );
  const setA = tokenize(textA);
  const setB = tokenize(textB);
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const w of setA) if (setB.has(w)) intersection++;
  return intersection / (setA.size + setB.size - intersection);
}

/* ─── Service ────────────────────────────────────────────────── */
class DocumentAIAssistantService {
  constructor() {
    this._knowledgeCache = null;
    this._cacheTTL = 5 * 60 * 1000; // 5 min
    this._cacheTime = 0;
  }

  /* ─── Init Knowledge Base ─────────────────────────────────── */
  async initKnowledge() {
    for (const item of DEFAULT_KNOWLEDGE) {
      await AIKnowledge.findOneAndUpdate(
        { key: item.key },
        { $setOnInsert: item },
        { upsert: true }
      );
    }
    this._knowledgeCache = null;
    return { success: true, initialized: DEFAULT_KNOWLEDGE.length };
  }

  async _getKnowledge() {
    if (this._knowledgeCache && Date.now() - this._cacheTime < this._cacheTTL) {
      return this._knowledgeCache;
    }
    this._knowledgeCache = await AIKnowledge.find({ isActive: true }).lean();
    if (!this._knowledgeCache.length) {
      await this.initKnowledge();
      this._knowledgeCache = await AIKnowledge.find({ isActive: true }).lean();
    }
    this._cacheTime = Date.now();
    return this._knowledgeCache;
  }

  /* ─── Auto-Classify ───────────────────────────────────────── */
  async classifyDocument(options = {}) {
    const start = Date.now();
    const { documentId, text, title, userId } = options;

    const content = `${title || ''} ${text || ''}`.toLowerCase();
    if (!content.trim()) {
      return { success: false, error: 'لا يوجد محتوى للتصنيف' };
    }

    const knowledge = await this._getKnowledge();
    const categories = knowledge.filter(k => k.entity === 'category');

    const scores = categories.map(cat => {
      let score = 0;
      let matchedKeywords = [];

      for (const kw of cat.keywords || []) {
        if (content.includes(kw.toLowerCase())) {
          score += 2;
          matchedKeywords.push(kw);
        }
        if (content.includes(stemArabic(kw))) {
          score += 1;
        }
      }

      for (const pattern of cat.patterns || []) {
        try {
          if (new RegExp(pattern, 'i').test(content)) score += 3;
        } catch (_) {}
      }

      return {
        key: cat.key,
        nameAr: cat.nameAr,
        nameEn: cat.nameEn,
        score,
        matchedKeywords,
        confidence: Math.min(score / 15, cat.confidence),
      };
    });

    scores.sort((a, b) => b.score - a.score);
    const top = scores.filter(s => s.score > 0).slice(0, 3);
    const primary = top[0] || null;

    const interaction = await this._log({
      userId,
      documentId,
      type: 'classify',
      input: { title, textLength: text?.length },
      output: { primary, alternatives: top.slice(1) },
      confidence: primary?.confidence || 0,
      processingTime: Date.now() - start,
    });

    return {
      success: true,
      classification: primary,
      alternatives: top.slice(1),
      confidence: primary?.confidence || 0,
      interactionId: interaction?._id,
    };
  }

  /* ─── Auto-Summarize ──────────────────────────────────────── */
  async summarize(options = {}) {
    const start = Date.now();
    const { documentId, text, maxLength = 200, userId } = options;

    if (!text || text.trim().length < 50) {
      return { success: false, error: 'النص قصير جداً للتلخيص' };
    }

    // Extractive summarization: sentences scored by position + keyword density
    const sentences = text
      .replace(/([.!?،؟])\s*/g, '$1\n')
      .split('\n')
      .map(s => s.trim())
      .filter(s => s.length > 10);

    const wordFreq = {};
    const words = text
      .replace(/[^\w\u0600-\u06FF\s]/g, '')
      .split(/\s+/)
      .map(stemArabic);
    for (const w of words) {
      if (w.length > 2) wordFreq[w] = (wordFreq[w] || 0) + 1;
    }

    const scored = sentences.map((sent, idx) => {
      const sWords = sent
        .replace(/[^\w\u0600-\u06FF\s]/g, '')
        .split(/\s+/)
        .map(stemArabic);
      let score = 0;
      for (const w of sWords) score += wordFreq[w] || 0;
      score /= Math.max(sWords.length, 1);
      // Position bonus
      if (idx < 3) score *= 1.5;
      if (idx === 0) score *= 2;
      return { sentence: sent, score, idx };
    });

    scored.sort((a, b) => b.score - a.score);
    let summary = '';
    const picked = [];
    for (const s of scored) {
      if (summary.length + s.sentence.length > maxLength) break;
      picked.push(s);
    }
    picked.sort((a, b) => a.idx - b.idx);
    summary = picked.map(p => p.sentence).join(' ');

    const interaction = await this._log({
      userId,
      documentId,
      type: 'summarize',
      input: { textLength: text.length, maxLength },
      output: { summary, sentencesUsed: picked.length },
      confidence: 0.75,
      processingTime: Date.now() - start,
    });

    return {
      success: true,
      summary,
      sentenceCount: picked.length,
      originalLength: text.length,
      summaryLength: summary.length,
      interactionId: interaction?._id,
    };
  }

  /* ─── Extract Metadata ────────────────────────────────────── */
  async extractMetadata(options = {}) {
    const start = Date.now();
    const { documentId, text, userId } = options;

    if (!text) return { success: false, error: 'لا يوجد نص لاستخراج البيانات' };

    const metadata = {
      dates: [],
      amounts: [],
      references: [],
      people: [],
      organizations: [],
      phones: [],
      emails: [],
    };

    // Date patterns (Hijri + Gregorian)
    const datePatterns = [
      /(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/g,
      /(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})/g,
    ];
    for (const p of datePatterns) {
      let m;
      while ((m = p.exec(text))) metadata.dates.push(m[0]);
    }

    // Amounts
    const amountPatterns = [
      /(\d[\d,]+(?:\.\d{1,2})?)\s*(?:ريال|ر\.س|SAR|دولار|USD)/g,
      /(?:ريال|SAR|دولار)\s*(\d[\d,]+(?:\.\d{1,2})?)/g,
    ];
    for (const p of amountPatterns) {
      let m;
      while ((m = p.exec(text))) metadata.amounts.push(m[0]);
    }

    // References / IDs
    const refPatterns = [
      /(?:رقم|#|No\.?)\s*:?\s*([A-Z0-9][\w-]{2,20})/gi,
      /\b[A-Z]{2,5}[-/]\d{3,10}\b/g,
    ];
    for (const p of refPatterns) {
      let m;
      while ((m = p.exec(text))) metadata.references.push(m[0]);
    }

    // Phones
    const phonePattern = /(?:\+?966|05|01)\d[\d\s-]{7,12}/g;
    let pm;
    while ((pm = phonePattern.exec(text))) metadata.phones.push(pm[0].trim());

    // Emails
    const emailPattern = /[\w.+-]+@[\w-]+\.[\w.]+/g;
    let em;
    while ((em = emailPattern.exec(text))) metadata.emails.push(em[0]);

    // Deduplicate
    for (const key of Object.keys(metadata)) {
      metadata[key] = [...new Set(metadata[key])];
    }

    const interaction = await this._log({
      userId,
      documentId,
      type: 'extract',
      input: { textLength: text.length },
      output: metadata,
      confidence: 0.8,
      processingTime: Date.now() - start,
    });

    return { success: true, metadata, interactionId: interaction?._id };
  }

  /* ─── Detect Duplicates ───────────────────────────────────── */
  async detectDuplicates(options = {}) {
    const start = Date.now();
    const { documentId, text, title, threshold = 0.35, limit = 10, userId } = options;

    const Document = mongoose.models.Document || mongoose.model('Document');
    const docs = await Document.find(documentId ? { _id: { $ne: documentId } } : {})
      .select('title description content createdAt')
      .limit(200)
      .lean();

    const query = `${title || ''} ${text || ''}`;
    const matches = docs
      .map(doc => {
        const target = `${doc.title || ''} ${doc.description || ''} ${doc.content || ''}`;
        const sim = textSimilarity(query, target);
        return { documentId: doc._id, title: doc.title, similarity: sim };
      })
      .filter(m => m.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    await this._log({
      userId,
      documentId,
      type: 'detect_duplicates',
      input: { title, threshold },
      output: { found: matches.length },
      confidence: matches[0]?.similarity || 0,
      processingTime: Date.now() - start,
    });

    return { success: true, duplicates: matches, count: matches.length };
  }

  /* ─── Smart Suggestions ───────────────────────────────────── */
  async getSuggestions(options = {}) {
    const start = Date.now();
    const { documentId, context, userId } = options;

    const suggestions = [];

    // Suggest tags
    if (context?.text) {
      const classification = await this.classifyDocument({
        text: context.text,
        title: context.title,
      });
      if (classification.classification) {
        suggestions.push({
          type: 'category',
          value: classification.classification.key,
          label: classification.classification.nameAr,
          confidence: classification.confidence,
          reason: 'تصنيف تلقائي بناءً على المحتوى',
        });
      }

      // Suggest related keywords
      const knowledge = await this._getKnowledge();
      const text = `${context.title || ''} ${context.text || ''}`.toLowerCase();
      for (const kw of knowledge) {
        if (kw.entity !== 'category') continue;
        const matched = (kw.keywords || []).filter(k => text.includes(k.toLowerCase()));
        if (matched.length >= 2) {
          suggestions.push({
            type: 'tags',
            value: matched.slice(0, 5),
            label: `كلمات مفتاحية مقترحة (${kw.nameAr})`,
            confidence: Math.min(matched.length / 5, 0.9),
            reason: `${matched.length} كلمات مطابقة في فئة ${kw.nameAr}`,
          });
        }
      }
    }

    // Suggest archive policy based on doc type
    if (context?.documentType) {
      const policyMap = {
        financial: { label: 'سياسة الأرشفة المالية', retention: '7 سنوات' },
        legal: { label: 'سياسة الأرشفة القانونية', retention: '10 سنوات' },
        hr: { label: 'سياسة الموارد البشرية', retention: '5 سنوات' },
      };
      const policy = policyMap[context.documentType];
      if (policy) {
        suggestions.push({
          type: 'policy',
          value: context.documentType,
          label: policy.label,
          confidence: 0.85,
          reason: `يُنصح بفترة احتفاظ ${policy.retention}`,
        });
      }
    }

    await this._log({
      userId,
      documentId,
      type: 'suggest',
      input: { context: context?.title },
      output: { count: suggestions.length },
      confidence: suggestions[0]?.confidence || 0,
      processingTime: Date.now() - start,
    });

    return { success: true, suggestions };
  }

  /* ─── Natural Language Search ─────────────────────────────── */
  async naturalLanguageSearch(options = {}) {
    const start = Date.now();
    const { query, userId, page = 1, limit = 20 } = options;

    if (!query || query.trim().length < 2) {
      return { success: false, error: 'استعلام قصير جداً' };
    }

    // Parse intent
    const intent = this._parseSearchIntent(query);

    const Document = mongoose.models.Document || mongoose.model('Document');
    const mongoQuery = {};

    if (intent.keywords.length) {
      mongoQuery.$or = [
        { title: { $regex: intent.keywords.join('|'), $options: 'i' } },
        { description: { $regex: intent.keywords.join('|'), $options: 'i' } },
        { content: { $regex: intent.keywords.join('|'), $options: 'i' } },
      ];
    }

    if (intent.dateRange) {
      mongoQuery.createdAt = {};
      if (intent.dateRange.from) mongoQuery.createdAt.$gte = intent.dateRange.from;
      if (intent.dateRange.to) mongoQuery.createdAt.$lte = intent.dateRange.to;
    }

    if (intent.category) mongoQuery.category = intent.category;
    if (intent.status) mongoQuery.status = intent.status;

    const [results, total] = await Promise.all([
      Document.find(mongoQuery)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select('title description category status createdAt createdBy')
        .lean(),
      Document.countDocuments(mongoQuery),
    ]);

    await this._log({
      userId,
      type: 'search',
      input: { query, intent },
      output: { total, returned: results.length },
      confidence: 0.7,
      processingTime: Date.now() - start,
    });

    return {
      success: true,
      results,
      total,
      page,
      limit,
      intent,
      parsedQuery: intent.description,
    };
  }

  _parseSearchIntent(query) {
    const q = query.toLowerCase();
    const intent = {
      keywords: [],
      category: null,
      status: null,
      dateRange: null,
      description: '',
    };

    // Remove stop words
    const stopWords = [
      'في',
      'من',
      'إلى',
      'على',
      'عن',
      'مع',
      'هل',
      'هذا',
      'هذه',
      'التي',
      'الذي',
      'أريد',
      'أبحث',
      'ابحث',
      'اعطني',
      'أعطني',
      'جميع',
      'كل',
    ];
    const words = q.split(/\s+/).filter(w => !stopWords.includes(w) && w.length > 1);
    intent.keywords = words;

    // Detect category
    const catMap = {
      مالي: 'financial',
      فاتورة: 'financial',
      قانوني: 'legal',
      عقد: 'legal',
      موظف: 'hr',
      شراء: 'procurement',
      خطاب: 'correspondence',
    };
    for (const [kw, cat] of Object.entries(catMap)) {
      if (q.includes(kw)) {
        intent.category = cat;
        break;
      }
    }

    // Detect status
    if (q.includes('معتمد') || q.includes('موافق')) intent.status = 'approved';
    if (q.includes('مرفوض')) intent.status = 'rejected';
    if (q.includes('قيد') || q.includes('انتظار')) intent.status = 'pending';

    // Detect date range
    const now = new Date();
    if (q.includes('اليوم')) {
      const from = new Date(now);
      from.setHours(0, 0, 0, 0);
      intent.dateRange = { from, to: now };
    } else if (q.includes('هذا الأسبوع') || q.includes('الاسبوع')) {
      const from = new Date(now);
      from.setDate(from.getDate() - 7);
      intent.dateRange = { from, to: now };
    } else if (q.includes('هذا الشهر') || q.includes('الشهر')) {
      const from = new Date(now);
      from.setMonth(from.getMonth() - 1);
      intent.dateRange = { from, to: now };
    }

    intent.description = `بحث عن: ${intent.keywords.join(' ')}${intent.category ? ` | فئة: ${intent.category}` : ''}${intent.status ? ` | حالة: ${intent.status}` : ''}${intent.dateRange ? ' | مع فلتر زمني' : ''}`;

    return intent;
  }

  /* ─── Chat / Q&A ──────────────────────────────────────────── */
  async chat(options = {}) {
    const start = Date.now();
    const { question, documentId, userId } = options;

    if (!question) return { success: false, error: 'الرجاء كتابة سؤال' };

    let context = {};
    let answer = '';

    if (documentId) {
      try {
        const Document = mongoose.models.Document || mongoose.model('Document');
        const doc = await Document.findById(documentId).lean();
        if (doc) {
          context = {
            title: doc.title,
            category: doc.category,
            status: doc.status,
            createdAt: doc.createdAt,
          };
        }
      } catch (_) {}
    }

    // Simple rule-based Q&A
    const q = question.toLowerCase();
    if (q.includes('كم') && q.includes('مستند')) {
      const Document = mongoose.models.Document || mongoose.model('Document');
      const count = await Document.countDocuments();
      answer = `يوجد حالياً ${count} مستند في النظام.`;
    } else if (q.includes('آخر') || q.includes('أحدث')) {
      const Document = mongoose.models.Document || mongoose.model('Document');
      const recent = await Document.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select('title createdAt')
        .lean();
      answer = `آخر المستندات:\n${recent.map((d, i) => `${i + 1}. ${d.title || 'بدون عنوان'}`).join('\n')}`;
    } else if (q.includes('مساعدة') || q.includes('ماذا يمكنك')) {
      answer =
        'يمكنني مساعدتك في:\n' +
        '• تصنيف المستندات تلقائياً\n' +
        '• تلخيص المحتوى\n' +
        '• استخراج البيانات (تواريخ، مبالغ، مراجع)\n' +
        '• كشف المستندات المكررة\n' +
        '• البحث بلغة طبيعية\n' +
        '• اقتراحات ذكية\n' +
        '• الإجابة عن أسئلة حول المستندات';
    } else if (context.title && (q.includes('ما هو') || q.includes('ما هذا'))) {
      answer = `هذا المستند بعنوان "${context.title}" في فئة ${context.category || 'غير مصنف'}, حالته: ${context.status || 'غير محدد'}.`;
    } else {
      // Fallback — search-based
      const searchResult = await this.naturalLanguageSearch({
        query: question,
        limit: 3,
      });
      if (searchResult.results?.length) {
        answer = `وجدت ${searchResult.total} نتيجة. أبرزها:\n${searchResult.results.map((d, i) => `${i + 1}. ${d.title || 'بدون عنوان'}`).join('\n')}`;
      } else {
        answer =
          'عذراً، لم أتمكن من فهم السؤال بشكل كامل. حاول صياغته بطريقة مختلفة أو استخدم البحث المتقدم.';
      }
    }

    const interaction = await this._log({
      userId,
      documentId,
      type: 'chat',
      input: { question },
      output: { answer },
      confidence: 0.7,
      processingTime: Date.now() - start,
    });

    return {
      success: true,
      answer,
      context,
      interactionId: interaction?._id,
    };
  }

  /* ─── Content Analysis ────────────────────────────────────── */
  async analyzeContent(options = {}) {
    const start = Date.now();
    const { documentId, text, userId } = options;

    if (!text) return { success: false, error: 'لا يوجد محتوى للتحليل' };

    const words = text.split(/\s+/).filter(Boolean);
    const sentences = text.split(/[.!?،؟\n]/).filter(s => s.trim().length > 5);

    // Language detection
    const arabicChars = (text.match(/[\u0600-\u06FF]/g) || []).length;
    const latinChars = (text.match(/[a-zA-Z]/g) || []).length;
    const totalChars = arabicChars + latinChars;
    const language =
      totalChars === 0 ? 'unknown' : arabicChars / totalChars > 0.5 ? 'arabic' : 'english';

    // Word frequency
    const freq = {};
    for (const w of words) {
      const stemmed = stemArabic(w.replace(/[^\w\u0600-\u06FF]/g, ''));
      if (stemmed.length > 2) freq[stemmed] = (freq[stemmed] || 0) + 1;
    }
    const topWords = Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([word, count]) => ({ word, count }));

    // Readability score (simple)
    const avgSentenceLen = words.length / Math.max(sentences.length, 1);
    const readability = avgSentenceLen < 15 ? 'سهل' : avgSentenceLen < 25 ? 'متوسط' : 'صعب';

    const analysis = {
      language,
      languageRatio: {
        arabic: arabicChars,
        latin: latinChars,
      },
      wordCount: words.length,
      sentenceCount: sentences.length,
      characterCount: text.length,
      avgWordLength:
        Math.round((words.reduce((s, w) => s + w.length, 0) / Math.max(words.length, 1)) * 10) / 10,
      avgSentenceLength: Math.round(avgSentenceLen * 10) / 10,
      readability,
      topWords,
      uniqueWords: new Set(words.map(w => stemArabic(w.toLowerCase()))).size,
    };

    await this._log({
      userId,
      documentId,
      type: 'analyze',
      input: { textLength: text.length },
      output: analysis,
      confidence: 0.85,
      processingTime: Date.now() - start,
    });

    return { success: true, analysis };
  }

  /* ─── Feedback ────────────────────────────────────────────── */
  async submitFeedback(interactionId, feedback) {
    const interaction = await AIInteraction.findByIdAndUpdate(
      interactionId,
      { $set: { feedback } },
      { new: true }
    );
    if (!interaction) return { success: false, error: 'التفاعل غير موجود' };
    return { success: true };
  }

  /* ─── Interaction History ─────────────────────────────────── */
  async getHistory(options = {}) {
    const { userId, type, page = 1, limit = 20 } = options;
    const filter = {};
    if (userId) filter.userId = userId;
    if (type) filter.type = type;

    const [interactions, total] = await Promise.all([
      AIInteraction.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      AIInteraction.countDocuments(filter),
    ]);

    return { success: true, interactions, total, page, limit };
  }

  /* ─── Knowledge CRUD ──────────────────────────────────────── */
  async addKnowledge(data) {
    const item = new AIKnowledge({
      ...data,
      key: data.key || `custom_${Date.now()}`,
    });
    await item.save();
    this._knowledgeCache = null;
    return { success: true, knowledge: item };
  }

  async updateKnowledge(knowledgeId, updates) {
    const item = await AIKnowledge.findByIdAndUpdate(
      knowledgeId,
      { $set: updates },
      { new: true }
    ).lean();
    this._knowledgeCache = null;
    if (!item) return { success: false, error: 'العنصر غير موجود' };
    return { success: true, knowledge: item };
  }

  async deleteKnowledge(knowledgeId) {
    await AIKnowledge.findByIdAndDelete(knowledgeId);
    this._knowledgeCache = null;
    return { success: true };
  }

  async getKnowledgeBase(options = {}) {
    const { entity } = options;
    const filter = {};
    if (entity) filter.entity = entity;
    const items = await AIKnowledge.find(filter).sort({ usageCount: -1 }).lean();
    return { success: true, items };
  }

  /* ─── Stats ───────────────────────────────────────────────── */
  async getStats(options = {}) {
    const { userId } = options;
    const filter = userId ? { userId: new mongoose.Types.ObjectId(userId) } : {};

    const [total, byType, avgConfidence, avgRating] = await Promise.all([
      AIInteraction.countDocuments(filter),
      AIInteraction.aggregate([
        { $match: filter },
        { $group: { _id: '$type', count: { $sum: 1 } } },
      ]),
      AIInteraction.aggregate([
        { $match: { ...filter, confidence: { $gt: 0 } } },
        { $group: { _id: null, avg: { $avg: '$confidence' } } },
      ]),
      AIInteraction.aggregate([
        { $match: { ...filter, 'feedback.rating': { $exists: true } } },
        { $group: { _id: null, avg: { $avg: '$feedback.rating' } } },
      ]),
    ]);

    return {
      success: true,
      stats: {
        totalInteractions: total,
        byType: byType.reduce((a, t) => ({ ...a, [t._id]: t.count }), {}),
        avgConfidence: avgConfidence[0]?.avg || 0,
        avgRating: avgRating[0]?.avg || 0,
      },
    };
  }

  /* ─── Logger ──────────────────────────────────────────────── */
  async _log(data) {
    try {
      return await AIInteraction.create(data);
    } catch (_) {
      return null;
    }
  }
}

module.exports = new DocumentAIAssistantService();
