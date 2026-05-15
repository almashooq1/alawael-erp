/**
 * Public parent-tracking endpoint — Phase D
 *
 * Mounted outside /transport-module/ so it bypasses the authenticate
 * middleware. Access is gated by an HMAC-signed token that expires in 6h.
 *
 *   GET /api/v1/track/:token   → live trip status + vehicle position
 *
 * No PII beyond first-name initials and the next-stop ETA is exposed.
 */
'use strict';

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const Trip = require('../models/transport/Trip');
const Vehicle = require('../models/transport/Vehicle');
const GpsTracking = require('../models/transport/GpsTracking');
const {
  verifyTrackingToken,
  computeLiveEta,
} = require('../services/transport/smartTransport.service');

let createCustomLimiter;
try {
  ({ createCustomLimiter } = require('../middleware/rateLimiter'));
} catch {
  createCustomLimiter = () => (_req, _res, next) => next();
}

const TRACKING_TOKEN_SECRET =
  process.env.TRANSPORT_TRACKING_SECRET || 'transport-tracking-default-rotate-me';

const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// 30 reads / minute / token — enough for a 2s polling page
const publicTrackLimiter = createCustomLimiter({
  windowMs: 60 * 1000,
  max: 30,
  prefix: 'rl:track:',
  keyGenerator: req => req.params?.token || req.ip || 'anon',
});

function initialsOnly(fullName) {
  if (!fullName || typeof fullName !== 'string') return '—';
  const parts = fullName.trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map(p => p.charAt(0))
    .join('. ');
}

router.get(
  '/:token',
  publicTrackLimiter,
  asyncHandler(async (req, res) => {
    const claims = verifyTrackingToken(req.params.token, TRACKING_TOKEN_SECRET);
    if (!claims) {
      return res.status(401).json({ success: false, message: 'الرابط منتهي أو غير صحيح' });
    }

    if (!mongoose.Types.ObjectId.isValid(claims.tripId)) {
      return res.status(400).json({ success: false, message: 'معرف الرحلة غير صالح' });
    }

    const trip = await Trip.findOne({ _id: claims.tripId, deleted_at: null })
      .populate('vehicle_id', 'license_plate vehicle_type')
      .populate({ path: 'route_id', select: 'waypoints route_name_ar' })
      .populate('passengers.beneficiary_id', 'full_name_ar')
      .lean();

    if (!trip) {
      return res.status(404).json({ success: false, message: 'الرحلة غير موجودة' });
    }

    const lastGps = await GpsTracking.findOne({ vehicle_id: trip.vehicle_id?._id })
      .sort({ timestamp: -1 })
      .select('latitude longitude speed heading timestamp')
      .lean();

    const visitedIds = (trip.passengers || [])
      .filter(p => p.status === 'picked_up' || p.status === 'dropped_off')
      .map(p => String(p.beneficiary_id?._id || p.beneficiary_id));

    const eta = lastGps
      ? computeLiveEta(
          { latitude: lastGps.latitude, longitude: lastGps.longitude },
          trip.route_id?.waypoints || [],
          visitedIds
        )
      : [];

    res.json({
      success: true,
      data: {
        trip_number: trip.trip_number,
        trip_type: trip.trip_type,
        status: trip.status,
        route_name: trip.route_id?.route_name_ar || null,
        vehicle: {
          license_plate: trip.vehicle_id?.license_plate || '—',
          type: trip.vehicle_id?.vehicle_type || null,
        },
        position: lastGps
          ? {
              latitude: lastGps.latitude,
              longitude: lastGps.longitude,
              speed: lastGps.speed,
              heading: lastGps.heading,
              timestamp: lastGps.timestamp,
            }
          : null,
        passengers_summary: {
          total: trip.passengers?.length || 0,
          picked_up: trip.picked_up_count || 0,
          remaining: (trip.passengers?.length || 0) - (trip.picked_up_count || 0),
        },
        next_stops: eta.slice(0, 5).map(s => ({
          order: s.order,
          name_initials: initialsOnly(
            (trip.passengers || []).find(
              p => String(p.beneficiary_id?._id || p.beneficiary_id) === String(s.beneficiary_id)
            )?.beneficiary_id?.full_name_ar
          ),
          live_eta: s.live_eta,
          scheduled_time: s.scheduled_time,
          delay_minutes: s.delay_minutes,
        })),
        expires_at: claims.expiresAt,
      },
    });
  })
);

module.exports = router;
