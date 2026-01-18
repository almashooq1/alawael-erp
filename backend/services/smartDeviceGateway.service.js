/**
 * PHASE 110: Smart Device Gateway (External API Integration)
 * "The Universal Translator" - Standardizes data from external health platforms.
 *
 * Supports:
 * - Fitbit Web API (Mocked)
 * - Apple HealthKit (JSON export format)
 * - Google Fit (REST API Mock)
 */

class SmartDeviceGatewayService {
  constructor() {
    console.log('System: Smart Device Gateway - Initialized');
    this.deviceDataStore = new Map(); // patientId -> standardizedData
  }

  /**
   * Process incoming webhook from Fitbit
   * @param {string} patientId
   * @param {Object} rawData
   */
  async processFitbitWebHook(patientId, rawData) {
    // Fitbit Format: { activities: [{ heartRate: [ { value: 72 } ], steps: 1200 }] }
    console.log(`[Gateway] Processing Fitbit data for ${patientId}...`);

    // Normalize
    const standardized = {
      source: 'FITBIT',
      timestamp: new Date(),
      heartRate: rawData.activities[0].heartRate[0].value,
      steps: rawData.activities[0].steps,
      batteryLevel: 'HIGH', // Mock
    };

    this._updateStore(patientId, standardized);
    return { status: 'SYNCED', data: standardized };
  }

  /**
   * Process upload from Apple Health (iPhone App)
   * @param {string} patientId
   * @param {Object} rawData
   */
  async processAppleHealthUpload(patientId, rawData) {
    // Apple Format: { metrics: { bpm: 74, stepCount: 1500, flightsClimbed: 2 } }
    console.log(`[Gateway] Processing Apple Health data for ${patientId}...`);

    const standardized = {
      source: 'APPLE_HEALTH',
      timestamp: new Date(),
      heartRate: rawData.metrics.bpm,
      steps: rawData.metrics.stepCount,
      floors: rawData.metrics.flightsClimbed,
    };

    this._updateStore(patientId, standardized);
    return { status: 'SYNCED', data: standardized };
  }

  _updateStore(patientId, data) {
    // In a real system, this would push to Kafka or Update MongoDB
    // Here, we update the in-memory cache that Phase 101 reads from
    this.deviceDataStore.set(patientId, data);

    // Notify Command Center (console log for simulation)
    console.log(`[Gateway] -> [Command Center]: New Vitals Pushed for ${patientId}`);
  }

  // Exposed for Phase 101 to read if needed, though usually Phase 101 pulls.
  getLatestDeviceData(patientId) {
    return this.deviceDataStore.get(patientId) || null;
  }
}

module.exports = SmartDeviceGatewayService;
