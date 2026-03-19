/**
 * خدمة API لنظام طاقات (التوظيف)
 * Taqat API Service
 */
import api from './api.client';

const taqatService = {
  // الباحثون عن عمل
  getJobSeekers: params => api.get('/taqat/job-seekers', { params }),
  getJobSeeker: id => api.get(`/taqat/job-seekers/${id}`),
  createJobSeeker: data => api.post('/taqat/job-seekers', data),
  updateJobSeeker: (id, data) => api.put(`/taqat/job-seekers/${id}`, data),
  assessReadiness: id => api.post(`/taqat/job-seekers/${id}/readiness`),
  matchJobs: id => api.get(`/taqat/job-seekers/${id}/match-jobs`),

  // الفرص الوظيفية
  getJobOpportunities: params => api.get('/taqat/job-opportunities', { params }),
  getJobOpportunity: id => api.get(`/taqat/job-opportunities/${id}`),
  createJobOpportunity: data => api.post('/taqat/job-opportunities', data),
  updateJobOpportunity: (id, data) => api.put(`/taqat/job-opportunities/${id}`, data),

  // التقديمات
  getApplications: params => api.get('/taqat/applications', { params }),
  submitApplication: data => api.post('/taqat/applications', data),
  updateApplicationStatus: (id, data) => api.put(`/taqat/applications/${id}/status`, data),

  // البرامج التدريبية
  getTrainingPrograms: params => api.get('/taqat/training-programs', { params }),
  createTrainingProgram: data => api.post('/taqat/training-programs', data),

  // لوحة المعلومات والإحصائيات
  getDashboard: () => api.get('/taqat/dashboard'),
  generateStats: data => api.post('/taqat/stats/generate', data),
};

export default taqatService;
