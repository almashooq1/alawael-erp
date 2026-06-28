/**
 * cctvIntegration.service.js — CCTV Monitoring Integration Service
 * ═══════════════════════════════════════════════════════════════
 * Provides mock data and simplified queries for the CCTV monitoring dashboard.
 * Real CCTV integration requires hardware/NVR connectivity.
 */

'use strict';

const { CctvCamera, CctvEvent, CctvAlert, CctvRecording, CctvFaceIdentity } = require('../../models/cctv');

// ─── Mock camera list (with DB fallback) ───────────────────────────────────

const MOCK_CAMERAS = [
  { _id: 'cam-001', code: 'CAM-001', name_ar: 'المدخل الرئيسي', name_en: 'Main Entrance', status: 'online', location: { area: 'مدخل', floor: 'الأرضي', room: 'البهو' }, purpose: 'access_control' },
  { _id: 'cam-002', code: 'CAM-002', name_ar: 'قاعة العلاج الطبيعي', name_en: 'Physiotherapy Hall', status: 'online', location: { area: 'علاج', floor: 'الأول', room: 'قاعة 101' }, purpose: 'safety' },
  { _id: 'cam-003', code: 'CAM-003', name_ar: 'المقصف', name_en: 'Cafeteria', status: 'online', location: { area: 'خدمات', floor: 'الأرضي', room: 'المقصف' }, purpose: 'general' },
  { _id: 'cam-004', code: 'CAM-004', name_ar: 'المواقف الخلفية', name_en: 'Rear Parking', status: 'offline', location: { area: 'خارجي', floor: 'الأرضي', room: 'المواقف' }, purpose: 'parking' },
  { _id: 'cam-005', code: 'CAM-005', name_ar: 'غرفة المستفيدين', name_en: 'Beneficiary Room', status: 'online', location: { area: 'رعاية', floor: 'الثاني', room: 'غرفة 205' }, purpose: 'safety' },
  { _id: 'cam-006', code: 'CAM-006', name_ar: 'المكتبة', name_en: 'Library', status: 'online', location: { area: 'تعليم', floor: 'الأول', room: 'المكتبة' }, purpose: 'general' },
  { _id: 'cam-007', code: 'CAM-007', name_ar: 'الصالة الرياضية', name_en: 'Gym Hall', status: 'degraded', location: { area: 'رياضة', floor: 'الأرضي', room: 'الصالة الرياضية' }, purpose: 'safety' },
  { _id: 'cam-008', code: 'CAM-008', name_ar: 'الممر الرئيسي', name_en: 'Main Corridor', status: 'online', location: { area: 'ممرات', floor: 'الأول', room: 'الممر الرئيسي' }, purpose: 'general' },
  { _id: 'cam-009', code: 'CAM-009', name_ar: 'غرفة الطوارئ', name_en: 'Emergency Room', status: 'online', location: { area: 'طوارئ', floor: 'الأرضي', room: 'غرفة الطوارئ' }, purpose: 'safety' },
];

// ─── Mock stream URLs ───────────────────────────────────────────────────────

function getMockStreamUrl(cameraId) {
  const base = 'https://stream.alawael.org/cctv';
  return {
    hls: `${base}/${cameraId}/live.m3u8`,
    rtsp: `rtsp://cctv.alawael.local:554/${cameraId}/stream1`,
    snapshot: `${base}/${cameraId}/snapshot.jpg?ts=${Date.now()}`,
    placeholder: true,
  };
}

// ─── Service Functions ─────────────────────────────────────────────────────

/**
 * 1. getCameraList — return cameras for a branch (DB + mock fallback)
 */
async function getCameraList(branchId) {
  try {
    const filters = branchId ? { branchCode: branchId, isDeleted: false } : { isDeleted: false };
    const cameras = await CctvCamera.find(filters).sort({ name_ar: 1 }).limit(50).lean();
    if (cameras && cameras.length > 0) return cameras;
  } catch (_err) {
    // fallback to mock
  }

  // Enrich mock cameras with per-branch variance
  return MOCK_CAMERAS.map((c, i) => ({
    ...c,
    _id: c._id,
    branchCode: branchId || 'HQ-01',
    ip: `192.168.1.${100 + i}`,
    port: 80,
    rtspPort: 554,
    lastSeenAt: c.status === 'online' ? new Date() : new Date(Date.now() - 3600_000),
  }));
}

/**
 * 2. getLiveFeed — return stream URL for a camera
 */
async function getLiveFeed(cameraId) {
  try {
    const cam = await CctvCamera.findById(cameraId).lean();
    if (cam && cam.streams && cam.streams.length > 0) {
      return {
        cameraId: cam._id,
        name_ar: cam.name_ar,
        streams: cam.streams.map(s => ({
          type: s.type,
          rtsp: `rtsp://${cam.ip}:${cam.rtspPort || 554}${s.rtspPath || '/Streaming/Channels/101'}`,
          hls: `https://proxy.alawael.org/cctv/${cam._id}/${s.type}.m3u8`,
          resolution: s.resolution,
          fps: s.fps,
        })),
        placeholder: false,
      };
    }
  } catch (_err) {
    // ignore
  }

  return {
    cameraId,
    name_ar: 'كاميرا غير معروفة',
    streams: [getMockStreamUrl(cameraId)],
    placeholder: true,
  };
}

/**
 * 3. getRecordingList — return recorded clips for a camera in a date range
 */
async function getRecordingList(cameraId, startDate, endDate) {
  try {
    const query = { cameraId };
    if (startDate || endDate) {
      query.startTime = {};
      if (startDate) query.startTime.$gte = new Date(startDate);
      if (endDate) query.startTime.$lte = new Date(endDate);
    }
    const recordings = await CctvRecording.find(query).sort({ startTime: -1 }).limit(100).lean();
    if (recordings && recordings.length > 0) return recordings;
  } catch (_err) {
    // ignore
  }

  // Mock recordings
  const recordings = [];
  const base = new Date();
  for (let i = 0; i < 12; i++) {
    const start = new Date(base.getTime() - i * 2 * 3600_000);
    const end = new Date(start.getTime() + 30 * 60_000);
    recordings.push({
      _id: `rec-${cameraId}-${i}`,
      cameraId,
      startTime: start,
      endTime: end,
      durationMs: 30 * 60_000,
      kind: i % 3 === 0 ? 'motion' : 'continuous',
      sizeBytes: 45 * 1024 * 1024,
      resolution: '1920x1080',
      storage: { backend: 'nvr', uri: `nvr://192.168.1.10/recordings/${cameraId}/${start.toISOString()}.mp4` },
    });
  }
  return recordings;
}

/**
 * 4. getFaceRecognitionLog — face match events for a beneficiary
 */
async function getFaceRecognitionLog(beneficiaryId, startDate, endDate) {
  try {
    const identity = await CctvFaceIdentity.findOne({ beneficiaryId, status: 'active' }).lean();
    const faceId = identity?._id;

    const query = { 'aiResult.faceIdentityId': faceId, type: { $in: ['face_match', 'face_detected'] } };
    if (startDate || endDate) {
      query.startedAt = {};
      if (startDate) query.startedAt.$gte = new Date(startDate);
      if (endDate) query.startedAt.$lte = new Date(endDate);
    }
    const events = await CctvEvent.find(query).sort({ startedAt: -1 }).limit(200).lean();
    if (events && events.length > 0) return events;
  } catch (_err) {
    // ignore
  }

  // Mock face recognition events
  const logs = [];
  const base = new Date();
  for (let i = 0; i < 10; i++) {
    logs.push({
      _id: `face-${beneficiaryId}-${i}`,
      cameraId: MOCK_CAMERAS[i % MOCK_CAMERAS.length]._id,
      cameraCode: MOCK_CAMERAS[i % MOCK_CAMERAS.length].code,
      type: i % 4 === 0 ? 'face_unknown' : 'face_match',
      startedAt: new Date(base.getTime() - i * 45 * 60_000),
      confidence: 0.85 + Math.random() * 0.14,
      aiResult: {
        label: i % 4 === 0 ? 'غير معروف' : 'مستفيد معروف',
        confidence: 0.85 + Math.random() * 0.14,
        attributes: { age: 25, gender: 'male', glasses: false },
      },
      snapshot: { url: `https://snapshots.alawael.org/face/${beneficiaryId}/${i}.jpg` },
    });
  }
  return logs;
}

/**
 * 5. getAttendanceFromCCTV — check attendance via face recognition for a specific date
 */
async function getAttendanceFromCCTV(beneficiaryId, date) {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setHours(23, 59, 59, 999);

  try {
    const identity = await CctvFaceIdentity.findOne({ beneficiaryId, status: 'active' }).lean();
    if (identity) {
      const events = await CctvEvent.find({
        'aiResult.faceIdentityId': identity._id,
        type: 'face_match',
        startedAt: { $gte: dayStart, $lte: dayEnd },
      }).sort({ startedAt: 1 }).lean();

      if (events && events.length > 0) {
        return {
          present: true,
          firstSeen: events[0].startedAt,
          lastSeen: events[events.length - 1].startedAt,
          detectionCount: events.length,
          cameras: [...new Set(events.map(e => e.cameraCode))],
        };
      }
    }
  } catch (_err) {
    // ignore
  }

  // Mock attendance
  const hour = 8 + Math.floor(Math.random() * 4);
  return {
    present: true,
    firstSeen: new Date(dayStart.getTime() + hour * 3600_000),
    lastSeen: new Date(dayStart.getTime() + (hour + 6) * 3600_000),
    detectionCount: 6 + Math.floor(Math.random() * 10),
    cameras: ['CAM-001', 'CAM-002', 'CAM-005'],
  };
}

/**
 * 6. getSecurityAlerts — unauthorized access, face not recognized, camera offline
 */
async function getSecurityAlerts(startDate, endDate) {
  try {
    const query = {
      severity: { $in: ['medium', 'high', 'critical'] },
      status: { $in: ['open', 'acknowledged', 'investigating'] },
    };
    if (startDate || endDate) {
      query.firstEventAt = {};
      if (startDate) query.firstEventAt.$gte = new Date(startDate);
      if (endDate) query.firstEventAt.$lte = new Date(endDate);
    }
    const alerts = await CctvAlert.find(query).sort({ severity: -1, firstEventAt: -1 }).limit(100).lean();
    if (alerts && alerts.length > 0) return alerts;
  } catch (_err) {
    // ignore
  }

  // Mock alerts
  const now = new Date();
  return [
    { _id: 'alert-001', code: 'ALERT-2025-001', title_ar: 'وصول غير مصرح به — المدخل الخلفي', title_en: 'Unauthorized Access — Rear Entrance', severity: 'high', category: 'intrusion', status: 'open', firstEventAt: new Date(now - 30 * 60_000), lastEventAt: new Date(now - 30 * 60_000), eventCount: 1, cameraCode: 'CAM-004' },
    { _id: 'alert-002', code: 'ALERT-2025-002', title_ar: 'وجه غير معروف — قاعة العلاج', title_en: 'Unknown Face — Therapy Hall', severity: 'medium', category: 'access_control', status: 'acknowledged', firstEventAt: new Date(now - 120 * 60_000), lastEventAt: new Date(now - 120 * 60_000), eventCount: 3, cameraCode: 'CAM-002' },
    { _id: 'alert-003', code: 'ALERT-2025-003', title_ar: 'انقطاع الكاميرا — المواقف الخلفية', title_en: 'Camera Offline — Rear Parking', severity: 'high', category: 'system', status: 'investigating', firstEventAt: new Date(now - 240 * 60_000), lastEventAt: new Date(now - 10 * 60_000), eventCount: 5, cameraCode: 'CAM-004' },
    { _id: 'alert-004', code: 'ALERT-2025-004', title_ar: 'كثافة مرتفعة — المقصف', title_en: 'High Crowd Density — Cafeteria', severity: 'medium', category: 'crowd', status: 'open', firstEventAt: new Date(now - 60 * 60_000), lastEventAt: new Date(now - 60 * 60_000), eventCount: 1, cameraCode: 'CAM-003' },
    { _id: 'alert-005', code: 'ALERT-2025-005', title_ar: 'سقوط مكتشف — الصالة الرياضية', title_en: 'Fall Detected — Gym Hall', severity: 'critical', category: 'fall', status: 'open', firstEventAt: new Date(now - 15 * 60_000), lastEventAt: new Date(now - 15 * 60_000), eventCount: 1, cameraCode: 'CAM-007' },
    { _id: 'alert-006', code: 'ALERT-2025-006', title_ar: 'عرقلة كاميرا — الممر الرئيسي', title_en: 'Camera Tampering — Main Corridor', severity: 'high', category: 'tampering', status: 'open', firstEventAt: new Date(now - 90 * 60_000), lastEventAt: new Date(now - 90 * 60_000), eventCount: 2, cameraCode: 'CAM-008' },
  ];
}

/**
 * 7. getAnalytics — people count, heatmap data, peak hours
 */
async function getAnalytics(branchId, period) {
  // period: 'today', 'week', 'month'
  const now = new Date();
  const buckets = [];
  const points = period === 'today' ? 24 : period === 'week' ? 7 : 30;

  for (let i = 0; i < points; i++) {
    const t = new Date(now.getTime() - (points - 1 - i) * (period === 'today' ? 3600_000 : 86400_000));
    buckets.push({
      timestamp: t.toISOString(),
      label: period === 'today' ? `${t.getHours()}:00` : t.toLocaleDateString('ar-SA', { weekday: 'short' }),
      peopleCount: Math.floor(15 + Math.random() * 45),
      uniqueFaces: Math.floor(5 + Math.random() * 20),
      motionEvents: Math.floor(10 + Math.random() * 50),
    });
  }

  // Heatmap data (mock zone densities)
  const heatmap = [
    { zone: 'المدخل الرئيسي', x: 10, y: 10, intensity: 85 },
    { zone: 'قاعة العلاج', x: 30, y: 20, intensity: 72 },
    { zone: 'المقصف', x: 50, y: 15, intensity: 95 },
    { zone: 'المواقف', x: 80, y: 80, intensity: 40 },
    { zone: 'غرفة المستفيدين', x: 40, y: 40, intensity: 60 },
    { zone: 'المكتبة', x: 60, y: 30, intensity: 55 },
    { zone: 'الصالة الرياضية', x: 70, y: 50, intensity: 78 },
    { zone: 'الممر الرئيسي', x: 45, y: 45, intensity: 88 },
  ];

  // Peak hours
  const peakHours = [
    { hour: 8, count: 42 },
    { hour: 9, count: 65 },
    { hour: 10, count: 58 },
    { hour: 11, count: 72 },
    { hour: 12, count: 85 },
    { hour: 13, count: 55 },
    { hour: 14, count: 48 },
    { hour: 15, count: 60 },
    { hour: 16, count: 38 },
  ];

  return {
    branchId: branchId || 'HQ-01',
    period,
    generatedAt: new Date().toISOString(),
    peopleCountTrend: buckets,
    heatmap,
    peakHours,
    summary: {
      totalPeopleToday: 1240,
      avgPerHour: 52,
      peakHour: '12:00',
      alertsToday: 6,
      camerasOnline: 7,
      camerasOffline: 1,
      camerasDegraded: 1,
    },
  };
}

module.exports = {
  getCameraList,
  getLiveFeed,
  getRecordingList,
  getFaceRecognitionLog,
  getAttendanceFromCCTV,
  getSecurityAlerts,
  getAnalytics,
};
