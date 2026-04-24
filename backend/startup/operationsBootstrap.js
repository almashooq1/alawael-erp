'use strict';

/**
 * operationsBootstrap.js — Phase 16 Commit 1 (4.0.66).
 *
 * Wires the ops layer at application startup. For this first commit
 * the only live component is the SLA engine. Future commits in Phase
 * 16 will add: work-order state machine, PR→PO chain, route
 * optimisation, meeting decisions auto-task, ops control tower.
 *
 * Style mirrors `qualityComplianceBootstrap.js`:
 *   • pure wiring
 *   • returns `null` if Mongo isn't connected
 *   • dispatcher is optional — defaults to the quality event bus so
 *     ops events land on the same bus that Phase 15 already routes
 *     via notification-policies.registry.js
 *   • graceful shutdown hook registered by the caller
 */

const mongoose = require('mongoose');
const { createSlaEngine } = require('../services/operations/slaEngine.service');
const slaEngineModule = require('../services/operations/slaEngine.service');
const {
  createWorkOrderStateMachine,
} = require('../services/operations/workOrderStateMachine.service');
const {
  createFacilityService,
  createFacilityInspectionService,
} = require('../services/operations/facility.service');
const { createPurchaseRequestService } = require('../services/operations/purchaseRequest.service');
const { createOpsDashboardService } = require('../services/operations/opsDashboard.service');
const opsDashboardModule = require('../services/operations/opsDashboard.service');
const {
  createMeetingGovernanceService,
} = require('../services/operations/meetingGovernance.service');
const {
  createRouteOptimizationService,
} = require('../services/operations/routeOptimization.service');
const {
  createNotificationDispatchService,
} = require('../services/operations/notificationDispatch.service');

let _workOrderStateMachine = null;
let _facilityService = null;
let _facilityInspectionService = null;
let _purchaseRequestService = null;
let _opsDashboardService = null;
let _meetingGovernanceService = null;
let _routeOptimizationService = null;
let _notificationDispatchService = null;

function bootstrapOperations({ logger = console, dispatcher = null, startSchedulers = true } = {}) {
  if (mongoose.connection.readyState !== 1) {
    logger.warn('[Ops] bootstrap skipped — mongoose not connected');
    return null;
  }

  // Default dispatcher = qualityEventBus so ops.* events land on the
  // same bus Phase 15 notification router is already subscribed to.
  let bus = dispatcher;
  if (!bus) {
    try {
      const { getDefault } = require('../services/quality/qualityEventBus.service');
      bus = getDefault();
    } catch (err) {
      logger.warn(`[Ops] could not reuse qualityEventBus: ${err.message}`);
      bus = null;
    }
  }

  const slaEngine = createSlaEngine({ dispatcher: bus, logger });
  slaEngineModule._replaceDefault(slaEngine);

  // Phase 16 C2 — work-order state machine, wired with the SLA
  // engine so every transition keeps the clock in sync.
  let workOrderStateMachine = null;
  try {
    const WorkOrderModel = require('../models/MaintenanceWorkOrder');
    workOrderStateMachine = createWorkOrderStateMachine({
      workOrderModel: WorkOrderModel,
      slaEngine,
      dispatcher: bus,
      logger,
    });
    _workOrderStateMachine = workOrderStateMachine;
  } catch (err) {
    logger.warn(`[Ops] work-order state machine unavailable: ${err.message}`);
  }

  // Phase 16 C3 — Facility + FacilityInspection services, wired with
  // the SLA engine (every finding activates facility.inspection.closeout)
  // and with the WO state-machine (critical/major findings auto-spawn
  // corrective-maintenance work orders).
  let facilityService = null;
  let facilityInspectionService = null;
  try {
    const Facility = require('../models/operations/Facility.model');
    const FacilityInspection = require('../models/operations/FacilityInspection.model');
    const WorkOrderModel = require('../models/MaintenanceWorkOrder');
    facilityService = createFacilityService({
      facilityModel: Facility,
      inspectionModel: FacilityInspection,
      logger,
    });
    facilityInspectionService = createFacilityInspectionService({
      inspectionModel: FacilityInspection,
      facilityModel: Facility,
      slaEngine,
      workOrderStateMachine,
      workOrderModel: WorkOrderModel,
      dispatcher: bus,
      logger,
    });
    _facilityService = facilityService;
    _facilityInspectionService = facilityInspectionService;
  } catch (err) {
    logger.warn(`[Ops] facility services unavailable: ${err.message}`);
  }

  // Phase 16 C4 — PR→PO service, wired with the SLA engine (both
  // `procurement.pr.approval` and `procurement.po.issuance` policies)
  // and the existing inventory PurchaseOrder model.
  let purchaseRequestService = null;
  try {
    const PurchaseRequestModel = require('../models/operations/PurchaseRequest.model');
    const PurchaseOrderModel = require('../models/inventory/PurchaseOrder');
    purchaseRequestService = createPurchaseRequestService({
      prModel: PurchaseRequestModel,
      poModel: PurchaseOrderModel,
      slaEngine,
      dispatcher: bus,
      logger,
    });
    _purchaseRequestService = purchaseRequestService;
  } catch (err) {
    logger.warn(`[Ops] purchase-request service unavailable: ${err.message}`);
  }

  // Phase 16 C8 — Notification dispatch upgrades (priority / quiet-hours /
  // fallback / digest). Sits on top of the Phase-15 notification router;
  // routes + services can call `planDispatch` + `sendWithFallback` directly.
  let notificationDispatchService = null;
  try {
    const NotificationPreferences = require('../models/operations/NotificationPreferences.model');
    const NotificationDigestItem = require('../models/operations/NotificationDigestItem.model');
    notificationDispatchService = createNotificationDispatchService({
      preferencesModel: NotificationPreferences,
      digestModel: NotificationDigestItem,
      dispatcher: bus,
      logger,
    });
    _notificationDispatchService = notificationDispatchService;
  } catch (err) {
    logger.warn(`[Ops] notification-dispatch service unavailable: ${err.message}`);
  }

  // Phase 16 C7 — Route optimization (transport planning + reconciliation).
  // Per-stop SLA clocks (`transport.trip.pickup`), planned vs actual
  // variance tracking, geographic-bucket optimizer.
  let routeOptimizationService = null;
  try {
    const RouteJobModel = require('../models/operations/RouteOptimizationJob.model');
    routeOptimizationService = createRouteOptimizationService({
      jobModel: RouteJobModel,
      slaEngine,
      dispatcher: bus,
      logger,
    });
    _routeOptimizationService = routeOptimizationService;
  } catch (err) {
    logger.warn(`[Ops] route-optimization service unavailable: ${err.message}`);
  }

  // Phase 16 C6 — Meeting governance (decisions + follow-up + minutes SLA).
  // Promotes Meeting decisions to a first-class collection with a
  // lifecycle, SLA wiring, and cross-meeting follow-up board.
  let meetingGovernanceService = null;
  try {
    const MeetingModel = require('../models/Meeting');
    const MeetingDecisionModel = require('../models/operations/MeetingDecision.model');
    meetingGovernanceService = createMeetingGovernanceService({
      meetingModel: MeetingModel,
      decisionModel: MeetingDecisionModel,
      slaEngine,
      dispatcher: bus,
      logger,
    });
    _meetingGovernanceService = meetingGovernanceService;
  } catch (err) {
    logger.warn(`[Ops] meeting-governance service unavailable: ${err.message}`);
  }

  // Phase 16 C5 — Ops Control Tower dashboard aggregator. Pure
  // read-side; wired with every model this phase has introduced
  // plus the existing MaintenanceWorkOrder.
  let opsDashboardService = null;
  try {
    const SLAModel = require('../models/operations/SLA.model');
    const SLABreachModel = require('../models/operations/SLABreach.model');
    const WorkOrderModel = require('../models/MaintenanceWorkOrder');
    const PurchaseRequestModel = require('../models/operations/PurchaseRequest.model');
    const FacilityInspectionModel = require('../models/operations/FacilityInspection.model');
    const FacilityModel = require('../models/operations/Facility.model');
    opsDashboardService = createOpsDashboardService({
      slaEngine,
      slaModel: SLAModel,
      slaBreachModel: SLABreachModel,
      workOrderModel: WorkOrderModel,
      purchaseRequestModel: PurchaseRequestModel,
      facilityInspectionModel: FacilityInspectionModel,
      facilityModel: FacilityModel,
      logger,
    });
    opsDashboardModule._replaceDefault(opsDashboardService);
    _opsDashboardService = opsDashboardService;
  } catch (err) {
    logger.warn(`[Ops] dashboard service unavailable: ${err.message}`);
  }

  if (startSchedulers) {
    try {
      slaEngine.start();
    } catch (err) {
      logger.warn(`[Ops] SLA engine failed to start: ${err.message}`);
    }
  }

  logger.info(
    '[Ops] Phase 16 bootstrap complete — SLA + WO SM + Facility + PR→PO + Control Tower + Meeting Gov + Route Opt + Notif Dispatch online'
  );

  async function shutdown() {
    try {
      slaEngine.stop();
    } catch {
      /* ignore */
    }
  }

  return {
    slaEngine,
    workOrderStateMachine,
    facilityService,
    facilityInspectionService,
    purchaseRequestService,
    opsDashboardService,
    meetingGovernanceService,
    routeOptimizationService,
    notificationDispatchService,
    shutdown,
  };
}

/**
 * Late-binding accessors used by routes so the HTTP layer picks
 * up the fully-wired instances without a circular require.
 */
function _getWorkOrderStateMachine() {
  return _workOrderStateMachine;
}
function _getFacilityService() {
  return _facilityService;
}
function _getFacilityInspectionService() {
  return _facilityInspectionService;
}
function _getPurchaseRequestService() {
  return _purchaseRequestService;
}
function _getOpsDashboardService() {
  return _opsDashboardService;
}
function _getMeetingGovernanceService() {
  return _meetingGovernanceService;
}
function _getRouteOptimizationService() {
  return _routeOptimizationService;
}
function _getNotificationDispatchService() {
  return _notificationDispatchService;
}

module.exports = {
  bootstrapOperations,
  _getWorkOrderStateMachine,
  _getFacilityService,
  _getFacilityInspectionService,
  _getPurchaseRequestService,
  _getOpsDashboardService,
  _getMeetingGovernanceService,
  _getRouteOptimizationService,
  _getNotificationDispatchService,
};
