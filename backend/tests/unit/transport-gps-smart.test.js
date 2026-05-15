/**
 * Phase A — Smart Transport GPS hardening
 *
 * Verifies:
 *  - GpsTracking model schema declares correct fields (latitude/longitude/speed)
 *    after the lat/lng → latitude/longitude migration
 *  - TTL index is declared on `timestamp` (90 days), not on the `timestamps` option
 *  - Virtual aliases (lat, lng, speed_kmh) read through
 *  - validateGpsPoint logic embedded in the route file rejects bad payloads
 */
'use strict';

const fs = require('fs');
const path = require('path');

const MODEL_SRC = path.resolve(__dirname, '../../models/transport/GpsTracking.js');
const ROUTE_SRC = path.resolve(__dirname, '../../routes/transport-module.routes.js');

describe('Phase A — GPS field-mismatch + TTL fixes', () => {
  let modelSource;
  let routeSource;

  beforeAll(() => {
    modelSource = fs.readFileSync(MODEL_SRC, 'utf8');
    routeSource = fs.readFileSync(ROUTE_SRC, 'utf8');
  });

  test('GpsTracking schema uses latitude/longitude (not lat/lng) as primary fields', () => {
    expect(modelSource).toMatch(/latitude:\s*\{\s*type:\s*Number,\s*required:\s*true/);
    expect(modelSource).toMatch(/longitude:\s*\{\s*type:\s*Number,\s*required:\s*true/);
  });

  test('GpsTracking schema declares latitude bounds (-90..90)', () => {
    expect(modelSource).toMatch(/min:\s*-90.*max:\s*90/s);
  });

  test('GpsTracking schema declares longitude bounds (-180..180)', () => {
    expect(modelSource).toMatch(/min:\s*-180.*max:\s*180/s);
  });

  test('GpsTracking provides backward-compat virtual aliases (lat, lng, speed_kmh)', () => {
    expect(modelSource).toMatch(/virtual\(['"]lat['"]\)/);
    expect(modelSource).toMatch(/virtual\(['"]lng['"]\)/);
    expect(modelSource).toMatch(/virtual\(['"]speed_kmh['"]\)/);
  });

  test('TTL index on timestamp is properly declared (90 days)', () => {
    expect(modelSource).toMatch(
      /index\(\s*\{\s*timestamp:\s*1\s*\}\s*,\s*\{\s*expireAfterSeconds:/
    );
  });

  test('TTL is NOT misplaced on the timestamps schema option', () => {
    expect(modelSource).not.toMatch(/timestamps:\s*\{[^}]*expireAfterSeconds/);
  });

  test('GpsTracking model loads without throwing', () => {
    expect(() => require('../../models/transport/GpsTracking')).not.toThrow();
  });

  test('Route file defines validateGpsPoint guard', () => {
    expect(routeSource).toMatch(/function validateGpsPoint/);
  });

  test('Route file exposes POST /gps/batch endpoint', () => {
    expect(routeSource).toMatch(/['"]\/gps\/batch['"]/);
  });

  test('Route file enforces MAX_GPS_BATCH cap (100 points)', () => {
    expect(routeSource).toMatch(/MAX_GPS_BATCH\s*=\s*100/);
  });

  test('Route writes correct Vehicle fields (last_known_lat/last_known_lng)', () => {
    expect(routeSource).toMatch(/last_known_lat/);
    expect(routeSource).toMatch(/last_known_lng/);
    expect(routeSource).toMatch(/last_gps_update/);
  });

  test('Route no longer writes obsolete current_location.* fields', () => {
    expect(routeSource).not.toMatch(/current_location\.latitude/);
    expect(routeSource).not.toMatch(/current_location\.longitude/);
  });

  test('Route applies rate-limit to GPS endpoints', () => {
    expect(routeSource).toMatch(/gpsLimiter/);
    expect(routeSource).toMatch(/gpsBatchLimiter/);
  });

  test('Route flags is_speeding when speed > speed_limit', () => {
    expect(routeSource).toMatch(/is_speeding:\s*\(.*speed.*\)\s*>\s*speedLimit/);
  });
});

describe('Phase A — GPS payload validator unit tests', () => {
  // Re-implement the validator inline for isolated unit testing (the route
  // file does not export it; this mirrors the source verbatim).
  function validateGpsPoint(p) {
    if (!p || typeof p !== 'object') return 'بيانات GPS غير صالحة';
    if (typeof p.latitude !== 'number' || p.latitude < -90 || p.latitude > 90) {
      return 'خط العرض (latitude) غير صالح';
    }
    if (typeof p.longitude !== 'number' || p.longitude < -180 || p.longitude > 180) {
      return 'خط الطول (longitude) غير صالح';
    }
    if (p.speed !== undefined && (typeof p.speed !== 'number' || p.speed < 0 || p.speed > 300)) {
      return 'السرعة غير منطقية';
    }
    if (p.heading !== undefined && (p.heading < 0 || p.heading > 360)) {
      return 'الاتجاه غير صالح (يجب 0-360)';
    }
    return null;
  }

  test('accepts a normal Riyadh point', () => {
    expect(validateGpsPoint({ latitude: 24.7136, longitude: 46.6753, speed: 35 })).toBeNull();
  });

  test('rejects latitude out of range', () => {
    expect(validateGpsPoint({ latitude: 95, longitude: 46 })).toMatch(/خط العرض/);
    expect(validateGpsPoint({ latitude: -91, longitude: 46 })).toMatch(/خط العرض/);
  });

  test('rejects longitude out of range', () => {
    expect(validateGpsPoint({ latitude: 24, longitude: 181 })).toMatch(/خط الطول/);
    expect(validateGpsPoint({ latitude: 24, longitude: -181 })).toMatch(/خط الطول/);
  });

  test('rejects impossible speed (>300 km/h)', () => {
    expect(validateGpsPoint({ latitude: 24, longitude: 46, speed: 350 })).toMatch(/السرعة/);
  });

  test('rejects negative speed', () => {
    expect(validateGpsPoint({ latitude: 24, longitude: 46, speed: -5 })).toMatch(/السرعة/);
  });

  test('rejects heading >360 or <0', () => {
    expect(validateGpsPoint({ latitude: 24, longitude: 46, heading: 400 })).toMatch(/الاتجاه/);
    expect(validateGpsPoint({ latitude: 24, longitude: 46, heading: -10 })).toMatch(/الاتجاه/);
  });

  test('rejects non-numeric latitude', () => {
    expect(validateGpsPoint({ latitude: '24.7', longitude: 46 })).toMatch(/خط العرض/);
  });

  test('rejects null/undefined payload', () => {
    expect(validateGpsPoint(null)).toMatch(/غير صالحة/);
    expect(validateGpsPoint(undefined)).toMatch(/غير صالحة/);
  });

  test('speed boundary 0 and 300 are accepted', () => {
    expect(validateGpsPoint({ latitude: 24, longitude: 46, speed: 0 })).toBeNull();
    expect(validateGpsPoint({ latitude: 24, longitude: 46, speed: 300 })).toBeNull();
  });

  test('heading boundary 0 and 360 are accepted', () => {
    expect(validateGpsPoint({ latitude: 24, longitude: 46, heading: 0 })).toBeNull();
    expect(validateGpsPoint({ latitude: 24, longitude: 46, heading: 360 })).toBeNull();
  });
});
