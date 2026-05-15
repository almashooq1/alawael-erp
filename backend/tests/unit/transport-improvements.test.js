/**
 * Improvement-round tests for the transport module:
 *  - pickWaypoint whitelist (no mongoose internals leak)
 *  - authorizeVehicleWrite role + driver-match checks (text-asserted in routes)
 *  - Trip indexes declared
 *  - Per-IP track limiter declared
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { nearestUnvisitedWaypoint } = require('../../services/transport/smartTransport.service');

const ROUTE_SRC = path.resolve(__dirname, '../../routes/transport-module.routes.js');
const PUBLIC_TRACK_SRC = path.resolve(__dirname, '../../routes/transport-public-track.routes.js');
const TRIP_MODEL_SRC = path.resolve(__dirname, '../../models/transport/Trip.js');
const SMART_SVC_SRC = path.resolve(__dirname, '../../services/transport/smartTransport.service.js');

describe('Improvement: nearestUnvisitedWaypoint cleans response', () => {
  test('does NOT expose _id / __v / parent', () => {
    const result = nearestUnvisitedWaypoint({ latitude: 24.7136, longitude: 46.6753 }, [
      {
        _id: 'INTERNAL_ID',
        __v: 0,
        $__: 'mongoose-internal',
        order: 1,
        lat: 24.7136,
        lng: 46.6753,
        address: 'الرياض',
        beneficiary_id: 'b1',
        waypoint_type: 'pickup',
      },
    ]);
    expect(result.waypoint._id).toBeUndefined();
    expect(result.waypoint.__v).toBeUndefined();
    expect(result.waypoint.$__).toBeUndefined();
    expect(result.waypoint).toMatchObject({
      order: 1,
      lat: 24.7136,
      lng: 46.6753,
      address: 'الرياض',
      beneficiary_id: 'b1',
      waypoint_type: 'pickup',
    });
  });

  test('handles populated beneficiary_id (object with _id)', () => {
    const result = nearestUnvisitedWaypoint({ latitude: 24.7136, longitude: 46.6753 }, [
      {
        order: 1,
        lat: 24.7136,
        lng: 46.6753,
        beneficiary_id: { _id: 'b1', full_name_ar: 'تجريبي' },
      },
    ]);
    expect(result.waypoint.beneficiary_id).toBe('b1');
  });

  test('still excludes visited (object _id)', () => {
    const result = nearestUnvisitedWaypoint(
      { latitude: 24.7136, longitude: 46.6753 },
      [
        { order: 1, lat: 24.714, lng: 46.676, beneficiary_id: { _id: 'b1' } },
        { order: 2, lat: 24.72, lng: 46.68, beneficiary_id: { _id: 'b2' } },
      ],
      ['b1']
    );
    expect(result.waypoint.beneficiary_id).toBe('b2');
  });

  test('handles plain mongoose subdoc with toObject()', () => {
    const subdoc = {
      _id: 'INTERNAL',
      __v: 0,
      order: 1,
      lat: 24,
      lng: 46,
      beneficiary_id: 'b1',
      toObject() {
        return {
          _id: 'INTERNAL',
          __v: 0,
          order: 1,
          lat: 24,
          lng: 46,
          beneficiary_id: 'b1',
          address: 'street',
        };
      },
    };
    const result = nearestUnvisitedWaypoint({ latitude: 24, longitude: 46 }, [subdoc]);
    expect(result.waypoint._id).toBeUndefined();
    expect(result.waypoint.address).toBe('street');
  });

  test('smart service exports pickWaypoint-style normalized fields only', () => {
    const src = fs.readFileSync(SMART_SVC_SRC, 'utf8');
    expect(src).toMatch(/function pickWaypoint/);
    expect(src).toMatch(/waypoint:\s*pickWaypoint\(wp\)/);
  });
});

describe('Improvement: GPS write authorization', () => {
  let routeSource;
  beforeAll(() => {
    routeSource = fs.readFileSync(ROUTE_SRC, 'utf8');
  });

  test('declares GPS_ADMIN_ROLES whitelist', () => {
    expect(routeSource).toMatch(/GPS_ADMIN_ROLES\s*=\s*new Set\(/);
    expect(routeSource).toMatch(/SUPER_ADMIN/);
    expect(routeSource).toMatch(/FLEET_MANAGER/);
  });

  test('defines authorizeVehicleWrite middleware', () => {
    expect(routeSource).toMatch(/async function authorizeVehicleWrite/);
    expect(routeSource).toMatch(/current_driver_id/);
  });

  test('applies authorizeVehicleWrite to POST /gps', () => {
    expect(routeSource).toMatch(
      /['"]\/gps['"][\s\S]{0,80}gpsLimiter,\s*\n\s*authorizeVehicleWrite,/
    );
  });

  test('applies authorizeVehicleWrite to POST /gps/batch', () => {
    expect(routeSource).toMatch(
      /['"]\/gps\/batch['"][\s\S]{0,80}gpsBatchLimiter,\s*\n\s*authorizeVehicleWrite,/
    );
  });
});

describe('Improvement: pickup-at audit logging', () => {
  let routeSource;
  beforeAll(() => {
    routeSource = fs.readFileSync(ROUTE_SRC, 'utf8');
  });

  test('imports AuditLog lazily via getAuditLog()', () => {
    expect(routeSource).toMatch(/function getAuditLog/);
    expect(routeSource).toMatch(/auditLog\.model/);
  });

  test('emits audit when force=true or distance > geofence', () => {
    expect(routeSource).toMatch(/isBypass\s*=[\s\S]{0,80}force === true/);
    expect(routeSource).toMatch(/security\.suspicious_activity/);
    expect(routeSource).toMatch(/geofence-bypass/);
  });

  test('audit is fire-and-forget (never blocks request)', () => {
    expect(routeSource).toMatch(/auditAsync\(/);
    expect(routeSource).toMatch(/M\.create\(entry\)\.catch\(/);
  });
});

describe('Improvement: safety leaderboard performance', () => {
  let routeSource;
  beforeAll(() => {
    routeSource = fs.readFileSync(ROUTE_SRC, 'utf8');
  });

  test('uses a single GPS query with cursor.eachAsync (no N+1)', () => {
    expect(routeSource).toMatch(/pointsByVehicle = new Map\(\)/);
    expect(routeSource).toMatch(/\.cursor\(\)\s*\n?\s*\.eachAsync/);
  });

  test('groups GPS points by vehicle then merges per driver', () => {
    expect(routeSource).toMatch(/allVehicleIds = new Set/);
    expect(routeSource).toMatch(/Single Mongo query|single Mongo query|single query/i);
  });
});

describe('Improvement: Trip indexes', () => {
  let modelSource;
  beforeAll(() => {
    modelSource = fs.readFileSync(TRIP_MODEL_SRC, 'utf8');
  });

  test('declares hot-path compound index (driver_id, trip_date, status)', () => {
    expect(modelSource).toMatch(
      /index\(\s*\{\s*driver_id:\s*1,\s*trip_date:\s*-1,\s*status:\s*1\s*\}/
    );
  });

  test('declares partialFilterExpression on deleted_at', () => {
    expect(modelSource).toMatch(/partialFilterExpression:\s*\{\s*deleted_at:\s*null/);
  });

  test('declares live-fleet active-trip index', () => {
    expect(modelSource).toMatch(/index\(\s*\{\s*status:\s*1,\s*vehicle_id:\s*1\s*\}/);
  });
});

describe('Improvement: per-IP track rate limit', () => {
  let trackSource;
  beforeAll(() => {
    trackSource = fs.readFileSync(PUBLIC_TRACK_SRC, 'utf8');
  });

  test('declares both per-token and per-IP limiters', () => {
    expect(trackSource).toMatch(/publicTrackTokenLimiter/);
    expect(trackSource).toMatch(/publicTrackIpLimiter/);
  });

  test('applies BOTH limiters to GET /:token', () => {
    expect(trackSource).toMatch(/publicTrackIpLimiter,\s*\n\s*publicTrackTokenLimiter/);
  });

  test('per-IP cap is higher than per-token cap (defense-in-depth, not redundancy)', () => {
    const ipMatch = trackSource.match(
      /publicTrackIpLimiter\s*=\s*createCustomLimiter\(\{[\s\S]{0,200}max:\s*(\d+)/
    );
    const tokenMatch = trackSource.match(
      /publicTrackTokenLimiter\s*=\s*createCustomLimiter\(\{[\s\S]{0,200}max:\s*(\d+)/
    );
    expect(ipMatch).not.toBeNull();
    expect(tokenMatch).not.toBeNull();
    expect(Number(ipMatch[1])).toBeGreaterThan(Number(tokenMatch[1]));
  });
});
