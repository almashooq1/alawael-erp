'use strict';
/**
 * FacilityManager Service — Pure Business Logic
 * Singleton export — use directly, do NOT call `new`.
 * Models: ../models/DddFacilityManager.js
 */

const {
  DDDBuilding,
  DDDFloor,
  DDDRoom,
  DDDFacilityInspection,
  BUILDING_TYPES,
  BUILDING_STATUSES,
  ROOM_TYPES,
  ROOM_STATUSES,
  ACCESSIBILITY_FEATURES,
  INSPECTION_TYPES,
  BUILTIN_BUILDINGS,
} = require('../models/DddFacilityManager');

const BaseCrudService = require('./base/BaseCrudService');

class FacilityManager extends BaseCrudService {
  constructor() {
    super('FacilityManager', {
      description: 'Building & facility management for rehabilitation centres',
      version: '1.0.0',
    }, {
      buildings: DDDBuilding,
      floors: DDDFloor,
      rooms: DDDRoom,
      facilityInspections: DDDFacilityInspection,
    })
  }

  async initialize() {
    await this._seedBuildings();
    this.log('Facility Manager initialised ✓');
    return true;
  }

  async _seedBuildings() {
    for (const b of BUILTIN_BUILDINGS) {
      const exists = await DDDBuilding.findOne({ code: b.code }).lean();
      if (!exists) await DDDBuilding.create({ ...b, status: 'operational', totalFloors: b.floors });
    }
  }

  /* ── Buildings CRUD ── */
  async listBuildings(filters = {}) {
    const q = {};
    if (filters.type) q.type = filters.type;
    if (filters.status) q.status = filters.status;
    return DDDBuilding.find(q).sort({ name: 1 }).lean();
  }
  async getBuilding(id) { return this._getById(DDDBuilding, id); }
  async createBuilding(data) { return this._create(DDDBuilding, data); }
  async updateBuilding(id, data) { return this._update(DDDBuilding, id, data, { runValidators: true }); }

  /* ── Floors CRUD ── */
  async listFloors(buildingId) {
    return DDDFloor.find({ buildingId }).sort({ floorNumber: 1 }).lean();
  }
  async getFloor(id) { return this._getById(DDDFloor, id); }
  async createFloor(data) { return this._create(DDDFloor, data); }
  async updateFloor(id, data) { return this._update(DDDFloor, id, data, { runValidators: true }); }

  /* ── Rooms CRUD ── */
  async listRooms(filters = {}) {
    const q = {};
    if (filters.buildingId) q.buildingId = filters.buildingId;
    if (filters.floorId) q.floorId = filters.floorId;
    if (filters.type) q.type = filters.type;
    if (filters.status) q.status = filters.status;
    if (filters.isBookable !== undefined) q.isBookable = filters.isBookable;
    return DDDRoom.find(q).sort({ roomNumber: 1 }).lean();
  }
  async getRoom(id) { return this._getById(DDDRoom, id); }
  async createRoom(data) { return this._create(DDDRoom, data); }
  async updateRoom(id, data) { return this._update(DDDRoom, id, data, { runValidators: true }); }
  async updateRoomStatus(id, status) {
    return DDDRoom.findByIdAndUpdate(id, { status }, { new: true }).lean();
  }

  /* ── Inspections CRUD ── */
  async listInspections(filters = {}) {
    const q = {};
    if (filters.buildingId) q.buildingId = filters.buildingId;
    if (filters.type) q.type = filters.type;
    if (filters.status) q.status = filters.status;
    return DDDFacilityInspection.find(q).sort({ scheduledDate: -1 }).lean();
  }
  async getInspection(id) { return this._getById(DDDFacilityInspection, id); }
  async createInspection(data) { return this._create(DDDFacilityInspection, data); }
  async completeInspection(id, data) {
    return DDDFacilityInspection.findByIdAndUpdate(
      id,
      {
        ...data,
        status: 'completed',
        completedDate: new Date(),
      },
      { new: true, runValidators: true }
    ).lean();
  }

  /* ── Analytics ── */
  async getFacilityAnalytics() {
    const [buildings, floors, rooms, inspections] = await Promise.all([
      DDDBuilding.countDocuments(),
      DDDFloor.countDocuments(),
      DDDRoom.countDocuments(),
      DDDFacilityInspection.countDocuments(),
    ]);
    const operational = await DDDBuilding.countDocuments({ status: 'operational' });
    const availableRooms = await DDDRoom.countDocuments({ status: 'available' });
    const pendingInspections = await DDDFacilityInspection.countDocuments({ status: 'scheduled' });
    return {
      buildings,
      operational,
      floors,
      rooms,
      availableRooms,
      inspections,
      pendingInspections,
    };
  }
}

/* ═══════════════════ Singleton Export ═══════════════════ */
module.exports = new FacilityManager();
