/**
 * خدمة إدارة التوظيف — Recruitment Service (compatibility shim)
 * Delegates to the canonical recruitmentService.js
 */
import {
  jobPostingsService,
  applicantsService,
  recruitmentReportsService,
} from './recruitmentService';

/* ── Dashboard ── */
export const getDashboard = () => recruitmentReportsService.getDashboardStats();

/* ── Jobs ── */
export const getJobs = () => jobPostingsService.getAll();
export const createJob = body => jobPostingsService.create(body);
export const updateJob = (id, body) => jobPostingsService.update(id, body);
export const deleteJob = id => jobPostingsService.remove(id);

/* ── Applications ── */
export const getApplications = () => applicantsService.getAll();
export const createApplication = body => applicantsService.create(body);
export const updateApplicationStage = (id, body) => applicantsService.updateStage(id, body.stage || body);
