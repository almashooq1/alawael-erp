/**
 * 🏦 الضرائب السعودية — Saudi Tax Service (ZATCA)
 * AlAwael ERP — Frontend API Integration
 *
 * Covers: VAT Returns, Tax Filings, Withholding Tax, Zakat
 */
import apiClient from 'services/api.client';

const BASE = '/saudi-tax';

const saudiTaxService = {
  // ── VAT Returns (إقرارات ضريبة القيمة المضافة) ─────────────────────────
  vat: {
    getAll: (params = {}) => apiClient.get(`${BASE}/vat-returns`, { params }),
    getById: id => apiClient.get(`${BASE}/vat-returns/${id}`),
    create: data => apiClient.post(`${BASE}/vat-returns`, data),
    update: (id, data) => apiClient.put(`${BASE}/vat-returns/${id}`, data),
    file: id => apiClient.post(`${BASE}/vat-returns/${id}/file`),
    pay: (id, data) => apiClient.post(`${BASE}/vat-returns/${id}/pay`, data),
  },

  // ── Tax Filings (الإقرارات الضريبية) ────────────────────────────────────
  filings: {
    getAll: (params = {}) => apiClient.get(`${BASE}/tax-filings`, { params }),
    getById: id => apiClient.get(`${BASE}/tax-filings/${id}`),
    create: data => apiClient.post(`${BASE}/tax-filings`, data),
    update: (id, data) => apiClient.put(`${BASE}/tax-filings/${id}`, data),
    submit: id => apiClient.post(`${BASE}/tax-filings/${id}/submit`),
    approve: id => apiClient.post(`${BASE}/tax-filings/${id}/approve`),
    amend: id => apiClient.post(`${BASE}/tax-filings/${id}/amend`),
  },

  // ── Withholding Tax (ضريبة الاستقطاع) ──────────────────────────────────
  withholding: {
    getAll: (params = {}) => apiClient.get(`${BASE}/withholding-tax`, { params }),
    getById: id => apiClient.get(`${BASE}/withholding-tax/${id}`),
    create: data => apiClient.post(`${BASE}/withholding-tax`, data),
    update: (id, data) => apiClient.put(`${BASE}/withholding-tax/${id}`, data),
    file: id => apiClient.post(`${BASE}/withholding-tax/${id}/file`),
  },

  // ── Statistics & Utilities ──────────────────────────────────────────────
  getStatistics: () => apiClient.get(`${BASE}/statistics`),
  getUpcomingDeadlines: () => apiClient.get(`${BASE}/upcoming-deadlines`),
  calculateZakat: data => apiClient.post(`${BASE}/zakat/calculate`, data),
};

export default saudiTaxService;
