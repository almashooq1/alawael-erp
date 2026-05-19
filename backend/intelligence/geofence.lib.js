'use strict';

/**
 * geofence.lib.js — Wave 122.
 *
 * Pure geospatial helpers for branch geofences. Zero dependencies,
 * fully synchronous, trivially testable. Used by both the
 * BranchGeofence model validators and the mobile attendance service.
 *
 * Coordinate convention: [lat, lng] in degrees. WGS84.
 *
 * Public:
 *   pointInPolygon(point, polygon)              → boolean
 *   distanceM(a, b)                             → meters (haversine)
 *   distanceToPolygonM(point, polygon)          → meters to nearest edge
 *   isInsideGeofence({ point, polygon, bufferM }) → boolean
 *   isActiveAt({ activeHours, at })             → boolean (TZ: UTC)
 */

const EARTH_RADIUS_M = 6_371_000;

function _deg2rad(d) {
  return (d * Math.PI) / 180;
}

/**
 * Haversine great-circle distance in meters between two [lat,lng]
 * points. Accurate to ~0.5% for distances < 100 km.
 */
function distanceM(a, b) {
  if (!_validPoint(a) || !_validPoint(b)) return Infinity;
  const lat1 = _deg2rad(a[0]);
  const lat2 = _deg2rad(b[0]);
  const dLat = _deg2rad(b[0] - a[0]);
  const dLng = _deg2rad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return EARTH_RADIUS_M * c;
}

/**
 * Ray-casting point-in-polygon. Polygon is an array of [lat,lng]
 * vertices (no need to repeat the first vertex at the end).
 * Returns false for malformed input.
 */
function pointInPolygon(point, polygon) {
  if (!_validPoint(point) || !Array.isArray(polygon) || polygon.length < 3) {
    return false;
  }
  const [py, px] = point; // [lat, lng]
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    if (!_validPoint(polygon[i]) || !_validPoint(polygon[j])) return false;
    const [yi, xi] = polygon[i];
    const [yj, xj] = polygon[j];
    const intersect = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Distance in meters to the nearest polygon edge. Returns 0 when
 * the point is inside. Used to apply a "buffer" tolerance around
 * the polygon edge so GPS jitter near the boundary doesn't yo-yo.
 */
function distanceToPolygonM(point, polygon) {
  if (!_validPoint(point) || !Array.isArray(polygon) || polygon.length < 2) {
    return Infinity;
  }
  if (pointInPolygon(point, polygon)) return 0;
  let min = Infinity;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const d = _pointToSegmentM(point, polygon[j], polygon[i]);
    if (d < min) min = d;
  }
  return min;
}

/**
 * isInsideGeofence — composite check: inside polygon OR within
 * `bufferM` of the nearest edge. Default buffer is 25m to cover
 * typical GPS accuracy near boundaries.
 */
function isInsideGeofence({ point, polygon, bufferM = 25 } = {}) {
  if (!_validPoint(point) || !Array.isArray(polygon) || polygon.length < 3) {
    return false;
  }
  if (pointInPolygon(point, polygon)) return true;
  return distanceToPolygonM(point, polygon) <= Math.max(0, Number(bufferM) || 0);
}

/**
 * isActiveAt — checks whether the geofence is "open" for check-ins
 * at the given moment, per its activeHours config. The config is
 * an array of { day: 0..6, start: 'HH:MM', end: 'HH:MM' } in UTC.
 *
 * If activeHours is missing or empty, returns true (always-open).
 */
function isActiveAt({ activeHours, at } = {}) {
  if (!Array.isArray(activeHours) || activeHours.length === 0) return true;
  const t = at instanceof Date ? at : new Date(at);
  if (Number.isNaN(t.getTime())) return false;
  const dow = t.getUTCDay();
  const mins = t.getUTCHours() * 60 + t.getUTCMinutes();
  for (const slot of activeHours) {
    if (Number(slot.day) !== dow) continue;
    const s = _parseHHMM(slot.start);
    const e = _parseHHMM(slot.end);
    if (s == null || e == null) continue;
    if (mins >= s && mins < e) return true;
  }
  return false;
}

// ─── Internals ────────────────────────────────────────────────

function _validPoint(p) {
  return (
    Array.isArray(p) &&
    p.length === 2 &&
    Number.isFinite(p[0]) &&
    Number.isFinite(p[1]) &&
    p[0] >= -90 &&
    p[0] <= 90 &&
    p[1] >= -180 &&
    p[1] <= 180
  );
}

function _parseHHMM(s) {
  if (!s) return null;
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(s));
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

/**
 * Point-to-segment distance in meters, using the
 * project-onto-segment technique on a local equirectangular
 * approximation. Accurate to ~0.5% for short segments.
 */
function _pointToSegmentM(p, a, b) {
  if (!_validPoint(a) || !_validPoint(b)) return Infinity;
  // Local equirectangular projection — meters per degree.
  const latRef = (p[0] + a[0] + b[0]) / 3;
  const mPerDegLat = 111_320;
  const mPerDegLng = 111_320 * Math.cos(_deg2rad(latRef));
  const px = (p[1] - a[1]) * mPerDegLng;
  const py = (p[0] - a[0]) * mPerDegLat;
  const bx = (b[1] - a[1]) * mPerDegLng;
  const by = (b[0] - a[0]) * mPerDegLat;
  const segLenSq = bx * bx + by * by;
  if (segLenSq < 1e-6) {
    return Math.sqrt(px * px + py * py); // a == b
  }
  let t = (px * bx + py * by) / segLenSq;
  t = Math.max(0, Math.min(1, t));
  const cx = t * bx;
  const cy = t * by;
  const dx = px - cx;
  const dy = py - cy;
  return Math.sqrt(dx * dx + dy * dy);
}

module.exports = {
  distanceM,
  pointInPolygon,
  distanceToPolygonM,
  isInsideGeofence,
  isActiveAt,
  EARTH_RADIUS_M,
};
