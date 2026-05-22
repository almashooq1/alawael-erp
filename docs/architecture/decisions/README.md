# Architecture Decision Records

This directory contains Architecture Decision Records (ADRs) for the AlAwael ERP
System.

## What is an ADR?

An Architecture Decision Record (ADR) is a document that captures an important
architectural decision made along with its context and consequences.

## ADR Format

Each ADR should follow this format:

```markdown
# [Number]. [Title]

Date: YYYY-MM-DD

## Status

[Proposed | Accepted | Deprecated | Superseded]

## Context

What is the issue that we're seeing that is motivating this decision or change?

## Decision

What is the change that we're proposing and/or doing?

## Consequences

What becomes easier or more difficult to do because of this change?
```

## Index

### Foundation (Waves 1-89, dated 2026-01-18 → 2026-04-17)

1. [Monolithic Architecture](001-monolithic-architecture.md)
2. [Technology Stack Selection](002-technology-stack.md)
3. [Bilingual Support Strategy](003-bilingual-support.md)
4. [Multi-Tenant Isolation Strategy](004-multi-tenant-isolation-strategy.md)
5. [Canonical Role Hierarchy (6 Levels)](005-canonical-role-hierarchy.md)
6. [Domain Event Bus](006-domain-event-bus.md)
7. [PDPL Compliance Baseline](007-pdpl-compliance-baseline.md)
8. [Nafath as Primary E-Signature Provider](008-nafath-e-signature.md)
9. [Audit Trail Standard](009-audit-trail-standard.md)

### P3 — Intelligence & Automation (Waves 90-137, dated 2026-05-18/19)

10. [Sensitivity-Grade Library](010-sensitivity-grade-library.md) — single LEVEL→guarantees mapping (Wave 90)
11. [Heuristic-First Predictions; ML Optional](011-heuristic-first-ml-optional.md) — rule-based scoring as the shipped path (Wave 115)
12. [LLM-Primary with Silent Rule-Based Fallback](012-llm-primary-rule-fallback.md) — chatbot classifier hybrid (Wave 123)
13. [Shared LLM Telemetry Library + Cross-Service Registry](013-llm-telemetry-shared-lib.md) — single source of truth for LLM observability (Waves 128+131)
14. [Telemetry Persistence with Mongo TTL](014-telemetry-persistence-ttl.md) — hybrid in-memory + 30d persistent (Wave 134)
15. [Forbidden-Content Guard Runs on Filled Output](015-forbidden-content-runtime-guard.md) — PHI block at substitution boundary (Wave 122)
16. [Atomic Stage-Commit Pattern for Cross-Agent Concurrency](016-atomic-commit-cross-agent-race.md) — git workflow lesson (Wave 137)

### Clinical Domain Proposals (Wave 221+, dated 2026-05-21)

17. [Measure-Alert Dismiss/Ack SoD Policy](017-measure-alert-dismiss-sod-policy.md) — 🟡 Proposed; needs clinical lead + compliance sign-off (Wave 221)
18. [Rehabilitation Protocol Entity — Bridge Between Templates and Plans](018-rehabilitation-protocol-entity.md) — 🟡 Proposed; needs clinical director sign-off

### Security Hardening (Wave 273+, dated 2026-05-22)

19. [MFA Tier Enforcement — Three-Layer Architecture](019-mfa-tier-enforcement-three-layer.md) — route middleware + service-layer factory + drift guards (Waves 273-275z)

---

**Last Updated:** May 22, 2026 (ADRs 17-19 added)
