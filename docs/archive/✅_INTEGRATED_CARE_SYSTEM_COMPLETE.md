# 🏥 Integrated Care System (Educational, Therapeutic, Life Skills)

> **Status:** ✅ Core Structure Implemented
> **Date:** 2026-01-15
> **Module:** Integrated Care & Plans Management

## 🌟 Concept

A unified system to manage the entire lifecycle of a beneficiary's care, merging academic, therapeutic, and life skills into a single "Integrated Care Plan" (ICP) linked to the ERP.

## 🏗 Architecture

### 1. 📂 Backend Models (New)

- **`CarePlan.js`**: The master document.
  - **Educational Domain:** Academic, Classroom, Communication.
  - **Therapeutic Domain:** Speech, OT, PT, Behavioral, Psych.
  - **Life Skills Domain:** Self Care, Social, Transport, Financial.
  - _Features:_ SMART Goals, Baseline, Target, Status.
- **`GroupProgram.js`**: Manages collective sessions (Social groups, etc.) and links students.
- **`DailySession.js`**: The execution log. Links `Student` -> `Plan` -> `Goal`.

### 2. 🔌 API Layer (`api/integrated-care/`)

- `POST /plans`: Create a new integrated plan.
- `POST /groups`: Create a new group program.
- `POST /sessions`: Log a daily session (Individual/Group) and update goals.
- `GET /reports/student/:id`: Generate the unified progress report.

### 3. 💻 Frontend (`/integrated-care`)

- **Dashboard:** Unified view of all active plans.
- **Tabs:**
  - **Individual Plans:** List of students with their plan status and active domains.
  - **Group Programs:** Management of social/vocational groups.
  - **Sessions:** (Coming Soon) Daily logging interface.

## 🚀 Next Steps

1.  **Detail Views:** Build the "Create Plan" and "Record Session" forms.
2.  **Progress Logic:** Implement the automatic calculation of goal progress based on session logs.
3.  **ERP Link:** Deep linking with the Finance module for session billing.
