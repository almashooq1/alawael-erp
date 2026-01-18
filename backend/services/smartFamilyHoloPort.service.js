/**
 * PHASE 106: Smart Family Holo-Port
 * "The Living Room" - A shared Virtual Reality space where patients and families
 * can interact optimally despite physical distance.
 * Features: Spatial Audio, Avatar Sync, and Shared Activities.
 */

const SmartVRService = require('./smartVR.service');

class SmartFamilyHoloPortService {
  constructor() {
    console.log('System: Smart Family Holo-Port - Initialized');
    this.activeRooms = new Map(); // roomId -> { participants: [], activity: null }
  }

  /**
   * Creates a secure holographic room for a family.
   * @param {string} patientId
   * @param {string[]} familyMemberIds
   */
  async createFamilyRoom(patientId, familyMemberIds) {
    const roomId = `HOLO_ROOM_${patientId}_${Date.now()}`;

    // Configuration for the shared space
    // 'COZY_LIVING_ROOM' is a calming, familiar environment
    const roomConfig = {
      roomId,
      environment: 'COZY_LIVING_ROOM',
      maxParticipants: familyMemberIds.length + 1,
      features: ['SPATIAL_AUDIO', 'FULL_BODY_AVATARS', 'SHARED_MEDIA_WALL'],
      security: 'E2E_ENCRYPTED',
    };

    this.activeRooms.set(roomId, {
      host: patientId,
      participants: [],
      status: 'WAITING_FOR_MEMBERS',
    });

    return roomConfig;
  }

  /**
   * Joins a participant to the room (simulating handshake).
   */
  async joinRoom(roomId, userId, role) {
    if (!this.activeRooms.has(roomId)) throw new Error('Room not found');

    const room = this.activeRooms.get(roomId);
    room.participants.push({ userId, role, joinedAt: new Date() });

    if (room.participants.length > 1) {
      room.status = 'ACTIVE';
    }

    return {
      status: 'JOINED',
      currentParticipants: room.participants.length,
    };
  }

  /**
   * Starts a shared interaction activity
   * @param {string} roomId
   * @param {string} activityType - 'PHOTO_ALBUM', 'BOARD_GAME', 'MOVIE_NIGHT'
   */
  async startSharedActivity(roomId, activityType) {
    if (!this.activeRooms.has(roomId)) throw new Error('Room not found');

    const room = this.activeRooms.get(roomId);
    room.activity = activityType;

    // Integration with Phase 104 VR service to sync environments
    // This is a mock call representing the complex netcode
    return {
      event: 'ACTIVITY_STARTED',
      payload: {
        type: activityType,
        syncTimestamp: Date.now(),
      },
    };
  }
}

module.exports = SmartFamilyHoloPortService;
