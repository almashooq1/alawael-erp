# 📟 Phase 36: Smart IoT Hub (Connected Rehab)

**Date:** 2026-01-16
**Status:** ✅ Implemented

Rehabilitation is physical. The system now connects to physical devices.

## 1. 🏥 Automated Vitals (Wearables)

Integrates with smartwatches or medical bands provided to patients during sessions.

- **Scenario:** Patient running on treadmill.
- **Trigger:** Heart rate spikes > 120 bpm.
- **System Action:** Alert appears on Therapist's iPad: _"Slow down intensity. HR Alert."_

## 2. 🆔 Contactless Check-in (NFC)

RFID/NFC Kiosks at the entrance (Gym Style).

- **Action:** Patient taps bracelet at the gate.
- **System:**
  1.  Checks appointment today?
  2.  Voice Greeting: _"Welcome Omar. Go to Room 3."_
  3.  Marks "Attended" in EMR automatically.

## 3. API Usage

```http
POST /api/iot-smart/nfc-scan
{ "tagId": "ABC-123" }
```

**Response:**

```json
{
  "action": "CHECK_IN_SUCCESS",
  "voicePrompt": "Welcome back..."
}
```

Eliminates the "Reception Bottleneck".
