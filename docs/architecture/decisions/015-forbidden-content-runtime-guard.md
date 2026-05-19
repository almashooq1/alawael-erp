# 15. Forbidden-Content Guard Runs on Filled Output, Not Just Templates

Date: 2026-05-19

## Status

✅ Accepted (Wave 122)

## Context

The Parent Chatbot Phase 1 (Wave 120) introduced canned response templates
with placeholder tokens: e.g. `"موعدك القادم هو {APPOINTMENT_DATE} الساعة
{APPOINTMENT_TIME} مع {THERAPIST_NAME}."`. The forbidden-content guard
ran at TEMPLATE level: if a template's literal text contained banned tokens
(`ICD`, `diagnosis`, `تشخيص`, `medication`, `دواء`, `national_id`, `الهوية`),
the service refused to emit it. This caught **author-time** mistakes (a
template editor accidentally including "diagnosis" in a response).

Phase 2a (Wave 122) added the context resolver: `{TOKEN}` placeholders get
substituted with DB-derived values. The therapist name might be
`"Dr. Diagnosis Specialist"` (legal name); the branch address might contain
`"المستشفى الوطني"`. The original templates passed the guard because their
literal text was clean — but the FILLED output now carries the forbidden
token through a substituted value.

This is a real PHI-leakage risk: any operator-controlled or DB-derived
field could carry clinical detail.

## Decision

Run the forbidden-content guard at TWO levels:

1. **Template-level (Wave 120)**: refuse to emit any template whose
   literal text contains a banned token. Catches author-time mistakes.

2. **Filled-output-level (Wave 122)**: after substitution, re-scan the
   FILLED response. If a substituted token VALUE introduces a banned
   word, refuse to emit with `RESPONSE_FORBIDDEN_CONTENT` reason +
   `details.source: 'token-value'` so the caller can distinguish from
   template-level fail.

3. **Caller-supplied context is treated identically.** The `ask()`
   orchestrator lets callers pass `{context: tokens}` to bypass the
   resolver (useful for testing + the future LLM wave's own token
   graph). Caller-supplied tokens go through the SAME forbidden-output
   check — no trust assumption on the caller.

4. **Sensitivity of the banned list is intentional.** The list errs on
   the side of false positives. A legitimate therapist named
   "Dr. Diagnosis" CAN'T be surfaced to a parent's chatbot. That's
   acceptable — false positives degrade to "Dr." or escalate to a
   human; false negatives could leak PHI.

5. **Wave 123 LLM-substituted outputs run the same guard.** When the
   LLM-backed responder generates a value (future work), it MUST go
   through the same forbidden-output check. The lib documents this
   as a hard requirement for future implementations.

## Consequences

**Easier:**

- Templates can use rich placeholders (free-text therapist names,
  branch addresses, document subjects) without the author worrying
  about runtime PHI leakage — the guard catches it at the boundary.
- Future LLM-backed Phase 2b inherits the safety net for free; an
  LLM-generated `THERAPIST_NAME: 'Dr. Diagnosis'` triggers the same
  reject.

**Harder:**

- Legitimate edge cases (a therapist actually named "Diagnosis") need
  manual override via an allowlist (not yet implemented — current
  policy is reject + escalate).
- The banned-token list must be maintained as the system grows. Current
  list (7 tokens) covers obvious PHI markers; future additions should
  align with the data classification owners (DPO + clinical lead).

**Tradeoffs:**

- We accept that some legitimate responses will be rejected, escalating
  the parent to a human agent. The user-facing cost is a minor wait;
  the risk-management benefit is structural — PHI cannot exit the
  chatbot via free-text substitution.

## References

- Wave 120 template-level guard (commit `516f5db2c`)
- Wave 122 filled-output guard (commit `6d3d61ed9`)
- Wave 123 LLM classifier (commit `99a55cd58`) — preserves the guard
- ADR 014 — telemetry persistence stores cost + reason, NOT prompt
  content, so the guard doesn't need to run on telemetry rows
