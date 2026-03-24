/**
 * Import/Export Pro Service (Frontend)
 * =====================================
 * خدمة الاستيراد والتصدير الاحترافية
 * Frontend API service for import/export operations
 */

import apiClient from './api.client';

const BASE = '/import-export-pro';

const importExportProService = {
  // ─── INFO ───
  getInfo: () => apiClient.get(`${BASE}/info`),

  // ─── EXPORT ───
  createExport: async params => {
    const response = await apiClient.post(`${BASE}/export`, params, {
      responseType: 'blob',
      timeout: 120000,
    });
    return response;
  },

  previewExport: params => apiClient.post(`${BASE}/export/preview`, params),

  bulkExport: async params => {
    const response = await apiClient.post(`${BASE}/export/bulk`, params, {
      responseType: 'blob',
      timeout: 300000,
    });
    return response;
  },

  // ─── IMPORT ───
  parseImportFile: (file, module, options = {}) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('module', module);
    if (Object.keys(options).length > 0) {
      formData.append('options', JSON.stringify(options));
    }
    return apiClient.post(`${BASE}/import/parse`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    });
  },

  executeImport: (file, module, columnMappings, options = {}, jobName) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('module', module);
    formData.append('columnMappings', JSON.stringify(columnMappings));
    formData.append('options', JSON.stringify(options));
    if (jobName) formData.append('jobName', jobName);
    return apiClient.post(`${BASE}/import/execute`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    });
  },

  validateImport: (file, module, columnMappings) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('module', module);
    formData.append('columnMappings', JSON.stringify(columnMappings));
    return apiClient.post(`${BASE}/import/validate`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    });
  },

  // ─── TEMPLATES ───
  listTemplates: (params = {}) => apiClient.get(`${BASE}/templates`, { params }),
  getTemplate: id => apiClient.get(`${BASE}/templates/${id}`),
  createTemplate: data => apiClient.post(`${BASE}/templates`, data),
  updateTemplate: (id, data) => apiClient.put(`${BASE}/templates/${id}`, data),
  deleteTemplate: id => apiClient.delete(`${BASE}/templates/${id}`),

  downloadTemplate: async (module, format = 'xlsx', templateId) => {
    const params = { format };
    if (templateId) params.templateId = templateId;
    const response = await apiClient.get(`${BASE}/templates/download/${module}`, {
      params,
      responseType: 'blob',
      timeout: 30000,
    });
    return response;
  },

  // ─── JOBS ───
  listJobs: (params = {}) => apiClient.get(`${BASE}/jobs`, { params }),
  getJob: id => apiClient.get(`${BASE}/jobs/${id}`),
  cancelJob: id => apiClient.post(`${BASE}/jobs/${id}/cancel`),
  retryJob: id => apiClient.post(`${BASE}/jobs/${id}/retry`),
  deleteJob: id => apiClient.delete(`${BASE}/jobs/${id}`),

  // ─── MODULES ───
  listModules: () => apiClient.get(`${BASE}/modules`),
  getModuleFields: module => apiClient.get(`${BASE}/modules/${module}/fields`),

  // ─── STATISTICS ───
  getStatistics: (params = {}) => apiClient.get(`${BASE}/statistics`, { params }),

  // ─── SCHEDULED EXPORTS ───
  createScheduledExport: data => apiClient.post(`${BASE}/schedule`, data),
  listScheduledExports: (params = {}) => apiClient.get(`${BASE}/schedule`, { params }),
  executeScheduledExports: () => apiClient.post(`${BASE}/schedule/execute`),
  toggleScheduledExport: (id, enabled) =>
    apiClient.put(`${BASE}/schedule/${id}/toggle`, { enabled }),

  // ─── DATA QUALITY ───
  generateQualityReport: (file, module) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('module', module);
    return apiClient.post(`${BASE}/import/quality-report`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    });
  },

  // ─── TRANSFORMS ───
  listTransformRules: () => apiClient.get(`${BASE}/transforms`),

  // ─── DOWNLOAD ───
  downloadFile: async jobId => {
    const response = await apiClient.get(`${BASE}/download/${jobId}`, {
      responseType: 'blob',
      timeout: 60000,
    });
    return response;
  },

  // ─── SSE PROGRESS STREAMING ───
  streamProgress: (jobId, { onProgress, onDone, onError } = {}) => {
    const baseURL = apiClient.defaults?.baseURL || '';
    const token = localStorage.getItem('token') || localStorage.getItem('authToken') || '';
    const url = `${baseURL}${BASE}/progress/${jobId}`;

    // Use fetch with Authorization header instead of EventSource to avoid token in URL
    const controller = new AbortController();

    (async () => {
      try {
        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${token}`, Accept: 'text/event-stream' },
          signal: controller.signal,
        });

        if (!response.ok) {
          if (onError) onError({ message: `HTTP ${response.status}` });
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          // Parse SSE events from buffer
          const parts = buffer.split('\n\n');
          buffer = parts.pop(); // keep incomplete chunk

          for (const part of parts) {
            const eventMatch = part.match(/^event:\s*(.+)$/m);
            const dataMatch = part.match(/^data:\s*(.+)$/m);
            if (!dataMatch) continue;

            const eventType = eventMatch ? eventMatch[1].trim() : 'message';
            try {
              const data = JSON.parse(dataMatch[1]);
              if (eventType === 'progress' && onProgress) onProgress(data);
              else if (eventType === 'done') { if (onDone) onDone(data); controller.abort(); }
              else if (eventType === 'error') { if (onError) onError(data); controller.abort(); }
            } catch { /* ignore parse errors */ }
          }
        }
      } catch (err) {
        if (err.name !== 'AbortError' && onError) {
          onError({ message: 'SSE connection error' });
        }
      }
    })();

    // Return an object with close() for API compatibility with EventSource
    return { close: () => controller.abort() };
  },

  // ─── UTILITY: Download blob ───
  triggerDownload: (blob, fileName) => {
    const url = window.URL.createObjectURL(new Blob([blob]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
};

export default importExportProService;
