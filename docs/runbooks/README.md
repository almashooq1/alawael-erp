# Runbooks — Al-Awael Ops

On-call playbooks for the alerts defined in `docs/alerts/*.yml`.

| Alert                          | Severity | Runbook                                                                                      |
| ------------------------------ | -------- | -------------------------------------------------------------------------------------------- |
| `GovAdapterCircuitOpen`        | critical | [gov-adapter-circuit.md](gov-adapter-circuit.md)                                             |
| `GovAdapterRateLimitHigh`      | warning  | [gov-adapter-rate-limit.md](gov-adapter-rate-limit.md)                                       |
| `GovAdapterRateLimitExhausted` | critical | [gov-adapter-rate-limit.md](gov-adapter-rate-limit.md)                                       |
| `GovAdapterMisconfigured`      | warning  | [gov-adapter-misconfigured.md](gov-adapter-misconfigured.md)                                 |
| `GovAdapterFlippedToLive`      | info     | (no runbook — just verify the change was intentional)                                        |
| `GovAdapterSuccessRateLow`     | warning  | [gov-adapter-circuit.md](gov-adapter-circuit.md) (same diagnostic path)                      |
| `GovAdapterLatencyP95High`     | warning  | [gov-adapter-circuit.md](gov-adapter-circuit.md) (upstream slowdown usually precedes a trip) |

### Compliance workflows (not triggered by alerts)

| Workflow                                | Runbook                                          |
| --------------------------------------- | ------------------------------------------------ |
| PDPL Data Subject Access Request (DSAR) | [dsar-adapter-audit.md](dsar-adapter-audit.md)   |
| SCFHS CPE credit attention (HR)         | [cpe-attention.md](cpe-attention.md)             |
| Session attendance risk (front-desk)    | [attendance-digest.md](attendance-digest.md)     |
| ZKTeco device-model merge (ops, 1-shot) | [zkteco-device-merge.md](zkteco-device-merge.md) |
| RAG retrieval quality (AI ops)          | [rag-quality.md](rag-quality.md)                 |

### Architecture references

| Topic                                     | Doc                                                      |
| ----------------------------------------- | -------------------------------------------------------- |
| Phase-7 IAM stack (roles/scope/SoD/audit) | [phase-7-iam.md](phase-7-iam.md)                         |
| Phase-13 QMS & compliance vault           | [phase-13-qms-compliance.md](phase-13-qms-compliance.md) |

## How to use

1. PagerDuty / Slack → you see an alert firing.
2. Click the runbook URL in the alert annotation.
3. Follow the **Immediate actions** section — usually 2 minutes to
   rule out the silly causes (wrong env, dashboard out of date).
4. Drop into the **Diagnosis path** that matches the symptoms.
5. If you're still stuck after 15 minutes, escalate to the integration
   owner listed in `docs/sprints/GOV_INTEGRATIONS_GO_LIVE.md`.

## Writing a new runbook

Keep the structure consistent:

- Alert name + metric + trigger condition (one-line each).
- "What this means" — plain Arabic + English, 2–3 sentences.
- "Immediate actions" — numbered, <5 minutes.
- "Diagnosis path" — one section per plausible root cause.
- "Preventing recurrence" — env tunables, but with warnings about
  masking real incidents.
- "Related" — source files, metrics, UI paths.
