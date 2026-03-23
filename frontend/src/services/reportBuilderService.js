import api from './api';
const BASE = '/report-builder';

const reportBuilderService = {
  // ── Dashboard ──
  getDashboardOverview: () => api.get(`${BASE}/dashboard/overview`),

  // ── Data Sources ──
  getDataSources: () => api.get(`${BASE}/data-sources`),
  getFieldsForSource: sourceId => api.get(`${BASE}/data-sources/${sourceId}/fields`),

  // ── Reports CRUD ──
  getAllReports: (params = {}) => api.get(`${BASE}/reports`, { params }),
  getReportById: id => api.get(`${BASE}/reports/${id}`),
  createReport: data => api.post(`${BASE}/reports`, data),
  updateReport: (id, data) => api.put(`${BASE}/reports/${id}`, data),
  deleteReport: id => api.delete(`${BASE}/reports/${id}`),
  duplicateReport: id => api.post(`${BASE}/reports/${id}/duplicate`),

  // ── Designer — Columns (Drag & Drop) ──
  addColumn: (reportId, data) => api.post(`${BASE}/reports/${reportId}/columns`, data),
  removeColumn: (reportId, fieldId) => api.delete(`${BASE}/reports/${reportId}/columns/${fieldId}`),
  reorderColumns: (reportId, orderedFieldIds) =>
    api.put(`${BASE}/reports/${reportId}/columns/reorder`, { orderedFieldIds }),

  // ── Designer — Filters ──
  addFilter: (reportId, data) => api.post(`${BASE}/reports/${reportId}/filters`, data),
  removeFilter: (reportId, filterId) =>
    api.delete(`${BASE}/reports/${reportId}/filters/${filterId}`),
  updateFilter: (reportId, filterId, data) =>
    api.put(`${BASE}/reports/${reportId}/filters/${filterId}`, data),

  // ── Designer — Sorting & Grouping ──
  setSorting: (reportId, sorting) => api.put(`${BASE}/reports/${reportId}/sorting`, { sorting }),
  setGroupBy: (reportId, groupBy) => api.put(`${BASE}/reports/${reportId}/group-by`, { groupBy }),

  // ── Designer — Calculated Fields ──
  addCalculatedField: (reportId, data) =>
    api.post(`${BASE}/reports/${reportId}/calculated-fields`, data),
  removeCalculatedField: (reportId, fieldId) =>
    api.delete(`${BASE}/reports/${reportId}/calculated-fields/${fieldId}`),

  // ── Designer — Chart ──
  setChartConfig: (reportId, chartConfig) =>
    api.put(`${BASE}/reports/${reportId}/chart`, { chartConfig }),

  // ── Execution ──
  executeReport: (reportId, params = {}) => api.post(`${BASE}/reports/${reportId}/execute`, params),
  getExecutionHistory: (reportId, params = {}) =>
    api.get(`${BASE}/reports/${reportId}/executions`, { params }),

  // ── Templates ──
  getTemplates: (params = {}) => api.get(`${BASE}/templates`, { params }),
  getTemplateById: id => api.get(`${BASE}/templates/${id}`),
  createReportFromTemplate: templateId => api.post(`${BASE}/templates/${templateId}/create-report`),
  saveAsTemplate: (reportId, data) =>
    api.post(`${BASE}/reports/${reportId}/save-as-template`, data),

  // ── Export ──
  exportReport: (reportId, format) => api.post(`${BASE}/reports/${reportId}/export`, { format }),

  // ── Schedules ──
  getSchedules: (params = {}) => api.get(`${BASE}/schedules`, { params }),
  createSchedule: data => api.post(`${BASE}/schedules`, data),
  updateSchedule: (id, data) => api.put(`${BASE}/schedules/${id}`, data),
  deleteSchedule: id => api.delete(`${BASE}/schedules/${id}`),

  // ── Sharing ──
  shareReport: (reportId, data) => api.post(`${BASE}/reports/${reportId}/share`, data),
  getReportShares: reportId => api.get(`${BASE}/reports/${reportId}/shares`),

  // ── Favorites ──
  toggleFavorite: reportId => api.post(`${BASE}/reports/${reportId}/favorite`),
  getUserFavorites: () => api.get(`${BASE}/favorites`),

  // ── Version History ──
  getReportVersions: reportId => api.get(`${BASE}/reports/${reportId}/versions`),
};

export default reportBuilderService;
