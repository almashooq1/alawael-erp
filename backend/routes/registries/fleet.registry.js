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
  // PHANTOM: const vehiclesRoutes = safeRequire('../routes/vehicles');
  // PHANTOM: const tripsRoutes = safeRequire('../routes/trips');
  // PHANTOM: const gpsRoutes = safeRequire('../routes/gps');
  // PHANTOM: const transportRoutesRouter = safeRequire('../routes/transportRoutes');
  // PHANTOM: const geofenceRoutes = safeRequire('../routes/geofences');
  // PHANTOM: const dispatchRoutes = safeRequire('../routes/dispatch');
  // PHANTOM: const fleetCostsRoutes = safeRequire('../routes/fleetCosts');
  // PHANTOM: const fleetTiresRoutes = safeRequire('../routes/fleetTires');
  // PHANTOM: const fleetSafetyRoutes = safeRequire('../routes/fleetSafety');
  // PHANTOM: const fleetFuelCardsRoutes = safeRequire('../routes/fleetFuelCards');
  // PHANTOM: const fleetInspectionsRoutes = safeRequire('../routes/fleetInspections');
  // PHANTOM: const driverTrainingRoutes = safeRequire('../routes/driverTraining');
  // PHANTOM: const vehicleInsuranceRoutes = safeRequire('../routes/vehicleInsurance');
  // PHANTOM: const fleetKPIRoutes = safeRequire('../routes/fleetKPI');
  // PHANTOM: const driverShiftsRoutes = safeRequire('../routes/driverShifts');
  // PHANTOM: const fleetComplianceRoutes = safeRequire('../routes/fleetCompliance');
  // PHANTOM: const trafficFinesRoutes = safeRequire('../routes/trafficFines');
  // PHANTOM: const fleetDocumentRoutes = safeRequire('../routes/fleetDocuments');
  // PHANTOM: const fleetPartRoutes = safeRequire('../routes/fleetParts');
  // PHANTOM: const cargoRoutes = safeRequire('../routes/cargo');
  // PHANTOM: const fleetReservationRoutes = safeRequire('../routes/fleetReservations');
  // PHANTOM: const vehicleAssignmentRoutes = safeRequire('../routes/vehicleAssignments');
  // PHANTOM: const fleetParkingRoutes = safeRequire('../routes/fleetParking');
  // PHANTOM: const fleetAlertRoutes = safeRequire('../routes/fleetAlerts');
  // PHANTOM: const driverLeaveRoutes = safeRequire('../routes/driverLeaves');
  // PHANTOM: const fleetFuelRoutes = safeRequire('../routes/fleetFuel');
  // PHANTOM: const fleetTollRoutes = safeRequire('../routes/fleetTolls');
  // PHANTOM: const fleetAccidentRoutes = safeRequire('../routes/fleetAccidents');
  // PHANTOM: const fleetWarrantyRoutes = safeRequire('../routes/fleetWarranties');
  // PHANTOM: const fleetRoutePlanRoutes = safeRequire('../routes/fleetRoutePlans');
  // PHANTOM: const fleetCommunicationRoutes = safeRequire('../routes/fleetCommunications');
  // PHANTOM: const fleetPenaltyRoutes = safeRequire('../routes/fleetPenalties');
  // PHANTOM: const fleetDisposalRoutes = safeRequire('../routes/fleetDisposals');

  // ── Mounts ───────────────────────────────────────────────────────────────
  dualMount(app, 'drivers', driversRoutes);

  // PHANTOM: Route files below do NOT exist yet — dualMount calls removed to
  // prevent ReferenceError crash.  Re-enable as route files are implemented.
  // dualMount(app, 'vehicles', vehiclesRoutes);
  // dualMount(app, 'trips', tripsRoutes);
  // dualMount(app, 'gps', gpsRoutes);
  // dualMount(app, 'transport-routes', transportRoutesRouter);
  // dualMount(app, 'geofences', geofenceRoutes);
  // dualMount(app, 'dispatch', dispatchRoutes);
  // dualMount(app, 'fleet-costs', fleetCostsRoutes);
  // dualMount(app, 'fleet-tires', fleetTiresRoutes);
  // dualMount(app, 'fleet-safety', fleetSafetyRoutes);
  // dualMount(app, 'fleet-fuel-cards', fleetFuelCardsRoutes);
  // dualMount(app, 'fleet-inspections', fleetInspectionsRoutes);
  // dualMount(app, 'driver-training', driverTrainingRoutes);
  // dualMount(app, 'vehicle-insurance', vehicleInsuranceRoutes);
  // dualMount(app, 'fleet-kpi', fleetKPIRoutes);
  // dualMount(app, 'driver-shifts', driverShiftsRoutes);
  // dualMount(app, 'fleet-compliance', fleetComplianceRoutes);
  // dualMount(app, 'traffic-fines', trafficFinesRoutes);
  // dualMount(app, 'fleet-documents', fleetDocumentRoutes);
  // dualMount(app, 'fleet-parts', fleetPartRoutes);
  // dualMount(app, 'cargo', cargoRoutes);
  // dualMount(app, 'fleet-reservations', fleetReservationRoutes);
  // dualMount(app, 'vehicle-assignments', vehicleAssignmentRoutes);
  // dualMount(app, 'fleet-parking', fleetParkingRoutes);
  // dualMount(app, 'fleet-alerts', fleetAlertRoutes);
  // dualMount(app, 'driver-leaves', driverLeaveRoutes);
  // dualMount(app, 'fleet-fuel', fleetFuelRoutes);
  // dualMount(app, 'fleet-tolls', fleetTollRoutes);
  // dualMount(app, 'fleet-accidents', fleetAccidentRoutes);
  // dualMount(app, 'fleet-warranties', fleetWarrantyRoutes);
  // dualMount(app, 'fleet-route-plans', fleetRoutePlanRoutes);
  // dualMount(app, 'fleet-communications', fleetCommunicationRoutes);
  // dualMount(app, 'fleet-penalties', fleetPenaltyRoutes);
  // dualMount(app, 'fleet-disposals', fleetDisposalRoutes);

  logger.info('Fleet & Transport: drivers mounted (33 phantom routes pending implementation)');
};
