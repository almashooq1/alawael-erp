/**
 * Leave Service — Leave requests and approvals
 * خدمات الإجازات والطلبات
 */
import { safeFetch } from './safeFetch';
import { DEMO_LEAVES } from './demoData';

export const getLeaves = status => {
  const qs = status ? `?status=${status}` : '';
  return safeFetch(`/hr-system/leaves${qs}`, DEMO_LEAVES);
};

export const approveLeave = id =>
  safeFetch(`/hr-advanced/leaves/${id}/approve`, null, { method: 'POST' });

export const rejectLeave = (id, reason) =>
  safeFetch(`/hr-advanced/leaves/${id}/reject`, null, { method: 'POST', body: { reason } });

export const createLeaveRequest = data =>
  safeFetch('/hr-system/leaves', null, { method: 'POST', body: data });
