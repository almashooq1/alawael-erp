/**
 * Beneficiary Core Service — خدمة نواة المستفيد الموحدة
 * ════════════════════════════════════════════════════════════
 * Unified API client for /api/v1/beneficiary-core
 * الملف الطولي المتكامل: 360° profile, episodes, sessions,
 * assessments, care plans, timeline, progress, documents, alerts
 */

import apiClient from './api.client';

const BASE = '/api/v1/beneficiary-core';

async function req(method, url, data = null, params = null) {
  const config = { method, url: `${BASE}${url}` };
  if (data) config.data = data;
  if (params) config.params = params;
  const res = await apiClient(config);
  return res.data;
}

// ── Dashboard ────────────────────────────────────────────────────
export const getDashboard = (params = {}) => req('GET', '/dashboard', null, params);

// ── List & Create ────────────────────────────────────────────────
export const listBeneficiaries = (params = {}) => req('GET', '/', null, params);
export const createBeneficiary = body => req('POST', '/', body);

// ── Single Beneficiary ───────────────────────────────────────────
export const get360Profile = id => req('GET', `/${id}/360`);
export const updateProfile = (id, body) => req('PUT', `/${id}`, body);

// ── Sub-resources ────────────────────────────────────────────────
export const getTimeline = (id, params = {}) => req('GET', `/${id}/timeline`, null, params);
export const getStats = id => req('GET', `/${id}/stats`);
export const getEpisodes = id => req('GET', `/${id}/episodes`);
export const getSessions = id => req('GET', `/${id}/sessions`);
export const getAssessments = id => req('GET', `/${id}/assessments`);
export const getDocuments = id => req('GET', `/${id}/documents`);
export const getCarePlan = id => req('GET', `/${id}/care-plan`);
export const getProgress = id => req('GET', `/${id}/progress`);
export const getAlerts = id => req('GET', `/${id}/alerts`);

// ── Default export (object API) ──────────────────────────────────
const beneficiaryCoreService = {
  getDashboard,
  listBeneficiaries,
  createBeneficiary,
  get360Profile,
  updateProfile,
  getTimeline,
  getStats,
  getEpisodes,
  getSessions,
  getAssessments,
  getDocuments,
  getCarePlan,
  getProgress,
  getAlerts,
};

export default beneficiaryCoreService;
