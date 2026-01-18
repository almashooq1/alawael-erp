# 🤖 Phase 35: AI Parent Companion (The Clinical Coach)

**Date:** 2026-01-16
**Status:** ✅ Implemented

Parents often feel lost between sessions.
*"What should I do if he cries?"* or *"Can he eat this?"*
The **Smart Parent Coach** is a 24/7 chatbot context-aware of the child's specific medical file.

## 1. 🧠 Context-Aware QA
Unlike ChatGPT (general knowledge), this bot reads the **Phase 32 Treatment Plan** first.
-   **Parent:** "My child is screaming."
-   **General Bot:** "Try to calm them down."
-   **Smart Coach:** "Since Ali is on the **ABA Plan**, remember the 'Extinction' protocol. Ignore the behavior if it's for attention, as Dr. Sarah noted."

## 2. 💡 Daily Nudges
Proactively sends tips based on the **Phase 20 Home Care** schedule.
-   "No session today? Try the 'Animal Walk' exercise for 10 mins."

## 3. API Usage
```http
POST /api/parent-coach-smart/ask
{ "question": "Is sugar okay?" }
```
**Response:**
```json
{
  "answer": "Ali's nutrition plan recommends avoiding sugar. Increases hyperactivity.",
  "source": "Clinical Nutrition Plan"
}
```
This empowers parents and ensures continuity of care at home.
