import api from './api.client';

const fleetService = {
  // Drivers
  getDrivers: async () => api.get('/drivers'),
  getDriver: async id => api.get(`/drivers/${id}`),
  createDriver: async data => api.post('/drivers', data),
  updateDriver: async (id, data) => api.put(`/drivers/${id}`, data),
  deleteDriver: async id => api.delete(`/drivers/${id}`),

  // Vehicles
  getVehicles: async () => api.get('/vehicles'),
  getVehicle: async id => api.get(`/vehicles/${id}`),
  createVehicle: async data => api.post('/vehicles', data),
  updateVehicle: async (id, data) => api.put(`/vehicles/${id}`, data),
  deleteVehicle: async id => api.delete(`/vehicles/${id}`),

  // Trips
  getTrips: async () => api.get('/trips'),
  getTrip: async id => api.get(`/trips/${id}`),
  createTrip: async data => api.post('/trips', data),
  updateTrip: async (id, data) => api.put(`/trips/${id}`, data),
  deleteTrip: async id => api.delete(`/trips/${id}`),

  // GPS Tracking
  getGPSLocations: async () => api.get('/gps/locations'),
  getGPSLocation: async vehicleId => api.get(`/gps/locations/${vehicleId}`),
  trackVehicle: async data => api.post('/gps/track', data),

  // Transport Routes
  getRoutes: async () => api.get('/transport-routes'),
  getTransportRoutes: async () => api.get('/transport-routes'),
  getTransportRoute: async id => api.get(`/transport-routes/${id}`),
  createTransportRoute: async data => api.post('/transport-routes', data),
  updateTransportRoute: async (id, data) => api.put(`/transport-routes/${id}`, data),
  deleteTransportRoute: async id => api.delete(`/transport-routes/${id}`),

  // Traffic Accidents
  getAccidents: async () => api.get('/traffic-accidents'),
  getAccident: async id => api.get(`/traffic-accidents/${id}`),
  createAccident: async data => api.post('/traffic-accidents', data),
  updateAccident: async (id, data) => api.put(`/traffic-accidents/${id}`, data),
  deleteAccident: async id => api.delete(`/traffic-accidents/${id}`),
};

export default fleetService;
