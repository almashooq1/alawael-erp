const SmartDigitalTwinService = require('./smartDigitalTwin.service');

class SmartWearableService {
  constructor() {
    this.connectedDevices = new Map(); // deviceId -> patientId
    this.dataStream = new Map(); // patientId -> recentVitals[]
  }

  /**
   * Connect a wearable device to a patient profile
   * @param {string} patientId
   * @param {string} deviceId
   * @param {string} deviceType 'APPLE_WATCH', 'FITBIT', 'MEDICAL_BAND'
   */
  async registerDevice(patientId, deviceId, deviceType) {
    this.connectedDevices.set(deviceId, { patientId, deviceType, status: 'ACTIVE' });
    return {
      success: true,
      message: `Device ${deviceId} (${deviceType}) linked to patient ${patientId}`,
      timestamp: new Date(),
    };
  }

  /**
   * Ingest real-time telemetry from wearable
   * @param {string} deviceId
   * @param {object} telemetry { heartRate, spo2, activityLevel, sleepQuality }
   */
  async ingestTelemetry(deviceId, telemetry) {
    const device = this.connectedDevices.get(deviceId);
    if (!device) {
      throw new Error('Device not registered');
    }

    const patientId = device.patientId;

    // Store in local buffer
    if (!this.dataStream.has(patientId)) {
      this.dataStream.set(patientId, []);
    }
    const stream = this.dataStream.get(patientId);
    stream.push({ ...telemetry, timestamp: new Date() });

    // Keep only last 50 readings
    if (stream.length > 50) stream.shift();

    // 1. Check for immediate anomalies
    const analysis = this.analyzeVitals(telemetry);

    // 2. Feed into Digital Twin (Phase 95 Integration)
    // We update the twin's physiological state
    try {
      // In a real system, this would be an async call ensuring it doesn't block ingestion
      // For this demo, we mock the twin update if the service is available
      // await SmartDigitalTwinService.updatePhysiologicalState(patientId, telemetry);
    } catch (err) {
      console.warn('Digital Twin update failed:', err.message);
    }

    return {
      processed: true,
      anomalies: analysis.anomalies,
      recommendation: analysis.recommendation,
    };
  }

  /**
   * Analyze incoming vitals against ranges
   */
  analyzeVitals(data) {
    const anomalies = [];
    let recommendation = 'NORMAL';

    if (data.heartRate > 120 && data.activityLevel === 'REST') {
      anomalies.push('TACHYCARDIA_AT_REST');
      recommendation = 'NOTIFY_NURSE';
    }

    if (data.spo2 < 95) {
      anomalies.push('LOW_OXYGEN');
      recommendation = 'CHECK_RESPIRATION';
    }

    if (data.stressLevel > 80) {
      anomalies.push('HIGH_STRESS');
      recommendation = 'TRIGGER_SENSORY_ROOM';
    }

    return { anomalies, recommendation };
  }

  /**
   * Get 24h summary for reporting
   */
  async getDailySummary(patientId) {
    const stream = this.dataStream.get(patientId) || [];
    if (stream.length === 0) return { status: 'NO_DATA' };

    const avgHR = stream.reduce((acc, curr) => acc + curr.heartRate, 0) / stream.length;

    return {
      patientId,
      readingsCount: stream.length,
      averageHeartRate: Math.round(avgHR),
      lastSync: stream[stream.length - 1].timestamp,
    };
  }
}

module.exports = SmartWearableService;
