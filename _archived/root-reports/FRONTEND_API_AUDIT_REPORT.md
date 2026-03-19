# Frontend → Backend API Audit Report

**Generated:** 2026-03-06
**Scope:** `frontend/src/` (main frontend only, supply-chain-management noted separately)

---

## 1. ALL Backend Mounted Routes (from `backend/app.js`)

| Mount Path | Route File | Also at `/api/v1/…` |
|---|---|---|
| `/api/auth` | `api/routes/auth.routes` | ✅ `/api/v1/auth` |
| `/api/users` | `api/routes/users.routes` | ✅ `/api/v1/users` |
| `/api/modules` | `api/routes/modules.routes` | ✅ `/api/v1/modules` |
| `/api/crm` | `api/routes/crm.routes.legacy` | ✅ `/api/v1/crm` |
| `/api/payroll` | `routes/payroll.routes` | ✅ `/api/v1/payroll` |
| `/api/notifications` | `routes/notifications.routes` | ✅ `/api/v1/notifications` |
| `/api/messages` | `routes/messaging.routes` | ✅ `/api/v1/messages` |
| `/api/threads` | `routes/threads.routes` | ✅ `/api/v1/threads` |
| `/api/conversations` | `routes/conversations.routes` | ✅ `/api/v1/conversations` |
| `/api/finance` | `routes/finance.routes.unified` | ✅ `/api/v1/finance` |
| `/api/reports` | `api/routes/reporting.routes` | ✅ `/api/v1/reports` |
| `/api/integrations` | `routes/integration.routes.minimal` | ✅ `/api/v1/integrations` |
| `/api/v1/disability-rehabilitation` | `routes/disability-rehabilitation` | (v1 only) |
| `/api/v1/maintenance` | `routes/maintenance` | (v1 only) |
| `/api/webhooks` | `routes/webhooks` | ✅ `/api/v1/webhooks` |
| `/api/v1/assets` | `routes/assets` | (v1 only) |
| `/api/v1/schedules` | `routes/schedules` | (v1 only) |
| `/api/v1/analytics` | `routes/analytics` | (v1 only) |
| `/api/v1/basic-reports` | `routes/reports` | (v1 only) |
| `/api/v1/health` | `routes/health.routes` | (v1 only) |
| `/api/phases-21-28` | `routes/phases-21-28.routes` | — |
| `/api/disability-rehabilitation` | `routes/disability-rehabilitation.routes` | — |
| `/phases-29-33`, `/api/phases-29-33` | `routes/phases-29-33.routes` | — |
| `/api/…` (Phase 17) | `routes/phase17-advanced.routes` | (sub-routes within `/api`) |
| `/api/…` (Phases 18-20) | `routes/phases-18-20.routes` | (sub-routes within `/api`) |
| `/health` | inline handler | — |
| `/api/health` | inline handler | — |
| `/api/info` | inline handler | — |
| `/api/test` | inline (dev-only) | — |
| `/metrics` | metrics handler | — |

---

## 2. ALL Route Files in `backend/routes/` and `backend/api/routes/`

### `backend/api/routes/` (15 files)
- ai.routes.js
- auth.routes.js
- beneficiary/ (directory)
- crm.routes.legacy.js
- documents.routes.js
- finance/ (directory)
- integration.routes.js
- modules.routes.js
- project.routes.js
- reporting.routes.js
- search.routes.js
- setupRoutes.js
- transport.routes.js
- users.routes.js
- workflows.routes.js

### `backend/routes/` (100+ files)
advancedAnalytics.routes.js, advancedSessions.js, ai.recommendations.routes.js, ai.recommendations.routes.simple.js, aiNotifications.js, analytics.js, approvalRequests.js, assets.js, attendance.routes.js, auth.routes.js, beneficiaryPortal.js, branch-integration.routes.js, branches.routes.js, cache-management.routes.js, caseManagement.js, civilDefense.routes.js, cms.js, communication.routes.js, community.js, communityAwarenessRoutes.js, compensation-benefits.routes.js, conversations.routes.js, dashboard.js, dashboard.routes.unified.js, dashboards.js, dashboardWidget.routes.js, database.routes.js, dateConverterRoutes.js, disability-rehabilitation.js, disability-rehabilitation.routes.js, docs.js, drivers.js, ecommerce.routes.js, elearning.js, employeeProfile.js, equipment.js, executive-dashboard-enhanced.js, executive-dashboard.js, fcm.js, finance.routes.js, finance.routes.unified.js, fix-routes.js, gps.js, gratuity.routes.js, health.routes.js, hr/ (directory), hr-advanced.routes.js, hr.routes.js, hr.routes.unified.js, index.unified.js, integration.routes.minimal.js, integrationHub.routes.js, integrations/ (directory), integrations.routes.js, internalAudit.js, inventory.routes.js, inventory.routes.unified.js, knowledge.js, licenses.js, maintenance.js, measurements.routes.js, medicalFiles.js, messaging.routes.js, mfa.js, migrations.js, ml.routes.js, mobileApp.routes.js, moi-passport.routes.js, monitoring.js, montessori.js, montessoriAuth.js, notificationRoutes.js, notifications.routes.js, notifications.routes.unified.js, notificationTemplates.js, orgBranding.js, otp-auth.routes.js, payroll.routes.js, performance.js, performanceEvaluation.js, performanceEvaluations.js, phase17-advanced.routes.js, phases-18-20.routes.js, phases-21-28.routes.js, phases-29-33.routes.js, predictions.routes.js, projects.routes.js, purchasing.routes.unified.js, qiwa.routes.js, quality.js, rbac-advanced.routes.js, rbac.routes.js, realtimeCollaboration.routes.js, rehabilitation.routes.js, reporting.routes.js, reports.js, schedules.js, search.js, smartGpsTracking.routes.js, smartNotifications.routes.js, smartScheduler.js, smart_attendance.routes.js, specializedPrograms.js, sso.routes.js, stub.route.js, successionPlanning.js, supplyChain.routes.js, support.js, system-optimization.routes.js, templates.js, tenant.routes.js, threads.routes.js, trafficAccidentAnalytics.js, trafficAccidents.js, transportRoutes.js, trips.js, validate.js, vehicles.js, webhooks.js

---

## 3. ALL Frontend API Calls Grouped by Page/Service

> **Base URL:** `http://localhost:5000/api` (set in `api.client.js` / `apiConfig.js`)
> All paths below are relative to this base unless noted as absolute (`/api/...`).

---

### A. Service Layer (`frontend/src/services/`)

#### `api.js` (dashboardAPI, modulesAPI, searchAPI, validationAPI, adminAPI)
| Endpoint | Method |
|---|---|
| `/dashboard/health` | GET |
| `/dashboard/summary` | GET |
| `/dashboard/summary-systems` | GET |
| `/dashboard/services` | GET |
| `/dashboard/top-kpis` | GET |
| `/modules` | GET |
| `/modules/:moduleKey` | GET |
| `/search` | GET |
| `/search/suggestions` | GET |
| `/validate/email` | GET |
| `/validate/phone` | GET |
| `/validate/url` | GET |
| `/validate/schema` | POST |
| `/admin/overview` | GET |
| `/admin/users` | GET |
| `/admin/alerts` | GET |

#### `auth.service.js`
| Endpoint | Method |
|---|---|
| `/auth/login` | POST |
| `/auth/register` | POST |
| `/auth/verify-email` | POST |
| `/auth/resend-verification` | POST |
| `/auth/forgot-password` | POST |
| `/auth/reset-password` | POST |
| `/auth/2fa/enable` | POST |
| `/auth/2fa/disable` | POST |
| `/auth/2fa/verify` | POST |
| `/auth/refresh-token` | POST |
| `/account/security` | GET |
| `/account/security` | PUT |
| `/account/sessions` | GET |
| `/account/sessions/:id` | DELETE |
| `/account/sessions/logout-all` | POST |

#### `analyticsService.js`
| Endpoint | Method |
|---|---|
| `/analytics/hr` | GET |
| `/analytics/system` | GET |
| `/analytics/insights` | GET |

#### `assessmentService.js`
| Endpoint | Method |
|---|---|
| `/disability/assessment/scale-results` | GET |
| `/disability/assessment/scale-results` | POST |
| `/disability/assessment/test-results` | GET |
| `/disability/assessment/test-results` | POST |
| `/v1/disability-rehabilitation/statistics` | GET |

#### `documentService.js`
| Endpoint | Method |
|---|---|
| `/documents/upload` | POST |
| `/documents` | GET |
| `/documents/:id` | GET |
| `/documents/:id` | PUT |
| `/documents/:id/download` | GET |
| `/documents/:id/share` | POST |
| `/documents/:id/share/:shareId` | DELETE |
| `/documents/:id` | DELETE |
| `/documents/:id/restore` | POST |
| `/documents/stats` | GET |
| `/documents/search` | GET |
| `/documents/folders` | GET |

#### `eLearning.service.js`
| Endpoint | Method |
|---|---|
| `/lms/courses` | GET |
| `/lms/courses/:id` | GET |
| `/lms/courses` | POST |
| `/lms/courses/:id` | PUT |
| `/lms/courses/:id` | DELETE |
| `/lms/courses/:courseId/lessons` | POST |
| `/lms/courses/:courseId/lessons/:lessonId/complete` | POST |
| `/lms/courses/:courseId/enroll` | POST |
| `/lms/my-courses` | GET |

#### `orgBrandingService.js`
| Endpoint | Method |
|---|---|
| `/org-branding/:orgId` | GET |
| `/org-branding/:orgId` | POST |

#### `projectManagement.service.js`
| Endpoint | Method |
|---|---|
| `/pm/projects` | GET |
| `/pm/projects` | POST |
| `/pm/projects/:id` | GET |
| `/pm/projects/:id` | PUT |
| `/pm/projects/:projectId/tasks` | GET |
| `/pm/tasks` | POST |
| `/pm/tasks/:id` | PATCH |
| `/pm/tasks/:id` | DELETE |

#### `smartReportsService.js`
| Endpoint | Method |
|---|---|
| `/reports/comprehensive` | POST |
| `/reports/performance` | POST |
| `/reports/trends` | GET |
| `/reports/comparative` | POST |
| `/reports/:type/detailed` | POST |
| `/reports/recommendations` | POST |
| `/reports/executive-summary` | POST |
| `/reports/kpis` | POST |
| `/reports/swot` | POST |
| `/reports/forecasts` | GET |
| `/reports/anomalies` | POST |
| `/reports/custom/save` | POST |
| `/reports/custom/list` | POST |
| `/reports/custom/:reportId` | GET |
| `/reports/custom/:reportId` | DELETE |
| `/reports/schedule` | POST |
| `/reports/send-email` | POST |
| `/reports/templates/:templateId` | GET |
| `/reports/available` | GET |
| `/reports/analyze` | POST |

#### `adminService.js`
| Endpoint | Method |
|---|---|
| `/payments/all` | GET |
| _(All other methods return mocked data — no API calls)_ | — |

#### `studentPortalService.js`
| Endpoint | Method |
|---|---|
| `/students/:studentId/dashboard` | GET (fetch) |
| `/students/:studentId/schedule` | GET (fetch) |
| `/students/:studentId/grades` | GET (fetch) |
| `/students/:studentId/attendance` | GET (fetch) |
| `/students/:studentId/assignments` | GET (fetch) |
| `/students/:studentId/announcements` | GET (fetch) |
| `/reports/student-advanced` | GET (fetch) |

#### `therapistService.js` — **100% MOCK** (no real API calls)
#### `parentService.js` — **100% MOCK** (no real API calls)

---

### B. Context Layer

#### `AuthContext.js`
| Endpoint | Method |
|---|---|
| `/auth/profile` | GET |
| `/auth/login` | POST |
| `/auth/register` | POST |

---

### C. Pages (`frontend/src/pages/`)

#### `AttendanceReports.js`
| Endpoint | Method |
|---|---|
| `/ai/predict-absence` | POST |

#### `Communications.js`
| Endpoint | Method |
|---|---|
| `/api/ai-communications/dashboard` | GET (fetch, absolute) |
| `/api/ai-communications/send-message` | POST (fetch, absolute) |

#### `CommunicationsSystem.jsx`
| Endpoint | Method |
|---|---|
| `/communications` | GET |
| `/communications/stats` | GET |
| `/communications` | POST |
| `/communications/:id` | DELETE |

#### `CourseViewer.js`
| Endpoint | Method |
|---|---|
| `/lms/courses/:id` | GET |

#### `DocumentsPage.js`
| Endpoint | Method |
|---|---|
| `/documents/dashboard` | GET (fetch) |
| `/documents` | GET (fetch) |
| `/documents/reports/analytics` | GET (fetch) |
| `/documents/upload` | POST (fetch) |

#### `SmartDocumentsPage.js`
| Endpoint | Method |
|---|---|
| `/documents-smart/templates` | GET (fetch) |
| `/documents-smart/generate` | POST (fetch) |

#### `MonitoringDashboard.jsx`
| Endpoint | Method |
|---|---|
| `/monitoring/dashboard` | GET (fetch) |
| `/monitoring/cache` | GET (fetch) |
| `/monitoring/queries` | GET (fetch) |
| `/monitoring/realtime` | GET (fetch) |

#### `SecuritySettings.js`
| Endpoint | Method |
|---|---|
| `/security/logs/me` | GET |
| `/security/mfa/setup` | POST |
| `/security/mfa/enable` | POST |

#### `PaymentDashboard.js`
| Endpoint | Method |
|---|---|
| `/payments/history` | GET |
| `/payments/stripe` | POST |
| `/payments/paypal` | POST |
| `/payments/installment` | POST |
| `/payments/subscriptions/create` | POST |

#### `HRAdvancedDashboard.js`
| Endpoint | Method |
|---|---|
| `/hr-system/attendance` | GET |
| `/hr-system/employees` | GET |
| `/hr-system/leaves` | GET |
| `/hr-system/attendance/checkin` | POST |

#### `OrganizationChart.jsx`
| Endpoint | Method |
|---|---|
| `/organization/structure` | GET |

#### `AIAnalyticsDashboard.js`
| Endpoint | Method |
|---|---|
| `/ai-predictions/predictions/:userId` | GET |
| `/ai-predictions/recommendations/:userId` | GET |

#### `StudentReports.js`
| Endpoint | Method |
|---|---|
| `/api/exports/:exportFormat` | GET (fetch, absolute) |

#### `StudentPortal.js`, `StudentSchedule.js`, `StudentGrades.js`, `StudentAttendance.js`, `StudentAssignments.js`, `StudentAnnouncements.js`
All use `studentPortalService` → see service endpoints above.

#### `TherapistDashboard.js`, `TherapistPatients.js`, `TherapistSchedule.js`, `TherapistSessions.js`, `TherapistCases.js`, `TherapistReports.js`, `TherapistMessages.js`, `TherapistDocuments.js`, `TherapistCommunications.js`
All use `therapistService` or `parentService` → **100% MOCK, no API calls**.

#### `ParentDashboard.js`, `ParentMessages.js`, `ChildrenProgress.js`, `PaymentsHistory.js`, `DocumentsReports.js`, `AppointmentsScheduling.js`, `AttendanceReports.js` (parent parts)
All use `parentService` → **100% MOCK** (except AttendanceReports which has the AI call).

#### `AdminDashboard.js`, `AdminUsersManagement.js`, `AdminClinicManagement.js`, `AdminNotifications.js`, `AdminPaymentsBilling.js`, `AdminReportsAnalytics.js`, `AdminSystemSettings.js`, `AdminAuditLogs.js`
All use `adminService` → **100% MOCK** except `getAdminPayments` which calls `/payments/all`.

#### `ELearningDashboard.js`
Uses `eLearningService` → see eLearning endpoints above.

#### `ExecutiveDashboard.js`
Uses `analyticsService` → `/analytics/hr`, `/analytics/system`, `/analytics/insights`.

#### `ProjectManagementDashboard.js`
Uses `projectManagementService` → see PM endpoints above.

#### `ModulePage.js`
Uses `modulesAPI` → `/modules/:moduleKey`.

#### `Reports/AdvancedReportsPage.jsx`
Uses `smartReportsService` → see smart reports endpoints above.

#### `DisabilityAssessmentScales.jsx`, `DisabilityAssessmentTests.jsx`
Uses `assessmentService` → see assessment endpoints above.

#### `Documents.js`
Uses `documentService` → see document endpoints above.

#### `MessagingPage.js`
Wraps `ChatComponent` (no direct API).

#### `Register.js`, `SimpleLogin.jsx`, `Profile.js`
No direct API calls found (use AuthContext or inline forms).

---

### D. Components (`frontend/src/components/`)

#### `PayrollDashboard.jsx`
| Endpoint | Method |
|---|---|
| `/payroll/stats/:month-:year/:year` | GET |
| `/payroll/monthly/:month-:year/:year` | GET |
| `/payroll/process` (or similar) | POST |
| `/payroll/:id/approve` | PUT |

#### `CompensationStructureManagement.jsx`
| Endpoint | Method |
|---|---|
| `/payroll/compensation/structures` | GET |
| `/payroll/compensation/structures/:id` | PUT |
| `/payroll/compensation/structures` | POST |
| `/payroll/compensation/structures/:id` | DELETE |

#### `PayrollAnalyticsDashboard.jsx`
| Endpoint | Method |
|---|---|
| `/payroll/analytics/...` | GET |

#### `IncentivesManagement.jsx`
| Endpoint | Method |
|---|---|
| `/compensation/incentives` | GET |
| `/compensation/incentives` | POST |
| `/compensation/incentives/:id` | PUT |
| `/compensation/incentives/:id/approve` | PUT |

#### `StudentReportsAdvancedOptions.js`
| Endpoint | Method |
|---|---|
| `/api/exports/:format` | GET (fetch, absolute) |
| `/api/student-reports/:studentId/schedule` | POST (fetch, absolute) |
| `/api/student-reports/:studentId/comparison` | GET (fetch, absolute) |

#### `ExportImportManager.js`
| Endpoint | Method |
|---|---|
| `/api/export-import/export/excel` | GET (fetch, absolute) |
| `/api/export-import/export/pdf/:programId` | GET (fetch, absolute) |
| `/api/export-import/import/template` | POST (fetch, absolute) |
| `/api/export-import/import/excel` | POST (fetch, absolute) |

#### `reports/AdvancedReports.js`
| Endpoint | Method |
|---|---|
| `/api/rehabilitation-programs` | GET (fetch, absolute) |
| `/api/analytics/program/:id/performance` | GET (fetch, absolute) |
| `/api/analytics/compare` | POST (fetch, absolute) |
| `/api/analytics/predictive/:disabilityType` | GET (fetch, absolute) |

#### `analytics/AnalyticsDashboard.js`
| Endpoint | Method |
|---|---|
| `/api/analytics/dashboard` | GET (fetch, absolute) |
| `/api/analytics/trends/monthly` | GET (fetch, absolute) |
| `/api/analytics/export` | GET (fetch, absolute) |

#### `communications/EmailPanel.js`
| Endpoint | Method |
|---|---|
| `/api/ai-communications/emails` | GET (fetch, absolute) |
| `/api/ai-communications/emails/send` | POST (fetch, absolute) |

#### `communications/MessagingPanel.js`
| Endpoint | Method |
|---|---|
| `/api/ai-communications/conversations/:id/messages` | GET (fetch, absolute) |

#### `communications/ChatbotPanel.js`
| Endpoint | Method |
|---|---|
| `/api/ai-communications/chatbot/chat` | POST (fetch, absolute) |

---

## 4. 🔴 404 ENDPOINTS — Called by Frontend but NOT Mounted in Backend

These endpoints are called by frontend pages/services but have **no matching route** in `backend/app.js`:

### CRITICAL (will definitely 404)

| # | Frontend Endpoint | Called From | Status |
|---|---|---|---|
| 1 | `/api/dashboard/health` | api.js (dashboardAPI) | ❌ No `/api/dashboard` route mounted |
| 2 | `/api/dashboard/summary` | api.js (dashboardAPI) | ❌ No `/api/dashboard` route mounted |
| 3 | `/api/dashboard/summary-systems` | api.js (dashboardAPI) | ❌ No `/api/dashboard` route mounted |
| 4 | `/api/dashboard/services` | api.js (dashboardAPI) | ❌ No `/api/dashboard` route mounted |
| 5 | `/api/dashboard/top-kpis` | api.js (dashboardAPI) | ❌ No `/api/dashboard` route mounted |
| 6 | `/api/search` | api.js (searchAPI) | ❌ No `/api/search` route mounted |
| 7 | `/api/search/suggestions` | api.js (searchAPI) | ❌ No `/api/search` route mounted |
| 8 | `/api/validate/email` | api.js (validationAPI) | ❌ No `/api/validate` route mounted |
| 9 | `/api/validate/phone` | api.js (validationAPI) | ❌ No `/api/validate` route mounted |
| 10 | `/api/validate/url` | api.js (validationAPI) | ❌ No `/api/validate` route mounted |
| 11 | `/api/validate/schema` | api.js (validationAPI) | ❌ No `/api/validate` route mounted |
| 12 | `/api/admin/overview` | api.js (adminAPI) | ❌ No `/api/admin` route mounted |
| 13 | `/api/admin/users` | api.js (adminAPI) | ❌ No `/api/admin` route mounted |
| 14 | `/api/admin/alerts` | api.js (adminAPI) | ❌ No `/api/admin` route mounted |
| 15 | `/api/account/security` | auth.service.js | ❌ No `/api/account` route mounted |
| 16 | `/api/account/sessions` | auth.service.js | ❌ No `/api/account` route mounted |
| 17 | `/api/account/sessions/:id` | auth.service.js | ❌ No `/api/account` route mounted |
| 18 | `/api/account/sessions/logout-all` | auth.service.js | ❌ No `/api/account` route mounted |
| 19 | `/api/analytics/hr` | analyticsService.js | ❌ No `/api/analytics` (only `/api/v1/analytics`) |
| 20 | `/api/analytics/system` | analyticsService.js | ❌ Not under `/api/v1/analytics` |
| 21 | `/api/analytics/insights` | analyticsService.js | ❌ Not under `/api/v1/analytics` |
| 22 | `/api/disability/assessment/scale-results` | assessmentService.js | ❌ No `/api/disability` route mounted |
| 23 | `/api/disability/assessment/test-results` | assessmentService.js | ❌ No `/api/disability` route mounted |
| 24 | `/api/documents/upload` | documentService.js | ❌ No `/api/documents` route mounted |
| 25 | `/api/documents` | documentService.js | ❌ No `/api/documents` route mounted |
| 26 | `/api/documents/:id` | documentService.js | ❌ No `/api/documents` route mounted |
| 27 | `/api/documents/:id/download` | documentService.js | ❌ |
| 28 | `/api/documents/:id/share` | documentService.js | ❌ |
| 29 | `/api/documents/:id/restore` | documentService.js | ❌ |
| 30 | `/api/documents/stats` | documentService.js | ❌ |
| 31 | `/api/documents/search` | documentService.js | ❌ |
| 32 | `/api/documents/folders` | documentService.js | ❌ |
| 33 | `/api/documents/dashboard` | DocumentsPage.js | ❌ |
| 34 | `/api/documents/reports/analytics` | DocumentsPage.js | ❌ |
| 35 | `/api/documents-smart/templates` | SmartDocumentsPage.js | ❌ No `/api/documents-smart` route |
| 36 | `/api/documents-smart/generate` | SmartDocumentsPage.js | ❌ |
| 37 | `/api/lms/courses` | eLearning.service.js | ❌ No `/api/lms` route mounted |
| 38 | `/api/lms/courses/:id` | eLearning.service.js | ❌ |
| 39 | `/api/lms/my-courses` | eLearning.service.js | ❌ |
| 40 | `/api/org-branding/:orgId` | orgBrandingService.js | ❌ No `/api/org-branding` route mounted |
| 41 | `/api/pm/projects` | projectManagement.service.js | ❌ No `/api/pm` route mounted |
| 42 | `/api/pm/tasks` | projectManagement.service.js | ❌ |
| 43 | `/api/communications` | CommunicationsSystem.jsx | ❌ No `/api/communications` route mounted |
| 44 | `/api/communications/stats` | CommunicationsSystem.jsx | ❌ |
| 45 | `/api/monitoring/dashboard` | MonitoringDashboard.jsx | ❌ No `/api/monitoring` route mounted |
| 46 | `/api/monitoring/cache` | MonitoringDashboard.jsx | ❌ |
| 47 | `/api/monitoring/queries` | MonitoringDashboard.jsx | ❌ |
| 48 | `/api/monitoring/realtime` | MonitoringDashboard.jsx | ❌ |
| 49 | `/api/security/logs/me` | SecuritySettings.js | ❌ No `/api/security` route mounted |
| 50 | `/api/security/mfa/setup` | SecuritySettings.js | ❌ |
| 51 | `/api/security/mfa/enable` | SecuritySettings.js | ❌ |
| 52 | `/api/payments/history` | PaymentDashboard.js | ❌ No `/api/payments` route mounted |
| 53 | `/api/payments/stripe` | PaymentDashboard.js | ❌ |
| 54 | `/api/payments/paypal` | PaymentDashboard.js | ❌ |
| 55 | `/api/payments/installment` | PaymentDashboard.js | ❌ |
| 56 | `/api/payments/subscriptions/create` | PaymentDashboard.js | ❌ |
| 57 | `/api/payments/all` | adminService.js | ❌ |
| 58 | `/api/hr-system/attendance` | HRAdvancedDashboard.js | ❌ No `/api/hr-system` route mounted |
| 59 | `/api/hr-system/employees` | HRAdvancedDashboard.js | ❌ |
| 60 | `/api/hr-system/leaves` | HRAdvancedDashboard.js | ❌ |
| 61 | `/api/hr-system/attendance/checkin` | HRAdvancedDashboard.js | ❌ |
| 62 | `/api/organization/structure` | OrganizationChart.jsx | ❌ No `/api/organization` route mounted |
| 63 | `/api/ai-predictions/predictions/:userId` | AIAnalyticsDashboard.js | ❌ No `/api/ai-predictions` route mounted |
| 64 | `/api/ai-predictions/recommendations/:userId` | AIAnalyticsDashboard.js | ❌ |
| 65 | `/api/ai/predict-absence` | AttendanceReports.js | ❌ No `/api/ai` route mounted directly |
| 66 | `/api/ai-communications/dashboard` | Communications.js | ❌ No `/api/ai-communications` route |
| 67 | `/api/ai-communications/send-message` | Communications.js | ❌ |
| 68 | `/api/ai-communications/emails` | EmailPanel.js | ❌ |
| 69 | `/api/ai-communications/emails/send` | EmailPanel.js | ❌ |
| 70 | `/api/ai-communications/conversations/:id/messages` | MessagingPanel.js | ❌ |
| 71 | `/api/ai-communications/chatbot/chat` | ChatbotPanel.js | ❌ |
| 72 | `/api/students/:id/dashboard` | studentPortalService.js | ❌ No `/api/students` route mounted |
| 73 | `/api/students/:id/schedule` | studentPortalService.js | ❌ |
| 74 | `/api/students/:id/grades` | studentPortalService.js | ❌ |
| 75 | `/api/students/:id/attendance` | studentPortalService.js | ❌ |
| 76 | `/api/students/:id/assignments` | studentPortalService.js | ❌ |
| 77 | `/api/students/:id/announcements` | studentPortalService.js | ❌ |
| 78 | `/api/reports/student-advanced` | studentPortalService.js | ⚠️ May 404 (depends on reporting.routes sub-routes) |
| 79 | `/api/exports/:format` | StudentReports.js | ❌ No `/api/exports` route mounted |
| 80 | `/api/student-reports/:id/schedule` | StudentReportsAdvancedOptions.js | ❌ No `/api/student-reports` route |
| 81 | `/api/student-reports/:id/comparison` | StudentReportsAdvancedOptions.js | ❌ |
| 82 | `/api/export-import/export/excel` | ExportImportManager.js | ❌ No `/api/export-import` route |
| 83 | `/api/export-import/export/pdf/:id` | ExportImportManager.js | ❌ |
| 84 | `/api/export-import/import/template` | ExportImportManager.js | ❌ |
| 85 | `/api/export-import/import/excel` | ExportImportManager.js | ❌ |
| 86 | `/api/rehabilitation-programs` | AdvancedReports.js | ❌ No `/api/rehabilitation-programs` route |
| 87 | `/api/analytics/program/:id/performance` | AdvancedReports.js | ❌ |
| 88 | `/api/analytics/compare` | AdvancedReports.js | ❌ |
| 89 | `/api/analytics/predictive/:type` | AdvancedReports.js | ❌ |
| 90 | `/api/analytics/dashboard` | AnalyticsDashboard.js | ❌ (only v1 has analytics) |
| 91 | `/api/analytics/trends/monthly` | AnalyticsDashboard.js | ❌ |
| 92 | `/api/analytics/export` | AnalyticsDashboard.js | ❌ |
| 93 | `/api/compensation/incentives` | IncentivesManagement.jsx | ❌ No `/api/compensation` route |
| 94 | `/api/payroll/compensation/structures` | CompensationStructureManagement.jsx | ⚠️ Depends on payroll.routes sub-routes |

### LIKELY OK (routes exist)

| Endpoint | Called From | Likely Mount |
|---|---|---|
| `/api/auth/login` | auth.service.js, AuthContext.js | ✅ `/api/auth` |
| `/api/auth/register` | auth.service.js, AuthContext.js | ✅ `/api/auth` |
| `/api/auth/profile` | AuthContext.js | ✅ `/api/auth` |
| `/api/auth/2fa/*` | auth.service.js | ✅ `/api/auth` |
| `/api/auth/refresh-token` | auth.service.js | ✅ `/api/auth` |
| `/api/modules` | api.js | ✅ `/api/modules` |
| `/api/modules/:key` | api.js, ModulePage.js | ✅ `/api/modules` |
| `/api/reports/*` | smartReportsService.js | ✅ `/api/reports` (if sub-routes exist) |
| `/api/v1/disability-rehabilitation/statistics` | assessmentService.js | ✅ `/api/v1/disability-rehabilitation` |
| `/api/payroll/*` | PayrollDashboard.jsx | ✅ `/api/payroll` |
| `/api/finance/*` | (various) | ✅ `/api/finance` |

---

## 5. Summary

| Metric | Count |
|---|---|
| Backend mounted route prefixes | ~30 |
| Route files in `backend/routes/` | ~110 |
| Route files in `backend/api/routes/` | ~15 |
| Frontend services making API calls | 12 |
| Frontend pages making direct API calls | ~15 |
| Frontend components making API calls | ~15 |
| **Total unique frontend API endpoints** | **~140** |
| **Endpoints that will 404** | **~94** |
| **Endpoints that are OK** | **~46** |

### Root Causes of 404s:
1. **No route mounted for most service prefixes** — `/api/dashboard`, `/api/search`, `/api/validate`, `/api/admin`, `/api/account`, `/api/documents`, `/api/lms`, `/api/pm`, `/api/communications`, `/api/monitoring`, `/api/security`, `/api/payments`, `/api/hr-system`, `/api/organization`, `/api/ai-predictions`, `/api/ai-communications`, `/api/students`, `/api/exports`, `/api/student-reports`, `/api/export-import`, `/api/rehabilitation-programs`, `/api/compensation` — **none of these are mounted in `app.js`**.
2. **Route files exist but are not mounted** — e.g., `routes/dashboard.js`, `routes/search.js`, `routes/elearning.js`, `api/routes/documents.routes.js` exist in `backend/routes/` but are not `app.use()`'d in `app.js`.
3. **Many frontend pages use mock fallback** — Services like `therapistService`, `parentService`, `adminService` return mock data on failure, masking the 404s.

### Recommendations:
1. Mount the route files that already exist (`dashboard.js`, `search.js`, `elearning.js`, `documents.routes.js`, etc.) in `app.js`.
2. Create stub routes for endpoints that don't have backend implementations yet.
3. Standardize URL prefixes — some pages use `/api/analytics/` while backend only mounts `/api/v1/analytics`.
4. Remove or update dead API references (e.g., `ai-communications`, `ai-predictions`).
