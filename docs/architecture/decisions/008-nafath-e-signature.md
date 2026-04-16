# 8. Nafath as Primary E-Signature Provider

Date: 2026-04-17

## Status

✅ Accepted (plan) — implementation in P1

## Context

The platform needs legally binding e-signatures for:

- Parent/guardian consent forms
- IRP approvals
- Employment contracts
- Supplier contracts
- Internal policy acknowledgments
- Financial approvals over a threshold

Options:

- **Nafath (National Digital Identity)** — Saudi government-issued digital identity, integrated with Absher, legally recognized.
- **DocuSign / Adobe Sign** — international, recognized but requires UETA/eIDAS, not Saudi-native.
- **Custom e-signature** — signature pad + audit trail. Legally weaker.

## Decision

We adopt **Nafath as the primary e-signature provider** for all Saudi citizens and residents, with a fallback to signature-pad-with-Nafath-verified-account for edge cases (international guardians, etc.).

## Why

1. **Saudi-native:** accepted by ZATCA, MoJ, MoHRSD, and all Saudi government interfaces.
2. **Legally binding:** equivalent to wet signature under Electronic Transactions Law.
3. **Identity-bound:** signer's national identity is cryptographically linked to the signature.
4. **Mobile-first:** Saudi users are familiar with the Absher app flow.
5. **Cost-effective:** no per-signature license like DocuSign.

## Implementation

### Flow

```
User initiates signing → Platform creates signature request with document hash
                         │
                         ▼
                Redirect user to Nafath OIDC endpoint
                         │
                         ▼
                User approves via Absher app (notification/biometric)
                         │
                         ▼
                Nafath returns signed JWT + signature artifact
                         │
                         ▼
                Platform:
                  - Validates signature against document hash
                  - Embeds PAdES signature in PDF
                  - Stores signed PDF + metadata in DMS
                  - Emits SignatureCompleted event
```

### Storage

- Original document + signed PDF stored in BC-10 (DMS).
- PAdES (PDF Advanced Electronic Signature) format, long-term validation (LTV) enabled.
- Retention per legal category.

### Multi-Signer

- Sequential mode (common for approval chains).
- Parallel mode (multiple signers of a policy).
- Quorum mode (any N of M signers).

### Fallback

- When signer lacks a Nafath-eligible ID (e.g., foreign guardian): use in-platform signature pad with:
  - OTP-verified phone + email
  - ID document photo upload
  - Witness co-sign (receptionist with Nafath)
- Such signatures are flagged "Non-Nafath" and may not satisfy certain legal requirements.

### Audit

- Every signing event logged with correlation to document hash.
- Revocation: if a signature is repudiated/challenged, audit trail supports investigation.

## Rules

- **Clinical IRPs** must be Nafath-signed by guardian (or have documented reason for fallback).
- **Employment contracts** must be Nafath-signed by employee.
- **Commercial contracts** > SAR 100,000 must be Nafath-signed by authorized signatory.
- **Internal policy acknowledgments** accept click-to-accept for L5–L6, require Nafath for L2–L4 (who enforce policies).

## Consequences

### Positive

- Legally robust across Saudi regulatory bodies.
- One provider to integrate, not many.
- Good UX (Absher app ubiquitous).
- No per-signature cost.

### Negative

- Requires Nafath onboarding (admin setup with provider).
- Depends on government uptime (risk R-14 applies).
- Non-Saudi guardians need fallback path.

### Risks

- Nafath API changes without notice. Mitigation: version pinning + adapter abstraction (ACL).
- Signature non-repudiation challenge. Mitigation: store full JWT + LTV-enabled PAdES + time-stamped hash.

## References

- Nafath technical docs: <https://nafath.sa/>
- [docs/blueprint/07-integrations.md § 2.4](../../blueprint/07-integrations.md)
- BC-10 DMS: [blueprint/02-bounded-contexts.md](../../blueprint/02-bounded-contexts.md)
