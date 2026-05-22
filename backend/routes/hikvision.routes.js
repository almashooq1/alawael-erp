'use strict';

/**
 * hikvision.routes.js — Wave 96 Phase 1.
 *
 * HTTP surface for the Hikvision device registry, raw event
 * ingestion, and device-health monitor. Mounted at /api/v1/hikvision
 * behind the `authenticate` middleware EXCEPT the webhook ingest
 * route, which uses HMAC verification (verifyWebhookHmac) instead —
 * Hikvision devices cannot present a user bearer token.
 *
 * Routes:
 *   POST   /devices                                  ← create
 *   GET    /devices/:idOrCode                        ← read
 *   GET    /devices                                  ← list (filters)
 *   PATCH  /devices/:id                              ← partial update
 *   POST   /devices/:id/retire                       ← soft retire
 *
 *   POST   /devices/:deviceId/channels               ← create channel
 *   GET    /channels                                 ← list (filters)
 *   PATCH  /channels/:id                             ← update channel
 *
 *   POST   /webhooks/events           (HMAC-only)    ← device push
 *   POST   /events/manual             (perm-gated)   ← operator replay
 *   GET    /events                    (perm-gated)   ← list raw events
 *   GET    /events/:id                (perm-gated)   ← read raw event
 *
 *   POST   /health/heartbeat          (perm-gated)   ← operator probe
 *   POST   /health/sweep              (perm-gated)   ← cron trigger
 *   GET    /health/devices/:id        (perm-gated)   ← latest probes
 *   GET    /health/branches/:branchId (perm-gated)   ← branch summary
 *
 * Status-code map (REASON_TO_STATUS) follows the conventions used by
 * Wave 72 access-review.routes — clients can rely on consistent
 * codes for every shipped wave.
 */

const express = require('express');
const safeError = require('../utils/safeError');
const reg = require('../intelligence/hikvision.registry');
const { attachMfaActor, requireMfaTier } = require('../middleware/requireMfaTier');

const REASON_TO_STATUS = Object.freeze({
  // Permission / not-found
  PERMISSION_DENIED: 403,
  DEVICE_NOT_FOUND: 404,
  CHANNEL_NOT_FOUND: 404,
  DEVICE_RETIRED: 410,

  // Bad-request shape
  DEVICE_CODE_REQUIRED: 400,
  DEVICE_CODE_TAKEN: 409,
  INVALID_DEVICE_KIND: 400,
  INVALID_CAPABILITY: 400,
  INVALID_ENROLLMENT_ROLE: 400,
  INVALID_CHANNEL_DIRECTION: 400,
  INVALID_RECOGNITION_MODE: 400,
  BRANCH_REQUIRED: 400,
  IP_REQUIRED: 400,
  IP_INVALID: 400,
  CAPABILITIES_REQUIRED: 400,
  CHANNEL_DEVICE_MISMATCH: 400,
  ATTENDANCE_REQUIRES_FACE: 400,

  // Event ingestion
  EVENT_DEVICE_UNKNOWN: 404,
  EVENT_DUPLICATE: 200, // handled as ok+duplicate, never an error
  EVENT_PAYLOAD_REQUIRED: 400,
  EVENT_PAYLOAD_TOO_LARGE: 413,
  EVENT_SIGNATURE_INVALID: 401,
  EVENT_TIMESTAMP_INVALID: 401,
  EVENT_REPLAY: 401,

  // Health
  HEALTH_DEVICE_REQUIRED: 400,
  HEALTH_INVALID_DRIFT: 400,

  // ── Wave 106 Phase F — Sync Worker
  SYNC_ADAPTER_REQUIRED: 503,
  SYNC_DEVICE_UNREACHABLE: 503,
  SYNC_DEVICE_NOT_SUBSCRIBED: 409,
  SYNC_LIBRARY_ARCHIVED: 410,
  SYNC_PARTIAL_FAILURE: 207, // multi-status
  SYNC_DRIFT_DETECTED: 200, // not an error — informational
  SYNC_CREDENTIALS_MISSING: 401,
  ISAPI_REQUEST_FAILED: 502,
  ISAPI_RESPONSE_INVALID: 502,

  // ── Wave 108 — Operational Scheduler
  JOB_NOT_FOUND: 404,
  JOB_HANDLER_UNAVAILABLE: 503,
  JOB_ALREADY_RUNNING: 409,
  JOB_DISABLED: 409,
  JOB_HANDLER_THREW: 500,

  // ── Wave 109 — Real-Time Event Stream
  STREAM_NOT_RUNNING: 503,
  STREAM_DEVICE_INCAPABLE: 422,
  STREAM_TRANSPORT_FAILED: 502,
  STREAM_PARSE_FAILED: 422,
  STREAM_CIRCUIT_OPEN: 503,
  STREAM_TIME_DRIFT: 200, // informational
  STREAM_BACKPRESSURE: 429,

  // ── Wave 110 — Per-Branch Config Overrides
  BRANCH_CONFIG_NOT_FOUND: 404,
  BRANCH_CONFIG_INVALID_THRESHOLD: 400,
  BRANCH_CONFIG_INVALID_KEY: 400,
  BRANCH_CONFIG_NO_BRANCH: 400,

  // ── Wave 113 — Anomaly Detector
  ANOMALY_DETECTOR_UNAVAILABLE: 503,

  // ── Wave 114 — Anomaly History
  ANOMALY_HISTORY_NOT_FOUND: 404,
  ANOMALY_SCAN_FAILED: 502,

  // ── Wave 100 Phase 5 — Fraud Detection
  FRAUD_FLAG_NOT_FOUND: 404,
  FRAUD_FLAG_NOT_OPEN: 409,
  FRAUD_FLAG_RESOLUTION_REASON_REQUIRED: 400,
  FRAUD_SCORE_NOT_FOUND: 404,
  INVALID_FRAUD_KIND: 400,
  INVALID_FRAUD_SEVERITY: 400,
  EVIDENCE_REQUIRED: 400,
  PROCESSED_EVENT_LACKS_EMPLOYEE: 422,
  TEMPLATE_REQUIRED: 400,
  FRAUD_DETECTION_NOTHING_TO_FLAG: 200,

  // ── Wave 99 Phase 4 — Attendance Integration
  RECONCILIATION_CASE_NOT_FOUND: 404,
  RECONCILIATION_NOTHING_TO_MERGE: 200,
  RECONCILIATION_ALREADY_LOCKED: 409,
  PAYROLL_PERIOD_NOT_FOUND: 404,
  PAYROLL_PERIOD_ALREADY_CLOSED: 409,
  PAYROLL_PERIOD_NOT_CLOSED: 409,
  PAYROLL_PERIOD_LOCKED: 409,
  PAYROLL_PERIOD_OVERLAP: 409,
  PAYROLL_OVERRIDE_REASON_REQUIRED: 400,
  PAYROLL_OVERRIDE_APPROVER_CHAIN_INCOMPLETE: 409,
  PAYROLL_OVERRIDE_NAFATH_REQUIRED: 401,
  SHIFT_CALENDAR_MISSING: 422,
  SHIFT_DATE_REQUIRED: 400,

  // ── Wave 98 Phase 3 — Recognition + Confidence Review
  RAW_EVENT_NOT_FOUND: 404,
  RAW_EVENT_NOT_PENDING: 409,
  PROCESSED_EVENT_NOT_FOUND: 404,
  REVIEW_NOT_FOUND: 404,
  REVIEW_NOT_OPEN: 409,
  REVIEW_RESOLUTION_REASON_REQUIRED: 400,
  SOURCE_EVENT_NOT_FOUND: 404,
  EVENT_KIND_NOT_PROCESSABLE: 422,
  TEMPLATE_INACTIVE_FOR_MATCH: 422,
  CONFIDENCE_OUT_OF_RANGE: 400,

  // ── Wave 97 Phase 2 — Face library + templates
  LIBRARY_CODE_REQUIRED: 400,
  LIBRARY_CODE_TAKEN: 409,
  LIBRARY_NOT_FOUND: 404,
  LIBRARY_ARCHIVED: 410,
  LIBRARY_FULL: 409,
  LIBRARY_BRANCH_MISMATCH: 400,
  INVALID_SYNC_STRATEGY: 400,
  INVALID_LIBRARY_STATUS: 400,
  DEVICE_ALREADY_SUBSCRIBED: 409,
  DEVICE_NOT_SUBSCRIBED: 404,
  DEVICE_NOT_FACE_CAPABLE: 400,
  EMPLOYEE_REQUIRED: 400,
  TEMPLATE_NOT_FOUND: 404,
  TEMPLATE_DUPLICATE: 409,
  TEMPLATE_NOT_PENDING: 409,
  TEMPLATE_NOT_ACTIVE: 409,
  INVALID_TEMPLATE_STATUS: 400,
  IMAGES_REQUIRED: 400,
  FRONT_IMAGE_REQUIRED: 400,
  IMAGE_QUALITY_TOO_LOW: 400,
  INVALID_IMAGE_ANGLE: 400,
  PERSON_ID_REQUIRED: 400,
  CHECKSUM_REQUIRED: 400,
  SUSPENSION_REASON_REQUIRED: 400,

  // Generic
  VALIDATION_FAILED: 422,
  SAVE_FAILED: 500,

  // ── Wave 275 — Service-layer MFA tier enforcement
  // Both map to 403 — same as route-layer requireMfaTier (W273).
  // Surfaced by opt-in services (payroll-period.service Wave 275 pilot).
  MFA_TIER_REQUIRED: 403,
  MFA_FRESHNESS_REQUIRED: 403,
});

function actorFrom(req) {
  // Wave 275 — propagate MFA tier + freshness from the W273
  // attachMfaActor middleware into the actor object that opt-in
  // services (e.g. payroll-period with enforceMfa=true) use to
  // enforce their service-layer MFA guard. Falls back to {0, null}
  // when attachMfaActor didn't run (test contexts that bypass it).
  const fromActor = req.actor || {};
  return {
    userId: req.user?.id || req.user?._id || fromActor.userId || null,
    role: req.user?.role || req.user?.roleCode || fromActor.role || null,
    ip: req.ip || fromActor.ip || null,
    mfaLevel: typeof fromActor.mfaLevel === 'number' ? fromActor.mfaLevel : 0,
    mfaAssertedAt: fromActor.mfaAssertedAt || null,
  };
}

function respond(res, result) {
  if (result && result.ok) {
    const { ok: _ok, ...data } = result;
    void _ok;
    return res.json({ success: true, data });
  }
  const status = (result && REASON_TO_STATUS[result.reason]) || 400;
  return res.status(status).json({
    success: false,
    message: result?.reason || 'HIKVISION_REJECTED',
    reason: result?.reason,
    ...(result?.errors ? { errors: result.errors } : {}),
  });
}

/**
 * @param {object} opts
 *   - deviceService     — createHikvisionDeviceService(...)
 *   - ingestionService  — createHikvisionEventIngestionService(...)
 *   - healthService     — createHikvisionHealthService(...)
 *   - libraryService    — createHikvisionFaceLibraryService(...)  [Phase 2 — optional]
 *   - enrollmentService — createHikvisionFaceEnrollmentService(...) [Phase 2 — optional]
 *   - governance        — Wave-26 governance service (hasPermission)
 *   - webhookHmac       — pre-built middleware (verifyWebhookHmac).
 *                         If omitted, the webhook route is NOT mounted.
 *   - logger
 *
 * Phase 2 routes (libraries / templates) only mount when both Phase 2
 * services are supplied. This keeps Phase 1 deployable on its own.
 */
function createHikvisionRouter({
  deviceService,
  ingestionService,
  healthService,
  libraryService = null,
  enrollmentService = null,
  parserService = null,
  attendanceSourceService = null,
  reconciliationService = null,
  payrollPeriodService = null,
  fraudDetectionService = null,
  fraudScoreService = null,
  syncWorker = null,
  scheduler = null,
  streamSupervisor = null,
  branchConfigService = null,
  branchOperationsService = null,
  orgSummaryService = null,
  anomalyDetector = null,
  anomalyHistory = null,
  governance,
  webhookHmac = null,
  logger = console,
} = {}) {
  if (!deviceService || typeof deviceService.registerDevice !== 'function') {
    throw new Error('hikvision.routes: deviceService is required');
  }
  if (!ingestionService || typeof ingestionService.ingest !== 'function') {
    throw new Error('hikvision.routes: ingestionService is required');
  }
  if (!healthService || typeof healthService.recordHeartbeat !== 'function') {
    throw new Error('hikvision.routes: healthService is required');
  }
  if (!governance || typeof governance.hasPermission !== 'function') {
    throw new Error('hikvision.routes: governance service is required');
  }
  void logger;

  const router = express.Router();

  // Wave 273 — populate req.actor.mfaLevel for the per-endpoint
  // requireMfaTier(N) guards applied below on payroll/template/fraud/
  // device-retire routes. Lazy via req.app._mfaChallengeService.
  router.use(attachMfaActor);

  function requirePerm(code) {
    return (req, res, next) => {
      const actor = actorFrom(req);
      if (!actor.userId) {
        return res
          .status(401)
          .json({ success: false, message: 'AUTH_REQUIRED', reason: 'AUTH_REQUIRED' });
      }
      if (!governance.hasPermission(actor.role, code)) {
        return res.status(403).json({
          success: false,
          message: 'PERMISSION_DENIED',
          reason: 'PERMISSION_DENIED',
          requiredPermission: code,
        });
      }
      return next();
    };
  }

  // ─── Devices ────────────────────────────────────────────────

  router.post(
    '/devices',
    requirePerm('hikvision.device.create'),
    requireMfaTier(2),
    async (req, res) => {
      try {
        const result = await deviceService.registerDevice(req.body || {});
        return respond(res, result);
      } catch (err) {
        return safeError(res, err, 'hikvision.device.create');
      }
    }
  );

  router.get('/devices/:idOrCode', requirePerm('hikvision.device.read'), async (req, res) => {
    try {
      const result = await deviceService.getDevice(req.params.idOrCode);
      return respond(res, result);
    } catch (err) {
      return safeError(res, err, 'hikvision.device.read');
    }
  });

  router.get('/devices', requirePerm('hikvision.device.list'), async (req, res) => {
    try {
      const filter = {
        branchId: req.query.branchId || undefined,
        kind: req.query.kind || undefined,
        status: req.query.status || undefined,
        includeRetired: req.query.includeRetired === 'true',
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        skip: req.query.skip ? Number(req.query.skip) : undefined,
      };
      const result = await deviceService.listDevices(filter);
      return respond(res, result);
    } catch (err) {
      return safeError(res, err, 'hikvision.device.list');
    }
  });

  router.patch(
    '/devices/:id',
    requirePerm('hikvision.device.update'),
    requireMfaTier(2),
    async (req, res) => {
      try {
        const result = await deviceService.updateDevice(req.params.id, req.body || {});
        return respond(res, result);
      } catch (err) {
        return safeError(res, err, 'hikvision.device.update');
      }
    }
  );

  router.post(
    '/devices/:id/retire',
    requirePerm('hikvision.device.retire'),
    requireMfaTier(2),
    async (req, res) => {
      try {
        const result = await deviceService.retireDevice(req.params.id, req.body?.reason);
        return respond(res, result);
      } catch (err) {
        return safeError(res, err, 'hikvision.device.retire');
      }
    }
  );

  // ─── Channels ───────────────────────────────────────────────

  router.post(
    '/devices/:deviceId/channels',
    requirePerm('hikvision.channel.create'),
    requireMfaTier(2),
    async (req, res) => {
      try {
        const result = await deviceService.registerChannel({
          ...(req.body || {}),
          deviceId: req.params.deviceId,
        });
        return respond(res, result);
      } catch (err) {
        return safeError(res, err, 'hikvision.channel.create');
      }
    }
  );

  router.get('/channels', requirePerm('hikvision.channel.list'), async (req, res) => {
    try {
      const filter = {
        deviceId: req.query.deviceId || undefined,
        zoneId: req.query.zoneId || undefined,
        attendanceEligible:
          req.query.attendanceEligible === 'true'
            ? true
            : req.query.attendanceEligible === 'false'
              ? false
              : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        skip: req.query.skip ? Number(req.query.skip) : undefined,
      };
      const result = await deviceService.listChannels(filter);
      return respond(res, result);
    } catch (err) {
      return safeError(res, err, 'hikvision.channel.list');
    }
  });

  router.patch(
    '/channels/:id',
    requirePerm('hikvision.channel.update'),
    requireMfaTier(2),
    async (req, res) => {
      try {
        const result = await deviceService.updateChannel(req.params.id, req.body || {});
        return respond(res, result);
      } catch (err) {
        return safeError(res, err, 'hikvision.channel.update');
      }
    }
  );

  // Note: the device-push webhook lives on a SEPARATE unauthenticated
  // router (createHikvisionWebhookRouter below) — see app.js wiring.
  // Devices can't carry a bearer token, so they authenticate via HMAC.
  void webhookHmac;

  // Manual replay — operator drops an event from a CSV or a logged
  // outage buffer. Gated by `hikvision.event.ingest`.
  router.post(
    '/events/manual',
    requirePerm('hikvision.event.ingest'),
    requireMfaTier(2),
    async (req, res) => {
      try {
        const body = req.body || {};
        const result = await ingestionService.ingest({
          deviceCode: body.deviceCode,
          externalEventId: body.externalEventId,
          eventKind: body.eventKind,
          capturedAt: body.capturedAt,
          rawPayload: body.rawPayload || body,
          channelNo: body.channelNo,
          sourceIp: req.ip,
          requestId: req.get('x-request-id') || null,
          signatureVerified: false, // operator-injected
        });
        return respond(res, result);
      } catch (err) {
        return safeError(res, err, 'hikvision.event.manual');
      }
    }
  );

  router.get('/events', requirePerm('hikvision.event.list'), async (req, res) => {
    try {
      const filter = {
        deviceId: req.query.deviceId || undefined,
        eventKind: req.query.eventKind || undefined,
        parseStatus: req.query.parseStatus || undefined,
        signatureVerified:
          req.query.signatureVerified === 'true'
            ? true
            : req.query.signatureVerified === 'false'
              ? false
              : undefined,
        since: req.query.since || undefined,
        until: req.query.until || undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        skip: req.query.skip ? Number(req.query.skip) : undefined,
      };
      const result = await ingestionService.listEvents(filter);
      return respond(res, result);
    } catch (err) {
      return safeError(res, err, 'hikvision.event.list');
    }
  });

  router.get('/events/:id', requirePerm('hikvision.event.read'), async (req, res) => {
    try {
      const result = await ingestionService.getEvent(req.params.id);
      return respond(res, result);
    } catch (err) {
      return safeError(res, err, 'hikvision.event.read');
    }
  });

  // ─── Health ─────────────────────────────────────────────────

  router.post('/health/heartbeat', requirePerm('hikvision.health.record'), async (req, res) => {
    try {
      const result = await healthService.recordHeartbeat(req.body || {});
      return respond(res, result);
    } catch (err) {
      return safeError(res, err, 'hikvision.health.heartbeat');
    }
  });

  router.post(
    '/health/sweep',
    requirePerm('hikvision.health.record'),
    requireMfaTier(2),
    async (req, res) => {
      try {
        // W275t — pass actor for service-layer MFA guard.
        const result = await healthService.sweepStaleDevices({
          ...(req.body || {}),
          actor: actorFrom(req),
        });
        return respond(res, result);
      } catch (err) {
        return safeError(res, err, 'hikvision.health.sweep');
      }
    }
  );

  router.get('/health/devices/:id', requirePerm('hikvision.health.read'), async (req, res) => {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : 10;
      const result = await healthService.getLatest(req.params.id, limit);
      return respond(res, result);
    } catch (err) {
      return safeError(res, err, 'hikvision.health.read');
    }
  });

  router.get(
    '/health/branches/:branchId',
    requirePerm('hikvision.health.read'),
    async (req, res) => {
      try {
        const result = await healthService.getBranchSummary(req.params.branchId);
        return respond(res, result);
      } catch (err) {
        return safeError(res, err, 'hikvision.health.branch');
      }
    }
  );

  // ─── Wave 97 Phase 2 — Face Library + Template Enrolment ────
  // Only mounted when both services are supplied. Keeps Phase 1
  // deployable on its own; routes simply 404 if Phase 2 is off.
  if (libraryService && enrollmentService) {
    // Libraries
    router.post(
      '/libraries',
      requirePerm('hikvision.library.create'),
      requireMfaTier(2),
      async (req, res) => {
        try {
          const r = await libraryService.createLibrary(req.body || {});
          return respond(res, r);
        } catch (err) {
          return safeError(res, err, 'hikvision.library.create');
        }
      }
    );

    router.get('/libraries/:idOrCode', requirePerm('hikvision.library.read'), async (req, res) => {
      try {
        const r = await libraryService.getLibrary(req.params.idOrCode);
        return respond(res, r);
      } catch (err) {
        return safeError(res, err, 'hikvision.library.read');
      }
    });

    router.get('/libraries', requirePerm('hikvision.library.list'), async (req, res) => {
      try {
        const r = await libraryService.listLibraries({
          branchId: req.query.branchId || undefined,
          status: req.query.status || undefined,
          syncStrategy: req.query.syncStrategy || undefined,
          limit: req.query.limit ? Number(req.query.limit) : undefined,
          skip: req.query.skip ? Number(req.query.skip) : undefined,
        });
        return respond(res, r);
      } catch (err) {
        return safeError(res, err, 'hikvision.library.list');
      }
    });

    router.patch(
      '/libraries/:id',
      requirePerm('hikvision.library.update'),
      requireMfaTier(2),
      async (req, res) => {
        try {
          const r = await libraryService.updateLibrary(req.params.id, req.body || {});
          return respond(res, r);
        } catch (err) {
          return safeError(res, err, 'hikvision.library.update');
        }
      }
    );

    router.post(
      '/libraries/:id/archive',
      requirePerm('hikvision.library.archive'),
      requireMfaTier(2),
      async (req, res) => {
        try {
          const r = await libraryService.archiveLibrary(req.params.id, req.body?.reason);
          return respond(res, r);
        } catch (err) {
          return safeError(res, err, 'hikvision.library.archive');
        }
      }
    );

    router.post(
      '/libraries/:id/subscribe-device',
      requirePerm('hikvision.library.subscribe'),
      requireMfaTier(2),
      async (req, res) => {
        try {
          const r = await libraryService.subscribeDevice(req.params.id, req.body?.deviceId);
          return respond(res, r);
        } catch (err) {
          return safeError(res, err, 'hikvision.library.subscribe');
        }
      }
    );

    router.post(
      '/libraries/:id/unsubscribe-device',
      requirePerm('hikvision.library.subscribe'),
      requireMfaTier(2),
      async (req, res) => {
        try {
          const r = await libraryService.unsubscribeDevice(req.params.id, req.body?.deviceId);
          return respond(res, r);
        } catch (err) {
          return safeError(res, err, 'hikvision.library.unsubscribe');
        }
      }
    );

    router.get(
      '/libraries/:id/integrity-hash',
      requirePerm('hikvision.library.read'),
      async (req, res) => {
        try {
          const r = await libraryService.computeIntegrityHash({ libraryId: req.params.id });
          return respond(res, r);
        } catch (err) {
          return safeError(res, err, 'hikvision.library.integrity');
        }
      }
    );

    router.post(
      '/libraries/:id/sync-result',
      requirePerm('hikvision.library.subscribe'),
      requireMfaTier(2),
      async (req, res) => {
        try {
          const r = await libraryService.recordSyncResult({
            libraryId: req.params.id,
            hash: req.body?.hash,
            error: req.body?.error,
          });
          return respond(res, r);
        } catch (err) {
          return safeError(res, err, 'hikvision.library.sync-result');
        }
      }
    );

    // Templates
    router.post(
      '/libraries/:libraryId/templates',
      requirePerm('hikvision.template.enroll'),
      requireMfaTier(2),
      async (req, res) => {
        try {
          const body = req.body || {};
          const r = await enrollmentService.enrollEmployee({
            libraryId: req.params.libraryId,
            employeeId: body.employeeId,
            images: body.images,
            allowMultiPerAngle: !!body.allowMultiPerAngle,
            actor: actorFrom(req),
          });
          return respond(res, r);
        } catch (err) {
          return safeError(res, err, 'hikvision.template.enroll');
        }
      }
    );

    router.post(
      '/templates/:id/confirm',
      requirePerm('hikvision.template.confirm'),
      requireMfaTier(2),
      async (req, res) => {
        try {
          const body = req.body || {};
          // W275r — pass actor for service-layer MFA guard.
          const r = await enrollmentService.confirmEnrollment({
            actor: actorFrom(req),
            templateId: req.params.id,
            hikvisionPersonId: body.hikvisionPersonId,
            templateChecksum: body.templateChecksum,
          });
          return respond(res, r);
        } catch (err) {
          return safeError(res, err, 'hikvision.template.confirm');
        }
      }
    );

    router.post(
      '/templates/:id/suspend',
      requirePerm('hikvision.template.suspend'),
      requireMfaTier(2),
      async (req, res) => {
        try {
          const body = req.body || {};
          const r = await enrollmentService.suspendTemplate({
            templateId: req.params.id,
            reason: body.reason,
            cascadeReason: body.cascadeReason,
            actor: actorFrom(req),
          });
          return respond(res, r);
        } catch (err) {
          return safeError(res, err, 'hikvision.template.suspend');
        }
      }
    );

    router.post(
      '/templates/:id/reenroll',
      requirePerm('hikvision.template.reenroll'),
      requireMfaTier(2),
      async (req, res) => {
        try {
          const body = req.body || {};
          const r = await enrollmentService.reEnroll({
            templateId: req.params.id,
            images: body.images,
            allowMultiPerAngle: !!body.allowMultiPerAngle,
            actor: actorFrom(req),
          });
          return respond(res, r);
        } catch (err) {
          return safeError(res, err, 'hikvision.template.reenroll');
        }
      }
    );

    router.post(
      '/templates/exit-cascade',
      requirePerm('hikvision.template.cascade'),
      requireMfaTier(2),
      async (req, res) => {
        try {
          const body = req.body || {};
          const r = await enrollmentService.deactivateOnExit({
            employeeId: body.employeeId,
            exitDate: body.exitDate,
            exitReason: body.exitReason,
            actor: actorFrom(req),
          });
          return respond(res, r);
        } catch (err) {
          return safeError(res, err, 'hikvision.template.exit-cascade');
        }
      }
    );

    router.get('/templates/:id', requirePerm('hikvision.template.read'), async (req, res) => {
      try {
        const r = await enrollmentService.getTemplate(req.params.id);
        return respond(res, r);
      } catch (err) {
        return safeError(res, err, 'hikvision.template.read');
      }
    });

    router.get('/templates', requirePerm('hikvision.template.list'), async (req, res) => {
      try {
        const r = await enrollmentService.listTemplates({
          libraryId: req.query.libraryId || undefined,
          employeeId: req.query.employeeId || undefined,
          status: req.query.status || undefined,
          hikvisionPersonId: req.query.hikvisionPersonId || undefined,
          excludeDeleted: req.query.excludeDeleted === 'true',
          limit: req.query.limit ? Number(req.query.limit) : undefined,
          skip: req.query.skip ? Number(req.query.skip) : undefined,
        });
        return respond(res, r);
      } catch (err) {
        return safeError(res, err, 'hikvision.template.list');
      }
    });
  }

  // ─── Wave 98 Phase 3 — Recognition + Confidence Review ──────
  // Mounted only when both Phase 3 services are supplied. Phases 1+2
  // remain deployable without these.
  if (parserService && attendanceSourceService) {
    // Parser
    router.post(
      '/events/:rawEventId/process',
      requirePerm('hikvision.event.process'),
      async (req, res) => {
        try {
          const r = await parserService.processRawEvent(req.params.rawEventId);
          return respond(res, r);
        } catch (err) {
          return safeError(res, err, 'hikvision.event.process');
        }
      }
    );

    router.post(
      '/events/process-batch',
      requirePerm('hikvision.event.process'),
      async (req, res) => {
        try {
          const r = await parserService.processBatch({
            limit: req.body?.limit,
            since: req.body?.since,
          });
          return respond(res, r);
        } catch (err) {
          return safeError(res, err, 'hikvision.event.process-batch');
        }
      }
    );

    router.post(
      '/events/reprocess-failed',
      requirePerm('hikvision.event.process'),
      async (req, res) => {
        try {
          const r = await parserService.reprocessFailed({ limit: req.body?.limit });
          return respond(res, r);
        } catch (err) {
          return safeError(res, err, 'hikvision.event.reprocess-failed');
        }
      }
    );

    // Review queue
    router.get('/reviews', requirePerm('hikvision.review.list'), async (req, res) => {
      try {
        const r = await attendanceSourceService.listReviews({
          queue: req.query.queue || undefined,
          state: req.query.state || undefined,
          branchId: req.query.branchId || undefined,
          employeeId: req.query.employeeId || undefined,
          reason: req.query.reason || undefined,
          limit: req.query.limit ? Number(req.query.limit) : undefined,
          skip: req.query.skip ? Number(req.query.skip) : undefined,
        });
        return respond(res, r);
      } catch (err) {
        return safeError(res, err, 'hikvision.review.list');
      }
    });

    router.get('/reviews/:id', requirePerm('hikvision.review.read'), async (req, res) => {
      try {
        const r = await attendanceSourceService.getReview(req.params.id);
        return respond(res, r);
      } catch (err) {
        return safeError(res, err, 'hikvision.review.read');
      }
    });

    router.post(
      '/reviews/:id/approve',
      requirePerm('hikvision.review.approve'),
      requireMfaTier(2),
      async (req, res) => {
        try {
          const r = await attendanceSourceService.approveReview(req.params.id, {
            actor: actorFrom(req),
            note: req.body?.note,
          });
          return respond(res, r);
        } catch (err) {
          return safeError(res, err, 'hikvision.review.approve');
        }
      }
    );

    router.post(
      '/reviews/:id/reject',
      requirePerm('hikvision.review.reject'),
      requireMfaTier(2),
      async (req, res) => {
        try {
          const r = await attendanceSourceService.rejectReview(req.params.id, {
            actor: actorFrom(req),
            note: req.body?.note,
          });
          return respond(res, r);
        } catch (err) {
          return safeError(res, err, 'hikvision.review.reject');
        }
      }
    );

    router.post(
      '/reviews/:id/escalate',
      requirePerm('hikvision.review.escalate'),
      requireMfaTier(2),
      async (req, res) => {
        try {
          const r = await attendanceSourceService.escalateReview(req.params.id, {
            actor: actorFrom(req),
            note: req.body?.note,
            toQueue: req.body?.toQueue,
          });
          return respond(res, r);
        } catch (err) {
          return safeError(res, err, 'hikvision.review.escalate');
        }
      }
    );

    router.post(
      '/reviews/sweep-expired',
      requirePerm('hikvision.event.process'),
      async (req, res) => {
        try {
          const r = await attendanceSourceService.sweepExpiredReviews({
            limit: req.body?.limit,
          });
          return respond(res, r);
        } catch (err) {
          return safeError(res, err, 'hikvision.review.sweep');
        }
      }
    );

    // Attendance source events (read-only — writes are parser-driven)
    router.get(
      '/attendance/source-events',
      requirePerm('attendance.source.list'),
      async (req, res) => {
        try {
          const r = await attendanceSourceService.listSourceEvents({
            employeeId: req.query.employeeId || undefined,
            branchId: req.query.branchId || undefined,
            source: req.query.source || undefined,
            accepted:
              req.query.accepted === 'true'
                ? true
                : req.query.accepted === 'false'
                  ? false
                  : undefined,
            since: req.query.since || undefined,
            until: req.query.until || undefined,
            limit: req.query.limit ? Number(req.query.limit) : undefined,
            skip: req.query.skip ? Number(req.query.skip) : undefined,
          });
          return respond(res, r);
        } catch (err) {
          return safeError(res, err, 'attendance.source.list');
        }
      }
    );

    router.get(
      '/attendance/source-events/:id',
      requirePerm('attendance.source.read'),
      async (req, res) => {
        try {
          const r = await attendanceSourceService.getSourceEvent(req.params.id);
          return respond(res, r);
        } catch (err) {
          return safeError(res, err, 'attendance.source.read');
        }
      }
    );
  }

  // ─── Wave 99 Phase 4 — Attendance Integration ───────────────
  // Mounted only when both Phase 4 services are supplied.
  if (reconciliationService && payrollPeriodService) {
    // Reconciliation
    router.post(
      '/reconciliation/run/employee',
      requirePerm('attendance.reconciliation.run'),
      requireMfaTier(2),
      async (req, res) => {
        try {
          const r = await reconciliationService.reconcileEmployeeDay({
            employeeId: req.body?.employeeId,
            shiftDate: req.body?.shiftDate,
            shiftHint: req.body?.shiftHint,
            branchId: req.body?.branchId,
          });
          return respond(res, r);
        } catch (err) {
          return safeError(res, err, 'attendance.reconciliation.run.employee');
        }
      }
    );

    router.post(
      '/reconciliation/run/branch',
      requirePerm('attendance.reconciliation.run'),
      requireMfaTier(2),
      async (req, res) => {
        try {
          const r = await reconciliationService.reconcileBranchDay({
            branchId: req.body?.branchId,
            shiftDate: req.body?.shiftDate,
            employeeIds: req.body?.employeeIds,
          });
          return respond(res, r);
        } catch (err) {
          return safeError(res, err, 'attendance.reconciliation.run.branch');
        }
      }
    );

    router.get(
      '/reconciliation/cases',
      requirePerm('attendance.reconciliation.list'),
      async (req, res) => {
        try {
          const r = await reconciliationService.listCases({
            employeeId: req.query.employeeId || undefined,
            branchId: req.query.branchId || undefined,
            conflictType: req.query.conflictType || undefined,
            status: req.query.status || undefined,
            shiftDate: req.query.shiftDate || undefined,
            since: req.query.since || undefined,
            until: req.query.until || undefined,
            lockedByPayrollPeriodId: req.query.lockedByPayrollPeriodId || undefined,
            limit: req.query.limit ? Number(req.query.limit) : undefined,
            skip: req.query.skip ? Number(req.query.skip) : undefined,
          });
          return respond(res, r);
        } catch (err) {
          return safeError(res, err, 'attendance.reconciliation.list');
        }
      }
    );

    router.get(
      '/reconciliation/cases/:id',
      requirePerm('attendance.reconciliation.read'),
      async (req, res) => {
        try {
          const r = await reconciliationService.getCase(req.params.id);
          return respond(res, r);
        } catch (err) {
          return safeError(res, err, 'attendance.reconciliation.read');
        }
      }
    );

    router.post(
      '/reconciliation/cases/:id/resolve',
      requirePerm('attendance.reconciliation.resolve'),
      requireMfaTier(2),
      async (req, res) => {
        try {
          const r = await reconciliationService.resolveConflict(req.params.id, {
            actor: actorFrom(req),
            finalCheckIn: req.body?.finalCheckIn,
            finalCheckOut: req.body?.finalCheckOut,
            note: req.body?.note,
          });
          return respond(res, r);
        } catch (err) {
          return safeError(res, err, 'attendance.reconciliation.resolve');
        }
      }
    );

    // Payroll periods
    router.post(
      '/payroll/periods',
      requirePerm('payroll.period.create'),
      requireMfaTier(2),
      async (req, res) => {
        try {
          const r = await payrollPeriodService.createPeriod(req.body || {});
          return respond(res, r);
        } catch (err) {
          return safeError(res, err, 'payroll.period.create');
        }
      }
    );

    router.get('/payroll/periods', requirePerm('payroll.period.list'), async (req, res) => {
      try {
        const r = await payrollPeriodService.listPeriods({
          branchId: req.query.branchId !== undefined ? req.query.branchId : undefined,
          status: req.query.status || undefined,
          limit: req.query.limit ? Number(req.query.limit) : undefined,
          skip: req.query.skip ? Number(req.query.skip) : undefined,
        });
        return respond(res, r);
      } catch (err) {
        return safeError(res, err, 'payroll.period.list');
      }
    });

    router.get(
      '/payroll/periods/:idOrCode',
      requirePerm('payroll.period.read'),
      async (req, res) => {
        try {
          const r = await payrollPeriodService.getPeriod(req.params.idOrCode);
          return respond(res, r);
        } catch (err) {
          return safeError(res, err, 'payroll.period.read');
        }
      }
    );

    router.post(
      '/payroll/periods/:id/close',
      requirePerm('payroll.period.close'),
      requireMfaTier(2),
      async (req, res) => {
        try {
          const r = await payrollPeriodService.closePeriod(req.params.id, {
            actor: actorFrom(req),
          });
          return respond(res, r);
        } catch (err) {
          return safeError(res, err, 'payroll.period.close');
        }
      }
    );

    router.post(
      '/payroll/periods/:id/reopen',
      requirePerm('payroll.period.reopen'),
      requireMfaTier(3, { maxAgeMin: 5 }),
      async (req, res) => {
        try {
          const r = await payrollPeriodService.reopenPeriod(req.params.id, {
            actor: actorFrom(req),
            reason: req.body?.reason,
          });
          return respond(res, r);
        } catch (err) {
          return safeError(res, err, 'payroll.period.reopen');
        }
      }
    );

    // Payroll overrides
    router.post(
      '/payroll/overrides',
      requirePerm('payroll.override.create'),
      requireMfaTier(2),
      async (req, res) => {
        try {
          const r = await payrollPeriodService.draftOverride({
            payrollPeriodId: req.body?.payrollPeriodId,
            reconciliationCaseId: req.body?.reconciliationCaseId,
            afterSnapshot: req.body?.afterSnapshot,
            reason: req.body?.reason,
            actor: actorFrom(req),
          });
          return respond(res, r);
        } catch (err) {
          return safeError(res, err, 'payroll.override.create');
        }
      }
    );

    router.post(
      '/payroll/overrides/:id/approvals',
      requirePerm('payroll.override.create'),
      requireMfaTier(2),
      async (req, res) => {
        try {
          const r = await payrollPeriodService.addApprover(req.params.id, {
            step: req.body?.step,
            actor: actorFrom(req),
            decision: req.body?.decision,
            note: req.body?.note,
            nafathSignatureId: req.body?.nafathSignatureId,
          });
          return respond(res, r);
        } catch (err) {
          return safeError(res, err, 'payroll.override.approvals');
        }
      }
    );

    router.post(
      '/payroll/overrides/:id/execute',
      requirePerm('payroll.override.create'),
      requireMfaTier(3, { maxAgeMin: 5 }),
      async (req, res) => {
        try {
          const r = await payrollPeriodService.executeOverride(req.params.id, {
            actor: actorFrom(req),
            nafathSignatureId: req.body?.nafathSignatureId,
            appliedToNextPeriodId: req.body?.appliedToNextPeriodId,
          });
          return respond(res, r);
        } catch (err) {
          return safeError(res, err, 'payroll.override.execute');
        }
      }
    );

    router.get('/payroll/overrides', requirePerm('payroll.override.list'), async (req, res) => {
      try {
        const r = await payrollPeriodService.listOverrides({
          payrollPeriodId: req.query.payrollPeriodId || undefined,
          employeeId: req.query.employeeId || undefined,
          state: req.query.state || undefined,
          limit: req.query.limit ? Number(req.query.limit) : undefined,
          skip: req.query.skip ? Number(req.query.skip) : undefined,
        });
        return respond(res, r);
      } catch (err) {
        return safeError(res, err, 'payroll.override.list');
      }
    });

    router.get('/payroll/overrides/:id', requirePerm('payroll.override.read'), async (req, res) => {
      try {
        const r = await payrollPeriodService.getOverride(req.params.id);
        return respond(res, r);
      } catch (err) {
        return safeError(res, err, 'payroll.override.read');
      }
    });
  }

  // ─── Wave 100 Phase 5 — Fraud Detection ─────────────────────
  // Mounted only when both Phase 5 services are supplied.
  if (fraudDetectionService && fraudScoreService) {
    // Detection runners
    router.post('/fraud/scan/templates', requirePerm('fraud.detection.run'), async (req, res) => {
      try {
        const r = await fraudDetectionService.scanTemplates({
          since: req.body?.since,
          templateIds: req.body?.templateIds,
        });
        return respond(res, r);
      } catch (err) {
        return safeError(res, err, 'fraud.scan.templates');
      }
    });

    router.post(
      '/fraud/scan/unregistered',
      requirePerm('fraud.detection.run'),
      async (req, res) => {
        try {
          const r = await fraudDetectionService.scanUnregisteredFaces({
            since: req.body?.since,
          });
          return respond(res, r);
        } catch (err) {
          return safeError(res, err, 'fraud.scan.unregistered');
        }
      }
    );

    router.post('/fraud/sweep-expired', requirePerm('fraud.detection.run'), async (req, res) => {
      try {
        const r = await fraudDetectionService.sweepExpiredFlags({});
        return respond(res, r);
      } catch (err) {
        return safeError(res, err, 'fraud.sweep');
      }
    });

    // Flag CRUD + actions
    router.get('/fraud/flags', requirePerm('fraud.flag.list'), async (req, res) => {
      try {
        const r = await fraudDetectionService.listFlags({
          employeeId: req.query.employeeId || undefined,
          templateId: req.query.templateId || undefined,
          branchId: req.query.branchId || undefined,
          kind: req.query.kind || undefined,
          severity: req.query.severity || undefined,
          state: req.query.state || undefined,
          since: req.query.since || undefined,
          until: req.query.until || undefined,
          limit: req.query.limit ? Number(req.query.limit) : undefined,
          skip: req.query.skip ? Number(req.query.skip) : undefined,
        });
        return respond(res, r);
      } catch (err) {
        return safeError(res, err, 'fraud.flag.list');
      }
    });

    router.get('/fraud/flags/:id', requirePerm('fraud.flag.read'), async (req, res) => {
      try {
        const r = await fraudDetectionService.getFlag(req.params.id);
        return respond(res, r);
      } catch (err) {
        return safeError(res, err, 'fraud.flag.read');
      }
    });

    router.post(
      '/fraud/flags/:id/acknowledge',
      requirePerm('fraud.flag.acknowledge'),
      async (req, res) => {
        try {
          const r = await fraudDetectionService.acknowledgeFlag(req.params.id, {
            actor: actorFrom(req),
            note: req.body?.note,
          });
          return respond(res, r);
        } catch (err) {
          return safeError(res, err, 'fraud.flag.acknowledge');
        }
      }
    );

    router.post(
      '/fraud/flags/:id/dismiss',
      requirePerm('fraud.flag.dismiss'),
      requireMfaTier(2),
      async (req, res) => {
        try {
          const r = await fraudDetectionService.dismissFlag(req.params.id, {
            actor: actorFrom(req),
            note: req.body?.note,
          });
          return respond(res, r);
        } catch (err) {
          return safeError(res, err, 'fraud.flag.dismiss');
        }
      }
    );

    router.post(
      '/fraud/flags/:id/escalate',
      requirePerm('fraud.flag.escalate'),
      requireMfaTier(2),
      async (req, res) => {
        try {
          const r = await fraudDetectionService.escalateFlag(req.params.id, {
            actor: actorFrom(req),
            note: req.body?.note,
            escalatedToRole: req.body?.escalatedToRole,
          });
          return respond(res, r);
        } catch (err) {
          return safeError(res, err, 'fraud.flag.escalate');
        }
      }
    );

    // Score read + recompute
    router.get('/fraud/scores', requirePerm('fraud.score.read'), async (req, res) => {
      try {
        const r = await fraudScoreService.listScores({
          band: req.query.band || undefined,
          primaryBranchId: req.query.branchId || undefined,
          minScore: req.query.minScore !== undefined ? Number(req.query.minScore) : undefined,
          maxScore: req.query.maxScore !== undefined ? Number(req.query.maxScore) : undefined,
          limit: req.query.limit ? Number(req.query.limit) : undefined,
          skip: req.query.skip ? Number(req.query.skip) : undefined,
        });
        return respond(res, r);
      } catch (err) {
        return safeError(res, err, 'fraud.score.list');
      }
    });

    router.get(
      '/fraud/scores/branch/:branchId/summary',
      requirePerm('fraud.score.read'),
      async (req, res) => {
        try {
          const r = await fraudScoreService.getBranchSummary(req.params.branchId);
          return respond(res, r);
        } catch (err) {
          return safeError(res, err, 'fraud.score.branch-summary');
        }
      }
    );

    router.get('/fraud/scores/:employeeId', requirePerm('fraud.score.read'), async (req, res) => {
      try {
        const r = await fraudScoreService.getScore(req.params.employeeId);
        return respond(res, r);
      } catch (err) {
        return safeError(res, err, 'fraud.score.read');
      }
    });

    router.post(
      '/fraud/scores/:employeeId/recompute',
      requirePerm('fraud.score.recompute'),
      requireMfaTier(2),
      async (req, res) => {
        try {
          const r = await fraudScoreService.recomputeScore(req.params.employeeId);
          return respond(res, r);
        } catch (err) {
          return safeError(res, err, 'fraud.score.recompute');
        }
      }
    );

    router.post(
      '/fraud/scores/decay-all',
      requirePerm('fraud.score.recompute'),
      requireMfaTier(2),
      async (req, res) => {
        try {
          // W275q — pass actor for service-layer MFA guard.
          const r = await fraudScoreService.decayAllScores({ actor: actorFrom(req) });
          return respond(res, r);
        } catch (err) {
          return safeError(res, err, 'fraud.score.decay-all');
        }
      }
    );
  }

  // ─── Wave 106 Phase F — Sync Worker ─────────────────────────
  // Mounted only when the sync worker is supplied. Routes wrap the
  // result objects directly (no envelope unwrap on the worker side —
  // the result IS the body).
  if (syncWorker) {
    router.post(
      '/sync/library/:libraryId/device/:deviceId',
      requirePerm('hikvision.sync.run'),
      requireMfaTier(2),
      async (req, res) => {
        try {
          // W275r — pass actor for sync-worker service-layer guard chain.
          const r = await syncWorker.syncLibraryToDevice(
            req.params.libraryId,
            req.params.deviceId,
            { ...(req.body || {}), actor: actorFrom(req) }
          );
          return res.json({ success: true, data: r });
        } catch (err) {
          return safeError(res, err, 'hikvision.sync.pair');
        }
      }
    );

    router.post(
      '/sync/library/:libraryId',
      requirePerm('hikvision.sync.run'),
      requireMfaTier(2),
      async (req, res) => {
        try {
          // W275r — pass actor for sync-worker service-layer guard chain.
          const r = await syncWorker.syncLibrary(req.params.libraryId, {
            ...(req.body || {}),
            actor: actorFrom(req),
          });
          if (!r.ok) return respond(res, r);
          return res.json({ success: true, data: r });
        } catch (err) {
          return safeError(res, err, 'hikvision.sync.library');
        }
      }
    );

    router.post(
      '/sync/all',
      requirePerm('hikvision.sync.run.all'),
      requireMfaTier(2),
      async (req, res) => {
        try {
          // W275r — pass actor for sync-worker service-layer guard chain.
          const r = await syncWorker.syncAll({ ...(req.body || {}), actor: actorFrom(req) });
          return res.json({ success: true, data: r });
        } catch (err) {
          return safeError(res, err, 'hikvision.sync.all');
        }
      }
    );

    router.get(
      '/sync/drift/:libraryId',
      requirePerm('hikvision.sync.drift.detect'),
      async (req, res) => {
        try {
          const r = await syncWorker.detectDrift(req.params.libraryId);
          if (!r.ok) return respond(res, r);
          return res.json({ success: true, data: r });
        } catch (err) {
          return safeError(res, err, 'hikvision.sync.drift');
        }
      }
    );

    router.get('/sync/drift', requirePerm('hikvision.sync.drift.detect'), async (_req, res) => {
      try {
        const r = await syncWorker.detectDriftAll();
        return res.json({ success: true, data: r });
      } catch (err) {
        return safeError(res, err, 'hikvision.sync.drift.all');
      }
    });
  }

  // ─── Wave 108 — Operational Scheduler ───────────────────────
  // Mounted only when the scheduler is supplied. 3 routes:
  //   GET  /jobs                   — registry + latest run per job
  //   GET  /jobs/:id/history       — recent runs
  //   POST /jobs/:id/run           — manual override
  if (scheduler) {
    router.get('/jobs', requirePerm('hikvision.jobs.read'), async (_req, res) => {
      try {
        const r = await scheduler.listJobs();
        return res.json({ success: true, data: r });
      } catch (err) {
        return safeError(res, err, 'hikvision.jobs.list');
      }
    });

    router.get(
      '/jobs/:id/history',
      requirePerm('hikvision.jobs.history.read'),
      async (req, res) => {
        try {
          const limit = req.query?.limit ? Number(req.query.limit) : 20;
          const r = await scheduler.listRuns({ jobId: req.params.id, limit });
          if (!r.ok) return respond(res, r);
          return res.json({ success: true, data: r });
        } catch (err) {
          return safeError(res, err, 'hikvision.jobs.history');
        }
      }
    );

    router.post(
      '/jobs/:id/run',
      requirePerm('hikvision.jobs.run'),
      requireMfaTier(2),
      async (req, res) => {
        try {
          const initiator = req.user?._id ? String(req.user._id) : 'manual';
          const r = await scheduler.runJob({
            jobId: req.params.id,
            trigger: reg.JOB_TRIGGER.MANUAL,
            initiator,
            args: req.body?.args || {},
          });
          if (!r.ok) return respond(res, r);
          return res.json({ success: true, data: r });
        } catch (err) {
          return safeError(res, err, 'hikvision.jobs.run');
        }
      }
    );
  }

  // ─── Wave 109 — Real-Time Event Stream ─────────────────────
  // Mounted only when the supervisor is supplied. 3 routes:
  //   GET  /stream                  — aggregate + per-device status
  //   GET  /stream/devices/:code    — single-device drilldown
  //   POST /stream/refresh          — re-read registry (attach/detach)
  if (streamSupervisor) {
    router.get('/stream', requirePerm('hikvision.stream.read'), async (_req, res) => {
      try {
        const r = streamSupervisor.getStatus();
        return res.json({ success: true, data: r });
      } catch (err) {
        return safeError(res, err, 'hikvision.stream.status');
      }
    });

    router.get('/stream/devices/:code', requirePerm('hikvision.stream.read'), async (req, res) => {
      try {
        const r = streamSupervisor.getDeviceStatus(req.params.code);
        if (!r) {
          return res.status(404).json({
            success: false,
            reason: reg.REASON.DEVICE_NOT_FOUND,
            message: 'DEVICE_NOT_FOUND',
          });
        }
        return res.json({ success: true, data: r });
      } catch (err) {
        return safeError(res, err, 'hikvision.stream.device.status');
      }
    });

    router.post(
      '/stream/refresh',
      requirePerm('hikvision.stream.control'),
      requireMfaTier(2),
      async (_req, res) => {
        try {
          const r = await streamSupervisor.refresh();
          if (!r.ok) return respond(res, r);
          return res.json({ success: true, data: r });
        } catch (err) {
          return safeError(res, err, 'hikvision.stream.refresh');
        }
      }
    );
  }

  // ─── Wave 110 — Per-Branch Config Overrides ───────────────
  // Mounted only when the service is supplied. 5 routes:
  //   GET    /branch-configs             — list (paged)
  //   GET    /branch-configs/defaults    — global defaults + bounds
  //   GET    /branch-configs/:branchId   — single (null if absent)
  //   PUT    /branch-configs/:branchId   — upsert (partial patch)
  //   DELETE /branch-configs/:branchId   — reset to defaults
  // Plus a read-only effective resolver for diagnostics:
  //   GET    /branch-configs/:branchId/effective
  if (branchConfigService) {
    router.get('/branch-configs', requirePerm('hikvision.branch-config.read'), async (req, res) => {
      try {
        const r = await branchConfigService.list({
          skip: req.query?.skip ? Number(req.query.skip) : 0,
          limit: req.query?.limit ? Number(req.query.limit) : 50,
        });
        return res.json({ success: true, data: r });
      } catch (err) {
        return safeError(res, err, 'hikvision.branch-config.list');
      }
    });

    router.get(
      '/branch-configs/defaults',
      requirePerm('hikvision.branch-config.read'),
      async (_req, res) => {
        try {
          const d = branchConfigService.getDefaults();
          return res.json({ success: true, data: d });
        } catch (err) {
          return safeError(res, err, 'hikvision.branch-config.defaults');
        }
      }
    );

    router.get(
      '/branch-configs/:branchId',
      requirePerm('hikvision.branch-config.read'),
      async (req, res) => {
        try {
          const r = await branchConfigService.get(req.params.branchId);
          if (!r.ok) return respond(res, r);
          return res.json({ success: true, data: r });
        } catch (err) {
          return safeError(res, err, 'hikvision.branch-config.get');
        }
      }
    );

    router.get(
      '/branch-configs/:branchId/effective',
      requirePerm('hikvision.branch-config.read'),
      async (req, res) => {
        try {
          const r = await branchConfigService.resolveEffective(req.params.branchId);
          if (!r.ok) return respond(res, r);
          return res.json({ success: true, data: r });
        } catch (err) {
          return safeError(res, err, 'hikvision.branch-config.effective');
        }
      }
    );

    router.put(
      '/branch-configs/:branchId',
      requirePerm('hikvision.branch-config.write'),
      requireMfaTier(2),
      async (req, res) => {
        try {
          const actorId = req.user?._id ? String(req.user._id) : null;
          const r = await branchConfigService.upsert({
            branchId: req.params.branchId,
            patch: req.body || {},
            actorId,
            notes: req.body?.notes,
            actor: actorFrom(req),
          });
          if (!r.ok) return respond(res, r);
          return res.json({ success: true, data: r });
        } catch (err) {
          return safeError(res, err, 'hikvision.branch-config.upsert');
        }
      }
    );

    router.delete(
      '/branch-configs/:branchId',
      requirePerm('hikvision.branch-config.write'),
      requireMfaTier(2),
      async (req, res) => {
        try {
          const actorId = req.user?._id ? String(req.user._id) : null;
          const r = await branchConfigService.reset(req.params.branchId, actorId, {
            actor: actorFrom(req),
          });
          if (!r.ok) return respond(res, r);
          return res.json({ success: true, data: r });
        } catch (err) {
          return safeError(res, err, 'hikvision.branch-config.reset');
        }
      }
    );
  }

  // ─── Wave 111 — Branch Operations Aggregator ──────────────
  // Mounted iff the aggregator service is supplied. Single route:
  //   GET /branches/:branchId/operations
  // Bundles health + stream + reviews + reconciliation + fraud +
  // thresholds + sync + devices into one snapshot for the UI.
  if (branchOperationsService) {
    router.get(
      '/branches/:branchId/operations',
      requirePerm('hikvision.branch-ops.read'),
      async (req, res) => {
        try {
          const r = await branchOperationsService.snapshot(req.params.branchId, {
            openReviewLimit: req.query?.openReviewLimit
              ? Number(req.query.openReviewLimit)
              : undefined,
            openCaseLimit: req.query?.openCaseLimit ? Number(req.query.openCaseLimit) : undefined,
          });
          if (!r.ok) return respond(res, r);
          return res.json({ success: true, data: r });
        } catch (err) {
          return safeError(res, err, 'hikvision.branch-ops');
        }
      }
    );
  }

  // ─── Wave 112 — Org-Wide Executive Summary ────────────────
  // Mounted iff the service is supplied. One route:
  //   GET /org-summary               — cached snapshot (60s TTL)
  //   GET /org-summary?skipCache=1   — force refresh
  if (orgSummaryService) {
    router.get('/org-summary', requirePerm('hikvision.org-summary.read'), async (req, res) => {
      try {
        const skipCache = req.query?.skipCache === '1' || req.query?.skipCache === 'true';
        const r = await orgSummaryService.snapshot({ skipCache });
        return res.json({ success: true, data: r });
      } catch (err) {
        return safeError(res, err, 'hikvision.org-summary');
      }
    });
  }

  // ─── Wave 113 — Anomaly Detector ───────────────────────────
  //   GET /anomalies                — cached anomaly list (30s TTL)
  //   GET /anomalies?skipCache=1    — force re-detect
  if (anomalyDetector) {
    router.get('/anomalies', requirePerm('hikvision.anomalies.read'), async (req, res) => {
      try {
        const skipCache = req.query?.skipCache === '1' || req.query?.skipCache === 'true';
        const r = await anomalyDetector.detect({ skipCache });
        if (!r.ok) return respond(res, r);
        return res.json({ success: true, data: r });
      } catch (err) {
        return safeError(res, err, 'hikvision.anomalies');
      }
    });
  }

  // ─── Wave 114 — Anomaly History ───────────────────────────
  //   GET /anomalies/history?since=ISO&limit=N&source=scheduler|manual
  //   GET /anomalies/trend?hours=24&bucketMinutes=30
  //   POST /anomalies/scan   — manual scan + record (records to
  //                            history.source='manual')
  if (anomalyHistory) {
    router.get(
      '/anomalies/history',
      requirePerm('hikvision.anomalies.history.read'),
      async (req, res) => {
        try {
          const r = await anomalyHistory.listRecent({
            limit: req.query?.limit ? Number(req.query.limit) : 50,
            since: req.query?.since || null,
            source: req.query?.source || null,
          });
          return res.json({ success: true, data: r });
        } catch (err) {
          return safeError(res, err, 'hikvision.anomalies.history');
        }
      }
    );

    router.get(
      '/anomalies/trend',
      requirePerm('hikvision.anomalies.history.read'),
      async (req, res) => {
        try {
          const r = await anomalyHistory.getTrend({
            hours: req.query?.hours ? Number(req.query.hours) : 24,
            bucketMinutes: req.query?.bucketMinutes ? Number(req.query.bucketMinutes) : 30,
          });
          return res.json({ success: true, data: r });
        } catch (err) {
          return safeError(res, err, 'hikvision.anomalies.trend');
        }
      }
    );

    // Manual scan is gated by the anomalies.read perm (read-shaped
    // operation; the persisted side-effect is intentional + benign).
    if (anomalyDetector) {
      router.post(
        '/anomalies/scan',
        requirePerm('hikvision.anomalies.read'),
        requireMfaTier(2),
        async (_req, res) => {
          try {
            const startedAt = Date.now();
            const detection = await anomalyDetector.detect({ skipCache: true });
            const durationMs = Date.now() - startedAt;
            const persisted = await anomalyHistory.recordSnapshot({
              detectionResult: detection,
              source: 'manual',
              durationMs,
            });
            if (!persisted.ok) return respond(res, persisted);
            return res.json({ success: true, data: { detection, snapshot: persisted.snapshot } });
          } catch (err) {
            return safeError(res, err, 'hikvision.anomalies.scan');
          }
        }
      );
    }
  }

  // ─── Registry passthrough (no perm gate — public catalog) ───
  router.get('/registry', (_req, res) => {
    return res.json({
      success: true,
      data: {
        deviceKinds: reg.DEVICE_KINDS,
        capabilities: reg.CAPABILITIES,
        enrollmentRoles: reg.ENROLLMENT_ROLES,
        deviceStatuses: reg.DEVICE_STATUSES,
        channelDirections: reg.CHANNEL_DIRECTIONS,
        recognitionModes: reg.RECOGNITION_MODES,
        rawEventKinds: reg.RAW_EVENT_KINDS,
        parseStatuses: reg.PARSE_STATUSES,
        trustTiers: reg.TRUST_TIERS,
        thresholds: reg.DEFAULT_CONFIDENCE_THRESHOLDS,
        // Wave 97 Phase 2 additions
        libraryStatuses: reg.LIBRARY_STATUSES,
        syncStrategies: reg.SYNC_STRATEGIES,
        templateStatuses: reg.TEMPLATE_STATUSES,
        imageAngles: reg.IMAGE_ANGLES,
        imageQuality: reg.IMAGE_QUALITY,
        templateDefaults: reg.TEMPLATE_DEFAULTS,
        cascadeReasons: reg.CASCADE_REASONS,
        // Wave 98 Phase 3 additions
        gateDecisions: reg.GATE_DECISIONS,
        antiSpoofResults: reg.ANTI_SPOOF_RESULTS,
        reviewStates: reg.REVIEW_STATES,
        reviewQueues: reg.REVIEW_QUEUES,
        reviewReasons: reg.REVIEW_REASONS,
        attendanceEventKinds: reg.ATTENDANCE_EVENT_KINDS,
        attendanceSources: reg.ATTENDANCE_SOURCES,
        impossibleTravelWindowMs: reg.IMPOSSIBLE_TRAVEL_WINDOW_MS,
        reviewSlaMs: reg.REVIEW_SLA_MS,
        // Wave 99 Phase 4 additions
        payrollPeriodStatuses: reg.PAYROLL_PERIOD_STATUSES,
        reconciliationConflicts: reg.RECONCILIATION_CONFLICTS,
        shiftClassifications: reg.SHIFT_CLASSIFICATIONS,
        payrollOverrideApprovals: reg.PAYROLL_OVERRIDE_APPROVALS,
        reconciliationDefaults: reg.RECONCILIATION_DEFAULTS,
        // Wave 100 Phase 5 additions
        fraudKinds: reg.FRAUD_KINDS,
        fraudSeverities: reg.FRAUD_SEVERITIES,
        fraudFlagStates: reg.FRAUD_FLAG_STATES,
        fraudScoreImpact: reg.FRAUD_SCORE_IMPACT,
        fraudDefaults: reg.FRAUD_DEFAULTS,
        // Wave 106 Phase F additions
        syncResults: reg.SYNC_RESULTS,
        diffOperations: reg.DIFF_OPERATIONS,
        syncDefaults: reg.SYNC_DEFAULTS,
      },
    });
  });

  return router;
}

/**
 * createHikvisionWebhookRouter — standalone router for the device push
 * webhook. Authentication is HMAC-only (verifyWebhookHmac). Mount this
 * BEFORE the authenticated router so its path matches first:
 *
 *   app.use('/api/v1/hikvision/webhooks', createHikvisionWebhookRouter({...}));
 *   app.use('/api/v1/hikvision', authenticate, createHikvisionRouter({...}));
 *
 * @param {object} opts
 *   - ingestionService — createHikvisionEventIngestionService(...)
 *   - webhookHmac      — verifyWebhookHmac({...}) middleware
 *   - logger
 */
function createHikvisionWebhookRouter({ ingestionService, webhookHmac, logger = console } = {}) {
  if (!ingestionService || typeof ingestionService.ingest !== 'function') {
    throw new Error('hikvision.webhook: ingestionService is required');
  }
  if (typeof webhookHmac !== 'function') {
    throw new Error('hikvision.webhook: webhookHmac middleware is required');
  }
  void logger;

  const router = express.Router();

  router.post('/events', webhookHmac, async (req, res) => {
    try {
      const body = req.body || {};
      const result = await ingestionService.ingest({
        deviceCode: body.deviceCode,
        externalEventId: body.externalEventId,
        eventKind: body.eventKind,
        capturedAt: body.capturedAt,
        rawPayload: body.rawPayload || body,
        channelNo: body.channelNo,
        sourceIp: req.ip,
        requestId: req.get('x-request-id') || null,
        signatureVerified: true, // verifyWebhookHmac would have 401'd otherwise
      });
      return respond(res, result);
    } catch (err) {
      return safeError(res, err, 'hikvision.event.webhook');
    }
  });

  return router;
}

module.exports = createHikvisionRouter;
module.exports.createHikvisionRouter = createHikvisionRouter;
module.exports.createHikvisionWebhookRouter = createHikvisionWebhookRouter;
module.exports.REASON_TO_STATUS = REASON_TO_STATUS;
