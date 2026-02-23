/**
 * Vehicle Management Module - وحدة إدارة المركبات
 * Comprehensive Vehicle & Traffic Management for Saudi Arabia
 */

// Generic Vehicle Service
const {
  VehicleManagementService,
  vehicleManagementService,
  vehicleConfig,
  vehicleTypes,
  vehicleStatuses,
} = require('./vehicle-service');

// Saudi Vehicle Service
const {
  SaudiVehicleService,
  saudiVehicleService,
  saudiConfig,
} = require('./saudi-vehicle-service');

// Saudi Traffic Service
const {
  SaudiTrafficService,
  saudiTrafficService,
  trafficConfig,
} = require('./saudi-traffic-service');

// Student Transport Service
const {
  StudentTransportService,
  studentTransportService,
  transportConfig,
} = require('./student-transport-service');

// Rehabilitation Transport Service
const {
  RehabilitationTransportService,
  rehabilitationTransportService,
  nationalAddressConfig,
  AIRouteOptimizer,
} = require('./rehabilitation-transport-service');

// Routes
const vehicleRoutes = require('./vehicle-routes');
const saudiVehicleRoutes = require('./saudi-vehicle-routes');
const saudiTrafficRoutes = require('./saudi-traffic-routes');
const studentTransportRoutes = require('./student-transport-routes');
const rehabilitationTransportRoutes = require('./rehabilitation-transport-routes');

/**
 * Module initialization
 */
async function initialize(connection) {
  await vehicleManagementService.initialize(connection);
  await saudiVehicleService.initialize(connection);
  await saudiTrafficService.initialize(connection);
  await studentTransportService.initialize(connection);
  await rehabilitationTransportService.initialize(connection);
  console.log('✅ Vehicle Module initialized (Generic + Saudi + Traffic + Student + Rehabilitation)');
  return {
    vehicleManagementService,
    saudiVehicleService,
    saudiTrafficService,
    studentTransportService,
    rehabilitationTransportService,
  };
}

/**
 * Get all services
 */
function getServices() {
  return {
    vehicleManagementService,
    saudiVehicleService,
    saudiTrafficService,
    studentTransportService,
    rehabilitationTransportService,
  };
}

/**
 * Get all routes
 */
function getRoutes() {
  return {
    vehicleRoutes,
    saudiVehicleRoutes,
    saudiTrafficRoutes,
    studentTransportRoutes,
    rehabilitationTransportRoutes,
  };
}

/**
 * Get all configurations
 */
function getConfigs() {
  return {
    vehicleConfig,
    saudiConfig,
    trafficConfig,
    transportConfig,
    nationalAddressConfig,
  };
}

module.exports = {
  // Generic Vehicle Service
  VehicleManagementService,
  vehicleManagementService,
  vehicleConfig,
  vehicleTypes,
  vehicleStatuses,

  // Saudi Vehicle Service
  SaudiVehicleService,
  saudiVehicleService,
  saudiConfig,

  // Saudi Traffic Service
  SaudiTrafficService,
  saudiTrafficService,
  trafficConfig,

  // Student Transport Service
  StudentTransportService,
  studentTransportService,
  transportConfig,

  // Rehabilitation Transport Service
  RehabilitationTransportService,
  rehabilitationTransportService,
  nationalAddressConfig,
  AIRouteOptimizer,

  // Routes
  vehicleRoutes,
  saudiVehicleRoutes,
  saudiTrafficRoutes,
  studentTransportRoutes,
  rehabilitationTransportRoutes,

  // Helpers
  initialize,
  getServices,
  getRoutes,
  getConfigs,
};