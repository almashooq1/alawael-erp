/**
 * MDT Coordination Service
 * خدمة تنسيق الفريق متعدد التخصصات
 */
import api from './api';

const BASE = '/api/mdt-coordination';

// ── Meetings ──
export const meetingsService = {
  getAll: () => api.get(`${BASE}/meetings`).then(r => r.data).catch(() => ({ data: [] })),
  getById: (id) => api.get(`${BASE}/meetings/${id}`).then(r => r.data),
  create: (data) => api.post(`${BASE}/meetings`, data).then(r => r.data),
  update: (id, data) => api.put(`${BASE}/meetings/${id}`, data).then(r => r.data),
  remove: (id) => api.delete(`${BASE}/meetings/${id}`).then(r => r.data),
  addAttendee: (id, data) => api.post(`${BASE}/meetings/${id}/attendees`, data).then(r => r.data),
  markAttendance: (id, attendeeId, data) => api.patch(`${BASE}/meetings/${id}/attendees/${attendeeId}/attendance`, data).then(r => r.data),
  addCase: (id, data) => api.post(`${BASE}/meetings/${id}/cases`, data).then(r => r.data),
  updateCase: (id, caseId, data) => api.patch(`${BASE}/meetings/${id}/cases/${caseId}`, data).then(r => r.data),
  addCaseDecision: (id, caseId, data) => api.post(`${BASE}/meetings/${id}/cases/${caseId}/decisions`, data).then(r => r.data),
  addAgenda: (id, data) => api.post(`${BASE}/meetings/${id}/agenda`, data).then(r => r.data),
  getStats: () => api.get(`${BASE}/meetings-stats`).then(r => r.data).catch(() => ({ data: {} })),
};

// ── Rehabilitation Plans ──
export const plansService = {
  getAll: () => api.get(`${BASE}/plans`).then(r => r.data).catch(() => ({ data: [] })),
  getById: (id) => api.get(`${BASE}/plans/${id}`).then(r => r.data),
  create: (data) => api.post(`${BASE}/plans`, data).then(r => r.data),
  update: (id, data) => api.put(`${BASE}/plans/${id}`, data).then(r => r.data),
  remove: (id) => api.delete(`${BASE}/plans/${id}`).then(r => r.data),
  addTeamMember: (id, data) => api.post(`${BASE}/plans/${id}/team-members`, data).then(r => r.data),
  removeTeamMember: (id, memberId) => api.delete(`${BASE}/plans/${id}/team-members/${memberId}`).then(r => r.data),
  addGoal: (id, data) => api.post(`${BASE}/plans/${id}/goals`, data).then(r => r.data),
  updateGoal: (id, goalId, data) => api.put(`${BASE}/plans/${id}/goals/${goalId}`, data).then(r => r.data),
  updateGoalProgress: (id, goalId, data) => api.patch(`${BASE}/plans/${id}/goals/${goalId}/progress`, data).then(r => r.data),
  addReview: (id, data) => api.post(`${BASE}/plans/${id}/reviews`, data).then(r => r.data),
  approve: (id, data) => api.post(`${BASE}/plans/${id}/approve`, data).then(r => r.data),
  getStats: () => api.get(`${BASE}/plans-stats`).then(r => r.data).catch(() => ({ data: {} })),
};

// ── Referrals ──
export const referralsService = {
  getAll: () => api.get(`${BASE}/referrals`).then(r => r.data).catch(() => ({ data: [] })),
  getById: (id) => api.get(`${BASE}/referrals/${id}`).then(r => r.data),
  create: (data) => api.post(`${BASE}/referrals`, data).then(r => r.data),
  update: (id, data) => api.put(`${BASE}/referrals/${id}`, data).then(r => r.data),
  remove: (id) => api.delete(`${BASE}/referrals/${id}`).then(r => r.data),
  accept: (id, data) => api.post(`${BASE}/referrals/${id}/accept`, data).then(r => r.data),
  reject: (id, data) => api.post(`${BASE}/referrals/${id}/reject`, data).then(r => r.data),
  complete: (id, data) => api.post(`${BASE}/referrals/${id}/complete`, data).then(r => r.data),
  getStats: () => api.get(`${BASE}/referrals-stats`).then(r => r.data).catch(() => ({ data: {} })),
};

// ── Dashboard ──
export const dashboardService = {
  getBeneficiary: (beneficiaryId) => api.get(`${BASE}/dashboard/beneficiary/${beneficiaryId}`).then(r => r.data),
  getTeamWorkload: () => api.get(`${BASE}/dashboard/team-workload`).then(r => r.data).catch(() => ({ data: {} })),
  getDepartment: (department) => api.get(`${BASE}/dashboard/department/${department}`).then(r => r.data),
  getOverdue: () => api.get(`${BASE}/dashboard/overdue`).then(r => r.data).catch(() => ({ data: [] })),
};

// ── Minutes & Decisions ──
export const minutesService = {
  create: (meetingId, data) => api.post(`${BASE}/meetings/${meetingId}/minutes`, data).then(r => r.data),
  approve: (meetingId, data) => api.post(`${BASE}/meetings/${meetingId}/minutes/approve`, data).then(r => r.data),
  addDecision: (meetingId, data) => api.post(`${BASE}/meetings/${meetingId}/decisions`, data).then(r => r.data),
  updateDecisionStatus: (meetingId, decisionId, data) => api.patch(`${BASE}/meetings/${meetingId}/decisions/${decisionId}/status`, data).then(r => r.data),
  addActionItem: (meetingId, data) => api.post(`${BASE}/meetings/${meetingId}/action-items`, data).then(r => r.data),
  updateActionItemStatus: (meetingId, itemId, data) => api.patch(`${BASE}/meetings/${meetingId}/action-items/${itemId}/status`, data).then(r => r.data),
};

// ── Trackers ──
export const trackersService = {
  getDecisions: () => api.get(`${BASE}/decisions-tracker`).then(r => r.data).catch(() => ({ data: [] })),
  getActionItems: () => api.get(`${BASE}/action-items-tracker`).then(r => r.data).catch(() => ({ data: [] })),
  getStats: () => api.get(`${BASE}/stats`).then(r => r.data).catch(() => ({ data: {} })),
};
