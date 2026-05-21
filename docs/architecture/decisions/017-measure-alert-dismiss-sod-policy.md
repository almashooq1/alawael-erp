# 17. Measure-Alert Dismiss/Ack SoD Policy

Date: 2026-05-21

## Status

🟡 **Proposed — needs clinical lead + compliance sign-off before implementation.**

This ADR is intentionally a proposal rather than an accepted decision.
Three approaches are presented; the choice is a stakeholder call, not an
engineering one. See "Decision" section for the recommended path forward.

## Context

The W221 measure-alert engine raises clinical signals (REGRESSION_DETECTED,
PLATEAU_DETECTED, MCID_NOT_MET) on beneficiary trajectories. W214/W242
shipped therapist ack/resolve. W250 shipped therapist dismiss (10-char
reason required). W262 surfaces the actor + reason on the per-pair detail
page so dismissals are auditable.

Current state (verified in
`backend/routes/therapist-portal.routes.js:2137-2347`):

- **Therapist** can `ack` / `resolve` / `dismiss` alerts on their own
  caseload (caseload-gated via `_ownsCaseloadItem`).
- **Admin** can act via admin-viewer mode (?employeeId=...) — picks a
  therapist's caseload to act on.
- **No supervisor** workflow exists. The dismiss-route inline comment
  acknowledges this gap:
  > "If a stricter SoD ever lands (e.g. supervisor-only dismiss), it goes
  > behind a separate role gate, not in this route."
- **No creator-vs-actor SoD** because the alert "creator" is the rule
  engine, not a user. Standard SoD primitives don't apply.

The risk pattern this ADR addresses: a therapist dismisses a
REGRESSION_DETECTED alert on a beneficiary they're responsible for, with
a brief reason, and nobody else ever sees it. The trajectory continues to
worsen; the dismissal goes unreviewed until family escalation or external
audit. The data exists (W262 attribution) but no workflow forces review.

## Questions for stakeholders

Before picking an approach, the following need answers from the clinical
director + compliance officer:

1. **Is dismissal abuse an observed problem, a theoretical risk, or a
   regulatory requirement?** This determines whether we ship a
   lightweight audit lens or a hard SoD gate.
2. **Which alert types are high-stakes enough to require co-sign?**
   REGRESSION on a goal-bearing measure feels different from PLATEAU on
   a screening measure.
3. **What's the supervisor role's existing SLA?** A "supervisor must
   review within N days" requirement only works if supervisors are
   actually engaged with the alert queue today.
4. **Should the supervisor override be one-shot (re-open) or persistent
   (lock dismissal)?**

If we don't have answers to (1) and (3), we should NOT ship B or C below
— we'd be building speculative governance against an unknown risk
profile, which adds friction without evidence it reduces harm.

## Three approaches under consideration

### Approach A — Observability-first (low cost, fastest, recommended)

**What ships:**

- No new SoD rules.
- New supervisor dashboard `/admin/ops/alert-dismissals` listing all
  dismissals in last 30 days, filterable by branch / alert type /
  therapist. Each row links to the per-pair detail page (W262b already
  shows dismissalReason + dismissedBy).
- New "concerning dismissal" heuristic flag: dismissals where the
  trajectory continued to decline in the N days AFTER dismissal get
  visually distinguished.
- Existing dismiss flow unchanged.

**Cost:** 1-2 days. Pure read-side work; one new page + maybe one query
extension on `MeasureAlert`.

**Pros:** Generates the data we need to answer questions 1-3 above
without committing to a workflow. Real abuse patterns (if any) become
observable. Supervisors get visibility without therapists getting new
friction.

**Cons:** Doesn't prevent anything. If the abuse pattern is severe and
known TODAY, this is too slow.

### Approach B — Tiered SoD by severity

**What ships:**

- `low` / `medium` severity → therapist dismiss as today.
- `high` / `critical` severity → therapist dismiss enters new state
  `dismissedPendingReview`. Supervisor has 7 days to confirm or
  reopen. Auto-reopens on day 8 if no action.
- New `MeasureAlert.status` value + lifecycle hooks + scheduler tick.
- Supervisor queue UI: `/admin/ops/alert-dismissal-review`.

**Cost:** ~1-2 weeks. Needs:

- Schema migration (new status enum)
- Lifecycle service extension
- New scheduler (mirrors W214 reassessment scheduler)
- Supervisor queue UI + mutation route
- Audit-log additions
- Tests across all of the above

**Pros:** Direct mitigation of the headline risk. Forces a second
clinical eye on high-severity dismissals.

**Cons:** Slows down therapist workflow on every high-severity dismissal.
If supervisor SLA isn't real today (question 3), auto-reopen will fire
constantly and become noise. We have no data showing high-severity
dismissals are abused at a rate that justifies this.

### Approach C — Goal-linkage-based SoD

**What ships:**

- On dismiss attempt, check whether any active TherapeuticGoal links to
  this measure for this beneficiary (data already available via
  `goalLinkageApi.goalsForMeasure` — exposed in W263).
- If no active goals link → therapist dismiss as today.
- If ≥1 active goal links → therapist sees "هذا التنبيه يؤثّر على هدف
  نشط" warning; dismiss routes to supervisor queue instead.

**Cost:** ~1 week. Smaller scope than B (no new status; just role
routing).

**Pros:** Couples governance to _clinical impact_ rather than alert
metadata. Aligns with the clinical mental model ("I'm dismissing an
alert that contributes to a goal I'm responsible for — supervisor should
weigh in").

**Cons:** Linkage state isn't always accurate. A goal might be linked
but stale; a goal might be unlinked but the measure still matters.
Heuristic precision is unknown.

## Decision

**Recommended: ship Approach A first.** Use the next 4-6 weeks of
production data to answer the stakeholder questions above. Then pick B,
C, or both based on what the dismissal-pattern data shows.

**Do not ship B or C yet.** Both require assumptions about clinical
behavior that we currently have zero data on. Building governance
machinery against speculative risk adds friction without evidence it
reduces harm, and is hard to roll back once therapists adapt their
workflow around it.

## Consequences

If **A is accepted**:

- Add `/admin/ops/alert-dismissals` page (new wave; ~1-2 days)
- Add small backend extension to `listAlertsByBranch` (filter status
  ∈ ['dismissed'] + date range)
- No model changes; no migration; no role-gate changes
- Existing therapist flow unchanged

If **B is accepted later** (after A surfaces a need):

- `MeasureAlert.ALERT_STATUSES` gains `dismissedPendingReview`
- Lifecycle service gains `confirmDismiss` + `reopen` + scheduled
  auto-reopen
- Pre-validate hook needs the new state covered
- All UI surfaces showing alert.status need new label
- W262 attribution needs `confirmedDismissBy` field
- Migration path: existing `dismissed` rows stay; new rule applies
  forward-only

If **C is accepted later** (after A surfaces a need):

- Dismiss route gains a `goalsForMeasure` lookup pre-check
- New role: `clinical_supervisor_dismiss_review` (or reuse existing
  supervisor role)
- New queue route + UI
- Heuristic precision becomes a maintenance concern — false positives
  (linked but stale goal) will erode therapist trust

## Not in scope

- Acknowledge / resolve workflows. Both are lower-stakes than dismiss
  (ack is a triage marker; resolve requires evidence in the trajectory).
  This ADR only addresses dismiss.
- Anomaly-flag dismiss/ack (W257e/f). Different domain (data-quality
  not clinical-signal). Has its own SoD gap; needs separate ADR.

## References

- W221 alert engine: `backend/services/measureAlertEngine.service.js`
- W250 dismiss flow: `backend/routes/therapist-portal.routes.js:2273-2347`
- W262 attribution surface: `backend/services/measureOutcomesAggregator.service.js::listMeasurePairsAt()`
- W262b UI display: `apps/web-admin/src/app/(dashboard)/admin/ops/measures-outcomes/branch/[branchId]/measure/[measureId]/beneficiary/[beneficiaryId]/page.tsx` (AlertsSection)
- Validation interview kit: `docs/blueprint/37-validation-interview-kit.md`
