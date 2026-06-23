# Sessions Surface Unification

## Summary

All public session surfaces have been consolidated onto the DDD Sessions domain at `/api/v1/sessions/*`. Legacy route files have been archived.

## Retired Surfaces

| Legacy Path                            | New Path                              | Status             |
| -------------------------------------- | ------------------------------------- | ------------------ |
| `/api/v1/therapy-sessions/*`           | `/api/v1/sessions/*`                  | Retired & archived |
| `/api/v1/session-center/*`             | `/api/v1/sessions/session-center/*`   | Retired & archived |
| `/api/v1/therapy-sessions-analytics/*` | `/api/v1/sessions/analytics/*`        | Retired & archived |
| `/api/admin/therapy-sessions/*`        | `/api/v1/sessions/admin/*`            | Retired in place   |
| `/api/v1/therapist/sessions/*`         | `/api/v1/sessions/therapist/sessions` | Retired in place   |
| `/api/v1/therapist/schedule/*`         | `/api/v1/sessions/therapist/schedule` | Retired in place   |

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

## Admin Therapy Sessions (Compat)

- `GET    /api/v1/sessions/admin`
- `GET    /api/v1/sessions/admin/stats`
- `GET    /api/v1/sessions/admin/calendar`
- `POST   /api/v1/sessions/admin`
- `PATCH  /api/v1/sessions/admin/:id`
- `DELETE /api/v1/sessions/admin/:id`
- `POST   /api/v1/sessions/admin/:id/status`
- `POST   /api/v1/sessions/admin/:id/check-in`
- `POST   /api/v1/sessions/admin/:id/finalize`
- `POST   /api/v1/sessions/admin/:id/amend`
- `POST   /api/v1/sessions/admin/:id/create-claim`
- `POST   /api/v1/sessions/admin/bulk-create-claims`

## Therapist Portal Sessions (Compat)

- `GET    /api/v1/sessions/therapist/sessions`
- `POST   /api/v1/sessions/therapist/sessions`
- `GET    /api/v1/sessions/therapist/sessions/:sessionId`
- `PUT    /api/v1/sessions/therapist/sessions/:sessionId`
- `DELETE /api/v1/sessions/therapist/sessions/:sessionId`
- `GET    /api/v1/sessions/therapist/sessions/:sessionId/documentation`
- `POST   /api/v1/sessions/therapist/sessions/:sessionId/documentation`
- `GET    /api/v1/sessions/therapist/schedule`
- `POST   /api/v1/sessions/therapist/schedule`
- `PUT    /api/v1/sessions/therapist/schedule/:sessionId`
- `DELETE /api/v1/sessions/therapist/schedule/:sessionId`

## Frontend Services

- `frontend/src/services/therapySessions.service.js` → delegates to `sessionsAPI`.
- `frontend/src/services/sessionCenterService.js` → delegates to `sessionCenterAPI`.
- `frontend/src/services/therapistService.js` sessions/schedule → delegates to `sessionsAPI.therapist`.
- `frontend/src/services/disabilityRehabService.js` therapy sessions/schedule → delegates to `sessionsAPI.therapist`.
- Admin therapy callers → `sessionsAPI.admin`.

## Archived Files

- `backend/_archived/routes/therapy-sessions.routes.js.archived`
- `backend/_archived/routes/session-center.routes.js.archived`
- `backend/_archived/routes/therapy-sessions-analytics.routes.js.archived`
- `backend/__tests__/_archived/therapy-sessions-analytics-branch-scope-wave657.test.js.archived`
- `backend/__tests__/_archived/therapy-sessions-documentation-branch-isolation-wave1409.test.js.archived`
- `backend/tests/unit/_archived/session-center.routes.test.js.archived`

## Branch Isolation Notes

- All DDD Sessions endpoints respect `effectiveBranchScope(req)` (W269/W1152).
- `:sessionId` params on the core/analytics/admin surfaces use `branchScopedResourceParam(ClinicalSession)`.
- The therapist compat surface uses `branchScopedResourceParam(TherapySession)` plus therapist-employee ownership via `TherapistPortalService`.
