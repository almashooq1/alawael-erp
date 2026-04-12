'use strict';
/**
 * SpaceManagement Service — Pure Business Logic
 * Singleton export — use directly, do NOT call `new`.
 * Models: ../models/DddSpaceManagement.js
 */

const {
  DDDFacilitySpace,
  DDDRoomBooking,
  DDDUtilizationRecord,
  DDDSpaceMaintenanceReq,
  SPACE_TYPES,
  SPACE_STATUSES,
  BOOKING_STATUSES,
  ACCESSIBILITY_FEATURES,
  AMENITIES,
  FLOOR_LEVELS,
  BUILTIN_ROOM_TEMPLATES,
} = require('../models/DddSpaceManagement');

const BaseCrudService = require('./base/BaseCrudService');

class SpaceManagement extends BaseCrudService {
  constructor() {
    super('SpaceManagement', {}, {
      facilitySpaces: DDDFacilitySpace,
      roomBookings: DDDRoomBooking,
      utilizationRecords: DDDUtilizationRecord,
      spaceMaintenanceReqs: DDDSpaceMaintenanceReq,
    });
  }

  async createSpace(data) { return this._create(DDDFacilitySpace, data); }
  async listSpaces(filter = {}, page = 1, limit = 20) { return this._list(DDDFacilitySpace, filter, { page: page, limit: limit, sort: { createdAt: -1 } }); }
  async updateSpace(id, data) { return this._update(DDDFacilitySpace, id, data); }

  async createBooking(data) { return this._create(DDDRoomBooking, data); }
  async listBookings(filter = {}, page = 1, limit = 20) { return this._list(DDDRoomBooking, filter, { page: page, limit: limit, sort: { startTime: -1 } }); }

  async recordUtilization(data) { return this._create(DDDUtilizationRecord, data); }
  async listUtilization(filter = {}, page = 1, limit = 30) { return this._list(DDDUtilizationRecord, filter, { page: page, limit: limit, sort: { date: -1 } }); }

  async createMaintenanceReq(data) { return this._create(DDDSpaceMaintenanceReq, data); }
  async listMaintenanceReqs(filter = {}, page = 1, limit = 20) { return this._list(DDDSpaceMaintenanceReq, filter, { page: page, limit: limit, sort: { requestedAt: -1 } }); }

  async getSpaceStats() {
    const [spaces, bookings, openReqs, utilRecs] = await Promise.all([
      DDDFacilitySpace.countDocuments({ status: 'available' }),
      DDDRoomBooking.countDocuments({ status: 'confirmed' }),
      DDDSpaceMaintenanceReq.countDocuments({ status: 'open' }),
      DDDUtilizationRecord.countDocuments(),
    ]);
    return {
      availableSpaces: spaces,
      confirmedBookings: bookings,
      openMaintenanceReqs: openReqs,
      utilizationRecords: utilRecs,
    };
  }
}

/* ═══════════════════ Singleton Export ═══════════════════ */
module.exports = new SpaceManagement();
