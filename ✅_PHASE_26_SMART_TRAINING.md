# 🎓 Phase 26: AI Staff Development & LMS

**Date:** 2026-01-16
**Status:** ✅ Implemented

A center is only as good as its staff. 
We have built an **"Intelligent Learning System"** that connects Employee Errors to Training Solutions.

## 1. 🧠 The Gap Analyzer (AI Training Manager)
Instead of assigning random courses, the system looks for "Performance Gaps":
-   **Documentation Check:** Queries the `SmartQualityService`.
    -   *Logic:* If an employee has >3 "Poor Documentation" flags.
    -   *Action:* Assigns "Technical Documentation Workshop".
-   **Behavior Check:** Queries the `SmartFeedbackService`.
    -   *Logic:* If an employee has >2 "Negative" parent reviews.
    -   *Action:* Assigns "Advanced Patient Communication".

## 2. 📚 Learning Management System (LMS)
-   **Model:** Uses the robust `Training` model.
-   **Self-Paced:** Employees can login, see their "Assigned Courses", and mark them complete.
-   **Integration:** Completion is recorded in their HR profile.

## 3. API Usage

### Run Skill Gap Analysis
```http
POST /api/training-smart/analyze-gaps
```
**Response:**
```json
{
  "assigned": 5,
  "details": [
    { "name": "Nurse Mary", "reason": "Poor Documentation" },
    { "name": "Dr. John", "reason": "Negative Feedback" }
  ]
}
```

### Employee View (My Courses)
```http
GET /api/training-smart/my-courses
```

### Complete a Course
```http
PUT /api/training-smart/complete/COURSE_ID
```

This ensures the staff is **Constantly Improving** based on real-world data.
