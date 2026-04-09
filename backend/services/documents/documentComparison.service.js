/**
 * Document Comparison Service — خدمة مقارنة المستندات
 * ──────────────────────────────────────────────────────────────
 * مقارنة بصرية بين إصدارات المستندات، كشف التغييرات،
 * تقارير الاختلافات، دمج التعديلات
 *
 * @module documentComparison.service
 */

const mongoose = require('mongoose');
const crypto = require('crypto');

/* ─── Comparison Result Model ────────────────────────────────── */
const comparisonSchema = new mongoose.Schema(
  {
    sourceDocument: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true },
    targetDocument: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true },
    sourceVersion: String,
    targetVersion: String,
    type: {
      type: String,
      enum: ['version', 'document', 'content', 'metadata', 'full'],
      default: 'full',
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
    },
    result: {
      similarity: { type: Number, min: 0, max: 100 },
      totalChanges: Number,
      additions: Number,
      deletions: Number,
      modifications: Number,
      unchangedSections: Number,
      diffs: [
        {
          section: String,
          field: String,
          type: { type: String, enum: ['added', 'deleted', 'modified', 'moved', 'unchanged'] },
          oldValue: mongoose.Schema.Types.Mixed,
          newValue: mongoose.Schema.Types.Mixed,
          position: { start: Number, end: Number },
          severity: { type: String, enum: ['critical', 'major', 'minor', 'cosmetic'] },
        },
      ],
      metadataChanges: [
        {
          field: String,
          fieldAr: String,
          oldValue: mongoose.Schema.Types.Mixed,
          newValue: mongoose.Schema.Types.Mixed,
        },
      ],
      summary: String,
      summaryAr: String,
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    processingTime: Number,
  },
  { timestamps: true, collection: 'document_comparisons' }
);

comparisonSchema.index({ sourceDocument: 1, targetDocument: 1 });
comparisonSchema.index({ createdBy: 1, createdAt: -1 });

const Comparison =
  mongoose.models.DocumentComparison || mongoose.model('DocumentComparison', comparisonSchema);

/* ─── Metadata Field Labels (Arabic) ────────────────────────── */
const FIELD_LABELS = {
  title: 'العنوان',
  name: 'الاسم',
  description: 'الوصف',
  status: 'الحالة',
  category: 'التصنيف',
  priority: 'الأولوية',
  tags: 'الوسوم',
  fileSize: 'حجم الملف',
  mimeType: 'نوع الملف',
  version: 'الإصدار',
  department: 'القسم',
  assignedTo: 'مُسند إلى',
  dueDate: 'تاريخ الاستحقاق',
  confidentiality: 'السرية',
  workflowStatus: 'حالة سير العمل',
};

/* ─── Service ────────────────────────────────────────────────── */
class DocumentComparisonService {
  constructor() {
    this.maxContentLength = 500000; // 500KB max for comparison
  }

  /* ── Compare Two Documents ────────────────────────────────── */
  async compare(sourceId, targetId, options = {}) {
    const { type = 'full', userId } = options;
    const startTime = Date.now();

    // Create comparison record
    const comparison = new Comparison({
      sourceDocument: sourceId,
      targetDocument: targetId,
      type,
      status: 'processing',
      createdBy: userId,
    });
    await comparison.save();

    try {
      const Document = mongoose.model('Document');
      const [source, target] = await Promise.all([
        Document.findById(sourceId).lean(),
        Document.findById(targetId).lean(),
      ]);

      if (!source || !target) {
        comparison.status = 'failed';
        await comparison.save();
        return { success: false, error: 'أحد المستندات غير موجود' };
      }

      let result;
      switch (type) {
        case 'content':
          result = this._compareContent(source, target);
          break;
        case 'metadata':
          result = this._compareMetadata(source, target);
          break;
        case 'version':
          result = this._compareVersions(source, target);
          break;
        default:
          result = this._compareFull(source, target);
      }

      comparison.result = result;
      comparison.status = 'completed';
      comparison.processingTime = Date.now() - startTime;
      comparison.sourceVersion = source.version || '1.0';
      comparison.targetVersion = target.version || '1.0';
      await comparison.save();

      return { success: true, comparison };
    } catch (err) {
      comparison.status = 'failed';
      await comparison.save();
      throw err;
    }
  }

  /* ── Full Comparison ──────────────────────────────────────── */
  _compareFull(source, target) {
    const contentDiffs = this._compareContent(source, target);
    const metaResult = this._compareMetadata(source, target);

    const totalChanges = contentDiffs.totalChanges + metaResult.metadataChanges.length;
    const similarity = this._calculateSimilarity(source, target);

    return {
      similarity,
      totalChanges,
      additions: contentDiffs.additions,
      deletions: contentDiffs.deletions,
      modifications: contentDiffs.modifications + metaResult.metadataChanges.length,
      unchangedSections: contentDiffs.unchangedSections,
      diffs: contentDiffs.diffs,
      metadataChanges: metaResult.metadataChanges,
      summary: `Found ${totalChanges} changes with ${similarity.toFixed(1)}% similarity`,
      summaryAr: `تم العثور على ${totalChanges} تغيير بنسبة تشابه ${similarity.toFixed(1)}%`,
    };
  }

  /* ── Content Comparison (LCS-based diff) ──────────────────── */
  _compareContent(source, target) {
    const srcText = this._extractText(source);
    const tgtText = this._extractText(target);

    const srcLines = srcText.split('\n').filter(Boolean);
    const tgtLines = tgtText.split('\n').filter(Boolean);

    const diffs = [];
    let additions = 0,
      deletions = 0,
      modifications = 0,
      unchanged = 0;

    // LCS-based diff algorithm
    const lcs = this._computeLCS(srcLines, tgtLines);
    let si = 0,
      ti = 0,
      li = 0;

    while (si < srcLines.length || ti < tgtLines.length) {
      if (li < lcs.length && si < srcLines.length && srcLines[si] === lcs[li]) {
        if (ti < tgtLines.length && tgtLines[ti] === lcs[li]) {
          unchanged++;
          si++;
          ti++;
          li++;
        } else {
          diffs.push({
            section: `سطر ${ti + 1}`,
            field: 'content',
            type: 'added',
            newValue: tgtLines[ti],
            position: { start: ti, end: ti },
            severity: 'minor',
          });
          additions++;
          ti++;
        }
      } else if (si < srcLines.length) {
        if (ti < tgtLines.length && (li >= lcs.length || tgtLines[ti] !== lcs[li])) {
          // Modified line
          const sim = this._lineSimilarity(srcLines[si], tgtLines[ti]);
          if (sim > 0.5) {
            diffs.push({
              section: `سطر ${si + 1}`,
              field: 'content',
              type: 'modified',
              oldValue: srcLines[si],
              newValue: tgtLines[ti],
              position: { start: si, end: si },
              severity: sim > 0.8 ? 'cosmetic' : 'minor',
            });
            modifications++;
            si++;
            ti++;
          } else {
            diffs.push({
              section: `سطر ${si + 1}`,
              field: 'content',
              type: 'deleted',
              oldValue: srcLines[si],
              position: { start: si, end: si },
              severity: 'major',
            });
            deletions++;
            si++;
          }
        } else {
          diffs.push({
            section: `سطر ${si + 1}`,
            field: 'content',
            type: 'deleted',
            oldValue: srcLines[si],
            position: { start: si, end: si },
            severity: 'major',
          });
          deletions++;
          si++;
        }
      } else if (ti < tgtLines.length) {
        diffs.push({
          section: `سطر ${ti + 1}`,
          field: 'content',
          type: 'added',
          newValue: tgtLines[ti],
          position: { start: ti, end: ti },
          severity: 'minor',
        });
        additions++;
        ti++;
      }
    }

    return {
      totalChanges: additions + deletions + modifications,
      additions,
      deletions,
      modifications,
      unchangedSections: unchanged,
      diffs,
    };
  }

  /* ── Metadata Comparison ──────────────────────────────────── */
  _compareMetadata(source, target) {
    const fields = Object.keys(FIELD_LABELS);
    const changes = [];

    for (const field of fields) {
      const srcVal = source[field];
      const tgtVal = target[field];

      if (JSON.stringify(srcVal) !== JSON.stringify(tgtVal)) {
        changes.push({
          field,
          fieldAr: FIELD_LABELS[field],
          oldValue: srcVal,
          newValue: tgtVal,
        });
      }
    }

    return { metadataChanges: changes };
  }

  /* ── Version Comparison ───────────────────────────────────── */
  _compareVersions(source, target) {
    const result = this._compareFull(source, target);
    result.versionInfo = {
      sourceVersion: source.version || '1.0',
      targetVersion: target.version || '1.0',
      sourceUpdated: source.updatedAt,
      targetUpdated: target.updatedAt,
      timeDiff: Math.abs(new Date(target.updatedAt) - new Date(source.updatedAt)),
    };
    return result;
  }

  /* ── Compute LCS ──────────────────────────────────────────── */
  _computeLCS(a, b) {
    const m = a.length,
      n = b.length;
    const maxLen = 1000; // Limit for performance
    if (m > maxLen || n > maxLen) {
      return this._simpleLCS(a.slice(0, maxLen), b.slice(0, maxLen));
    }

    const dp = Array(m + 1)
      .fill(null)
      .map(() => Array(n + 1).fill(0));
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        dp[i][j] =
          a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }

    // Backtrack
    const lcs = [];
    let i = m,
      j = n;
    while (i > 0 && j > 0) {
      if (a[i - 1] === b[j - 1]) {
        lcs.unshift(a[i - 1]);
        i--;
        j--;
      } else if (dp[i - 1][j] > dp[i][j - 1]) i--;
      else j--;
    }
    return lcs;
  }

  _simpleLCS(a, b) {
    const result = [];
    let bi = 0;
    for (const item of a) {
      const idx = b.indexOf(item, bi);
      if (idx >= 0) {
        result.push(item);
        bi = idx + 1;
      }
    }
    return result;
  }

  /* ── Calculate Similarity ─────────────────────────────────── */
  _calculateSimilarity(source, target) {
    const srcText = this._extractText(source);
    const tgtText = this._extractText(target);

    if (!srcText && !tgtText) return 100;
    if (!srcText || !tgtText) return 0;

    // Jaccard similarity on word sets
    const srcWords = new Set(srcText.toLowerCase().split(/\s+/));
    const tgtWords = new Set(tgtText.toLowerCase().split(/\s+/));

    const intersection = new Set([...srcWords].filter(w => tgtWords.has(w)));
    const union = new Set([...srcWords, ...tgtWords]);

    return union.size > 0 ? (intersection.size / union.size) * 100 : 0;
  }

  _lineSimilarity(a, b) {
    if (a === b) return 1;
    const maxLen = Math.max(a.length, b.length);
    if (maxLen === 0) return 1;
    let common = 0;
    const shorter = a.length < b.length ? a : b;
    const longer = a.length < b.length ? b : a;
    for (const char of shorter) {
      if (longer.includes(char)) common++;
    }
    return common / maxLen;
  }

  _extractText(doc) {
    return [doc.title, doc.name, doc.description, doc.content, doc.textContent]
      .filter(Boolean)
      .join('\n');
  }

  /* ── Get Comparison History ───────────────────────────────── */
  async getHistory(options = {}) {
    const { documentId, userId, page = 1, limit = 20 } = options;
    const filter = {};
    if (documentId) filter.$or = [{ sourceDocument: documentId }, { targetDocument: documentId }];
    if (userId) filter.createdBy = userId;

    const [comparisons, total] = await Promise.all([
      Comparison.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('sourceDocument', 'title name')
        .populate('targetDocument', 'title name')
        .populate('createdBy', 'name')
        .lean(),
      Comparison.countDocuments(filter),
    ]);

    return { success: true, comparisons, total, page, limit };
  }

  /* ── Get Single Comparison ────────────────────────────────── */
  async getById(comparisonId) {
    const comparison = await Comparison.findById(comparisonId)
      .populate('sourceDocument', 'title name description version')
      .populate('targetDocument', 'title name description version')
      .populate('createdBy', 'name')
      .lean();

    if (!comparison) return { success: false, error: 'المقارنة غير موجودة' };
    return { success: true, comparison };
  }

  /* ── Quick Compare (without saving) ───────────────────────── */
  async quickCompare(sourceId, targetId) {
    const Document = mongoose.model('Document');
    const [source, target] = await Promise.all([
      Document.findById(sourceId).lean(),
      Document.findById(targetId).lean(),
    ]);

    if (!source || !target) return { success: false, error: 'مستند غير موجود' };

    const similarity = this._calculateSimilarity(source, target);
    const metaResult = this._compareMetadata(source, target);

    return {
      success: true,
      quick: {
        similarity: similarity.toFixed(1),
        metadataChanges: metaResult.metadataChanges.length,
        sameType: source.mimeType === target.mimeType,
        sizeDiff: Math.abs((source.fileSize || 0) - (target.fileSize || 0)),
      },
    };
  }

  /* ── Batch Compare ────────────────────────────────────────── */
  async batchCompare(baseDocumentId, compareDocumentIds, options = {}) {
    const results = [];
    for (const targetId of compareDocumentIds) {
      try {
        const result = await this.compare(baseDocumentId, targetId, options);
        results.push({
          targetId,
          success: true,
          similarity: result.comparison?.result?.similarity,
        });
      } catch (err) {
        results.push({ targetId, success: false, error: err.message });
      }
    }

    return {
      success: true,
      results,
      baseDocument: baseDocumentId,
      compared: results.filter(r => r.success).length,
    };
  }

  /* ── Statistics ───────────────────────────────────────────── */
  async getStats() {
    const [total, avgSimilarity, byType] = await Promise.all([
      Comparison.countDocuments({ status: 'completed' }),
      Comparison.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, avg: { $avg: '$result.similarity' } } },
      ]),
      Comparison.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: '$type', count: { $sum: 1 }, avgSim: { $avg: '$result.similarity' } } },
      ]),
    ]);

    return {
      success: true,
      stats: {
        total,
        averageSimilarity: avgSimilarity[0]?.avg?.toFixed(1) || 0,
        byType: byType.reduce(
          (a, t) => ({ ...a, [t._id]: { count: t.count, avgSimilarity: t.avgSim?.toFixed(1) } }),
          {}
        ),
      },
    };
  }
}

module.exports = new DocumentComparisonService();
