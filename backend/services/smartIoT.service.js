class SmartIoTService {
  /**
   * Process Incoming Vitals Data from Wearables
   * Integrates with Apple Health / Fitbit / Medical Devices
   */
  static async processVitalData(deviceId, payload) {
    // Mock payload: { heartRate: 85, steps: 500, timestamp: ... }

    console.log(`[IoT] Received data from Device ${deviceId}`);

    // 1. Threshold Alerting
    const alerts = [];
    if (payload.heartRate > 120) {
      alerts.push({ type: 'HIGH_HEART_RATE', value: payload.heartRate, msg: 'Patient seems stressed.' });
    }
    if (payload.oxygenSaturation && payload.oxygenSaturation < 95) {
      alerts.push({ type: 'LOW_O2', value: payload.oxygenSaturation, msg: 'Check breathing.' });
    }

    // 2. Auto-Log to Patient File (Phase 24 EMR)
    // In real app: await EMR.updateVitals(patientId, payload);

    return {
      status: 'PROCESSED',
      alerts: alerts,
      savedToRecord: true,
    };
  }

  /**
   * RFID / NFC Auto Check-in
   * Used at the center entrance for automated attendance
   */
  static async handleNfcScan(tagId, locationId) {
    // Mock Tag Lookup
    // const patient = await Patient.findOne({ nfcTag: tagId });

    const mockPatient = { id: '123', name: 'Omar', nextSession: '14:00' };

    // Logic:
    // 1. Check if session exists today
    // 2. Mark status = 'ARRIVED'
    // 3. Notify Therapist "Patient is in waiting room"

    // Return Voice Prompt for the Kiosk
    if (mockPatient.nextSession) {
      return {
        action: 'CHECK_IN_SUCCESS',
        voicePrompt: `Welcome back Omar. Your session with Dr. Sarah is at 2 PM. Please head to Room A.`,
        notifyStaff: true,
      };
    } else {
      return {
        action: 'DENIED',
        voicePrompt: `Hello Omar. You do not have a scheduled session today. Please visit reception.`,
        notifyStaff: false,
      };
    }
  }
}

module.exports = SmartIoTService;
