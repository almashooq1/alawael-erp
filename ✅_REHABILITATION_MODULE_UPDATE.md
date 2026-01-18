# 🩺 Advanced Rehabilitation Operations Module

**Date:** 2026-01-15
**Status:** ✅ Implemented

This module is the operational core that links **Patients** to **Staff** through **Therapy Programs**.

## 1. 📋 Service Catalog (Directory of Services)

Define what the center offers.

- **Model:** `TherapyProgram`
- **Fields:** Name, Department, Price/Session, Default Duration.
- **API:** `GET /api/rehabilitation-advanced/programs`

## 2. 📝 Enrollments (Therapeutic Plans)

Link a patient to a program.

- **Model:** `TherapeuticPlan`
- **Fields:** Goals (IEP), Assigned Team, Insurance Approval Code.
- **API:** `POST /api/rehabilitation-advanced/plans`

## 3. 📅 Session Scheduling (The Calendar)

Manage the daily operations.

- **Model:** `TherapySession`
- **Features:**
  - **Conflict Detection:** Prevents double-booking a therapist.
  - **Attendance:** Mark as 'No Show' or 'Present'.
  - **Clinical SOAP Notes:** Subjective, Objective, Assessment, Plan.
- **API:**
  - `POST /api/rehabilitation-advanced/sessions` (Schedule)
  - `PUT /api/rehabilitation-advanced/sessions/:id/complete` (Write Notes)

## 🔄 Workflow Example

1. **Admin** creates "Speech Therapy Program" ($200/session).
2. **Reception** creates Patient File "Ahmed".
3. **Care Mgr** creates Plan for Ahmed in "Speech Therapy" assigned to "Dr. Sarah".
4. **Reception** schedules Session for Ahmed with Dr. Sarah on Jan 20th @ 10:00 AM.
5. **System** checks Dr. Sarah's schedule -> OK.
6. **Dr. Sarah** conducts session, clicks "Complete", writes notes " improved eye contact".
7. **Finance** sees Completed session -> Issues Invoice.

## New Files

- `backend/models/TherapyProgram.js`
- `backend/models/TherapeuticPlan.js`
- `backend/models/TherapySession.js`
- `backend/routes/rehabilitation_advanced.routes.js`
