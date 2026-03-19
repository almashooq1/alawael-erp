/**
 * Montessori Service — خدمة برنامج مونتيسوري
 *
 * Real API layer covering all 10 Montessori sub-resources:
 *  Programs, Students, Plans, Sessions, Evaluations,
 *  Activities, Team, Parents, Media, Reports
 *
 * All endpoints go to /api/montessori/*
 * Falls back gracefully when API is unreachable.
 *
 * @version 1.0.0
 */

import apiClient from './api.client';
import logger from 'utils/logger';

const BASE = '/montessori';

// ─── Helper: safe extract ────────────────────────────────────────────
const extract = (res, fallback = []) => res?.data?.data ?? res?.data ?? fallback;
const extractOne = (res, fallback = null) => res?.data?.data ?? res?.data ?? fallback;

// ═══════════════════════════════════════════════════
//  1) Programs — البرامج
// ═══════════════════════════════════════════════════
export const getPrograms = async (params = {}) => {
  try {
    const res = await apiClient.get(BASE, { params });
    return extract(res, []);
  } catch (err) {
    logger.warn('فشل تحميل برامج مونتيسوري', err);
    return [];
  }
};

export const getProgram = async id => {
  try {
    const res = await apiClient.get(`${BASE}/${id}`);
    return extractOne(res);
  } catch (err) {
    logger.warn('فشل تحميل بيانات البرنامج', err);
    return null;
  }
};

export const createProgram = async data => {
  const res = await apiClient.post(BASE, data);
  return extractOne(res);
};

export const updateProgram = async (id, data) => {
  const res = await apiClient.put(`${BASE}/${id}`, data);
  return extractOne(res);
};

export const deleteProgram = async id => {
  const res = await apiClient.delete(`${BASE}/${id}`);
  return res?.data;
};

// ═══════════════════════════════════════════════════
//  2) Students — الطلاب
// ═══════════════════════════════════════════════════
export const getStudents = async (params = {}) => {
  try {
    const res = await apiClient.get(`${BASE}/students`, { params });
    return extract(res, []);
  } catch (err) {
    logger.warn('فشل تحميل طلاب مونتيسوري', err);
    return [];
  }
};

export const getStudent = async id => {
  try {
    const res = await apiClient.get(`${BASE}/students/${id}`);
    return extractOne(res);
  } catch (err) {
    logger.warn('فشل تحميل بيانات الطالب', err);
    return null;
  }
};

export const createStudent = async data => {
  const res = await apiClient.post(`${BASE}/students`, data);
  return extractOne(res);
};

export const updateStudent = async (id, data) => {
  const res = await apiClient.put(`${BASE}/students/${id}`, data);
  return extractOne(res);
};

export const deleteStudent = async id => {
  const res = await apiClient.delete(`${BASE}/students/${id}`);
  return res?.data;
};

// ═══════════════════════════════════════════════════
//  3) Plans — الخطط الفردية (IEP)
// ═══════════════════════════════════════════════════
export const getPlans = async (params = {}) => {
  try {
    const res = await apiClient.get(`${BASE}/plans`, { params });
    return extract(res, []);
  } catch (err) {
    logger.warn('فشل تحميل الخطط الفردية', err);
    return [];
  }
};

export const getPlan = async id => {
  try {
    const res = await apiClient.get(`${BASE}/plans/${id}`);
    return extractOne(res);
  } catch (err) {
    logger.warn('فشل تحميل بيانات الخطة', err);
    return null;
  }
};

export const createPlan = async data => {
  const res = await apiClient.post(`${BASE}/plans`, data);
  return extractOne(res);
};

export const updatePlan = async (id, data) => {
  const res = await apiClient.put(`${BASE}/plans/${id}`, data);
  return extractOne(res);
};

export const deletePlan = async id => {
  const res = await apiClient.delete(`${BASE}/plans/${id}`);
  return res?.data;
};

// ═══════════════════════════════════════════════════
//  4) Sessions — الجلسات
// ═══════════════════════════════════════════════════
export const getSessions = async (params = {}) => {
  try {
    const res = await apiClient.get(`${BASE}/sessions`, { params });
    return extract(res, []);
  } catch (err) {
    logger.warn('فشل تحميل الجلسات', err);
    return [];
  }
};

export const getSession = async id => {
  try {
    const res = await apiClient.get(`${BASE}/sessions/${id}`);
    return extractOne(res);
  } catch (err) {
    logger.warn('فشل تحميل بيانات الجلسة', err);
    return null;
  }
};

export const createSession = async data => {
  const res = await apiClient.post(`${BASE}/sessions`, data);
  return extractOne(res);
};

export const updateSession = async (id, data) => {
  const res = await apiClient.put(`${BASE}/sessions/${id}`, data);
  return extractOne(res);
};

export const deleteSession = async id => {
  const res = await apiClient.delete(`${BASE}/sessions/${id}`);
  return res?.data;
};

// ═══════════════════════════════════════════════════
//  5) Evaluations — التقييمات
// ═══════════════════════════════════════════════════
export const getEvaluations = async (params = {}) => {
  try {
    const res = await apiClient.get(`${BASE}/evaluations`, { params });
    return extract(res, []);
  } catch (err) {
    logger.warn('فشل تحميل التقييمات', err);
    return [];
  }
};

export const getEvaluation = async id => {
  try {
    const res = await apiClient.get(`${BASE}/evaluations/${id}`);
    return extractOne(res);
  } catch (err) {
    logger.warn('فشل تحميل بيانات التقييم', err);
    return null;
  }
};

export const createEvaluation = async data => {
  const res = await apiClient.post(`${BASE}/evaluations`, data);
  return extractOne(res);
};

export const updateEvaluation = async (id, data) => {
  const res = await apiClient.put(`${BASE}/evaluations/${id}`, data);
  return extractOne(res);
};

export const deleteEvaluation = async id => {
  const res = await apiClient.delete(`${BASE}/evaluations/${id}`);
  return res?.data;
};

// ═══════════════════════════════════════════════════
//  6) Activities — الأنشطة
// ═══════════════════════════════════════════════════
export const getActivities = async (params = {}) => {
  try {
    const res = await apiClient.get(`${BASE}/activities`, { params });
    return extract(res, []);
  } catch (err) {
    logger.warn('فشل تحميل الأنشطة', err);
    return [];
  }
};

export const getActivity = async id => {
  try {
    const res = await apiClient.get(`${BASE}/activities/${id}`);
    return extractOne(res);
  } catch (err) {
    logger.warn('فشل تحميل بيانات النشاط', err);
    return null;
  }
};

export const createActivity = async data => {
  const res = await apiClient.post(`${BASE}/activities`, data);
  return extractOne(res);
};

export const updateActivity = async (id, data) => {
  const res = await apiClient.put(`${BASE}/activities/${id}`, data);
  return extractOne(res);
};

export const deleteActivity = async id => {
  const res = await apiClient.delete(`${BASE}/activities/${id}`);
  return res?.data;
};

// ═══════════════════════════════════════════════════
//  7) Team — الفريق
// ═══════════════════════════════════════════════════
export const getTeam = async (params = {}) => {
  try {
    const res = await apiClient.get(`${BASE}/team`, { params });
    return extract(res, []);
  } catch (err) {
    logger.warn('فشل تحميل أعضاء الفريق', err);
    return [];
  }
};

export const getTeamMember = async id => {
  try {
    const res = await apiClient.get(`${BASE}/team/${id}`);
    return extractOne(res);
  } catch (err) {
    logger.warn('فشل تحميل بيانات عضو الفريق', err);
    return null;
  }
};

export const createTeamMember = async data => {
  const res = await apiClient.post(`${BASE}/team`, data);
  return extractOne(res);
};

export const updateTeamMember = async (id, data) => {
  const res = await apiClient.put(`${BASE}/team/${id}`, data);
  return extractOne(res);
};

export const deleteTeamMember = async id => {
  const res = await apiClient.delete(`${BASE}/team/${id}`);
  return res?.data;
};

// ═══════════════════════════════════════════════════
//  8) Parents — أولياء الأمور
// ═══════════════════════════════════════════════════
export const getParents = async (params = {}) => {
  try {
    const res = await apiClient.get(`${BASE}/parents`, { params });
    return extract(res, []);
  } catch (err) {
    logger.warn('فشل تحميل أولياء الأمور', err);
    return [];
  }
};

export const getParent = async id => {
  try {
    const res = await apiClient.get(`${BASE}/parents/${id}`);
    return extractOne(res);
  } catch (err) {
    logger.warn('فشل تحميل بيانات ولي الأمر', err);
    return null;
  }
};

export const createParent = async data => {
  const res = await apiClient.post(`${BASE}/parents`, data);
  return extractOne(res);
};

export const updateParent = async (id, data) => {
  const res = await apiClient.put(`${BASE}/parents/${id}`, data);
  return extractOne(res);
};

export const deleteParent = async id => {
  const res = await apiClient.delete(`${BASE}/parents/${id}`);
  return res?.data;
};

// ═══════════════════════════════════════════════════
//  9) Media — الوسائط
// ═══════════════════════════════════════════════════
export const getMedia = async (params = {}) => {
  try {
    const res = await apiClient.get(`${BASE}/media`, { params });
    return extract(res, []);
  } catch (err) {
    logger.warn('فشل تحميل ملفات الوسائط', err);
    return [];
  }
};

export const getMediaFile = async id => {
  try {
    const res = await apiClient.get(`${BASE}/media/${id}`);
    return extractOne(res);
  } catch (err) {
    logger.warn('فشل تحميل ملف الوسائط', err);
    return null;
  }
};

export const createMedia = async data => {
  const res = await apiClient.post(`${BASE}/media`, data);
  return extractOne(res);
};

export const updateMedia = async (id, data) => {
  const res = await apiClient.put(`${BASE}/media/${id}`, data);
  return extractOne(res);
};

export const deleteMedia = async id => {
  const res = await apiClient.delete(`${BASE}/media/${id}`);
  return res?.data;
};

// ═══════════════════════════════════════════════════
//  10) Reports — التقارير
// ═══════════════════════════════════════════════════
export const getReports = async (params = {}) => {
  try {
    const res = await apiClient.get(`${BASE}/reports`, { params });
    return extract(res, []);
  } catch (err) {
    logger.warn('فشل تحميل التقارير', err);
    return [];
  }
};

export const getReport = async id => {
  try {
    const res = await apiClient.get(`${BASE}/reports/${id}`);
    return extractOne(res);
  } catch (err) {
    logger.warn('فشل تحميل بيانات التقرير', err);
    return null;
  }
};

export const createReport = async data => {
  const res = await apiClient.post(`${BASE}/reports`, data);
  return extractOne(res);
};

export const updateReport = async (id, data) => {
  const res = await apiClient.put(`${BASE}/reports/${id}`, data);
  return extractOne(res);
};

export const deleteReport = async id => {
  const res = await apiClient.delete(`${BASE}/reports/${id}`);
  return res?.data;
};

// ═══════════════════════════════════════════════════
//  Default export — all services
// ═══════════════════════════════════════════════════
const montessoriService = {
  // Programs
  getPrograms,
  getProgram,
  createProgram,
  updateProgram,
  deleteProgram,
  // Students
  getStudents,
  getStudent,
  createStudent,
  updateStudent,
  deleteStudent,
  // Plans
  getPlans,
  getPlan,
  createPlan,
  updatePlan,
  deletePlan,
  // Sessions
  getSessions,
  getSession,
  createSession,
  updateSession,
  deleteSession,
  // Evaluations
  getEvaluations,
  getEvaluation,
  createEvaluation,
  updateEvaluation,
  deleteEvaluation,
  // Activities
  getActivities,
  getActivity,
  createActivity,
  updateActivity,
  deleteActivity,
  // Team
  getTeam,
  getTeamMember,
  createTeamMember,
  updateTeamMember,
  deleteTeamMember,
  // Parents
  getParents,
  getParent,
  createParent,
  updateParent,
  deleteParent,
  // Media
  getMedia,
  getMediaFile,
  createMedia,
  updateMedia,
  deleteMedia,
  // Reports
  getReports,
  getReport,
  createReport,
  updateReport,
  deleteReport,
};

export default montessoriService;
