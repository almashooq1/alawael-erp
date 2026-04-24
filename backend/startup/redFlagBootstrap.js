/**
 * redFlagBootstrap.js — Beneficiary-360 Foundation Commit 10.
 *
 * Wires the full red-flag vertical slice at application startup:
 * locator (with placeholder stub services ready to swap for real
 * ones), engine, persistent Mongo state store, override log, admin
 * aggregate service, and the scheduled evaluator.
 *
 * Deliberately minimal — this file doesn't know about auth or
 * branch scope; those are applied by the caller (app.js) when
 * mounting the returned routers. Keeping bootstrap dumb makes it
 * easy to wire a different auth stack for staging / canary / test.
 *
 * The only cross-cutting concern handled here is "what do we do
 * when the Mongo connection isn't ready at bootstrap time?" Answer:
 * we return `null` and let the caller skip mounting — the red-flag
 * surface is optional from an app-boot standpoint, not critical
 * for the API to come up.
 *
 * Usage in app.js:
 *
 *   try {
 *     const redFlags = bootstrapRedFlagSystem({ logger });
 *     if (redFlags) {
 *       app.use('/api/v1/beneficiaries',
 *         authenticate, requireBranchAccess, redFlags.router);
 *       app.use('/api/v1/admin/red-flags',
 *         authenticate, requireAdminRole, redFlags.adminRouter);
 *       if (!isTestEnv) redFlags.scheduler.start();
 *     }
 *   } catch (err) {
 *     logger.warn('[RedFlag] bootstrap skipped:', err.message);
 *   }
 *
 * To wire real service observations: after `bootstrapRedFlagSystem`,
 * call `redFlags.locator.register('attendanceService', realAttendanceService)`
 * for each service referenced by `RED_FLAGS[*].trigger.source.service`.
 * Until those registrations happen, the engine records per-flag
 * `locator-error` verdicts — loud and observable, exactly what we
 * want during a phased rollout.
 */

'use strict';

const mongoose = require('mongoose');

const { createLocator } = require('../services/redFlagServiceLocator');
const { createEngine } = require('../services/redFlagEngine');
const { createMongoStateStore } = require('../services/redFlagMongoStateStore');
const { createStateStore } = require('../services/redFlagStateStore');
const { createOverrideLog } = require('../services/redFlagOverrideLog');
const { createAggregateService } = require('../services/redFlagAggregateService');
const { createScheduledEvaluator } = require('../services/redFlagScheduler');
const { createRedFlagRouter } = require('../routes/beneficiary-red-flags.routes');
const { createRedFlagAdminRouter } = require('../routes/red-flag-admin.routes');

// Observation adapters (Commit 11) — real data sources for a
// subset of registry flags. Loaded lazily with safe fallback so
// bootstrap still works in stripped-down test harnesses.
const {
  createSessionAttendanceObservations,
} = require('../services/redFlagObservations/sessionAttendanceObservations');
const {
  createInvoiceObservations,
} = require('../services/redFlagObservations/invoiceObservations');
const {
  createBeneficiaryObservations,
} = require('../services/redFlagObservations/beneficiaryObservations');
const { createCpeObservations } = require('../services/redFlagObservations/cpeObservations');
const {
  createCarePlanObservations,
} = require('../services/redFlagObservations/carePlanObservations');
const {
  createCaseloadObservations,
} = require('../services/redFlagObservations/caseloadObservations');
const {
  createIncidentObservations,
} = require('../services/redFlagObservations/incidentObservations');
const {
  createInsuranceObservations,
} = require('../services/redFlagObservations/insuranceObservations');
const {
  createPortalActivityObservations,
} = require('../services/redFlagObservations/portalActivityObservations');
const {
  createConsentObservations,
} = require('../services/redFlagObservations/consentObservations');
const {
  createMessagingObservations,
} = require('../services/redFlagObservations/messagingObservations');
const {
  createGuardianObservations,
} = require('../services/redFlagObservations/guardianObservations');
const {
  createMedicationObservations,
} = require('../services/redFlagObservations/medicationObservations');
const { createVitalsObservations } = require('../services/redFlagObservations/vitalsObservations');
const {
  createVaccinationObservations,
} = require('../services/redFlagObservations/vaccinationObservations');
const {
  createHomeCarryoverObservations,
} = require('../services/redFlagObservations/homeCarryoverObservations');
const { createPdplObservations } = require('../services/redFlagObservations/pdplObservations');
const {
  createContractObservations,
} = require('../services/redFlagObservations/contractObservations');
const {
  createGoalProgressObservations,
} = require('../services/redFlagObservations/goalProgressObservations');
const {
  createBehaviorTrackingObservations,
} = require('../services/redFlagObservations/behaviorTrackingObservations');
const {
  createHrCredentialObservations,
} = require('../services/redFlagObservations/hrCredentialObservations');
const {
  createHrWorkforceObservations,
} = require('../services/redFlagObservations/hrWorkforceObservations');

// Phase-9 Commit 10 — wire the rehab review service as a red-flag
// trigger source. Unlike the observation adapters above, this one
// is a full service (summarize + recordReview + upcomingReviews)
// that also happens to satisfy the daysPastReviewDate contract.
const { createCarePlanReviewService } = require('../services/carePlanReviewService');

const RedFlagStateModel = require('../models/RedFlagState');
const RedFlagOverrideModel = require('../models/RedFlagOverride');

function tryLoadModel(path) {
  try {
    return require(path);
  } catch {
    return null;
  }
}

const DEFAULT_LOGGER = {
  info: (...args) => console.log('[RedFlag]', ...args),
  warn: (...args) => console.warn('[RedFlag]', ...args),
  error: (...args) => console.error('[RedFlag]', ...args),
};

/**
 * Default beneficiary-id provider. Returns an empty array unless a
 * real implementation is injected — keeps the scheduler harmless
 * until the caller wires in the right query.
 */
async function defaultGetBeneficiaryIds() {
  return [];
}

/**
 * Build a default provider that queries the Beneficiary model for
 * active records. Falls back to `defaultGetBeneficiaryIds` if the
 * model can't be loaded.
 */
function buildDefaultBeneficiaryIdsProvider(logger) {
  const Beneficiary = tryLoadModel('../models/Beneficiary');
  if (Beneficiary == null) {
    logger.warn('Beneficiary model not loadable — scheduler will run over an empty list');
    return defaultGetBeneficiaryIds;
  }
  return async () => {
    const docs = await Beneficiary.find({ status: 'active' }, '_id').limit(5000).lean();
    return docs.map(d => String(d._id));
  };
}

function bootstrapRedFlagSystem(options = {}) {
  const logger = options.logger || DEFAULT_LOGGER;
  const cron = options.cron; // optional — inject node-cron when scheduler.start() will be used
  const storeMode = options.storeMode || 'auto'; // 'auto' | 'mongo' | 'memory'
  // Observation registration mode — 'auto' registers real adapters
  // when their models are discoverable on the filesystem; 'none'
  // skips (leaves locator-errors as verdicts). Tests typically
  // override with explicit `observationServices` injection.
  const observationMode = options.observationMode || 'auto';
  const customObservations = options.observationServices || {};

  const locator = createLocator();

  // Pick persistence based on availability. `auto` promotes to Mongo
  // when a connection is live; falls back to in-memory otherwise so
  // boot never explodes on a cold/misconfigured DB in dev.
  let store;
  let backend = 'memory';
  const mongoReady = mongoose.connection && mongoose.connection.readyState === 1;
  if (storeMode === 'mongo' || (storeMode === 'auto' && mongoReady)) {
    store = createMongoStateStore();
    backend = 'mongo';
  } else {
    store = createStateStore();
    backend = 'memory';
    if (storeMode === 'auto' && !mongoReady) {
      logger.warn('Mongo not connected at bootstrap — using in-memory store');
    }
  }

  // ─── Register observation adapters on the locator ────────────
  // Real data-backed observations for the flags covered in Commit
  // 11. Callers can pass additional ones via observationServices
  // to cover their own adapters (e.g., consentService once built).
  if (observationMode === 'auto') {
    const SessionAttendanceModel = tryLoadModel('../models/SessionAttendance');
    if (SessionAttendanceModel) {
      locator.register(
        'attendanceService',
        createSessionAttendanceObservations({ model: SessionAttendanceModel })
      );
    }
    const InvoiceModel = tryLoadModel('../models/Invoice');
    if (InvoiceModel) {
      locator.register('invoiceService', createInvoiceObservations({ model: InvoiceModel }));
    }
    const BeneficiaryModel = tryLoadModel('../models/Beneficiary');
    if (BeneficiaryModel) {
      locator.register(
        'beneficiaryService',
        createBeneficiaryObservations({ model: BeneficiaryModel })
      );
    }
    // CPE needs two models — register only if both are loadable, so
    // the observation either works end-to-end or doesn't register at
    // all (loud `locator-error` on the flag is preferable to a half-
    // wired adapter that silently returns wrong numbers).
    const SessionAttendanceForCpe = tryLoadModel('../models/SessionAttendance');
    const HrEmployeeModel = tryLoadModel('../models/HR/Employee');
    if (SessionAttendanceForCpe && HrEmployeeModel) {
      locator.register(
        'cpeService',
        createCpeObservations({
          sessionAttendanceModel: SessionAttendanceForCpe,
          employeeModel: HrEmployeeModel,
        })
      );
      // Phase-11 Commit 1 — hrCredentialService backs the two new
      // critical+blocking flags (license.expired + mandatory_cert.expired).
      // Requires an additional Certification model; if it's missing we
      // skip registration so the flag records a loud locator-error
      // instead of silently returning zero counts.
      const HrCertificationModel = tryLoadModel('../models/hr/Certification');
      if (HrCertificationModel) {
        // EmploymentContract is a soft dep — older deployments may not
        // have it, in which case the contract flag records locator-error.
        // License + mandatory-cert flags still evaluate correctly.
        const HrEmploymentContractModel = tryLoadModel('../models/hr/EmploymentContract');
        locator.register(
          'hrCredentialService',
          createHrCredentialObservations({
            sessionAttendanceModel: SessionAttendanceForCpe,
            employeeModel: HrEmployeeModel,
            certificationModel: HrCertificationModel,
            employmentContractModel: HrEmploymentContractModel,
          })
        );
      }
      // Phase-11 Commit 3 — hrWorkforceService backs four info/warning
      // HR flags (leave overflow, review overdue, probation review,
      // shift-assignment sync). LeaveBalance/PerformanceReview/Shift
      // are all soft deps — missing model → locator-error on the
      // specific flag, others still resolve.
      const LeaveBalanceModel = tryLoadModel('../models/hr/LeaveBalance');
      const PerformanceReviewModel = tryLoadModel('../models/hr/PerformanceReview');
      const ShiftModel = tryLoadModel('../models/Shift');
      locator.register(
        'hrWorkforceService',
        createHrWorkforceObservations({
          sessionAttendanceModel: SessionAttendanceForCpe,
          employeeModel: HrEmployeeModel,
          leaveBalanceModel: LeaveBalanceModel,
          performanceReviewModel: PerformanceReviewModel,
          shiftModel: ShiftModel,
        })
      );
    }
    const CarePlanModel = tryLoadModel('../models/CarePlan');
    if (CarePlanModel) {
      locator.register('carePlanService', createCarePlanObservations({ model: CarePlanModel }));

      // Phase-9 Commit 10 — trigger source for
      // operational.care_plan.review.overdue + KPI feed for
      // rehab.care_plan.review.ontime.pct. Skips silently if the
      // PlanReview model isn't present (legacy deployments).
      const PlanReviewModel = tryLoadModel('../models/PlanReview');
      try {
        locator.register(
          'carePlanReviewService',
          createCarePlanReviewService({
            carePlanModel: CarePlanModel,
            planReviewModel: PlanReviewModel,
          })
        );
      } catch (reviewErr) {
        logger.warn('[RedFlag] carePlanReviewService registration skipped:', reviewErr.message);
      }
    }
    // Caseload reuses the SessionAttendance model already resolved
    // above for CPE — register only when that's present.
    if (SessionAttendanceForCpe) {
      locator.register(
        'caseloadService',
        createCaseloadObservations({
          sessionAttendanceModel: SessionAttendanceForCpe,
        })
      );
    }
    const IncidentModel = tryLoadModel('../models/quality/Incident.model');
    if (IncidentModel) {
      locator.register('incidentService', createIncidentObservations({ model: IncidentModel }));
    }
    const InsurancePolicyModel = tryLoadModel('../models/InsurancePolicy');
    if (InsurancePolicyModel) {
      locator.register(
        'insuranceService',
        createInsuranceObservations({ model: InsurancePolicyModel })
      );
    }
    const GuardianModel = tryLoadModel('../models/Guardian');
    if (GuardianModel) {
      locator.register(
        'portalActivityService',
        createPortalActivityObservations({ model: GuardianModel })
      );
      locator.register('guardianService', createGuardianObservations({ model: GuardianModel }));
    }
    // Consent needs BOTH Consent model (new) and Beneficiary model
    // (for the opt-in gate). If only one is present we skip — loud
    // locator-error beats half-wired silent-clear semantics.
    const ConsentExports = tryLoadModel('../models/Consent');
    if (ConsentExports && BeneficiaryModel) {
      locator.register(
        'consentService',
        createConsentObservations({
          consentModel: ConsentExports.Consent,
          beneficiaryModel: BeneficiaryModel,
          requiredTypes: ConsentExports.REQUIRED_TYPES,
        })
      );
    }
    const PortalMessageModel = tryLoadModel('../models/PortalMessage');
    if (PortalMessageModel) {
      locator.register(
        'messagingService',
        createMessagingObservations({ model: PortalMessageModel })
      );
    }
    // Medication + Allergy live in separate collections; both are
    // needed for the conflict/interaction flags. Register only if
    // both load — loud locator-error beats half-wired semantics.
    const AllergyExports = tryLoadModel('../models/Allergy');
    const MedicationExports = tryLoadModel('../models/MedicationOrder');
    if (AllergyExports && MedicationExports) {
      locator.register(
        'medicationService',
        createMedicationObservations({
          allergyModel: AllergyExports.Allergy,
          medicationModel: MedicationExports.MedicationOrder,
          severeSeverities: AllergyExports.SEVERE_SEVERITIES,
        })
      );
    }
    const VitalSignExports = tryLoadModel('../models/VitalSign');
    if (VitalSignExports) {
      locator.register(
        'vitalsService',
        createVitalsObservations({ model: VitalSignExports.VitalSign })
      );
    }
    const VaccinationExports = tryLoadModel('../models/Vaccination');
    if (VaccinationExports) {
      locator.register(
        'vaccinationService',
        createVaccinationObservations({ model: VaccinationExports.Vaccination })
      );
    }
    const HomeCarryoverExports = tryLoadModel('../models/HomeCarryoverEntry');
    if (HomeCarryoverExports) {
      locator.register(
        'homeCarryoverService',
        createHomeCarryoverObservations({
          model: HomeCarryoverExports.HomeCarryoverEntry,
        })
      );
    }
    const PdplRequestExports = tryLoadModel('../models/PdplRequest');
    if (PdplRequestExports) {
      locator.register(
        'pdplService',
        createPdplObservations({
          model: PdplRequestExports.PdplRequest,
          openStatuses: PdplRequestExports.OPEN_PDPL_STATUSES,
        })
      );
    }
    const BeneficiaryContractExports = tryLoadModel('../models/BeneficiaryContract');
    if (BeneficiaryContractExports) {
      locator.register(
        'contractService',
        createContractObservations({
          model: BeneficiaryContractExports.BeneficiaryContract,
        })
      );
    }
    const GoalProgressExports = tryLoadModel('../models/GoalProgressSnapshot');
    if (GoalProgressExports) {
      // Phase-9 Commit 12 — merge progressEngine's stalled/regression
      // adapter into the same service object so the registry's three
      // goalProgressService flags all resolve through one locator key:
      //   • clinical.progress.regression.significant → deltaVsBaseline
      //   • clinical.goal.stalled.21d               → daysSinceLastProgress
      //   • clinical.goal.regression.consecutive_2   → consecutiveRatings
      const baseObs = createGoalProgressObservations({
        model: GoalProgressExports.GoalProgressSnapshot,
      });
      let progressLifecycle = null;
      try {
        const { buildGoalProgressTriggerSource } = require('../services/progressEngine');
        const GoalProgressEntry = tryLoadModel('../models/GoalProgressEntry');
        if (GoalProgressEntry) {
          progressLifecycle = buildGoalProgressTriggerSource({
            fetchEntries: async ({ goalId }) => {
              if (!goalId) return [];
              return GoalProgressEntry.find({ goal: goalId }).sort({ recordedAt: 1 }).lean();
            },
          });
        }
      } catch (lifecycleErr) {
        logger.warn('[RedFlag] progressEngine trigger-source skipped:', lifecycleErr.message);
      }
      locator.register(
        'goalProgressService',
        progressLifecycle ? Object.assign({}, baseObs, progressLifecycle) : baseObs
      );
    }
    const BehaviorIncidentExports = tryLoadModel('../models/BehaviorIncident');
    if (BehaviorIncidentExports) {
      locator.register(
        'behaviorTrackingService',
        createBehaviorTrackingObservations({
          model: BehaviorIncidentExports.BehaviorIncident,
        })
      );
    }
  }
  for (const [name, impl] of Object.entries(customObservations)) {
    locator.register(name, impl);
  }

  // ─── Beneficiary-id provider ─────────────────────────────────
  // If the caller didn't inject one, auto-wire against the
  // Beneficiary model. Falls back to an empty-array provider so
  // bootstrap is still safe on systems where the model isn't
  // reachable at load time.
  const getBeneficiaryIds = options.getBeneficiaryIds || buildDefaultBeneficiaryIdsProvider(logger);

  const overrideLog = createOverrideLog({ model: RedFlagOverrideModel });
  const engine = createEngine({ locator });

  const aggregateService = createAggregateService({
    stateModel: RedFlagStateModel,
    overrideModel: RedFlagOverrideModel,
  });

  const router = createRedFlagRouter({ engine, store, overrideLog });
  const adminRouter = createRedFlagAdminRouter({ aggregateService });

  const scheduler = createScheduledEvaluator({
    engine,
    store,
    getBeneficiaryIds,
    logger,
    cron,
  });

  logger.info(
    `bootstrapped — store=${backend}, observations=${locator.list().length} services (${locator.list().join(', ') || 'none'})`
  );

  return {
    locator,
    engine,
    store,
    overrideLog,
    aggregateService,
    scheduler,
    router,
    adminRouter,
    backend,
  };
}

module.exports = { bootstrapRedFlagSystem };
