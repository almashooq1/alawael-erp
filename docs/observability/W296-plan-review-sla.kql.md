# W296 — Plan-Review SLA Compliance Workbook (KQL)

> **Scope**: queries below target the ClickHouse / Log Analytics export of
> the `PlanReview`, `AiAlert`, and `PlanReviewAck` collections (sink names
> assumed: `plan_reviews_CL`, `ai_alerts_CL`, `plan_review_acks_CL`).
> Rename the sinks at the top of each query as deployed.
>
> All time windows are **Asia/Riyadh** unless stated otherwise.

---

## 1. CRITICAL reviews opened in the last 7 days, per branch

```kql
let WINDOW = 7d;
plan_reviews_CL
| where reviewType_s == "CRITICAL"
| where createdAt_t >= ago(WINDOW)
| extend branchId = tostring(branchId_s)
| summarize opened = count() by branchId, bin(createdAt_t, 1d)
| order by createdAt_t asc, branchId asc
```

---

## 2. Acknowledgement compliance % per branch (rolling 30d)

A review is **compliant** if acknowledged within 24h of `createdAt`.

```kql
let WINDOW = 30d;
let SLA_HOURS = 24;
plan_reviews_CL
| where reviewType_s == "CRITICAL"
| where createdAt_t >= ago(WINDOW)
| extend branchId = tostring(branchId_s)
| extend ackLagHours =
    iff(isnotnull(acknowledgedAt_t),
        datetime_diff('hour', acknowledgedAt_t, createdAt_t),
        toint(-1))
| extend onTime = iff(ackLagHours between (0 .. SLA_HOURS), 1, 0)
| extend acked   = iff(ackLagHours >= 0, 1, 0)
| summarize
    total = count(),
    acked = sum(acked),
    onTime = sum(onTime)
    by branchId
| extend compliancePct = round(100.0 * onTime / total, 1),
         ackRatePct    = round(100.0 * acked  / total, 1)
| order by compliancePct asc
```

---

## 3. Currently-open CRITICAL reviews aged past SLA (live operational view)

```kql
let WARN_H = 24;
let URGENT_H = 48;
plan_reviews_CL
| where reviewType_s == "CRITICAL"
| where isnull(acknowledgedAt_t)
| extend ageHours = datetime_diff('hour', now(), createdAt_t)
| extend slaState = case(
    ageHours >= URGENT_H, "URGENT",
    ageHours >= WARN_H,   "WARNING",
    "WITHIN_SLA")
| project planReviewId = _id_s,
          branchId = tostring(branchId_s),
          beneficiaryId = tostring(beneficiary_s),
          openedAt = createdAt_t,
          ageHours,
          slaState,
          slaEscalationLevel_d
| order by ageHours desc
```

---

## 4. SLA-breach alert volume per branch per day

Joins the alerts table (`plan_review_sla_breach` events from W292).

```kql
let WINDOW = 14d;
ai_alerts_CL
| where alert_type_s == "plan_review_sla_breach"
| where created_at_t >= ago(WINDOW)
| extend
    code = tostring(parse_json(data_s).code),
    branchId = tostring(parse_json(data_s).branchId),
    planReviewId = tostring(parse_json(data_s).planReviewId)
| summarize
    warn24h = countif(code == "PLAN_REVIEW_ACK_OVERDUE_24H"),
    urgent48h = countif(code == "PLAN_REVIEW_ACK_OVERDUE_48H")
    by branchId, bin(created_at_t, 1d)
| order by created_at_t asc, branchId asc
```

---

## 5. Risk-alert → triggered-review back-link coverage (W294)

Counts how many `risk_tier_*` alerts actually populated
`data.linkedPlanReviewId` — should be ~100% for `tier='critical'`,
lower for warning/medium tiers (no auto-trigger).

```kql
let WINDOW = 7d;
ai_alerts_CL
| where alert_type_s startswith "risk_tier_"
| where created_at_t >= ago(WINDOW)
| extend
    tier = tostring(parse_json(data_s).tier),
    linked = iff(isnotempty(tostring(parse_json(data_s).linkedPlanReviewId)), 1, 0)
| summarize total = count(), linked = sum(linked) by tier
| extend coveragePct = round(100.0 * linked / total, 1)
| order by tier asc
```

---

## 6. Acknowledgement latency distribution (p50/p90/p95)

```kql
let WINDOW = 30d;
plan_reviews_CL
| where reviewType_s == "CRITICAL"
| where createdAt_t >= ago(WINDOW)
| where isnotnull(acknowledgedAt_t)
| extend ackLagHours = datetime_diff('hour', acknowledgedAt_t, createdAt_t)
| summarize
    p50 = percentile(ackLagHours, 50),
    p90 = percentile(ackLagHours, 90),
    p95 = percentile(ackLagHours, 95),
    max = max(ackLagHours),
    n = count()
    by tostring(branchId_s)
| order by p95 desc
```

---

## 7. Tamper-evidence audit summary (W295)

Per-branch count of chain events recorded vs. CRITICAL reviews opened.
A healthy branch has `chainCoverage` ≈ 1.0 (every opened review has at
least a TRIGGERED event in the chain).

```kql
let WINDOW = 30d;
let reviews = plan_reviews_CL
| where reviewType_s == "CRITICAL"
| where createdAt_t >= ago(WINDOW)
| project planReviewId = _id_s, branchId = tostring(branchId_s);
let chains = plan_review_acks_CL
| where occurredAt_t >= ago(WINDOW)
| summarize chainLen = count(), triggered = countif(action_s == "TRIGGERED")
    by planReviewId = tostring(planReviewId_s);
reviews
| join kind=leftouter chains on planReviewId
| summarize
    reviews = count(),
    chainedReviews = countif(isnotnull(chainLen)),
    avgChainLen = avg(coalesce(chainLen, 0))
    by branchId
| extend chainCoverage = round(1.0 * chainedReviews / reviews, 3)
| order by chainCoverage asc
```

---

## Workbook variables (suggested)

| Name           | Type     | Default | Notes                                   |
| -------------- | -------- | ------- | --------------------------------------- |
| `BranchId`     | dropdown | (all)   | sourced from `plan_reviews_CL/branchId` |
| `WindowDays`   | int      | 30      | re-bound in each query via `let WINDOW` |
| `WarningHours` | int      | 24      | matches `PLAN_REVIEW_SLA_CRON` defaults |
| `UrgentHours`  | int      | 48      |                                         |

## Alerts (recommended)

1. **Compliance < 80% rolling 7d, per branch** → notify branch manager.
2. **Any review aged > 48h still unacknowledged** → page on-call clinician.
3. **Chain coverage drops < 1.0** → quality team review (possible data loss
   or audit-service mis-wiring).
