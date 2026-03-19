/**
 * 🏗️ Facility Management Service — خدمة إدارة المرافق
 * AlAwael ERP — Facility & space management
 */
import api from './api.client';

const BASE = '/facilities';

const facilityService = {
  getRooms: params => api.get(`${BASE}/rooms`, { params }),
  getRoomById: id => api.get(`${BASE}/rooms/${id}`),
  createRoom: data => api.post(`${BASE}/rooms`, data),
  updateRoom: (id, data) => api.put(`${BASE}/rooms/${id}`, data),
  deleteRoom: id => api.delete(`${BASE}/rooms/${id}`),
  getBookings: params => api.get(`${BASE}/bookings`, { params }),
  createBooking: data => api.post(`${BASE}/bookings`, data),
  updateBooking: (id, data) => api.put(`${BASE}/bookings/${id}`, data),
  cancelBooking: id => api.delete(`${BASE}/bookings/${id}`),
  getMaintenanceRequests: params => api.get(`${BASE}/maintenance`, { params }),
  createMaintenanceRequest: data => api.post(`${BASE}/maintenance`, data),
  updateMaintenanceRequest: (id, data) => api.put(`${BASE}/maintenance/${id}`, data),
  deleteMaintenanceRequest: id => api.delete(`${BASE}/maintenance/${id}`),
  getDashboard: () => api.get(`${BASE}/dashboard`),
};

export default facilityService;
