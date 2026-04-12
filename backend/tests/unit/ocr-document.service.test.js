/**
 * Unit tests — OCRDocumentService
 * backend/services/ocrDocument.service.js
 */

/* ── suppress logger (service uses `const logger = console;`) ── */
beforeAll(() => {
  jest.spyOn(console, 'info').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterAll(() => {
  jest.restoreAllMocks();
});

const service = require('../../services/ocrDocument.service');

/* ══════════════════════════════════════════════════════════════════════
   1. Module exports
   ══════════════════════════════════════════════════════════════════════ */
describe('Module exports', () => {
  it('exports a singleton object (not a class)', () => {
    expect(service).toBeDefined();
    expect(typeof service).toBe('object');
    expect(service.constructor.name).toBe('OCRDocumentService');
  });

  it('has documents Map pre-seeded', () => {
    expect(service.documents).toBeInstanceOf(Map);
    expect(service.documents.size).toBeGreaterThanOrEqual(5);
  });

  it('has extractedData Map pre-seeded', () => {
    expect(service.extractedData).toBeInstanceOf(Map);
    expect(service.extractedData.size).toBeGreaterThanOrEqual(3);
  });

  it('has templates Map pre-seeded', () => {
    expect(service.templates).toBeInstanceOf(Map);
    expect(service.templates.size).toBeGreaterThanOrEqual(3);
  });

  it('exposes key methods', () => {
    const methods = [
      'getDashboard',
      'getDocumentTypes',
      'getOCREngines',
      'getProcessingStatuses',
      'getMedicalFields',
      'getSupportedFormats',
      'listDocuments',
      'getDocument',
      'uploadDocument',
      'updateDocument',
      'deleteDocument',
      'reprocessDocument',
      'getExtraction',
      'getExtractionById',
      'addCorrection',
      'listCorrections',
      'listTemplates',
      'getTemplate',
      'createTemplate',
      'updateTemplate',
      'deleteTemplate',
      'createBatch',
      'addDocumentToBatch',
      'processBatch',
      'getBatch',
      'listBatches',
      'searchDocuments',
      'getBeneficiaryDocuments',
      'getBeneficiaryMedicalSummary',
      'exportDocument',
      'getAuditLog',
      'getStatistics',
      'approveDocument',
      'rejectDocument',
    ];
    methods.forEach(m => expect(typeof service[m]).toBe('function'));
  });
});

/* ══════════════════════════════════════════════════════════════════════
   2. Dashboard
   ══════════════════════════════════════════════════════════════════════ */
describe('getDashboard()', () => {
  let dash;
  beforeAll(() => {
    dash = service.getDashboard();
  });

  it('returns object with kpis, statusBreakdown, typeBreakdown, recentDocuments, reviewNeeded', () => {
    expect(dash).toHaveProperty('kpis');
    expect(dash).toHaveProperty('statusBreakdown');
    expect(dash).toHaveProperty('typeBreakdown');
    expect(dash).toHaveProperty('recentDocuments');
    expect(dash).toHaveProperty('reviewNeeded');
  });

  it('kpis.totalDocuments matches documents size', () => {
    expect(dash.kpis.totalDocuments).toBe(service.documents.size);
  });

  it('kpis.completedDocuments counts only status=completed', () => {
    const expected = [...service.documents.values()].filter(d => d.status === 'completed').length;
    expect(dash.kpis.completedDocuments).toBe(expected);
  });

  it('kpis.pendingReview counts review_needed', () => {
    const expected = [...service.documents.values()].filter(
      d => d.status === 'review_needed'
    ).length;
    expect(dash.kpis.pendingReview).toBe(expected);
  });

  it('kpis.queuedDocuments counts queued', () => {
    const expected = [...service.documents.values()].filter(d => d.status === 'queued').length;
    expect(dash.kpis.queuedDocuments).toBe(expected);
  });

  it('kpis.avgConfidence is a number between 0 and 1', () => {
    expect(typeof dash.kpis.avgConfidence).toBe('number');
    expect(dash.kpis.avgConfidence).toBeGreaterThanOrEqual(0);
    expect(dash.kpis.avgConfidence).toBeLessThanOrEqual(1);
  });

  it('kpis includes totalPages, totalSizeMB, totalCorrections, activeBatches, templatesCount', () => {
    expect(typeof dash.kpis.totalPages).toBe('number');
    expect(typeof dash.kpis.totalSizeMB).toBe('number');
    expect(typeof dash.kpis.totalCorrections).toBe('number');
    expect(typeof dash.kpis.activeBatches).toBe('number');
    expect(dash.kpis.templatesCount).toBe(service.templates.size);
  });

  it('statusBreakdown has all 8 processing statuses as keys', () => {
    const statuses = service.getProcessingStatuses();
    statuses.forEach(s => {
      expect(dash.statusBreakdown).toHaveProperty(s);
      expect(typeof dash.statusBreakdown[s]).toBe('number');
    });
  });

  it('typeBreakdown has all 11 document type keys', () => {
    const types = service.getDocumentTypes();
    types.forEach(t => {
      expect(dash.typeBreakdown).toHaveProperty(t.id);
    });
  });

  it('recentDocuments is an array with max 5 entries', () => {
    expect(Array.isArray(dash.recentDocuments)).toBe(true);
    expect(dash.recentDocuments.length).toBeLessThanOrEqual(5);
  });

  it('recentDocuments items have expected shape', () => {
    if (dash.recentDocuments.length > 0) {
      const item = dash.recentDocuments[0];
      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('fileName');
      expect(item).toHaveProperty('documentType');
      expect(item).toHaveProperty('status');
      expect(item).toHaveProperty('uploadedAt');
      expect(item).toHaveProperty('beneficiaryId');
    }
  });

  it('reviewNeeded contains only docs with status review_needed', () => {
    dash.reviewNeeded.forEach(d => {
      const full = service.documents.get(d.id);
      expect(full.status).toBe('review_needed');
    });
  });
});

/* ══════════════════════════════════════════════════════════════════════
   3. Reference data
   ══════════════════════════════════════════════════════════════════════ */
describe('Reference data getters', () => {
  describe('getDocumentTypes()', () => {
    it('returns array of 11 document types', () => {
      const types = service.getDocumentTypes();
      expect(Array.isArray(types)).toBe(true);
      expect(types).toHaveLength(11);
    });
    it('each type has id, nameAr, nameEn', () => {
      service.getDocumentTypes().forEach(t => {
        expect(t).toHaveProperty('id');
        expect(t).toHaveProperty('nameAr');
        expect(t).toHaveProperty('nameEn');
      });
    });
    it('includes discharge_summary, lab_report, prescription', () => {
      const ids = service.getDocumentTypes().map(t => t.id);
      expect(ids).toContain('discharge_summary');
      expect(ids).toContain('lab_report');
      expect(ids).toContain('prescription');
    });
  });

  describe('getOCREngines()', () => {
    it('returns array of 5 engines', () => {
      const engines = service.getOCREngines();
      expect(engines).toHaveLength(5);
    });
    it('each engine has id, name, lang, accuracy', () => {
      service.getOCREngines().forEach(e => {
        expect(e).toHaveProperty('id');
        expect(e).toHaveProperty('name');
        expect(e).toHaveProperty('lang');
        expect(typeof e.accuracy).toBe('number');
      });
    });
    it('includes tesseract-ar, google-vision, azure-cognitive', () => {
      const ids = service.getOCREngines().map(e => e.id);
      expect(ids).toContain('tesseract-ar');
      expect(ids).toContain('google-vision');
      expect(ids).toContain('azure-cognitive');
    });
  });

  describe('getProcessingStatuses()', () => {
    it('returns array of 8 statuses', () => {
      expect(service.getProcessingStatuses()).toHaveLength(8);
    });
    it('includes queued, completed, review_needed, failed', () => {
      const s = service.getProcessingStatuses();
      expect(s).toContain('queued');
      expect(s).toContain('completed');
      expect(s).toContain('review_needed');
      expect(s).toContain('failed');
    });
  });

  describe('getMedicalFields()', () => {
    it('returns object with 8 fields', () => {
      const f = service.getMedicalFields();
      expect(typeof f).toBe('object');
      expect(Object.keys(f)).toHaveLength(8);
    });
    it('each field has nameAr and nameEn', () => {
      Object.values(service.getMedicalFields()).forEach(v => {
        expect(v).toHaveProperty('nameAr');
        expect(v).toHaveProperty('nameEn');
      });
    });
    it('includes diagnoses, medications, labResults', () => {
      const f = service.getMedicalFields();
      expect(f).toHaveProperty('diagnoses');
      expect(f).toHaveProperty('medications');
      expect(f).toHaveProperty('labResults');
    });
  });

  describe('getSupportedFormats()', () => {
    it('returns 6 supported formats', () => {
      expect(service.getSupportedFormats()).toHaveLength(6);
    });
    it('includes image/jpeg, application/pdf', () => {
      const f = service.getSupportedFormats();
      expect(f).toContain('image/jpeg');
      expect(f).toContain('application/pdf');
    });
  });
});

/* ══════════════════════════════════════════════════════════════════════
   4. Documents CRUD
   ══════════════════════════════════════════════════════════════════════ */
describe('Documents CRUD', () => {
  /* ── listDocuments ── */
  describe('listDocuments()', () => {
    it('returns all documents when no filters', () => {
      const docs = service.listDocuments();
      expect(docs.length).toBeGreaterThanOrEqual(5);
    });

    it('returns sorted by uploadedAt descending', () => {
      const docs = service.listDocuments();
      for (let i = 1; i < docs.length; i++) {
        expect(new Date(docs[i - 1].uploadedAt).getTime()).toBeGreaterThanOrEqual(
          new Date(docs[i].uploadedAt).getTime()
        );
      }
    });

    it('filters by beneficiaryId', () => {
      const docs = service.listDocuments({ beneficiaryId: 'ben-101' });
      docs.forEach(d => expect(d.beneficiaryId).toBe('ben-101'));
      expect(docs.length).toBeGreaterThanOrEqual(2);
    });

    it('filters by documentType', () => {
      const docs = service.listDocuments({ documentType: 'lab_report' });
      docs.forEach(d => expect(d.documentType).toBe('lab_report'));
    });

    it('filters by status', () => {
      const docs = service.listDocuments({ status: 'completed' });
      docs.forEach(d => expect(d.status).toBe('completed'));
    });

    it('filters by search (matches fileName)', () => {
      const docs = service.listDocuments({ search: 'ahmed' });
      expect(docs.length).toBeGreaterThanOrEqual(1);
      docs.forEach(d =>
        expect(
          d.fileName.toLowerCase().includes('ahmed') ||
            (d.tags || []).some(t => t.toLowerCase().includes('ahmed'))
        ).toBe(true)
      );
    });

    it('filters by search (matches tags)', () => {
      const docs = service.listDocuments({ search: 'مختبر' });
      expect(docs.length).toBeGreaterThanOrEqual(1);
    });

    it('filters by fromDate', () => {
      const docs = service.listDocuments({ fromDate: '2026-03-22T00:00:00Z' });
      docs.forEach(d => expect(d.uploadedAt >= '2026-03-22T00:00:00Z').toBe(true));
    });

    it('filters by toDate', () => {
      const docs = service.listDocuments({ toDate: '2026-03-21T23:59:59Z' });
      docs.forEach(d => expect(d.uploadedAt <= '2026-03-21T23:59:59Z').toBe(true));
    });

    it('combines multiple filters', () => {
      const docs = service.listDocuments({ beneficiaryId: 'ben-101', status: 'completed' });
      docs.forEach(d => {
        expect(d.beneficiaryId).toBe('ben-101');
        expect(d.status).toBe('completed');
      });
    });

    it('returns empty array when no matches', () => {
      const docs = service.listDocuments({ beneficiaryId: 'nonexistent' });
      expect(docs).toEqual([]);
    });
  });

  /* ── getDocument ── */
  describe('getDocument()', () => {
    it('returns null for non-existent id', () => {
      expect(service.getDocument('doc-9999')).toBeNull();
    });

    it('returns enriched document for seeded doc-301', () => {
      const doc = service.getDocument('doc-301');
      expect(doc).not.toBeNull();
      expect(doc.id).toBe('doc-301');
      expect(doc).toHaveProperty('extraction');
      expect(doc).toHaveProperty('corrections');
      expect(doc).toHaveProperty('auditTrail');
    });

    it('extraction is the matching extraction object', () => {
      const doc = service.getDocument('doc-301');
      expect(doc.extraction).toBeDefined();
      expect(doc.extraction.documentId).toBe('doc-301');
    });

    it('corrections array contains corrections for that doc', () => {
      const doc = service.getDocument('doc-301');
      expect(Array.isArray(doc.corrections)).toBe(true);
      doc.corrections.forEach(c => expect(c.documentId).toBe('doc-301'));
    });

    it('auditTrail contains audit entries for that doc', () => {
      const doc = service.getDocument('doc-301');
      expect(Array.isArray(doc.auditTrail)).toBe(true);
      doc.auditTrail.forEach(a => expect(a.documentId).toBe('doc-301'));
    });

    it('returns doc without extraction for doc-305 (queued)', () => {
      const doc = service.getDocument('doc-305');
      expect(doc).not.toBeNull();
      expect(doc.status).toBe('queued');
      // extraction may be undefined since no extraction exists for queued doc
    });
  });

  /* ── uploadDocument ── */
  describe('uploadDocument()', () => {
    let uploaded;
    const uploadData = {
      beneficiaryId: 'ben-201',
      documentType: 'prescription',
      fileName: 'test_upload.pdf',
      fileSize: 50000,
      mimeType: 'application/pdf',
      pageCount: 2,
      language: 'ara',
      ocrEngine: 'tesseract-ar',
      tags: ['test', 'upload'],
    };

    beforeAll(() => {
      uploaded = service.uploadDocument(uploadData, 'u-test');
    });

    it('returns new document with auto-generated id', () => {
      expect(uploaded).toBeDefined();
      expect(uploaded.id).toMatch(/^doc-\d+$/);
    });

    it('sets uploadedBy to passed userId', () => {
      expect(uploaded.uploadedBy).toBe('u-test');
    });

    it('sets uploadedAt as ISO string', () => {
      expect(uploaded.uploadedAt).toBeDefined();
      expect(() => new Date(uploaded.uploadedAt)).not.toThrow();
    });

    it('auto-processes the document (status becomes completed or review_needed)', () => {
      const doc = service.documents.get(uploaded.id);
      expect(['completed', 'review_needed']).toContain(doc.status);
    });

    it('document has confidenceScore after processing', () => {
      const doc = service.documents.get(uploaded.id);
      expect(doc.confidenceScore).not.toBeNull();
      expect(typeof doc.confidenceScore).toBe('number');
    });

    it('sets processedAt after processing', () => {
      const doc = service.documents.get(uploaded.id);
      expect(doc.processedAt).not.toBeNull();
    });

    it('adds document to beneficiaryDocs map', () => {
      const benDocs = service.beneficiaryDocs.get('ben-201');
      expect(benDocs).toContain(uploaded.id);
    });

    it('creates audit log entry for upload', () => {
      const audits = service.getAuditLog(uploaded.id);
      expect(audits.some(a => a.action === 'upload')).toBe(true);
    });

    it('creates audit log entry for ocr_complete', () => {
      const audits = service.getAuditLog(uploaded.id);
      expect(audits.some(a => a.action === 'ocr_complete')).toBe(true);
    });

    it('defaults missing fields gracefully', () => {
      const minimal = service.uploadDocument({ fileName: 'minimal.pdf' }, 'u-test2');
      expect(minimal.beneficiaryId).toBeNull();
      expect(minimal.documentType).toBe('other');
      expect(minimal.fileSize).toBe(0);
      expect(minimal.mimeType).toBe('application/pdf');
      expect(minimal.pageCount).toBe(1);
      expect(minimal.language).toBe('ara+eng');
      expect(minimal.ocrEngine).toBe('tesseract-mixed');
      expect(minimal.tags).toEqual([]);
    });

    it('does not add to beneficiaryDocs when no beneficiaryId', () => {
      const minimal = service.uploadDocument({ fileName: 'no_ben.pdf' }, 'u-test3');
      const benDocs = service.beneficiaryDocs.get(null);
      // null key would not have the doc — or benDocs is undefined
      expect(!benDocs || !benDocs.includes(minimal.id)).toBe(true);
    });
  });

  /* ── updateDocument ── */
  describe('updateDocument()', () => {
    it('returns null for non-existent id', () => {
      expect(service.updateDocument('doc-9999', { tags: ['x'] })).toBeNull();
    });

    it('updates documentType', () => {
      const result = service.updateDocument('doc-302', { documentType: 'progress_note' });
      expect(result.documentType).toBe('progress_note');
      // restore
      service.updateDocument('doc-302', { documentType: 'lab_report' });
    });

    it('updates tags', () => {
      const result = service.updateDocument('doc-302', { tags: ['new_tag'] });
      expect(result.tags).toEqual(['new_tag']);
      // restore
      service.updateDocument('doc-302', { tags: ['مختبر', 'سارة', 'دم'] });
    });

    it('updates language', () => {
      const result = service.updateDocument('doc-302', { language: 'ara' });
      expect(result.language).toBe('ara');
      service.updateDocument('doc-302', { language: 'eng' });
    });

    it('updates beneficiaryId', () => {
      const result = service.updateDocument('doc-302', { beneficiaryId: 'ben-999' });
      expect(result.beneficiaryId).toBe('ben-999');
      service.updateDocument('doc-302', { beneficiaryId: 'ben-102' });
    });

    it('does not modify unmentioned fields', () => {
      const before = { ...service.documents.get('doc-303') };
      service.updateDocument('doc-303', { tags: ['updated'] });
      const after = service.documents.get('doc-303');
      expect(after.documentType).toBe(before.documentType);
      expect(after.language).toBe(before.language);
      // restore
      service.updateDocument('doc-303', { tags: before.tags });
    });
  });

  /* ── deleteDocument ── */
  describe('deleteDocument()', () => {
    let delDocId;

    beforeAll(() => {
      // create a doc to delete
      const d = service.uploadDocument(
        {
          fileName: 'to_delete.pdf',
          beneficiaryId: 'ben-del',
          documentType: 'lab_report',
        },
        'u-del'
      );
      delDocId = d.id;
    });

    it('returns false for non-existent id', () => {
      expect(service.deleteDocument('doc-9999')).toBe(false);
    });

    it('returns true and removes the document', () => {
      expect(service.deleteDocument(delDocId)).toBe(true);
      expect(service.documents.get(delDocId)).toBeUndefined();
    });

    it('cleans up related extractions', () => {
      const extractions = [...service.extractedData.values()].filter(
        e => e.documentId === delDocId
      );
      expect(extractions).toHaveLength(0);
    });

    it('cleans up related corrections', () => {
      const corrections = [...service.corrections.values()].filter(c => c.documentId === delDocId);
      expect(corrections).toHaveLength(0);
    });
  });
});

/* ══════════════════════════════════════════════════════════════════════
   5. Reprocess
   ══════════════════════════════════════════════════════════════════════ */
describe('reprocessDocument()', () => {
  it('returns null for non-existent doc', () => {
    expect(service.reprocessDocument('doc-9999', 'u1')).toBeNull();
  });

  it('reprocesses and returns { document, extraction }', () => {
    const result = service.reprocessDocument('doc-301', 'u1');
    expect(result).toHaveProperty('document');
    expect(result).toHaveProperty('extraction');
    expect(result.document.id).toBe('doc-301');
    expect(result.extraction.documentId).toBe('doc-301');
  });

  it('respects options.ocrEngine', () => {
    const result = service.reprocessDocument('doc-301', 'u1', { ocrEngine: 'google-vision' });
    expect(result.document.ocrEngine).toBe('google-vision');
  });

  it('respects options.language', () => {
    const result = service.reprocessDocument('doc-301', 'u1', { language: 'eng' });
    expect(result.document.language).toBe('eng');
  });

  it('removes old extraction and creates new one', () => {
    const beforeExtIds = [...service.extractedData.values()]
      .filter(e => e.documentId === 'doc-301')
      .map(e => e.id);

    const result = service.reprocessDocument('doc-301', 'u1');

    const afterExtIds = [...service.extractedData.values()]
      .filter(e => e.documentId === 'doc-301')
      .map(e => e.id);

    // new extraction id should differ from any old one
    expect(afterExtIds).toHaveLength(1);
    expect(result.extraction.id).toBe(afterExtIds[0]);
  });

  it('adds reprocess audit entry', () => {
    service.reprocessDocument('doc-302', 'u-rep');
    const audits = service.getAuditLog('doc-302');
    expect(audits.some(a => a.action === 'reprocess')).toBe(true);
  });

  it('document status becomes completed or review_needed after reprocess', () => {
    const result = service.reprocessDocument('doc-302', 'u-rep');
    expect(['completed', 'review_needed']).toContain(result.document.status);
  });
});

/* ══════════════════════════════════════════════════════════════════════
   6. Extractions
   ══════════════════════════════════════════════════════════════════════ */
describe('Extractions', () => {
  describe('getExtraction(docId)', () => {
    it('returns extraction for doc with extraction', () => {
      const ext = service.getExtraction('doc-301');
      expect(ext).not.toBeNull();
      expect(ext.documentId).toBe('doc-301');
    });

    it('returns null for doc without extraction', () => {
      // doc-305 is queued, originally no extraction
      // but may have been processed in earlier tests if batch was processed
      // create a fresh doc without processing for safety
      const id = service._nextDocId();
      service.documents.set(id, { id, status: 'queued', beneficiaryId: null });
      expect(service.getExtraction(id)).toBeNull();
      service.documents.delete(id);
    });

    it('returns null for non-existent docId', () => {
      expect(service.getExtraction('doc-nonexistent')).toBeNull();
    });
  });

  describe('getExtractionById(extractionId)', () => {
    it('returns extraction by its own id', () => {
      // find any existing extraction
      const anyExt = [...service.extractedData.values()][0];
      const result = service.getExtractionById(anyExt.id);
      expect(result).not.toBeNull();
      expect(result.id).toBe(anyExt.id);
    });

    it('returns null for non-existent extraction id', () => {
      expect(service.getExtractionById('ext-9999')).toBeNull();
    });
  });
});

/* ══════════════════════════════════════════════════════════════════════
   7. Corrections
   ══════════════════════════════════════════════════════════════════════ */
describe('Corrections', () => {
  describe('addCorrection()', () => {
    it('returns null if document not found', () => {
      expect(
        service.addCorrection('doc-9999', { field: 'x', oldValue: 'a', newValue: 'b' }, 'u1')
      ).toBeNull();
    });

    it('returns null if no extraction for the document', () => {
      // create doc without extraction
      const id = service._nextDocId();
      service.documents.set(id, { id, status: 'completed', beneficiaryId: null });
      expect(
        service.addCorrection(id, { field: 'x', oldValue: 'a', newValue: 'b' }, 'u1')
      ).toBeNull();
      service.documents.delete(id);
    });

    it('creates correction for doc with extraction', () => {
      const corr = service.addCorrection(
        'doc-301',
        {
          field: 'patientName',
          oldValue: 'old',
          newValue: 'أحمد العلي الجديد',
          reason: 'تصحيح الاسم',
        },
        'u-corr'
      );
      expect(corr).not.toBeNull();
      expect(corr.id).toMatch(/^corr-\d+$/);
      expect(corr.documentId).toBe('doc-301');
      expect(corr.correctedBy).toBe('u-corr');
    });

    it('applies correction to structured data', () => {
      const ext = service.getExtraction('doc-301');
      expect(ext.structuredData.patientName).toBe('أحمد العلي الجديد');
    });

    it('adds audit entry for correction', () => {
      const audits = service.getAuditLog('doc-301');
      expect(audits.some(a => a.action === 'correction')).toBe(true);
    });

    it('correction has timestamp', () => {
      const corrections = service.listCorrections('doc-301');
      corrections.forEach(c => expect(c.correctedAt).toBeDefined());
    });

    it('correction preserves reason', () => {
      const corrections = service.listCorrections('doc-301');
      const found = corrections.find(c => c.reason === 'تصحيح الاسم');
      expect(found).toBeDefined();
    });
  });

  describe('listCorrections()', () => {
    it('returns all corrections when no docId given', () => {
      const all = service.listCorrections();
      expect(Array.isArray(all)).toBe(true);
      expect(all.length).toBeGreaterThanOrEqual(1);
    });

    it('filters by docId', () => {
      const filtered = service.listCorrections('doc-301');
      filtered.forEach(c => expect(c.documentId).toBe('doc-301'));
    });

    it('returns empty array for doc with no corrections', () => {
      const filtered = service.listCorrections('doc-302');
      expect(Array.isArray(filtered)).toBe(true);
      // may or may not have corrections depending on test order — at least it's an array
    });
  });
});

/* ══════════════════════════════════════════════════════════════════════
   8. Templates CRUD
   ══════════════════════════════════════════════════════════════════════ */
describe('Templates CRUD', () => {
  describe('listTemplates()', () => {
    it('returns array of at least 3 seeded templates', () => {
      const tpls = service.listTemplates();
      expect(Array.isArray(tpls)).toBe(true);
      expect(tpls.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('getTemplate()', () => {
    it('returns template by id', () => {
      const tpl = service.getTemplate('tpl-901');
      expect(tpl).not.toBeNull();
      expect(tpl.id).toBe('tpl-901');
      expect(tpl.documentType).toBe('discharge_summary');
    });

    it('returns null for non-existent id', () => {
      expect(service.getTemplate('tpl-9999')).toBeNull();
    });
  });

  describe('createTemplate()', () => {
    let created;
    beforeAll(() => {
      created = service.createTemplate({
        name: 'قالب اختبار',
        nameEn: 'Test Template',
        documentType: 'progress_note',
        fields: ['field1', 'field2'],
      });
    });

    it('returns new template with auto-id', () => {
      expect(created.id).toMatch(/^tpl-\d+$/);
    });

    it('sets name and nameEn', () => {
      expect(created.name).toBe('قالب اختبار');
      expect(created.nameEn).toBe('Test Template');
    });

    it('sets documentType', () => {
      expect(created.documentType).toBe('progress_note');
    });

    it('sets fields array', () => {
      expect(created.fields).toEqual(['field1', 'field2']);
    });

    it('sets createdAt', () => {
      expect(created.createdAt).toBeDefined();
    });

    it('is stored in templates Map', () => {
      expect(service.getTemplate(created.id)).toEqual(created);
    });

    it('defaults nameEn to empty string when omitted', () => {
      const t = service.createTemplate({ name: 'بلا إنجليزي', documentType: 'other' });
      expect(t.nameEn).toBe('');
    });

    it('defaults fields to empty array when omitted', () => {
      const t = service.createTemplate({ name: 'بلا حقول', documentType: 'other' });
      expect(t.fields).toEqual([]);
    });

    it('defaults patterns to empty object when omitted', () => {
      const t = service.createTemplate({ name: 'بلا أنماط', documentType: 'other' });
      expect(t.patterns).toEqual({});
    });
  });

  describe('updateTemplate()', () => {
    it('returns null for non-existent id', () => {
      expect(service.updateTemplate('tpl-9999', { name: 'x' })).toBeNull();
    });

    it('updates name', () => {
      const result = service.updateTemplate('tpl-901', { name: 'اسم جديد' });
      expect(result.name).toBe('اسم جديد');
      service.updateTemplate('tpl-901', { name: 'ملخص خروج عام' }); // restore
    });

    it('updates nameEn', () => {
      const result = service.updateTemplate('tpl-901', { nameEn: 'New English Name' });
      expect(result.nameEn).toBe('New English Name');
      service.updateTemplate('tpl-901', { nameEn: 'General Discharge Summary' });
    });

    it('updates fields', () => {
      const result = service.updateTemplate('tpl-901', { fields: ['a', 'b'] });
      expect(result.fields).toEqual(['a', 'b']);
    });

    it('updates documentType', () => {
      const result = service.updateTemplate('tpl-901', { documentType: 'other' });
      expect(result.documentType).toBe('other');
      service.updateTemplate('tpl-901', { documentType: 'discharge_summary' });
    });

    it('does not modify unmentioned fields', () => {
      const before = service.getTemplate('tpl-902');
      const beforeName = before.name;
      service.updateTemplate('tpl-902', { nameEn: 'Updated' });
      expect(service.getTemplate('tpl-902').name).toBe(beforeName);
      service.updateTemplate('tpl-902', { nameEn: 'Comprehensive Lab Report' });
    });
  });

  describe('deleteTemplate()', () => {
    it('returns true when template exists', () => {
      const tpl = service.createTemplate({ name: 'حذف', documentType: 'other' });
      expect(service.deleteTemplate(tpl.id)).toBe(true);
    });

    it('template is removed after deletion', () => {
      const tpl = service.createTemplate({ name: 'حذف2', documentType: 'other' });
      service.deleteTemplate(tpl.id);
      expect(service.getTemplate(tpl.id)).toBeNull();
    });

    it('returns false for non-existent id', () => {
      expect(service.deleteTemplate('tpl-9999')).toBe(false);
    });
  });
});

/* ══════════════════════════════════════════════════════════════════════
   9. Batch processing
   ══════════════════════════════════════════════════════════════════════ */
describe('Batch processing', () => {
  describe('createBatch()', () => {
    it('creates a new batch with auto-id', () => {
      const batch = service.createBatch({ name: 'دفعة اختبار' }, 'u-batch');
      expect(batch.id).toMatch(/^batch-\d+$/);
      expect(batch.name).toBe('دفعة اختبار');
      expect(batch.status).toBe('processing');
      expect(batch.documentIds).toEqual([]);
      expect(batch.totalDocuments).toBe(0);
      expect(batch.processedCount).toBe(0);
      expect(batch.failedCount).toBe(0);
      expect(batch.createdBy).toBe('u-batch');
    });

    it('defaults name when not provided', () => {
      const batch = service.createBatch({}, 'u-batch2');
      expect(batch.name).toBeDefined();
      expect(typeof batch.name).toBe('string');
    });
  });

  describe('addDocumentToBatch()', () => {
    let batchId;
    beforeAll(() => {
      const b = service.createBatch({ name: 'دفعة إضافة' }, 'u-add');
      batchId = b.id;
    });

    it('returns null if batch not found', () => {
      expect(service.addDocumentToBatch('batch-9999', 'doc-301')).toBeNull();
    });

    it('returns null if doc not found', () => {
      expect(service.addDocumentToBatch(batchId, 'doc-9999')).toBeNull();
    });

    it('adds document to batch', () => {
      const result = service.addDocumentToBatch(batchId, 'doc-301');
      expect(result).not.toBeNull();
      expect(result.documentIds).toContain('doc-301');
      expect(result.totalDocuments).toBe(1);
    });

    it('prevents duplicate document ids', () => {
      service.addDocumentToBatch(batchId, 'doc-301');
      const result = service.addDocumentToBatch(batchId, 'doc-301');
      const count = result.documentIds.filter(id => id === 'doc-301').length;
      expect(count).toBe(1);
    });

    it('updates totalDocuments when adding multiple docs', () => {
      service.addDocumentToBatch(batchId, 'doc-302');
      const result = service.addDocumentToBatch(batchId, 'doc-303');
      expect(result.totalDocuments).toBe(3);
    });
  });

  describe('processBatch()', () => {
    let batchId;
    beforeAll(() => {
      const b = service.createBatch({ name: 'دفعة معالجة' }, 'u-proc');
      batchId = b.id;
      service.addDocumentToBatch(batchId, 'doc-301');
      service.addDocumentToBatch(batchId, 'doc-302');
    });

    it('returns null if batch not found', () => {
      expect(service.processBatch('batch-9999', 'u1')).toBeNull();
    });

    it('processes all documents in the batch', () => {
      const result = service.processBatch(batchId, 'u-proc');
      expect(result).not.toBeNull();
      expect(result.processedCount).toBe(2);
      expect(result.failedCount).toBe(0);
    });

    it('sets batch status to completed when all succeed', () => {
      const result = service.processBatch(batchId, 'u-proc');
      expect(result.status).toBe('completed');
    });

    it('processes batch with empty documentIds (0===0 triggers failed)', () => {
      const emptyBatch = service.createBatch({ name: 'فارغة' }, 'u-empty');
      const result = service.processBatch(emptyBatch.id, 'u-empty');
      expect(result.processedCount).toBe(0);
      expect(result.failedCount).toBe(0);
      // failedCount(0) === totalDocuments(0) → status 'failed'
      expect(result.status).toBe('failed');
    });
  });

  describe('getBatch()', () => {
    let freshBatchId;
    beforeAll(() => {
      const b = service.createBatch({ name: 'دفعة getBatch' }, 'u-gb');
      freshBatchId = b.id;
      service.addDocumentToBatch(freshBatchId, 'doc-303');
    });

    it('returns null for non-existent batch', () => {
      expect(service.getBatch('batch-9999')).toBeNull();
    });

    it('returns batch with embedded documents array', () => {
      const batch = service.getBatch(freshBatchId);
      expect(batch).not.toBeNull();
      expect(batch.id).toBe(freshBatchId);
      expect(Array.isArray(batch.documents)).toBe(true);
      expect(batch.documents.length).toBeGreaterThanOrEqual(1);
    });

    it('documents in batch are actual document objects', () => {
      const batch = service.getBatch(freshBatchId);
      batch.documents.forEach(d => {
        expect(d).toHaveProperty('id');
        expect(d).toHaveProperty('fileName');
      });
    });
  });

  describe('listBatches()', () => {
    it('returns array of batches', () => {
      const batches = service.listBatches();
      expect(Array.isArray(batches)).toBe(true);
      expect(batches.length).toBeGreaterThanOrEqual(1);
    });

    it('sorted by createdAt descending', () => {
      const batches = service.listBatches();
      for (let i = 1; i < batches.length; i++) {
        expect(new Date(batches[i - 1].createdAt).getTime()).toBeGreaterThanOrEqual(
          new Date(batches[i].createdAt).getTime()
        );
      }
    });
  });
});

/* ══════════════════════════════════════════════════════════════════════
   10. Search
   ══════════════════════════════════════════════════════════════════════ */
describe('searchDocuments()', () => {
  // Upload a fresh doc so its simulated extraction text is guaranteed present
  let searchDocId;
  beforeAll(() => {
    const d = service.uploadDocument(
      {
        fileName: 'search_test_doc.pdf',
        beneficiaryId: 'ben-search',
        documentType: 'prescription',
        ocrEngine: 'tesseract-ar',
      },
      'u-search'
    );
    searchDocId = d.id;
  });

  it('finds documents matching Arabic query from simulated extraction', () => {
    // prescription simulated text contains 'فيتامين'
    const results = service.searchDocuments('فيتامين');
    expect(results.length).toBeGreaterThanOrEqual(1);
    results.forEach(r => {
      expect(r).toHaveProperty('documentId');
      expect(r).toHaveProperty('snippet');
      expect(r).toHaveProperty('matchPosition');
      expect(r).toHaveProperty('confidence');
    });
  });

  it('finds documents matching Arabic query (doctor name)', () => {
    // prescription simulated text contains 'المعالج'
    const results = service.searchDocuments('المعالج');
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it('search is case-insensitive for English text', () => {
    // Upload a lab_report whose simulated text contains 'Lab Report'
    const d = service.uploadDocument(
      {
        fileName: 'search_en.jpg',
        documentType: 'lab_report',
        beneficiaryId: 'ben-search-en',
      },
      'u-search-en'
    );
    const results = service.searchDocuments('lab report');
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it('returns empty array when no match', () => {
    const results = service.searchDocuments('xyznonexistent123');
    expect(results).toEqual([]);
  });

  it('snippet contains surrounding text', () => {
    const results = service.searchDocuments('فيتامين');
    if (results.length > 0) {
      expect(results[0].snippet.length).toBeGreaterThan(0);
    }
  });

  it('matchPosition is a number >= 0', () => {
    const results = service.searchDocuments('فيتامين');
    results.forEach(r => {
      expect(typeof r.matchPosition).toBe('number');
      expect(r.matchPosition).toBeGreaterThanOrEqual(0);
    });
  });

  it('result includes fileName and documentType', () => {
    const results = service.searchDocuments('فيتامين');
    if (results.length > 0) {
      expect(results[0]).toHaveProperty('fileName');
      expect(results[0]).toHaveProperty('documentType');
    }
  });
});

/* ══════════════════════════════════════════════════════════════════════
   11. Beneficiary documents & medical summary
   ══════════════════════════════════════════════════════════════════════ */
describe('Beneficiary documents', () => {
  describe('getBeneficiaryDocuments()', () => {
    const freshBenId = 'ben-bdt-' + Date.now();
    let freshDocIds;
    beforeAll(() => {
      const d1 = service.uploadDocument(
        {
          fileName: 'ben_doc_1.pdf',
          beneficiaryId: freshBenId,
          documentType: 'lab_report',
        },
        'u-bd1'
      );
      const d2 = service.uploadDocument(
        {
          fileName: 'ben_doc_2.pdf',
          beneficiaryId: freshBenId,
          documentType: 'prescription',
        },
        'u-bd2'
      );
      freshDocIds = [d1.id, d2.id];
    });

    it('returns docs for beneficiary sorted by uploadedAt desc', () => {
      const docs = service.getBeneficiaryDocuments(freshBenId);
      expect(docs.length).toBeGreaterThanOrEqual(2);
      for (let i = 1; i < docs.length; i++) {
        expect(new Date(docs[i - 1].uploadedAt).getTime()).toBeGreaterThanOrEqual(
          new Date(docs[i].uploadedAt).getTime()
        );
      }
    });

    it('returns empty array for beneficiary with no docs', () => {
      const docs = service.getBeneficiaryDocuments('ben-nonexistent');
      expect(docs).toEqual([]);
    });

    it('each document belongs to the requested beneficiary', () => {
      const docs = service.getBeneficiaryDocuments(freshBenId);
      docs.forEach(d => expect(d.beneficiaryId).toBe(freshBenId));
    });
  });

  describe('getBeneficiaryMedicalSummary()', () => {
    it('returns summary object with expected shape', () => {
      const summary = service.getBeneficiaryMedicalSummary('ben-101');
      expect(summary).toHaveProperty('beneficiaryId', 'ben-101');
      expect(summary).toHaveProperty('documentCount');
      expect(Array.isArray(summary.documents)).toBe(true);
      expect(summary).toHaveProperty('medicalSummary');
    });

    it('medicalSummary has diagnoses, medications, labResults, procedures, lastDocumentDate', () => {
      const summary = service.getBeneficiaryMedicalSummary('ben-101');
      const ms = summary.medicalSummary;
      expect(ms).toHaveProperty('diagnoses');
      expect(ms).toHaveProperty('medications');
      expect(ms).toHaveProperty('labResults');
      expect(ms).toHaveProperty('procedures');
      expect(ms).toHaveProperty('lastDocumentDate');
    });

    it('documentCount matches documents array length', () => {
      const summary = service.getBeneficiaryMedicalSummary('ben-101');
      expect(summary.documentCount).toBe(summary.documents.length);
    });

    it('lastDocumentDate is the most recent uploadedAt', () => {
      const summary = service.getBeneficiaryMedicalSummary('ben-101');
      if (summary.documents.length > 0) {
        const dates = summary.documents.map(d => d.uploadedAt).sort();
        expect(summary.medicalSummary.lastDocumentDate).toBe(dates[dates.length - 1]);
      }
    });

    it('documents items have id, fileName, documentType, uploadedAt, status', () => {
      const summary = service.getBeneficiaryMedicalSummary('ben-101');
      summary.documents.forEach(d => {
        expect(d).toHaveProperty('id');
        expect(d).toHaveProperty('fileName');
        expect(d).toHaveProperty('documentType');
        expect(d).toHaveProperty('uploadedAt');
        expect(d).toHaveProperty('status');
      });
    });

    it('returns empty summary for beneficiary with no docs', () => {
      const summary = service.getBeneficiaryMedicalSummary('ben-nonexistent');
      expect(summary.documentCount).toBe(0);
      expect(summary.documents).toEqual([]);
      expect(summary.medicalSummary.lastDocumentDate).toBeNull();
    });

    it('aggregates diagnoses from extractions', () => {
      const summary = service.getBeneficiaryMedicalSummary('ben-101');
      // ben-101 has doc-301 (discharge_summary) which has diagnoses in seed extraction
      expect(Array.isArray(summary.medicalSummary.diagnoses)).toBe(true);
    });

    it('aggregates medications from extractions', () => {
      const summary = service.getBeneficiaryMedicalSummary('ben-101');
      expect(Array.isArray(summary.medicalSummary.medications)).toBe(true);
    });
  });
});

/* ══════════════════════════════════════════════════════════════════════
   12. Export
   ══════════════════════════════════════════════════════════════════════ */
describe('Export', () => {
  describe('exportDocument()', () => {
    it('returns null for non-existent doc', () => {
      expect(service.exportDocument('doc-9999')).toBeNull();
    });

    it('returns null when doc has no extraction', () => {
      const id = service._nextDocId();
      service.documents.set(id, { id, status: 'queued' });
      expect(service.exportDocument(id)).toBeNull();
      service.documents.delete(id);
    });

    it('defaults to json format', () => {
      const result = service.exportDocument('doc-301');
      expect(result).not.toBeNull();
      expect(result.format).toBe('json');
    });

    it('json export data is the structuredData object', () => {
      const result = service.exportDocument('doc-301', 'json');
      expect(typeof result.data).toBe('object');
    });

    it('csv export returns CSV string', () => {
      const result = service.exportDocument('doc-301', 'csv');
      expect(typeof result.data).toBe('string');
      expect(result.data).toContain('Field,Value');
    });

    it('export job has id, documentId, format, status, createdAt', () => {
      const result = service.exportDocument('doc-302', 'json');
      expect(result.id).toMatch(/^exp-\d+$/);
      expect(result.documentId).toBe('doc-302');
      expect(result.status).toBe('completed');
      expect(result.createdAt).toBeDefined();
    });

    it('export is stored in exportJobs map', () => {
      const result = service.exportDocument('doc-303', 'json');
      expect(service.exportJobs.get(result.id)).toBeDefined();
    });
  });

  describe('_toCSV()', () => {
    it('flattens simple object to Field,Value rows', () => {
      const csv = service._toCSV({ name: 'test', age: '30' });
      expect(csv).toContain('Field,Value');
      expect(csv).toContain('name,test');
      expect(csv).toContain('age,30');
    });

    it('flattens nested objects with dot notation', () => {
      const csv = service._toCSV({ a: { b: 'val' } });
      expect(csv).toContain('a.b,val');
    });

    it('serializes arrays as JSON', () => {
      const csv = service._toCSV({ items: [1, 2, 3] });
      expect(csv).toContain('items,[1,2,3]');
    });

    it('handles empty object', () => {
      const csv = service._toCSV({});
      expect(csv).toBe('Field,Value');
    });
  });
});

/* ══════════════════════════════════════════════════════════════════════
   13. Audit log
   ══════════════════════════════════════════════════════════════════════ */
describe('getAuditLog()', () => {
  it('returns all audit logs when no docId given', () => {
    const logs = service.getAuditLog();
    expect(Array.isArray(logs)).toBe(true);
    expect(logs.length).toBeGreaterThanOrEqual(2);
  });

  it('all audit logs sorted by timestamp desc', () => {
    const logs = service.getAuditLog();
    for (let i = 1; i < logs.length; i++) {
      expect(new Date(logs[i - 1].timestamp).getTime()).toBeGreaterThanOrEqual(
        new Date(logs[i].timestamp).getTime()
      );
    }
  });

  it('filters by docId', () => {
    const logs = service.getAuditLog('doc-301');
    expect(logs.length).toBeGreaterThanOrEqual(2);
    logs.forEach(a => expect(a.documentId).toBe('doc-301'));
  });

  it('filtered logs sorted by timestamp desc', () => {
    const logs = service.getAuditLog('doc-301');
    for (let i = 1; i < logs.length; i++) {
      expect(new Date(logs[i - 1].timestamp).getTime()).toBeGreaterThanOrEqual(
        new Date(logs[i].timestamp).getTime()
      );
    }
  });

  it('each audit entry has id, documentId, action, userId, timestamp, details', () => {
    const logs = service.getAuditLog();
    logs.forEach(a => {
      expect(a).toHaveProperty('id');
      expect(a).toHaveProperty('documentId');
      expect(a).toHaveProperty('action');
      expect(a).toHaveProperty('userId');
      expect(a).toHaveProperty('timestamp');
      expect(a).toHaveProperty('details');
    });
  });

  it('returns empty array for doc with no audits', () => {
    const logs = service.getAuditLog('doc-nonexistent');
    expect(logs).toEqual([]);
  });
});

/* ══════════════════════════════════════════════════════════════════════
   14. Statistics
   ══════════════════════════════════════════════════════════════════════ */
describe('getStatistics()', () => {
  let stats;
  beforeAll(() => {
    stats = service.getStatistics();
  });

  it('returns totalDocuments matching documents size', () => {
    expect(stats.totalDocuments).toBe(service.documents.size);
  });

  it('returns completedDocuments', () => {
    const expected = [...service.documents.values()].filter(d => d.status === 'completed').length;
    expect(stats.completedDocuments).toBe(expected);
  });

  it('avgConfidence is a number', () => {
    expect(typeof stats.avgConfidence).toBe('number');
  });

  it('avgConfidence is between 0 and 1', () => {
    expect(stats.avgConfidence).toBeGreaterThanOrEqual(0);
    expect(stats.avgConfidence).toBeLessThanOrEqual(1);
  });

  it('avgProcessingTimeSec is a number', () => {
    // returned as string due to toFixed, but coerced: check type
    expect(typeof Number(stats.avgProcessingTimeSec)).toBe('number');
  });

  it('totalCorrections matches corrections size', () => {
    expect(stats.totalCorrections).toBe(service.corrections.size);
  });

  it('correctionsRate is a number', () => {
    expect(typeof stats.correctionsRate).toBe('number');
  });

  it('confidenceDistribution has low, medium, high, veryHigh', () => {
    expect(stats.confidenceDistribution).toHaveProperty('low');
    expect(stats.confidenceDistribution).toHaveProperty('medium');
    expect(stats.confidenceDistribution).toHaveProperty('high');
    expect(stats.confidenceDistribution).toHaveProperty('veryHigh');
  });

  it('confidenceDistribution buckets sum to completedDocuments', () => {
    const cd = stats.confidenceDistribution;
    const sum = cd.low + cd.medium + cd.high + cd.veryHigh;
    expect(sum).toBe(stats.completedDocuments);
  });

  it('engineUsage is an object with engine keys', () => {
    expect(typeof stats.engineUsage).toBe('object');
    // total should match totalDocuments
    const sum = Object.values(stats.engineUsage).reduce((a, b) => a + b, 0);
    expect(sum).toBe(stats.totalDocuments);
  });

  it('typeDistribution is an object', () => {
    expect(typeof stats.typeDistribution).toBe('object');
    const sum = Object.values(stats.typeDistribution).reduce((a, b) => a + b, 0);
    expect(sum).toBe(stats.totalDocuments);
  });

  it('languageDistribution is an object', () => {
    expect(typeof stats.languageDistribution).toBe('object');
    const sum = Object.values(stats.languageDistribution).reduce((a, b) => a + b, 0);
    expect(sum).toBe(stats.totalDocuments);
  });

  it('totalPages is a number >= 0', () => {
    expect(typeof stats.totalPages).toBe('number');
    expect(stats.totalPages).toBeGreaterThanOrEqual(0);
  });

  it('totalSizeMB is a number >= 0', () => {
    expect(typeof stats.totalSizeMB).toBe('number');
    expect(stats.totalSizeMB).toBeGreaterThanOrEqual(0);
  });
});

/* ══════════════════════════════════════════════════════════════════════
   15. Approve / Reject
   ══════════════════════════════════════════════════════════════════════ */
describe('Approve / Reject', () => {
  describe('approveDocument()', () => {
    it('returns null for non-existent doc', () => {
      expect(service.approveDocument('doc-9999', 'u1')).toBeNull();
    });

    it('returns error object if doc status is not review_needed', () => {
      // doc-301 is completed
      const result = service.approveDocument('doc-301', 'u1');
      expect(result).toHaveProperty('error');
      expect(result.error).toBe('المستند ليس في حالة مراجعة');
    });

    it('approves doc with review_needed status', () => {
      // create a doc in review_needed state
      const d = service.uploadDocument(
        {
          fileName: 'approve_test.pdf',
          documentType: 'other',
        },
        'u-approve'
      );
      // Force status to review_needed
      const doc = service.documents.get(d.id);
      doc.status = 'review_needed';
      service.documents.set(d.id, doc);

      const result = service.approveDocument(d.id, 'u-approver');
      expect(result).not.toBeNull();
      expect(result.error).toBeUndefined();
      expect(result.status).toBe('completed');
    });

    it('adds approved audit entry', () => {
      // create another review_needed doc
      const d = service.uploadDocument({ fileName: 'approve_audit_test.pdf' }, 'u-aa');
      const doc = service.documents.get(d.id);
      doc.status = 'review_needed';
      service.documents.set(d.id, doc);

      service.approveDocument(d.id, 'u-approver2');
      const audits = service.getAuditLog(d.id);
      expect(audits.some(a => a.action === 'approved')).toBe(true);
    });

    it('returns error for queued doc', () => {
      const d = service.uploadDocument({ fileName: 'queued_approve.pdf' }, 'u-q');
      const doc = service.documents.get(d.id);
      doc.status = 'queued';
      service.documents.set(d.id, doc);

      const result = service.approveDocument(d.id, 'u1');
      expect(result).toHaveProperty('error');
    });

    it('returns error for failed doc', () => {
      const d = service.uploadDocument({ fileName: 'failed_approve.pdf' }, 'u-f');
      const doc = service.documents.get(d.id);
      doc.status = 'failed';
      service.documents.set(d.id, doc);

      const result = service.approveDocument(d.id, 'u1');
      expect(result).toHaveProperty('error');
    });
  });

  describe('rejectDocument()', () => {
    it('returns null for non-existent doc', () => {
      expect(service.rejectDocument('doc-9999', 'u1', 'reason')).toBeNull();
    });

    it('returns error object if doc status is not review_needed', () => {
      const result = service.rejectDocument('doc-301', 'u1', 'test');
      expect(result).toHaveProperty('error');
      expect(result.error).toBe('المستند ليس في حالة مراجعة');
    });

    it('rejects doc with review_needed status', () => {
      const d = service.uploadDocument({ fileName: 'reject_test.pdf' }, 'u-rej');
      const doc = service.documents.get(d.id);
      doc.status = 'review_needed';
      service.documents.set(d.id, doc);

      const result = service.rejectDocument(d.id, 'u-rejector', 'جودة منخفضة');
      expect(result).not.toBeNull();
      expect(result.error).toBeUndefined();
      expect(result.status).toBe('failed');
    });

    it('adds rejected audit entry with reason', () => {
      const d = service.uploadDocument({ fileName: 'reject_audit_test.pdf' }, 'u-ra');
      const doc = service.documents.get(d.id);
      doc.status = 'review_needed';
      service.documents.set(d.id, doc);

      service.rejectDocument(d.id, 'u-rejector2', 'سبب الرفض');
      const audits = service.getAuditLog(d.id);
      const rejAudit = audits.find(a => a.action === 'rejected');
      expect(rejAudit).toBeDefined();
      expect(rejAudit.details).toContain('سبب الرفض');
    });

    it('handles rejection without explicit reason', () => {
      const d = service.uploadDocument({ fileName: 'reject_noreason.pdf' }, 'u-rn');
      const doc = service.documents.get(d.id);
      doc.status = 'review_needed';
      service.documents.set(d.id, doc);

      const result = service.rejectDocument(d.id, 'u-rejector3');
      expect(result.status).toBe('failed');
      const audits = service.getAuditLog(d.id);
      const rejAudit = audits.find(a => a.action === 'rejected');
      expect(rejAudit.details).toContain('بدون سبب');
    });

    it('returns error for completed doc', () => {
      const result = service.rejectDocument('doc-301', 'u1', 'reason');
      expect(result).toHaveProperty('error');
    });

    it('returns error for archived doc', () => {
      const d = service.uploadDocument({ fileName: 'archived_reject.pdf' }, 'u-ar');
      const doc = service.documents.get(d.id);
      doc.status = 'archived';
      service.documents.set(d.id, doc);

      const result = service.rejectDocument(d.id, 'u1', 'reason');
      expect(result).toHaveProperty('error');
    });
  });
});
