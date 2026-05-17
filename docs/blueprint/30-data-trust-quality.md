# 30 — Data Trust & Quality Layer (Wave 22)

> **القاعدة الحاكمة**: لا أعرض بياناً تنفيذياً أو سريرياً بدون مؤشرات ثقة وجودة. أي KPI حساس يجب أن يكون مصحوباً بحالة جودة البيانات.
>
> **Governing rule**: No executive or clinical data is rendered without trust+quality indicators. Every sensitive KPI must carry a data quality status when needed.

---

## 1. The Eight Quality Dimensions

Every dataset/KPI is scored on these eight dimensions. Each yields a `0..1` score AND a `level` ∈ {excellent, good, fair, poor, critical}.

| #   | Dimension         | Question                                                     | Sources                                                        |
| --- | ----------------- | ------------------------------------------------------------ | -------------------------------------------------------------- |
| 1   | **Freshness**     | "When did this data last refresh?"                           | `lastRefreshAt` vs `expectedCadenceMin`                        |
| 2   | **Timeliness**    | "Did it arrive on time vs SLA?"                              | `arrivalLatencyMs` vs `slaMs`                                  |
| 3   | **Completeness**  | "What fraction of expected records/fields are present?"      | `presentCount / expectedCount`                                 |
| 4   | **Validity**      | "What fraction passes domain rules?"                         | rule-based check pass-rate                                     |
| 5   | **Consistency**   | "Do the sources agree?"                                      | cross-source delta vs tolerance                                |
| 6   | **Uniqueness**    | "Are there duplicates?"                                      | `(total − distinct) / total`                                   |
| 7   | **Source trust**  | "Where did this come from?"                                  | per-source trust score (1.0 prod, ≤0.7 manual)                 |
| 8   | **AI confidence** | "How sure is the model?" (only when the value is AI-derived) | reused from [[intelligence-layer-2026-05-17]] confidence model |

**Composite score** is a weighted average of the dimensions that apply to the dataset. Weights live in the registry — `freshness` is heavily weighted on streaming data; `validity` matters most for clinical records; `consistency` matters most for finance.

**Why 8 and not 5 or 12?**
Each of the 8 has a distinct **operator action** if it fails:

- Freshness fails → check the ingest pipeline
- Timeliness fails → escalate the SLA breach
- Completeness fails → run a backfill
- Validity fails → fix the upstream form
- Consistency fails → reconcile the two sources
- Uniqueness fails → run a dedup
- Source trust fails → re-validate the source
- AI confidence fails → re-run the model or surface uncertainty

Combining any two collapses the action; splitting further invents distinctions nobody acts on.

---

## 2. The Five Quality Levels

```
score   level       UI badge color   default behavior
─────   ─────────   ──────────────   ────────────────────────────────
≥ 0.90  excellent   green            number rendered cleanly
≥ 0.75  good        green            number rendered, subtle ✓ tick
≥ 0.60  fair        amber            number rendered + ⚠ tooltip
≥ 0.40  poor        amber/red        number rendered + bold ⚠ banner
< 0.40  critical    red              number MASKED + "Data quality issue" banner
```

The "MASKED" behavior is critical: when quality is `critical` we DO NOT show the number to an executive. Showing "37%" when 60% of the data is missing would be misleading and dangerous. We show: "Data quality issue — see details" with a click-through to the per-dimension breakdown.

This masking is **dataset-level config**, not always-on. Some datasets (e.g. operator-facing diagnostics) want to see the raw number even at critical quality. The registry per-dataset `maskOnCritical` flag controls this. Default = true for `clinical | financial | compliance`; false for `operational | telemetry`.

---

## 3. Trust Indicator Surfaces

### 3.1 Composite badge (always present)

Every KPI card gets a single trust badge in the corner — color + score:

```
┌──────────────────────────────────────┐
│  Active beneficiaries     [✓ 0.92]   │
│                                       │
│  246                                  │
│                                       │
│  ↗ +12 this week                     │
└──────────────────────────────────────┘
```

Click the badge → opens the breakdown drawer (next surface).

### 3.2 Per-dimension breakdown drawer

```
┌─────────────────────────────────────────────────────┐
│  Data Quality — Active beneficiaries                │
│  Composite: 0.92 (good)                             │
│                                                      │
│  ✓ Freshness    1.00   refreshed 2 min ago         │
│  ✓ Timeliness   1.00   on-SLA (avg 8s vs 30s)      │
│  ✓ Completeness 0.95   1248/1314 fields populated  │
│  ✓ Validity     0.98   23/1248 rule warnings       │
│  ⚠ Consistency  0.78   Branch-A vs Branch-B differ │
│                         by 4% on weekly admissions  │
│  ✓ Uniqueness   1.00   0 duplicates                │
│  ✓ Source       1.00   prod ZKTeco + EHR           │
│  N/A AI confidence    (rule-based KPI)              │
│                                                      │
│  Last quality run: 2 min ago                        │
│  Next quality run: in 13 min                        │
│                                                      │
│  [View raw audit]   [Trigger backfill]   [Close]    │
└─────────────────────────────────────────────────────┘
```

### 3.3 Inline indicators (operational view only)

On operational dashboards (where the user is technical), per-dimension badges appear inline next to the metric label — not hidden in a drawer:

```
Active beneficiaries  Fresh:✓ Comp:✓ Valid:✓ Cons:⚠
246
```

Executives don't see this — too noisy. The composite badge is enough for them.

### 3.4 Source tag (always present)

Below every KPI value, a tiny source tag shows where the number came from:

```
246
↗ +12 this week
src: zkteco_v2 · ehr_v3 (cross-source ✓)
```

If sources disagree, the tag turns amber:

```
src: zkteco_v2 ⚠ ehr_v3 (4% delta)
```

### 3.5 Confidence chip on AI outputs

Every Insight, NBA, executive digest already has a `confidence` block (Wave 18). When the consumer is the data-quality layer, we render that confidence chip uniformly:

```
[Insight card]
"Attendance dropped 12% — likely transport"
[AI confidence: medium 0.72]   reasoning →   dismiss
```

Confidence < 0.4 on an AI output triggers a "low-confidence" amber border + a "Verify before acting" microcopy line.

---

## 4. Per-Source Trust Scores

The `source` dimension is computed from a registered source's _trust score_, not the data itself:

| Source category   | Default trust | Examples                                                 |
| ----------------- | ------------- | -------------------------------------------------------- |
| `prod_api`        | 1.00          | NPHIES, ZKTeco fingerprint, Nafath JWS                   |
| `prod_db`         | 1.00          | Direct Mongo reads from authoritative collection         |
| `ingest_pipeline` | 0.95          | DLQ-replayed messages                                    |
| `etl_batch`       | 0.90          | Nightly ETL from external systems                        |
| `manual_import`   | 0.70          | CSV uploads from staff                                   |
| `legacy_system`   | 0.60          | Pre-migration data                                       |
| `derived`         | 0.85          | Computed (e.g. KPI rollup from other KPIs)               |
| `simulated`       | 0.30          | Test/demo data — fired loudly so it can't slip into prod |

A KPI inherits the _minimum_ trust score across all its sources. So a beneficiary count drawn from `prod_db ∪ manual_import` scores 0.70 on the source dimension until the manual rows are reconciled.

---

## 5. Quality Alert Rules

When a quality dimension drops below its registered threshold, an **Insight** (not just an alert) is emitted via the `data-quality.v1` generator. This gives operators the explainable bilingual reasoning + actions surface from Wave 18.

The 7 rule families and their trigger conditions:

| Rule                                | Trigger                                     | Default severity                 | Default action                                |
| ----------------------------------- | ------------------------------------------- | -------------------------------- | --------------------------------------------- |
| `dq.freshness.stale`                | now − lastRefreshAt > 2× expectedCadenceMin | medium                           | "افحص خط الإدخال" / "Inspect ingest pipeline" |
| `dq.freshness.expired`              | now − lastRefreshAt > 4× expectedCadenceMin | high                             | Escalate + page operator                      |
| `dq.timeliness.sla_breach`          | arrivalLatencyMs > slaMs                    | high (finance) / medium (else)   | Open the source SLA dashboard                 |
| `dq.completeness.below_threshold`   | completenessScore < completenessThreshold   | high                             | Schedule backfill                             |
| `dq.validity.rule_breach`           | validityScore < validityThreshold           | high (clinical) / medium (else)  | Review rule violations                        |
| `dq.consistency.cross_source_drift` | crossSourceDelta > tolerance                | critical (finance) / high (else) | Reconcile sources                             |
| `dq.uniqueness.duplicates_detected` | duplicateRate > duplicateThreshold          | medium                           | Run dedup                                     |

Severity is _per-category_ — a 1% drift in finance is critical; the same drift in operational telemetry is medium. The registry encodes this.

Critical-severity DQ insights also auto-promote to Alert (uses the [[alert-priority-engine-2026-05-16]] bridge already in `insightsService`) so they get the tier-1→2→3 escalation chain.

---

## 6. Executive vs Operational Views

Same data, two presentations:

### 6.1 Executive view

```
┌────────────────────────────────────────────┐
│  Active beneficiaries          [✓ 0.92]    │
│  246                                       │
│  ↗ +12 this week                          │
│  src: 2 sources verified                  │
└────────────────────────────────────────────┘
```

**Rules:**

- Single composite badge — color + numeric score
- Mask the value when quality is `critical` AND the dataset has `maskOnCritical: true`
- Source tag collapses to "N sources verified" (not raw source names)
- Click composite badge → opens the per-dimension drawer
- Per-dimension breakdown is HIDDEN by default

**Why:** an executive scanning 30 KPIs in 10 seconds needs ONE bit of trust info per card. Anything more is noise.

### 6.2 Operational view

```
┌─────────────────────────────────────────────────────────────────┐
│  Active beneficiaries  [Fresh:✓ Comp:✓ Valid:✓ Cons:⚠ Src:✓]   │
│  246                                                            │
│  ↗ +12 this week                                                │
│  src: zkteco_v2 ⚠ ehr_v3 (4% delta)                            │
│  Last quality run: 2 min ago · Next: 13 min                    │
└─────────────────────────────────────────────────────────────────┘
```

**Rules:**

- Per-dimension badges inline — operator wants the breakdown at a glance
- Raw source names visible
- Last/next quality-run timestamps visible
- NEVER mask the value at the operational level — operators need to see the raw number even when bad (to debug it)
- Composite badge optional (the per-dimension chips already tell the story)

**Why:** the operator is on this dashboard to fix things. They need to see WHICH dimension is failing, not just THAT something is failing.

### 6.3 Clinical view (subset of operational)

Adds a fixed PHI banner across the top whenever the value is rendered without masking:

```
⚠ PHI present — viewer audited (PDPL Art.13)
```

The audit-log entry is written automatically by the data-quality middleware on every clinical-KPI read.

---

## 7. The Data-Quality Generator

`data-quality.v1` is the 4th concrete Intelligence generator (after care-gap, anomaly, trend-deviation). It evaluates per-dataset quality on each orchestrator tick and emits Insights when any dimension drops below threshold.

### 7.1 Input

```js
{
  datasets: [
    {
      datasetId: 'kpi.beneficiary.active_count',
      branchId: '...',
      lastRefreshAt: Date,
      arrivalLatencyMs: 8000,
      sampleSize: 1314,
      presentCount: 1248,
      ruleViolations: 23,
      crossSourceDelta: 0.04,         // 4%
      duplicates: 0,
      sources: [
        { id: 'zkteco_v2', category: 'prod_api' },
        { id: 'ehr_v3', category: 'prod_db' },
      ],
    },
  ],
}
```

### 7.2 Output

One Insight per dataset that crosses any threshold. Severity = the _worst_ dimension's severity. Reasoning bullets list every dimension's current state (so even the passing ones show as context). Supporting facts are the numeric scores. Actions come from the rule-family table above.

### 7.3 Dedup contract

`(generatorId, datasetId, worstDimension, severityBucket)` — same dataset with the same worst dimension at the same severity bucket dedups. When the WORST dimension changes (e.g. yesterday freshness, today consistency), a new insight fires.

---

## 8. Wave 22 deliverables (this PR)

- [x] Design doc (this file)
- [ ] `backend/intelligence/data-quality.registry.js` — per-dataset thresholds + weights + sources for the 12 priority KPIs
- [ ] `backend/intelligence/data-quality.service.js` — `computeQuality(dataset)` returns `{ composite, dimensions[], level, sources, lastRunAt }`
- [ ] `backend/intelligence/generators/data-quality.generator.js` — emits Insights for quality drops
- [ ] `backend/routes/data-quality.routes.js`:
  - `GET /api/v1/data-quality/:datasetId` — current quality bundle
  - `GET /api/v1/data-quality/:datasetId/dimensions` — per-dimension detail
  - `GET /api/v1/data-quality/sources` — registered source catalog + trust scores
  - `POST /api/v1/data-quality/:datasetId/compute` — compute on demand for a provided dataset snapshot (operator backfill check)
- [ ] Tests covering the 8 dimensions + composite + 7 alert rules + routes
- [ ] Wire into `app.js` (always-on)

Wave 23 adds the UI surfaces (composite badge component, breakdown drawer, inline dimension chips).

---

## 9. Drift guards

Three CI-gated guarantees:

1. **Every drillable KPI in `drilldown.registry.js` has a `data-quality.registry.js` entry.**
   Drift test: `__tests__/data-quality-coverage.test.js`.

2. **Every source in any registry is declared in the source catalog with a category + trustScore.**
   Drift test catches "undeclared source" by name match.

3. **Every quality rule family in the registry maps to a generator action.**
   Drift test asserts the action's deepLink resolves to a known route.

This makes the layer self-policing — adding a KPI without its quality contract will fail CI.
