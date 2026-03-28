/**
 * 💰 العمليات المالية — Finance Operations Service
 * AlAwael ERP — Frontend API Integration
 *
 * Covers: Invoices, Journal Entries, Petty Cash, Cash Flows, Cheques, Bank Reconciliations
 */
import apiClient from 'services/api.client';

const BASE = '/finance-operations';

const financeOperationsService = {
  // ── Invoices (الفواتير) ─────────────────────────────────────────────────
  invoices: {
    getAll: (params = {}) => apiClient.get(`${BASE}/invoices`, { params }),
    getById: id => apiClient.get(`${BASE}/invoices/${id}`),
    create: data => apiClient.post(`${BASE}/invoices`, data),
    update: (id, data) => apiClient.put(`${BASE}/invoices/${id}`, data),
    cancel: id => apiClient.post(`${BASE}/invoices/${id}/cancel`),
    pay: (id, data) => apiClient.post(`${BASE}/invoices/${id}/pay`, data),
  },

  // ── Journal Entries (القيود المحاسبية) ──────────────────────────────────
  journalEntries: {
    getAll: (params = {}) => apiClient.get(`${BASE}/journal-entries`, { params }),
    getById: id => apiClient.get(`${BASE}/journal-entries/${id}`),
    create: data => apiClient.post(`${BASE}/journal-entries`, data),
    update: (id, data) => apiClient.put(`${BASE}/journal-entries/${id}`, data),
  },

  // ── Petty Cash (الصندوق النثري) ────────────────────────────────────────
  pettyCash: {
    getAll: (params = {}) => apiClient.get(`${BASE}/petty-cash`, { params }),
    getById: id => apiClient.get(`${BASE}/petty-cash/${id}`),
    create: data => apiClient.post(`${BASE}/petty-cash`, data),
    update: (id, data) => apiClient.put(`${BASE}/petty-cash/${id}`, data),
    replenish: (id, data) => apiClient.post(`${BASE}/petty-cash/${id}/replenish`, data),
  },

  // ── Cash Flows (التدفقات النقدية) ───────────────────────────────────────
  cashFlows: {
    getAll: (params = {}) => apiClient.get(`${BASE}/cash-flows`, { params }),
    getById: id => apiClient.get(`${BASE}/cash-flows/${id}`),
    create: data => apiClient.post(`${BASE}/cash-flows`, data),
    update: (id, data) => apiClient.put(`${BASE}/cash-flows/${id}`, data),
    getSummary: (params = {}) => apiClient.get(`${BASE}/cash-flows/summary`, { params }),
  },

  // ── Cheques (الشيكات) ──────────────────────────────────────────────────
  cheques: {
    getAll: (params = {}) => apiClient.get(`${BASE}/cheques`, { params }),
    getById: id => apiClient.get(`${BASE}/cheques/${id}`),
    create: data => apiClient.post(`${BASE}/cheques`, data),
    update: (id, data) => apiClient.put(`${BASE}/cheques/${id}`, data),
    clear: id => apiClient.post(`${BASE}/cheques/${id}/clear`),
    bounce: id => apiClient.post(`${BASE}/cheques/${id}/bounce`),
    cancel: id => apiClient.post(`${BASE}/cheques/${id}/cancel`),
  },

  // ── Bank Reconciliations (التسويات البنكية) ─────────────────────────────
  bankReconciliations: {
    getAll: (params = {}) => apiClient.get(`${BASE}/bank-reconciliations`, { params }),
    getById: id => apiClient.get(`${BASE}/bank-reconciliations/${id}`),
    create: data => apiClient.post(`${BASE}/bank-reconciliations`, data),
    update: (id, data) => apiClient.put(`${BASE}/bank-reconciliations/${id}`, data),
    reconcile: id => apiClient.post(`${BASE}/bank-reconciliations/${id}/reconcile`),
  },
};

export default financeOperationsService;
