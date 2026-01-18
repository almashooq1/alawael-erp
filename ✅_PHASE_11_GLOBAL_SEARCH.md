# 🔍 Phase 11: Intelligent Global Search

**Date:** 2026-01-15
**Status:** ✅ Implemented

We have added the "Google" of the ERP system.
Users no longer need to navigate to specific modules to find information. They can use the **Global Search Bar**.

## 1. 🧠 Intelligent Query Detection

The search engine analyzes the input before searching:

- **Starts with `INV-`?** -> It's an Invoice. Search Finance module specifically.
- **Starts with `EMP-`?** -> It's an Employee. Search HR.
- **Starts with `PAT-`?** -> It's a Patient. Search Archives.
- **Just text?** -> Search **EVERYTHING** (Names, Departments, Statuses).

## 2. ⚡ Performance

- Uses **Parallel Execution** (`Promise.all`) to query 3+ databases simultaneously.
- Returns results in a categorized format.

## 3. Usage

### Generic Search (e.g., "Sarah")

```http
GET /api/search?q=Sarah
Authorization: Bearer <token>
```

**Response:**

```json
{
  "metadata": { "query": "Sarah", "type": "TEXT" },
  "employees": [{ "firstName": "Sarah", "lastName": "Connor", "position": "Therapist" }],
  "beneficiaries": [{ "firstName": "Sarah", "lastName": "Smith", "fileNumber": "PAT-2024-001" }],
  "invoices": [],
  "totalHits": 2
}
```

### Exact ID Search

```http
GET /api/search?q=INV-2024-0050
```

**Response:** finds the exact invoice instantly without scanning other tables.

The system is now **Discoverable**. 🚀
