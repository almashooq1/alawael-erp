/**
 * reports.service — fast cross-camera reports (Wave 1230).
 *
 * Read-only aggregation layer over the two camera subsystems:
 *   • CctvEvent / CctvCamera / CctvAnpr  — Phase 27 IP-cam surface (branchCode-keyed)
 *   • HikvisionProcessedEvent            — face-terminal recognition (branchId-keyed)
 *
 * Report families:
 *   employeesReport / employeeTimeline   — recognised staff, first-in / last-out per day
 *   platesReport / plateHistory          — ANPR plate movements + registry/fleet join
 *   visitorsReport                       — parents / visitors / vendors / unknown plates
 *   aiOverview                           — unified analysis across every IP cam
 *
 * Nothing in this file mutates state. Invalid input throws Error with
 * `.status = 400` + `.code` so the route layer can map it directly.
 */
'use strict';

const mongoose = require('mongoose');
const { CctvEvent, CctvCamera, CctvAnpr } = require('../../models/cctv');
const HikvisionProcessedEvent = require('../../models/HikvisionProcessedEvent');
const reg = require('../../intelligence/hikvision.registry');

const DEFAULT_WINDOW_DAYS = 7;
const MAX_WINDOW_DAYS = 92;
const DAY_MS = 86_400_000;
// Riyadh is fixed UTC+3 (no DST) — used for per-day bucketing.
const RIYADH_TZ = '+03:00';
const RIYADH_OFFSET_MS = 3 * 3_600_000;

const SAFETY_TYPES = Object.freeze([
  'intrusion',
  'fall_detected',
  'fight_detected',
  'fire_smoke',
  'object_left',
  'tampering',
  'audio_alarm',
]);

function badRequest(code) {
  const err = new Error(code);
  err.status = 400;
  err.code = code;
  return err;
}

function clampLimit(limit, max) {
  const n = Number(limit);
  if (!Number.isFinite(n) || n <= 0) return Math.min(100, max);
  return Math.min(Math.floor(n), max);
}

function resolveWindow({ from, to } = {}) {
  const end = to ? new Date(to) : new Date();
  if (Number.isNaN(end.getTime())) throw badRequest('INVALID_DATE');
  let start = from ? new Date(from) : new Date(end.getTime() - DEFAULT_WINDOW_DAYS * DAY_MS);
  if (Number.isNaN(start.getTime())) throw badRequest('INVALID_DATE');
  if (start > end) throw badRequest('INVALID_WINDOW');
  const floor = new Date(end.getTime() - MAX_WINDOW_DAYS * DAY_MS);
  if (start < floor) start = floor;
  return { from: start, to: end };
}

function riyadhDayKey(date) {
  return new Date(date.getTime() + RIYADH_OFFSET_MS).toISOString().slice(0, 10);
}

function lazyModel(name) {
  try {
    return mongoose.model(name);
  } catch {
    return null;
  }
}

function branchCodeMatch(branchCode) {
  return branchCode ? { branchCode: String(branchCode).toUpperCase() } : {};
}

async function loadEmployees(ids) {
  if (!ids.length) return new Map();
  const Employee = lazyModel('Employee') || require('../../models/HR/Employee');
  const rows = await Employee.find({ _id: { $in: ids } })
    .select('employee_number name_ar name_en department branch_id')
    .lean();
  return new Map(rows.map(r => [String(r._id), r]));
}

// ─── Employees ────────────────────────────────────────────────────

async function employeesReport({ branchId, from, to, limit } = {}) {
  const win = resolveWindow({ from, to });
  const match = {
    matchedEmployeeId: { $ne: null },
    capturedAt: { $gte: win.from, $lte: win.to },
    decision: { $in: [reg.GATE_DECISION.AUTO_ACCEPT, reg.GATE_DECISION.REVIEW] },
  };
  if (branchId) {
    if (!mongoose.isValidObjectId(branchId)) throw badRequest('INVALID_BRANCH_ID');
    match.branchId = new mongoose.Types.ObjectId(String(branchId));
  }
  const rows = await HikvisionProcessedEvent.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$matchedEmployeeId',
        captures: { $sum: 1 },
        autoAccepted: {
          $sum: { $cond: [{ $eq: ['$decision', reg.GATE_DECISION.AUTO_ACCEPT] }, 1, 0] },
        },
        underReview: {
          $sum: { $cond: [{ $eq: ['$decision', reg.GATE_DECISION.REVIEW] }, 1, 0] },
        },
        firstSeen: { $min: '$capturedAt' },
        lastSeen: { $max: '$capturedAt' },
        avgConfidence: { $avg: '$confidence' },
        devices: { $addToSet: '$deviceId' },
        branches: { $addToSet: '$branchId' },
      },
    },
    { $sort: { captures: -1 } },
    { $limit: clampLimit(limit, 500) },
  ]);

  const employees = await loadEmployees(rows.map(r => r._id));
  return {
    window: win,
    count: rows.length,
    employees: rows.map(r => ({
      employeeId: r._id,
      employee: employees.get(String(r._id)) || null,
      captures: r.captures,
      autoAccepted: r.autoAccepted,
      underReview: r.underReview,
      firstSeen: r.firstSeen,
      lastSeen: r.lastSeen,
      avgConfidence: r.avgConfidence == null ? null : Math.round(r.avgConfidence * 10) / 10,
      deviceCount: r.devices.length,
      branchCount: r.branches.length,
    })),
  };
}

async function employeeTimeline({ employeeId, from, to, limit } = {}) {
  if (!mongoose.isValidObjectId(employeeId)) throw badRequest('INVALID_EMPLOYEE_ID');
  const win = resolveWindow({ from, to });
  const rows = await HikvisionProcessedEvent.find({
    matchedEmployeeId: employeeId,
    capturedAt: { $gte: win.from, $lte: win.to },
    decision: { $ne: reg.GATE_DECISION.SUPPRESSED },
  })
    .select('capturedAt decision confidence eventKind source deviceId branchId zoneId')
    .sort({ capturedAt: -1 })
    .limit(clampLimit(limit, 1000))
    .lean();

  const byDay = new Map();
  for (const ev of rows) {
    const key = riyadhDayKey(ev.capturedAt);
    const day = byDay.get(key) || { date: key, firstIn: ev.capturedAt, lastOut: ev.capturedAt, captures: 0 };
    if (ev.capturedAt < day.firstIn) day.firstIn = ev.capturedAt;
    if (ev.capturedAt > day.lastOut) day.lastOut = ev.capturedAt;
    day.captures += 1;
    byDay.set(key, day);
  }

  const employees = await loadEmployees([employeeId]);
  return {
    window: win,
    employee: employees.get(String(employeeId)) || null,
    days: [...byDay.values()].sort((a, b) => (a.date < b.date ? 1 : -1)),
    events: rows,
  };
}

// ─── Plates ───────────────────────────────────────────────────────

async function aggregatePlates({ branchCode, win, plate, limit }) {
  const match = {
    type: 'anpr_plate',
    startedAt: { $gte: win.from, $lte: win.to },
    'aiResult.plate': plate ? String(plate).toUpperCase().trim() : { $type: 'string', $ne: '' },
    ...branchCodeMatch(branchCode),
  };
  return CctvEvent.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$aiResult.plate',
        visits: { $sum: 1 },
        firstSeen: { $min: '$startedAt' },
        lastSeen: { $max: '$startedAt' },
        cameras: { $addToSet: '$cameraCode' },
        branches: { $addToSet: '$branchCode' },
        denylistHits: {
          $sum: { $cond: [{ $eq: ['$aiResult.label', 'denylist_hit'] }, 1, 0] },
        },
        deniedVisits: {
          $sum: { $cond: [{ $eq: ['$payload.plateMatch', 'denied'] }, 1, 0] },
        },
        unknownVisits: {
          $sum: { $cond: [{ $eq: ['$aiResult.label', 'unknown_visitor'] }, 1, 0] },
        },
      },
    },
    { $sort: { visits: -1 } },
    { $limit: clampLimit(limit, 500) },
  ]);
}

async function joinPlateOwnership(plates) {
  if (!plates.length) return { registry: new Map(), fleet: new Map() };
  const regRows = await CctvAnpr.find({ plate: { $in: plates } })
    .select('plate ownerKind label status employeeId vendorName autoOpenGate validUntil')
    .lean();
  const TransportVehicle =
    lazyModel('TransportVehicle') || require('../../models/transport/Vehicle');
  const fleetRows = await TransportVehicle.find({ license_plate: { $in: plates } })
    .select('license_plate vehicle_number vehicle_type status')
    .lean();
  return {
    registry: new Map(regRows.map(r => [r.plate, r])),
    fleet: new Map(fleetRows.map(r => [r.license_plate, r])),
  };
}

function decoratePlateRow(r, registry, fleet) {
  const owner = registry.get(r._id) || null;
  const vehicle = fleet.get(r._id) || null;
  return {
    plate: r._id,
    visits: r.visits,
    firstSeen: r.firstSeen,
    lastSeen: r.lastSeen,
    cameras: r.cameras,
    branches: r.branches,
    denylistHits: r.denylistHits,
    deniedVisits: r.deniedVisits,
    unknownVisits: r.unknownVisits,
    owner: owner
      ? {
          ownerKind: owner.ownerKind,
          label: owner.label || owner.vendorName || null,
          status: owner.status,
          employeeId: owner.employeeId || null,
          autoOpenGate: !!owner.autoOpenGate,
          validUntil: owner.validUntil || null,
        }
      : null,
    fleetVehicle: vehicle
      ? {
          vehicleNumber: vehicle.vehicle_number,
          vehicleType: vehicle.vehicle_type,
          status: vehicle.status,
        }
      : null,
  };
}

async function platesReport({ branchCode, from, to, limit } = {}) {
  const win = resolveWindow({ from, to });
  const rows = await aggregatePlates({ branchCode, win, limit });
  const { registry, fleet } = await joinPlateOwnership(rows.map(r => r._id));
  const plates = rows.map(r => decoratePlateRow(r, registry, fleet));
  return {
    window: win,
    count: plates.length,
    summary: {
      registered: plates.filter(p => p.owner).length,
      unknown: plates.filter(p => !p.owner).length,
      denylist: plates.filter(p => p.owner?.ownerKind === 'denylist' || p.denylistHits > 0).length,
      fleetMatches: plates.filter(p => p.fleetVehicle).length,
    },
    plates,
  };
}

async function plateHistory({ plate, branchCode, from, to, limit } = {}) {
  const normalised = String(plate || '').toUpperCase().trim();
  if (!normalised) throw badRequest('INVALID_PLATE');
  const win = resolveWindow({ from, to });
  const events = await CctvEvent.find({
    type: 'anpr_plate',
    'aiResult.plate': normalised,
    startedAt: { $gte: win.from, $lte: win.to },
    ...branchCodeMatch(branchCode),
  })
    .select('eventId cameraCode branchCode severity startedAt aiResult payload snapshot')
    .sort({ startedAt: -1 })
    .limit(clampLimit(limit, 1000))
    .lean();

  const { registry, fleet } = await joinPlateOwnership([normalised]);
  const byDay = new Map();
  for (const ev of events) {
    const key = riyadhDayKey(ev.startedAt);
    byDay.set(key, (byDay.get(key) || 0) + 1);
  }
  return {
    window: win,
    plate: normalised,
    owner: registry.get(normalised) || null,
    fleetVehicle: fleet.get(normalised) || null,
    perDay: [...byDay.entries()]
      .map(([date, visits]) => ({ date, visits }))
      .sort((a, b) => (a.date < b.date ? 1 : -1)),
    events,
  };
}

// ─── Visitors / clients ──────────────────────────────────────────

const CLIENT_OWNER_KINDS = Object.freeze(['parent', 'visitor', 'vendor']);

async function visitorsReport({ branchCode, from, to, limit } = {}) {
  const win = resolveWindow({ from, to });
  const rows = await aggregatePlates({ branchCode, win, limit: clampLimit(limit, 500) });
  const { registry, fleet } = await joinPlateOwnership(rows.map(r => r._id));
  const decorated = rows.map(r => decoratePlateRow(r, registry, fleet));

  const clients = decorated.filter(p => p.owner && CLIENT_OWNER_KINDS.includes(p.owner.ownerKind));
  const denylist = decorated.filter(p => p.owner?.ownerKind === 'denylist' || p.denylistHits > 0);
  const unknownPlates = decorated.filter(p => !p.owner);

  const faceUnknownAgg = await CctvEvent.aggregate([
    {
      $match: {
        type: 'face_unknown',
        startedAt: { $gte: win.from, $lte: win.to },
        ...branchCodeMatch(branchCode),
      },
    },
    { $group: { _id: '$cameraCode', n: { $sum: 1 } } },
    { $sort: { n: -1 } },
    { $limit: 10 },
  ]);

  return {
    window: win,
    summary: {
      clientPlates: clients.length,
      unknownPlates: unknownPlates.length,
      denylistPlates: denylist.length,
      unknownFaceDetections: faceUnknownAgg.reduce((s, r) => s + r.n, 0),
    },
    clients,
    unknownPlates,
    denylist,
    unknownFaces: faceUnknownAgg.map(r => ({ cameraCode: r._id, detections: r.n })),
  };
}

// ─── Unified AI overview ─────────────────────────────────────────

async function aiOverview({ branchCode, from, to } = {}) {
  const win = resolveWindow({ from, to });
  const evMatch = { startedAt: { $gte: win.from, $lte: win.to }, ...branchCodeMatch(branchCode) };
  const camMatch = { isDeleted: { $ne: true }, ...branchCodeMatch(branchCode) };

  const [byTypeSev, topCameras, daily, unacknowledged, fleetStatus, capabilities] =
    await Promise.all([
      CctvEvent.aggregate([
        { $match: evMatch },
        { $group: { _id: { type: '$type', severity: '$severity' }, n: { $sum: 1 } } },
        { $sort: { n: -1 } },
      ]),
      CctvEvent.aggregate([
        { $match: evMatch },
        {
          $group: {
            _id: '$cameraCode',
            events: { $sum: 1 },
            lastEventAt: { $max: '$startedAt' },
            types: { $addToSet: '$type' },
          },
        },
        { $sort: { events: -1 } },
        { $limit: 20 },
      ]),
      CctvEvent.aggregate([
        { $match: evMatch },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$startedAt', timezone: RIYADH_TZ },
            },
            events: { $sum: 1 },
            safety: { $sum: { $cond: [{ $in: ['$type', SAFETY_TYPES] }, 1, 0] } },
            faces: {
              $sum: {
                $cond: [
                  { $in: ['$type', ['face_detected', 'face_match', 'face_unknown']] },
                  1,
                  0,
                ],
              },
            },
            plates: { $sum: { $cond: [{ $eq: ['$type', 'anpr_plate'] }, 1, 0] } },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      CctvEvent.countDocuments({
        ...evMatch,
        severity: { $in: ['high', 'critical'] },
        acknowledgedAt: null,
      }),
      CctvCamera.aggregate([
        { $match: camMatch },
        { $group: { _id: '$status', n: { $sum: 1 } } },
      ]),
      CctvCamera.aggregate([
        { $match: camMatch },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            anpr: { $sum: { $cond: ['$capabilities.anpr', 1, 0] } },
            faceDetection: { $sum: { $cond: ['$capabilities.faceDetection', 1, 0] } },
            intrusion: { $sum: { $cond: ['$capabilities.intrusion', 1, 0] } },
            ptz: { $sum: { $cond: ['$capabilities.ptz', 1, 0] } },
            thermal: { $sum: { $cond: ['$capabilities.thermal', 1, 0] } },
          },
        },
      ]),
    ]);

  const byType = {};
  let totalEvents = 0;
  for (const row of byTypeSev) {
    const t = row._id.type;
    totalEvents += row.n;
    if (!byType[t]) byType[t] = { total: 0, bySeverity: {} };
    byType[t].total += row.n;
    byType[t].bySeverity[row._id.severity] = row.n;
  }

  const cameraCodes = topCameras.map(c => c._id);
  const cameraMeta = cameraCodes.length
    ? await CctvCamera.find({ code: { $in: cameraCodes } })
        .select('code name_ar name_en status location.area branchCode')
        .lean()
    : [];
  const metaByCode = new Map(cameraMeta.map(c => [c.code, c]));

  return {
    window: win,
    totals: {
      events: totalEvents,
      safetyEvents: Object.entries(byType)
        .filter(([t]) => SAFETY_TYPES.includes(t))
        .reduce((s, [, v]) => s + v.total, 0),
      unacknowledgedHighCritical: unacknowledged,
    },
    byType,
    daily: daily.map(d => ({
      date: d._id,
      events: d.events,
      safety: d.safety,
      faces: d.faces,
      plates: d.plates,
    })),
    topCameras: topCameras.map(c => ({
      cameraCode: c._id,
      events: c.events,
      lastEventAt: c.lastEventAt,
      types: c.types,
      camera: metaByCode.get(c._id) || null,
    })),
    cameraFleet: {
      byStatus: Object.fromEntries(fleetStatus.map(r => [r._id, r.n])),
      capabilities: capabilities[0]
        ? {
            total: capabilities[0].total,
            anpr: capabilities[0].anpr,
            faceDetection: capabilities[0].faceDetection,
            intrusion: capabilities[0].intrusion,
            ptz: capabilities[0].ptz,
            thermal: capabilities[0].thermal,
          }
        : { total: 0, anpr: 0, faceDetection: 0, intrusion: 0, ptz: 0, thermal: 0 },
    },
  };
}

module.exports = {
  employeesReport,
  employeeTimeline,
  platesReport,
  plateHistory,
  visitorsReport,
  aiOverview,
  // exported for tests
  resolveWindow,
  riyadhDayKey,
  clampLimit,
  SAFETY_TYPES,
};
