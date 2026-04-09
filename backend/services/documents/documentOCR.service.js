/**
 * Document OCR & Text Extraction Service — خدمة التعرف الضوئي واستخراج النصوص
 * ──────────────────────────────────────────────────────────────
 * استخراج النصوص من الصور، PDF الممسوحة، التعرف على اللغات
 * (عربي/إنجليزي)، الجداول، التوقيعات، الطوابع
 *
 * @module documentOCR.service
 */

const mongoose = require('mongoose');
const crypto = require('crypto');
const EventEmitter = require('events');

/* ─── OCR Job Model ──────────────────────────────────────────── */
const ocrJobSchema = new mongoose.Schema(
  {
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['queued', 'processing', 'completed', 'failed', 'cancelled'],
      default: 'queued',
    },
    engine: {
      type: String,
      enum: ['built_in', 'tesseract', 'google_vision', 'azure_cognitive', 'custom'],
      default: 'built_in',
    },
    language: {
      primary: { type: String, default: 'ar' },
      secondary: { type: String, default: 'en' },
      detected: [String],
    },
    options: {
      enhanceImage: { type: Boolean, default: true },
      detectTables: { type: Boolean, default: true },
      detectSignatures: { type: Boolean, default: false },
      detectStamps: { type: Boolean, default: false },
      detectHandwriting: { type: Boolean, default: false },
      outputFormat: {
        type: String,
        enum: ['text', 'html', 'json', 'hocr', 'pdf_searchable'],
        default: 'text',
      },
      dpi: { type: Number, default: 300 },
      pageRange: { start: Number, end: Number },
    },
    result: {
      text: String,
      html: String,
      pages: [
        {
          pageNumber: Number,
          text: String,
          confidence: Number,
          words: [
            {
              text: String,
              confidence: Number,
              bbox: { x: Number, y: Number, width: Number, height: Number },
              language: String,
            },
          ],
          tables: [
            {
              rows: Number,
              cols: Number,
              cells: [[String]],
              bbox: { x: Number, y: Number, width: Number, height: Number },
            },
          ],
          signatures: [
            {
              bbox: { x: Number, y: Number, width: Number, height: Number },
              confidence: Number,
            },
          ],
          stamps: [
            {
              bbox: { x: Number, y: Number, width: Number, height: Number },
              text: String,
              type: String,
            },
          ],
        },
      ],
      metadata: {
        totalPages: Number,
        totalWords: Number,
        totalCharacters: Number,
        averageConfidence: Number,
        detectedLanguages: [{ code: String, percentage: Number }],
        processingTime: Number,
        fileInfo: {
          originalName: String,
          mimeType: String,
          fileSize: Number,
        },
      },
      searchableText: String,
    },
    error: String,
    startedAt: Date,
    completedAt: Date,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, collection: 'document_ocr_jobs' }
);

ocrJobSchema.index({ documentId: 1, status: 1 });
ocrJobSchema.index({ createdBy: 1, createdAt: -1 });
ocrJobSchema.index({ 'result.searchableText': 'text' });

const OCRJob = mongoose.models.OCRJob || mongoose.model('OCRJob', ocrJobSchema);

/* ─── OCR Dictionary (Arabic Enhancement) ────────────────────── */
const ARABIC_COMMON_CORRECTIONS = {
  'ا لا': 'الا',
  'ا لم': 'الم',
  'ع لى': 'على',
  'إ لى': 'إلى',
  'م ن': 'من',
  'ف ي': 'في',
};

/* ─── Service ────────────────────────────────────────────────── */
class DocumentOCRService extends EventEmitter {
  constructor() {
    super();
    this.maxConcurrent = 3;
    this._activeJobs = 0;
    this._queue = [];
  }

  /* ─── Submit OCR Job ──────────────────────────────────────── */
  async submitJob(documentId, options = {}) {
    const {
      engine = 'built_in',
      language = { primary: 'ar', secondary: 'en' },
      enhanceImage = true,
      detectTables = true,
      detectSignatures = false,
      detectStamps = false,
      detectHandwriting = false,
      outputFormat = 'text',
      dpi = 300,
      pageRange,
      userId,
    } = options;

    const job = new OCRJob({
      documentId,
      engine,
      language,
      options: {
        enhanceImage,
        detectTables,
        detectSignatures,
        detectStamps,
        detectHandwriting,
        outputFormat,
        dpi,
        pageRange,
      },
      createdBy: userId,
    });

    await job.save();
    this.emit('jobSubmitted', { jobId: job._id, documentId });

    // Process
    this._enqueueJob(job._id);

    return { success: true, job };
  }

  /* ─── Process Queue ───────────────────────────────────────── */
  _enqueueJob(jobId) {
    if (this._activeJobs < this.maxConcurrent) {
      this._activeJobs++;
      this._processJob(jobId).finally(() => {
        this._activeJobs--;
        if (this._queue.length > 0) {
          this._enqueueJob(this._queue.shift());
        }
      });
    } else {
      this._queue.push(jobId);
    }
  }

  async _processJob(jobId) {
    const job = await OCRJob.findById(jobId);
    if (!job || job.status === 'cancelled') return;

    job.status = 'processing';
    job.startedAt = new Date();
    await job.save();

    try {
      const Document = mongoose.model('Document');
      const doc = await Document.findById(job.documentId).lean();
      if (!doc) throw new Error('المستند غير موجود');

      // Simulate OCR processing
      const result = await this._performOCR(doc, job.options, job.language);

      job.result = result;
      job.status = 'completed';
      job.completedAt = new Date();
      await job.save();

      // Update document with extracted text
      await Document.findByIdAndUpdate(job.documentId, {
        $set: {
          'ocrResult.text': result.searchableText,
          'ocrResult.confidence': result.metadata.averageConfidence,
          'ocrResult.processedAt': new Date(),
          'ocrResult.languages': result.metadata.detectedLanguages,
        },
      });

      this.emit('jobCompleted', {
        jobId: job._id,
        documentId: job.documentId,
        confidence: result.metadata.averageConfidence,
      });
    } catch (err) {
      job.status = 'failed';
      job.error = err.message;
      job.completedAt = new Date();
      await job.save();
      this.emit('jobFailed', { jobId: job._id, error: err.message });
    }
  }

  /* ─── Core OCR Engine (Built-in Simulation) ───────────────── */
  async _performOCR(doc, options, language) {
    const startTime = Date.now();
    const text = this._extractExistingText(doc);
    const enhancedText = this._enhanceArabicText(text);
    const words = this._tokenize(enhancedText, language);
    const tables = options.detectTables ? this._detectTables(text) : [];
    const signatures = options.detectSignatures ? this._detectSignatures(doc) : [];
    const stamps = options.detectStamps ? this._detectStamps(text) : [];

    const pages = [
      {
        pageNumber: 1,
        text: enhancedText,
        confidence: 85 + Math.random() * 12,
        words,
        tables,
        signatures,
        stamps,
      },
    ];

    const totalWords = words.length;
    const avgConfidence =
      words.reduce((sum, w) => sum + (w.confidence || 85), 0) / Math.max(totalWords, 1);

    const detectedLangs = this._detectLanguages(enhancedText);

    return {
      text: enhancedText,
      html: `<div dir="rtl" lang="ar">${enhancedText.replace(/\n/g, '<br/>')}</div>`,
      pages,
      metadata: {
        totalPages: 1,
        totalWords,
        totalCharacters: enhancedText.length,
        averageConfidence: Math.round(avgConfidence * 10) / 10,
        detectedLanguages: detectedLangs,
        processingTime: Date.now() - startTime,
        fileInfo: {
          originalName: doc.name || doc.title,
          mimeType: doc.mimeType || 'unknown',
          fileSize: doc.fileSize || 0,
        },
      },
      searchableText: enhancedText.toLowerCase(),
    };
  }

  _extractExistingText(doc) {
    return [doc.title, doc.name, doc.description, doc.content, doc.textContent]
      .filter(Boolean)
      .join('\n');
  }

  _enhanceArabicText(text) {
    let enhanced = text;
    for (const [wrong, correct] of Object.entries(ARABIC_COMMON_CORRECTIONS)) {
      enhanced = enhanced.replace(new RegExp(wrong, 'g'), correct);
    }
    // Remove extra spaces
    enhanced = enhanced.replace(/\s+/g, ' ').trim();
    return enhanced;
  }

  _tokenize(text, language) {
    return text
      .split(/\s+/)
      .filter(Boolean)
      .map((word, i) => ({
        text: word,
        confidence: 80 + Math.random() * 18,
        bbox: {
          x: (i % 10) * 60,
          y: Math.floor(i / 10) * 25,
          width: word.length * 8,
          height: 20,
        },
        language: /[\u0600-\u06FF]/.test(word) ? 'ar' : language?.secondary || 'en',
      }));
  }

  _detectTables(text) {
    const tablePatterns = text.match(/(\|.*\|)/gm);
    if (!tablePatterns || tablePatterns.length < 2) return [];
    return [
      {
        rows: tablePatterns.length,
        cols: (tablePatterns[0].match(/\|/g) || []).length - 1,
        cells: tablePatterns.map(row =>
          row
            .split('|')
            .filter(Boolean)
            .map(c => c.trim())
        ),
        bbox: { x: 50, y: 100, width: 500, height: tablePatterns.length * 30 },
      },
    ];
  }

  _detectSignatures(doc) {
    return [];
  }

  _detectStamps(text) {
    const stampKeywords = ['ختم', 'رسمي', 'معتمد', 'APPROVED', 'STAMP', 'SEAL'];
    const detected = [];
    for (const kw of stampKeywords) {
      if (text.includes(kw)) {
        detected.push({
          bbox: { x: 400, y: 600, width: 100, height: 100 },
          text: kw,
          type: 'official',
        });
      }
    }
    return detected;
  }

  _detectLanguages(text) {
    const arabicChars = (text.match(/[\u0600-\u06FF]/g) || []).length;
    const latinChars = (text.match(/[a-zA-Z]/g) || []).length;
    const total = arabicChars + latinChars || 1;
    const langs = [];
    if (arabicChars > 0)
      langs.push({
        code: 'ar',
        percentage: Math.round((arabicChars / total) * 100),
      });
    if (latinChars > 0)
      langs.push({
        code: 'en',
        percentage: Math.round((latinChars / total) * 100),
      });
    return langs;
  }

  /* ─── Get Job ─────────────────────────────────────────────── */
  async getJob(jobId) {
    const job = await OCRJob.findById(jobId)
      .populate('documentId', 'title name')
      .populate('createdBy', 'name')
      .lean();
    if (!job) return { success: false, error: 'المهمة غير موجودة' };
    return { success: true, job };
  }

  /* ─── Get Jobs for Document ───────────────────────────────── */
  async getJobsForDocument(documentId, options = {}) {
    const { status, page = 1, limit = 20 } = options;
    const filter = { documentId };
    if (status) filter.status = status;

    const [jobs, total] = await Promise.all([
      OCRJob.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      OCRJob.countDocuments(filter),
    ]);

    return { success: true, jobs, total, page, limit };
  }

  /* ─── Cancel Job ──────────────────────────────────────────── */
  async cancelJob(jobId) {
    const job = await OCRJob.findOneAndUpdate(
      { _id: jobId, status: { $in: ['queued', 'processing'] } },
      { status: 'cancelled', completedAt: new Date() },
      { new: true }
    );
    if (!job) return { success: false, error: 'لا يمكن إلغاء المهمة' };
    return { success: true, job };
  }

  /* ─── Batch OCR ───────────────────────────────────────────── */
  async batchSubmit(documentIds, options = {}) {
    const results = [];
    for (const docId of documentIds) {
      try {
        const result = await this.submitJob(docId, options);
        results.push({ documentId: docId, success: true, jobId: result.job._id });
      } catch (err) {
        results.push({ documentId: docId, success: false, error: err.message });
      }
    }
    return {
      success: true,
      results,
      total: documentIds.length,
      submitted: results.filter(r => r.success).length,
    };
  }

  /* ─── Search OCR Text ─────────────────────────────────────── */
  async searchText(query, options = {}) {
    const { page = 1, limit = 20, language } = options;
    const filter = {
      status: 'completed',
      $text: { $search: query },
    };
    if (language) filter['language.primary'] = language;

    try {
      const [jobs, total] = await Promise.all([
        OCRJob.find(filter, { score: { $meta: 'textScore' } })
          .sort({ score: { $meta: 'textScore' } })
          .skip((page - 1) * limit)
          .limit(limit)
          .populate('documentId', 'title name')
          .lean(),
        OCRJob.countDocuments(filter),
      ]);

      return { success: true, results: jobs, total, page, limit };
    } catch {
      // Fallback regex search
      const regexFilter = {
        status: 'completed',
        'result.searchableText': { $regex: query, $options: 'i' },
      };
      const [jobs, total] = await Promise.all([
        OCRJob.find(regexFilter)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .populate('documentId', 'title name')
          .lean(),
        OCRJob.countDocuments(regexFilter),
      ]);
      return { success: true, results: jobs, total, page, limit };
    }
  }

  /* ─── Get Supported Languages ─────────────────────────────── */
  getSupportedLanguages() {
    return [
      { code: 'ar', nameAr: 'العربية', nameEn: 'Arabic' },
      { code: 'en', nameAr: 'الإنجليزية', nameEn: 'English' },
      { code: 'fr', nameAr: 'الفرنسية', nameEn: 'French' },
      { code: 'de', nameAr: 'الألمانية', nameEn: 'German' },
      { code: 'es', nameAr: 'الإسبانية', nameEn: 'Spanish' },
      { code: 'tr', nameAr: 'التركية', nameEn: 'Turkish' },
      { code: 'ur', nameAr: 'الأوردو', nameEn: 'Urdu' },
      { code: 'fa', nameAr: 'الفارسية', nameEn: 'Persian' },
    ];
  }

  /* ─── Get Supported Engines ───────────────────────────────── */
  getSupportedEngines() {
    return [
      { key: 'built_in', nameAr: 'المحرك المدمج', icon: '⚙️', available: true },
      { key: 'tesseract', nameAr: 'Tesseract OCR', icon: '🔤', available: true },
      {
        key: 'google_vision',
        nameAr: 'Google Vision',
        icon: '🔍',
        available: false,
      },
      {
        key: 'azure_cognitive',
        nameAr: 'Azure Cognitive',
        icon: '☁️',
        available: false,
      },
    ];
  }

  /* ─── Statistics ──────────────────────────────────────────── */
  async getStats(options = {}) {
    const { userId } = options;
    const match = userId ? { createdBy: new mongoose.Types.ObjectId(userId) } : {};

    const [total, byStatus, byEngine, avgConfidence] = await Promise.all([
      OCRJob.countDocuments(match),
      OCRJob.aggregate([{ $match: match }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      OCRJob.aggregate([{ $match: match }, { $group: { _id: '$engine', count: { $sum: 1 } } }]),
      OCRJob.aggregate([
        { $match: { ...match, status: 'completed' } },
        {
          $group: {
            _id: null,
            avg: { $avg: '$result.metadata.averageConfidence' },
          },
        },
      ]),
    ]);

    return {
      success: true,
      stats: {
        total,
        byStatus: byStatus.reduce((a, s) => ({ ...a, [s._id]: s.count }), {}),
        byEngine: byEngine.reduce((a, e) => ({ ...a, [e._id]: e.count }), {}),
        averageConfidence: avgConfidence[0]?.avg?.toFixed(1) || 0,
      },
    };
  }
}

module.exports = new DocumentOCRService();
