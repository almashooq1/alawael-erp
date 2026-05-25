# Phase 27 — CCTV Surveillance Platform (Hikvision)

**Status**: Backend slice landed 2026-05-15. Admin UI / mobile / parent portal scheduled as commits 8–10.

---

## 1. Why this exists

Al-Awael runs 12+ rehab branches. Every branch has a Hikvision NVR + 20–80
cameras. Today there is no central monitoring: each branch logs in to its
local NVR over the LAN. That fails three regulatory and safety requirements:

1. **CBAHI patient-safety**: fall, fight, fire/smoke incidents must be
   detected and acted on in seconds, not whenever staff happens to glance
   at the NVR.
2. **PDPL Art. 13**: every view of footage of an identifiable person must
   be audited; viewers must be consented or have a documented purpose;
   retention is bounded.
3. **Operational visibility**: HQ has no way to see camera health, AI
   events, or alert backlog across branches.

Phase 27 closes all three gaps with a centralised platform that talks to
each branch's NVR over Hikvision **ISAPI** + standard **RTSP**, runs a
domain AI layer on top of the device's native smart events, and exposes a
unified admin + mobile + parent surface.

## 2. Architecture

```text
 ┌─ each branch ──────────────────┐         ┌─ central (backend) ─────────────┐
 │                                │         │                                  │
 │  Cameras ── RTSP/HTTPS ── NVR ─┼─event─→ │   /api/v1/cctv/webhooks/nvr/:c  │
 │       ▲                        │  push   │              │                   │
 │       │ HLS proxy              │         │              ▼                   │
 │       │ (per-session ffmpeg)   │←─pull──┤   eventService.ingestFromHikvision│
 │       │                        │ ISAPI  │              │                   │
 │  Edge gateway (optional)       │         │              ▼                   │
 │                                │         │   aiDispatcher.dispatch(event)   │
 └────────────────────────────────┘         │              │                   │
                                            │              ▼                   │
                                            │   alertService.evaluate(event)   │
                                            │              │                   │
                                            │     ┌────────┴───────────┐       │
                                            │     ▼                     ▼      │
                                            │  CctvAlert         qualityEventBus │
                                            │  (open queue)       (incident wire)│
                                            └──────────────────────────────────┘
```

- **Adapter**: `services/cctv/adapter/` — real ISAPI client (Digest auth,
  XML/JSON) + mock for tests/dev. Selector picks `live` vs `mock` from
  `HIKVISION_MODE`. Calls go through `adapterCircuitBreaker` so a single
  bad NVR can't cascade.
- **Webhook receiver**: `routes/cctv/webhooks.routes.js` parses Hikvision
  XML/JSON push, verifies HMAC over the raw body, and feeds the parsed
  event into `eventService.ingestFromHikvision`.
- **Event ingestion**: `eventService` normalises 23 Hikvision event codes
  (`VMD`, `linedetection`, `falldown`, `ANPR`, …) into our internal type
  set, dedups by `cameraCode + type + second-bucket`, persists, and emits
  to `qualityEventBus`.
- **AI orchestrator**: `services/cctv/ai/index.js` fans an event out to:
  face / intrusion / loitering / fall / ANPR / crowd / PPE / behavior.
  Each detector decides whether it cares.
- **Alert engine**: `alertService.evaluate(event)` runs rule-based
  aggregation (e.g. "8 motion events in 60 s on same camera → motion
  burst alert"). Critical types (fall, fight, fire) are single-shot.
- **Streams**: `streamService.startLive` checks the user's
  `CctvAccessGrant`, writes a `CctvViewAudit`, and returns an HLS URL +
  ffmpeg command hint. Heartbeat cadence: 10 s, idle reaper: 30 s.
- **Health monitor**: round-robin probe of cameras/NVRs every 60 s,
  with state transition events (`camera_online`/`camera_offline`).

## 3. Modules shipped

### Models (`backend/models/cctv/`, 12 files)

| Model               | Purpose                                                               |
| ------------------- | --------------------------------------------------------------------- |
| `CctvCamera`        | Physical camera at a branch. Status, capabilities, PDPL config.       |
| `CctvNvr`           | DS-9xxx / DS-7xxx NVRs. Channels, storage, push secret.               |
| `CctvEvent`         | Raw event log (motion, intrusion, fall, ANPR…). TTL by `retainUntil`. |
| `CctvRecording`     | Pointer to NVR-side recordings; legal-hold flag.                      |
| `CctvAlert`         | Aggregated, actionable alerts (open/ack/resolve/escalate).            |
| `CctvViewAudit`     | PDPL audit row for every live/playback/snapshot view.                 |
| `CctvAccessGrant`   | Time-bounded permission to view (staff + parent + legal).             |
| `CctvFaceIdentity`  | Enrolled face: employee / beneficiary / parent / banned / VIP.        |
| `CctvAnpr`          | Plate registry (allowlist + denylist + schedule).                     |
| `CctvZone`          | Intrusion / line-cross zones (mirrored from device).                  |
| `CctvStreamSession` | Active HLS/playback sessions for concurrency + reaping.               |
| `CctvHealthCheck`   | Periodic probe results (TTL 7 days).                                  |

All registered with the `Cctv*` prefix to avoid mongoose-collision (see
[model collisions zeroed memory entry][collisions]).

### Services (`backend/services/cctv/`)

- `cameraService`, `nvrService`, `eventService`, `alertService`,
  `streamService`, `healthMonitor.service`
- `adapter/hikvisionISAPIAdapter` — real ISAPI (Digest auth)
- `adapter/hikvisionMockAdapter` — deterministic mock for tests
- `adapter/digestAuth` — RFC 7616 client
- `ai/{faceRecognition,intrusionDetector,loiteringDetector,fallDetector,anpr,crowdDensity,ppeDetector,behaviorAnalytics}.service`
- `ai/index` — orchestrator

### Routes (`backend/routes/cctv/`, mounted under `/api/v1/cctv/`)

| Path                      | Notes                                   |
| ------------------------- | --------------------------------------- |
| `/cameras`                | CRUD, sync, stats                       |
| `/nvrs`                   | CRUD, channel discovery                 |
| `/events`                 | List, acknowledge, link incident        |
| `/alerts`                 | Queue, acknowledge, resolve, escalate   |
| `/streams`                | Live, playback, PTZ, snapshot, sessions |
| `/recordings`             | Metadata + legal hold                   |
| `/webhooks/nvr/:nvrCode`  | Hikvision event push receiver (HMAC)    |
| `/ai/{faces,anpr,zones}`  | AI registries                           |
| `/audit`, `/audit/grants` | PDPL audit log + access grants          |
| `/parent-portal`          | Parent role, time-window enforced       |
| `/admin`                  | Ops dashboards + probe trigger          |

Registered via `routes/registries/cctv.registry.js`, mounted from
`routes/_registry.js` next to Finance.

## 4. Environment variables

| Variable                         | Default     | Purpose                            |
| -------------------------------- | ----------- | ---------------------------------- |
| `HIKVISION_MODE`                 | `mock`      | `live` to call real cameras        |
| `HIKVISION_TIMEOUT_MS`           | `8000`      | per-request timeout                |
| `HIKVISION_BREAKER_MAX_FAILURES` | `5`         | circuit breaker threshold          |
| `HIKVISION_BREAKER_COOLDOWN_MS`  | `60000`     | breaker cooldown                   |
| `CCTV_PROBE_BATCH`               | `20`        | cameras probed per health tick     |
| `CCTV_FAIL_THRESHOLD`            | `3`         | consecutive failures → offline     |
| `CCTV_HEALTH_TICK_MS`            | `60000`     | health monitor cadence             |
| `CCTV_NVR_TICK_MS`               | `300000`    | NVR health cadence                 |
| `CCTV_REAP_TICK_MS`              | `30000`     | idle stream reaper cadence         |
| `CCTV_STREAM_IDLE_MS`            | `30000`     | session idle before reap           |
| `CCTV_MAX_SESSIONS_PER_USER`     | `6`         | concurrency cap                    |
| `CCTV_HLS_BASE`                  | `/cctv/hls` | HLS URL prefix                     |
| `CCTV_FACE_MATCH_THRESHOLD`      | `0.72`      | cosine similarity for face match   |
| `CCTV_LOITER_WINDOW_MS`          | `300000`    | loitering sliding window           |
| `CCTV_LOITER_THRESHOLD`          | `6`         | events to trigger loitering        |
| `CCTV_DEFAULT_ROOM_MAX`          | `25`        | default room occupancy cap         |
| `CCTV_DISABLE_SCHEDULERS`        | `0`         | set `1` to disable schedulers (CI) |

Each camera's password lives in `process.env[camera.auth.passwordRef]` —
**never** stored in the DB.

## 5. PDPL compliance

- `CctvViewAudit` rows are written for: live start, snapshot view,
  snapshot download, playback view, clip export, PTZ control, config
  change, and **access_denied**. Each carries `purpose`, `consentRef`,
  source IP, user agent, and (where relevant) `beneficiaryId`.
- `CctvAccessGrant.isCurrentlyValid(now)` enforces validity, daysOfWeek,
  and `hoursLocal`. Parent grants must list explicit `cameraIds`.
- Watermark default: on. Captured via session row + rendered client-side.
- Retention: `CctvEvent.retainUntil` defaults to `camera.pdpl.retentionDays`
  (default 30 d). MongoDB TTL index drops the row.
- `CctvRecording.legalHold` blocks deletion regardless of retention.

## 6. Smoke check (post-deploy)

```bash
# adapter config
curl -s -H "Authorization: Bearer $TOK" https://alaweal.org/api/v1/cctv/admin/config | jq .data.mode
# expect: "mock" until HIKVISION_MODE=live

# camera count by branch
curl -s -H "Authorization: Bearer $TOK" https://alaweal.org/api/v1/cctv/cameras/stats/by-branch | jq

# manually trigger a probe tick
curl -s -X POST -H "Authorization: Bearer $TOK" https://alaweal.org/api/v1/cctv/admin/probe | jq

# rotated open-alert queue
curl -s -H "Authorization: Bearer $TOK" "https://alaweal.org/api/v1/cctv/alerts?severity=critical" | jq
```

## 7. Tests

```text
backend/__tests__/cctv-adapter.test.js              13 tests
backend/__tests__/cctv-event-service.test.js         8 tests
backend/__tests__/cctv-webhook-hmac.test.js          7 tests
backend/__tests__/cctv-ai-detectors.test.js          9 tests
backend/__tests__/cctv-alert-rules.test.js           4 tests
backend/__tests__/cctv-access-grant.test.js          5 tests
backend/__tests__/cctv-models-registration.test.js   2 tests
                                                   ────────────
                                                    48 / 48 ✓
```

## 8. Next commits (not yet shipped)

- **C8** — Admin web UI in `alawael-rehab-platform/apps/web-admin`:
  `/security/cctv` hub + branch grid + live grid + camera detail +
  event timeline + alert queue + face/ANPR/zone editors + audit log.
- **C9** — Mobile (`mobile/`): branch camera list + live viewer +
  push notifications for critical alerts.
- **C10** — Parent portal page in web-admin (`/portal/cctv/my-room`)
  with consent gate + time window banner + watermark overlay.
- **C11** — Real edge gateway service in `services/iot-gateway/` to
  push from each branch instead of every NVR talking to central.

[collisions]: ../../C:\Users\x-be.claude\projects\c--Users-x-be-OneDrive-----------04-10-2025-66666\memory\project_model_collisions_zeroed_2026-05-14.md
