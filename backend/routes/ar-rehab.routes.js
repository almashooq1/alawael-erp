/**
 * AR/XR Rehabilitation Routes — مسارات الواقع المعزز للتأهيل
 *
 * Wraps phase31-xr utility classes with REST API endpoints.
 *
 * Endpoints:
 *   /api/ar-rehab/sessions       — Mixed Reality therapy sessions
 *   /api/ar-rehab/holograms      — Holographic data visualization
 *   /api/ar-rehab/bci            — Brain-Computer Interface
 *   /api/ar-rehab/collaboration  — Cross-Reality collaboration
 *   /api/ar-rehab/analytics      — Immersive analytics dashboards
 *   /api/ar-rehab/dashboard      — AR/XR overview dashboard
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { authenticate } = require('../middleware/auth');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const {
  MixedRealityEngine,
  HolographicDataVisualization,
  BrainComputerInterfaceReady,
  CrossRealityCollaboration,
  ImmersiveAnalyticsDashboard,
} = require('../utils/phase31-xr');
const logger = require('../utils/logger');
const safeError = require('../utils/safeError');

// Singleton instances per tenant (simplified — single tenant)
const mrEngine = new MixedRealityEngine('default');
const holoViz = new HolographicDataVisualization('default');
const bciReady = new BrainComputerInterfaceReady('default');
const crossReality = new CrossRealityCollaboration('default');
const immersiveAnalytics = new ImmersiveAnalyticsDashboard('default');

// ── All AR/XR routes require authentication ───────────────────────
router.use(authenticate);
router.use(requireBranchAccess);
// ═══════════════════════════════════════════════════════════════════════════
// MR SESSIONS — جلسات الواقع المختلط
// ═══════════════════════════════════════════════════════════════════════════

router.post('/sessions', (req, res) => {
  try {
    const sessionId = `mr_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
    const session = mrEngine.initiateMRSession(sessionId, req.body);
    res.status(201).json({ success: true, data: session });
  } catch (error) {
    logger.error('[AR-Rehab] Create session error:', error.message);
    res.status(400).json({ success: false, error: safeError(error) });
  }
});

router.get('/sessions/:sessionId', (req, res) => {
  try {
    const view = mrEngine.getSessionView(req.params.sessionId, req.user?._id || 'anonymous');
    res.json({ success: true, data: view });
  } catch (error) {
    res.status(404).json({ success: false, error: safeError(error) });
  }
});

router.post('/sessions/:sessionId/objects', (req, res) => {
  try {
    const objectId = `obj_${Date.now()}`;
    const vrObject = mrEngine.createVirtualObject(objectId, req.body);
    const placement = mrEngine.placeObjectInEnvironment(
      req.params.sessionId,
      objectId,
      req.body.position || { x: 0, y: 0, z: 0 }
    );
    res.status(201).json({ success: true, data: { object: vrObject, placement } });
  } catch (error) {
    res.status(400).json({ success: false, error: safeError(error) });
  }
});

router.post('/sessions/:sessionId/track', (req, res) => {
  try {
    const result = mrEngine.trackRealWorldObject(req.params.sessionId, req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(404).json({ success: false, error: safeError(error) });
  }
});

router.patch('/sessions/:sessionId/end', (req, res) => {
  try {
    const result = mrEngine.endMRSession(req.params.sessionId);
    res.json({ success: true, data: result, message: 'تم إنهاء الجلسة' });
  } catch (error) {
    res.status(404).json({ success: false, error: safeError(error) });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// HOLOGRAMS — الصور المجسمة
// ═══════════════════════════════════════════════════════════════════════════

router.post('/holograms', (req, res) => {
  try {
    const hologramId = `holo_${Date.now()}`;
    const hologram = holoViz.createHologram(hologramId, req.body.dataSource, req.body);
    res.status(201).json({ success: true, data: hologram });
  } catch (error) {
    res.status(400).json({ success: false, error: safeError(error) });
  }
});

router.get('/holograms/:hologramId', (req, res) => {
  try {
    const rendering = holoViz.renderHologram(req.params.hologramId, req.query);
    res.json({ success: true, data: rendering });
  } catch (error) {
    res.status(404).json({ success: false, error: safeError(error) });
  }
});

router.put('/holograms/:hologramId/data', (req, res) => {
  try {
    const result = holoViz.updateHologramData(req.params.hologramId, req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(404).json({ success: false, error: safeError(error) });
  }
});

router.post('/holograms/:hologramId/interactive', (req, res) => {
  try {
    const element = holoViz.addInteractiveElement(req.params.hologramId, req.body);
    res.status(201).json({ success: true, data: element });
  } catch (error) {
    res.status(404).json({ success: false, error: safeError(error) });
  }
});

router.get('/holograms/:hologramId/metrics', (req, res) => {
  try {
    const metrics = holoViz.getHologramMetrics(req.params.hologramId);
    res.json({ success: true, data: metrics });
  } catch (error) {
    res.status(404).json({ success: false, error: safeError(error) });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// BCI — واجهة الدماغ والحاسوب
// ═══════════════════════════════════════════════════════════════════════════

router.post('/bci/devices', (req, res) => {
  try {
    const deviceId = `bci_${Date.now()}`;
    const device = bciReady.registerBCIDevice(deviceId, req.body);
    res.status(201).json({ success: true, data: device });
  } catch (error) {
    res.status(400).json({ success: false, error: safeError(error) });
  }
});

router.post('/bci/devices/:deviceId/calibrate', (req, res) => {
  try {
    const result = bciReady.calibrateBCIDevice(req.params.deviceId);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(404).json({ success: false, error: safeError(error) });
  }
});

router.post('/bci/devices/:deviceId/capture', (req, res) => {
  try {
    const { duration } = req.body;
    const signals = bciReady.captureBCISignals(req.params.deviceId, duration || 5);
    // Don't send raw signal data — too large. Send summary
    res.json({
      success: true,
      data: {
        deviceId: signals.deviceId,
        duration: signals.duration,
        channels: signals.channels,
        samplingRate: signals.samplingRate,
        quality: signals.quality,
        samplesPerChannel: signals.samples?.[0]?.length || 0,
      },
    });
  } catch (error) {
    res.status(400).json({ success: false, error: safeError(error) });
  }
});

router.post('/bci/decode', (req, res) => {
  try {
    const command = bciReady.decodeBCICommand(req.body.signals);
    res.json({ success: true, data: command });
  } catch (error) {
    safeError(res, error, 'ar-rehab');
  }
});

router.post('/bci/train', (req, res) => {
  try {
    const trainingId = `train_${Date.now()}`;
    const result = bciReady.trainBCIModel(trainingId, req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'ar-rehab');
  }
});

router.get('/bci/capabilities', (_req, res) => {
  try {
    const capabilities = bciReady.getBCICapabilities();
    res.json({ success: true, data: capabilities });
  } catch (error) {
    safeError(res, error, 'ar-rehab');
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// COLLABORATION — التعاون عبر الواقع
// ═══════════════════════════════════════════════════════════════════════════

router.post('/collaboration/sessions', (req, res) => {
  try {
    const sessionId = `collab_${Date.now()}`;
    const session = crossReality.createCrossRealitySession(sessionId, req.body);
    res.status(201).json({ success: true, data: session });
  } catch (error) {
    res.status(400).json({ success: false, error: safeError(error) });
  }
});

router.post('/collaboration/sessions/:sessionId/join', (req, res) => {
  try {
    const userId = req.user?._id || req.body.userId || `user_${Date.now()}`;
    const participant = crossReality.addParticipant(req.params.sessionId, userId, req.body);
    res.json({ success: true, data: participant });
  } catch (error) {
    res.status(400).json({ success: false, error: safeError(error) });
  }
});

router.put('/collaboration/sessions/:sessionId/sync', (req, res) => {
  try {
    const result = crossReality.syncSharedSpace(req.params.sessionId, req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(404).json({ success: false, error: safeError(error) });
  }
});

router.post('/collaboration/sessions/:sessionId/broadcast', (req, res) => {
  try {
    const userId = req.user?._id || req.body.userId;
    const result = crossReality.broadcastCommunication(
      req.params.sessionId,
      userId,
      req.body.message
    );
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(404).json({ success: false, error: safeError(error) });
  }
});

router.get('/collaboration/sessions/:sessionId/metrics', (req, res) => {
  try {
    const metrics = crossReality.recordCollaborationMetrics(req.params.sessionId);
    res.json({ success: true, data: metrics });
  } catch (error) {
    res.status(404).json({ success: false, error: safeError(error) });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// IMMERSIVE ANALYTICS — التحليلات الغامرة
// ═══════════════════════════════════════════════════════════════════════════

router.post('/analytics/dashboards', (req, res) => {
  try {
    const dashboardId = `dash_${Date.now()}`;
    const dashboard = immersiveAnalytics.createImmersiveDashboard(dashboardId, req.body);
    res.status(201).json({ success: true, data: dashboard });
  } catch (error) {
    res.status(400).json({ success: false, error: safeError(error) });
  }
});

router.post('/analytics/dashboards/:dashboardId/widgets', (req, res) => {
  try {
    const widget = immersiveAnalytics.addImmersiveWidget(req.params.dashboardId, req.body);
    res.status(201).json({ success: true, data: widget });
  } catch (error) {
    res.status(404).json({ success: false, error: safeError(error) });
  }
});

router.post('/analytics/dashboards/:dashboardId/widgets/:widgetId/interact', (req, res) => {
  try {
    const result = immersiveAnalytics.interactWithWidget(
      req.params.dashboardId,
      req.params.widgetId,
      req.body
    );
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(404).json({ success: false, error: safeError(error) });
  }
});

router.get('/analytics/dashboards/:dashboardId', (req, res) => {
  try {
    const view = immersiveAnalytics.getDashboardView(req.params.dashboardId, req.query);
    res.json({ success: true, data: view });
  } catch (error) {
    res.status(404).json({ success: false, error: safeError(error) });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD — لوحة تحكم AR/XR
// ═══════════════════════════════════════════════════════════════════════════

router.get('/dashboard', (_req, res) => {
  try {
    res.json({
      success: true,
      data: {
        mixedReality: {
          activeSessions: mrEngine.sessions.size,
          virtualObjects: mrEngine.objects.size,
        },
        holograms: {
          total: holoViz.holograms.size,
          visualizations: holoViz.visualizations.size,
        },
        bci: {
          registeredDevices: bciReady.bciDevices.size,
          capabilities: bciReady.getBCICapabilities(),
        },
        collaboration: {
          activeSessions: crossReality.collaborationSessions.size,
          participants: crossReality.participants.size,
        },
        analytics: {
          dashboards: immersiveAnalytics.dashboards.size,
          widgets: immersiveAnalytics.widgets.size,
        },
      },
    });
  } catch (error) {
    safeError(res, error, '[AR-Rehab] Dashboard error');
  }
});

module.exports = router;
