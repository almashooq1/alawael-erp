# Phase 17 — Care Platform API Playbook

Curl examples across every care surface. All endpoints require auth (`Authorization: Bearer <token>`). Role requirements noted inline.

Base URL: `$API` (e.g., `https://api.alawael.com`). Mount is **dual** — every endpoint is available at both `/api/care/...` and `/api/v1/care/...`.

---

## C1 — CRM Lead Funnel

```bash
# 1. Create an inquiry (walk-in / phone call intake)
# Roles: admin, reception, social_worker
curl -X POST "$API/api/care/crm/inquiries" \
  -H 'Content-Type: application/json' \
  -d '{
    "channel": "phone",
    "referralSource": "hrsd",
    "fullName": "أحمد الناصر",
    "phone": "+9665...",
    "presentingNeed": "disability_support",
    "branchId": "<ObjectId>"
  }'

# 2. Acknowledge the inquiry (stops crm.inquiry.acknowledge SLA)
curl -X POST "$API/api/care/crm/inquiries/:id/acknowledge" \
  -H 'Content-Type: application/json' \
  -d '{ "notes": "contacted family, appointment set" }'

# 3. Promote inquiry → lead (dual SLAs start)
curl -X POST "$API/api/care/crm/inquiries/:id/promote" \
  -H 'Content-Type: application/json' \
  -d '{ "assignedWorkerId": "<userId>" }'

# 4. Log activity against a lead
curl -X POST "$API/api/care/crm/leads/:id/activities" \
  -H 'Content-Type: application/json' \
  -d '{
    "kind": "home_visit",
    "summary": "Initial assessment",
    "occurredAt": "2026-04-25T14:00:00Z"
  }'

# 5. Convert lead to active enrollment (stops conversion SLA)
curl -X POST "$API/api/care/crm/leads/:id/convert" \
  -H 'Content-Type: application/json' \
  -d '{ "beneficiaryId": "<ObjectId>" }'

# 6. Funnel analytics
curl "$API/api/care/crm/funnel-stats?branchId=<id>&windowDays=30"
```

---

## C2 — Social Services

```bash
# 1. Open a social case
curl -X POST "$API/api/care/social/cases" \
  -H 'Content-Type: application/json' \
  -d '{
    "beneficiaryId": "<ObjectId>",
    "caseType": "family_support",
    "presentingProblems": ["financial_hardship", "caregiver_burnout"],
    "assignedWorkerId": "<userId>"
  }'
# → status=intake, activates social.case.intake_to_assessment SLA (5 business days)

# 2. Complete assessment (transitions to intervention_planned)
curl -X POST "$API/api/care/social/cases/:id/assessment" \
  -H 'Content-Type: application/json' \
  -d '{
    "assessmentSummary": "Family with 3 dependents, primary caregiver with chronic illness",
    "domainFindings": [{
      "domain": "financial", "severity": "high",
      "notes": "lost primary income in 2026-03"
    }]
  }'

# 3. Flag as high risk (activates social.case.high_risk_review — 24/7, 2h response)
curl -X POST "$API/api/care/social/cases/:id/flag-high-risk" \
  -H 'Content-Type: application/json' \
  -d '{
    "riskLevel": "high",
    "reason": "caregiver hospitalization — no backup support"
  }'

# 4. Close case with outcome
curl -X POST "$API/api/care/social/cases/:id/close" \
  -H 'Content-Type: application/json' \
  -d '{
    "closureOutcome": "needs_met",
    "resolution": "Family stable; welfare approved; community linkage active"
  }'
```

---

## C3 — Home Visits

```bash
# 1. Schedule a visit
curl -X POST "$API/api/care/home-visits" \
  -H 'Content-Type: application/json' \
  -d '{
    "caseId": "<caseId>",
    "beneficiaryId": "<ObjectId>",
    "visitType": "routine_check",
    "scheduledFor": "2026-04-28T10:00:00Z",
    "assignedWorkerId": "<userId>",
    "address": "Riyadh — District X — Street 12 — House 45"
  }'

# 2. Mark en_route (captures GPS)
curl -X POST "$API/api/care/home-visits/:id/en-route" \
  -H 'Content-Type: application/json' \
  -d '{ "coordinates": { "lat": 24.7136, "lng": 46.6753 } }'

# 3. Mark arrived
curl -X POST "$API/api/care/home-visits/:id/arrived" \
  -H 'Content-Type: application/json' \
  -d '{ "coordinates": { "lat": 24.7145, "lng": 46.6760 } }'

# 4. Record observation with critical concern
curl -X POST "$API/api/care/home-visits/:id/observations" \
  -H 'Content-Type: application/json' \
  -d '{
    "domain": "safety",
    "concernLevel": "critical",
    "notes": "Primary caregiver absent; minor unsupervised"
  }'

# 5. Complete visit
curl -X POST "$API/api/care/home-visits/:id/complete" \
  -H 'Content-Type: application/json' \
  -d '{
    "visitSummary": "Family crisis. Escalation initiated.",
    "overallConcernLevel": "critical"
  }'
# → emits ops.care.social.home_visit_critical_concern
# → careBootstrap subscriber auto-flags case high-risk
```

---

## C4 — Welfare + Community

### Welfare

```bash
# 1. Create draft welfare application
curl -X POST "$API/api/care/welfare" \
  -H 'Content-Type: application/json' \
  -d '{
    "beneficiaryId": "<ObjectId>",
    "caseId": "<caseId>",
    "applicationType": "ssa_pension",
    "targetAgency": "hrsd",
    "requestedAmount": 1500
  }'

# 2. Submit to agency
curl -X POST "$API/api/care/welfare/:id/submit" \
  -d '{ "submittedAt": "2026-04-25T09:00:00Z" }'

# 3. Record approval (partial)
curl -X POST "$API/api/care/welfare/:id/approve" \
  -d '{ "approvedAmount": 1200, "partial": true }'

# 4. File appeal on partial
curl -X POST "$API/api/care/welfare/:id/appeal" \
  -d '{ "reason": "Family has third dependent not counted" }'

# 5. Record disbursement
curl -X POST "$API/api/care/welfare/:id/disbursements" \
  -d '{ "amount": 1200, "receiptReference": "TRF-20260425-...", "notes": "Monthly" }'

# 6. Analytics
curl "$API/api/care/welfare/analytics?branchId=<id>&windowDays=90"
```

### Community

```bash
# 1. Register a partner
curl -X POST "$API/api/care/community/partners" \
  -d '{
    "name": "مدرسة النور الإبتدائية",
    "category": "school",
    "branchesServed": ["<branchId>"]
  }'

# 2. Add partner contact
curl -X POST "$API/api/care/community/partners/:id/contacts" \
  -d '{ "name": "أستاذ محمد", "role": "principal", "phone": "+9665..." }'

# 3. Create linkage beneficiary ↔ partner
curl -X POST "$API/api/care/community/linkages" \
  -d '{
    "beneficiaryId": "<ObjectId>",
    "partnerId": "<partnerId>",
    "caseId": "<caseId>",
    "linkageType": "ongoing",
    "primaryPurpose": "education",
    "startDate": "2026-04-25"
  }'

# 4. Record contact with partner
curl -X POST "$API/api/care/community/linkages/:id/contact" \
  -d '{ "notes": "Attended parent-teacher meeting" }'
```

---

## C5 — Psych

### Risk flags

```bash
# 1. Raise a critical risk flag (activates psych.risk_flag.response 1h SLA)
curl -X POST "$API/api/care/psych/flags" \
  -d '{
    "beneficiaryId": "<ObjectId>",
    "caseId": "<caseId>",
    "flagType": "suicidal_ideation",
    "severity": "critical",
    "source": "clinical_interview",
    "description": "Patient disclosed passive ideation with plan"
  }'

# 2. Establish safety plan (moves to monitoring, pauses SLA)
curl -X POST "$API/api/care/psych/flags/:id/safety-plan" \
  -d '{
    "safetyPlan": "Means restriction + daily check-in + crisis hotline on fridge",
    "reviewDue": "2026-04-30"
  }'

# 3. Escalate to MDT
curl -X POST "$API/api/care/psych/flags/:id/escalate" \
  -d '{ "escalationReason": "Passive → active ideation over 48h" }'

# 4. Resolve
curl -X POST "$API/api/care/psych/flags/:id/resolve" \
  -d '{
    "resolutionNotes": "Symptoms remitted over 4 weeks",
    "resolutionOutcome": "stable"
  }'
```

### Scales

```bash
# Administer PHQ-9
curl -X POST "$API/api/care/psych/scales" \
  -d '{
    "beneficiaryId": "<ObjectId>",
    "scaleCode": "phq9",
    "responses": [2, 2, 2, 2, 1, 1, 1, 0, 0]
  }'
# Response includes auto-scoring:
# { "totalScore": 11, "band": "moderate", "recommendedAction": "psychotherapy",
#   "autoFlagTriggered": false }

# If item 9 (suicidal ideation) scored non-zero → auto-critical flag fires
# If total ≥ 20 → auto severe_depression flag fires

# GAD-7
curl -X POST "$API/api/care/psych/scales" \
  -d '{ "beneficiaryId": "<ObjectId>", "scaleCode": "gad7",
        "responses": [1, 2, 1, 0, 2, 1, 2] }'

# Beneficiary scale trend
curl "$API/api/care/psych/beneficiary/<id>/scale-trend/phq9?limit=10"
```

### MDT meetings

```bash
# 1. Schedule MDT
curl -X POST "$API/api/care/psych/mdt" \
  -d '{
    "beneficiaryId": "<ObjectId>",
    "purpose": "risk_flag_review",
    "scheduledFor": "2026-04-30T13:00:00Z",
    "agenda": ["Review current safety plan", "Medication adjustment", "Family meeting"]
  }'

# 2. Add attendees
curl -X POST "$API/api/care/psych/mdt/:id/attendees" \
  -d '{ "nameSnapshot": "د. أحمد العلي", "role": "psychiatrist" }'

# 3. Complete with decisions
curl -X POST "$API/api/care/psych/mdt/:id/complete" \
  -d '{
    "summary": "Safety plan updated. Medication increased. Weekly follow-up.",
    "decisions": [{
      "topic": "Medication",
      "decision": "Increase sertraline to 100mg daily",
      "ownerUserId": "<userId>"
    }],
    "actionItems": [{
      "title": "Family psychoeducation session",
      "assignedToUserId": "<userId>",
      "dueDate": "2026-05-05"
    }]
  }'
```

---

## C6 — Life Independence

```bash
# 1. Create transition readiness assessment
curl -X POST "$API/api/care/independence/transition-assessments" \
  -d '{
    "beneficiaryId": "<ObjectId>",
    "targetTransition": "independent_living",
    "plannedDate": "2026-09-01"
  }'

# 2. Score domains
curl -X POST "$API/api/care/independence/transition-assessments/:id/score" \
  -d '{ "domain": "self_care", "score": 2, "notes": "Consistent daily routine" }'

# (Repeat for 10 domains...)

# 3. Complete (derives overallReadiness from domain avg or accepts explicit)
curl -X POST "$API/api/care/independence/transition-assessments/:id/complete" \
  -d '{ "summary": "Ready with minimal support", "recommendations": "..." }'

# 4. Administer IADL (Lawton 8 domains — can pass number[] OR object form)
curl -X POST "$API/api/care/independence/iadl" \
  -d '{
    "beneficiaryId": "<ObjectId>",
    "domainScores": [3, 2, 2, 2, 3, 2, 3, 2]
  }'
# Auto-scores: { totalScore: 19, band: "mostly_independent", recommendedAction: "coaching" }

# 5. Log community participation
curl -X POST "$API/api/care/independence/participation" \
  -d '{
    "beneficiaryId": "<ObjectId>",
    "activityType": "volunteering",
    "occurredAt": "2026-04-25T09:00:00Z",
    "partnerId": "<partnerId>",
    "durationMinutes": 120,
    "supportLevel": "minimal",
    "outcome": "very_positive",
    "beneficiarySatisfaction": 5
  }'

# 6. Participation analytics (90-day rollup)
curl "$API/api/care/independence/beneficiary/<id>/participation-analytics?windowDays=90"
```

---

## C7 — Beneficiary-360 ⭐

```bash
# Full 360 blob (all sections)
curl "$API/api/care/360/<beneficiaryId>"

# Filtered sections
curl "$API/api/care/360/<beneficiaryId>?include=psych,social,welfare"

# Lightweight summary card
curl "$API/api/care/360/<beneficiaryId>/summary"

# Unified cross-subject timeline, latest 50 events
curl "$API/api/care/360/<beneficiaryId>/timeline?limit=50"

# Only events since a date
curl "$API/api/care/360/<beneficiaryId>/timeline?since=2026-03-01T00:00:00Z"

# Cross-domain health score
curl "$API/api/care/360/<beneficiaryId>/health-score"
# → {
#     overall: 68, band: "stable",
#     subscores: { mentalWellbeing: 72, functionalIndependence: 65, socialIntegration: 67 },
#     contributors: {...}
#   }

# Prioritized action-required queue
curl "$API/api/care/360/<beneficiaryId>/attention"
# → { items: [{ kind: "critical_risk_flag", priority: "critical", ... }, ...] }
```

---

## C8 — Retention / Churn

```bash
# Dry-run: compute current risk without persisting
curl -X POST "$API/api/care/retention/compute/<beneficiaryId>"

# Persist a new assessment + auto-trigger interventions if high/imminent
curl -X POST "$API/api/care/retention/assess/<beneficiaryId>"

# Get latest assessment
curl "$API/api/care/retention/<beneficiaryId>/latest"

# Trend series
curl "$API/api/care/retention/<beneficiaryId>/trend?limit=20"

# Retention manager dashboard — all unacknowledged high+imminent
curl "$API/api/care/retention/high-risk?acknowledged=false"

# Filter by branch + band
curl "$API/api/care/retention/high-risk?branchId=<id>&band=imminent"

# Acknowledge an assessment
curl -X POST "$API/api/care/retention/<assessmentId>/acknowledge" \
  -d '{ "notes": "Reviewed with MDT; plan in place" }'

# Batch sweep (for cron)
curl -X POST "$API/api/care/retention/sweep" \
  -d '{ "branchId": "<id>", "limit": 500 }'

# Or explicit ID list
curl -X POST "$API/api/care/retention/sweep" \
  -d '{ "beneficiaryIds": ["<id1>", "<id2>", "<id3>"] }'
```

### Interpretive bands

| Band       | Score  | Action                                                            |
| ---------- | ------ | ----------------------------------------------------------------- |
| `low`      | 0–24   | Track only                                                        |
| `moderate` | 25–49  | Notify retention manager                                          |
| `high`     | 50–74  | Notify + request home visit                                       |
| `imminent` | 75–100 | Auto-raise neglect_risk flag + schedule MDT + flag case high-risk |

---

## Full orchestration chain — an end-to-end scenario

A single beneficiary, ten calls, six services, one pager.

```bash
# 1. Phone inquiry comes in
INQ=$(curl -X POST $API/api/care/crm/inquiries \
  -d '{ "channel": "phone", "fullName": "سارة", "presentingNeed": "disability_support" }' \
  | jq -r .data._id)

# 2. Promote to lead → convert → beneficiary record created externally
LEAD=$(curl -X POST $API/api/care/crm/inquiries/$INQ/promote | jq -r .data._id)
BEN=<benId_from_registration>

# 3. Open social case
CASE=$(curl -X POST $API/api/care/social/cases -d "{\
  \"beneficiaryId\": \"$BEN\", \"caseType\": \"family_support\" }" | jq -r .data._id)

# 4. Schedule + complete home visit with critical concern
VISIT=$(curl -X POST $API/api/care/home-visits -d "{\
  \"caseId\": \"$CASE\", \"beneficiaryId\": \"$BEN\",\
  \"visitType\": \"crisis_response\", \"scheduledFor\": \"2026-04-26T10:00:00Z\" }" | jq -r .data._id)
curl -X POST $API/api/care/home-visits/$VISIT/complete \
  -d '{ "visitSummary": "Caregiver hospitalized", "overallConcernLevel": "critical" }'
# → auto-flags case as high_risk (via bootstrap subscriber)

# 5. Administer PHQ-9; item 9 scored 2 → auto critical suicidal_ideation flag raised
curl -X POST $API/api/care/psych/scales -d "{\
  \"beneficiaryId\": \"$BEN\", \"scaleCode\": \"phq9\",\
  \"responses\": [3,3,2,2,2,2,1,0,2] }"

# 6. Check 360 view
curl $API/api/care/360/$BEN
# → riskFlags: [{ auto-raised }], activeSocialCase: { riskLevel: "high" }, ...

# 7. Assess retention
curl -X POST $API/api/care/retention/assess/$BEN
# → band: "imminent" (factors: stale_critical_flag? no, but no_recent_home_visit
#                      + isolation_no_linkages + inverted healthScore)
# → auto-schedules MDT +3d
# → auto-raises secondary neglect_risk flag

# 8. Retention manager reviews + acknowledges
curl -X POST $API/api/care/retention/<assessmentId>/acknowledge \
  -d '{ "notes": "Plan: emergency welfare app + MDT decisions pending" }'
```

Six services cooperated on one beneficiary. Zero manual handoffs between subjects. Every event captured in statusHistory + audit log + notification router.
