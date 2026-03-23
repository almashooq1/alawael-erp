/**
 * Learning & Development (LMS) API Service
 * خدمة التدريب الإلكتروني للموظفين
 *
 * Phase 22 — Online courses, quizzes, certificates
 */
import api from './api';

const BASE = '/api/learning-development';

const learningDevelopmentService = {
  // ── Programs ──
  createProgram: data => api.post(BASE, data),
  listPrograms: params => api.get(BASE, { params }),
  getProgram: id => api.get(`${BASE}/programs/${id}`),
  updateProgram: (id, data) => api.put(`${BASE}/programs/${id}`, data),
  archiveProgram: id => api.patch(`${BASE}/programs/${id}/archive`),

  // ── Enrollment ──
  enrollEmployee: data => api.post(`${BASE}/enrollments`, data),
  updateEnrollmentStatus: (id, data) => api.patch(`${BASE}/enrollments/${id}/status`, data),
  getEnrollment: id => api.get(`${BASE}/enrollments/${id}`),
  getMandatoryTraining: employeeId => api.get(`${BASE}/enrollments/mandatory/${employeeId}`),

  // ── Analytics ──
  getCompletionRates: params => api.get(`${BASE}/analytics/completion`, { params }),
  getAssessmentScores: employeeId => api.get(`${BASE}/analytics/scores/${employeeId}`),
  getSkillImprovement: employeeId => api.get(`${BASE}/analytics/skills/${employeeId}`),
  getLearningROI: programId => api.get(`${BASE}/analytics/roi/${programId}`),
  getLearningReport: params => api.get(`${BASE}/analytics/report`, { params }),

  // ── Certification ──
  defineCertificationPath: data => api.post(`${BASE}/certifications`, data),
  trackExam: (certId, data) => api.post(`${BASE}/certifications/${certId}/exams`, data),
  manageLicenseRenewal: (certId, data) =>
    api.post(`${BASE}/certifications/${certId}/renewal`, data),

  // ── Integration ──
  connectPlatform: data => api.post(`${BASE}/integrations`, data),
  syncContent: integrationId => api.post(`${BASE}/integrations/${integrationId}/sync`),
};

export default learningDevelopmentService;
