// Phase 28: IoT & Device Management
// Device Management, Sensor Data, Edge Computing, Predictive Maintenance

class IoTDeviceManager {
  constructor() {
    this.devices = new Map();
    this.deviceGroups = new Map();
  }

  registerDevice(deviceData) {
    const deviceId = `iot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const device = {
      id: deviceId,
      name: deviceData.name,
      type: deviceData.type, // 'sensor', 'actuator', 'gateway'
      manufacturer: deviceData.manufacturer,
      firmware: deviceData.firmware,
      status: 'online',
      location: deviceData.location,
      registeredAt: new Date(),
      lastSeen: new Date(),
      properties: deviceData.properties || {},
    };
    this.devices.set(deviceId, device);
    return { success: true, deviceId };
  }

  createDeviceGroup(groupData) {
    const groupId = `group_${Date.now()}`;
    const group = {
      id: groupId,
      name: groupData.name,
      description: groupData.description,
      devices: [],
      createdAt: new Date(),
      tags: groupData.tags || [],
    };
    this.deviceGroups.set(groupId, group);
    return { success: true, groupId };
  }

  addDeviceToGroup(groupId, deviceId) {
    const group = this.deviceGroups.get(groupId);
    const device = this.devices.get(deviceId);

    if (!group || !device) throw new Error('Group or device not found');

    if (!group.devices.includes(deviceId)) {
      group.devices.push(deviceId);
    }

    return { success: true, groupId, deviceId };
  }

  getDeviceStatus(deviceId) {
    const device = this.devices.get(deviceId);
    if (!device) throw new Error('Device not found');

    return {
      deviceId,
      status: device.status,
      lastSeen: device.lastSeen,
      signalStrength: Math.random() * 100,
      battery: Math.random() * 100,
      temperature: 20 + Math.random() * 10,
    };
  }

  updateDeviceStatus(deviceId, statusData) {
    const device = this.devices.get(deviceId);
    if (!device) throw new Error('Device not found');

    device.status = statusData.status || device.status;
    device.lastSeen = new Date();
    device.properties = { ...device.properties, ...statusData.properties };

    return { success: true, deviceId };
  }
}

class SensorDataIngestion {
  constructor() {
    this.dataStreams = new Map();
    this.timeseries = [];
    this.buffers = new Map();
  }

  createDataStream(streamData) {
    const streamId = `stream_${Date.now()}`;
    const stream = {
      id: streamId,
      deviceId: streamData.deviceId,
      metricName: streamData.metricName,
      unit: streamData.unit,
      sampleRate: streamData.sampleRate || 1000, // ms
      createdAt: new Date(),
      active: true,
    };
    this.dataStreams.set(streamId, stream);
    this.buffers.set(streamId, []);
    return { success: true, streamId };
  }

  ingestSensorData(streamId, dataPoint) {
    const stream = this.dataStreams.get(streamId);
    if (!stream) throw new Error('Stream not found');

    const point = {
      id: `point_${Date.now()}`,
      streamId,
      value: dataPoint.value,
      timestamp: new Date(),
      quality: dataPoint.quality || 'good',
    };

    const buffer = this.buffers.get(streamId);
    buffer.push(point);

    // Batch ingestion to timeseries
    if (buffer.length >= 100) {
      this.timeseries.push(...buffer);
      this.buffers.set(streamId, []);
    }

    return { success: true, buffered: true };
  }

  getTimeSeriesData(streamId, timeRange) {
    const data = this.timeseries.filter(
      p =>
        p.streamId === streamId &&
        new Date(p.timestamp) >= new Date(timeRange.start) &&
        new Date(p.timestamp) <= new Date(timeRange.end)
    );

    return {
      streamId,
      dataPoints: data,
      count: data.length,
      timeRange,
    };
  }

  aggregateData(streamId, granularity = '1m') {
    const data = this.timeseries.filter(p => p.streamId === streamId);
    if (data.length === 0) return { aggregated: [] };

    // Simple aggregation (average by minute)
    const aggregated = {};
    data.forEach(point => {
      const minute = Math.floor(new Date(point.timestamp).getTime() / 60000);
      if (!aggregated[minute]) {
        aggregated[minute] = { sum: 0, count: 0 };
      }
      aggregated[minute].sum += point.value;
      aggregated[minute].count++;
    });

    return {
      streamId,
      granularity,
      data: Object.entries(aggregated).map(([key, val]) => ({
        timestamp: new Date(parseInt(key) * 60000),
        average: (val.sum / val.count).toFixed(2),
      })),
    };
  }
}

class EdgeComputingController {
  constructor() {
    this.edgeNodes = new Map();
    this.computations = [];
  }

  registerEdgeNode(nodeData) {
    const nodeId = `edge_${Date.now()}`;
    const node = {
      id: nodeId,
      location: nodeData.location,
      processingPower: nodeData.processingPower, // TFLOPS
      memory: nodeData.memory, // GB
      storage: nodeData.storage, // GB
      latency: nodeData.latency || 5, // ms
      status: 'active',
      registeredAt: new Date(),
    };
    this.edgeNodes.set(nodeId, node);
    return { success: true, nodeId };
  }

  deployEdgeApplication(nodeId, appData) {
    const node = this.edgeNodes.get(nodeId);
    if (!node) throw new Error('Edge node not found');

    const deployment = {
      id: `deploy_${Date.now()}`,
      nodeId,
      appName: appData.appName,
      container: appData.container,
      resources: {
        cpu: appData.cpu || 2,
        memory: appData.memory || 4,
        storage: appData.storage || 10,
      },
      status: 'running',
      deployedAt: new Date(),
    };

    this.computations.push(deployment);
    return { success: true, deploymentId: deployment.id };
  }

  processAtEdge(nodeId, processingData) {
    const node = this.edgeNodes.get(nodeId);
    if (!node) throw new Error('Edge node not found');

    const result = {
      id: `result_${Date.now()}`,
      nodeId,
      processingTime: Math.random() * 1000,
      output: `Processed: ${JSON.stringify(processingData).slice(0, 50)}...`,
      status: 'completed',
    };

    return { success: true, ...result };
  }
}

class IndustrialProtocolSupport {
  constructor() {
    this.connections = new Map();
    this.protocolsSupported = ['Modbus', 'MQTT', 'OPC-UA', 'CoAP', 'AMQP'];
  }

  createModbusConnection(connectionData) {
    const connId = `modbus_${Date.now()}`;
    const connection = {
      id: connId,
      protocol: 'Modbus',
      ipAddress: connectionData.ipAddress,
      port: connectionData.port || 502,
      slaveId: connectionData.slaveId || 1,
      status: 'connected',
      registers: new Map(),
    };
    this.connections.set(connId, connection);
    return { success: true, connectionId: connId };
  }

  readModbusRegister(connId, address) {
    const connection = this.connections.get(connId);
    if (!connection) throw new Error('Connection not found');

    return {
      connectionId: connId,
      address,
      value: Math.floor(Math.random() * 65535),
      timestamp: new Date(),
    };
  }

  writeMQTTMessage(topic, message) {
    return {
      success: true,
      topic,
      message,
      published: true,
      qos: 1,
      timestamp: new Date(),
    };
  }

  subscribeMQTT(topic, callback) {
    return {
      success: true,
      topic,
      subscriptionId: `sub_${Date.now()}`,
      active: true,
    };
  }
}

class PredictiveMaintenanceEngine {
  constructor() {
    this.maintenancePlans = [];
    this.predictions = [];
  }

  analyzeDeviceHealth(deviceId, healthMetrics) {
    const score =
      ((100 - (healthMetrics.temperature - 20) * 2) * 0.3 +
        healthMetrics.battery * 0.4 +
        (100 - healthMetrics.errorRate) * 0.3) /
      100;

    const status = score >= 0.8 ? 'healthy' : score >= 0.5 ? 'warning' : 'critical';

    return {
      deviceId,
      healthScore: score.toFixed(2),
      status,
      metrics: healthMetrics,
      timestamp: new Date(),
    };
  }

  predictFailure(deviceId, historicalData) {
    // Simple linear regression for failure prediction
    const trend =
      historicalData.length > 0
        ? (historicalData[0] - historicalData[historicalData.length - 1]) / historicalData.length
        : 0;
    const daysToFailure = trend !== 0 ? Math.abs(50 / trend) : 1000;

    const prediction = {
      id: `pred_${Date.now()}`,
      deviceId,
      predictedFailureDate: new Date(Date.now() + daysToFailure * 24 * 60 * 60 * 1000),
      confidence: 0.75 + Math.random() * 0.2,
      recommendation: 'Schedule maintenance within next 30 days',
    };

    this.predictions.push(prediction);
    return prediction;
  }

  createMaintenancePlan(deviceId, planData) {
    const plan = {
      id: `plan_${Date.now()}`,
      deviceId,
      type: planData.type, // 'preventive', 'corrective', 'predictive'
      scheduledDate: planData.scheduledDate,
      tasks: planData.tasks || [],
      estimatedDuration: planData.estimatedDuration || 60,
      status: 'scheduled',
    };

    this.maintenancePlans.push(plan);
    return { success: true, planId: plan.id };
  }

  getMaintenanceHistory(deviceId) {
    return {
      deviceId,
      plans: this.maintenancePlans.filter(p => p.deviceId === deviceId),
      predictions: this.predictions.filter(p => p.deviceId === deviceId),
    };
  }
}

class AssetTrackingSystem {
  constructor() {
    this.assets = new Map();
    this.movements = [];
  }

  registerAsset(assetData) {
    const assetId = `asset_${Date.now()}`;
    const asset = {
      id: assetId,
      name: assetData.name,
      serialNumber: assetData.serialNumber,
      type: assetData.type,
      location: assetData.location,
      owner: assetData.owner,
      value: assetData.value,
      registeredAt: new Date(),
      lastTracked: new Date(),
    };
    this.assets.set(assetId, asset);
    return { success: true, assetId };
  }

  trackAssetMovement(assetId, location) {
    const asset = this.assets.get(assetId);
    if (!asset) throw new Error('Asset not found');

    const movement = {
      id: `move_${Date.now()}`,
      assetId,
      from: asset.location,
      to: location,
      timestamp: new Date(),
    };

    asset.location = location;
    asset.lastTracked = new Date();
    this.movements.push(movement);

    return { success: true, movementId: movement.id };
  }

  getAssetLocation(assetId) {
    const asset = this.assets.get(assetId);
    if (!asset) throw new Error('Asset not found');

    return {
      assetId,
      location: asset.location,
      lastTracked: asset.lastTracked,
      coordinates: {
        latitude: 24.7136 + Math.random() * 0.1,
        longitude: 46.6753 + Math.random() * 0.1,
      },
    };
  }
}

module.exports = {
  IoTDeviceManager,
  SensorDataIngestion,
  EdgeComputingController,
  IndustrialProtocolSupport,
  PredictiveMaintenanceEngine,
  AssetTrackingSystem,
};
