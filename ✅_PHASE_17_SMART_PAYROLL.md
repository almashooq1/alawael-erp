# 💰 Phase 17: Smart Payroll & Commission System

**Date:** 2026-01-16
**Status:** ✅ Implemented

We have automated the one of the most complex monthly tasks: **Therapist Payroll Generation**.
This system doesn't just copy the base salary; it acts as a **Performance Calculator**.

## 1. 🧠 Smart Logic

The `SmartPayrollService` does the following:

1.  **Iterates Employees:** Finds all active staff.
2.  **Analyzes Clinical Work:**
    - Queries `TherapySession` for the target month.
    - Counts `COMPLETED` sessions only.
3.  **Applies Formula:**
    - **Base Salary** (from Contract).
    - **Housing/Transport** (Fixed).
    - **Clinical Commission:** `Sessions * 50 SAR` (Configurable).
    - **Star Bonus:** If Average Patient Rating > 4.8, add `500 SAR` bonus.

## 2. ⚡ Automated Workflow

- **Trigger:** Manual click by HR / Admin.
- **Output:** Generates `Payroll` records in `DRAFT` status.
- **Review:** HR can see breakdown (Base + Commission + Bonus).
- **Approval:** Admin locks the record (`APPROVED`) preventing re-generation.

## 3. Data Flow

`TherapySession` -> `SmartPayrollService` -> `Payroll` (Collection) -> `Dashboard`

## 4. API Usage

```http
POST /api/hr-smart/payroll/generate
Body: { "month": 1, "year": 2026 }
```

**Result:**

```json
{
  "success": true,
  "details": [
    { "name": "Dr. Ahmed", "net": 12500, "status": "CREATED" },
    { "name": "Sarah Rehab", "net": 8400, "status": "UPDATED" }
  ]
}
```

The system now creates financial incentives for quality care automatically.
