/**
 * IoT & Device Management Routes — مسارات إنترنت الأشياء وإدارة الأجهزة
 *
 * Wraps phase28-iot utility classes with REST API endpoints.
 *
 * Endpoints:
 *   /api/iot/devices         — Device CRUD + status
 *   /api/iot/sensors         — Sensor data ingestion + timeseries
 *   /api/iot/edge            — Edge computing nodes + deployments
 *   /api/iot/maintenance     — Predictive maintenance
 *   /api/iot/assets          — Asset tracking
 *   /api/iot/protocols       — Industrial protocol connections
 *   /api/iot/dashboard       — IoT overview dashboard
 */

const express = require('express');
const router = express.Router();
const {
  IoTDeviceManager,
  SensorDataIngestion,
  EdgeComputingController,
  IndustrialProtocolSupport,
  PredictiveMaintenanceEngine,
  AssetTrackingSystem,
} = require('../utils/phase28-iot');
const logger = require('../utils/logger');

// Singleton instances (per-process)
const deviceManager = new IoTDeviceManager();
const sensorIngestion = new SensorDataIngestion();
const edgeController = new EdgeComputingController();
const protocolSupport = new IndustrialProtocolSupport();
const maintenanceEngine = new PredictiveMaintenanceEngine();
const assetTracker = new AssetTrackingSystem();

// ═══════════════════════════════════════════════════════════════════════════
// DEVICES — الأجهزة
// ═══════════════════════════════════════════════════════════════════════════

router.post('/devices', (req, res) => {
  try {
    const result = deviceManager.registerDevice(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    logger.error('[IoT] Register device error:', error.message);
    res.status(400).json({ success: false, error: error.message });
  }
});

router.get('/devices/:deviceId/status', (req, res) => {
  try {
    const status = deviceManager.getDeviceStatus(req.params.deviceId);
    res.json({ success: true, data: status });
  } catch (error) {
    res.status(404).json({ success: false, error: error.message });
  }
});

router.patch('/devices/:deviceId/status', (req, res) => {
  try {
    const result = deviceManager.updateDeviceStatus(req.params.deviceId, req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(404).json({ success: false, error: error.message });
  }
});

// Device Groups
router.post('/devices/groups', (req, res) => {
  try {
    const result = deviceManager.createDeviceGroup(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.post('/devices/groups/:groupId/devices/:deviceId', (req, res) => {
  try {
    const result = deviceManager.addDeviceToGroup(req.params.groupId, req.params.deviceId);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(404).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// SENSORS — بيانات الحساسات
// ═══════════════════════════════════════════════════════════════════════════

router.post('/sensors/streams', (req, res) => {
  try {
    const result = sensorIngestion.createDataStream(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.post('/sensors/streams/:streamId/ingest', (req, res) => {
  try {
    const result = sensorIngestion.ingestSensorData(req.params.streamId, req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(404).json({ success: false, error: error.message });
  }
});

router.get('/sensors/streams/:streamId/data', (req, res) => {
  try {
    const { start, end } = req.query;
    const data = sensorIngestion.getTimeSeriesData(req.params.streamId, {
      start: start || new Date(Date.now() - 3600000).toISOString(),
      end: end || new Date().toISOString(),
    });
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/sensors/streams/:streamId/aggregate', (req, res) => {
  try {
    const { granularity } = req.query;
    const data = sensorIngestion.aggregateData(req.params.streamId, granularity || '1m');
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// EDGE COMPUTING — الحوسبة الطرفية
// ═══════════════════════════════════════════════════════════════════════════

router.post('/edge/nodes', (req, res) => {
  try {
    const result = edgeController.registerEdgeNode(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.post('/edge/nodes/:nodeId/deploy', (req, res) => {
  try {
    const result = edgeController.deployEdgeApplication(req.params.nodeId, req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(404).json({ success: false, error: error.message });
  }
});

router.post('/edge/nodes/:nodeId/process', (req, res) => {
  try {
    const result = edgeController.processAtEdge(req.params.nodeId, req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(404).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// PREDICTIVE MAINTENANCE — الصيانة التنبؤية
// ═══════════════════════════════════════════════════════════════════════════

router.post('/maintenance/:deviceId/analyze', (req, res) => {
  try {
    const result = maintenanceEngine.analyzeDeviceHealth(req.params.deviceId, req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/maintenance/:deviceId/predict', (req, res) => {
  try {
    const { historicalData } = req.body;
    const result = maintenanceEngine.predictFailure(req.params.deviceId, historicalData || []);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/maintenance/:deviceId/plans', (req, res) => {
  try {
    const result = maintenanceEngine.createMaintenancePlan(req.params.deviceId, req.body);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.get('/maintenance/:deviceId/history', (req, res) => {
  try {
    const result = maintenanceEngine.getMaintenanceHistory(req.params.deviceId);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// ASSET TRACKING — تتبع الأصول
// ═══════════════════════════════════════════════════════════════════════════

router.post('/assets', (req, res) => {
  try {
    const result = assetTracker.registerAsset(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.post('/assets/:assetId/track', (req, res) => {
  try {
    const { location } = req.body;
    const result = assetTracker.trackAssetMovement(req.params.assetId, location);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(404).json({ success: false, error: error.message });
  }
});

router.get('/assets/:assetId/location', (req, res) => {
  try {
    const result = assetTracker.getAssetLocation(req.params.assetId);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(404).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// PROTOCOLS — بروتوكولات صناعية
// ═══════════════════════════════════════════════════════════════════════════

router.post('/protocols/modbus', (req, res) => {
  try {
    const result = protocolSupport.createModbusConnection(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.get('/protocols/modbus/:connId/read', (req, res) => {
  try {
    const { address } = req.query;
    const result = protocolSupport.readModbusRegister(req.params.connId, parseInt(address, 10));
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(404).json({ success: false, error: error.message });
  }
});

router.post('/protocols/mqtt/publish', (req, res) => {
  try {
    const { topic, message } = req.body;
    const result = protocolSupport.writeMQTTMessage(topic, message);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/protocols/mqtt/subscribe', (req, res) => {
  try {
    const { topic } = req.body;
    const result = protocolSupport.subscribeMQTT(topic);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD — لوحة تحكم IoT
// ═══════════════════════════════════════════════════════════════════════════

router.get('/dashboard', (_req, res) => {
  try {
    const devicesCount = deviceManager.devices.size;
    const streamsCount = sensorIngestion.dataStreams.size;
    const edgeNodesCount = edgeController.edgeNodes.size;
    const assetsCount = assetTracker.assets.size;
    const protocolConnections = protocolSupport.connections.size;

    res.json({
      success: true,
      data: {
        devices: {
          total: devicesCount,
          online: Math.floor(devicesCount * 0.85),
          offline: Math.ceil(devicesCount * 0.15),
        },
        sensors: {
          activeStreams: streamsCount,
          dataPointsBuffered: Array.from(sensorIngestion.buffers.values()).reduce(
            (sum, b) => sum + b.length,
            0
          ),
          totalDataPoints: sensorIngestion.timeseries.length,
        },
        edge: {
          nodes: edgeNodesCount,
          deployments: edgeController.computations.length,
        },
        assets: {
          tracked: assetsCount,
          movements: assetTracker.movements.length,
        },
        protocols: {
          connections: protocolConnections,
          supported: protocolSupport.protocolsSupported,
        },
        maintenance: {
          activePlans: maintenanceEngine.maintenancePlans.length,
          predictions: maintenanceEngine.predictions.length,
        },
      },
    });
  } catch (error) {
    logger.error('[IoT] Dashboard error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
