/**
 * Document Translation Service — خدمة ترجمة المستندات
 * ──────────────────────────────────────────────────────
 * ترجمة متعددة اللغات • ذاكرة ترجمة • كشف تلقائي للغة
 * مسرد مصطلحات • ترجمة دفعية • مراجعة ترجمة
 */

const mongoose = require('mongoose');
const crypto = require('crypto');

/* ══════════════════════════════════════════════════════════════
   MODELS
   ══════════════════════════════════════════════════════════════ */

const translationJobSchema = new mongoose.Schema(
  {
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
    sourceLanguage: { type: String, required: true },
    targetLanguage: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'translating', 'review', 'completed', 'failed', 'cancelled'],
      default: 'pending',
    },
    priority: { type: String, enum: ['urgent', 'high', 'normal', 'low'], default: 'normal' },
    type: { type: String, enum: ['auto', 'human', 'hybrid'], default: 'auto' },

    sourceContent: { type: String },
    translatedContent: { type: String },

    segments: [
      {
        sourceText: String,
        translatedText: String,
        status: {
          type: String,
          enum: ['pending', 'translated', 'reviewed', 'approved'],
          default: 'pending',
        },
        confidence: { type: Number, min: 0, max: 1 },
        reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        reviewNote: String,
      },
    ],

    qualityScore: { type: Number, min: 0, max: 100 },
    wordCount: { type: Number, default: 0 },
    charCount: { type: Number, default: 0 },
    progress: { type: Number, default: 0, min: 0, max: 100 },

    tmMatchCount: { type: Number, default: 0 },
    glossaryUsed: { type: Boolean, default: false },

    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    completedAt: Date,
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, collection: 'translation_jobs' }
);

translationJobSchema.index({ documentId: 1, targetLanguage: 1 });
translationJobSchema.index({ status: 1 });
translationJobSchema.index({ requestedBy: 1, createdAt: -1 });

const TranslationJob =
  mongoose.models.TranslationJob || mongoose.model('TranslationJob', translationJobSchema);

/* ─── Translation Memory ─── */
const translationMemorySchema = new mongoose.Schema(
  {
    sourceLanguage: { type: String, required: true },
    targetLanguage: { type: String, required: true },
    sourceText: { type: String, required: true },
    translatedText: { type: String, required: true },
    sourceHash: { type: String, index: true },
    context: String,
    domain: String,
    quality: { type: Number, min: 0, max: 100, default: 80 },
    usageCount: { type: Number, default: 1 },
    verified: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, collection: 'translation_memory' }
);

translationMemorySchema.index({ sourceHash: 1, sourceLanguage: 1, targetLanguage: 1 });
translationMemorySchema.index({ sourceLanguage: 1, targetLanguage: 1 });

const TranslationMemory =
  mongoose.models.TranslationMemory || mongoose.model('TranslationMemory', translationMemorySchema);

/* ─── Glossary ─── */
const glossarySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: String,
    sourceLanguage: { type: String, required: true },
    targetLanguage: { type: String, required: true },
    domain: { type: String, default: 'general' },
    entries: [
      {
        sourceTerm: { type: String, required: true },
        targetTerm: { type: String, required: true },
        partOfSpeech: String,
        context: String,
        note: String,
        isApproved: { type: Boolean, default: true },
      },
    ],
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, collection: 'translation_glossaries' }
);

const Glossary = mongoose.models.Glossary || mongoose.model('Glossary', glossarySchema);

/* ══════════════════════════════════════════════════════════════
   SUPPORTED LANGUAGES
   ══════════════════════════════════════════════════════════════ */

const LANGUAGES = {
  ar: { name: 'العربية', nativeName: 'العربية', dir: 'rtl' },
  en: { name: 'English', nativeName: 'English', dir: 'ltr' },
  fr: { name: 'French', nativeName: 'Français', dir: 'ltr' },
  es: { name: 'Spanish', nativeName: 'Español', dir: 'ltr' },
  de: { name: 'German', nativeName: 'Deutsch', dir: 'ltr' },
  tr: { name: 'Turkish', nativeName: 'Türkçe', dir: 'ltr' },
  ur: { name: 'Urdu', nativeName: 'اردو', dir: 'rtl' },
  fa: { name: 'Persian', nativeName: 'فارسی', dir: 'rtl' },
  zh: { name: 'Chinese', nativeName: '中文', dir: 'ltr' },
  ja: { name: 'Japanese', nativeName: '日本語', dir: 'ltr' },
  ko: { name: 'Korean', nativeName: '한국어', dir: 'ltr' },
  hi: { name: 'Hindi', nativeName: 'हिन्दी', dir: 'ltr' },
  pt: { name: 'Portuguese', nativeName: 'Português', dir: 'ltr' },
  ru: { name: 'Russian', nativeName: 'Русский', dir: 'ltr' },
  it: { name: 'Italian', nativeName: 'Italiano', dir: 'ltr' },
  nl: { name: 'Dutch', nativeName: 'Nederlands', dir: 'ltr' },
  id: { name: 'Indonesian', nativeName: 'Bahasa Indonesia', dir: 'ltr' },
  ms: { name: 'Malay', nativeName: 'Bahasa Melayu', dir: 'ltr' },
};

/* ══════════════════════════════════════════════════════════════
   LANGUAGE DETECTION
   ══════════════════════════════════════════════════════════════ */

const LANG_PATTERNS = {
  ar: /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/,
  fa: /[\u06C0-\u06C3\u06CC\u06D0-\u06D5]/,
  ur: /[\u0600-\u06FF].*[\u0679\u0688\u0691\u06BA\u06BE\u06C1\u06D2]/,
  he: /[\u0590-\u05FF]/,
  zh: /[\u4E00-\u9FFF]/,
  ja: /[\u3040-\u309F\u30A0-\u30FF]/,
  ko: /[\uAC00-\uD7AF\u1100-\u11FF]/,
  hi: /[\u0900-\u097F]/,
  ru: /[\u0400-\u04FF]/,
  th: /[\u0E00-\u0E7F]/,
};

function detectLanguage(text) {
  if (!text || typeof text !== 'string') return { language: 'unknown', confidence: 0 };
  const sample = text.substring(0, 2000);

  for (const [lang, pattern] of Object.entries(LANG_PATTERNS)) {
    const matches = (sample.match(pattern) || []).length;
    const ratio = matches / sample.length;
    if (ratio > 0.15) return { language: lang, confidence: Math.min(0.95, 0.5 + ratio) };
  }

  // Latin-script heuristics
  const words = sample.toLowerCase().split(/\s+/);
  const langScores = { en: 0, fr: 0, es: 0, de: 0, pt: 0, it: 0, nl: 0, tr: 0, id: 0, ms: 0 };
  const markers = {
    en: ['the', 'is', 'and', 'of', 'to', 'in', 'it', 'that', 'was', 'for'],
    fr: ['le', 'la', 'les', 'de', 'des', 'un', 'une', 'et', 'est', 'dans'],
    es: ['el', 'la', 'los', 'de', 'en', 'un', 'una', 'que', 'es', 'por'],
    de: ['der', 'die', 'das', 'und', 'ein', 'eine', 'ist', 'von', 'den', 'mit'],
    tr: ['bir', 've', 'bu', 'için', 'ile', 'olan', 'gibi', 'daha', 'çok', 'var'],
    pt: ['o', 'a', 'os', 'de', 'em', 'um', 'uma', 'que', 'do', 'da'],
    it: ['il', 'la', 'di', 'che', 'un', 'una', 'per', 'del', 'della', 'con'],
  };

  for (const w of words) {
    for (const [lang, kws] of Object.entries(markers)) {
      if (kws.includes(w)) langScores[lang]++;
    }
  }

  let best = 'en',
    bestScore = 0;
  for (const [lang, score] of Object.entries(langScores)) {
    if (score > bestScore) {
      best = lang;
      bestScore = score;
    }
  }

  return { language: best, confidence: Math.min(0.85, bestScore / (words.length * 0.3)) };
}

/* ══════════════════════════════════════════════════════════════
   SIMPLE TRANSLATION ENGINE (Simulation)
   ══════════════════════════════════════════════════════════════ */

function hashText(text) {
  return crypto.createHash('md5').update(text.trim().toLowerCase()).digest('hex');
}

function splitIntoSegments(text) {
  return text.split(/(?<=[.!?؟。！？\n])\s+/).filter(s => s.trim());
}

async function translateSegment(sourceText, sourceLang, targetLang, glossary) {
  // 1. Check translation memory
  const hash = hashText(sourceText);
  const tmMatch = await TranslationMemory.findOne({
    sourceHash: hash,
    sourceLanguage: sourceLang,
    targetLanguage: targetLang,
    isActive: true,
  }).sort({ quality: -1 });

  if (tmMatch) {
    tmMatch.usageCount++;
    await tmMatch.save();
    return {
      translatedText: tmMatch.translatedText,
      confidence: tmMatch.quality / 100,
      source: 'tm',
    };
  }

  // 2. Apply glossary terms
  let processed = sourceText;
  let glossaryApplied = false;
  if (glossary && glossary.entries) {
    for (const entry of glossary.entries) {
      if (processed.includes(entry.sourceTerm)) {
        processed = processed.replace(
          new RegExp(entry.sourceTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
          entry.targetTerm
        );
        glossaryApplied = true;
      }
    }
  }

  // 3. Simulated translation with markers
  const translated = glossaryApplied ? processed : `[${targetLang}] ${sourceText}`;

  // 4. Save to TM
  await TranslationMemory.create({
    sourceLanguage: sourceLang,
    targetLanguage: targetLang,
    sourceText,
    translatedText: translated,
    sourceHash: hash,
    quality: glossaryApplied ? 75 : 60,
    verified: false,
  });

  return { translatedText: translated, confidence: glossaryApplied ? 0.75 : 0.6, source: 'engine' };
}

/* ══════════════════════════════════════════════════════════════
   SERVICE METHODS
   ══════════════════════════════════════════════════════════════ */

class DocumentTranslationService {
  /* ─── Translate Document ─── */
  async translateDocument(documentId, targetLanguage, options = {}, userId) {
    const {
      sourceLanguage,
      type = 'auto',
      priority = 'normal',
      useGlossary = true,
      glossaryId,
    } = options;

    // Detect source language if not provided
    let srcLang = sourceLanguage;
    if (!srcLang) {
      const doc = await mongoose
        .model('Document')
        .findById(documentId)
        .select('content title description')
        .lean();
      const text = doc?.content || doc?.description || doc?.title || '';
      const detected = detectLanguage(text);
      srcLang = detected.language;
    }

    if (!LANGUAGES[targetLanguage]) {
      throw new Error(`اللغة الهدف غير مدعومة: ${targetLanguage}`);
    }

    // Load glossary
    let glossary = null;
    if (useGlossary) {
      glossary = glossaryId
        ? await Glossary.findById(glossaryId)
        : await Glossary.findOne({
            sourceLanguage: srcLang,
            targetLanguage: targetLanguage,
            isActive: true,
          });
    }

    // Get document content
    const doc = await mongoose.model('Document').findById(documentId).lean();
    const content = doc?.content || doc?.description || doc?.title || '';
    const segments = splitIntoSegments(content);
    const wordCount = content.split(/\s+/).length;

    // Create job
    const job = await TranslationJob.create({
      documentId,
      sourceLanguage: srcLang,
      targetLanguage,
      status: 'translating',
      priority,
      type,
      sourceContent: content,
      wordCount,
      charCount: content.length,
      segments: segments.map(s => ({ sourceText: s, status: 'pending' })),
      glossaryUsed: !!glossary,
      requestedBy: userId,
    });

    // Process segments
    let tmMatches = 0;
    const translated = [];

    for (let i = 0; i < segments.length; i++) {
      const result = await translateSegment(segments[i], srcLang, targetLanguage, glossary);
      job.segments[i].translatedText = result.translatedText;
      job.segments[i].confidence = result.confidence;
      job.segments[i].status = 'translated';
      if (result.source === 'tm') tmMatches++;
      translated.push(result.translatedText);
      job.progress = Math.round(((i + 1) / segments.length) * 100);
    }

    job.translatedContent = translated.join(' ');
    job.tmMatchCount = tmMatches;
    job.qualityScore = Math.round(
      (job.segments.reduce((sum, s) => sum + (s.confidence || 0), 0) /
        Math.max(1, job.segments.length)) *
        100
    );
    job.status = type === 'auto' ? 'completed' : 'review';
    job.completedAt = type === 'auto' ? new Date() : undefined;
    await job.save();

    return { success: true, job };
  }

  /* ─── Batch Translate ─── */
  async batchTranslate(documentIds, targetLanguage, options = {}, userId) {
    const results = [];
    for (const docId of documentIds) {
      try {
        const r = await this.translateDocument(docId, targetLanguage, options, userId);
        results.push({ documentId: docId, success: true, jobId: r.job._id });
      } catch (error) {
        results.push({ documentId: docId, success: false, error: error.message });
      }
    }
    return {
      success: true,
      results,
      total: documentIds.length,
      successful: results.filter(r => r.success).length,
    };
  }

  /* ─── Detect Language ─── */
  async detectLanguage(text) {
    const result = detectLanguage(text);
    const langInfo = LANGUAGES[result.language];
    return {
      success: true,
      detection: {
        ...result,
        languageName: langInfo?.name || result.language,
        nativeName: langInfo?.nativeName || result.language,
        direction: langInfo?.dir || 'ltr',
      },
    };
  }

  /* ─── Get Supported Languages ─── */
  async getSupportedLanguages() {
    return { success: true, languages: LANGUAGES, count: Object.keys(LANGUAGES).length };
  }

  /* ─── Review Segment ─── */
  async reviewSegment(jobId, segmentIndex, reviewData, userId) {
    const job = await TranslationJob.findById(jobId);
    if (!job) throw new Error('مهمة الترجمة غير موجودة');
    if (!job.segments[segmentIndex]) throw new Error('الجزء غير موجود');

    const segment = job.segments[segmentIndex];
    if (reviewData.translatedText) segment.translatedText = reviewData.translatedText;
    segment.status = reviewData.approved ? 'approved' : 'reviewed';
    segment.reviewedBy = userId;
    segment.reviewNote = reviewData.note || '';

    // Update TM with reviewed version
    if (reviewData.approved && segment.translatedText) {
      const hash = hashText(segment.sourceText);
      await TranslationMemory.findOneAndUpdate(
        {
          sourceHash: hash,
          sourceLanguage: job.sourceLanguage,
          targetLanguage: job.targetLanguage,
        },
        {
          translatedText: segment.translatedText,
          quality: 95,
          verified: true,
          $inc: { usageCount: 1 },
        },
        { upsert: true }
      );
    }

    // Check if all segments are reviewed
    const allReviewed = job.segments.every(s => ['approved', 'reviewed'].includes(s.status));
    if (allReviewed) {
      job.translatedContent = job.segments.map(s => s.translatedText).join(' ');
      job.status = 'completed';
      job.completedAt = new Date();
      job.qualityScore = Math.round(
        (job.segments.reduce((sum, s) => sum + (s.confidence || 0.9), 0) / job.segments.length) *
          100
      );
    }

    await job.save();
    return { success: true, job };
  }

  /* ─── Get Job ─── */
  async getJob(jobId) {
    const job = await TranslationJob.findById(jobId)
      .populate('requestedBy', 'name email')
      .populate('assignedTo', 'name email');
    if (!job) throw new Error('مهمة الترجمة غير موجودة');
    return { success: true, job };
  }

  /* ─── List Jobs ─── */
  async getJobs(filters = {}, userId) {
    const query = {};
    if (filters.status) query.status = filters.status;
    if (filters.documentId) query.documentId = filters.documentId;
    if (filters.targetLanguage) query.targetLanguage = filters.targetLanguage;
    if (filters.myJobs) query.requestedBy = userId;

    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 20;

    const [jobs, total] = await Promise.all([
      TranslationJob.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('requestedBy', 'name')
        .lean(),
      TranslationJob.countDocuments(query),
    ]);

    return { success: true, jobs, total, page, pages: Math.ceil(total / limit) };
  }

  /* ─── Cancel Job ─── */
  async cancelJob(jobId, userId) {
    const job = await TranslationJob.findById(jobId);
    if (!job) throw new Error('مهمة الترجمة غير موجودة');
    if (['completed', 'cancelled'].includes(job.status))
      throw new Error('لا يمكن إلغاء هذه المهمة');
    job.status = 'cancelled';
    await job.save();
    return { success: true, job };
  }

  /* ══════ Translation Memory ══════ */

  async getTMEntries(filters = {}) {
    const query = { isActive: true };
    if (filters.sourceLanguage) query.sourceLanguage = filters.sourceLanguage;
    if (filters.targetLanguage) query.targetLanguage = filters.targetLanguage;
    if (filters.verified !== undefined) query.verified = filters.verified;
    if (filters.search) {
      query.$or = [
        { sourceText: { $regex: filters.search, $options: 'i' } },
        { translatedText: { $regex: filters.search, $options: 'i' } },
      ];
    }

    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 50;

    const [entries, total] = await Promise.all([
      TranslationMemory.find(query)
        .sort({ usageCount: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      TranslationMemory.countDocuments(query),
    ]);

    return { success: true, entries, total, page, pages: Math.ceil(total / limit) };
  }

  async addTMEntry(data, userId) {
    const entry = await TranslationMemory.create({
      ...data,
      sourceHash: hashText(data.sourceText),
      createdBy: userId,
    });
    return { success: true, entry };
  }

  async deleteTMEntry(entryId) {
    await TranslationMemory.findByIdAndUpdate(entryId, { isActive: false });
    return { success: true };
  }

  async importTM(entries, userId) {
    const results = [];
    for (const e of entries) {
      try {
        const hash = hashText(e.sourceText);
        await TranslationMemory.findOneAndUpdate(
          { sourceHash: hash, sourceLanguage: e.sourceLanguage, targetLanguage: e.targetLanguage },
          { ...e, sourceHash: hash, createdBy: userId, isActive: true },
          { upsert: true }
        );
        results.push({ success: true, sourceText: e.sourceText });
      } catch (err) {
        results.push({ success: false, sourceText: e.sourceText, error: err.message });
      }
    }
    return {
      success: true,
      imported: results.filter(r => r.success).length,
      total: entries.length,
    };
  }

  /* ══════ Glossary ══════ */

  async getGlossaries(filters = {}) {
    const query = { isActive: true };
    if (filters.sourceLanguage) query.sourceLanguage = filters.sourceLanguage;
    if (filters.targetLanguage) query.targetLanguage = filters.targetLanguage;
    if (filters.domain) query.domain = filters.domain;

    const glossaries = await Glossary.find(query).sort({ createdAt: -1 }).lean();
    return { success: true, glossaries };
  }

  async createGlossary(data, userId) {
    const glossary = await Glossary.create({ ...data, createdBy: userId });
    return { success: true, glossary };
  }

  async updateGlossary(glossaryId, data) {
    const glossary = await Glossary.findByIdAndUpdate(glossaryId, { $set: data }, { new: true });
    if (!glossary) throw new Error('المسرد غير موجود');
    return { success: true, glossary };
  }

  async deleteGlossary(glossaryId) {
    await Glossary.findByIdAndUpdate(glossaryId, { isActive: false });
    return { success: true };
  }

  async addGlossaryEntry(glossaryId, entry) {
    const glossary = await Glossary.findById(glossaryId);
    if (!glossary) throw new Error('المسرد غير موجود');
    glossary.entries.push(entry);
    await glossary.save();
    return { success: true, glossary };
  }

  async removeGlossaryEntry(glossaryId, entryIndex) {
    const glossary = await Glossary.findById(glossaryId);
    if (!glossary) throw new Error('المسرد غير موجود');
    glossary.entries.splice(entryIndex, 1);
    await glossary.save();
    return { success: true, glossary };
  }

  /* ══════ Stats ══════ */

  async getStats(userId) {
    const [totalJobs, completedJobs, tmEntries, glossaries, langStats] = await Promise.all([
      TranslationJob.countDocuments(userId ? { requestedBy: userId } : {}),
      TranslationJob.countDocuments({
        status: 'completed',
        ...(userId ? { requestedBy: userId } : {}),
      }),
      TranslationMemory.countDocuments({ isActive: true }),
      Glossary.countDocuments({ isActive: true }),
      TranslationJob.aggregate([
        { $match: { status: 'completed' } },
        {
          $group: {
            _id: '$targetLanguage',
            count: { $sum: 1 },
            totalWords: { $sum: '$wordCount' },
          },
        },
        { $sort: { count: -1 } },
      ]),
    ]);

    const avgQuality = await TranslationJob.aggregate([
      { $match: { status: 'completed', qualityScore: { $gt: 0 } } },
      { $group: { _id: null, avg: { $avg: '$qualityScore' } } },
    ]);

    return {
      success: true,
      totalJobs,
      completedJobs,
      pendingJobs: totalJobs - completedJobs,
      tmEntries,
      glossaries,
      averageQuality: Math.round(avgQuality[0]?.avg || 0),
      languageStats: langStats,
      supportedLanguages: Object.keys(LANGUAGES).length,
    };
  }
}

module.exports = new DocumentTranslationService();
