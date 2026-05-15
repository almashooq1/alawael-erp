/**
 * Phase B/C/D — smartTransport.service.js unit tests
 *
 * Pure function tests, no DB.
 */
'use strict';

const {
  nearestUnvisitedWaypoint,
  buildNavigationLinks,
  buildMultiStopGoogleMapsUrl,
  computeLiveEta,
  signTrackingToken,
  verifyTrackingToken,
  haversineDistanceMeters,
  GEOFENCE_RADIUS_METERS,
} = require('../../services/transport/smartTransport.service');

describe('nearestUnvisitedWaypoint', () => {
  const RIYADH_CENTER = { latitude: 24.7136, longitude: 46.6753 };
  const waypoints = [
    { order: 1, lat: 24.714, lng: 46.676, beneficiary_id: 'b1' }, // ~75m
    { order: 2, lat: 24.72, lng: 46.68, beneficiary_id: 'b2' }, // ~800m
    { order: 3, lat: 24.7, lng: 46.65, beneficiary_id: 'b3' }, // ~2500m
  ];

  test('returns the nearest waypoint with distance + geofence flag', () => {
    const result = nearestUnvisitedWaypoint(RIYADH_CENTER, waypoints);
    expect(result).not.toBeNull();
    expect(String(result.waypoint.beneficiary_id)).toBe('b1');
    expect(result.distanceMeters).toBeGreaterThanOrEqual(0);
    expect(result.distanceMeters).toBeLessThan(150);
  });

  test('excludes already-visited beneficiaries', () => {
    const result = nearestUnvisitedWaypoint(RIYADH_CENTER, waypoints, ['b1']);
    expect(String(result.waypoint.beneficiary_id)).toBe('b2');
  });

  test('returns null for empty waypoints', () => {
    expect(nearestUnvisitedWaypoint(RIYADH_CENTER, [])).toBeNull();
  });

  test('returns null for null GPS', () => {
    expect(nearestUnvisitedWaypoint(null, waypoints)).toBeNull();
  });

  test('skips waypoints missing coords', () => {
    const result = nearestUnvisitedWaypoint(RIYADH_CENTER, [
      { order: 1, beneficiary_id: 'x' },
      { order: 2, lat: 24.714, lng: 46.676, beneficiary_id: 'b1' },
    ]);
    expect(String(result.waypoint.beneficiary_id)).toBe('b1');
  });

  test('withinGeofence true when distance <= radius', () => {
    // 0 distance — same point
    const result = nearestUnvisitedWaypoint({ latitude: 24.714, longitude: 46.676 }, [
      { order: 1, lat: 24.714, lng: 46.676, beneficiary_id: 'b1' },
    ]);
    expect(result.withinGeofence).toBe(true);
    expect(result.distanceMeters).toBe(0);
  });

  test('withinGeofence false when distance > radius', () => {
    const result = nearestUnvisitedWaypoint(
      { latitude: 24.7, longitude: 46.65 },
      [{ order: 1, lat: 24.72, lng: 46.68, beneficiary_id: 'b1' }],
      [],
      GEOFENCE_RADIUS_METERS
    );
    expect(result.withinGeofence).toBe(false);
    expect(result.distanceMeters).toBeGreaterThan(GEOFENCE_RADIUS_METERS);
  });
});

describe('buildNavigationLinks', () => {
  test('builds Waze + Google + Apple + geo URIs for each waypoint', () => {
    const links = buildNavigationLinks([{ order: 1, lat: 24.71, lng: 46.67, address: 'الرياض' }]);
    expect(links).toHaveLength(1);
    expect(links[0].waze).toContain('waze.com/ul?ll=24.71,46.67');
    expect(links[0].waze).toContain('navigate=yes');
    expect(links[0].google).toContain('destination=24.71,46.67');
    expect(links[0].apple).toContain('daddr=24.71,46.67');
    expect(links[0].geo).toBe('geo:24.71,46.67?q=24.71,46.67');
  });

  test('filters waypoints without coords', () => {
    const links = buildNavigationLinks([{ order: 1 }, { order: 2, lat: 1, lng: 2 }]);
    expect(links).toHaveLength(1);
  });

  test('handles non-array input', () => {
    expect(buildNavigationLinks(null)).toEqual([]);
    expect(buildNavigationLinks(undefined)).toEqual([]);
  });
});

describe('buildMultiStopGoogleMapsUrl', () => {
  const origin = { latitude: 24.7, longitude: 46.7 };

  test('produces a valid Google Directions URL with intermediate waypoints', () => {
    const url = buildMultiStopGoogleMapsUrl(origin, [
      { lat: 24.71, lng: 46.71 },
      { lat: 24.72, lng: 46.72 },
      { lat: 24.73, lng: 46.73 },
    ]);
    expect(url).toContain('origin=24.7%2C46.7');
    expect(url).toContain('destination=24.73%2C46.73');
    expect(url).toContain('waypoints=');
    expect(url).toContain('travelmode=driving');
  });

  test('caps at 10 stops', () => {
    const many = Array.from({ length: 15 }, (_, i) => ({
      lat: 24 + i * 0.01,
      lng: 46 + i * 0.01,
    }));
    const url = buildMultiStopGoogleMapsUrl(origin, many);
    expect(url).toBeTruthy();
    // destination should be the 10th waypoint, not the 15th
    expect(url).toContain('destination=24.09%2C46.09');
  });

  test('returns null for empty waypoints', () => {
    expect(buildMultiStopGoogleMapsUrl(origin, [])).toBeNull();
  });

  test('returns null for missing origin', () => {
    expect(buildMultiStopGoogleMapsUrl(null, [{ lat: 24, lng: 46 }])).toBeNull();
  });
});

describe('computeLiveEta', () => {
  test('produces ETA entries ordered by waypoint order', () => {
    const eta = computeLiveEta(
      { latitude: 24.7, longitude: 46.7 },
      [
        { order: 1, lat: 24.71, lng: 46.71, beneficiary_id: 'b1', pickup_time: '07:30' },
        { order: 2, lat: 24.72, lng: 46.72, beneficiary_id: 'b2', pickup_time: '07:45' },
      ],
      [],
      '07:00'
    );
    expect(eta).toHaveLength(2);
    expect(eta[0].order).toBe(1);
    expect(eta[1].order).toBe(2);
    expect(eta[0].live_eta).toMatch(/^\d{2}:\d{2}$/);
  });

  test('skips visited beneficiaries', () => {
    const eta = computeLiveEta(
      { latitude: 24.7, longitude: 46.7 },
      [
        { order: 1, lat: 24.71, lng: 46.71, beneficiary_id: 'b1' },
        { order: 2, lat: 24.72, lng: 46.72, beneficiary_id: 'b2' },
      ],
      ['b1'],
      '07:00'
    );
    expect(eta).toHaveLength(1);
    expect(eta[0].beneficiary_id).toBe('b2');
  });

  test('returns delay_minutes vs scheduled pickup', () => {
    const eta = computeLiveEta(
      { latitude: 24.7, longitude: 46.7 },
      [{ order: 1, lat: 24.71, lng: 46.71, beneficiary_id: 'b1', pickup_time: '07:00' }],
      [],
      '07:30' // arrive late
    );
    expect(eta[0].delay_minutes).not.toBeNull();
    expect(typeof eta[0].delay_minutes).toBe('number');
  });

  test('returns empty when no GPS', () => {
    expect(computeLiveEta(null, [{ order: 1, lat: 1, lng: 1 }])).toEqual([]);
  });
});

describe('signTrackingToken + verifyTrackingToken', () => {
  const SECRET = 'unit-test-secret-rotate-me-123';
  const TRIP_ID = '507f1f77bcf86cd799439011';

  test('round-trip succeeds and returns trip id', () => {
    const token = signTrackingToken(TRIP_ID, SECRET);
    const verified = verifyTrackingToken(token, SECRET);
    expect(verified).not.toBeNull();
    expect(verified.tripId).toBe(TRIP_ID);
    expect(verified.expiresAt).toBeInstanceOf(Date);
  });

  test('rejects token signed with different secret', () => {
    const token = signTrackingToken(TRIP_ID, SECRET);
    expect(verifyTrackingToken(token, 'wrong-secret')).toBeNull();
  });

  test('rejects tampered trip id', () => {
    const token = signTrackingToken(TRIP_ID, SECRET);
    const parts = token.split('.');
    parts[0] = '507f1f77bcf86cd799439999';
    expect(verifyTrackingToken(parts.join('.'), SECRET)).toBeNull();
  });

  test('rejects expired token', () => {
    const token = signTrackingToken(TRIP_ID, SECRET, -1); // already expired
    expect(verifyTrackingToken(token, SECRET)).toBeNull();
  });

  test('rejects malformed token', () => {
    expect(verifyTrackingToken('not.a.token', SECRET)).toBeNull();
    expect(verifyTrackingToken('only-one-part', SECRET)).toBeNull();
    expect(verifyTrackingToken('', SECRET)).toBeNull();
    expect(verifyTrackingToken(null, SECRET)).toBeNull();
  });

  test('throws on missing inputs to signer', () => {
    expect(() => signTrackingToken(null, SECRET)).toThrow();
    expect(() => signTrackingToken(TRIP_ID, '')).toThrow();
  });
});

describe('haversineDistanceMeters smoke', () => {
  test('Riyadh ↔ Jeddah ~858km', () => {
    const meters = haversineDistanceMeters(24.7136, 46.6753, 21.4858, 39.1925);
    expect(meters).toBeGreaterThan(800000);
    expect(meters).toBeLessThan(900000);
  });

  test('same point returns 0', () => {
    expect(haversineDistanceMeters(24, 46, 24, 46)).toBe(0);
  });
});
