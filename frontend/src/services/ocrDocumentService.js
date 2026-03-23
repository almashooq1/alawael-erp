/**
 * OCR Document Service — خدمة معالجة المستندات بالتعرف الضوئي
 * Phase 18 — Frontend API layer
 */
import api from './api';

const BASE = '/ocr-documents';

const ocrDocumentService = {
  /* ── Dashboard ── */
  getDashboard: () => api.get(`${BASE}/dashboard`),

  /* ── Reference Data ── */
  getDocumentTypes: () => api.get(`${BASE}/document-types`),
  getOCREngines: () => api.get(`${BASE}/ocr-engines`),
  getProcessingStatuses: () => api.get(`${BASE}/processing-statuses`),
  getMedicalFields: () => api.get(`${BASE}/medical-fields`),
  getSupportedFormats: () => api.get(`${BASE}/supported-formats`),
  getStatistics: () => api.get(`${BASE}/statistics`),

  /* ── Documents CRUD ── */
  listDocuments: (params = {}) => api.get(`${BASE}/documents`, { params }),
  getDocument: (id) => api.get(`${BASE}/documents/${id}`),
  uploadDocument: (data) => api.post(`${BASE}/documents`, data),
  updateDocument: (id, data) => api.put(`${BASE}/documents/${id}`, data),
  deleteDocument: (id) => api.delete(`${BASE}/documents/${id}`),

  /* ── OCR Processing ── */
  reprocessDocument: (id, options = {}) => api.post(`${BASE}/documents/${id}/reprocess`, options),

  /* ── Extracted Data ── */
  getExtraction: (docId) => api.get(`${BASE}/documents/${docId}/extraction`),
  getExtractionById: (extractionId) => api.get(`${BASE}/extractions/${extractionId}`),

  /* ── Corrections ── */
  listCorrections: (docId) => api.get(`${BASE}/documents/${docId}/corrections`),
  addCorrection: (docId, data) => api.post(`${BASE}/documents/${docId}/corrections`, data),

  /* ── Review ── */
  approveDocument: (id) => api.put(`${BASE}/documents/${id}/approve`),
  rejectDocument: (id, reason) => api.put(`${BASE}/documents/${id}/reject`, { reason }),

  /* ── Templates ── */
  listTemplates: () => api.get(`${BASE}/templates`),
  getTemplate: (id) => api.get(`${BASE}/templates/${id}`),
  createTemplate: (data) => api.post(`${BASE}/templates`, data),
  updateTemplate: (id, data) => api.put(`${BASE}/templates/${id}`, data),
  deleteTemplate: (id) => api.delete(`${BASE}/templates/${id}`),

  /* ── Batches ── */
  listBatches: () => api.get(`${BASE}/batches`),
  getBatch: (id) => api.get(`${BASE}/batches/${id}`),
  createBatch: (data) => api.post(`${BASE}/batches`, data),
  addDocumentToBatch: (batchId, documentId) =>
    api.post(`${BASE}/batches/${batchId}/add-document`, { documentId }),
  processBatch: (batchId) => api.post(`${BASE}/batches/${batchId}/process`),

  /* ── Search ── */
  searchDocuments: (q) => api.get(`${BASE}/search`, { params: { q } }),

  /* ── Beneficiary Docs ── */
  getBeneficiaryDocuments: (beneficiaryId) =>
    api.get(`${BASE}/beneficiaries/${beneficiaryId}/documents`),
  getBeneficiaryMedicalSummary: (beneficiaryId) =>
    api.get(`${BASE}/beneficiaries/${beneficiaryId}/medical-summary`),

  /* ── Export ── */
  exportDocument: (docId, format = 'json') =>
    api.get(`${BASE}/documents/${docId}/export`, { params: { format } }),

  /* ── Audit ── */
  getAuditLog: (params = {}) => api.get(`${BASE}/audit-log`, { params }),
  getDocumentAuditLog: (docId) => api.get(`${BASE}/documents/${docId}/audit-log`),
};

export default ocrDocumentService;
