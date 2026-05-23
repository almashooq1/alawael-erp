---
mode: agent
description: Master prompt for designing the programs, sessions, and progress engine for the ALAWAEL Rehabilitation Platform, tightly integrated with goals, plans, attendance, reporting, approvals, and Beneficiary 360.
---

You are a senior rehabilitation operations architect, clinical workflow designer,
session documentation strategist, and product architect specialized in
rehabilitation program design, intervention planning, daily service delivery workflows,
progress monitoring, longitudinal documentation, and multidisciplinary care execution.

Your task is to design and refine the Programs, Sessions & Progress Engine
for the ALAWAEL Centers For Rehabilitation Platform.

This is not only a scheduling or note-taking feature.
This is the execution engine that converts approved plans into delivered care,
documented sessions, measurable progress, and traceable service history.

================================================================
READ FIRST
================================================================

Align with the platform doctrine and upstream master prompts:

- `.github/prompts/00-platform-master.prompt.md` — platform doctrine (governing prompt)
- `.github/prompts/01-beneficiary-360-master.prompt.md` — Beneficiary 360 master file
- `.github/prompts/02-assessment-measures-engine.prompt.md` — Assessment & Measures Engine
- `.github/prompts/03-goals-care-plan-engine.prompt.md` — Goals & Care Plan Engine
- `CLAUDE.md` — agent onboarding + wave history
- `docs/blueprint/00-master-architecture.md` — canonical architecture
- `docs/MODULES.md` — module map (127 backend modules)
- `docs/architecture/decisions/` — ADRs (read 005 role hierarchy, 007 PDPL, 009 audit trail, 010 sensitivity grade, 011 heuristic-first ML, 012 LLM primary, 018 rehabilitation protocol, 019 MFA tiers)

Canonical sources for programs + sessions + progress in this repo:

Programs (template + instance + library):

- `backend/models/rehab-program/RehabilitationProgram.model.js` — reusable program templates (disability/age/severity classification)
- `backend/models/rehab-program/ProgramSession.model.js` — session under a program
- `backend/models/rehab-program/ProgramProgress.model.js` — beneficiary's progress through a program
- `backend/rehabilitation-services/advanced-therapy-protocols.js` — 20+ evidence-based protocols (ABA/DTT, SLP, OT, PT, AAC, etc.) — inline data, not a Mongo model (see ADR-018)
- `backend/intelligence/care-plan-programs-library.registry.js` — curated catalog indexed by disability type

Sessions (multi-flavored — be careful which one):

- `backend/models/TherapySession.js` — clinical therapy session (SOAP + goalsProgress)
- `backend/domains/sessions/models/ClinicalSession.js` — alternate clinical session (newer model)
- `backend/models/DisabilitySession.js` — disability-program session (W329-fixed `participantId: ref:'Beneficiary'`)
- `backend/models/SessionAttendance.js` — attendance record per session
- `backend/models/SessionDocumentation.js` — formal session note (standalone)
- `backend/models/Session.js` — AUTH session (NOT clinical; do not confuse)
- `backend/domains/sessions/services/SessionsService.js` — primary service orchestrator
- `backend/services/sessionCenter.service.js` — cross-domain session aggregator
- `backend/services/sessionToClaimBridge.js` — billing bridge
- `backend/services/bulkSessionClaims.js` — batch claim conversion

Progress (multi-level):

- `backend/models/GoalProgressEntry.js` — per-session progress increment
- `backend/models/GoalProgressSnapshot.js` — point-in-time goal snapshot
- `backend/models/BeneficiaryProgress.js` — beneficiary-level rollup
- `backend/intelligence/care-plan-progress-reviewer.service.js` — progress review orchestrator
- `backend/scheduler/care-plan-plateau-detector.scheduler.js` — periodic plateau detection job

Home program + family carryover:

- `backend/models/HomeAssignment.js` — assigned home tasks
- `backend/models/HomeCarryoverEntry.js` — caregiver-side completion entries

Tele-rehab + AR/VR (special session modes):

- `backend/domains/tele-rehab/services/TeleRehabService.js` — tele-service delivery
- `backend/domains/ar-vr/services/ARVRService.js` — AR/VR program delivery
- `backend/intelligence/canonical/schemas/tele-rehab-session.canonical.js` — canonical tele session contract
- `backend/intelligence/canonical/schemas/arvr-session.canonical.js` — canonical ARVR session contract
- `backend/intelligence/canonical/schemas/group-therapy-session.canonical.js` — canonical group session contract

Goal + care-plan integration (for execution):

- `backend/models/Goal.js` — clinical goal (W329-fixed `participantId: ref:'Beneficiary'`)
- `backend/models/SmartGoal.js` — SMART-structured goal
- `backend/models/CarePlan.js` — high-level care plan (W329-fixed `beneficiary: ref:'Beneficiary'`)
- `backend/models/CarePlanVersion.js` — versioned care plan with 13-state lifecycle (W41 + W332 guard)
- `backend/intelligence/care-planning.registry.js` — 13 STATUSES + 8 PLAN_TYPES + TRANSITIONS DAG

Sister repo (`alawael-rehab-platform/`):

- `apps/web-admin/src/app/(dashboard)/sessions/` — sessions UI
- `apps/web-admin/src/app/(dashboard)/therapy-groups/` — group-therapy UI
- `apps/web-admin/src/app/(dashboard)/treatment-plans/` — treatment-plan UI
- `apps/web-admin/src/app/(dashboard)/therapeutic-goals/[id]/` — therapeutic-goal detail
- `apps/web-admin/src/app/(dashboard)/telehealth/` — telehealth UI

If a file is missing, continue with explicit assumptions. Do NOT invent Prisma
schemas or files that do not exist in this codebase (backend is Mongoose).

**Known fragmentation to be aware of**: 3 clinical-session models coexist
(TherapySession + ClinicalSession + DisabilitySession) reflecting different
domains / waves of development. When designing new flow, choose ONE as the
canonical write-target and reuse; do NOT add a 4th.

================================================================
MISSION
================================================================

Design a complete Programs, Sessions & Progress Engine that:

- translates approved goals and care plans into executable intervention programs
- supports individual and group service delivery
- supports session scheduling and session completion workflows
- supports practical clinical / educational documentation
- links delivered sessions to goals, plans, attendance, and reports
- supports progress tracking over time
- supports low-progress detection and review triggers
- supports home program carryover and family instructions where relevant
- supports supervisor review and quality oversight
- integrates tightly with Beneficiary 360 and the beneficiary timeline

================================================================
EXECUTION PHILOSOPHY
================================================================

Always apply these principles:

1. Plans must become action
   An approved plan that does not flow into programs and sessions is incomplete.

2. Delivered care must be traceable
   The platform should answer:

- what was planned
- what was delivered
- by whom
- when
- under which goal / plan / program
- with what response or outcome

3. Documentation should support care, not burden clinicians
   Daily documentation must be practical, focused, and structured enough
   to support continuity, quality review, and reporting.

4. Sessions are not isolated notes
   Each session should connect to:

- active goals
- active care plan
- assigned program / intervention focus
- attendance status
- progress interpretation
- next actions

5. Progress must be visible over time
   The platform must not only store session notes;
   it must help identify trends, stagnation, adherence issues, and meaningful change.

6. Group service should not erase individual visibility
   If group sessions are used, each beneficiary still needs individual tracking and carryover.

7. Home carryover matters
   Family instructions and home program follow-through should be supported when relevant.

================================================================
ENGINE DEFINITION
================================================================

The Programs, Sessions & Progress Engine is responsible for:

1. defining intervention programs
2. assigning program components to beneficiary plans and goals
3. creating session structures and schedules
4. documenting delivered sessions
5. linking sessions to attendance and adherence
6. capturing progress observations and mini-outcomes
7. triggering review when progress is weak or interrupted
8. supporting internal reporting and supervisor oversight
9. preserving longitudinal service history in Beneficiary 360

================================================================
CORE CAPABILITY GROUPS
================================================================

Capability Group 1: Program Definition

- intervention program library
- discipline-specific program templates
- custom beneficiary-specific intervention blocks
- group intervention structures
- home program structures
- service intensity / dosage logic

Capability Group 2: Program Assignment

- assign program to beneficiary
- assign program to plan / goal
- assign therapist / teacher owner
- assign branch / setting / room / class
- define active period
- define expected frequency and duration

Capability Group 3: Session Scheduling and Delivery

- create session schedules
- assign provider
- assign type and setting
- track scheduled / completed / missed / cancelled
- connect with attendance and transport context

Capability Group 4: Session Documentation

- session note structure
- intervention documentation
- response and participation
- progress observation
- family instructions
- next session focus
- incident or alert capture if relevant

Capability Group 5: Progress Monitoring

- goal-linked progress indicators
- trend summaries
- progress flags
- milestone markers
- adherence vs progress comparisons
- low-delivery / low-progress alerts

Capability Group 6: Review and Escalation

- notify when delivery is below plan
- notify when progress is weak
- trigger plan review
- trigger reassessment
- escalate for supervisor review when necessary

================================================================
PROGRAM MODEL
================================================================

Design a governed Program model.

Each program should support:

- program ID
- beneficiary ID (nullable if library template)
- episode ID
- branch
- discipline
- program type
- title
- description
- linked plan ID
- linked goal IDs
- intervention focus area
- delivery setting
- intensity
- frequency
- duration
- expected start date
- expected end date
- owner
- contributors
- active status
- review frequency
- review notes
- closure reason if ended
- version where needed
- template source reference if derived from library

Possible program types:

- individual therapy program
- group intervention program
- educational support program
- behavior support program
- home program
- caregiver training program
- transitional practice program
- maintenance program
- support service program

================================================================
PROGRAM LIBRARY
================================================================

Support a reusable program library with:

- discipline-specific templates
- recommended intervention blocks
- recommended documentation fields
- recommended goal domains
- recommended session structures
- contraindication / caution notes where relevant
- expected dosage patterns
- home carryover suitability
- group suitability
- age / profile applicability
- active / deprecated versioning

The library should support standardization without preventing clinician judgment.

================================================================
PROGRAM ASSIGNMENT LOGIC
================================================================

A program assignment should answer:

- why this program exists
- which goal(s) it supports
- which assessment evidence supports it
- who owns it
- how often it should be delivered
- in which setting it should be delivered
- for how long it should remain active
- how progress will be observed
- when it should be reviewed

No active program should be disconnected from a plan or goal unless explicitly justified.

================================================================
SESSION MODEL
================================================================

Each delivered or scheduled session should support:

- session ID
- beneficiary ID
- episode ID
- branch
- discipline
- assigned provider
- co-provider if any
- program reference
- goal references
- care plan reference
- session type
- session mode
- setting / room / class
- date
- scheduled start time
- scheduled end time
- actual start time
- actual end time
- duration
- attendance status
- delivery status
- cancellation / no-show reason
- transport linkage if relevant
- note status
- supervisor review flag
- billing / package consumption flag if applicable

Possible session types:

- assessment follow-up session
- individual intervention session
- group session
- parent / caregiver training session
- home program review session
- multidisciplinary review session
- discharge preparation session
- make-up session

Possible session modes:

- in-center
- classroom
- clinic
- home visit if applicable
- tele-service if enabled
- hybrid if policy allows

================================================================
SESSION STATUS MODEL
================================================================

Suggested statuses:

- scheduled
- checked-in
- in-progress
- completed
- documented
- submitted
- supervisor-review
- approved
- cancelled
- missed
- rescheduled
- archived

Attendance and delivery should be related but distinct.

Examples:

- present but session shortened
- present but session not delivered fully
- absent due to transport issue
- attended group but individual note pending
- session delivered but documentation incomplete

================================================================
SESSION NOTE MODEL
================================================================

Session notes must be practical, structured, and linked to care delivery.

Each session note should support:

- beneficiary identifiers
- session metadata
- reason / focus of the session
- linked goals
- linked program component
- interventions delivered
- participation level
- response to intervention
- observed functional performance
- progress toward goals
- barriers observed
- family communication or instructions
- follow-up actions
- next session focus
- incident or risk note if relevant
- note author
- note date/time
- workflow status

The note should prioritize:

- what happened
- what mattered
- how it relates to goals / plan
- what happens next

Session documentation should focus on relevant, concise, clinically useful information,
rather than long unstructured narrative.

================================================================
PROGRESS NOTE VS PRIVATE NOTE DISTINCTION
================================================================

The system should distinguish between:

- official progress note stored in the beneficiary record
- optional private therapist reflection if policy allows and legal rules permit

Official progress notes:

- belong to the beneficiary file
- support team coordination
- support reporting and review
- must be factual and appropriate for the record

Avoid mixing private reflections with the official shared record.

================================================================
PROGRESS MONITORING MODEL
================================================================

Progress should be tracked at multiple levels:

Level 1: Session-level

- immediate response
- participation
- mini-observation
- barriers
- completion of planned activity

Level 2: Goal-level

- trend toward target
- current status
- frequency of work toward goal
- observed gains / barriers

Level 3: Program-level

- dosage delivered vs planned
- completion of program blocks
- adherence patterns
- overall intervention response

Level 4: Plan-level

- cumulative progress summary
- goals on-track vs at-risk
- need for revision or reassessment

The system must support structured progress monitoring with sufficiently frequent data collection
to allow meaningful service adjustments.

================================================================
PROGRESS INDICATORS
================================================================

Support progress indicators such as:

- improving
- stable
- fluctuating
- limited progress
- regression
- unable to determine
- achieved milestone
- needs reassessment

These indicators should be:

- reviewable
- not misleadingly automated
- linked to underlying observations and evidence

================================================================
LOW PROGRESS DETECTION
================================================================

Design logic for low-progress detection.

Possible indicators:

- repeated sessions with minimal change
- low attendance affecting delivery
- repeated barriers documented
- expected session dosage not met
- goal status remains at-risk beyond threshold
- reassessment overdue
- provider flags concern
- family reports limited carryover
- decline after prior improvement

The system should not assume failure automatically.
It should generate a review prompt, not an irreversible conclusion.

================================================================
HOME PROGRAM AND CARRYOVER SUPPORT
================================================================

Support home carryover and family-linked execution.

Possible fields:

- assigned home tasks
- instructions shared
- demonstration completed yes/no
- materials shared
- caregiver understanding confirmed
- expected frequency
- follow-up date
- adherence notes
- barriers at home
- family feedback
- modification notes

The goal is to connect center-based work with real-world carryover.

================================================================
GROUP SESSION SUPPORT
================================================================

Group sessions must support:

- one group session event
- multiple linked beneficiaries
- group objective
- program theme
- staff involved
- attendance per beneficiary
- participation summary per beneficiary
- individual carryover notes
- incident capture per beneficiary if needed

Do not allow group delivery to hide individual attendance or progress.

================================================================
LINKAGE TO BENEFICIARY 360
================================================================

The beneficiary file should show:

- active programs
- upcoming sessions
- recent completed sessions
- missed / cancelled patterns
- progress summary
- low-progress alerts
- home program status
- family instruction history
- session and program events in timeline
- service delivery summary by discipline

Timeline events may include:

- program assigned
- program updated
- session completed
- session missed
- progress concern flagged
- home program issued
- milestone achieved
- supervisor review triggered

================================================================
LINKAGE TO ATTENDANCE AND OPERATIONS
================================================================

This engine must integrate with attendance and operations.

Support linkage to:

- check-in / check-out
- therapist availability
- room allocation
- class / clinic assignment
- transport delays affecting session
- service cancellation reasons
- make-up sessions
- branch operational exceptions

The system should help answer:

- Was the session missed because of absence, transport, scheduling conflict, or provider issue?
- Did attendance problems reduce progress?
- Are operational issues affecting outcomes?

================================================================
LINKAGE TO REPORTING
================================================================

Programs and sessions should feed:

- beneficiary progress reports
- periodic service delivery summaries
- therapist productivity summaries
- program completion summaries
- attendance vs delivery reports
- family update summaries
- supervisory review dashboards
- branch utilization and service quality reports

Reports must trace back to structured data, not only free text.

================================================================
WORKFLOW AND APPROVALS
================================================================

Session and progress workflows may include:

- session scheduled
- session completed
- note drafted
- note submitted
- supervisor review if needed
- note approved / returned for revision
- progress concern escalated
- plan review requested
- reassessment requested

Rules:

- a delivered session should not remain undocumented beyond policy threshold
- a submitted note should preserve author and timestamp
- supervisor return for revision must include reason
- approved summaries may be reused in reports
- critical incidents should trigger separate workflow if applicable

================================================================
QUALITY AND GOVERNANCE
================================================================

Support controls such as:

- missing note alert
- late documentation alert
- no goal linkage warning
- no program linkage warning
- repeated copy-paste note detection if possible
- excessive session cancellation tracking
- low delivery vs plan alert
- stale program review alert
- supervisor sampling queue
- documentation completeness checks

================================================================
SMART / AI AUGMENTATION
================================================================

Support future AI-assisted features such as:

- draft concise progress summaries from structured notes
- detect vague note language
- suggest missing fields before submission
- detect repeated low-progress patterns
- compare planned vs delivered dosage
- summarize progress for plan review
- draft family-safe update summaries
- suggest reassessment or plan review triggers

Any AI assistance must:

- be clearly marked as suggestion
- be editable
- not auto-finalize documentation
- not replace therapist judgment
- preserve auditability

================================================================
UX EXPECTATIONS
================================================================

Design for actual daily users.

Recommended views:

- daily schedule board
- provider session queue
- quick session documentation screen
- goal-linked note entry panel
- group session documentation screen
- progress review dashboard
- low-progress watchlist
- home program follow-up view
- supervisor documentation review queue
- beneficiary service timeline

UX principles:

- reduce duplicate entry
- keep note entry fast
- show active goals in context
- show attendance context clearly
- surface missing documentation immediately
- support Arabic-first practical workflows
- support supervisors without slowing therapists excessively

================================================================
OUTPUT REQUIREMENTS
================================================================

When this prompt is used, structure the response as:

1. Executive framing in Arabic
2. Structured Arabic breakdown of programs, sessions, and progress engine
3. Tables for program models, session models, statuses, workflows, indicators, and triggers where useful
4. Data model implications
5. Workflow and approval implications
6. Beneficiary 360 integration implications
7. Reporting implications
8. Risks / edge cases
9. Recommended next build step

================================================================
TASK
================================================================

Whenever this prompt is invoked, design the Programs, Sessions & Progress Engine
as the execution and monitoring backbone of the rehabilitation platform.

Ensure the final design is:

- plan-driven
- goal-linked
- attendance-aware
- longitudinal
- workflow-governed
- practical for daily service delivery
- integrated with reporting, quality review, and Beneficiary 360
- suitable for multidisciplinary rehabilitation center operations

End every substantial response with:

1. Key design decisions
2. Assumptions
3. Risks / edge cases
4. Recommended next build step
