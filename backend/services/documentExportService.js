'use strict';

/**
 * documentExportService — in-memory singleton (EventEmitter)
 * Flat-path barrel for document export/import operations.
 */

const EventEmitter = require('events');
const { createHash, randomUUID } = require('crypto');

class DocumentExportService extends EventEmitter {
  constructor() {
    super();
    this.exportJobs = new Map();
    this.importJobs = new Map();
  }

  // ── createExportJob ───────────────────────────────────────────────────────
  async createExportJob({
    documentIds = [],
    requestedBy,
    requestedByName = null,
    format = 'json',
    includeMetadata = true,
    includeVersions = false,
    includeComments = false,
  } = {}) {
    const id = 'exp_' + randomUUID().replace(/-/g, '');
    const createdAt = new Date();

    this.emit('exportStarted', { id, requestedBy, documentCount: documentIds.length });

    const documents = documentIds.map(docId => {
      const doc = {};
      if (includeMetadata) {
        doc.metadata = { id: docId, title: `Document ${docId}`, exportedAt: createdAt };
      }
      if (includeVersions) {
        doc.versions = [];
      }
      if (includeComments) {
        doc.comments = [];
      }
      return doc;
    });

    const jsonData = JSON.stringify(documents);
    const checksum = createHash('sha256').update(jsonData).digest('hex');
    const size = Buffer.byteLength(jsonData, 'utf8');

    const job = {
      id,
      type: 'export',
      format,
      documentCount: documentIds.length,
      status: 'completed',
      progress: 100,
      requestedBy,
      requestedByName,
      createdAt,
      result: {
        checksum,
        downloadUrl: `/api/exports/${id}/download`,
        size,
        data: { documents },
      },
    };

    this.exportJobs.set(id, job);
    this.emit('exportCompleted', { id, checksum, documentCount: documentIds.length });

    return { success: true, data: job };
  }

  // ── createImportJob ───────────────────────────────────────────────────────
  async createImportJob({
    sourceData = {},
    requestedBy,
    validateOnly = false,
    mergeStrategy = 'skip',
  } = {}) {
    const id = 'imp_' + randomUUID().replace(/-/g, '');
    const createdAt = new Date();
    const { documents = [], checksum } = sourceData;

    this.emit('importStarted', { id, requestedBy });

    // Validate checksum if provided
    if (checksum) {
      const computed = createHash('sha256').update(JSON.stringify(documents)).digest('hex');
      if (computed !== checksum) {
        const job = {
          id,
          type: 'import',
          status: 'failed',
          mergeStrategy,
          createdAt,
          requestedBy,
          error: 'فشل التحقق من checksum — البيانات قد تكون تالفة',
          results: { total: 0, imported: 0, failed: 0, errors: [] },
        };
        this.importJobs.set(id, job);
        this.emit('importCompleted', { id, status: 'failed' });
        return { success: true, data: job };
      }
    }

    // Validate and import each document
    const errors = [];
    let imported = 0;

    for (const doc of documents) {
      const validation = this._validateDocument(doc);
      if (!validation.valid) {
        errors.push({ doc, reason: validation.reason });
      } else {
        imported++;
      }
    }

    const status =
      errors.length === documents.length && documents.length > 0 ? 'failed' : 'completed';

    const job = {
      id,
      type: 'import',
      status,
      mergeStrategy,
      createdAt,
      requestedBy,
      results: { total: documents.length, imported, failed: errors.length, errors },
    };

    this.importJobs.set(id, job);
    this.emit('importCompleted', { id, status });

    const response = { success: true, data: job };
    if (validateOnly) {
      response.message = 'اكتمل التحقق من الوثائق بنجاح';
    }

    return response;
  }

  // ── _validateDocument ──────────────────────────────────────────────────────
  _validateDocument(doc) {
    if (!doc || !doc.id) return { valid: false, reason: 'معرف الوثيقة مفقود' };
    if (!doc.metadata || !doc.metadata.title)
      return { valid: false, reason: 'عنوان الوثيقة مفقود' };
    return { valid: true };
  }

  // ── getExportJob ───────────────────────────────────────────────────────────
  async getExportJob(id) {
    const job = this.exportJobs.get(id);
    if (!job) return { success: false, error: 'مهمة التصدير غير موجودة' };
    return { success: true, data: job };
  }

  // ── getImportJob ───────────────────────────────────────────────────────────
  async getImportJob(id) {
    const job = this.importJobs.get(id);
    if (!job) return { success: false, error: 'مهمة الاستيراد غير موجودة' };
    return { success: true, data: job };
  }

  // ── getJobs ────────────────────────────────────────────────────────────────
  async getJobs(type = null, { status, requestedBy } = {}) {
    let allJobs = [];

    if (type === 'export' || type == null) {
      allJobs = [...allJobs, ...Array.from(this.exportJobs.values())];
    }
    if (type === 'import' || type == null) {
      allJobs = [...allJobs, ...Array.from(this.importJobs.values())];
    }

    if (status) allJobs = allJobs.filter(j => j.status === status);
    if (requestedBy) allJobs = allJobs.filter(j => j.requestedBy === requestedBy);

    allJobs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return { success: true, total: allJobs.length, data: allJobs };
  }

  // ── exportToCSV ────────────────────────────────────────────────────────────
  async exportToCSV(docs = []) {
    const headers = ['المعرف', 'العنوان', 'التصنيف', 'الحالة', 'الوسوم'];
    const rows = docs.map(doc => [
      doc.id || '',
      doc.title || '',
      doc.category || '',
      doc.status || '',
      (doc.tags || []).join(', '),
    ]);

    const csv = '\uFEFF' + [headers, ...rows].map(r => r.join(',')).join('\n');
    const filename = `documents_${Date.now()}.csv`;

    return { success: true, data: csv, mimeType: 'text/csv', filename };
  }

  // ── exportToJSON ───────────────────────────────────────────────────────────
  async exportToJSON(docs = []) {
    const documents = docs.map(doc => ({
      id: doc._id || doc.id || '',
      title: doc.title || '',
      description: doc.description || '',
      category: doc.category || '',
      status: doc.status || '',
      tags: doc.tags || [],
    }));

    const content = JSON.stringify(documents);
    const checksum = createHash('sha256').update(content).digest('hex');

    const payload = {
      totalDocuments: documents.length,
      exportedAt: new Date().toISOString(),
      system: 'منصة الأوائل للوثائق',
      checksum,
      documents,
    };

    const data = JSON.stringify(payload, null, 2);
    const filename = `documents_${Date.now()}.json`;

    return { success: true, data, mimeType: 'application/json', filename };
  }
}

module.exports = new DocumentExportService();
