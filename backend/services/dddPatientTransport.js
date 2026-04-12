'use strict';
/**
 * PatientTransport Service — Pure Business Logic
 * Singleton export — use directly, do NOT call `new`.
 * Models: ../models/DddPatientTransport.js
 */

const {
  DDDTransportRequest,
  DDDTripRecord,
  DDDAccessibilityNeed,
  DDDMedicalEscort,
  REQUEST_STATUSES,
  TRIP_TYPES,
  ACCESSIBILITY_TYPES,
  ESCORT_TYPES,
  CANCELLATION_REASONS,
  TRIP_PRIORITIES,
  BUILTIN_ACCESSIBILITY_PROFILES,
} = require('../models/DddPatientTransport');

const BaseCrudService = require('./base/BaseCrudService');

class PatientTransport extends BaseCrudService {
  constructor() {
    super('PatientTransport', {
      description: 'Patient-specific transport requests & trip management',
      version: '1.0.0',
    }, {
      transportRequests: DDDTransportRequest,
      tripRecords: DDDTripRecord,
      accessibilityNeeds: DDDAccessibilityNeed,
      medicalEscorts: DDDMedicalEscort,
    })
  }

  async initialize() {
    this.log('Patient Transport initialised ✓');
    return true;
  }

  /* ── Requests ── */
  async listRequests(filters = {}) {
    const q = {};
    if (filters.beneficiaryId) q.beneficiaryId = filters.beneficiaryId;
    if (filters.status) q.status = filters.status;
    if (filters.tripType) q.tripType = filters.tripType;
    return DDDTransportRequest.find(q).sort({ scheduledDate: -1 }).limit(100).lean();
  }
  async getRequest(id) { return this._getById(DDDTransportRequest, id); }
  async createRequest(data) {
    if (!data.requestCode) data.requestCode = `TREQ-${Date.now()}`;
    return DDDTransportRequest.create(data);
  }
  async updateRequest(id, data) { return this._update(DDDTransportRequest, id, data); }
  async cancelRequest(id, reason) {
    return DDDTransportRequest.findByIdAndUpdate(
      id,
      { status: 'cancelled', cancellationReason: reason },
      { new: true }
    ).lean();
  }

  /* ── Trip Records ── */
  async listTrips(filters = {}) {
    const q = {};
    if (filters.beneficiaryId) q.beneficiaryId = filters.beneficiaryId;
    if (filters.driverId) q.driverId = filters.driverId;
    if (filters.status) q.status = filters.status;
    return DDDTripRecord.find(q).sort({ pickupTime: -1 }).limit(100).lean();
  }
  async startTrip(data) {
    if (!data.tripCode) data.tripCode = `TRIP-${Date.now()}`;
    data.status = 'in_progress';
    data.actualPickupTime = new Date();
    return DDDTripRecord.create(data);
  }
  async completeTrip(id, details) {
    return DDDTripRecord.findByIdAndUpdate(
      id,
      { ...details, status: 'completed', actualDropoffTime: new Date() },
      { new: true }
    ).lean();
  }

  /* ── Accessibility ── */
  async listAccessibilityNeeds(beneficiaryId) {
    const q = beneficiaryId ? { beneficiaryId } : {};
    return DDDAccessibilityNeed.find(q).lean();
  }
  async setAccessibilityNeed(data) {
    if (!data.code) data.code = `ACCN-${Date.now()}`;
    return DDDAccessibilityNeed.create(data);
  }
  async updateAccessibilityNeed(id, data) { return this._update(DDDAccessibilityNeed, id, data); }

  /* ── Escorts ── */
  async listEscorts(filters = {}) {
    const q = {};
    if (filters.status) q.status = filters.status;
    return DDDMedicalEscort.find(q).sort({ assignedAt: -1 }).lean();
  }
  async assignEscort(data) {
    if (!data.escortCode) data.escortCode = `ESC-${Date.now()}`;
    return DDDMedicalEscort.create(data);
  }

  /* ── Analytics ── */
  async getPatientTransportAnalytics() {
    const [requests, trips, escorts] = await Promise.all([
      DDDTransportRequest.countDocuments(),
      DDDTripRecord.countDocuments(),
      DDDMedicalEscort.countDocuments(),
    ]);
    const pendingRequests = await DDDTransportRequest.countDocuments({ status: 'pending' });
    const activeTrips = await DDDTripRecord.countDocuments({ status: 'in_progress' });
    return { requests, trips, escorts, pendingRequests, activeTrips };
  }
}

/* ═══════════════════ Singleton Export ═══════════════════ */
module.exports = new PatientTransport();
