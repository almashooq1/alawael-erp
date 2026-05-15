/**
 * Smart Transport helpers — Phase B+C+D
 *
 * Single source of truth for:
 *  - Geofence proximity detection (driver "is at the stop" check)
 *  - Navigation deep-links (Waze + Google Maps + Apple Maps)
 *  - Live ETA recomputation from current GPS position
 *  - Public tracking-token signing + verification
 *
 * No DB I/O in this module — pure functions only, easy to unit-test.
 */
'use strict';

const crypto = require('crypto');
const {
  haversineDistance,
  haversineDistanceMeters,
  calculateEstimatedTimes,
  DEFAULT_CITY_SPEED_KMH,
  DEFAULT_STOP_DURATION_MINUTES,
} = require('./routeOptimization.service');

const GEOFENCE_RADIUS_METERS = 75; // driver is "at the stop" if within 75m
const TRACKING_TOKEN_TTL_HOURS = 6;

/**
 * Find the nearest unvisited waypoint to the given GPS position.
 * Returns { waypoint, distanceMeters, withinGeofence } or null.
 *
 * @param {{latitude: number, longitude: number}} gps
 * @param {Array<{order, lat, lng, beneficiary_id?, status?}>} waypoints
 * @param {Array<string>} visitedBeneficiaryIds - ids already picked/dropped
 * @param {number} [radiusMeters=GEOFENCE_RADIUS_METERS]
 */
function nearestUnvisitedWaypoint(
  gps,
  waypoints,
  visitedBeneficiaryIds = [],
  radiusMeters = GEOFENCE_RADIUS_METERS
) {
  if (!gps || !Array.isArray(waypoints) || waypoints.length === 0) return null;
  const visited = new Set(visitedBeneficiaryIds.map(String));

  let best = null;
  for (const wp of waypoints) {
    if (wp.lat == null || wp.lng == null) continue;
    if (wp.beneficiary_id && visited.has(String(wp.beneficiary_id))) continue;
    const meters = haversineDistanceMeters(gps.latitude, gps.longitude, wp.lat, wp.lng);
    if (!best || meters < best.distanceMeters) {
      best = { waypoint: wp, distanceMeters: Math.round(meters) };
    }
  }

  if (!best) return null;
  return { ...best, withinGeofence: best.distanceMeters <= radiusMeters };
}

/**
 * Build a list of navigation deep-links the driver app can hand off to native apps.
 * Each waypoint gets Waze + Google Maps + Apple Maps URIs.
 *
 * @param {Array<{lat, lng, address?, order}>} waypoints
 */
function buildNavigationLinks(waypoints) {
  if (!Array.isArray(waypoints)) return [];
  return waypoints
    .filter(wp => wp.lat != null && wp.lng != null)
    .map(wp => ({
      order: wp.order,
      lat: wp.lat,
      lng: wp.lng,
      address: wp.address || null,
      waze: `https://waze.com/ul?ll=${wp.lat},${wp.lng}&navigate=yes`,
      google: `https://www.google.com/maps/dir/?api=1&destination=${wp.lat},${wp.lng}&travelmode=driving`,
      apple: `https://maps.apple.com/?daddr=${wp.lat},${wp.lng}&dirflg=d`,
      geo: `geo:${wp.lat},${wp.lng}?q=${wp.lat},${wp.lng}`,
    }));
}

/**
 * Build a Google Maps "multi-stop directions" URL covering the whole route.
 * Limit is 9 waypoints (Google's hard cap besides origin/destination).
 */
function buildMultiStopGoogleMapsUrl(origin, waypoints) {
  if (!origin || !Array.isArray(waypoints) || waypoints.length === 0) return null;
  const valid = waypoints.filter(w => w.lat != null && w.lng != null).slice(0, 10);
  if (valid.length === 0) return null;

  const destination = valid[valid.length - 1];
  const inBetween = valid.slice(0, -1);

  const params = new URLSearchParams({
    api: '1',
    origin: `${origin.latitude},${origin.longitude}`,
    destination: `${destination.lat},${destination.lng}`,
    travelmode: 'driving',
  });
  if (inBetween.length > 0) {
    params.set('waypoints', inBetween.map(w => `${w.lat}|${w.lng}`).join(''));
  }
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

/**
 * Recompute ETA for each remaining stop given the vehicle's current GPS position.
 * Visited stops are excluded from the projection.
 *
 * @param {{latitude, longitude}} currentGps
 * @param {Array<{order, lat, lng, beneficiary_id?, status?, pickup_time?}>} waypoints
 * @param {Array<string>} visitedBeneficiaryIds
 * @param {string} [nowHHMM] - current time HH:MM (defaults to system clock)
 * @param {Object} [options]
 */
function computeLiveEta(currentGps, waypoints, visitedBeneficiaryIds = [], nowHHMM, options = {}) {
  if (!currentGps || !Array.isArray(waypoints)) return [];
  const visited = new Set(visitedBeneficiaryIds.map(String));
  const remaining = waypoints
    .filter(wp => wp.lat != null && wp.lng != null)
    .filter(wp => !wp.beneficiary_id || !visited.has(String(wp.beneficiary_id)))
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  if (remaining.length === 0) return [];

  const startTime =
    nowHHMM ||
    (() => {
      const d = new Date();
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    })();

  // Treat the driver's current GPS as the implicit "origin" stop for time calc.
  const points = [{ lat: currentGps.latitude, lng: currentGps.longitude, order: 0 }, ...remaining];
  const withEta = calculateEstimatedTimes(points, startTime, {
    speedKmh: options.speedKmh || DEFAULT_CITY_SPEED_KMH,
    stopDurationMinutes: options.stopDurationMinutes ?? DEFAULT_STOP_DURATION_MINUTES,
  });

  // Drop the synthetic origin and overlay computed ETA on actual waypoints.
  return withEta.slice(1).map((p, idx) => {
    const originalDelay = remaining[idx].pickup_time
      ? deltaMinutes(remaining[idx].pickup_time, p.estimatedArrival)
      : null;
    return {
      order: remaining[idx].order,
      beneficiary_id: remaining[idx].beneficiary_id,
      lat: remaining[idx].lat,
      lng: remaining[idx].lng,
      address: remaining[idx].address,
      scheduled_time: remaining[idx].pickup_time || null,
      live_eta: p.estimatedArrival,
      distance_from_prev_km: p.distanceFromPrev,
      delay_minutes: originalDelay,
    };
  });
}

function deltaMinutes(scheduledHHMM, actualHHMM) {
  if (!scheduledHHMM || !actualHHMM) return null;
  const toMin = s => {
    const [h, m] = s.split(':').map(Number);
    return h * 60 + m;
  };
  return toMin(actualHHMM) - toMin(scheduledHHMM);
}

/**
 * Sign a public tracking token for a trip. HMAC-SHA256 so we can verify
 * without a DB lookup, with a built-in expiry timestamp.
 *
 * Output format: <tripId>.<expiresAtSeconds>.<hexSig>
 */
function signTrackingToken(tripId, secret, ttlHours = TRACKING_TOKEN_TTL_HOURS) {
  if (!tripId) throw new Error('tripId required');
  if (!secret) throw new Error('secret required');
  const exp = Math.floor(Date.now() / 1000) + ttlHours * 3600;
  const body = `${tripId}.${exp}`;
  const sig = crypto.createHmac('sha256', secret).update(body).digest('hex');
  return `${body}.${sig}`;
}

function verifyTrackingToken(token, secret) {
  if (!token || typeof token !== 'string' || !secret) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [tripId, expStr, sig] = parts;
  const exp = parseInt(expStr, 10);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return null;

  const expected = crypto.createHmac('sha256', secret).update(`${tripId}.${exp}`).digest('hex');
  // Timing-safe compare
  if (sig.length !== expected.length) return null;
  const a = Buffer.from(sig, 'hex');
  const b = Buffer.from(expected, 'hex');
  if (a.length !== b.length) return null;
  if (!crypto.timingSafeEqual(a, b)) return null;
  return { tripId, expiresAt: new Date(exp * 1000) };
}

module.exports = {
  GEOFENCE_RADIUS_METERS,
  TRACKING_TOKEN_TTL_HOURS,
  nearestUnvisitedWaypoint,
  buildNavigationLinks,
  buildMultiStopGoogleMapsUrl,
  computeLiveEta,
  signTrackingToken,
  verifyTrackingToken,
  // re-export for callers that already import from this module
  haversineDistance,
  haversineDistanceMeters,
};
