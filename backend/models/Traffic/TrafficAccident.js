'use strict';

/**
 * TrafficAccident — Saudi traffic accident record (الحوادث المرورية).
 *
 * Schema migrated from `backend/vehicles/saudi-traffic-service.js` to this
 * canonical location per the empty-shim pattern documented in
 * `docs/architecture/canonical-location-pattern.md` §"Exception: the
 * empty-shim pattern" (Cycle 6 TIER2_AUDIT). The previous file here was a
 * `strict:false` placeholder; the rich schema lived in the service.
 *
 * Callers that previously did `connection.model('TrafficAccident', schema)`
 * inside the service now do `mongoose.model('TrafficAccident')` lookup
 * against this canonical schema.
 */

const mongoose = require('mongoose');

const ACCIDENT_STATUS_TYPES = ['pending', 'investigating', 'resolved', 'disputed'];

const TrafficAccidentSchema = new mongoose.Schema(
  {
    // معرف الحادث
    accidentId: { type: String, unique: true },
    accidentNumber: String,

    // الموقع والتاريخ
    location: {
      road: String,
      city: String,
      region: String,
      coordinates: { lat: Number, lng: Number },
      landmark: String,
    },
    dateTime: Date,

    // الظروف
    circumstances: {
      weather: { type: String, enum: ['clear', 'cloudy', 'rain', 'fog', 'dust'] },
      roadCondition: { type: String, enum: ['dry', 'wet', 'sandy', 'damaged'] },
      lighting: { type: String, enum: ['daylight', 'night_lit', 'night_unlit', 'dawn_dusk'] },
      trafficCondition: { type: String, enum: ['light', 'moderate', 'heavy', 'congested'] },
    },

    // المركبات المتضررة
    vehicles: [
      {
        plateNumber: String,
        plateLetters: String,
        region: String,
        ownerName: String,
        driverName: String,
        driverNationalId: String,
        damage: {
          severity: { type: String, enum: ['minor', 'moderate', 'severe', 'total'] },
          description: String,
          estimatedCost: Number,
          photos: [String],
        },
        insurance: {
          company: String,
          policyNumber: String,
          claimNumber: String,
        },
        atFault: Boolean,
        faultPercentage: Number,
      },
    ],

    // المصابين
    injuries: [
      {
        personType: { type: String, enum: ['driver', 'passenger', 'pedestrian'] },
        name: String,
        nationalId: String,
        severity: { type: String, enum: ['minor', 'moderate', 'severe', 'fatal'] },
        hospital: String,
        notes: String,
      },
    ],

    // رجال المرور
    police: {
      officerName: String,
      officerId: String,
      station: String,
      reportNumber: String,
      arrivalTime: Date,
    },

    // التقرير
    report: {
      cause: String,
      description: String,
      diagram: String,
      photos: [String],
      witnessStatements: [
        {
          witnessName: String,
          statement: String,
          date: Date,
        },
      ],
    },

    // الحالة
    status: {
      type: String,
      enum: ACCIDENT_STATUS_TYPES,
      default: 'pending',
    },

    // الحل
    resolution: {
      type: { type: String, enum: ['amicable', 'police', 'insurance', 'court'] },
      date: Date,
      details: String,
      totalCompensation: Number,
    },

    // Tenant
    tenantId: String,

    // Timestamps
    createdAt: { type: Date, default: Date.now },
    updatedAt: Date,
  },
  {
    collection: 'traffic_accidents',
  }
);

module.exports =
  mongoose.models.TrafficAccident || mongoose.model('TrafficAccident', TrafficAccidentSchema);
module.exports.ACCIDENT_STATUS_TYPES = ACCIDENT_STATUS_TYPES;
