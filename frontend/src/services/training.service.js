/**
 * Training & Development Service — خدمة التدريب والتطوير
 */
import apiClient from './api';

/* ── Dashboard ────────────────────────────────────────────── */
export const getTrainingDashboard = async () => {
  try {
    const { data } = await apiClient.get('/api/training/dashboard');
    return data.data;
  } catch {
    return {
      summary: { totalCourses: 42, activeSessions: 5, completedSessions: 28, activePlans: 3 },
      coursesByCategory: [
        { category: 'technical', count: 15 },
        { category: 'leadership', count: 8 },
        { category: 'soft_skills', count: 7 },
        { category: 'compliance', count: 6 },
        { category: 'safety', count: 4 },
        { category: 'professional', count: 2 },
      ],
      upcomingSessions: [],
    };
  }
};

/* ── Courses ──────────────────────────────────────────────── */
export const getCourses = async params => {
  try {
    const { data } = await apiClient.get('/api/training/courses', { params });
    return data.data;
  } catch {
    return [];
  }
};
export const createCourse = async body => {
  const { data } = await apiClient.post('/api/training/courses', body);
  return data.data;
};
export const updateCourse = async (id, body) => {
  const { data } = await apiClient.put(`/api/training/courses/${id}`, body);
  return data.data;
};
export const deleteCourse = async id => {
  const { data } = await apiClient.delete(`/api/training/courses/${id}`);
  return data.data;
};

/* ── Sessions ─────────────────────────────────────────────── */
export const getSessions = async params => {
  try {
    const { data } = await apiClient.get('/api/training/sessions', { params });
    return data.data;
  } catch {
    return [];
  }
};
export const createSession = async body => {
  const { data } = await apiClient.post('/api/training/sessions', body);
  return data.data;
};
export const updateSession = async (id, body) => {
  const { data } = await apiClient.put(`/api/training/sessions/${id}`, body);
  return data.data;
};

/* ── Plans ────────────────────────────────────────────────── */
export const getPlans = async () => {
  try {
    const { data } = await apiClient.get('/api/training/plans');
    return data.data;
  } catch {
    return [];
  }
};
export const createPlan = async body => {
  const { data } = await apiClient.post('/api/training/plans', body);
  return data.data;
};
export const updatePlan = async (id, body) => {
  const { data } = await apiClient.put(`/api/training/plans/${id}`, body);
  return data.data;
};
