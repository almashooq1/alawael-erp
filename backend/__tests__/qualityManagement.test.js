/**
 * Quality Management Tests — اختبارات إدارة الجودة (ISO / CBAHI)
 * Phase 20 — تدقيق، مؤشرات جودة، تقارير اعتماد تلقائية
 */

const request = require('supertest');
const express = require('express');

/* ── Mock auth middleware ── */
jest.mock('../middleware/authMiddleware', () => ({
  authenticate: (req, _res, next) => {
    req.user = { id: 'test-user-001', role: 'admin' };
    next();
  },
  authorize:
    (..._roles) =>
    (req, _res, next) =>
      next(),
}));

const qualityRoutes = require('../routes/qualityManagement.routes');
const _svc = require('../services/qualityManagement.service');

/* ── Build test app ── */
const app = express();
app.use(express.json());
app.use('/api/quality-management', qualityRoutes);

/* ══════════════════════════════════════════════════════════════
   Phase 20 — Quality Management System (ISO / CBAHI)
   ══════════════════════════════════════════════════════════════ */

describe('Phase 20 — Quality Management (إدارة الجودة)', () => {
  /* ═══ Dashboard & Reference ═══ */
  describe('Dashboard & Reference', () => {
    it('GET /dashboard → dashboard with summary, compliance, indicators', async () => {
      const res = await request(app).get('/api/quality-management/dashboard');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.summary).toBeDefined();
      expect(res.body.data.summary.totalAudits).toBeGreaterThanOrEqual(1);
      expect(res.body.data.complianceByStandard).toBeDefined();
      expect(res.body.data.indicatorPerformance).toBeDefined();
      expect(res.body.data.recentAudits).toBeDefined();
      expect(res.body.data.upcomingAudits).toBeDefined();
    });

    it('GET /statistics → full statistics object', async () => {
      const res = await request(app).get('/api/quality-management/statistics');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const d = res.body.data;
      expect(d.audits).toBeDefined();
      expect(d.findings).toBeDefined();
      expect(d.nonConformances).toBeDefined();
      expect(d.capaActions).toBeDefined();
      expect(d.indicators).toBeDefined();
      expect(d.documents).toBeDefined();
      expect(d.risks).toBeDefined();
    });

    it('GET /reference → all reference data arrays', async () => {
      const res = await request(app).get('/api/quality-management/reference');
      expect(res.status).toBe(200);
      const d = res.body.data;
      expect(d.standards.length).toBeGreaterThanOrEqual(3);
      expect(d.auditTypes.length).toBeGreaterThanOrEqual(3);
      expect(d.auditStatuses.length).toBeGreaterThanOrEqual(3);
      expect(d.findingSeverities.length).toBeGreaterThanOrEqual(3);
      expect(d.ncStatuses.length).toBeGreaterThanOrEqual(3);
      expect(d.capaTypes.length).toBe(2);
      expect(d.riskLevels.length).toBeGreaterThanOrEqual(3);
      expect(d.docTypes.length).toBeGreaterThanOrEqual(3);
      expect(d.departments.length).toBeGreaterThanOrEqual(5);
    });
  });

  /* ═══ Audits ═══ */
  describe('Audits (التدقيقات)', () => {
    it('GET /audits → list seed audits', async () => {
      const res = await request(app).get('/api/quality-management/audits');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(3);
    });

    it('GET /audits?standard=cbahi → filter by standard', async () => {
      const res = await request(app).get('/api/quality-management/audits?standard=cbahi');
      expect(res.status).toBe(200);
      res.body.data.forEach(a => expect(a.standard).toBe('cbahi'));
    });

    it('GET /audits/:id → single audit', async () => {
      const list = await request(app).get('/api/quality-management/audits');
      const id = list.body.data[0].id;
      const res = await request(app).get(`/api/quality-management/audits/${id}`);
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(id);
    });

    it('GET /audits/:id → 404 for missing', async () => {
      const res = await request(app).get('/api/quality-management/audits/nonexistent');
      expect(res.status).toBe(404);
    });

    let createdAuditId;
    it('POST /audits → create new audit', async () => {
      const res = await request(app).post('/api/quality-management/audits').send({
        titleAr: 'تدقيق اختباري جديد',
        titleEn: 'New Test Audit',
        type: 'internal',
        standard: 'iso9001',
        department: 'quality',
        scheduledDate: '2026-06-01',
        leadAuditor: 'مدقق اختبار',
        scope: 'نطاق الاختبار',
      });
      expect(res.status).toBe(201);
      expect(res.body.data.titleAr).toBe('تدقيق اختباري جديد');
      createdAuditId = res.body.data.id;
    });

    it('POST /audits → 400 with missing fields', async () => {
      const res = await request(app)
        .post('/api/quality-management/audits')
        .send({ titleAr: 'only title' });
      expect(res.status).toBe(400);
    });

    it('PUT /audits/:id → update audit', async () => {
      const res = await request(app)
        .put(`/api/quality-management/audits/${createdAuditId}`)
        .send({ status: 'in_progress' });
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('in_progress');
    });

    it('DELETE /audits/:id → delete audit', async () => {
      const res = await request(app).delete(`/api/quality-management/audits/${createdAuditId}`);
      expect(res.status).toBe(200);
      const check = await request(app).get(`/api/quality-management/audits/${createdAuditId}`);
      expect(check.status).toBe(404);
    });
  });

  /* ═══ Findings ═══ */
  describe('Findings (الملاحظات)', () => {
    it('GET /findings → list seed findings', async () => {
      const res = await request(app).get('/api/quality-management/findings');
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(3);
    });

    it('GET /findings?severity=critical → filter', async () => {
      const res = await request(app).get('/api/quality-management/findings?severity=critical');
      expect(res.status).toBe(200);
      res.body.data.forEach(f => expect(f.severity).toBe('critical'));
    });

    it('GET /findings/:id → single finding', async () => {
      const list = await request(app).get('/api/quality-management/findings');
      const id = list.body.data[0].id;
      const res = await request(app).get(`/api/quality-management/findings/${id}`);
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(id);
    });

    let createdFindingId;
    it('POST /findings → create new finding', async () => {
      const audits = await request(app).get('/api/quality-management/audits');
      const auditId = audits.body.data[0].id;
      const res = await request(app).post('/api/quality-management/findings').send({
        auditId,
        titleAr: 'ملاحظة اختبارية',
        titleEn: 'Test Finding',
        severity: 'minor',
        clauseRef: 'TEST-1',
        description: 'وصف اختباري',
      });
      expect(res.status).toBe(201);
      createdFindingId = res.body.data.id;
    });

    it('POST /findings → 400 with missing fields', async () => {
      const res = await request(app)
        .post('/api/quality-management/findings')
        .send({ titleAr: 'only' });
      expect(res.status).toBe(400);
    });

    it('PUT /findings/:id → update finding', async () => {
      const res = await request(app)
        .put(`/api/quality-management/findings/${createdFindingId}`)
        .send({ description: 'وصف محدث' });
      expect(res.status).toBe(200);
      expect(res.body.data.description).toBe('وصف محدث');
    });

    it('POST /findings/:id/close → close finding', async () => {
      const res = await request(app).post(
        `/api/quality-management/findings/${createdFindingId}/close`
      );
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('closed');
    });
  });

  /* ═══ Non-Conformances ═══ */
  describe('Non-Conformances (عدم المطابقة)', () => {
    it('GET /non-conformances → list seed NCs', async () => {
      const res = await request(app).get('/api/quality-management/non-conformances');
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    });

    it('GET /non-conformances/:id → single NC', async () => {
      const list = await request(app).get('/api/quality-management/non-conformances');
      const id = list.body.data[0].id;
      const res = await request(app).get(`/api/quality-management/non-conformances/${id}`);
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(id);
    });

    let createdNCId;
    it('POST /non-conformances → create new NC', async () => {
      const res = await request(app).post('/api/quality-management/non-conformances').send({
        titleAr: 'عدم مطابقة اختبارية',
        titleEn: 'Test NC',
        standard: 'cbahi',
        department: 'nursing',
        severity: 'minor',
        clauseRef: 'CBAHI-TEST-1',
        description: 'وصف اختباري',
        reportedBy: 'مختبر',
      });
      expect(res.status).toBe(201);
      createdNCId = res.body.data.id;
    });

    it('PUT /non-conformances/:id → update NC', async () => {
      const res = await request(app)
        .put(`/api/quality-management/non-conformances/${createdNCId}`)
        .send({ status: 'root_cause_analysis', rootCause: 'سبب جذري' });
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('root_cause_analysis');
    });

    it('DELETE /non-conformances/:id → delete NC', async () => {
      const res = await request(app).delete(
        `/api/quality-management/non-conformances/${createdNCId}`
      );
      expect(res.status).toBe(200);
      const check = await request(app).get(
        `/api/quality-management/non-conformances/${createdNCId}`
      );
      expect(check.status).toBe(404);
    });
  });

  /* ═══ CAPA ═══ */
  describe('CAPA (الإجراءات التصحيحية والوقائية)', () => {
    it('GET /capa → list seed CAPAs', async () => {
      const res = await request(app).get('/api/quality-management/capa');
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    });

    it('GET /capa/:id → single CAPA', async () => {
      const list = await request(app).get('/api/quality-management/capa');
      const id = list.body.data[0].id;
      const res = await request(app).get(`/api/quality-management/capa/${id}`);
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(id);
    });

    let createdCAPAId;
    it('POST /capa → create new CAPA', async () => {
      const ncs = await request(app).get('/api/quality-management/non-conformances');
      const ncId = ncs.body.data[0].id;
      const res = await request(app).post('/api/quality-management/capa').send({
        ncId,
        type: 'corrective',
        titleAr: 'إجراء تصحيحي اختباري',
        titleEn: 'Test Corrective Action',
        responsiblePerson: 'مسؤول اختبار',
        dueDate: '2026-06-15',
        description: 'وصف إجراء',
      });
      expect(res.status).toBe(201);
      createdCAPAId = res.body.data.id;
    });

    it('POST /capa → 400 with missing fields', async () => {
      const res = await request(app)
        .post('/api/quality-management/capa')
        .send({ type: 'corrective' });
      expect(res.status).toBe(400);
    });

    it('PUT /capa/:id → update CAPA', async () => {
      const res = await request(app)
        .put(`/api/quality-management/capa/${createdCAPAId}`)
        .send({ completionPercent: 80 });
      expect(res.status).toBe(200);
      expect(res.body.data.completionPercent).toBe(80);
    });

    it('POST /capa/:id/verify → verify and close CAPA', async () => {
      const res = await request(app).post(`/api/quality-management/capa/${createdCAPAId}/verify`);
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('closed');
      expect(res.body.data.completionPercent).toBe(100);
      expect(res.body.data.verifiedBy).toBeDefined();
    });
  });

  /* ═══ Quality Indicators ═══ */
  describe('Quality Indicators (مؤشرات الجودة)', () => {
    it('GET /indicators → list seed indicators', async () => {
      const res = await request(app).get('/api/quality-management/indicators');
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(5);
    });

    it('GET /indicators?standard=cbahi → filter by standard', async () => {
      const res = await request(app).get('/api/quality-management/indicators?standard=cbahi');
      expect(res.status).toBe(200);
      res.body.data.forEach(qi => expect(qi.standard).toBe('cbahi'));
    });

    it('GET /indicators/:id → single indicator', async () => {
      const list = await request(app).get('/api/quality-management/indicators');
      const id = list.body.data[0].id;
      const res = await request(app).get(`/api/quality-management/indicators/${id}`);
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(id);
    });

    let createdIndicatorId;
    it('POST /indicators → create new indicator', async () => {
      const res = await request(app)
        .post('/api/quality-management/indicators')
        .send({
          code: 'QI-TEST-001',
          nameAr: 'مؤشر اختباري',
          nameEn: 'Test Indicator',
          standard: 'iso9001',
          department: 'quality',
          unit: '%',
          target: 85,
          threshold: { red: 60, yellow: 75, green: 85 },
          frequency: 'monthly',
        });
      expect(res.status).toBe(201);
      createdIndicatorId = res.body.data.id;
    });

    it('POST /indicators → 400 with missing fields', async () => {
      const res = await request(app).post('/api/quality-management/indicators').send({ code: 'X' });
      expect(res.status).toBe(400);
    });

    it('PUT /indicators/:id → update indicator', async () => {
      const res = await request(app)
        .put(`/api/quality-management/indicators/${createdIndicatorId}`)
        .send({ target: 90 });
      expect(res.status).toBe(200);
      expect(res.body.data.target).toBe(90);
    });

    it('DELETE /indicators/:id → delete indicator', async () => {
      const res = await request(app).delete(
        `/api/quality-management/indicators/${createdIndicatorId}`
      );
      expect(res.status).toBe(200);
    });

    /* ── Indicator Records ── */
    it('GET /indicators/:id/records → list records for indicator', async () => {
      const list = await request(app).get('/api/quality-management/indicators');
      const id = list.body.data[0].id;
      const res = await request(app).get(`/api/quality-management/indicators/${id}/records`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('POST /indicators/:id/records → add record', async () => {
      const list = await request(app).get('/api/quality-management/indicators');
      const id = list.body.data[0].id;
      const res = await request(app)
        .post(`/api/quality-management/indicators/${id}/records`)
        .send({ period: '2026-04', value: 1.8, notes: 'قيمة اختبارية' });
      expect(res.status).toBe(201);
      expect(res.body.data.value).toBe(1.8);
    });

    it('POST /indicators/:id/records → 404 for bad indicator', async () => {
      const res = await request(app)
        .post('/api/quality-management/indicators/nonexistent/records')
        .send({ period: '2026-04', value: 1.0 });
      expect(res.status).toBe(404);
    });

    it('GET /indicators/:id/trend → trend data', async () => {
      const list = await request(app).get('/api/quality-management/indicators');
      const id = list.body.data[0].id;
      const res = await request(app).get(`/api/quality-management/indicators/${id}/trend`);
      expect(res.status).toBe(200);
      expect(res.body.data.indicator).toBeDefined();
      expect(res.body.data.records).toBeDefined();
      expect(res.body.data.target).toBeDefined();
    });
  });

  /* ═══ Documents ═══ */
  describe('Documents (الوثائق)', () => {
    it('GET /documents → list seed documents', async () => {
      const res = await request(app).get('/api/quality-management/documents');
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(3);
    });

    it('GET /documents?type=sop → filter by type', async () => {
      const res = await request(app).get('/api/quality-management/documents?type=sop');
      expect(res.status).toBe(200);
      res.body.data.forEach(d => expect(d.type).toBe('sop'));
    });

    it('GET /documents/:id → single document', async () => {
      const list = await request(app).get('/api/quality-management/documents');
      const id = list.body.data[0].id;
      const res = await request(app).get(`/api/quality-management/documents/${id}`);
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(id);
    });

    let createdDocId;
    it('POST /documents → create new document', async () => {
      const res = await request(app).post('/api/quality-management/documents').send({
        code: 'QMS-TEST-001',
        titleAr: 'وثيقة اختبارية',
        titleEn: 'Test Document',
        type: 'policy',
        standard: 'iso9001',
        department: 'quality',
        version: '1.0',
      });
      expect(res.status).toBe(201);
      createdDocId = res.body.data.id;
      expect(res.body.data.status).toBe('draft');
    });

    it('PUT /documents/:id → update document', async () => {
      const res = await request(app)
        .put(`/api/quality-management/documents/${createdDocId}`)
        .send({ version: '1.1' });
      expect(res.status).toBe(200);
      expect(res.body.data.version).toBe('1.1');
    });

    it('POST /documents/:id/approve → approve document', async () => {
      const res = await request(app).post(
        `/api/quality-management/documents/${createdDocId}/approve`
      );
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('approved');
      expect(res.body.data.approvedBy).toBeDefined();
    });

    it('DELETE /documents/:id → delete document', async () => {
      const res = await request(app).delete(`/api/quality-management/documents/${createdDocId}`);
      expect(res.status).toBe(200);
      const check = await request(app).get(`/api/quality-management/documents/${createdDocId}`);
      expect(check.status).toBe(404);
    });

    it('POST /documents → 400 with missing fields', async () => {
      const res = await request(app).post('/api/quality-management/documents').send({ code: 'X' });
      expect(res.status).toBe(400);
    });
  });

  /* ═══ Risk Register ═══ */
  describe('Risk Register (سجل المخاطر)', () => {
    it('GET /risks → list seed risks', async () => {
      const res = await request(app).get('/api/quality-management/risks');
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(3);
    });

    it('GET /risks/:id → single risk', async () => {
      const list = await request(app).get('/api/quality-management/risks');
      const id = list.body.data[0].id;
      const res = await request(app).get(`/api/quality-management/risks/${id}`);
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(id);
    });

    let createdRiskId;
    it('POST /risks → create new risk', async () => {
      const res = await request(app).post('/api/quality-management/risks').send({
        titleAr: 'خطر اختباري',
        titleEn: 'Test Risk',
        standard: 'iso9001',
        department: 'quality',
        likelihood: 3,
        impact: 4,
        mitigation: 'إجراء وقائي',
        owner: 'مالك الخطر',
      });
      expect(res.status).toBe(201);
      createdRiskId = res.body.data.id;
      expect(res.body.data.riskScore).toBe(12);
      expect(res.body.data.riskLevel).toBe('high');
    });

    it('POST /risks → 400 with missing fields', async () => {
      const res = await request(app)
        .post('/api/quality-management/risks')
        .send({ titleAr: 'only' });
      expect(res.status).toBe(400);
    });

    it('PUT /risks/:id → update risk', async () => {
      const res = await request(app)
        .put(`/api/quality-management/risks/${createdRiskId}`)
        .send({ likelihood: 1, impact: 2, mitigation: 'تم المعالجة' });
      expect(res.status).toBe(200);
      expect(res.body.data.riskScore).toBe(2);
      expect(res.body.data.riskLevel).toBe('very_low');
    });

    it('DELETE /risks/:id → delete risk', async () => {
      const res = await request(app).delete(`/api/quality-management/risks/${createdRiskId}`);
      expect(res.status).toBe(200);
      const check = await request(app).get(`/api/quality-management/risks/${createdRiskId}`);
      expect(check.status).toBe(404);
    });
  });

  /* ═══ Accreditation Reports ═══ */
  describe('Accreditation Reports (تقارير الاعتماد)', () => {
    let generatedReportId;

    it('POST /accreditation-reports/generate → generate CBAHI report', async () => {
      const res = await request(app)
        .post('/api/quality-management/accreditation-reports/generate')
        .send({ standard: 'cbahi', period: '2026' });
      expect(res.status).toBe(201);
      expect(res.body.data.standard).toBe('cbahi');
      expect(res.body.data.overallCompliance).toBeDefined();
      expect(res.body.data.readinessLevel).toBeDefined();
      expect(res.body.data.auditSummary).toBeDefined();
      expect(res.body.data.findingsSummary).toBeDefined();
      expect(res.body.data.ncSummary).toBeDefined();
      expect(res.body.data.recommendations).toBeDefined();
      generatedReportId = res.body.data.id;
    });

    it('POST /accreditation-reports/generate → generate JCI report', async () => {
      const res = await request(app)
        .post('/api/quality-management/accreditation-reports/generate')
        .send({ standard: 'jci', period: '2026' });
      expect(res.status).toBe(201);
      expect(res.body.data.standard).toBe('jci');
    });

    it('POST /accreditation-reports/generate → 400 for invalid standard', async () => {
      const res = await request(app)
        .post('/api/quality-management/accreditation-reports/generate')
        .send({ standard: 'nonexistent' });
      expect(res.status).toBe(400);
    });

    it('POST /accreditation-reports/generate → 400 with missing standard', async () => {
      const res = await request(app)
        .post('/api/quality-management/accreditation-reports/generate')
        .send({});
      expect(res.status).toBe(400);
    });

    it('GET /accreditation-reports → list generated reports', async () => {
      const res = await request(app).get('/api/quality-management/accreditation-reports');
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('GET /accreditation-reports/:id → single report', async () => {
      const res = await request(app).get(
        `/api/quality-management/accreditation-reports/${generatedReportId}`
      );
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(generatedReportId);
    });

    it('GET /accreditation-reports/:id → 404 for missing', async () => {
      const res = await request(app).get(
        '/api/quality-management/accreditation-reports/nonexistent'
      );
      expect(res.status).toBe(404);
    });

    it('GET /accreditation-reports/:id/export?format=json → export JSON', async () => {
      const res = await request(app).get(
        `/api/quality-management/accreditation-reports/${generatedReportId}/export?format=json`
      );
      expect(res.status).toBe(200);
      expect(res.body.data.format).toBe('json');
      expect(res.body.data.filename).toContain('cbahi');
    });

    it('GET /accreditation-reports/:id/export?format=csv → export CSV', async () => {
      const res = await request(app).get(
        `/api/quality-management/accreditation-reports/${generatedReportId}/export?format=csv`
      );
      expect(res.status).toBe(200);
      expect(res.body.data.format).toBe('csv');
      expect(res.body.data.content).toContain('Overall Compliance');
    });
  });

  /* ═══ Compliance Matrix ═══ */
  describe('Compliance Matrix (مصفوفة الامتثال)', () => {
    it('GET /compliance-matrix/cbahi → CBAHI matrix', async () => {
      const res = await request(app).get('/api/quality-management/compliance-matrix/cbahi');
      expect(res.status).toBe(200);
      expect(res.body.data.standard.id).toBe('cbahi');
      expect(res.body.data.totalClauses).toBe(285);
      expect(res.body.data.clauses).toBeDefined();
    });

    it('GET /compliance-matrix/jci → JCI matrix', async () => {
      const res = await request(app).get('/api/quality-management/compliance-matrix/jci');
      expect(res.status).toBe(200);
      expect(res.body.data.standard.id).toBe('jci');
    });

    it('GET /compliance-matrix/nonexistent → 404', async () => {
      const res = await request(app).get('/api/quality-management/compliance-matrix/nonexistent');
      expect(res.status).toBe(404);
    });
  });

  /* ═══ Audit Log ═══ */
  describe('Audit Log (سجل المراجعة)', () => {
    it('GET /audit-log → returns log entries', async () => {
      const res = await request(app).get('/api/quality-management/audit-log');
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    });

    it('GET /audit-log?entityType=system → filter by entity type', async () => {
      const res = await request(app).get('/api/quality-management/audit-log?entityType=system');
      expect(res.status).toBe(200);
      res.body.data.forEach(l => expect(l.entityType).toBe('system'));
    });
  });
});
