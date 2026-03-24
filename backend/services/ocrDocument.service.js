/**
 * OCR Document Processing Service — خدمة معالجة المستندات بالـ OCR
 * Phase 18 — مسح التقارير الطبية الورقية وتحويلها لبيانات
 *
 * Features:
 *   - Document upload & OCR text extraction (Arabic + English)
 *   - Medical report parsing (diagnoses, medications, vitals, lab results)
 *   - Template-based extraction (discharge summary, lab report, prescription, radiology, therapy)
 *   - Batch processing with queue management
 *   - Document versioning & audit trail
 *   - Beneficiary linking & medical record integration
 *   - Quality scoring & confidence metrics
 *   - Search across extracted text
 *   - Export structured data (JSON / CSV)
 */

const logger = console;

/* ══════════════════════════════════════════════════════════════════════
   CONSTANTS & REFERENCE DATA
   ══════════════════════════════════════════════════════════════════════ */

const DOCUMENT_TYPES = [
  { id: 'discharge_summary', nameAr: 'ملخص الخروج', nameEn: 'Discharge Summary' },
  { id: 'lab_report', nameAr: 'تقرير مختبر', nameEn: 'Lab Report' },
  { id: 'prescription', nameAr: 'وصفة طبية', nameEn: 'Prescription' },
  { id: 'radiology_report', nameAr: 'تقرير أشعة', nameEn: 'Radiology Report' },
  { id: 'therapy_report', nameAr: 'تقرير علاج طبيعي', nameEn: 'Therapy Report' },
  { id: 'progress_note', nameAr: 'ملاحظة تقدم', nameEn: 'Progress Note' },
  { id: 'assessment_form', nameAr: 'نموذج تقييم', nameEn: 'Assessment Form' },
  { id: 'referral_letter', nameAr: 'خطاب إحالة', nameEn: 'Referral Letter' },
  { id: 'consent_form', nameAr: 'نموذج موافقة', nameEn: 'Consent Form' },
  { id: 'insurance_claim', nameAr: 'مطالبة تأمين', nameEn: 'Insurance Claim' },
  { id: 'other', nameAr: 'أخرى', nameEn: 'Other' },
];

const OCR_ENGINES = [
  { id: 'tesseract-ar', name: 'Tesseract Arabic', lang: 'ara', accuracy: 0.87 },
  { id: 'tesseract-en', name: 'Tesseract English', lang: 'eng', accuracy: 0.92 },
  { id: 'tesseract-mixed', name: 'Tesseract Mixed', lang: 'ara+eng', accuracy: 0.85 },
  { id: 'google-vision', name: 'Google Vision API', lang: 'auto', accuracy: 0.96 },
  { id: 'azure-cognitive', name: 'Azure Cognitive Services', lang: 'auto', accuracy: 0.95 },
];

const PROCESSING_STATUSES = [
  'queued', 'preprocessing', 'ocr_running', 'parsing', 'review_needed',
  'completed', 'failed', 'archived',
];

const MEDICAL_FIELDS = {
  diagnoses: { nameAr: 'التشخيصات', nameEn: 'Diagnoses' },
  medications: { nameAr: 'الأدوية', nameEn: 'Medications' },
  vitals: { nameAr: 'العلامات الحيوية', nameEn: 'Vital Signs' },
  labResults: { nameAr: 'نتائج المختبر', nameEn: 'Lab Results' },
  procedures: { nameAr: 'الإجراءات', nameEn: 'Procedures' },
  allergies: { nameAr: 'الحساسية', nameEn: 'Allergies' },
  recommendations: { nameAr: 'التوصيات', nameEn: 'Recommendations' },
  followUp: { nameAr: 'المتابعة', nameEn: 'Follow-up' },
};

const SUPPORTED_FORMATS = ['image/jpeg', 'image/png', 'image/tiff', 'image/bmp', 'image/webp', 'application/pdf'];

/* ══════════════════════════════════════════════════════════════════════
   SERVICE CLASS
   ══════════════════════════════════════════════════════════════════════ */

class OCRDocumentService {
  constructor() {
    /** @type {Map<string, Object>} */
    this.documents = new Map();
    /** @type {Map<string, Object>} */
    this.extractedData = new Map();
    /** @type {Map<string, Object>} */
    this.templates = new Map();
    /** @type {Map<string, Object>} */
    this.batchJobs = new Map();
    /** @type {Map<string, Object>} */
    this.corrections = new Map();
    /** @type {Map<string, Object>} */
    this.exportJobs = new Map();
    /** @type {Map<string, Object>} */
    this.auditLogs = new Map();
    /** @type {Map<string, Object>} */
    this.beneficiaryDocs = new Map(); // beneficiaryId -> [docId]
    /** @type {Map<string, Object>} */
    this.processingQueue = new Map();

    this._docId = 300;
    this._extractId = 400;
    this._batchId = 500;
    this._corrId = 600;
    this._exportId = 700;
    this._auditId = 800;
    this._templateId = 900;
    this._queueId = 1000;

    this._seed();
    logger.info('[OCRDocument] Seed data loaded');
  }

  /* ── ID generators ── */
  _nextDocId() { return `doc-${++this._docId}`; }
  _nextExtractId() { return `ext-${++this._extractId}`; }
  _nextBatchId() { return `batch-${++this._batchId}`; }
  _nextCorrId() { return `corr-${++this._corrId}`; }
  _nextExportId() { return `exp-${++this._exportId}`; }
  _nextAuditId() { return `audit-${++this._auditId}`; }
  _nextTemplateId() { return `tpl-${++this._templateId}`; }
  _nextQueueId() { return `queue-${++this._queueId}`; }

  /* ══════════════════════════════════════════════════════════════════
     SEED DATA
     ══════════════════════════════════════════════════════════════════ */
  _seed() {
    const now = new Date().toISOString();

    // Templates
    const tpls = [
      {
        id: 'tpl-901', name: 'ملخص خروج عام', nameEn: 'General Discharge Summary',
        documentType: 'discharge_summary', fields: ['patientName', 'admissionDate', 'dischargeDate', 'diagnoses', 'medications', 'followUp'],
        patterns: { patientName: /اسم المريض[:\s]*(.*)/i, admissionDate: /تاريخ الدخول[:\s]*([\d/.-]+)/i },
        createdAt: now,
      },
      {
        id: 'tpl-902', name: 'تقرير مختبر شامل', nameEn: 'Comprehensive Lab Report',
        documentType: 'lab_report', fields: ['patientName', 'testDate', 'labResults', 'referenceRanges', 'notes'],
        patterns: { patientName: /Patient[:\s]*(.*)/i, testDate: /Date[:\s]*([\d/.-]+)/i },
        createdAt: now,
      },
      {
        id: 'tpl-903', name: 'وصفة طبية', nameEn: 'Medical Prescription',
        documentType: 'prescription', fields: ['patientName', 'medications', 'dosage', 'frequency', 'duration', 'doctorName'],
        patterns: { patientName: /المريض[:\s]*(.*)/i, doctorName: /الطبيب[:\s]*(.*)/i },
        createdAt: now,
      },
    ];
    tpls.forEach(t => this.templates.set(t.id, t));

    // Documents
    const docs = [
      {
        id: 'doc-301', beneficiaryId: 'ben-101', documentType: 'discharge_summary',
        fileName: 'discharge_ahmed_2026.pdf', fileSize: 245760, mimeType: 'application/pdf',
        pageCount: 3, language: 'ara+eng', ocrEngine: 'tesseract-mixed',
        status: 'completed', confidenceScore: 0.89,
        uploadedBy: 'u1', uploadedAt: '2026-03-20T10:00:00Z', processedAt: '2026-03-20T10:02:30Z',
        tags: ['خروج', 'أحمد', 'علاج_طبيعي'],
      },
      {
        id: 'doc-302', beneficiaryId: 'ben-102', documentType: 'lab_report',
        fileName: 'lab_results_sara.jpg', fileSize: 184320, mimeType: 'image/jpeg',
        pageCount: 1, language: 'eng', ocrEngine: 'tesseract-en',
        status: 'completed', confidenceScore: 0.93,
        uploadedBy: 'u2', uploadedAt: '2026-03-21T09:00:00Z', processedAt: '2026-03-21T09:01:15Z',
        tags: ['مختبر', 'سارة', 'دم'],
      },
      {
        id: 'doc-303', beneficiaryId: 'ben-103', documentType: 'prescription',
        fileName: 'prescription_omar.png', fileSize: 98304, mimeType: 'image/png',
        pageCount: 1, language: 'ara', ocrEngine: 'tesseract-ar',
        status: 'completed', confidenceScore: 0.85,
        uploadedBy: 'u1', uploadedAt: '2026-03-22T14:00:00Z', processedAt: '2026-03-22T14:01:00Z',
        tags: ['وصفة', 'عمر'],
      },
      {
        id: 'doc-304', beneficiaryId: 'ben-101', documentType: 'therapy_report',
        fileName: 'therapy_progress_ahmed.pdf', fileSize: 312000, mimeType: 'application/pdf',
        pageCount: 5, language: 'ara', ocrEngine: 'google-vision',
        status: 'review_needed', confidenceScore: 0.72,
        uploadedBy: 'u3', uploadedAt: '2026-03-23T08:00:00Z', processedAt: '2026-03-23T08:05:00Z',
        tags: ['علاج_طبيعي', 'تقدم', 'أحمد'],
      },
      {
        id: 'doc-305', beneficiaryId: 'ben-104', documentType: 'radiology_report',
        fileName: 'xray_fatima.tiff', fileSize: 524288, mimeType: 'image/tiff',
        pageCount: 2, language: 'eng', ocrEngine: 'azure-cognitive',
        status: 'queued', confidenceScore: null,
        uploadedBy: 'u2', uploadedAt: '2026-03-23T10:00:00Z', processedAt: null,
        tags: ['أشعة', 'فاطمة'],
      },
    ];
    docs.forEach(d => {
      this.documents.set(d.id, d);
      const benDocs = this.beneficiaryDocs.get(d.beneficiaryId) || [];
      benDocs.push(d.id);
      this.beneficiaryDocs.set(d.beneficiaryId, benDocs);
    });

    // Extracted data
    const extractions = [
      {
        id: 'ext-401', documentId: 'doc-301', templateId: 'tpl-901',
        rawText: 'ملخص الخروج\nاسم المريض: أحمد محمد العلي\nتاريخ الدخول: 2026-03-10\nتاريخ الخروج: 2026-03-18\nالتشخيص: شلل دماغي تشنجي - G80.0\nالأدوية: باكلوفين 10 ملغ - ثلاث مرات يومياً\nالمتابعة: مراجعة بعد أسبوعين في عيادة العلاج الطبيعي',
        structuredData: {
          patientName: 'أحمد محمد العلي',
          admissionDate: '2026-03-10',
          dischargeDate: '2026-03-18',
          diagnoses: [{ code: 'G80.0', description: 'شلل دماغي تشنجي', descriptionEn: 'Spastic cerebral palsy' }],
          medications: [{ name: 'باكلوفين', dose: '10 ملغ', frequency: 'ثلاث مرات يومياً' }],
          followUp: { date: '2026-04-01', clinic: 'عيادة العلاج الطبيعي' },
        },
        fieldConfidence: { patientName: 0.95, admissionDate: 0.92, dischargeDate: 0.90, diagnoses: 0.88, medications: 0.86, followUp: 0.84 },
        extractedAt: '2026-03-20T10:02:30Z',
      },
      {
        id: 'ext-402', documentId: 'doc-302', templateId: 'tpl-902',
        rawText: 'Lab Report\nPatient: Sara Al-Rashid\nDate: 2026-03-21\nCBC Results:\n  WBC: 7.2 x10^9/L (Normal: 4.5-11.0)\n  RBC: 4.8 x10^12/L (Normal: 4.2-5.4)\n  Hemoglobin: 13.5 g/dL (Normal: 12.0-16.0)\n  Platelets: 250 x10^9/L (Normal: 150-400)\nNotes: All values within normal range.',
        structuredData: {
          patientName: 'Sara Al-Rashid',
          testDate: '2026-03-21',
          labResults: [
            { test: 'WBC', value: 7.2, unit: 'x10^9/L', refMin: 4.5, refMax: 11.0, status: 'normal' },
            { test: 'RBC', value: 4.8, unit: 'x10^12/L', refMin: 4.2, refMax: 5.4, status: 'normal' },
            { test: 'Hemoglobin', value: 13.5, unit: 'g/dL', refMin: 12.0, refMax: 16.0, status: 'normal' },
            { test: 'Platelets', value: 250, unit: 'x10^9/L', refMin: 150, refMax: 400, status: 'normal' },
          ],
          notes: 'All values within normal range.',
        },
        fieldConfidence: { patientName: 0.97, testDate: 0.95, labResults: 0.91, notes: 0.94 },
        extractedAt: '2026-03-21T09:01:15Z',
      },
      {
        id: 'ext-403', documentId: 'doc-303', templateId: 'tpl-903',
        rawText: 'وصفة طبية\nالمريض: عمر حسن الشمري\nالطبيب: د. سلمان المطيري\nالأدوية:\n1. ريتالين 10 ملغ - مرتين يومياً - لمدة شهر\n2. أوميغا 3 - حبة واحدة يومياً - مستمر',
        structuredData: {
          patientName: 'عمر حسن الشمري',
          doctorName: 'د. سلمان المطيري',
          medications: [
            { name: 'ريتالين', dose: '10 ملغ', frequency: 'مرتين يومياً', duration: 'شهر' },
            { name: 'أوميغا 3', dose: 'حبة واحدة', frequency: 'يومياً', duration: 'مستمر' },
          ],
        },
        fieldConfidence: { patientName: 0.90, doctorName: 0.88, medications: 0.82 },
        extractedAt: '2026-03-22T14:01:00Z',
      },
    ];
    extractions.forEach(e => this.extractedData.set(e.id, e));

    // Batch job
    this.batchJobs.set('batch-501', {
      id: 'batch-501', name: 'دفعة مارس 2026', documentIds: ['doc-304', 'doc-305'],
      status: 'processing', totalDocuments: 2, processedCount: 1, failedCount: 0,
      createdBy: 'u1', createdAt: '2026-03-23T08:00:00Z',
    });

    // Corrections
    this.corrections.set('corr-601', {
      id: 'corr-601', documentId: 'doc-301', extractionId: 'ext-401',
      field: 'medications[0].dose', oldValue: '10 مغ', newValue: '10 ملغ',
      correctedBy: 'u1', correctedAt: '2026-03-20T11:00:00Z', reason: 'خطأ في OCR',
    });

    // Audit log
    this.auditLogs.set('audit-801', {
      id: 'audit-801', documentId: 'doc-301', action: 'upload',
      userId: 'u1', timestamp: '2026-03-20T10:00:00Z', details: 'تم رفع ملخص الخروج',
    });
    this.auditLogs.set('audit-802', {
      id: 'audit-802', documentId: 'doc-301', action: 'ocr_complete',
      userId: 'system', timestamp: '2026-03-20T10:02:30Z', details: 'اكتمل التعرف الضوئي بثقة 89%',
    });
  }

  /* ══════════════════════════════════════════════════════════════════
     DASHBOARD
     ══════════════════════════════════════════════════════════════════ */
  getDashboard() {
    const docs = [...this.documents.values()];
    const completed = docs.filter(d => d.status === 'completed');
    const avgConfidence = completed.length
      ? +(completed.reduce((s, d) => s + d.confidenceScore, 0) / completed.length).toFixed(2)
      : 0;

    const statusBreakdown = {};
    PROCESSING_STATUSES.forEach(s => { statusBreakdown[s] = docs.filter(d => d.status === s).length; });

    const typeBreakdown = {};
    DOCUMENT_TYPES.forEach(t => { typeBreakdown[t.id] = docs.filter(d => d.documentType === t.id).length; });

    const totalPages = docs.reduce((s, d) => s + (d.pageCount || 0), 0);
    const totalSize = docs.reduce((s, d) => s + (d.fileSize || 0), 0);

    const recentDocs = docs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt)).slice(0, 5);
    const reviewNeeded = docs.filter(d => d.status === 'review_needed');
    const corrections = [...this.corrections.values()];

    return {
      kpis: {
        totalDocuments: docs.length,
        completedDocuments: completed.length,
        pendingReview: reviewNeeded.length,
        queuedDocuments: docs.filter(d => d.status === 'queued').length,
        avgConfidence,
        totalPages,
        totalSizeMB: +(totalSize / (1024 * 1024)).toFixed(2),
        totalCorrections: corrections.length,
        activeBatches: [...this.batchJobs.values()].filter(b => b.status === 'processing').length,
        templatesCount: this.templates.size,
      },
      statusBreakdown,
      typeBreakdown,
      recentDocuments: recentDocs.map(d => ({
        id: d.id, fileName: d.fileName, documentType: d.documentType,
        status: d.status, confidenceScore: d.confidenceScore,
        uploadedAt: d.uploadedAt, beneficiaryId: d.beneficiaryId,
      })),
      reviewNeeded: reviewNeeded.map(d => ({
        id: d.id, fileName: d.fileName, confidenceScore: d.confidenceScore,
        documentType: d.documentType, beneficiaryId: d.beneficiaryId,
      })),
    };
  }

  /* ══════════════════════════════════════════════════════════════════
     REFERENCE DATA
     ══════════════════════════════════════════════════════════════════ */
  getDocumentTypes() { return DOCUMENT_TYPES; }
  getOCREngines() { return OCR_ENGINES; }
  getProcessingStatuses() { return PROCESSING_STATUSES; }
  getMedicalFields() { return MEDICAL_FIELDS; }
  getSupportedFormats() { return SUPPORTED_FORMATS; }

  /* ══════════════════════════════════════════════════════════════════
     DOCUMENTS CRUD
     ══════════════════════════════════════════════════════════════════ */
  listDocuments(filters = {}) {
    let docs = [...this.documents.values()];

    if (filters.beneficiaryId) docs = docs.filter(d => d.beneficiaryId === filters.beneficiaryId);
    if (filters.documentType) docs = docs.filter(d => d.documentType === filters.documentType);
    if (filters.status) docs = docs.filter(d => d.status === filters.status);
    if (filters.search) {
      const q = filters.search.toLowerCase();
      docs = docs.filter(d =>
        d.fileName.toLowerCase().includes(q) ||
        (d.tags || []).some(t => t.toLowerCase().includes(q))
      );
    }
    if (filters.fromDate) docs = docs.filter(d => d.uploadedAt >= filters.fromDate);
    if (filters.toDate) docs = docs.filter(d => d.uploadedAt <= filters.toDate);

    return docs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
  }

  getDocument(id) {
    const doc = this.documents.get(id);
    if (!doc) return null;

    const extraction = [...this.extractedData.values()].find(e => e.documentId === id);
    const docCorrections = [...this.corrections.values()].filter(c => c.documentId === id);
    const docAudit = [...this.auditLogs.values()].filter(a => a.documentId === id);

    return { ...doc, extraction, corrections: docCorrections, auditTrail: docAudit };
  }

  uploadDocument(data, userId) {
    const id = this._nextDocId();
    const now = new Date().toISOString();

    const doc = {
      id,
      beneficiaryId: data.beneficiaryId || null,
      documentType: data.documentType || 'other',
      fileName: data.fileName,
      fileSize: data.fileSize || 0,
      mimeType: data.mimeType || 'application/pdf',
      pageCount: data.pageCount || 1,
      language: data.language || 'ara+eng',
      ocrEngine: data.ocrEngine || 'tesseract-mixed',
      status: 'queued',
      confidenceScore: null,
      uploadedBy: userId,
      uploadedAt: now,
      processedAt: null,
      tags: data.tags || [],
    };

    this.documents.set(id, doc);

    if (data.beneficiaryId) {
      const benDocs = this.beneficiaryDocs.get(data.beneficiaryId) || [];
      benDocs.push(id);
      this.beneficiaryDocs.set(data.beneficiaryId, benDocs);
    }

    this._addAudit(id, 'upload', userId, `تم رفع ${doc.fileName}`);
    this._processDocument(id, userId);

    return doc;
  }

  updateDocument(id, data) {
    const doc = this.documents.get(id);
    if (!doc) return null;

    if (data.documentType !== undefined) doc.documentType = data.documentType;
    if (data.tags !== undefined) doc.tags = data.tags;
    if (data.language !== undefined) doc.language = data.language;
    if (data.beneficiaryId !== undefined) doc.beneficiaryId = data.beneficiaryId;

    this.documents.set(id, doc);
    return doc;
  }

  deleteDocument(id) {
    const doc = this.documents.get(id);
    if (!doc) return false;

    this.documents.delete(id);
    // Clean up related data
    [...this.extractedData.entries()]
      .filter(([, e]) => e.documentId === id)
      .forEach(([eid]) => this.extractedData.delete(eid));
    [...this.corrections.entries()]
      .filter(([, c]) => c.documentId === id)
      .forEach(([cid]) => this.corrections.delete(cid));

    return true;
  }

  /* ══════════════════════════════════════════════════════════════════
     OCR PROCESSING (SIMULATED)
     ══════════════════════════════════════════════════════════════════ */
  _processDocument(docId, _userId) {
    const doc = this.documents.get(docId);
    if (!doc) return;

    doc.status = 'preprocessing';
    this.documents.set(docId, doc);

    // Simulate OCR processing
    doc.status = 'ocr_running';
    this.documents.set(docId, doc);

    const ocrResult = this._simulateOCR(doc);

    doc.status = 'parsing';
    this.documents.set(docId, doc);

    const extraction = this._parseOCRResult(doc, ocrResult);

    doc.confidenceScore = extraction.avgConfidence;
    doc.status = extraction.avgConfidence >= 0.80 ? 'completed' : 'review_needed';
    doc.processedAt = new Date().toISOString();
    this.documents.set(docId, doc);

    this._addAudit(docId, 'ocr_complete', 'system',
      `اكتمل التعرف الضوئي بثقة ${Math.round(extraction.avgConfidence * 100)}%`);

    return extraction;
  }

  _simulateOCR(doc) {
    const engine = OCR_ENGINES.find(e => e.id === doc.ocrEngine) || OCR_ENGINES[2];
    const baseConfidence = engine.accuracy;

    // Simulate raw text based on doc type
    const templates = {
      discharge_summary: `ملخص الخروج\nاسم المريض: مستفيد ${doc.beneficiaryId}\nتاريخ الدخول: 2026-03-01\nتاريخ الخروج: 2026-03-15\nالتشخيص: حالة تأهيلية\nالعلاج: برنامج تأهيل شامل\nالمتابعة: بعد أسبوعين`,
      lab_report: `Lab Report\nPatient: Beneficiary ${doc.beneficiaryId}\nDate: 2026-03-21\nCBC Normal\nWBC: 6.5 x10^9/L\nRBC: 4.5 x10^12/L`,
      prescription: `وصفة طبية\nالمريض: مستفيد ${doc.beneficiaryId}\nالطبيب: د. المعالج\nالدواء: فيتامين د 1000 وحدة يومياً`,
      therapy_report: `تقرير العلاج الطبيعي\nالمستفيد: ${doc.beneficiaryId}\nالجلسات: 12 جلسة\nالتقدم: تحسن ملحوظ في المهارات الحركية`,
      radiology_report: `Radiology Report\nPatient: ${doc.beneficiaryId}\nExam: X-Ray Spine\nFindings: No significant abnormality`,
      default: `مستند طبي\nالمريض: مستفيد ${doc.beneficiaryId}\nالتاريخ: 2026-03-23`,
    };

    return {
      rawText: templates[doc.documentType] || templates.default,
      confidence: baseConfidence - (Math.random() * 0.1),
      pageResults: Array.from({ length: doc.pageCount || 1 }, (_, i) => ({
        page: i + 1,
        text: `صفحة ${i + 1} — ${templates[doc.documentType] || templates.default}`,
        confidence: baseConfidence - (Math.random() * 0.08),
        wordCount: 30 + Math.floor(Math.random() * 50),
      })),
    };
  }

  _parseOCRResult(doc, ocrResult) {
    const id = this._nextExtractId();
    const template = [...this.templates.values()].find(t => t.documentType === doc.documentType);

    const structuredData = this._extractStructuredData(ocrResult.rawText, doc.documentType);

    const fieldConfidence = {};
    Object.keys(structuredData).forEach(k => {
      fieldConfidence[k] = 0.75 + Math.random() * 0.22;
    });

    const avgConfidence = Object.values(fieldConfidence).length
      ? +(Object.values(fieldConfidence).reduce((s, v) => s + v, 0) / Object.values(fieldConfidence).length).toFixed(2)
      : ocrResult.confidence;

    const extraction = {
      id,
      documentId: doc.id,
      templateId: template ? template.id : null,
      rawText: ocrResult.rawText,
      structuredData,
      fieldConfidence,
      avgConfidence,
      pageResults: ocrResult.pageResults,
      extractedAt: new Date().toISOString(),
    };

    this.extractedData.set(id, extraction);
    return extraction;
  }

  _extractStructuredData(text, documentType) {
    const data = {};

    // Arabic patient name
    const nameMatch = text.match(/(?:اسم المريض|المريض|المستفيد)[:\s]*([\u0600-\u06FF\s.-]+)/i);
    if (nameMatch) data.patientName = nameMatch[1].trim();

    // English patient name
    const nameEnMatch = text.match(/Patient[:\s]*([A-Za-z\s.-]+)/i);
    if (nameEnMatch) data.patientName = nameEnMatch[1].trim();

    // Dates
    const dateMatches = text.match(/([\d]{4}[-/.][\d]{2}[-/.][\d]{2})/g);
    if (dateMatches && dateMatches.length > 0) data.documentDate = dateMatches[0];

    // Diagnosis codes
    const icdMatch = text.match(/([A-Z]\d{2}\.?\d{0,2})/g);
    if (icdMatch) data.diagnosisCodes = icdMatch;

    switch (documentType) {
      case 'discharge_summary': {
        const admMatch = text.match(/تاريخ الدخول[:\s]*([\d/.-]+)/i);
        const disMatch = text.match(/تاريخ الخروج[:\s]*([\d/.-]+)/i);
        if (admMatch) data.admissionDate = admMatch[1];
        if (disMatch) data.dischargeDate = disMatch[1];
        const followMatch = text.match(/المتابعة[:\s]*(.*)/i);
        if (followMatch) data.followUp = followMatch[1].trim();
        break;
      }
      case 'lab_report': {
        const labTests = [];
        const labRegex = /([A-Za-z]+)[:\s]*([\d.]+)\s*([a-z^/\d]+)/gi;
        let m;
        while ((m = labRegex.exec(text)) !== null) {
          if (['WBC', 'RBC', 'Hemoglobin', 'Platelets', 'HGB', 'PLT'].includes(m[1])) {
            labTests.push({ test: m[1], value: parseFloat(m[2]), unit: m[3] });
          }
        }
        if (labTests.length) data.labResults = labTests;
        break;
      }
      case 'prescription': {
        const medMatch = text.match(/(?:الدواء|الأدوية)[:\s]*(.*)/i);
        if (medMatch) data.medications = [{ description: medMatch[1].trim() }];
        const docMatch = text.match(/الطبيب[:\s]*(.*)/i);
        if (docMatch) data.doctorName = docMatch[1].trim();
        break;
      }
      case 'therapy_report': {
        const sessMatch = text.match(/الجلسات[:\s]*(\d+)/i);
        if (sessMatch) data.sessionCount = parseInt(sessMatch[1]);
        const progMatch = text.match(/التقدم[:\s]*(.*)/i);
        if (progMatch) data.progressNote = progMatch[1].trim();
        break;
      }
      case 'radiology_report': {
        const examMatch = text.match(/Exam[:\s]*(.*)/i);
        if (examMatch) data.examType = examMatch[1].trim();
        const findMatch = text.match(/Findings[:\s]*(.*)/i);
        if (findMatch) data.findings = findMatch[1].trim();
        break;
      }
      default:
        break;
    }

    return data;
  }

  /* ══════════════════════════════════════════════════════════════════
     RE-PROCESS / MANUAL TRIGGER
     ══════════════════════════════════════════════════════════════════ */
  reprocessDocument(docId, userId, options = {}) {
    const doc = this.documents.get(docId);
    if (!doc) return null;

    if (options.ocrEngine) doc.ocrEngine = options.ocrEngine;
    if (options.language) doc.language = options.language;

    // Remove old extraction
    [...this.extractedData.entries()]
      .filter(([, e]) => e.documentId === docId)
      .forEach(([eid]) => this.extractedData.delete(eid));

    this._addAudit(docId, 'reprocess', userId, `إعادة معالجة بمحرك ${doc.ocrEngine}`);
    const extraction = this._processDocument(docId, userId);
    return { document: this.documents.get(docId), extraction };
  }

  /* ══════════════════════════════════════════════════════════════════
     EXTRACTED DATA
     ══════════════════════════════════════════════════════════════════ */
  getExtraction(docId) {
    return [...this.extractedData.values()].find(e => e.documentId === docId) || null;
  }

  getExtractionById(extractionId) {
    return this.extractedData.get(extractionId) || null;
  }

  /* ══════════════════════════════════════════════════════════════════
     CORRECTIONS
     ══════════════════════════════════════════════════════════════════ */
  addCorrection(docId, data, userId) {
    const doc = this.documents.get(docId);
    if (!doc) return null;

    const extraction = [...this.extractedData.values()].find(e => e.documentId === docId);
    if (!extraction) return null;

    const id = this._nextCorrId();
    const correction = {
      id,
      documentId: docId,
      extractionId: extraction.id,
      field: data.field,
      oldValue: data.oldValue,
      newValue: data.newValue,
      correctedBy: userId,
      correctedAt: new Date().toISOString(),
      reason: data.reason || '',
    };

    this.corrections.set(id, correction);

    // Apply correction to structured data
    this._applyCorrection(extraction, data.field, data.newValue);

    this._addAudit(docId, 'correction', userId, `تصحيح ${data.field}: ${data.oldValue} → ${data.newValue}`);
    return correction;
  }

  _applyCorrection(extraction, fieldPath, newValue) {
    const parts = fieldPath.split('.');
    let target = extraction.structuredData;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      const arrMatch = part.match(/^(.+)\[(\d+)\]$/);
      if (arrMatch) {
        target = target[arrMatch[1]][parseInt(arrMatch[2])];
      } else {
        target = target[part];
      }
      if (!target) return;
    }

    const lastPart = parts[parts.length - 1];
    const lastArrMatch = lastPart.match(/^(.+)\[(\d+)\]$/);
    if (lastArrMatch) {
      target[lastArrMatch[1]][parseInt(lastArrMatch[2])] = newValue;
    } else {
      target[lastPart] = newValue;
    }
  }

  listCorrections(docId) {
    if (docId) return [...this.corrections.values()].filter(c => c.documentId === docId);
    return [...this.corrections.values()];
  }

  /* ══════════════════════════════════════════════════════════════════
     TEMPLATES
     ══════════════════════════════════════════════════════════════════ */
  listTemplates() {
    return [...this.templates.values()];
  }

  getTemplate(id) {
    return this.templates.get(id) || null;
  }

  createTemplate(data) {
    const id = this._nextTemplateId();
    const template = {
      id,
      name: data.name,
      nameEn: data.nameEn || '',
      documentType: data.documentType,
      fields: data.fields || [],
      patterns: data.patterns || {},
      createdAt: new Date().toISOString(),
    };
    this.templates.set(id, template);
    return template;
  }

  updateTemplate(id, data) {
    const tpl = this.templates.get(id);
    if (!tpl) return null;

    if (data.name !== undefined) tpl.name = data.name;
    if (data.nameEn !== undefined) tpl.nameEn = data.nameEn;
    if (data.fields !== undefined) tpl.fields = data.fields;
    if (data.documentType !== undefined) tpl.documentType = data.documentType;

    this.templates.set(id, tpl);
    return tpl;
  }

  deleteTemplate(id) {
    return this.templates.delete(id);
  }

  /* ══════════════════════════════════════════════════════════════════
     BATCH PROCESSING
     ══════════════════════════════════════════════════════════════════ */
  createBatch(data, userId) {
    const id = this._nextBatchId();
    const batch = {
      id,
      name: data.name || `دفعة ${new Date().toLocaleDateString('ar-SA')}`,
      documentIds: [],
      status: 'processing',
      totalDocuments: 0,
      processedCount: 0,
      failedCount: 0,
      createdBy: userId,
      createdAt: new Date().toISOString(),
    };
    this.batchJobs.set(id, batch);
    return batch;
  }

  addDocumentToBatch(batchId, docId) {
    const batch = this.batchJobs.get(batchId);
    if (!batch) return null;
    const doc = this.documents.get(docId);
    if (!doc) return null;

    if (!batch.documentIds.includes(docId)) {
      batch.documentIds.push(docId);
      batch.totalDocuments = batch.documentIds.length;
    }
    this.batchJobs.set(batchId, batch);
    return batch;
  }

  processBatch(batchId, userId) {
    const batch = this.batchJobs.get(batchId);
    if (!batch) return null;

    batch.status = 'processing';
    batch.processedCount = 0;
    batch.failedCount = 0;

    for (const docId of batch.documentIds) {
      try {
        this._processDocument(docId, userId);
        batch.processedCount++;
      } catch {
        batch.failedCount++;
      }
    }

    batch.status = batch.failedCount === batch.totalDocuments ? 'failed'
      : batch.failedCount > 0 ? 'partial' : 'completed';

    this.batchJobs.set(batchId, batch);
    return batch;
  }

  getBatch(id) {
    const batch = this.batchJobs.get(id);
    if (!batch) return null;
    const docs = batch.documentIds.map(did => this.documents.get(did)).filter(Boolean);
    return { ...batch, documents: docs };
  }

  listBatches() {
    return [...this.batchJobs.values()].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  /* ══════════════════════════════════════════════════════════════════
     SEARCH
     ══════════════════════════════════════════════════════════════════ */
  searchDocuments(query) {
    const q = query.toLowerCase();
    const results = [];

    for (const ext of this.extractedData.values()) {
      if (ext.rawText.toLowerCase().includes(q)) {
        const doc = this.documents.get(ext.documentId);
        if (!doc) continue;

        // Find snippet
        const idx = ext.rawText.toLowerCase().indexOf(q);
        const start = Math.max(0, idx - 40);
        const end = Math.min(ext.rawText.length, idx + q.length + 40);
        const snippet = ext.rawText.substring(start, end);

        results.push({
          documentId: doc.id,
          fileName: doc.fileName,
          documentType: doc.documentType,
          beneficiaryId: doc.beneficiaryId,
          snippet,
          matchPosition: idx,
          confidence: doc.confidenceScore,
        });
      }
    }

    return results;
  }

  /* ══════════════════════════════════════════════════════════════════
     BENEFICIARY DOCUMENTS
     ══════════════════════════════════════════════════════════════════ */
  getBeneficiaryDocuments(beneficiaryId) {
    const docIds = this.beneficiaryDocs.get(beneficiaryId) || [];
    return docIds.map(id => this.documents.get(id)).filter(Boolean)
      .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
  }

  getBeneficiaryMedicalSummary(beneficiaryId) {
    const docIds = this.beneficiaryDocs.get(beneficiaryId) || [];
    const docs = docIds.map(id => this.documents.get(id)).filter(Boolean);
    const extractions = docIds
      .map(id => [...this.extractedData.values()].find(e => e.documentId === id))
      .filter(Boolean);

    const allDiagnoses = [];
    const allMedications = [];
    const allLabResults = [];
    const allProcedures = [];

    for (const ext of extractions) {
      const sd = ext.structuredData;
      if (sd.diagnoses) allDiagnoses.push(...(Array.isArray(sd.diagnoses) ? sd.diagnoses : [sd.diagnoses]));
      if (sd.medications) allMedications.push(...(Array.isArray(sd.medications) ? sd.medications : [sd.medications]));
      if (sd.labResults) allLabResults.push(...(Array.isArray(sd.labResults) ? sd.labResults : [sd.labResults]));
      if (sd.diagnosisCodes) allDiagnoses.push(...sd.diagnosisCodes.map(c => ({ code: c })));
    }

    return {
      beneficiaryId,
      documentCount: docs.length,
      documents: docs.map(d => ({ id: d.id, fileName: d.fileName, documentType: d.documentType, uploadedAt: d.uploadedAt, status: d.status })),
      medicalSummary: {
        diagnoses: allDiagnoses,
        medications: allMedications,
        labResults: allLabResults,
        procedures: allProcedures,
        lastDocumentDate: docs.length ? docs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))[0].uploadedAt : null,
      },
    };
  }

  /* ══════════════════════════════════════════════════════════════════
     EXPORT
     ══════════════════════════════════════════════════════════════════ */
  exportDocument(docId, format = 'json') {
    const doc = this.documents.get(docId);
    if (!doc) return null;

    const extraction = [...this.extractedData.values()].find(e => e.documentId === docId);
    if (!extraction) return null;

    const id = this._nextExportId();
    const exportJob = {
      id,
      documentId: docId,
      format,
      status: 'completed',
      data: format === 'json'
        ? extraction.structuredData
        : this._toCSV(extraction.structuredData),
      createdAt: new Date().toISOString(),
    };

    this.exportJobs.set(id, exportJob);
    return exportJob;
  }

  _toCSV(data) {
    const rows = [['Field', 'Value']];
    const flatten = (obj, prefix = '') => {
      for (const [k, v] of Object.entries(obj)) {
        const key = prefix ? `${prefix}.${k}` : k;
        if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
          flatten(v, key);
        } else {
          rows.push([key, Array.isArray(v) ? JSON.stringify(v) : String(v)]);
        }
      }
    };
    flatten(data);
    return rows.map(r => r.join(',')).join('\n');
  }

  /* ══════════════════════════════════════════════════════════════════
     AUDIT
     ══════════════════════════════════════════════════════════════════ */
  _addAudit(docId, action, userId, details) {
    const id = this._nextAuditId();
    this.auditLogs.set(id, {
      id, documentId: docId, action, userId,
      timestamp: new Date().toISOString(), details,
    });
  }

  getAuditLog(docId) {
    if (docId) {
      return [...this.auditLogs.values()]
        .filter(a => a.documentId === docId)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }
    return [...this.auditLogs.values()]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  /* ══════════════════════════════════════════════════════════════════
     STATISTICS
     ══════════════════════════════════════════════════════════════════ */
  getStatistics() {
    const docs = [...this.documents.values()];
    const completed = docs.filter(d => d.status === 'completed');
    const corrections = [...this.corrections.values()];

    // Confidence distribution
    const confBuckets = { low: 0, medium: 0, high: 0, veryHigh: 0 };
    completed.forEach(d => {
      if (d.confidenceScore < 0.7) confBuckets.low++;
      else if (d.confidenceScore < 0.85) confBuckets.medium++;
      else if (d.confidenceScore < 0.95) confBuckets.high++;
      else confBuckets.veryHigh++;
    });

    // Processing time (simulated)
    const avgProcessingTimeSec = completed.length
      ? +(completed.reduce((s, d) => {
          if (!d.processedAt || !d.uploadedAt) return s;
          return s + (new Date(d.processedAt) - new Date(d.uploadedAt)) / 1000;
        }, 0) / completed.length).toFixed(1)
      : 0;

    // Engine usage
    const engineUsage = {};
    docs.forEach(d => { engineUsage[d.ocrEngine] = (engineUsage[d.ocrEngine] || 0) + 1; });

    // Type distribution
    const typeDistribution = {};
    docs.forEach(d => { typeDistribution[d.documentType] = (typeDistribution[d.documentType] || 0) + 1; });

    // Language distribution
    const langDistribution = {};
    docs.forEach(d => { langDistribution[d.language] = (langDistribution[d.language] || 0) + 1; });

    return {
      totalDocuments: docs.length,
      completedDocuments: completed.length,
      avgConfidence: completed.length
        ? +(completed.reduce((s, d) => s + d.confidenceScore, 0) / completed.length).toFixed(2)
        : 0,
      avgProcessingTimeSec,
      totalCorrections: corrections.length,
      correctionsRate: completed.length ? +(corrections.length / completed.length).toFixed(2) : 0,
      confidenceDistribution: confBuckets,
      engineUsage,
      typeDistribution,
      languageDistribution: langDistribution,
      totalPages: docs.reduce((s, d) => s + (d.pageCount || 0), 0),
      totalSizeMB: +(docs.reduce((s, d) => s + (d.fileSize || 0), 0) / (1024 * 1024)).toFixed(2),
    };
  }

  /* ══════════════════════════════════════════════════════════════════
     APPROVE / REJECT REVIEW
     ══════════════════════════════════════════════════════════════════ */
  approveDocument(docId, userId) {
    const doc = this.documents.get(docId);
    if (!doc) return null;
    if (doc.status !== 'review_needed') return { error: 'المستند ليس في حالة مراجعة' };

    doc.status = 'completed';
    this.documents.set(docId, doc);
    this._addAudit(docId, 'approved', userId, 'تمت الموافقة على المستند');
    return doc;
  }

  rejectDocument(docId, userId, reason) {
    const doc = this.documents.get(docId);
    if (!doc) return null;
    if (doc.status !== 'review_needed') return { error: 'المستند ليس في حالة مراجعة' };

    doc.status = 'failed';
    this.documents.set(docId, doc);
    this._addAudit(docId, 'rejected', userId, `تم رفض المستند: ${reason || 'بدون سبب'}`);
    return doc;
  }
}

module.exports = new OCRDocumentService();
