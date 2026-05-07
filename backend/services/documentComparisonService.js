'use strict';

/**
 * documentComparisonService — in-memory singleton
 * Flat-path barrel for document comparison operations.
 */

const { randomUUID } = require('crypto');

const FIELD_NAMES_AR = {
  title: 'العنوان',
  category: 'التصنيف',
  fileSize: 'حجم الملف',
  status: 'الحالة',
  version: 'الإصدار',
  fileType: 'نوع الملف',
  department: 'القسم',
  language: 'اللغة',
  priority: 'الأولوية',
};

const METADATA_FIELDS = Object.keys(FIELD_NAMES_AR);

class DocumentComparisonService {
  constructor() {
    this.comparisonHistory = [];
  }

  // ── compare ────────────────────────────────────────────────────────────────
  async compare(docA, docB) {
    let hashMatch = null;
    if (docA.hash != null && docB.hash != null) {
      hashMatch = docA.hash === docB.hash;
    }

    const metadataDiff = this._compareMetadata(docA, docB);
    const tagsDiff = this._compareTags(docA.tags || [], docB.tags || []);

    let contentDiff;
    if (docA.content != null && docB.content != null) {
      contentDiff = this._compareContent(docA.content, docB.content);
    }

    const summary = this._generateSummary({ hashMatch, metadataDiff, tagsDiff, contentDiff });

    const result = {
      success: true,
      data: { hashMatch, metadataDiff, tagsDiff, summary },
    };
    if (contentDiff !== undefined) result.data.contentDiff = contentDiff;

    this.comparisonHistory.push({
      id: randomUUID(),
      docAId: docA.id,
      docBId: docB.id,
      timestamp: new Date(),
      summary,
    });

    return result;
  }

  // ── _compareMetadata ───────────────────────────────────────────────────────
  _compareMetadata(a, b) {
    const details = METADATA_FIELDS.map(field => {
      const changed = (a[field] ?? null) !== (b[field] ?? null);
      return {
        field,
        fieldAr: this._getFieldNameAr(field),
        changed,
        valueA: a[field],
        valueB: b[field],
      };
    });
    const changed = details.filter(d => d.changed).length;
    const unchanged = details.filter(d => !d.changed).length;
    return { total: METADATA_FIELDS.length, changed, unchanged, details };
  }

  // ── _getFieldNameAr ────────────────────────────────────────────────────────
  _getFieldNameAr(field) {
    return FIELD_NAMES_AR[field] || field;
  }

  // ── _compareContent ────────────────────────────────────────────────────────
  _compareContent(strA, strB) {
    const linesA = strA.split('\n');
    const linesB = strB.split('\n');
    const totalLinesA = linesA.length;
    const totalLinesB = linesB.length;
    const maxLen = Math.max(totalLinesA, totalLinesB);

    let added = 0,
      removed = 0,
      modified = 0,
      unchanged = 0;

    for (let i = 0; i < maxLen; i++) {
      const lineA = i < totalLinesA ? linesA[i] : undefined;
      const lineB = i < totalLinesB ? linesB[i] : undefined;

      if (lineA === undefined) {
        added++;
      } else if (lineB === undefined) {
        removed++;
      } else if (lineA === lineB) {
        unchanged++;
      } else {
        modified++;
      }
    }

    const changed = added + removed + modified;
    const changePercentage = maxLen > 0 ? Math.round((changed / maxLen) * 100) : 0;

    return { added, removed, modified, unchanged, changePercentage, totalLinesA, totalLinesB };
  }

  // ── _compareChars ──────────────────────────────────────────────────────────
  _compareChars(strA, strB) {
    const changes = [];
    const maxLen = Math.max(strA.length, strB.length);

    let i = 0;
    while (i < maxLen) {
      if (i >= strA.length) {
        changes.push({ start: i, type: 'added' });
        break;
      }
      if (i >= strB.length) {
        changes.push({ start: i, type: 'removed' });
        break;
      }
      if (strA[i] !== strB[i]) {
        if (i < strA.length && i < strB.length) {
          changes.push({ start: i, type: 'modified' });
        }
      }
      i++;
    }

    return changes;
  }

  // ── _compareTags ──────────────────────────────────────────────────────────
  _compareTags(arrA = [], arrB = []) {
    const setA = new Set(arrA);
    const setB = new Set(arrB);
    const common = arrA.filter(t => setB.has(t));
    const removed = arrA.filter(t => !setB.has(t));
    const added = arrB.filter(t => !setA.has(t));
    return { added, removed, common };
  }

  // ── _generateSummary ──────────────────────────────────────────────────────
  _generateSummary({ hashMatch, metadataDiff, tagsDiff, contentDiff }) {
    let similarity;

    if (contentDiff != null) {
      similarity = 100 - (contentDiff.changePercentage || 0);
    } else {
      // Metadata-based similarity
      if (
        metadataDiff.changed === 0 &&
        (!tagsDiff || (tagsDiff.added.length === 0 && tagsDiff.removed.length === 0))
      ) {
        similarity = 100;
      } else {
        similarity = Math.round((metadataDiff.unchanged / metadataDiff.total) * 100);
      }
    }

    const identical = similarity === 100 && hashMatch !== false;

    let overallAssessment;
    if (similarity === 100) {
      overallAssessment = 'متطابق تماماً';
    } else if (similarity <= 40) {
      overallAssessment = 'مختلف بشكل كبير';
    } else {
      overallAssessment = 'متشابه جزئياً';
    }

    return { similarity, identical, overallAssessment };
  }

  // ── getHistory ─────────────────────────────────────────────────────────────
  async getHistory({ documentId, page = 1, limit = 10 } = {}) {
    let filtered = [...this.comparisonHistory];

    if (documentId) {
      filtered = filtered.filter(h => h.docAId === documentId || h.docBId === documentId);
    }

    const total = filtered.length;
    const start = (page - 1) * limit;
    const data = filtered.slice(start, start + limit);

    return { success: true, total, data };
  }

  // ── batchCompare ──────────────────────────────────────────────────────────
  async batchCompare(versions) {
    if (!versions || !Array.isArray(versions) || versions.length < 2) {
      return { success: false, error: 'يجب توفير إصدارين على الأقل للمقارنة' };
    }

    const data = [];
    for (let i = 0; i < versions.length - 1; i++) {
      const result = await this.compare(versions[i], versions[i + 1]);
      data.push(result.data);
    }

    return {
      success: true,
      data,
      summary: { totalComparisons: data.length, versions: versions.length },
    };
  }
}

module.exports = new DocumentComparisonService();
