# 📄 Phase 29: AI Referral Processing (OCR)

**Date:** 2026-01-16
**Status:** ✅ Implemented

The center receives dozens of PDF referral letters daily from hospitals.
The **Smart Referral Engine** reads these documents automatically.

## 1. 👁️ Computer Vision (OCR)

The system scans uploaded `PDF` or `JPG` files to extract:

- **Patient Name**
- **Diagnosis** (e.g., "Autism Spectrum Disorder")
- **Recommended Frequency** (e.g., "OT 2x/week")
- **Referring Doctor**

## 2. ⚡ Workflow

1.  Receptionist drags & drops the Hospital Report.
2.  **AI Analysis:** "Confidence 92%".
3.  **Auto-Fill:** The "New Patient" form is pre-filled with the extracted data.
4.  **Save Time:** Reduces data entry time from 10 minutes to 30 seconds.

## 3. API Usage

```http
POST /api/referral-smart/analyze
Content-Type: multipart/form-data; boundary=---
```

**Response:**

```json
{
  "success": true,
  "data": {
    "patientName": "Ahmed Mohammed (Detected)",
    "diagnosis": "Cerebral Palsy",
    "recommendedTherapy": ["Physiotherapy (3x/week)"]
  }
}
```

This acts as the "Intelligent Entry Door" for the ERP.
