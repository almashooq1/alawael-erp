import api from './api';
const BASE = '/bus-tracking';

const busTrackingService = {
  // ── Dashboard ──
  getDashboardOverview: () => api.get(`${BASE}/dashboard/overview`),

  // ── Buses ──
  getAllBuses: (params = {}) => api.get(`${BASE}/buses`, { params }),
  getBusById: id => api.get(`${BASE}/buses/${id}`),
  createBus: data => api.post(`${BASE}/buses`, data),
  updateBus: (id, data) => api.put(`${BASE}/buses/${id}`, data),
  deleteBus: id => api.delete(`${BASE}/buses/${id}`),

  // ── Routes ──
  getAllRoutes: (params = {}) => api.get(`${BASE}/routes`, { params }),
  getRouteById: id => api.get(`${BASE}/routes/${id}`),
  createRoute: data => api.post(`${BASE}/routes`, data),
  updateRoute: (id, data) => api.put(`${BASE}/routes/${id}`, data),
  deleteRoute: id => api.delete(`${BASE}/routes/${id}`),

  // ── Students ──
  registerStudent: data => api.post(`${BASE}/students`, data),
  getStudentsByBus: busId => api.get(`${BASE}/students/bus/${busId}`),
  getStudentById: id => api.get(`${BASE}/students/${id}`),

  // ── Trips ──
  startTrip: data => api.post(`${BASE}/trips/start`, data),
  endTrip: id => api.post(`${BASE}/trips/${id}/end`),
  arriveAtStop: (id, data = {}) => api.post(`${BASE}/trips/${id}/arrive`, data),
  getActiveTrips: () => api.get(`${BASE}/trips/active`),
  getTripHistory: (params = {}) => api.get(`${BASE}/trips/history`, { params }),
  getTripById: id => api.get(`${BASE}/trips/${id}`),

  // ── Tracking ──
  updateBusLocation: (busId, data) => api.post(`${BASE}/tracking/${busId}/location`, data),
  getBusLocation: busId => api.get(`${BASE}/tracking/${busId}`),
  getAllBusLocations: () => api.get(`${BASE}/tracking`),

  // ── Boarding ──
  recordBoarding: data => api.post(`${BASE}/boarding`, data),
  getBoardingHistory: (params = {}) => api.get(`${BASE}/boarding/history`, { params }),

  // ── Parent Portal ──
  getParentDashboard: phone => api.get(`${BASE}/parent/dashboard`, { params: { phone } }),
  trackBusForParent: (busId, phone) =>
    api.get(`${BASE}/parent/track/${busId}`, { params: { phone } }),
  getETAForStudent: studentId => api.get(`${BASE}/parent/eta/${studentId}`),

  // ── Notifications ──
  getNotifications: (phone, params = {}) =>
    api.get(`${BASE}/notifications`, { params: { phone, ...params } }),
  markNotificationRead: id => api.patch(`${BASE}/notifications/${id}/read`),
  markAllNotificationsRead: phone => api.post(`${BASE}/notifications/read-all`, { phone }),

  // ── Safety ──
  getSafetyAlerts: (params = {}) => api.get(`${BASE}/safety/alerts`, { params }),
  raiseSOS: (busId, data = {}) => api.post(`${BASE}/safety/sos/${busId}`, data),
  acknowledgeAlert: id => api.patch(`${BASE}/safety/alerts/${id}/acknowledge`),
};

export default busTrackingService;
