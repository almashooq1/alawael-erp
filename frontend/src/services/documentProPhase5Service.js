/**
 * Document Pro Phase 5 API Service — خدمة API المرحلة الخامسة
 * QR/Barcode • Calendar • Comparison • Integrations • Dashboard Widgets
 */
import apiClient from './api.client';

const BASE = '/api/documents-pro-v5';

/* ═══════ QR Code & Barcode ═══════ */
export const qrApi = {
  generate: data => apiClient.post(`${BASE}/qr/generate`, data),
  scan: code => apiClient.post(`${BASE}/qr/scan`, { code }),
  getForDocument: (docId, params) => apiClient.get(`${BASE}/qr/document/${docId}`, { params }),
  revoke: codeId => apiClient.post(`${BASE}/qr/${codeId}/revoke`),
  bulkGenerate: (ids, opts) =>
    apiClient.post(`${BASE}/qr/bulk-generate`, { documentIds: ids, ...opts }),
  createPrintJob: (ids, opts) =>
    apiClient.post(`${BASE}/qr/print-job`, { documentIds: ids, ...opts }),
  getPrintJobs: params => apiClient.get(`${BASE}/qr/print-jobs`, { params }),
  getScanHistory: (docId, params) => apiClient.get(`${BASE}/qr/scans/${docId}`, { params }),
  getTypes: () => apiClient.get(`${BASE}/qr/types`),
  getPurposes: () => apiClient.get(`${BASE}/qr/purposes`),
  getTemplates: () => apiClient.get(`${BASE}/qr/templates`),
  getStats: docId => apiClient.get(`${BASE}/qr/stats`, { params: { documentId: docId } }),
};

/* ═══════ Calendar & Deadlines ═══════ */
export const calendarApi = {
  createEvent: data => apiClient.post(`${BASE}/calendar/events`, data),
  updateEvent: (id, data) => apiClient.put(`${BASE}/calendar/events/${id}`, data),
  deleteEvent: id => apiClient.delete(`${BASE}/calendar/events/${id}`),
  completeEvent: (id, notes) => apiClient.post(`${BASE}/calendar/events/${id}/complete`, { notes }),
  snoozeEvent: (id, until) =>
    apiClient.post(`${BASE}/calendar/events/${id}/snooze`, { snoozeUntil: until }),
  respondToEvent: (id, resp) => apiClient.post(`${BASE}/calendar/events/${id}/respond`, resp),
  getEvents: params => apiClient.get(`${BASE}/calendar/events`, { params }),
  getDocEvents: docId => apiClient.get(`${BASE}/calendar/document/${docId}`),
  getDeadlines: params => apiClient.get(`${BASE}/calendar/deadlines`, { params }),
  getOverdue: () => apiClient.get(`${BASE}/calendar/overdue`),
  getTimeline: docId => apiClient.get(`${BASE}/calendar/timeline/${docId}`),
  createView: data => apiClient.post(`${BASE}/calendar/views`, data),
  getViews: () => apiClient.get(`${BASE}/calendar/views`),
  deleteView: id => apiClient.delete(`${BASE}/calendar/views/${id}`),
  getTypes: () => apiClient.get(`${BASE}/calendar/types`),
  getStats: params => apiClient.get(`${BASE}/calendar/stats`, { params }),
};

/* ═══════ Document Comparison ═══════ */
export const comparisonApi = {
  compare: (srcId, tgtId, opts) =>
    apiClient.post(`${BASE}/compare`, { sourceId: srcId, targetId: tgtId, ...opts }),
  quickCompare: (srcId, tgtId) =>
    apiClient.post(`${BASE}/compare/quick`, { sourceId: srcId, targetId: tgtId }),
  batchCompare: (baseId, ids) =>
    apiClient.post(`${BASE}/compare/batch`, { baseDocumentId: baseId, compareDocumentIds: ids }),
  getById: id => apiClient.get(`${BASE}/compare/${id}`),
  getHistory: params => apiClient.get(`${BASE}/compare/history`, { params }),
  getDocHistory: docId => apiClient.get(`${BASE}/compare/document/${docId}`),
  getStats: () => apiClient.get(`${BASE}/compare/stats`),
};

/* ═══════ External Integrations ═══════ */
export const integrationsApi = {
  create: data => apiClient.post(`${BASE}/integrations`, data),
  getAll: params => apiClient.get(`${BASE}/integrations`, { params }),
  getById: id => apiClient.get(`${BASE}/integrations/${id}`),
  update: (id, d) => apiClient.put(`${BASE}/integrations/${id}`, d),
  delete: id => apiClient.delete(`${BASE}/integrations/${id}`),
  toggle: id => apiClient.post(`${BASE}/integrations/${id}/toggle`),
  test: id => apiClient.post(`${BASE}/integrations/${id}/test`),
  getLogs: (id, p) => apiClient.get(`${BASE}/integrations/${id}/logs`, { params: p }),
  fireEvent: (ev, d) => apiClient.post(`${BASE}/integrations/fire-event`, { event: ev, data: d }),
  getProviders: () => apiClient.get(`${BASE}/integrations-meta/providers`),
  getEventTypes: () => apiClient.get(`${BASE}/integrations-meta/event-types`),
  getStats: () => apiClient.get(`${BASE}/integrations-meta/stats`),
};

/* ═══════ Dashboard Widgets ═══════ */
export const dashboardApi = {
  getWidgets: params => apiClient.get(`${BASE}/dashboard/widgets`, { params }),
  createWidget: data => apiClient.post(`${BASE}/dashboard/widgets`, data),
  updateWidget: (id, data) => apiClient.put(`${BASE}/dashboard/widgets/${id}`, data),
  deleteWidget: id => apiClient.delete(`${BASE}/dashboard/widgets/${id}`),
  getWidgetData: (key, params) =>
    apiClient.get(`${BASE}/dashboard/widgets/${key}/data`, { params }),
  getBulkData: (keys, opts) =>
    apiClient.post(`${BASE}/dashboard/widgets/bulk-data`, { widgetKeys: keys, options: opts }),
  getCategories: () => apiClient.get(`${BASE}/dashboard/categories`),
  initDefaults: () => apiClient.post(`${BASE}/dashboard/init`),
  getLayout: () => apiClient.get(`${BASE}/dashboard/layout`),
  getLayouts: () => apiClient.get(`${BASE}/dashboard/layouts`),
  saveLayout: data => apiClient.post(`${BASE}/dashboard/layout`, data),
  setDefault: layoutId => apiClient.post(`${BASE}/dashboard/layout/${layoutId}/default`),
  deleteLayout: layoutId => apiClient.delete(`${BASE}/dashboard/layout/${layoutId}`),
  addWidget: (layoutId, cfg) => apiClient.post(`${BASE}/dashboard/layout/${layoutId}/widgets`, cfg),
  removeWidget: (layoutId, key) =>
    apiClient.delete(`${BASE}/dashboard/layout/${layoutId}/widgets/${key}`),
  moveWidget: (lId, key, pos, sz) =>
    apiClient.put(`${BASE}/dashboard/layout/${lId}/widgets/${key}/position`, {
      position: pos,
      size: sz,
    }),
  resetLayout: layoutId => apiClient.post(`${BASE}/dashboard/layout/${layoutId}/reset`),
  duplicateLayout: (layoutId, name) =>
    apiClient.post(`${BASE}/dashboard/layout/${layoutId}/duplicate`, { name }),
  getStats: () => apiClient.get(`${BASE}/dashboard/stats`),
};

/* ═══════ Overview ═══════ */
export const overviewApi = {
  get: () => apiClient.get(`${BASE}/overview`),
};

export default { qrApi, calendarApi, comparisonApi, integrationsApi, dashboardApi, overviewApi };
