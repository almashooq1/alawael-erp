/**
 * Guardian Portal (بوابة ولي الأمر) — Frontend Service
 *
 * Parent/guardian access: dashboard, beneficiary
 * progress, attendance, grades, payments,
 * messages, notifications, appointments, IEP.
 */
import api from './api.client';

const guardianPortalService = {
  getDashboard: () => api.get('/guardian/dashboard'),
  getProfile: () => api.get('/guardian/profile'),
  getBeneficiaries: () => api.get('/guardian/beneficiaries'),
  getProgress: id => api.get(`/guardian/beneficiaries/${id}/progress`),
  getAttendance: id => api.get(`/guardian/beneficiaries/${id}/attendance`),
  getGrades: id => api.get(`/guardian/beneficiaries/${id}/grades`),
  getPayments: () => api.get('/guardian/payments'),
  getMessages: () => api.get('/guardian/messages'),
  getNotifications: () => api.get('/guardian/notifications'),
  getAppointments: () => api.get('/guardian/appointments'),
  getAnalytics: () => api.get('/guardian/analytics/dashboard'),
  getIEP: id => api.get(`/guardian/beneficiaries/${id}/iep`),
};

export default guardianPortalService;
