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

1. [Monolithic Architecture](001-monolithic-architecture.md)
2. [Technology Stack Selection](002-technology-stack.md)
3. [Bilingual Support Strategy](003-bilingual-support.md)
4. [Multi-Tenant Isolation Strategy](004-multi-tenant-isolation-strategy.md)
5. [Canonical Role Hierarchy (6 Levels)](005-canonical-role-hierarchy.md)
6. [Domain Event Bus](006-domain-event-bus.md)
7. [PDPL Compliance Baseline](007-pdpl-compliance-baseline.md)
8. [Nafath as Primary E-Signature Provider](008-nafath-e-signature.md)
9. [Audit Trail Standard](009-audit-trail-standard.md)

---

**Last Updated:** April 17, 2026
