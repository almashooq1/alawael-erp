/**
 * LMS / E-Learning Service
 * خدمة التعلم الإلكتروني والمكتبة
 *
 * Maps to backend: /api/lms/*
 */

import api from './api.client';

const lmsService = {
  // ==================== COURSES ====================
  getCourses: async (params = {}) => api.get('/lms/courses', { params }),
  getCourse: async id => api.get(`/lms/courses/${id}`),
  createCourse: async data => api.post('/lms/courses', data),
  updateCourse: async (id, data) => api.put(`/lms/courses/${id}`, data),
  deleteCourse: async id => api.delete(`/lms/courses/${id}`),

  // ==================== LESSONS ====================
  getLessons: async courseId => api.get(`/lms/courses/${courseId}/lessons`),
  createLesson: async (courseId, data) => api.post(`/lms/courses/${courseId}/lessons`, data),
  updateLesson: async (lessonId, data) => api.put(`/lms/lessons/${lessonId}`, data),

  // ==================== ENROLLMENT ====================
  enroll: async courseId => api.post(`/lms/enroll/${courseId}`),
  getMyCourses: async () => api.get('/lms/my-courses'),
  getEnrollment: async courseId => api.get(`/lms/enrollment/${courseId}`),
  completeLesson: async (courseId, lessonId) =>
    api.post(`/lms/enrollment/${courseId}/complete-lesson/${lessonId}`),

  // ==================== QUIZZES ====================
  getQuiz: async quizId => api.get(`/lms/quiz/${quizId}`),
  submitQuiz: async (quizId, answers) => api.post(`/lms/quiz/${quizId}/submit`, { answers }),

  // ==================== CERTIFICATES ====================
  getCertificate: async certificateId => api.get(`/lms/certificate/${certificateId}`),
  verifyCertificate: async verificationCode =>
    api.get(`/lms/certificate/verify/${verificationCode}`),
  getMyCertificates: async () => api.get('/lms/my-certificates'),

  // ==================== MEDIA LIBRARY ====================
  getMedia: async (params = {}) => api.get('/lms/media', { params }),
  uploadMedia: async formData =>
    api.post('/lms/media', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

export default lmsService;
