/**
 * vehicleManagement.service.js — خدمة إدارة المركبات الشاملة
 * Comprehensive Vehicle Management API Service
 */
import api from './api.client';

const vehicleManagementService = {
  // ─── المركبات (Vehicles) ────────────────────────────────────────────────
  getVehicles: params => api.get('/vehicles', { params }),
  getVehicle: id => api.get(`/vehicles/${id}`),
  createVehicle: data => api.post('/vehicles', data),
  updateVehicle: (id, data) => api.put(`/vehicles/${id}`, data),
  deleteVehicle: id => api.delete(`/vehicles/${id}`),
  getVehicleStatistics: () => api.get('/vehicles/statistics'),
  getAvailableVehicles: () => api.get('/vehicles/available'),
  getLowFuelVehicles: () => api.get('/vehicles/low-fuel'),
  getNearbyVehicles: (lat, lng) => api.get('/vehicles/nearby', { params: { lat, lng } }),

  // ─── الصيانة (Maintenance) ──────────────────────────────────────────────
  addMaintenance: (vehicleId, data) => api.post(`/vehicles/${vehicleId}/maintenance`, data),
  getVehicleMaintenance: vehicleId => api.get(`/vehicles/${vehicleId}/statistics`),

  // ─── الوقود (Fuel) ──────────────────────────────────────────────────────
  updateFuel: (vehicleId, data) => api.post(`/vehicles/${vehicleId}/fuel`, data),

  // ─── GPS والتتبع ─────────────────────────────────────────────────────────
  updateGPS: (vehicleId, data) => api.patch(`/vehicles/${vehicleId}/gps`, data),
  getGPSLocations: () => api.get('/gps/locations'),
  getVehicleGPS: vehicleId => api.get(`/gps/locations/${vehicleId}`),

  // ─── السائقين (Drivers) ─────────────────────────────────────────────────
  getDrivers: params => api.get('/drivers', { params }),
  getDriver: id => api.get(`/drivers/${id}`),
  createDriver: data => api.post('/drivers', data),
  updateDriver: (id, data) => api.put(`/drivers/${id}`, data),
  deleteDriver: id => api.delete(`/drivers/${id}`),
  assignDriver: (vehicleId, driverId) =>
    api.post(`/vehicles/${vehicleId}/assign-driver`, { driverId }),

  // ─── الرحلات (Trips) ────────────────────────────────────────────────────
  getTrips: params => api.get('/trips', { params }),
  getTrip: id => api.get(`/trips/${id}`),
  createTrip: data => api.post('/trips', data),
  updateTrip: (id, data) => api.put(`/trips/${id}`, data),
  deleteTrip: id => api.delete(`/trips/${id}`),

  // ─── مسارات النقل (Transport Routes) ────────────────────────────────────
  getRoutes: params => api.get('/transport-routes', { params }),
  getRoute: id => api.get(`/transport-routes/${id}`),
  createRoute: data => api.post('/transport-routes', data),
  updateRoute: (id, data) => api.put(`/transport-routes/${id}`, data),
  deleteRoute: id => api.delete(`/transport-routes/${id}`),

  // ─── الحوادث والمخالفات (Accidents & Violations) ────────────────────────
  getAccidents: params => api.get('/traffic-accidents', { params }),
  getAccident: id => api.get(`/traffic-accidents/${id}`),
  createAccident: data => api.post('/traffic-accidents', data),
  updateAccident: (id, data) => api.put(`/traffic-accidents/${id}`, data),
  deleteAccident: id => api.delete(`/traffic-accidents/${id}`),

  // ─── الطوارئ (Emergency) ────────────────────────────────────────────────
  sendEmergencyAlert: (vehicleId, data) => api.post(`/vehicles/${vehicleId}/emergency`, data),
};

export default vehicleManagementService;
