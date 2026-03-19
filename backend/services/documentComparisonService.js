/**
 * Document Comparison Service — خدمة مقارنة المستندات
 *
 * Features:
 * - Side-by-side document comparison
 * - Inline diff highlighting
 * - Version-to-version comparison
 * - Structural comparison (metadata, properties)
 * - Comparison reports
 */

const crypto = require('crypto');

class DocumentComparisonService {
  constructor() {
    this.comparisonHistory = [];
  }

  /**
   * Compare two documents or versions — مقارنة مستندين
   */
  async compare(docA, docB) {
    const comparison = {
      id: `cmp_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      documentA: {
        id: docA.id,
        title: docA.title || '',
        version: docA.version || 1,
      },
      documentB: {
        id: docB.id,
        title: docB.title || '',
        version: docB.version || 1,
      },
      createdAt: new Date(),
    };

    // Metadata comparison
    comparison.metadataDiff = this._compareMetadata(docA, docB);

    // Content comparison (text-based)
    if (docA.content && docB.content) {
      comparison.contentDiff = this._compareContent(
        typeof docA.content === 'string' ? docA.content : JSON.stringify(docA.content),
        typeof docB.content === 'string' ? docB.content : JSON.stringify(docB.content)
      );
    }

    // Tags comparison
    comparison.tagsDiff = this._compareTags(docA.tags || [], docB.tags || []);

    // File hash comparison
    comparison.hashMatch = docA.hash && docB.hash ? docA.hash === docB.hash : null;

    // Summary
    comparison.summary = this._generateSummary(comparison);

    this.comparisonHistory.push(comparison);

    return { success: true, data: comparison };
  }

  /**
   * Compare metadata — مقارنة البيانات الوصفية
   */
  _compareMetadata(docA, docB) {
    const fields = [
      'title',
      'description',
      'category',
      'status',
      'fileSize',
      'mimeType',
      'isPublic',
      'folder',
      'approvalStatus',
    ];

    const diff = [];

    fields.forEach(field => {
      const valueA = docA[field];
      const valueB = docB[field];

      if (JSON.stringify(valueA) !== JSON.stringify(valueB)) {
        diff.push({
          field,
          fieldAr: this._getFieldNameAr(field),
          valueA: valueA ?? 'غير محدد',
          valueB: valueB ?? 'غير محدد',
          changed: true,
        });
      } else {
        diff.push({
          field,
          fieldAr: this._getFieldNameAr(field),
          valueA: valueA ?? 'غير محدد',
          valueB: valueB ?? 'غير محدد',
          changed: false,
        });
      }
    });

    return {
      total: diff.length,
      changed: diff.filter(d => d.changed).length,
      unchanged: diff.filter(d => !d.changed).length,
      details: diff,
    };
  }

  /**
   * Get Arabic field name
   */
  _getFieldNameAr(field) {
    const map = {
      title: 'العنوان',
      description: 'الوصف',
      category: 'التصنيف',
      status: 'الحالة',
      fileSize: 'حجم الملف',
      mimeType: 'نوع الملف',
      isPublic: 'عام',
      folder: 'المجلد',
      approvalStatus: 'حالة الموافقة',
    };
    return map[field] || field;
  }

  /**
   * Compare text content (line-by-line diff) — مقارنة المحتوى النصي
   */
  _compareContent(textA, textB) {
    const linesA = textA.split('\n');
    const linesB = textB.split('\n');

    const diff = [];
    const maxLines = Math.max(linesA.length, linesB.length);

    let added = 0,
      removed = 0,
      modified = 0,
      unchanged = 0;

    for (let i = 0; i < maxLines; i++) {
      const lineA = linesA[i];
      const lineB = linesB[i];

      if (lineA === undefined) {
        diff.push({ lineNumber: i + 1, type: 'added', content: lineB });
        added++;
      } else if (lineB === undefined) {
        diff.push({ lineNumber: i + 1, type: 'removed', content: lineA });
        removed++;
      } else if (lineA !== lineB) {
        diff.push({
          lineNumber: i + 1,
          type: 'modified',
          contentA: lineA,
          contentB: lineB,
          charDiff: this._compareChars(lineA, lineB),
        });
        modified++;
      } else {
        diff.push({ lineNumber: i + 1, type: 'unchanged', content: lineA });
        unchanged++;
      }
    }

    return {
      totalLinesA: linesA.length,
      totalLinesB: linesB.length,
      added,
      removed,
      modified,
      unchanged,
      changePercentage:
        maxLines > 0 ? Math.round(((added + removed + modified) / maxLines) * 100) : 0,
      details: diff,
    };
  }

  /**
   * Character-level diff for modified lines
   */
  _compareChars(strA, strB) {
    const changes = [];
    const maxLen = Math.max(strA.length, strB.length);

    let currentChange = null;

    for (let i = 0; i < maxLen; i++) {
      const charA = strA[i];
      const charB = strB[i];
      const isDiff = charA !== charB;

      if (isDiff && !currentChange) {
        currentChange = {
          start: i,
          type: charA === undefined ? 'added' : charB === undefined ? 'removed' : 'modified',
        };
      } else if (!isDiff && currentChange) {
        currentChange.end = i;
        currentChange.length = i - currentChange.start;
        changes.push(currentChange);
        currentChange = null;
      }
    }

    if (currentChange) {
      currentChange.end = maxLen;
      currentChange.length = maxLen - currentChange.start;
      changes.push(currentChange);
    }

    return changes;
  }

  /**
   * Compare tags — مقارنة الوسوم
   */
  _compareTags(tagsA, tagsB) {
    const setA = new Set(tagsA);
    const setB = new Set(tagsB);

    const added = tagsB.filter(t => !setA.has(t));
    const removed = tagsA.filter(t => !setB.has(t));
    const common = tagsA.filter(t => setB.has(t));

    return { added, removed, common };
  }

  /**
   * Generate comparison summary — ملخص المقارنة
   */
  _generateSummary(comparison) {
    const metaChanged = comparison.metadataDiff.changed;
    const contentChangePct = comparison.contentDiff?.changePercentage || 0;
    const tagsChanged = comparison.tagsDiff.added.length + comparison.tagsDiff.removed.length > 0;

    let similarity;
    if (comparison.hashMatch === true) {
      similarity = 100;
    } else if (comparison.contentDiff) {
      similarity = 100 - contentChangePct;
    } else {
      const metaTotal = comparison.metadataDiff.total;
      const metaUnchanged = comparison.metadataDiff.unchanged;
      similarity = metaTotal > 0 ? Math.round((metaUnchanged / metaTotal) * 100) : 0;
    }

    return {
      similarity,
      identical: comparison.hashMatch === true,
      metadataChanges: metaChanged,
      contentChangePercentage: contentChangePct,
      tagsChanged,
      overallAssessment:
        similarity === 100
          ? 'متطابق تماماً'
          : similarity >= 90
            ? 'تغييرات طفيفة'
            : similarity >= 70
              ? 'تغييرات معتدلة'
              : similarity >= 50
                ? 'تغييرات كبيرة'
                : 'مختلف بشكل كبير',
    };
  }

  /**
   * Get comparison history — سجل المقارنات
   */
  async getHistory(filters = {}) {
    let history = [...this.comparisonHistory];

    if (filters.documentId) {
      history = history.filter(
        c => c.documentA.id === filters.documentId || c.documentB.id === filters.documentId
      );
    }

    history.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 20;
    const start = (page - 1) * limit;

    return {
      success: true,
      data: history.slice(start, start + limit),
      total: history.length,
    };
  }

  /**
   * Batch compare multiple versions — مقارنة إصدارات متعددة
   */
  async batchCompare(versions) {
    if (!versions || versions.length < 2) {
      return { success: false, message: 'يجب تقديم إصدارين على الأقل للمقارنة' };
    }

    const comparisons = [];
    for (let i = 1; i < versions.length; i++) {
      const result = await this.compare(versions[i - 1], versions[i]);
      comparisons.push({
        fromVersion: versions[i - 1].version || i,
        toVersion: versions[i].version || i + 1,
        comparison: result.data,
      });
    }

    return {
      success: true,
      data: comparisons,
      summary: {
        totalComparisons: comparisons.length,
        versions: versions.length,
      },
    };
  }
}

module.exports = new DocumentComparisonService();
