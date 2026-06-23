# Sessions Surface Unification

## Summary

All public session surfaces have been consolidated onto the DDD Sessions domain at `/api/v1/sessions/*`. Legacy route files have been archived.

## Retired Surfaces

| Legacy Path                            | New Path                            | Status             |
| -------------------------------------- | ----------------------------------- | ------------------ |
| `/api/v1/therapy-sessions/*`           | `/api/v1/sessions/*`                | Retired & archived |
| `/api/v1/session-center/*`             | `/api/v1/sessions/session-center/*` | Retired & archived |
| `/api/v1/therapy-sessions-analytics/*` | `/api/v1/sessions/analytics/*`      | Retired & archived |

## Unified DDD Sessions Endpoints

### Core CRUD + Workflow

- `POST   /api/v1/sessions`
- `GET    /api/v1/sessions`
- `GET    /api/v1/sessions/:sessionId`
- `PUT    /api/v1/sessions/:sessionId`
- `DELETE /api/v1/sessions/:sessionId`
- `PATCH  /api/v1/sessions/:sessionId/status`
- `PUT    /api/v1/sessions/:sessionId/complete`
- `PUT    /api/v1/sessions/:sessionId/cancel`
- `POST   /api/v1/sessions/:sessionId/attend`
- `POST   /api/v1/sessions/:sessionId/start`
- `POST   /api/v1/sessions/:sessionId/no-show`
- `PATCH  /api/v1/sessions/:sessionId/reschedule`
- `POST   /api/v1/sessions/bulk-reschedule`

### Scopes

- `GET /api/v1/sessions/beneficiary/:beneficiaryId`
- `GET /api/v1/sessions/episode/:episodeId`
- `GET /api/v1/sessions/therapist/:therapistId`
- `GET /api/v1/sessions/therapist/:therapistId/schedule`
- `GET /api/v1/sessions/upcoming/:beneficiaryId`
- `GET /api/v1/sessions/availability/:therapistId`

### Documentation / SOAP

- `GET /api/v1/sessions/:sessionId/documentation`
- `PUT /api/v1/sessions/:sessionId/documentation`

### Dashboard / Stats

- `GET /api/v1/sessions/dashboard`
- `GET /api/v1/sessions/stats`
- `GET /api/v1/sessions/today`
- `GET /api/v1/sessions/statistics`

### Session Center Analytics

- `GET /api/v1/sessions/session-center/dashboard`
- `GET /api/v1/sessions/session-center/calendar`
- `GET /api/v1/sessions/session-center/therapist-load`
- `GET /api/v1/sessions/session-center/attendance`
- `GET /api/v1/sessions/session-center/episode/:episodeId`
- `GET /api/v1/sessions/session-center/beneficiary/:beneficiaryId`
- `GET /api/v1/sessions/session-center/goals/:episodeId`
- `GET /api/v1/sessions/session-center/soap/:sessionId`

### Sessions Analytics

- `GET  /api/v1/sessions/analytics/overview`
- `GET  /api/v1/sessions/analytics/trends`
- `GET  /api/v1/sessions/analytics/therapist-performance`
- `GET  /api/v1/sessions/analytics/room-utilization`
- `GET  /api/v1/sessions/analytics/attendance`
- `GET  /api/v1/sessions/analytics/billing`
- `GET  /api/v1/sessions/analytics/goal-progress`
- `GET  /api/v1/sessions/analytics/cancellations`
- `GET  /api/v1/sessions/analytics/calendar`
- `POST /api/v1/sessions/analytics/export/report`
- `GET  /api/v1/sessions/analytics/waitlist`
- `GET  /api/v1/sessions/analytics/:sessionId/billing`
- `POST /api/v1/sessions/analytics/billing/bulk`

## Branch Isolation

All endpoints respect `effectiveBranchScope(req)` (W269/W1152). `:sessionId` params use `branchScopedResourceParam(ClinicalSession)` to prevent cross-branch IDOR.

## Frontend Services

- `frontend/src/services/therapySessions.service.js` → delegates to `sessionsAPI`.
- `frontend/src/services/sessionCenterService.js` → delegates to `sessionCenterAPI`.
- `frontend/src/services/therapistService.js` analytics → delegates to `sessionsAPI.analytics`.

## Archived Files

- `backend/_archived/routes/therapy-sessions.routes.js.archived`
- `backend/_archived/routes/session-center.routes.js.archived`
- `backend/_archived/routes/therapy-sessions-analytics.routes.js.archived`
- `backend/__tests__/_archived/therapy-sessions-analytics-branch-scope-wave657.test.js.archived`
- `backend/__tests__/_archived/therapy-sessions-documentation-branch-isolation-wave1409.test.js.archived`
- `backend/tests/unit/_archived/session-center.routes.test.js.archived`

## Remaining Out-of-Scope Surfaces

- `/api/v1/therapist/sessions/*` — Therapist Portal (requires therapist-ownership enforcement before merging).
- `/api/admin/therapy-sessions/*` — Admin surface with claims bridge.
