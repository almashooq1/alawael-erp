/**
 * Smart Environment & IoT Control Service (Phase 77)
 *
 * Manages the physical environment of the center, specifically:
 * 1. Therapeutic Sensory Rooms (Snoezelen) - Adjusting lights/sound for therapy.
 * 2. Energy Efficiency - Turning off AC in empty therapy rooms.
 */

class SmartEnvironmentService {
  constructor() {
    // Mock State of Rooms
    this.roomStates = new Map();
    this.roomStates.set('SENSORY-01', { light: 'BLUE', intensity: 50, sound: 'OCEAN', status: 'ACTIVE' });
  }

  /**
   * Apply a "Sensory Profile" to a room
   * e.g., "Calm Down" mode for an agitated child
   */
  async setRoomProfile(roomId, profileType) {
    console.log(`Setting room ${roomId} to profile ${profileType}`);

    const profiles = {
      CALM: { light: 'SOFT_BLUE', sound: 'WHITE_NOISE', projection: 'STARS' },
      ALERT: { light: 'BRIGHT_ORANGE', sound: 'UPBEAT_MUSIC', projection: 'JUNGLE' },
      FOCUS: { light: 'WHITE', sound: 'NONE', projection: 'NONE' },
    };

    const settings = profiles[profileType] || profiles['CALM'];

    // In real life, this sends MQTT/Zigbee signals to hardware
    this.roomStates.set(roomId, { ...settings, status: 'ACTIVE', lastUpdate: new Date() });

    return {
      roomId,
      appliedProfile: profileType,
      settings,
      hardwareAck: 'OK',
    };
  }

  /**
   * Get IoT Sensor Data (Temperature, Air Quality)
   * Critical for sensitive patients (e.g., Asthma)
   */
  async getRoomConditions(roomId) {
    // Mock sensor data
    return {
      roomId,
      temperature: 22.5, // Celsius
      humidity: 45,
      co2Level: 450, // ppm
      airQuality: 'EXCELLENT',
      occupancy: true, // Motion sensor
    };
  }

  /**
   * Energy Optimization Analysis
   * "Turn off Room 104 - It has been empty for 45 mins"
   */
  async optimizeEnergy() {
    return {
      timestamp: new Date(),
      actionsTaken: [
        { room: 'ROOM-104', action: 'AC_OFF', reason: 'Empty for > 30mins', savings: '2.5 kWh' },
        { room: 'HALLWAY-B', action: 'DIM_LIGHTS', reason: 'No motion detected', savings: '0.8 kWh' },
      ],
      totalSavingsEst: '3.3 kWh',
    };
  }
}

module.exports = SmartEnvironmentService;
