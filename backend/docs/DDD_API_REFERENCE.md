# DDD Platform — API Reference
# منصة التأهيل الموحدة الذكية — مرجع واجهات البرمجة

> **Base URL**: `http://localhost:3001`
> **API Version**: `/api/v1` (also `/api/v2`)
> **Auth**: Bearer JWT token in `Authorization` header
> **Content-Type**: `application/json`

---

## Table of Contents

1. [Platform Health & Info](#1-platform-health--info)
2. [Core — Beneficiary](#2-core--beneficiary)
3. [Episodes of Care](#3-episodes-of-care)
4. [Timeline](#4-timeline)
5. [Assessments](#5-assessments)
6. [Care Plans](#6-care-plans)
7. [Sessions](#7-sessions)
8. [Goals & Measures](#8-goals--measures)
9. [Workflow](#9-workflow)
10. [Programs](#10-programs)
11. [AI Recommendations](#11-ai-recommendations)
12. [Quality & Compliance](#12-quality--compliance)
13. [Family Engagement](#13-family-engagement)
14. [Reports & Analytics](#14-reports--analytics)
15. [Group Therapy](#15-group-therapy)
16. [Tele-Rehabilitation](#16-tele-rehabilitation)
17. [AR/VR Rehabilitation](#17-arvr-rehabilitation)
18. [Behavior Management](#18-behavior-management)
19. [Clinical Research](#19-clinical-research)
20. [Field Training](#20-field-training)
21. [Dashboards & Decision Support](#21-dashboards--decision-support)
22. [Socket.IO Real-time Events](#22-socketio-real-time-events)

---

## 1. Platform Health & Info

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/platform/health` | Full platform health (DB, domains, models, memory) |
| GET | `/api/v1/platform/domains` | List all 20 DDD domains with endpoints |
| GET | `/api/v1/platform/stats` | Collection-level document counts |
| GET | `/api/v1/platform/version` | Platform version, feature list |
| GET | `/api/v2/domains/health` | Domain-by-domain health check |

### Response: `GET /api/v1/platform/health`
```json
{
  "status": "healthy",
  "platform": "Unified Rehabilitation Intelligence Platform",
  "version": "2.0.0-ddd",
  "domains": { "total": 20, "list": [...] },
  "models": { "total": 34, "list": [...] },
  "memory": { "rss": "120MB", "heapUsed": "85MB" }
}
```

---

## 2. Core — Beneficiary

**Prefix**: `/api/v1/core`
**Models**: `Beneficiary`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/core/` | List beneficiaries (paginated, filterable) |
| POST | `/core/` | Create new beneficiary |
| GET | `/core/:id` | Get beneficiary by ID |
| PUT | `/core/:id` | Update beneficiary |
| DELETE | `/core/:id` | Soft-delete beneficiary |
| GET | `/core/:id/360` | 360° profile (all linked data) |

### Query Parameters (List)
| Param | Type | Description |
|-------|------|-------------|
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 20, max: 100) |
| `search` | string | Full-text search on name/MRN |
| `status` | string | Filter by status (active, inactive, discharged) |
| `disabilityType` | string | Filter by disability type |

### Beneficiary Schema (key fields)
```json
{
  "mrn": "string (unique)",
  "nationalId": "string",
  "firstName": "string",
  "lastName": "string",
  "dateOfBirth": "date",
  "gender": "male|female",
  "disabilityType": "string",
  "disabilityLevel": "mild|moderate|severe|profound",
  "status": "active|inactive|discharged",
  "guardianInfo": { "name": "string", "phone": "string", "relation": "string" },
  "insuranceInfo": { "provider": "string", "policyNumber": "string" }
}
```

---

## 3. Episodes of Care

**Prefix**: `/api/v1/episodes`
**Models**: `EpisodeOfCare`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/episodes/` | List episodes (paginated) |
| POST | `/episodes/` | Create new episode for beneficiary |
| GET | `/episodes/:id` | Get episode details |
| PUT | `/episodes/:id` | Update episode |
| DELETE | `/episodes/:id` | Soft-delete |
| POST | `/episodes/:id/transition` | Transition to next phase |
| POST | `/episodes/:id/notes` | Add clinical note |

### 12-Phase Lifecycle
```
referral → screening → intake → assessment → planning →
active-treatment → review → transition → discharge-planning →
discharge → follow-up → closed
```

### Transition Body
```json
{
  "toPhase": "assessment",
  "reason": "Initial screening completed",
  "performedBy": "ObjectId"
}
```

---

## 4. Timeline

**Prefix**: `/api/v1/timeline`
**Models**: `CareTimeline`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/timeline/` | List timeline events |
| POST | `/timeline/` | Create timeline event |
| GET | `/timeline/:id` | Get event details |
| GET | `/timeline/beneficiary/:beneficiaryId` | All events for a beneficiary |
| GET | `/timeline/episode/:episodeId` | All events for an episode |

### 35+ Event Types
`referral`, `screening`, `intake`, `assessment`, `plan-created`, `session`, `goal-update`, `measure-applied`, `phase-transition`, `discharge`, `alert`, `family-communication`, etc.

---

## 5. Assessments

**Prefix**: `/api/v1/assessments`
**Models**: `ClinicalAssessment`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/assessments/` | List assessments |
| POST | `/assessments/` | Create assessment |
| GET | `/assessments/:id` | Get assessment |
| PUT | `/assessments/:id` | Update assessment |
| DELETE | `/assessments/:id` | Soft-delete |
| POST | `/assessments/:id/complete` | Mark as completed |
| GET | `/assessments/dashboard` | Assessment summary stats |

### Assessment Types
`initial`, `periodic`, `discharge`, `specialized`, `functional`, `cognitive`, `behavioral`, `developmental`

---

## 6. Care Plans

**Prefix**: `/api/v1/care-plans`
**Models**: `UnifiedCarePlan`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/care-plans/` | List care plans |
| POST | `/care-plans/` | Create care plan |
| GET | `/care-plans/:id` | Get care plan |
| PUT | `/care-plans/:id` | Update care plan |
| DELETE | `/care-plans/:id` | Soft-delete |
| POST | `/care-plans/:id/activate` | Activate plan |
| POST | `/care-plans/:id/complete` | Complete plan |
| POST | `/care-plans/:id/goals` | Add goal to plan |

---

## 7. Sessions

**Prefix**: `/api/v1/sessions`
**Models**: `ClinicalSession`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/sessions/` | List sessions |
| POST | `/sessions/` | Create session |
| GET | `/sessions/:id` | Get session |
| PUT | `/sessions/:id` | Update session |
| DELETE | `/sessions/:id` | Soft-delete |
| GET | `/sessions/therapist/:therapistId` | Sessions by therapist |
| GET | `/sessions/beneficiary/:beneficiaryId` | Sessions by beneficiary |
| GET | `/sessions/dashboard` | Session statistics |

### Session Types
`individual`, `group`, `family`, `tele-rehab`, `ar-vr`, `assessment`, `follow-up`

### Session Status
`scheduled`, `in-progress`, `completed`, `cancelled`, `no-show`

---

## 8. Goals & Measures

**Prefix**: `/api/v1/goals`
**Models**: `TherapeuticGoal`, `Measure`, `MeasureApplication`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/goals/` | List goals |
| POST | `/goals/` | Create goal |
| GET | `/goals/:id` | Get goal |
| PUT | `/goals/:id` | Update goal |
| DELETE | `/goals/:id` | Soft-delete |
| POST | `/goals/:id/progress` | Log progress entry |
| GET | `/goals/measures` | List available measures |
| POST | `/goals/measures/apply` | Apply a measure to beneficiary |
| GET | `/goals/measures/:id/results` | Get measure results |

### 8 Standard Measures
- WeeFIM (Functional Independence)
- GMFM (Gross Motor Function)
- Vineland-3 (Adaptive Behavior)
- PEDI-CAT (Pediatric Evaluation)
- BOT-2 (Motor Proficiency)
- COPM (Occupational Performance)
- GAS (Goal Attainment Scaling)
- FIM (Functional Independence - Adult)

---

## 9. Workflow

**Prefix**: `/api/v1/workflow`
**Models**: `WorkflowTask`, `WorkflowTransitionLog`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/workflow/` | List workflow tasks |
| POST | `/workflow/` | Create task |
| GET | `/workflow/:id` | Get task |
| PUT | `/workflow/:id` | Update task |
| DELETE | `/workflow/:id` | Soft-delete |
| POST | `/workflow/:id/transition` | Transition task state |
| GET | `/workflow/queue/:assigneeId` | Get user's task queue |
| GET | `/workflow/overdue` | List overdue tasks |

### 12-Phase State Machine
Tasks follow the same 12-phase lifecycle as Episodes of Care, with validated transitions.

---

## 10. Programs

**Prefix**: `/api/v1/programs`
**Models**: `Program`, `ProgramEnrollment`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/programs/` | List programs |
| POST | `/programs/` | Create program |
| GET | `/programs/:id` | Get program |
| PUT | `/programs/:id` | Update program |
| DELETE | `/programs/:id` | Soft-delete |
| POST | `/programs/:id/enroll` | Enroll beneficiary |
| GET | `/programs/:id/enrollments` | List enrollments |
| GET | `/programs/:id/progress` | Program progress stats |
| GET | `/programs/recommendations` | Get program recommendations |
| GET | `/programs/dashboard` | Programs dashboard |

---

## 11. AI Recommendations

**Prefix**: `/api/v1/ai-recommendations`
**Models**: `ClinicalRiskScore`, `Recommendation`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/ai-recommendations/` | List recommendations |
| POST | `/ai-recommendations/` | Create recommendation |
| GET | `/ai-recommendations/:id` | Get recommendation |
| PUT | `/ai-recommendations/:id` | Update recommendation |
| DELETE | `/ai-recommendations/:id` | Soft-delete |
| POST | `/ai-recommendations/score/:beneficiaryId` | Calculate risk score |
| GET | `/ai-recommendations/beneficiary/:beneficiaryId` | Recommendations for beneficiary |
| POST | `/ai-recommendations/generate/:beneficiaryId` | Generate AI recommendations |

### 11 Recommendation Rules
- Stalled progress detection
- Missed sessions alert
- Assessment overdue
- Goal deadline approaching
- Phase transition suggestion
- Care plan review needed
- Family engagement low
- Risk score elevated
- Treatment intensity recommendation
- Measure re-application suggestion
- Discharge readiness assessment

---

## 12. Quality & Compliance

**Prefix**: `/api/v1/quality`
**Models**: `QualityAudit`, `CorrectiveAction`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/quality/` | List audits |
| POST | `/quality/` | Create audit |
| GET | `/quality/:id` | Get audit |
| PUT | `/quality/:id` | Update audit |
| DELETE | `/quality/:id` | Soft-delete |
| POST | `/quality/:id/findings` | Add finding |
| POST | `/quality/:id/corrective-action` | Create corrective action |
| GET | `/quality/compliance` | Compliance overview |
| GET | `/quality/dashboard` | Quality dashboard |

### 10 Audit Rules
Documentation completeness, consent validity, session documentation, plan review, assessment timeliness, discharge planning, family engagement, safety protocol, progress notes, data accuracy

---

## 13. Family Engagement

**Prefix**: `/api/v1/family`
**Models**: `FamilyMember`, `FamilyCommunication`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/family/` | List family members |
| POST | `/family/` | Register family member |
| GET | `/family/:id` | Get family member |
| PUT | `/family/:id` | Update family member |
| DELETE | `/family/:id` | Soft-delete |
| GET | `/family/beneficiary/:beneficiaryId` | Family members of beneficiary |
| POST | `/family/communication` | Log communication |
| GET | `/family/communications/:beneficiaryId` | Communication history |
| GET | `/family/portal/:familyMemberId` | Family portal dashboard |

---

## 14. Reports & Analytics

**Prefix**: `/api/v1/reports`
**Models**: `ReportTemplate`, `GeneratedReport`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/reports/` | List report templates |
| POST | `/reports/` | Create report template |
| GET | `/reports/:id` | Get template |
| PUT | `/reports/:id` | Update template |
| DELETE | `/reports/:id` | Soft-delete |
| POST | `/reports/generate` | Generate report from template |
| GET | `/reports/generated` | List generated reports |
| GET | `/reports/generated/:id` | Get generated report |
| GET | `/reports/generated/:id/download` | Download report (PDF/Excel) |

### 5 Built-in Report Templates
- Beneficiary Progress Report (progress-report)
- Caseload Summary (caseload-summary)
- Outcome Analysis (outcome-analysis)
- Quality Compliance Report (quality-compliance)
- Program Effectiveness (program-effectiveness)

---

## 15. Group Therapy

**Prefix**: `/api/v1/group-therapy`
**Models**: `TherapyGroup`, `GroupSession`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/group-therapy/` | List therapy groups |
| POST | `/group-therapy/` | Create group |
| GET | `/group-therapy/:id` | Get group |
| PUT | `/group-therapy/:id` | Update group |
| DELETE | `/group-therapy/:id` | Soft-delete |
| POST | `/group-therapy/:id/members` | Add member to group |
| DELETE | `/group-therapy/:id/members/:memberId` | Remove member |
| POST | `/group-therapy/:id/sessions` | Create group session |
| GET | `/group-therapy/:id/sessions` | List group sessions |

---

## 16. Tele-Rehabilitation

**Prefix**: `/api/v1/tele-rehab`
**Models**: `TeleSession`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/tele-rehab/` | List tele-sessions |
| POST | `/tele-rehab/` | Schedule tele-session |
| GET | `/tele-rehab/:id` | Get tele-session |
| PUT | `/tele-rehab/:id` | Update tele-session |
| DELETE | `/tele-rehab/:id` | Soft-delete |
| POST | `/tele-rehab/:id/start` | Start tele-session |
| POST | `/tele-rehab/:id/end` | End tele-session |
| POST | `/tele-rehab/:id/quality` | Record quality metrics |
| POST | `/tele-rehab/:id/satisfaction` | Record patient satisfaction |

---

## 17. AR/VR Rehabilitation

**Prefix**: `/api/v1/ar-vr`
**Models**: `ARVRSession`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/ar-vr/` | List AR/VR sessions |
| POST | `/ar-vr/` | Create AR/VR session |
| GET | `/ar-vr/:id` | Get session |
| PUT | `/ar-vr/:id` | Update session |
| DELETE | `/ar-vr/:id` | Soft-delete |
| POST | `/ar-vr/:id/start` | Start session |
| POST | `/ar-vr/:id/pause` | Pause session |
| POST | `/ar-vr/:id/resume` | Resume session |
| POST | `/ar-vr/:id/complete` | Complete session |
| POST | `/ar-vr/:id/safety` | Record safety check |
| GET | `/ar-vr/beneficiary/:beneficiaryId/progress` | AR/VR progress |

---

## 18. Behavior Management

**Prefix**: `/api/v1/behavior`
**Models**: `BehaviorRecord`, `BehaviorPlan`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/behavior/` | List behavior records |
| POST | `/behavior/` | Create behavior record |
| GET | `/behavior/:id` | Get record |
| PUT | `/behavior/:id` | Update record |
| DELETE | `/behavior/:id` | Soft-delete |
| POST | `/behavior/plans` | Create behavior plan |
| GET | `/behavior/plans` | List behavior plans |
| GET | `/behavior/plans/:id` | Get behavior plan |
| PUT | `/behavior/plans/:id` | Update plan |
| GET | `/behavior/analytics/:beneficiaryId` | Behavior analytics |

---

## 19. Clinical Research

**Prefix**: `/api/v1/research`
**Models**: `ResearchStudy`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/research/` | List studies |
| POST | `/research/` | Create study |
| GET | `/research/:id` | Get study |
| PUT | `/research/:id` | Update study |
| DELETE | `/research/:id` | Soft-delete |
| POST | `/research/:id/participants` | Add participant |
| POST | `/research/:id/consent` | Record consent |
| POST | `/research/:id/milestones` | Add milestone |
| POST | `/research/:id/publications` | Add publication |
| GET | `/research/:id/progress` | Study progress |

---

## 20. Field Training

**Prefix**: `/api/v1/field-training`
**Models**: `TrainingProgram`, `TraineeRecord`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/field-training/` | List training programs |
| POST | `/field-training/` | Create program |
| GET | `/field-training/:id` | Get program |
| PUT | `/field-training/:id` | Update program |
| DELETE | `/field-training/:id` | Soft-delete |
| POST | `/field-training/:id/enroll` | Enroll trainee |
| GET | `/field-training/:id/trainees` | List trainees |
| POST | `/field-training/trainees/:id/hours` | Log training hours |
| POST | `/field-training/trainees/:id/evaluate` | Submit evaluation |
| GET | `/field-training/trainees/:id/competencies` | Competency assessment |

---

## 21. Dashboards & Decision Support

**Prefix**: `/api/v1/dashboards`
**Models**: `DashboardConfig`, `KPIDefinition`, `KPISnapshot`, `DecisionAlert`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/dashboards/` | List dashboard configs |
| POST | `/dashboards/` | Create dashboard config |
| GET | `/dashboards/:id` | Get dashboard |
| PUT | `/dashboards/:id` | Update dashboard |
| DELETE | `/dashboards/:id` | Soft-delete |
| GET | `/dashboards/kpis` | List KPI definitions |
| POST | `/dashboards/kpis` | Create KPI definition |
| GET | `/dashboards/kpis/snapshot` | Latest KPI snapshots |
| POST | `/dashboards/kpis/snapshot` | Create KPI snapshot |
| GET | `/dashboards/alerts` | List decision alerts |
| POST | `/dashboards/alerts` | Create alert |
| POST | `/dashboards/alerts/:id/acknowledge` | Acknowledge alert |
| GET | `/dashboards/executive` | Executive summary |

### 15 Standard KPIs
| KPI | Unit | Target |
|-----|------|--------|
| beneficiary-total | count | 500 |
| active-episodes | count | 200 |
| session-completion-rate | percentage | 85% |
| assessment-compliance | percentage | 95% |
| care-plan-activation-rate | percentage | 90% |
| goal-achievement-rate | percentage | 70% |
| family-engagement-score | percentage | 75% |
| avg-episode-duration | days | 180 |
| readmission-rate | percentage | 10% |
| staff-utilization | percentage | 80% |
| patient-satisfaction | score | 4.2 |
| quality-audit-score | percentage | 90% |
| documentation-completeness | percentage | 95% |
| avg-wait-time | days | 14 |
| discharge-plan-rate | percentage | 100% |

### 8 Decision Support Rules
1. **low-session-completion** — Alert when completion < 70%
2. **high-readmission** — Alert when readmission > 15%
3. **assessment-overdue** — Alert when compliance < 80%
4. **goal-stagnation** — Alert when achievement < 50%
5. **low-family-engagement** — Alert when engagement < 60%
6. **staff-overload** — Alert when utilization > 95%
7. **quality-decline** — Alert when audit score < 80%
8. **documentation-gap** — Alert when completeness < 85%

---

## 22. Socket.IO Real-time Events

### Connection
```javascript
const socket = io('http://localhost:3001', {
  auth: { token: 'JWT_TOKEN' }
});
```

### Client → Server Events

| Event | Payload | Description |
|-------|---------|-------------|
| `ddd:subscribe` | `{ domain: 'core', filters: {} }` | Subscribe to domain updates |
| `ddd:unsubscribe` | `{ domain: 'core' }` | Unsubscribe from domain |
| `ddd:action` | `{ domain: 'core', action: 'refresh', params: {} }` | Request domain action |

### Server → Client Events

| Event | Payload | Description |
|-------|---------|-------------|
| `ddd:update` | `{ domain, type, data, timestamp }` | Domain data changed |
| `ddd:alert` | `{ level, title, titleAr, message, domain }` | Decision alert triggered |
| `ddd:kpi` | `{ kpiId, name, value, target, unit }` | KPI value updated |
| `beneficiary:updated` | `{ beneficiaryId, changes }` | Beneficiary record changed |
| `episode:phase-changed` | `{ episodeId, fromPhase, toPhase }` | Episode phase transition |
| `session:status-changed` | `{ sessionId, status }` | Session status changed |
| `workflow:task-updated` | `{ taskId, status, assignee }` | Workflow task updated |

### Room Structure
- `ddd:core` — Beneficiary updates
- `ddd:episodes` — Episode events
- `ddd:sessions` — Session events
- `ddd:workflow` — Task events
- `ddd:dashboards` — KPI & alert broadcasts
- `ddd:{domain-name}` — Any domain room

---

## Common Response Format

### Success
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

### Error
```json
{
  "success": false,
  "message": "Error description",
  "message_en": "Error description in English",
  "errors": [{ "field": "email", "message": "Required" }]
}
```

### HTTP Status Codes
| Code | Usage |
|------|-------|
| 200 | Success |
| 201 | Created |
| 400 | Validation error |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not found |
| 409 | Conflict (duplicate) |
| 429 | Rate limited |
| 500 | Server error |

---

## Seed Data

```bash
# Seed all 20 DDD domains (~700+ documents)
cd backend && npm run db:seed:ddd

# Remove seed data
npm run db:seed:ddd:down

# Force re-seed (drop + re-insert)
npm run db:seed:ddd:force
```

---

## Architecture Summary

```
frontend/                      backend/
├── services/ddd/index.js      ├── domains/
│   (20 API objects)           │   ├── _base/
├── hooks/useDDD.js            │   │   ├── BaseDomainModule.js
│   (30+ hooks)                │   │   ├── BaseRepository.js
├── hooks/useRealtimeDDD.js    │   │   └── BaseService.js
│   (5 real-time hooks)        │   ├── core/
├── routes/DDDRoutes.jsx       │   ├── episodes/
│   (20 lazy routes)           │   ├── timeline/
├── components/ddd/            │   ├── assessments/
│   ├── DDDPlatformLayout.jsx  │   ├── care-plans/
│   └── DDDSidebar.jsx         │   ├── sessions/
└── pages/                     │   ├── goals/
    ├── executive-dashboard/   │   ├── workflow/
    ├── beneficiary-360/       │   ├── programs/
    ├── beneficiary-list/      │   ├── ai-recommendations/
    ├── episodes/              │   ├── quality/
    ├── sessions/              │   ├── family/
    ├── workflow/              │   ├── reports/
    ├── quality/               │   ├── group-therapy/
    ├── reports/               │   ├── tele-rehab/
    └── domains/               │   ├── ar-vr/
        (12 factory pages)     │   ├── behavior/
                               │   ├── research/
                               │   ├── field-training/
                               │   ├── dashboards/
                               │   └── index.js (registry)
                               ├── routes/platform.routes.js
                               ├── seeds/ddd-domains-seed.js
                               ├── sockets/handlers/dddHandler.js
                               └── __tests__/domains/ddd-smoke.test.js
```
