/**
 * Training & Development Service — خدمة التدريب والتطوير (compatibility shim)
 * Delegates to the canonical trainingService.js
 */
import {
  coursesService,
  sessionsService,
  plansService,
  trainingReportsService,
} from './trainingService';

/* ── Dashboard ── */
export const getTrainingDashboard = () => trainingReportsService.getDashboardStats();

/* ── Courses ── */
export const getCourses = params => coursesService.getAll(params);
export const createCourse = body => coursesService.create(body);
export const updateCourse = (id, body) => coursesService.update(id, body);
export const deleteCourse = id => coursesService.remove(id);

/* ── Sessions ── */
export const getSessions = params => sessionsService.getAll(params);
export const createSession = body => sessionsService.create(body);
export const updateSession = (id, body) => sessionsService.update(id, body);

/* ── Plans ── */
export const getPlans = () => plansService.getAll();
export const createPlan = body => plansService.create(body);
export const updatePlan = (id, body) => plansService.update(id, body);
