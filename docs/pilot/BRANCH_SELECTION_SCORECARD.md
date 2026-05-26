# Pilot Branch Selection Scorecard

**Type**: Decision tool (replaces unstructured branch picking)
**Date**: 2026-05-25
**Audience**: User + product PM
**Purpose**: Make the pilot-branch decision mechanical — fill in 2-3 candidate branches, pick the highest scorer

This complements [`PILOT_CYCLE_1.md`](../PILOT_CYCLE_1.md) §2 by turning the criteria into a 1-page form. Once you fill in 2-3 candidates, the answer is usually obvious.

---

## How to use

1. **List 2-3 candidate branches** (top of the rows below)
2. **Score each row 0-2**: 0 = doesn't meet, 1 = partially meets, 2 = fully meets
3. **Add up the column** at the bottom
4. **Highest score wins**. If tied → use §"tiebreakers" below

---

## The scorecard

| Criterion                                                                                          | Weight | Branch A: **\_** | Branch B: **\_** | Branch C: **\_** |
| -------------------------------------------------------------------------------------------------- | :----: | :--------------: | :--------------: | :--------------: |
| **Active beneficiary count** (50-200 sweet spot; too small = sparse data, too large = scope creep) |   ×3   |     \_\_ /2      |     \_\_ /2      |     \_\_ /2      |
| **Branch manager** is cooperative + attends retrospectives                                         |   ×3   |     \_\_ /2      |     \_\_ /2      |     \_\_ /2      |
| **Reliable internet** (cloud backend dependency)                                                   |   ×2   |     \_\_ /2      |     \_\_ /2      |     \_\_ /2      |
| **HR manager agreement** on 2-3 hrs/user training time                                             |   ×2   |     \_\_ /2      |     \_\_ /2      |     \_\_ /2      |
| **One volunteer family** willing to try Family Portal                                              |   ×2   |     \_\_ /2      |     \_\_ /2      |     \_\_ /2      |
| **NOT mid-transition** (no leadership change / location move / staff turnover)                     |   ×3   |     \_\_ /2      |     \_\_ /2      |     \_\_ /2      |
| **NOT under regulator audit** currently                                                            |   ×2   |     \_\_ /2      |     \_\_ /2      |     \_\_ /2      |
| **Fewer than 5 open complaints** in last month (signal vs noise)                                   |   ×2   |     \_\_ /2      |     \_\_ /2      |     \_\_ /2      |
| **Doesn't use a competing system** currently (avoid lock-in psychology — preferable not mandatory) |   ×1   |     \_\_ /2      |     \_\_ /2      |     \_\_ /2      |
| **TOTAL** (max 40)                                                                                 |        |     \_\_/40      |     \_\_/40      |     \_\_/40      |

### Scoring math reminder

Each row: `(your 0-2 rating) × (weight) = subtotal`. Sum all subtotals = column total.

Example for Branch A:

- Row 1: 2 × 3 = 6
- Row 2: 1 × 3 = 3
- Row 3: 2 × 2 = 4
- ... etc

---

## Interpretation

| Total     | Verdict                                                                       |
| --------- | ----------------------------------------------------------------------------- |
| **30-40** | Excellent fit. Start pilot here.                                              |
| **22-29** | Good fit. Acceptable; address weak rows with branch manager before kickoff.   |
| **15-21** | Marginal fit. Pick this only if nothing better is available; expect friction. |
| **< 15**  | Poor fit. Don't pilot here — find another branch.                             |

---

## Tiebreakers (if 2 branches score equal)

In order:

1. **Higher cooperation score** (criterion #2) — the manager makes or breaks the pilot
2. **Closer to your physical location** — easier for in-person retrospectives
3. **Smaller beneficiary count** (within 50-200 band) — faster feedback loop

---

## After selection

Once you pick a branch:

1. **Notify the branch manager** + secure their explicit yes (informal "sure" is not enough)
2. **Provision pilot env**:
   - Set env var `PILOT_BRANCH_ID=<branch-mongo-id>` so per-branch features (Hikvision, DA reporting) scope correctly
   - Run `cd backend && npm run check:speech-s3-ready` to verify PDPL gate (per Cycle 1 #2 user-side action)
3. **Schedule training week** (per PILOT_CYCLE_1.md §6 — 2 hrs/user)
4. **Open `#pilot-cycle-1` Slack channel** for issues + retrospectives
5. **Execute SCENARIO_1** first ([`pilot/SCENARIO_1_INTAKE_TO_FIRST_SESSION.md`](SCENARIO_1_INTAKE_TO_FIRST_SESSION.md)) — foundational + most other scenarios depend on its data

---

## Why this scorecard exists

The PILOT_CYCLE_1.md §2 criteria are a checklist. Checklists are easy to skim past. A scorecard FORCES you to:

- Compare branches side-by-side (not in isolation)
- Number-rank rather than impression-rank
- Surface tradeoffs explicitly (a high-volume branch with a hostile manager scores LOWER than a mid-volume branch with an excellent manager)

If you only have one candidate branch, fill it in anyway — the total tells you whether to proceed or find another option first.

---

## Related

- [`PILOT_CYCLE_1.md`](../PILOT_CYCLE_1.md) — full operational readiness package
- [`pilot/README.md`](README.md) — 5-scenario walkthrough index
- [`SESSION_2026-05-25_HANDOFF.md`](../SESSION_2026-05-25_HANDOFF.md) §3 — user-side action items in leverage order
