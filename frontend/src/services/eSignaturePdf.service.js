/**
 * E-Signature PDF Service
 * خدمة إنشاء شهادات PDF والتحقق العلني
 */
import api from './api.client';

const eSignaturePdfService = {
  /* ─── PDF Generation ───────────────────────────────────────────── */
  generatePdf: (id) => api.post(`/e-signature-pdf/generate/${id}`),
  downloadPdf: (id) => api.get(`/e-signature-pdf/download/${id}`, { responseType: 'blob' }),

  /* ─── Document Upload ──────────────────────────────────────────── */
  uploadDocument: (formData) =>
    api.post('/e-signature-pdf/upload-document', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  /* ─── Stamp PDF ────────────────────────────────────────────────── */
  stampPdf: (stampId, data) => api.post(`/e-signature-pdf/stamp-pdf/${stampId}`, data),

  /* ─── Public Verification (no auth) ────────────────────────────── */
  publicVerify: (code) => api.get(`/e-signature-pdf/public/verify/${code}`),
};

export default eSignaturePdfService;
