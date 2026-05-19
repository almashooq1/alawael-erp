# 12. LLM-Primary with Silent Rule-Based Fallback (Parent Chatbot)

Date: 2026-05-19

## Status

✅ Accepted (Wave 123)

## Context

Wave 120 shipped the Parent Chatbot foundation with a rule-based intent
classifier — 11 intents, bilingual keyword catalogue, 3-band confidence
dispatch. The classifier works but mis-fires on natural-language phrasing:
"I want to schedule something for next week" doesn't match "book appointment"
via substring; "كم رصيدي الحالي عند المركز" matches `invoice.balance` only
partially because the catalogue assumes shorter forms.

For Phase 2b, the obvious approach is to swap rule-based for an LLM
classifier outright. But this introduces risks:

1. LLM is unreliable (5% of calls might time out or return malformed JSON)
2. LLM is expensive ($0.0002/turn for Haiku, but still non-zero)
3. LLM might hallucinate intent names outside our enum
4. Local dev / CI environments have no API key — entire feature breaks

## Decision

Adopt a **hybrid classifier** with these rules:

1. **LLM is PRIMARY** when an Anthropic client is wired. Claude Haiku 4.5
   for speed + cost. JSON-only system prompt: `{"intent":"<name>","confidence":<0..1>}`.

2. **Rule-based is the SILENT FALLBACK** for every failure mode:

   - `CLIENT_MISSING` (no API key)
   - `TIMEOUT` (LLM > 5s)
   - `INVALID_RESPONSE` (malformed JSON, markdown fences, prose)
   - `CLIENT_THREW` (non-retriable error)
   - `EMPTY_RESPONSE`
   - Intent name outside the registry enum (coerce to `UNKNOWN`, then
     fall back)

3. **The fallback is SILENT to the user.** The bot responds; the operator
   sees `classifierSource: 'rule'` in the session detail (Wave 124).
   Failure rates surface in telemetry (Waves 126/128/134).

4. **LRU+TTL cache** on the LLM side: identical normalized messages within
   5 minutes share a result. Wave 134 persists each call (including cache
   hits) so cache hit rate is measurable.

5. **Confidence is clamped to [0, 1]** post-parse. LLMs occasionally return
   1.5 or -0.3; defensive clamping at the boundary keeps downstream
   thresholds working.

6. **JSON parsing tolerates markdown fences + prose wrapping** but rejects
   anything that can't be reduced to `{intent, confidence}`. No greedy
   "best effort" extraction.

## Consequences

**Easier:**

- The bot works in dev/CI without API keys — rule-based handles 100% of
  traffic gracefully.
- Cost is bounded: cache hit rate of even 20% slashes spend by ~20%; the
  rule-based fallback during LLM outages costs $0.
- Failure modes are observable (Wave 126 telemetry surfaces every reason).
- Future model swaps (Haiku → Sonnet, or back) require only the
  factory parameter change.

**Harder:**

- The dashboard must surface `classifierSource` so operators can tell
  whether they're seeing LLM-quality or rule-quality classifications
  (Wave 137 admin UI does this).
- Telemetry must record EVERY exit path (success, cache hit, each failure
  reason) for fallback rate to be calculable (Wave 126 explicitly tests
  this).
- The forbidden-content guard (ADR 015) must run on filled OUTPUT too
  because the LLM-substituted token values are user-influenced.

**Tradeoffs:**

- We accept that the bot's quality degrades silently during LLM outages.
  Alternative was hard-failing the request — worse UX. The degraded mode
  is acceptable for an Arabic-first care-services chatbot because the
  rule-based path already handles 11 common intents adequately.

## References

- Wave 123 LLM classifier (commit `99a55cd58`)
- Wave 120 rule-based foundation (commit `516f5db2c`)
- Wave 126 telemetry (cache hit rate + fallback rate measurement)
- ADR 015 — Forbidden-content guard on filled output
