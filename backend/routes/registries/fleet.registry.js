/**
 * Fleet & Transport Sub-Registry — سجل مسارات الأسطول والنقل
 * ═══════════════════════════════════════════════════════════════════
 * 34 modules (drivers, vehicles, trips, GPS, geofences, dispatch,
 * fleet-costs … fleet-disposals, bus-tracking, traffic-accidents)
 * 400+ endpoints
 *
 * Extracted from _registry.js for maintainability.
 * ═══════════════════════════════════════════════════════════════════
 */

'use strict';

/**
 * Import all fleet route modules and mount them.
 * @param {Express.Application} app
 * @param {object} helpers  – { safeRequire, dualMount, logger }
 *   NOTE: safeRequire resolves paths relative to _registry.js (its definer).
 */
module.exports = function registerFleetRoutes(app, { safeRequire, dualMount, logger }) {
  // ── Imports ──────────────────────────────────────────────────────────────
  const driversRoutes = safeRequire('../routes/drivers');
  const vehiclesRoutes = safeRequire('../routes/vehicles');
  const tripsRoutes = safeRequire('../routes/trips');
  const gpsRoutes = safeRequire('../routes/gps');
  const transportRoutesRouter = safeRequire('../routes/transportRoutes');
  const geofenceRoutes = safeRequire('../routes/geofences');
  const dispatchRoutes = safeRequire('../routes/dispatch');
  const fleetCostsRoutes = safeRequire('../routes/fleetCosts');
  const fleetTiresRoutes = safeRequire('../routes/fleetTires');
  const fleetSafetyRoutes = safeRequire('../routes/fleetSafety');
  const fleetFuelCardsRoutes = safeRequire('../routes/fleetFuelCards');
  const fleetInspectionsRoutes = safeRequire('../routes/fleetInspections');
  const driverTrainingRoutes = safeRequire('../routes/driverTraining');
  const vehicleInsuranceRoutes = safeRequire('../routes/vehicleInsurance');
  const fleetKPIRoutes = safeRequire('../routes/fleetKPI');
  const driverShiftsRoutes = safeRequire('../routes/driverShifts');
  const fleetComplianceRoutes = safeRequire('../routes/fleetCompliance');
  const trafficFinesRoutes = safeRequire('../routes/trafficFines');
  const fleetDocumentRoutes = safeRequire('../routes/fleetDocuments');
  const fleetPartRoutes = safeRequire('../routes/fleetParts');
  const cargoRoutes = safeRequire('../routes/cargo');
  const fleetReservationRoutes = safeRequire('../routes/fleetReservations');
  const vehicleAssignmentRoutes = safeRequire('../routes/vehicleAssignments');
  const fleetParkingRoutes = safeRequire('../routes/fleetParking');
  const fleetAlertRoutes = safeRequire('../routes/fleetAlerts');
  const driverLeaveRoutes = safeRequire('../routes/driverLeaves');
  const fleetFuelRoutes = safeRequire('../routes/fleetFuel');
  const fleetTollRoutes = safeRequire('../routes/fleetTolls');
  const fleetAccidentRoutes = safeRequire('../routes/fleetAccidents');
  const fleetWarrantyRoutes = safeRequire('../routes/fleetWarranties');
  const fleetRoutePlanRoutes = safeRequire('../routes/fleetRoutePlans');
  const fleetCommunicationRoutes = safeRequire('../routes/fleetCommunications');
  const fleetPenaltyRoutes = safeRequire('../routes/fleetPenalties');
  const fleetDisposalRoutes = safeRequire('../routes/fleetDisposals');

  // ── Mounts ───────────────────────────────────────────────────────────────
  dualMount(app, 'drivers', driversRoutes);
  dualMount(app, 'vehicles', vehiclesRoutes);
  dualMount(app, 'trips', tripsRoutes);
  dualMount(app, 'gps', gpsRoutes);
  dualMount(app, 'transport-routes', transportRoutesRouter);

  // Fleet & Transport Extended Modules (وحدات الأسطول والنقل الموسّعة)
  dualMount(app, 'geofences', geofenceRoutes);
  dualMount(app, 'dispatch', dispatchRoutes);
  dualMount(app, 'fleet-costs', fleetCostsRoutes);
  dualMount(app, 'fleet-tires', fleetTiresRoutes);
  dualMount(app, 'fleet-safety', fleetSafetyRoutes);
  dualMount(app, 'fleet-fuel-cards', fleetFuelCardsRoutes);
  dualMount(app, 'fleet-inspections', fleetInspectionsRoutes);
  dualMount(app, 'driver-training', driverTrainingRoutes);
  dualMount(app, 'vehicle-insurance', vehicleInsuranceRoutes);
  dualMount(app, 'fleet-kpi', fleetKPIRoutes);
  dualMount(app, 'driver-shifts', driverShiftsRoutes);
  dualMount(app, 'fleet-compliance', fleetComplianceRoutes);
  dualMount(app, 'traffic-fines', trafficFinesRoutes);
  dualMount(app, 'fleet-documents', fleetDocumentRoutes);
  dualMount(app, 'fleet-parts', fleetPartRoutes);
  dualMount(app, 'cargo', cargoRoutes);
  dualMount(app, 'fleet-reservations', fleetReservationRoutes);
  dualMount(app, 'vehicle-assignments', vehicleAssignmentRoutes);
  dualMount(app, 'fleet-parking', fleetParkingRoutes);
  dualMount(app, 'fleet-alerts', fleetAlertRoutes);
  dualMount(app, 'driver-leaves', driverLeaveRoutes);
  dualMount(app, 'fleet-fuel', fleetFuelRoutes);
  dualMount(app, 'fleet-tolls', fleetTollRoutes);
  dualMount(app, 'fleet-accidents', fleetAccidentRoutes);
  dualMount(app, 'fleet-warranties', fleetWarrantyRoutes);
  dualMount(app, 'fleet-route-plans', fleetRoutePlanRoutes);
  dualMount(app, 'fleet-communications', fleetCommunicationRoutes);
  dualMount(app, 'fleet-penalties', fleetPenaltyRoutes);
  dualMount(app, 'fleet-disposals', fleetDisposalRoutes);

  logger.info('Fleet & Transport extended modules mounted (29 modules, 400+ endpoints)');
};
