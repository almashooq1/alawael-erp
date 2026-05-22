'use strict';

/**
 * hikvisionBootstrap.js — Wave 277 (Pass 1 of app.js refactor).
 *
 * Extracted verbatim from the monolithic `app.js` (lines 2244-3088
 * pre-W277, ~844 LOC) into a single bootstrap function so the entry
 * point shrinks. NO behaviour change — every require, every order,
 * every `enforceMfa: true` flag (W275 series), every `app.use`, every
 * `app._hikvisionXxx` reference is preserved.
 *
 * Original section comments preserved inline for traceability with
 * MEMORY.md and the W275 commit history.
 *
 * ── Contract ─────────────────────────────────────────────────────
 *
 * The block previously ran at module load with access to module-scope
 * `app`, `logger`, and `process.env`. After extraction:
 *   - `app` + `logger` are passed via the `deps` argument
 *   - `process.env` is still read directly (Node global)
 *   - All `./xxx` relative requires are rewritten to `../xxx` since
 *     this file lives one directory deeper
 *
 * Idempotency: never call twice. The block was wrapped in a single
 * outer try/catch in app.js — same shape preserved here.
 *
 * Foundation: device registry + raw event ingestion + device health
 * monitoring. Phases 2-5 (face library, recognition, attendance
 * integration, fraud) extend these services additively without
 * breaking this wiring.
 *
 * Mounts /api/v1/hikvision behind authenticate. The /webhooks/events
 * sub-route uses HMAC verification (HIKVISION_WEBHOOK_SECRET) and
 * BYPASSES authenticate — devices cannot present a user bearer. If
 * the secret is unset, the webhook route is silently skipped (manual
 * replay endpoint stays available).
 *
 * Graceful degradation:
 *   • Any missing model ⇒ skip mount + warn
 *   • Missing governance ⇒ skip mount (consistent with Wave 72)
 *
 * @param {import('express').Express} app
 * @param {{ logger: any }} deps
 */
function wireHikvision(app, deps = {}) {
  const { logger } = deps;
  if (!app || !logger) {
    throw new Error('hikvisionBootstrap.wireHikvision: app + logger required');
  }

  try {
    let HikvisionDevice = null;
    let HikvisionCameraChannel = null;
    let HikvisionRawEvent = null;
    let HikvisionDeviceHealthLog = null;
    let HikvisionFaceLibrary = null;
    let HikvisionFaceTemplateLink = null;
    try {
      HikvisionDevice = require('../models/HikvisionDevice');
      HikvisionCameraChannel = require('../models/HikvisionCameraChannel');
      HikvisionRawEvent = require('../models/HikvisionRawEvent');
      HikvisionDeviceHealthLog = require('../models/HikvisionDeviceHealthLog');
    } catch {
      /* models optional in test/dev — router skipped if any are absent */
    }
    // Wave 97 Phase 2 — face library + template models (optional)
    try {
      HikvisionFaceLibrary = require('../models/HikvisionFaceLibrary');
      HikvisionFaceTemplateLink = require('../models/HikvisionFaceTemplateLink');
    } catch {
      /* Phase 2 models optional — library/template routes skipped if absent */
    }

    // Wave 98 Phase 3 — recognition + confidence review models (optional)
    let HikvisionProcessedEvent = null;
    let AttendanceSourceEvent = null;
    let AttendanceConfidenceReview = null;
    try {
      HikvisionProcessedEvent = require('../models/HikvisionProcessedEvent');
      AttendanceSourceEvent = require('../models/AttendanceSourceEvent');
      AttendanceConfidenceReview = require('../models/AttendanceConfidenceReview');
    } catch {
      /* Phase 3 models optional — parser/review routes skipped if absent */
    }

    // Wave 99 Phase 4 — attendance integration models (optional)
    let AttendanceReconciliationCase = null;
    let PayrollPeriod = null;
    let AttendancePayrollOverride = null;
    try {
      AttendanceReconciliationCase = require('../models/AttendanceReconciliationCase');
      PayrollPeriod = require('../models/PayrollPeriod');
      AttendancePayrollOverride = require('../models/AttendancePayrollOverride');
    } catch {
      /* Phase 4 models optional — reconciliation/payroll routes skipped if absent */
    }

    // Wave 100 Phase 5 — fraud detection models (optional)
    let HikvisionFraudFlag = null;
    let HikvisionFraudScore = null;
    try {
      HikvisionFraudFlag = require('../models/HikvisionFraudFlag');
      HikvisionFraudScore = require('../models/HikvisionFraudScore');
    } catch {
      /* Phase 5 models optional — fraud routes skipped if absent */
    }

    // Wave 108 — scheduler run history (optional)
    let HikvisionJobRun = null;
    try {
      HikvisionJobRun = require('../models/HikvisionJobRun');
    } catch {
      /* scheduler model optional — scheduler routes skipped if absent */
    }

    // Wave 110 — per-branch config overrides (optional)
    let HikvisionBranchConfig = null;
    try {
      HikvisionBranchConfig = require('../models/HikvisionBranchConfig');
    } catch {
      /* branch-config model optional — overrides skipped if absent */
    }

    if (
      HikvisionDevice &&
      HikvisionCameraChannel &&
      HikvisionRawEvent &&
      HikvisionDeviceHealthLog
    ) {
      let governanceSvc = null;
      try {
        const { createGovernanceService } = require('../intelligence/governance.service');
        governanceSvc = createGovernanceService({ logger });
      } catch {
        /* governance must load — top-level boot already logged the failure */
      }

      if (governanceSvc) {
        const {
          createHikvisionDeviceService,
        } = require('../intelligence/hikvision-device.service');
        const {
          createHikvisionEventIngestionService,
        } = require('../intelligence/hikvision-event-ingestion.service');
        const {
          createHikvisionHealthService,
        } = require('../intelligence/hikvision-health.service');
        const hikRoutesMod = require('../routes/hikvision.routes');
        const createHikvisionRouter = hikRoutesMod.createHikvisionRouter || hikRoutesMod;
        const { createHikvisionWebhookRouter } = hikRoutesMod;

        const deviceService = createHikvisionDeviceService({
          deviceModel: HikvisionDevice,
          channelModel: HikvisionCameraChannel,
          logger,
        });
        const ingestionService = createHikvisionEventIngestionService({
          deviceModel: HikvisionDevice,
          channelModel: HikvisionCameraChannel,
          rawEventModel: HikvisionRawEvent,
          logger,
        });
        const healthService = createHikvisionHealthService({
          deviceModel: HikvisionDevice,
          healthLogModel: HikvisionDeviceHealthLog,
          logger,
          // W275t — gates sweepStaleDevices only; recordHeartbeat stays
          // open for device webhook ingest.
          enforceMfa: true,
        });

        // Wave 97 Phase 2 — face library + enrollment (graceful)
        let libraryService = null;
        let enrollmentService = null;
        if (HikvisionFaceLibrary && HikvisionFaceTemplateLink) {
          try {
            const {
              createHikvisionFaceLibraryService,
            } = require('../intelligence/hikvision-face-library.service');
            const {
              createHikvisionFaceEnrollmentService,
            } = require('../intelligence/hikvision-face-enrollment.service');
            libraryService = createHikvisionFaceLibraryService({
              libraryModel: HikvisionFaceLibrary,
              templateModel: HikvisionFaceTemplateLink,
              deviceModel: HikvisionDevice,
              logger,
            });
            let employeeModel = null;
            try {
              employeeModel = require('../models/HR/Employee');
            } catch {
              /* HR Employee model optional — enrollment tolerates absence */
            }
            enrollmentService = createHikvisionFaceEnrollmentService({
              templateModel: HikvisionFaceTemplateLink,
              libraryModel: HikvisionFaceLibrary,
              employeeModel,
              logger,
              // Wave 275c — service-layer MFA enforcement on suspendTemplate
              // (T2) + deactivateOnExit (T2). Mirrors route-layer requireMfaTier
              // on /templates/:id/suspend (W273) + /templates/exit-cascade
              // (added W275c — closing W273 oversight).
              enforceMfa: true,
            });
          } catch (p2err) {
            logger.warn(
              '[Hikvision] Phase 2 face library/enrollment services failed to wire:',
              p2err.message
            );
            libraryService = null;
            enrollmentService = null;
          }
        } else {
          logger.info(
            '[Hikvision] Phase 2 face library/template models not loaded; library routes skipped'
          );
        }

        // Wave 110 — per-branch config overrides (graceful). Built
        // BEFORE Phase 3 so the parser can consult it for effective
        // thresholds. Falls back to defaults when the model isn't
        // loaded — no per-branch overrides applied in that case.
        let branchConfigSvc = null;
        if (HikvisionBranchConfig) {
          try {
            const {
              createHikvisionBranchConfigService,
            } = require('../intelligence/hikvision-branch-config.service');
            branchConfigSvc = createHikvisionBranchConfigService({
              configModel: HikvisionBranchConfig,
              logger,
              // Wave 275f — service-layer MFA on upsert (T2). reset()
              // chains through upsert so it's auto-protected. Mirrors
              // route-layer requireMfaTier on PUT/DELETE /branch-configs/:branchId.
              enforceMfa: true,
            });
          } catch (bcErr) {
            logger.warn('[Hikvision] Wave 110 branch-config failed to wire:', bcErr.message);
            branchConfigSvc = null;
          }
        }

        // Wave 98 Phase 3 — recognition + confidence review (graceful)
        let parserService = null;
        let attendanceSourceSvc = null;
        if (HikvisionProcessedEvent && AttendanceSourceEvent && AttendanceConfidenceReview) {
          try {
            const {
              createHikvisionConfidenceGateService,
            } = require('../intelligence/hikvision-confidence-gate.service');
            const {
              createAttendanceSourceService,
            } = require('../intelligence/attendance-source.service');
            const {
              createHikvisionEventParserService,
            } = require('../intelligence/hikvision-event-parser.service');

            const gateService = createHikvisionConfidenceGateService({});
            attendanceSourceSvc = createAttendanceSourceService({
              sourceEventModel: AttendanceSourceEvent,
              reviewModel: AttendanceConfidenceReview,
              processedEventModel: HikvisionProcessedEvent,
              logger,
            });
            parserService = createHikvisionEventParserService({
              rawEventModel: HikvisionRawEvent,
              processedEventModel: HikvisionProcessedEvent,
              deviceModel: HikvisionDevice,
              channelModel: HikvisionCameraChannel,
              templateModel: HikvisionFaceTemplateLink || null,
              gateService,
              attendanceSourceService: attendanceSourceSvc,
              branchConfigService: branchConfigSvc, // Wave 110
              logger,
              // W275u — service-layer MFA on processRawEvent/processBatch/
              // reprocessFailed. Scheduler passes system actor.
              enforceMfa: true,
            });
          } catch (p3err) {
            logger.warn(
              '[Hikvision] Phase 3 parser/review services failed to wire:',
              p3err.message
            );
            parserService = null;
            attendanceSourceSvc = null;
          }
        } else {
          logger.info(
            '[Hikvision] Phase 3 processed/review models not loaded; recognition routes skipped'
          );
        }

        // Wave 99 Phase 4 — attendance integration (graceful)
        // Wires reconciliation + payroll-period + override services.
        // attendance-source service is RE-CONSTRUCTED here when Phase 4
        // models are present so it can receive the payrollPeriodService
        // (gives it the lock-protection guard).
        let reconciliationSvc = null;
        let payrollPeriodSvc = null;
        if (
          AttendanceReconciliationCase &&
          PayrollPeriod &&
          AttendancePayrollOverride &&
          attendanceSourceSvc &&
          AttendanceSourceEvent &&
          AttendanceConfidenceReview
        ) {
          try {
            const {
              createAttendanceReconciliationService,
            } = require('../intelligence/attendance-reconciliation.service');
            const {
              createPayrollPeriodService,
            } = require('../intelligence/payroll-period.service');
            // Optional Branch model — reconciler reads shift calendars
            let branchModel = null;
            try {
              branchModel = require('../models/Branch');
            } catch {
              /* shift-calendar lookup skipped if model unavailable */
            }
            reconciliationSvc = createAttendanceReconciliationService({
              caseModel: AttendanceReconciliationCase,
              sourceEventModel: AttendanceSourceEvent,
              branchModel,
              logger,
              // Wave 275d — service-layer MFA on resolveConflict (T2).
              // Mirrors route-layer requireMfaTier on
              // /reconciliation/cases/:id/resolve (added W275d).
              enforceMfa: true,
            });
            payrollPeriodSvc = createPayrollPeriodService({
              periodModel: PayrollPeriod,
              caseModel: AttendanceReconciliationCase,
              overrideModel: AttendancePayrollOverride,
              sourceEventModel: AttendanceSourceEvent,
              reconcilerService: reconciliationSvc,
              logger,
              // Wave 275 — service-layer MFA tier enforcement (defense-
              // in-depth on top of W273's route-layer requireMfaTier).
              // The route layer at /api/v1/hikvision propagates
              // req.actor.mfaLevel + mfaAssertedAt into the actor object
              // via routes/hikvision.routes.js::actorFrom. With enforceMfa
              // true, even a service call from a non-HTTP caller (cron,
              // worker, CLI) must supply a tier-eligible actor or fail
              // closed with MFA_TIER_REQUIRED / MFA_FRESHNESS_REQUIRED.
              enforceMfa: true,
            });
            // Re-construct attendance-source service with the
            // payrollPeriodService so future createSourceEvent calls
            // honour the locked-period guard. We replace the existing
            // reference so the router gets the lock-aware version.
            const {
              createAttendanceSourceService: createAttendanceSourceServiceWithLock,
            } = require('../intelligence/attendance-source.service');
            attendanceSourceSvc = createAttendanceSourceServiceWithLock({
              sourceEventModel: AttendanceSourceEvent,
              reviewModel: AttendanceConfidenceReview,
              processedEventModel: HikvisionProcessedEvent,
              payrollPeriodService: payrollPeriodSvc,
              logger,
            });
            // The parser holds the OLD reference; re-wire it to the
            // new lock-aware service so its AUTO_ACCEPT path also
            // honours the lock.
            if (parserService) {
              const {
                createHikvisionEventParserService: createParserWithLock,
              } = require('../intelligence/hikvision-event-parser.service');
              const {
                createHikvisionConfidenceGateService,
              } = require('../intelligence/hikvision-confidence-gate.service');
              const newGate = createHikvisionConfidenceGateService({});
              parserService = createParserWithLock({
                rawEventModel: HikvisionRawEvent,
                processedEventModel: HikvisionProcessedEvent,
                deviceModel: HikvisionDevice,
                channelModel: HikvisionCameraChannel,
                templateModel: HikvisionFaceTemplateLink || null,
                gateService: newGate,
                attendanceSourceService: attendanceSourceSvc,
                branchConfigService: branchConfigSvc, // Wave 110
                logger,
                // W275u — also enable on the re-constructed parser
                // (Wave 99 Phase 4 path that wires payroll-period lock).
                enforceMfa: true,
              });
            }
          } catch (p4err) {
            logger.warn(
              '[Hikvision] Phase 4 reconciliation/payroll services failed to wire:',
              p4err.message
            );
            reconciliationSvc = null;
            payrollPeriodSvc = null;
          }
        } else if (AttendanceReconciliationCase || PayrollPeriod || AttendancePayrollOverride) {
          logger.info(
            '[Hikvision] Phase 4 partial models found — full Phase 4 wiring requires all three (Case/Period/Override) + Phase 3 services'
          );
        }

        // Wave 100 Phase 5 — fraud detection (graceful)
        // Wires detection + score services. Score service is constructed
        // FIRST so it can be injected into detection (detection emits
        // flags and incrementally applies score impact).
        let fraudScoreSvc = null;
        let fraudDetectionSvc = null;
        if (HikvisionFraudFlag && HikvisionFraudScore && HikvisionProcessedEvent) {
          try {
            const {
              createHikvisionFraudScoreService,
            } = require('../intelligence/hikvision-fraud-score.service');
            const {
              createHikvisionFraudDetectionService,
            } = require('../intelligence/hikvision-fraud-detection.service');
            let branchModelForFraud = null;
            try {
              branchModelForFraud = require('../models/Branch');
            } catch {
              /* off-hours detector skips if branch model unavailable */
            }
            fraudScoreSvc = createHikvisionFraudScoreService({
              scoreModel: HikvisionFraudScore,
              flagModel: HikvisionFraudFlag,
              logger,
              // W275q — service-layer MFA on decayAllScores (tier 2).
              // Scheduler passes synthetic system-actor (W275q lib);
              // HTTP route passes actorFrom(req).
              enforceMfa: true,
            });
            fraudDetectionSvc = createHikvisionFraudDetectionService({
              flagModel: HikvisionFraudFlag,
              processedEventModel: HikvisionProcessedEvent,
              templateModel: HikvisionFaceTemplateLink || null,
              branchModel: branchModelForFraud,
              scoreService: fraudScoreSvc,
              logger,
              // Wave 275b — service-layer MFA enforcement on dismissFlag
              // (tier 2) + escalateFlag (tier 2). Mirrors the W273+W275b
              // route-layer requireMfaTier on /fraud/flags/:id/{dismiss,escalate}.
              enforceMfa: true,
            });
          } catch (p5err) {
            logger.warn(
              '[Hikvision] Phase 5 fraud detection services failed to wire:',
              p5err.message
            );
            fraudScoreSvc = null;
            fraudDetectionSvc = null;
          }
        } else if (HikvisionFraudFlag || HikvisionFraudScore) {
          logger.info(
            '[Hikvision] Phase 5 partial models found — full Phase 5 wiring requires Flag + Score + ProcessedEvent (from Phase 3)'
          );
        }

        // Wave 106 Phase F — ISAPI Sync Worker (graceful)
        // Depends on libraryService + enrollmentService + adapter.
        // Adapter selection: HIKVISION_ISAPI_MODE = 'mock' (default) | 'real'
        //   • mock → in-memory adapter (safe for dev + integration tests)
        //   • real → live ISAPI client (requires HTTP client + credentials resolver)
        let syncWorkerSvc = null;
        if (
          libraryService &&
          enrollmentService &&
          HikvisionDevice &&
          HikvisionFaceTemplateLink &&
          HikvisionFaceLibrary
        ) {
          try {
            const {
              createMockIsapiAdapter,
              createIsapiAdapter,
            } = require('../intelligence/hikvision-isapi-adapter');
            const {
              createHikvisionSyncWorker,
            } = require('../intelligence/hikvision-sync-worker.service');

            const mode = process.env.HIKVISION_ISAPI_MODE || 'mock';
            let adapter = null;
            if (mode === 'real') {
              try {
                const axios = require('axios');
                // credentialsResolver MUST be provided by the org's secrets layer.
                // For now we expect HIKVISION_DEVICE_USERNAME + HIKVISION_DEVICE_PASSWORD
                // as fallback when credentialsRef is null.
                const credentialsResolver = async () => ({
                  username:
                    process.env.HIKVISION_DEVICE_USERNAME ||
                    (() => {
                      throw new Error('HIKVISION_DEVICE_USERNAME not set');
                    })(),
                  password:
                    process.env.HIKVISION_DEVICE_PASSWORD ||
                    (() => {
                      throw new Error('HIKVISION_DEVICE_PASSWORD not set');
                    })(),
                });
                adapter = createIsapiAdapter({
                  httpClient: axios,
                  credentialsResolver,
                  logger,
                });
                logger.info('[Hikvision sync] real ISAPI adapter wired');
              } catch (realErr) {
                logger.warn(
                  `[Hikvision sync] real adapter unavailable, falling back to mock: ${realErr.message}`
                );
                adapter = createMockIsapiAdapter({ logger });
              }
            } else {
              adapter = createMockIsapiAdapter({ logger });
              logger.info('[Hikvision sync] mock ISAPI adapter wired (dev mode)');
            }

            syncWorkerSvc = createHikvisionSyncWorker({
              libraryService,
              enrollmentService,
              deviceModel: HikvisionDevice,
              templateModel: HikvisionFaceTemplateLink,
              libraryModel: HikvisionFaceLibrary,
              isapiAdapter: adapter,
              logger,
              // W275r — service-layer MFA on full sync chain
              // (syncAll → syncLibrary → syncLibraryToDevice). Scheduler
              // passes synthetic system-actor (W275q); HTTP routes pass
              // actorFrom(req). face-enrollment's confirmEnrollment also
              // accepts actor (W275r).
              enforceMfa: true,
            });
          } catch (p6err) {
            logger.warn('[Hikvision] Phase F sync worker failed to wire:', p6err.message);
            syncWorkerSvc = null;
          }
        }

        // Wave 109 — Real-Time Event Stream (graceful, env-gated)
        // HIKVISION_STREAM_MODE = off (default) | mock | real
        //   • off  → supervisor never starts. Webhook + replay remain.
        //   • mock → in-process mock transport (dev/test only).
        //   • real → live HTTP/HTTPS connections to devices.
        let streamSupervisor = null;
        try {
          const streamMode = (process.env.HIKVISION_STREAM_MODE || 'off').toLowerCase();
          if (streamMode !== 'off' && ingestionService) {
            const {
              createMockHttpStreamer,
              createRealHttpStreamer,
            } = require('../intelligence/hikvision-stream-http');
            const {
              createEventStreamSupervisor,
            } = require('../intelligence/hikvision-stream-supervisor.service');
            let streamTransport = null;
            if (streamMode === 'real') {
              try {
                const credentialsResolver = async () => ({
                  username:
                    process.env.HIKVISION_DEVICE_USERNAME ||
                    (() => {
                      throw new Error('HIKVISION_DEVICE_USERNAME not set');
                    })(),
                  password:
                    process.env.HIKVISION_DEVICE_PASSWORD ||
                    (() => {
                      throw new Error('HIKVISION_DEVICE_PASSWORD not set');
                    })(),
                });
                streamTransport = createRealHttpStreamer({ logger, credentialsResolver });
                logger.info('[Hikvision stream] real transport wired');
              } catch (realErr) {
                logger.warn(
                  `[Hikvision stream] real transport unavailable, falling back to mock: ${realErr.message}`
                );
                streamTransport = createMockHttpStreamer();
              }
            } else {
              streamTransport = createMockHttpStreamer();
              logger.info('[Hikvision stream] mock transport wired (dev mode)');
            }

            // Optional device-code filter from env.
            let deviceFilter = null;
            const rawFilter = process.env.HIKVISION_STREAM_DEVICE_FILTER;
            if (rawFilter && rawFilter.trim()) {
              deviceFilter = new Set(
                rawFilter
                  .split(',')
                  .map(s => s.trim())
                  .filter(Boolean)
              );
            }

            streamSupervisor = createEventStreamSupervisor({
              deviceModel: HikvisionDevice,
              ingestionService,
              transport: streamTransport,
              reviewQueueService: null, // wired by Wave 109C if/when fastEnqueue exposed
              healthService,
              logger,
              config: { deviceFilter },
            });
            // Best-effort autostart — failures degrade to status="not running".
            streamSupervisor.start().catch(err => {
              logger.warn(`[Hikvision stream] supervisor.start failed: ${err.message}`);
            });
          }
        } catch (streamErr) {
          logger.warn('[Hikvision] Wave 109 stream failed to wire:', streamErr.message);
          streamSupervisor = null;
        }

        // Wave 108 — Operational Scheduler (graceful).
        // First pass: build with whatever services are wired NOW. The
        // org-summary's scheduler section captures this reference at
        // construction time. After Wave-113 detector + Wave-114 history
        // are built below, we rebuild with the ANOMALY_SCAN job
        // included and overwrite app._hikvisionScheduler — routes use
        // the final instance. Both instances share runModel so there's
        // no state collision, and the scheduler has no cron daemon
        // (jobs are pulled via routes).
        let schedulerSvc = null;
        if (HikvisionJobRun) {
          try {
            const {
              createHikvisionScheduler,
            } = require('../intelligence/hikvision-scheduler.service');
            schedulerSvc = createHikvisionScheduler({
              syncWorker: syncWorkerSvc,
              fraudDetection: fraudDetectionSvc,
              fraudScore: fraudScoreSvc,
              eventParser: parserService,
              healthMonitor: healthService,
              runModel: HikvisionJobRun,
              logger,
            });
          } catch (schErr) {
            logger.warn('[Hikvision] Wave 108 scheduler failed to wire:', schErr.message);
            schedulerSvc = null;
          }
        }

        // Wave 111 — Branch Operations Aggregator (graceful)
        // Read-only fan-out over the services that were wired above.
        // Never fails wiring — leaf services may be null and the
        // aggregator surfaces per-section unavailability.
        let branchOpsSvc = null;
        try {
          const {
            createHikvisionBranchOperationsService,
          } = require('../intelligence/hikvision-branch-operations.service');
          branchOpsSvc = createHikvisionBranchOperationsService({
            healthService,
            streamSupervisor,
            attendanceSourceService: attendanceSourceSvc,
            reconciliationService: reconciliationSvc,
            fraudScoreService: fraudScoreSvc,
            branchConfigService: branchConfigSvc,
            syncWorker: syncWorkerSvc,
            deviceModel: HikvisionDevice,
            libraryModel: HikvisionFaceLibrary || null,
            logger,
          });
        } catch (boErr) {
          logger.warn('[Hikvision] Wave 111 branch-ops failed to wire:', boErr.message);
          branchOpsSvc = null;
        }

        // Wave 113 anomaly detector is built AFTER the org-summary
        // (declared below) since it depends on it. Forward declaration
        // here just so the variable is in scope.

        // Wave 112 — Org-Wide Executive Summary (graceful)
        // Same pattern as Wave 111 but rolls UP rather than slicing by
        // branch. 60s cache because executive dashboards refresh on a
        // slower cadence than branch ops.
        let orgSummarySvc = null;
        try {
          const {
            createHikvisionOrgSummaryService,
          } = require('../intelligence/hikvision-org-summary.service');
          // Optional Branch model — when present, lets us compute the
          // override-coverage % for the branchConfig section.
          let BranchModel = null;
          try {
            BranchModel = require('../models/Branch');
          } catch {
            /* optional */
          }
          orgSummarySvc = createHikvisionOrgSummaryService({
            deviceService,
            streamSupervisor,
            attendanceSourceService: attendanceSourceSvc,
            reconciliationService: reconciliationSvc,
            fraudScoreService: fraudScoreSvc,
            syncWorker: syncWorkerSvc,
            schedulerService: schedulerSvc,
            branchConfigService: branchConfigSvc,
            branchModel: BranchModel,
            libraryModel: HikvisionFaceLibrary || null,
            logger,
          });
        } catch (osErr) {
          logger.warn('[Hikvision] Wave 112 org-summary failed to wire:', osErr.message);
          orgSummarySvc = null;
        }

        // Wave 113 — Anomaly Detector (graceful)
        // Depends on the org-summary service (re-uses its snapshot)
        // + streamSupervisor for per-device parse-error scan.
        let anomalyDetectorSvc = null;
        if (orgSummarySvc) {
          try {
            const {
              createHikvisionAnomalyDetector,
            } = require('../intelligence/hikvision-anomaly-detector.service');
            anomalyDetectorSvc = createHikvisionAnomalyDetector({
              orgSummaryService: orgSummarySvc,
              streamSupervisor,
              logger,
            });
          } catch (adErr) {
            logger.warn('[Hikvision] Wave 113 anomaly-detector failed to wire:', adErr.message);
            anomalyDetectorSvc = null;
          }
        }

        // Wave 114 — Anomaly History (graceful)
        // Persists detector outputs into HikvisionAnomalySnapshot +
        // exposes time-series queries for the UI trend chart. Optional
        // model: if not loaded, history routes are skipped but the
        // detector keeps working in pull mode.
        let HikvisionAnomalySnapshot = null;
        try {
          HikvisionAnomalySnapshot = require('../models/HikvisionAnomalySnapshot');
        } catch {
          /* optional */
        }
        let anomalyHistorySvc = null;
        if (HikvisionAnomalySnapshot) {
          try {
            const {
              createHikvisionAnomalyHistoryService,
            } = require('../intelligence/hikvision-anomaly-history.service');
            anomalyHistorySvc = createHikvisionAnomalyHistoryService({
              snapshotModel: HikvisionAnomalySnapshot,
              logger,
              // W275w — service-layer MFA on recordSnapshot. Scheduler
              // ANOMALY_SCAN passes system actor; HTTP POST /anomalies/scan
              // passes actorFrom(req).
              enforceMfa: true,
            });
          } catch (ahErr) {
            logger.warn('[Hikvision] Wave 114 anomaly-history failed to wire:', ahErr.message);
            anomalyHistorySvc = null;
          }
        }

        // Re-build the scheduler now that the detector + history are
        // available, so the ANOMALY_SCAN job is "available" in its
        // registry. Routes use this final instance; org-summary still
        // holds the earlier reference but both share runModel.
        if (HikvisionJobRun && anomalyDetectorSvc && anomalyHistorySvc) {
          try {
            const {
              createHikvisionScheduler,
            } = require('../intelligence/hikvision-scheduler.service');
            schedulerSvc = createHikvisionScheduler({
              syncWorker: syncWorkerSvc,
              fraudDetection: fraudDetectionSvc,
              fraudScore: fraudScoreSvc,
              eventParser: parserService,
              healthMonitor: healthService,
              anomalyDetector: anomalyDetectorSvc,
              anomalyHistory: anomalyHistorySvc,
              runModel: HikvisionJobRun,
              logger,
            });
          } catch (schErr) {
            logger.warn('[Hikvision] Wave 114 scheduler rebuild failed:', schErr.message);
          }
        }

        // Optional HMAC middleware for the device webhook. If the
        // secret env var isn't set, the webhook is omitted but the
        // operator-replay endpoint stays available.
        let webhookHmac = null;
        const hikSecret = process.env.HIKVISION_WEBHOOK_SECRET;
        if (hikSecret) {
          try {
            const { verifyWebhookHmac } = require('../middleware/webhookHmac.middleware');
            webhookHmac = verifyWebhookHmac({
              secret: hikSecret,
              header: 'x-hikvision-signature',
              algo: 'sha256',
              encoding: 'hex',
              timestampHeader: 'x-hikvision-timestamp',
              toleranceSec: 300,
            });
          } catch (hmacErr) {
            logger.warn(
              '[Hikvision] webhookHmac unavailable; /webhooks/events skipped:',
              hmacErr.message
            );
          }
        } else {
          logger.info(
            '[Hikvision] HIKVISION_WEBHOOK_SECRET not set; device webhook route skipped (manual replay still available)'
          );
        }

        const { authenticate: hikAuthMw } = require('../middleware/auth');

        // CRITICAL ORDER: the unauthenticated webhook router must be
        // registered BEFORE the auth-protected one so its path matches
        // first. Devices cannot present a bearer token; they sign the
        // body with the shared secret instead.
        if (webhookHmac) {
          app.use(
            '/api/v1/hikvision/webhooks',
            createHikvisionWebhookRouter({ ingestionService, webhookHmac, logger })
          );
        }

        app.use(
          '/api/v1/hikvision',
          hikAuthMw,
          createHikvisionRouter({
            deviceService,
            ingestionService,
            healthService,
            libraryService,
            enrollmentService,
            parserService,
            attendanceSourceService: attendanceSourceSvc,
            reconciliationService: reconciliationSvc,
            payrollPeriodService: payrollPeriodSvc,
            fraudDetectionService: fraudDetectionSvc,
            fraudScoreService: fraudScoreSvc,
            syncWorker: syncWorkerSvc,
            scheduler: schedulerSvc,
            streamSupervisor,
            branchConfigService: branchConfigSvc,
            branchOperationsService: branchOpsSvc,
            orgSummaryService: orgSummarySvc,
            anomalyDetector: anomalyDetectorSvc,
            anomalyHistory: anomalyHistorySvc,
            governance: governanceSvc,
            webhookHmac,
            logger,
          })
        );
        app._hikvisionDeviceService = deviceService;
        app._hikvisionIngestionService = ingestionService;
        app._hikvisionHealthService = healthService;
        if (libraryService) app._hikvisionFaceLibraryService = libraryService;
        if (enrollmentService) app._hikvisionFaceEnrollmentService = enrollmentService;
        if (parserService) app._hikvisionEventParserService = parserService;
        if (attendanceSourceSvc) app._attendanceSourceService = attendanceSourceSvc;
        if (reconciliationSvc) app._attendanceReconciliationService = reconciliationSvc;
        if (payrollPeriodSvc) app._payrollPeriodService = payrollPeriodSvc;
        if (fraudDetectionSvc) app._hikvisionFraudDetectionService = fraudDetectionSvc;
        if (fraudScoreSvc) app._hikvisionFraudScoreService = fraudScoreSvc;
        if (syncWorkerSvc) app._hikvisionSyncWorker = syncWorkerSvc;
        if (schedulerSvc) app._hikvisionScheduler = schedulerSvc;
        if (streamSupervisor) app._hikvisionStreamSupervisor = streamSupervisor;
        if (branchConfigSvc) app._hikvisionBranchConfigService = branchConfigSvc;
        if (branchOpsSvc) app._hikvisionBranchOperationsService = branchOpsSvc;
        if (orgSummarySvc) app._hikvisionOrgSummaryService = orgSummarySvc;
        if (anomalyDetectorSvc) app._hikvisionAnomalyDetector = anomalyDetectorSvc;
        if (anomalyHistorySvc) app._hikvisionAnomalyHistoryService = anomalyHistorySvc;
        const phases = ['Wave 96 Phase 1'];
        if (libraryService && enrollmentService) phases.push('Wave 97 Phase 2');
        if (parserService && attendanceSourceSvc) phases.push('Wave 98 Phase 3');
        if (reconciliationSvc && payrollPeriodSvc) phases.push('Wave 99 Phase 4');
        if (fraudDetectionSvc && fraudScoreSvc) phases.push('Wave 100 Phase 5');
        if (syncWorkerSvc) phases.push('Wave 106 Phase F');
        if (schedulerSvc) phases.push('Wave 108 Scheduler');
        if (streamSupervisor) phases.push('Wave 109 Stream');
        if (branchConfigSvc) phases.push('Wave 110 Branch-Config');
        if (branchOpsSvc) phases.push('Wave 111 Branch-Ops');
        if (orgSummarySvc) phases.push('Wave 112 Org-Summary');
        if (anomalyDetectorSvc) phases.push('Wave 113 Anomalies');
        if (anomalyHistorySvc) phases.push('Wave 114 Anomaly-History');
        logger.info(`[Hikvision] ✓ ${phases.join(' + ')} routes mounted at /api/v1/hikvision`);
      } else {
        logger.warn('[Hikvision] routes skipped: governance service unavailable');
      }
    } else {
      logger.warn('[Hikvision] routes skipped: one or more Hikvision models not loaded');
    }
  } catch (hikErr) {
    logger.warn('[Hikvision] routes skipped:', hikErr.message);
  }
}

module.exports = { wireHikvision };
