/**
 * OCR Document Processing — Tests
 * Phase 18 — معالجة المستندات بالتعرف الضوئي
 */
const request = require('supertest');
const express = require('express');

/* ── mock auth ── */
jest.mock('../middleware/authMiddleware', () => ({
  authenticate: (req, _res, next) => { req.user = { id: 'u1', role: 'admin' }; next(); },
  authorize: () => (_req, _res, next) => next(),
}));

const ocrRoutes = require('../routes/ocrDocument.routes');
const svc = require('../services/ocrDocument.service');

const app = express();
app.use(express.json());
app.use('/api/ocr-documents', ocrRoutes);

/* ══════════════════════════════════════════════════════════════════
   TEST SUITES
   ══════════════════════════════════════════════════════════════════ */

describe('Phase 18 — OCR Document Processing', () => {

  /* ── DASHBOARD ── */
  describe('GET /api/ocr-documents/dashboard', () => {
    it('should return dashboard with all KPIs', async () => {
      const res = await request(app).get('/api/ocr-documents/dashboard');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.kpis).toBeDefined();
      expect(res.body.data.kpis.totalDocuments).toBeGreaterThanOrEqual(5);
      expect(res.body.data.kpis.avgConfidence).toBeGreaterThan(0);
      expect(res.body.data.statusBreakdown).toBeDefined();
      expect(res.body.data.typeBreakdown).toBeDefined();
      expect(res.body.data.recentDocuments.length).toBeGreaterThan(0);
    });
  });

  /* ── REFERENCE DATA ── */
  describe('Reference Data endpoints', () => {
    it('GET /document-types returns types', async () => {
      const res = await request(app).get('/api/ocr-documents/document-types');
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(10);
      expect(res.body.data[0]).toHaveProperty('id');
      expect(res.body.data[0]).toHaveProperty('nameAr');
    });

    it('GET /ocr-engines returns engines', async () => {
      const res = await request(app).get('/api/ocr-documents/ocr-engines');
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(4);
    });

    it('GET /processing-statuses returns statuses', async () => {
      const res = await request(app).get('/api/ocr-documents/processing-statuses');
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(6);
    });

    it('GET /medical-fields returns fields', async () => {
      const res = await request(app).get('/api/ocr-documents/medical-fields');
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('diagnoses');
      expect(res.body.data).toHaveProperty('medications');
    });

    it('GET /supported-formats returns MIME types', async () => {
      const res = await request(app).get('/api/ocr-documents/supported-formats');
      expect(res.status).toBe(200);
      expect(res.body.data).toContain('application/pdf');
      expect(res.body.data).toContain('image/jpeg');
    });

    it('GET /statistics returns full statistics', async () => {
      const res = await request(app).get('/api/ocr-documents/statistics');
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('totalDocuments');
      expect(res.body.data).toHaveProperty('avgConfidence');
      expect(res.body.data).toHaveProperty('confidenceDistribution');
      expect(res.body.data).toHaveProperty('engineUsage');
    });
  });

  /* ── DOCUMENTS CRUD ── */
  describe('Documents CRUD', () => {
    it('GET /documents lists all documents', async () => {
      const res = await request(app).get('/api/ocr-documents/documents');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(5);
    });

    it('GET /documents?documentType=lab_report filters by type', async () => {
      const res = await request(app).get('/api/ocr-documents/documents?documentType=lab_report');
      expect(res.status).toBe(200);
      res.body.data.forEach(d => expect(d.documentType).toBe('lab_report'));
    });

    it('GET /documents?status=completed filters by status', async () => {
      const res = await request(app).get('/api/ocr-documents/documents?status=completed');
      expect(res.status).toBe(200);
      res.body.data.forEach(d => expect(d.status).toBe('completed'));
    });

    it('GET /documents/:id returns document with extraction', async () => {
      const res = await request(app).get('/api/ocr-documents/documents/doc-301');
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe('doc-301');
      expect(res.body.data.fileName).toBe('discharge_ahmed_2026.pdf');
      expect(res.body.data.extraction).toBeDefined();
      expect(res.body.data.auditTrail).toBeDefined();
    });

    it('GET /documents/:id returns 404 for missing doc', async () => {
      const res = await request(app).get('/api/ocr-documents/documents/doc-999');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('POST /documents uploads and processes a new document', async () => {
      const res = await request(app)
        .post('/api/ocr-documents/documents')
        .send({
          fileName: 'test_report.pdf',
          documentType: 'discharge_summary',
          beneficiaryId: 'ben-110',
          fileSize: 120000,
          mimeType: 'application/pdf',
          pageCount: 2,
          language: 'ara+eng',
        });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.fileName).toBe('test_report.pdf');
      expect(['completed', 'review_needed']).toContain(res.body.data.status);
      expect(res.body.data.confidenceScore).toBeDefined();
    });

    it('POST /documents fails without fileName', async () => {
      const res = await request(app)
        .post('/api/ocr-documents/documents')
        .send({ documentType: 'other' });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('PUT /documents/:id updates document metadata', async () => {
      const res = await request(app)
        .put('/api/ocr-documents/documents/doc-302')
        .send({ tags: ['updated', 'lab'] });
      expect(res.status).toBe(200);
      expect(res.body.data.tags).toContain('updated');
    });

    it('DELETE /documents/:id removes document', async () => {
      // Upload a doc to delete
      const upload = await request(app)
        .post('/api/ocr-documents/documents')
        .send({ fileName: 'to_delete.pdf', documentType: 'other' });
      const id = upload.body.data.id;

      const res = await request(app).delete(`/api/ocr-documents/documents/${id}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Confirm gone
      const check = await request(app).get(`/api/ocr-documents/documents/${id}`);
      expect(check.status).toBe(404);
    });
  });

  /* ── OCR REPROCESS ── */
  describe('OCR Reprocessing', () => {
    it('POST /documents/:id/reprocess re-runs OCR', async () => {
      const res = await request(app)
        .post('/api/ocr-documents/documents/doc-301/reprocess')
        .send({ ocrEngine: 'google-vision' });
      expect(res.status).toBe(200);
      expect(res.body.data.document).toBeDefined();
      expect(res.body.data.extraction).toBeDefined();
    });

    it('POST /documents/:id/reprocess returns 404 for missing doc', async () => {
      const res = await request(app)
        .post('/api/ocr-documents/documents/doc-999/reprocess')
        .send({});
      expect(res.status).toBe(404);
    });
  });

  /* ── EXTRACTED DATA ── */
  describe('Extracted Data', () => {
    it('GET /documents/:id/extraction returns structured data', async () => {
      const res = await request(app).get('/api/ocr-documents/documents/doc-301/extraction');
      expect(res.status).toBe(200);
      expect(res.body.data.rawText).toBeDefined();
      expect(res.body.data.structuredData).toBeDefined();
      expect(res.body.data.fieldConfidence).toBeDefined();
    });

    it('GET /extractions/:id returns by extraction id', async () => {
      // ext-401 may have been replaced by reprocess test; get current extraction for doc-301
      const extByDoc = await request(app).get('/api/ocr-documents/documents/doc-301/extraction');
      const extId = extByDoc.body.data.id;
      const res = await request(app).get(`/api/ocr-documents/extractions/${extId}`);
      expect(res.status).toBe(200);
      expect(res.body.data.documentId).toBe('doc-301');
    });
  });

  /* ── CORRECTIONS ── */
  describe('Corrections', () => {
    it('POST /documents/:id/corrections adds a correction', async () => {
      // Upload a fresh doc to ensure clean extraction exists
      const upload = await request(app)
        .post('/api/ocr-documents/documents')
        .send({ fileName: 'corr_test.pdf', documentType: 'lab_report', beneficiaryId: 'ben-600' });
      const docId = upload.body.data.id;

      const res = await request(app)
        .post(`/api/ocr-documents/documents/${docId}/corrections`)
        .send({ field: 'patientName', oldValue: 'Old Name', newValue: 'New Name', reason: 'spelling' });
      expect(res.status).toBe(201);
      expect(res.body.data.field).toBe('patientName');
      expect(res.body.data.newValue).toBe('New Name');
    });

    it('GET /documents/:id/corrections lists corrections', async () => {
      const res = await request(app).get('/api/ocr-documents/documents/doc-301/corrections');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('POST /documents/:id/corrections fails without field', async () => {
      const res = await request(app)
        .post('/api/ocr-documents/documents/doc-301/corrections')
        .send({ newValue: 'test' });
      expect(res.status).toBe(400);
    });
  });

  /* ── REVIEW (APPROVE / REJECT) ── */
  describe('Review workflow', () => {
    it('PUT /documents/:id/approve approves a review_needed doc', async () => {
      const res = await request(app).put('/api/ocr-documents/documents/doc-304/approve');
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('completed');
    });

    it('PUT /documents/:id/approve returns 400 if not in review', async () => {
      const res = await request(app).put('/api/ocr-documents/documents/doc-301/approve');
      expect(res.status).toBe(400);
    });

    it('PUT /documents/:id/reject rejects with reason', async () => {
      // upload a new doc that needs review
      const upload = await request(app)
        .post('/api/ocr-documents/documents')
        .send({ fileName: 'review_test.pdf', documentType: 'other', language: 'ara' });
      const id = upload.body.data.id;

      // Force status to review_needed
      svc.documents.get(id).status = 'review_needed';

      const res = await request(app)
        .put(`/api/ocr-documents/documents/${id}/reject`)
        .send({ reason: 'جودة رديئة' });
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('failed');
    });
  });

  /* ── TEMPLATES ── */
  describe('Templates', () => {
    it('GET /templates lists all templates', async () => {
      const res = await request(app).get('/api/ocr-documents/templates');
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(3);
    });

    it('GET /templates/:id returns template', async () => {
      const res = await request(app).get('/api/ocr-documents/templates/tpl-901');
      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('ملخص خروج عام');
    });

    it('POST /templates creates a new template', async () => {
      const res = await request(app)
        .post('/api/ocr-documents/templates')
        .send({ name: 'قالب جديد', documentType: 'progress_note', fields: ['patientName', 'date'] });
      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('قالب جديد');
      expect(res.body.data.id).toBeDefined();
    });

    it('PUT /templates/:id updates template', async () => {
      const res = await request(app)
        .put('/api/ocr-documents/templates/tpl-902')
        .send({ nameEn: 'Updated Lab Template' });
      expect(res.status).toBe(200);
      expect(res.body.data.nameEn).toBe('Updated Lab Template');
    });

    it('DELETE /templates/:id removes template', async () => {
      const create = await request(app)
        .post('/api/ocr-documents/templates')
        .send({ name: 'للحذف', documentType: 'other' });
      const id = create.body.data.id;

      const res = await request(app).delete(`/api/ocr-documents/templates/${id}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  /* ── BATCHES ── */
  describe('Batch Processing', () => {
    it('GET /batches lists batches', async () => {
      const res = await request(app).get('/api/ocr-documents/batches');
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('GET /batches/:id returns batch with documents', async () => {
      const res = await request(app).get('/api/ocr-documents/batches/batch-501');
      expect(res.status).toBe(200);
      expect(res.body.data.documents).toBeDefined();
    });

    it('POST /batches creates a batch', async () => {
      const res = await request(app)
        .post('/api/ocr-documents/batches')
        .send({ name: 'دفعة اختبار' });
      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('دفعة اختبار');
    });

    it('POST /batches/:id/add-document adds doc to batch', async () => {
      const batch = await request(app)
        .post('/api/ocr-documents/batches')
        .send({ name: 'batch-test' });
      const bId = batch.body.data.id;

      const res = await request(app)
        .post(`/api/ocr-documents/batches/${bId}/add-document`)
        .send({ documentId: 'doc-301' });
      expect(res.status).toBe(200);
      expect(res.body.data.documentIds).toContain('doc-301');
    });

    it('POST /batches/:id/process runs batch OCR', async () => {
      // Upload a fresh doc so batch has a clean document to process
      const upload = await request(app)
        .post('/api/ocr-documents/documents')
        .send({ fileName: 'batch_test.pdf', documentType: 'lab_report', beneficiaryId: 'ben-900' });
      const freshDocId = upload.body.data.id;

      const batch = await request(app)
        .post('/api/ocr-documents/batches')
        .send({ name: 'proc-test' });
      const bId = batch.body.data.id;

      await request(app)
        .post(`/api/ocr-documents/batches/${bId}/add-document`)
        .send({ documentId: freshDocId });

      const res = await request(app).post(`/api/ocr-documents/batches/${bId}/process`);
      expect(res.status).toBe(200);
      expect(res.body.data.processedCount).toBeGreaterThanOrEqual(1);
    });
  });

  /* ── SEARCH ── */
  describe('Full-text Search', () => {
    it('GET /search?q=... searches extracted text', async () => {
      // Upload a fresh doc to ensure searchable text exists
      await request(app)
        .post('/api/ocr-documents/documents')
        .send({ fileName: 'search_test.pdf', documentType: 'lab_report', beneficiaryId: 'ben-800' });

      const res = await request(app)
        .get('/api/ocr-documents/search')
        .query({ q: 'Patient' });
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0]).toHaveProperty('snippet');
    });

    it('GET /search without q returns 400', async () => {
      const res = await request(app).get('/api/ocr-documents/search');
      expect(res.status).toBe(400);
    });
  });

  /* ── BENEFICIARY DOCUMENTS ── */
  describe('Beneficiary Documents', () => {
    it('GET /beneficiaries/:id/documents returns documents', async () => {
      const res = await request(app).get('/api/ocr-documents/beneficiaries/ben-101/documents');
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    });

    it('GET /beneficiaries/:id/medical-summary returns aggregated data', async () => {
      const res = await request(app).get('/api/ocr-documents/beneficiaries/ben-101/medical-summary');
      expect(res.status).toBe(200);
      expect(res.body.data.beneficiaryId).toBe('ben-101');
      expect(res.body.data.medicalSummary).toBeDefined();
      expect(Array.isArray(res.body.data.medicalSummary.diagnoses)).toBe(true);
    });
  });

  /* ── EXPORT ── */
  describe('Export', () => {
    it('GET /documents/:id/export?format=json returns JSON export', async () => {
      const res = await request(app).get('/api/ocr-documents/documents/doc-301/export?format=json');
      expect(res.status).toBe(200);
      expect(res.body.data.format).toBe('json');
      expect(res.body.data.data).toBeDefined();
    });

    it('GET /documents/:id/export?format=csv returns CSV export', async () => {
      const res = await request(app).get('/api/ocr-documents/documents/doc-303/export?format=csv');
      expect(res.status).toBe(200);
      expect(res.body.data.format).toBe('csv');
      expect(typeof res.body.data.data).toBe('string');
    });

    it('GET /documents/:id/export returns 404 for missing doc', async () => {
      const res = await request(app).get('/api/ocr-documents/documents/doc-999/export');
      expect(res.status).toBe(404);
    });
  });

  /* ── AUDIT LOG ── */
  describe('Audit Log', () => {
    it('GET /audit-log returns all logs', async () => {
      const res = await request(app).get('/api/ocr-documents/audit-log');
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    });

    it('GET /documents/:id/audit-log returns logs for specific doc', async () => {
      const res = await request(app).get('/api/ocr-documents/documents/doc-301/audit-log');
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      res.body.data.forEach(log => expect(log.documentId).toBe('doc-301'));
    });
  });

  /* ── SERVICE UNIT TESTS ── */
  describe('Service direct calls', () => {
    it('getDashboard returns proper structure', () => {
      const d = svc.getDashboard();
      expect(d.kpis).toBeDefined();
      expect(d.kpis.totalDocuments).toBeGreaterThanOrEqual(3);
      expect(d.kpis.templatesCount).toBeGreaterThanOrEqual(2);
    });

    it('getDocumentTypes returns array', () => {
      const types = svc.getDocumentTypes();
      expect(types.length).toBeGreaterThanOrEqual(10);
    });

    it('getOCREngines returns engines with accuracy', () => {
      const engines = svc.getOCREngines();
      engines.forEach(e => {
        expect(e.accuracy).toBeGreaterThan(0);
        expect(e.accuracy).toBeLessThanOrEqual(1);
      });
    });

    it('uploadDocument followed by getExtraction', () => {
      const doc = svc.uploadDocument({
        fileName: 'unit_test.pdf',
        documentType: 'lab_report',
        beneficiaryId: 'ben-200',
      }, 'u-test');

      expect(doc.id).toBeDefined();
      expect(['completed', 'review_needed']).toContain(doc.status);

      const ext = svc.getExtraction(doc.id);
      expect(ext).toBeDefined();
      expect(ext.rawText.length).toBeGreaterThan(0);
    });

    it('searchDocuments returns matches with snippets', () => {
      // Upload a fresh prescription so its rawText contains 'وصفة طبية'
      svc.uploadDocument({ fileName: 'search_svc.pdf', documentType: 'prescription', beneficiaryId: 'ben-700' }, 'u-test');
      const results = svc.searchDocuments('وصفة');
      expect(results.length).toBeGreaterThanOrEqual(1);
      results.forEach(r => {
        expect(r).toHaveProperty('snippet');
        expect(r).toHaveProperty('documentId');
      });
    });

    it('getStatistics computes confidence distribution', () => {
      const stats = svc.getStatistics();
      expect(stats.confidenceDistribution).toBeDefined();
      expect(typeof stats.avgProcessingTimeSec).toBe('number');
    });

    it('addCorrection applies to structured data', () => {
      const corr = svc.addCorrection('doc-303', {
        field: 'patientName',
        oldValue: 'عمر حسن الشمري',
        newValue: 'عمر حسن الشمري (محدث)',
        reason: 'تحديث',
      }, 'u1');
      expect(corr).toBeDefined();
      expect(corr.newValue).toBe('عمر حسن الشمري (محدث)');

      const ext = svc.getExtraction('doc-303');
      expect(ext.structuredData.patientName).toBe('عمر حسن الشمري (محدث)');
    });

    it('getBeneficiaryMedicalSummary aggregates all extractions', () => {
      const summary = svc.getBeneficiaryMedicalSummary('ben-101');
      expect(summary.beneficiaryId).toBe('ben-101');
      expect(summary.documentCount).toBeGreaterThanOrEqual(2);
      expect(summary.medicalSummary).toBeDefined();
      expect(Array.isArray(summary.medicalSummary.diagnoses)).toBe(true);
    });

    it('exportDocument CSV produces comma-separated string', () => {
      const ex = svc.exportDocument('doc-303', 'csv');
      expect(ex).toBeDefined();
      expect(typeof ex.data).toBe('string');
      expect(ex.data).toContain(',');
    });
  });
});
