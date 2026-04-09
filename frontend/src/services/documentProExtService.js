/**
 * Document Pro Extended Service — خدمة إدارة المستندات الاحترافية (الموسعة)
 * ═══════════════════════════════════════════════════════════════════════════
 * واجهة API للتوقيع الرقمي، الإصدارات، القوالب، التدقيق، العمليات المجمعة
 */

import apiClient from './api.client';

const BASE = '/api/documents-pro-ext';

async function request(method, url, data = null, params = null) {
  try {
    const config = { method, url: `${BASE}${url}` };
    if (data) config.data = data;
    if (params) config.params = params;
    const response = await apiClient(config);
    return response.data;
  } catch (err) {
    const message = err.response?.data?.message || err.message || 'خطأ غير متوقع';
    console.error(`[DocumentProExt] ${method} ${url}: ${message}`);
    throw err;
  }
}

// ═══════════════════════════════════════════════════════════
//  ✍️ التوقيع الرقمي — Digital Signatures
// ═══════════════════════════════════════════════════════════

export const signatureApi = {
  sign: data => request('post', '/signatures/sign', data),
  getDocumentSignatures: documentId => request('get', `/signatures/document/${documentId}`),
  verify: signatureId => request('post', `/signatures/verify/${signatureId}`),
  createRequest: data => request('post', '/signatures/request', data),
  getPending: () => request('get', '/signatures/pending'),
};

// ═══════════════════════════════════════════════════════════
//  📌 إدارة الإصدارات — Version Management
// ═══════════════════════════════════════════════════════════

export const versionApi = {
  create: data => request('post', '/versions/create', data),
  getHistory: (documentId, params) =>
    request('get', `/versions/document/${documentId}`, null, params),
  getVersion: (documentId, versionNumber) =>
    request('get', `/versions/document/${documentId}/${versionNumber}`),
  compare: data => request('post', '/versions/compare', data),
  restore: data => request('post', '/versions/restore', data),
  delete: (documentId, versionNumber) =>
    request('delete', `/versions/document/${documentId}/${versionNumber}`),
};

// ═══════════════════════════════════════════════════════════
//  📄 القوالب — Templates
// ═══════════════════════════════════════════════════════════

export const templateApi = {
  getAll: params => request('get', '/templates', null, params),
  getStats: () => request('get', '/templates/stats'),
  initialize: () => request('post', '/templates/initialize'),
  getById: templateId => request('get', `/templates/${templateId}`),
  create: data => request('post', '/templates', data),
  update: (templateId, data) => request('put', `/templates/${templateId}`, data),
  delete: templateId => request('delete', `/templates/${templateId}`),
  generate: (templateId, data) => request('post', `/templates/${templateId}/generate`, data),
  preview: templateId => request('get', `/templates/${templateId}/preview`),
  duplicate: templateId => request('post', `/templates/${templateId}/duplicate`),
};

// ═══════════════════════════════════════════════════════════
//  🔍 سجل التدقيق — Audit Trail
// ═══════════════════════════════════════════════════════════

export const auditApi = {
  getDocumentLog: (documentId, params) =>
    request('get', `/audit/document/${documentId}`, null, params),
  getUserLog: (userId, params) => request('get', `/audit/user/${userId}`, null, params),
  getSuspicious: params => request('get', '/audit/suspicious', null, params),
  getCompliance: params => request('get', '/audit/compliance', null, params),
  verifyChain: params => request('get', '/audit/verify-chain', null, params),
  getStats: () => request('get', '/audit/stats'),
};

// ═══════════════════════════════════════════════════════════
//  📦 العمليات المجمعة — Bulk Operations
// ═══════════════════════════════════════════════════════════

export const bulkApi = {
  delete: data => request('post', '/bulk/delete', data),
  archive: data => request('post', '/bulk/archive', data),
  restore: data => request('post', '/bulk/restore', data),
  classify: data => request('post', '/bulk/classify', data),
  tag: data => request('post', '/bulk/tag', data),
  move: data => request('post', '/bulk/move', data),
  share: data => request('post', '/bulk/share', data),
  updateStatus: data => request('post', '/bulk/update-status', data),
  updateMetadata: data => request('post', '/bulk/update-metadata', data),
  getJobs: params => request('get', '/bulk/jobs', null, params),
  getJobStatus: jobId => request('get', `/bulk/jobs/${jobId}`),
  cancelJob: jobId => request('post', `/bulk/jobs/${jobId}/cancel`),
  getStats: () => request('get', '/bulk/stats'),
};

// ═══════════════════════════════════════════════════════════
//  📊 لوحة التحكم الموسعة
// ═══════════════════════════════════════════════════════════

export const extDashboard = {
  get: () => request('get', '/ext-dashboard'),
};

export default {
  signature: signatureApi,
  version: versionApi,
  template: templateApi,
  audit: auditApi,
  bulk: bulkApi,
  dashboard: extDashboard,
};
