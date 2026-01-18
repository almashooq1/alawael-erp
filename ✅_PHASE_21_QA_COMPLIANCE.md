# 🛡️ Phase 21: Integrated Quality Assurance (QA) & Compliance Watchdog

**Date:** 2026-01-16
**Status:** ✅ Implemented

We have added a centralized "Watchdog" system.
In large centers, little things slip through the cracks: expired visas, unsigned notes, forgotten invoices.
The **Smart QA System** proactively hunts for these errors.

## 1. 🔍 The Compliance Scanner

A powerful engine `SmartQualityService` that audits the database across 3 domains:

1.  **HR Domain:**
    - Checks Employee Contracts.
    - Alerts 30 days before expiration.
    - Flags active employees with missing contracts.
2.  **Clinical Domain:**
    - **Quality Audit:** Scans `Completed` therapy sessions.
    - **Rule:** If a session is marked "Done" but notes are empty/short (< 10 chars), flags it as "POOR_DOCUMENTATION". (Ensures medical records are legally defensible).
3.  **Fleet / Ops Domain:**
    - (Simulated) Checks Vehicle Insurance/Registration dates.

## 2. 📋 The Compliance Log

A unified issue tracker `ComplianceLog`.

- **Severity:** CRITICAL (Must Fix Now), WARNING (Fix Soon).
- **Status:** OPEN, RESOLVED.

## 3. 🚦 QA Dashboard

Admins/Managers have a dedicated view.

- "You have 3 Critical HR Issues and 5 Clinical Warnings."
- Action: Click "Resolve" after fixing the issue.

## 4. API Usage

### Run Manual Scan

```http
POST /api/quality-smart/scan
```

**Response:**

```json
{
  "issuesFound": 12,
  "details": { "hr": 2, "clinical": 10, "fleet": 0 }
}
```

### Get Critical Issues

```http
GET /api/quality-smart/dashboard
```

**Response:**

```json
{
  "criticalIssues": [
    {
      "domain": "HR",
      "issueType": "MISSING_CONTRACT",
      "description": "Active employee Dr. X has no contract."
    }
  ]
}
```

This acts as an **Automated Operational Auditor**, running 24/7 to protect the center from liability and quality drops.
