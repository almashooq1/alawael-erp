/**
 * IoT & Wearables Integration Service
 * نظام IoT والأجهزة القابلة للارتداء — البرومبت 28
 *
 * @module rehabilitation-gamification/iot-wearables-service
 * @description نظام متكامل لربط الأجهزة الذكية والقابلة للارتداء بمنصة التأهيل
 * @version 1.0.0
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

// ============================================================
// نماذج البيانات — IoT Device Types
// ============================================================

const iotDeviceTypeSchema = new Schema(
  {
    uuid: { type: String, unique: true, default: () => require('crypto').randomUUID() },
    branch_id: { type: Schema.Types.ObjectId, ref: 'Branch' },
    name: { type: String, required: true },
    name_ar: { type: String, required: true },
    manufacturer: String,
    model_number: String,
    category: {
      type: String,
      enum: [
        'wearable',
        'sensor',
        'therapy_equipment',
        'vital_monitor',
        'motion_tracker',
        'emg_device',
        'smart_scale',
      ],
      required: true,
    },
    communication_protocol: {
      type: String,
      enum: ['mqtt', 'bluetooth', 'ble', 'wifi', 'zigbee', 'http', 'websocket'],
      required: true,
    },
    supported_metrics: [String], // ['heart_rate', 'spo2', 'steps', ...]
    specifications: Schema.Types.Mixed,
    firmware_version: String,
    description: String,
    setup_instructions: String,
    image_path: String,
    is_active: { type: Boolean, default: true },
    created_by: { type: Schema.Types.ObjectId, ref: 'User' },
    updated_by: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// ============================================================
// نموذج أجهزة IoT المسجلة
// ============================================================

const iotDeviceSchema = new Schema(
  {
    uuid: { type: String, unique: true, default: () => require('crypto').randomUUID() },
    branch_id: { type: Schema.Types.ObjectId, ref: 'Branch' },
    device_type_id: { type: Schema.Types.ObjectId, ref: 'IotDeviceType', required: true },
    serial_number: { type: String, unique: true, required: true },
    mac_address: String,
    ip_address: String,
    name: { type: String, required: true },
    location: String,
    status: {
      type: String,
      enum: ['active', 'inactive', 'maintenance', 'error', 'disconnected', 'decommissioned'],
      default: 'inactive',
    },
    last_ping_at: Date,
    last_data_at: Date,
    configuration: Schema.Types.Mixed,
    mqtt_config: {
      topic: String,
      qos: { type: Number, default: 1 },
      client_id: String,
    },
    firmware_version: String,
    warranty_expiry: Date,
    next_maintenance_date: Date,
    calibration_date: Date,
    next_calibration_date: Date,
    notes: String,
    is_shared: { type: Boolean, default: false },
    created_by: { type: Schema.Types.ObjectId, ref: 'User' },
    updated_by: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

iotDeviceSchema.index({ status: 1 });
iotDeviceSchema.index({ serial_number: 1 });
iotDeviceSchema.index({ last_ping_at: 1 });

// Virtual: هل الجهاز متصل؟
iotDeviceSchema.virtual('is_online').get(function () {
  if (!this.last_ping_at) return false;
  return Date.now() - new Date(this.last_ping_at).getTime() < 5 * 60 * 1000;
});

// ============================================================
// نموذج تعيين الأجهزة للمستفيدين
// ============================================================

const iotDeviceAssignmentSchema = new Schema(
  {
    uuid: { type: String, unique: true, default: () => require('crypto').randomUUID() },
    branch_id: { type: Schema.Types.ObjectId, ref: 'Branch' },
    device_id: { type: Schema.Types.ObjectId, ref: 'IotDevice', required: true },
    beneficiary_id: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    assigned_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    assigned_at: { type: Date, default: Date.now },
    returned_at: Date,
    status: {
      type: String,
      enum: ['active', 'returned', 'lost', 'damaged'],
      default: 'active',
    },
    assignment_notes: String,
    return_notes: String,
    device_settings: Schema.Types.Mixed,
    created_by: { type: Schema.Types.ObjectId, ref: 'User' },
    updated_by: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

iotDeviceAssignmentSchema.index({ device_id: 1, status: 1 });
iotDeviceAssignmentSchema.index({ beneficiary_id: 1, status: 1 });

// ============================================================
// نموذج قراءات IoT — TimeSeries
// ============================================================

const iotReadingSchema = new Schema(
  {
    uuid: { type: String, unique: true, default: () => require('crypto').randomUUID() },
    branch_id: { type: Schema.Types.ObjectId, ref: 'Branch' },
    device_id: { type: Schema.Types.ObjectId, ref: 'IotDevice', required: true },
    beneficiary_id: { type: Schema.Types.ObjectId, ref: 'Beneficiary' },
    session_id: { type: Schema.Types.ObjectId, ref: 'RehabSession' },
    metric_type: {
      type: String,
      enum: [
        'heart_rate',
        'spo2',
        'blood_pressure',
        'temperature',
        'steps',
        'emg',
        'motion',
        'range_of_motion',
        'grip_strength',
        'balance_score',
        'gait_speed',
        'respiratory_rate',
        'weight',
        'sleep',
        'calories',
        'distance',
      ],
      required: true,
    },
    value: { type: Number, required: true },
    unit: { type: String, required: true }, // bpm, %, mmHg, °C, steps, mV, deg
    secondary_value: Number,
    secondary_unit: String,
    recorded_at: { type: Date, default: Date.now, required: true },
    metadata: Schema.Types.Mixed,
    is_anomaly: { type: Boolean, default: false },
    anomaly_type: { type: String, enum: ['high', 'low', 'irregular'] },
    is_processed: { type: Boolean, default: false },
    created_by: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

iotReadingSchema.index({ device_id: 1, metric_type: 1, recorded_at: -1 });
iotReadingSchema.index({ beneficiary_id: 1, metric_type: 1, recorded_at: -1 });
iotReadingSchema.index({ recorded_at: -1 });
iotReadingSchema.index({ is_anomaly: 1 });

// ============================================================
// نموذج قواعد التنبيهات
// ============================================================

const iotAlertRuleSchema = new Schema(
  {
    uuid: { type: String, unique: true, default: () => require('crypto').randomUUID() },
    branch_id: { type: Schema.Types.ObjectId, ref: 'Branch' },
    device_type_id: { type: Schema.Types.ObjectId, ref: 'IotDeviceType' },
    name: { type: String, required: true },
    name_ar: { type: String, required: true },
    metric_type: { type: String, required: true },
    condition: {
      type: String,
      enum: ['gt', 'lt', 'gte', 'lte', 'eq', 'between', 'outside'],
      required: true,
    },
    threshold_min: { type: Number, required: true },
    threshold_max: Number,
    severity: {
      type: String,
      enum: ['info', 'warning', 'critical', 'emergency'],
      default: 'warning',
    },
    cooldown_minutes: { type: Number, default: 5 },
    notification_channels: [{ type: String, enum: ['sms', 'push', 'email', 'whatsapp'] }],
    notify_roles: [String],
    is_active: { type: Boolean, default: true },
    description: String,
    created_by: { type: Schema.Types.ObjectId, ref: 'User' },
    updated_by: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// ============================================================
// نموذج تنبيهات IoT
// ============================================================

const iotAlertSchema = new Schema(
  {
    uuid: { type: String, unique: true, default: () => require('crypto').randomUUID() },
    branch_id: { type: Schema.Types.ObjectId, ref: 'Branch' },
    device_id: { type: Schema.Types.ObjectId, ref: 'IotDevice', required: true },
    beneficiary_id: { type: Schema.Types.ObjectId, ref: 'Beneficiary' },
    reading_id: { type: Schema.Types.ObjectId, ref: 'IotReading' },
    alert_type: {
      type: String,
      enum: [
        'threshold_exceeded',
        'device_offline',
        'low_battery',
        'anomaly',
        'calibration_due',
        'maintenance_due',
      ],
      required: true,
    },
    severity: {
      type: String,
      enum: ['info', 'warning', 'critical', 'emergency'],
      required: true,
    },
    metric_type: String,
    threshold_value: Number,
    actual_value: Number,
    message: { type: String, required: true },
    message_ar: { type: String, required: true },
    triggered_at: { type: Date, default: Date.now },
    acknowledged_at: Date,
    acknowledged_by: { type: Schema.Types.ObjectId, ref: 'User' },
    resolved_at: Date,
    resolved_by: { type: Schema.Types.ObjectId, ref: 'User' },
    resolution_notes: String,
    status: {
      type: String,
      enum: ['active', 'acknowledged', 'resolved', 'dismissed'],
      default: 'active',
    },
    created_by: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

iotAlertSchema.index({ status: 1, severity: 1 });
iotAlertSchema.index({ triggered_at: -1 });
iotAlertSchema.index({ branch_id: 1, status: 1 });

// ============================================================
// نموذج صيانة الأجهزة
// ============================================================

const iotMaintenanceSchema = new Schema(
  {
    uuid: { type: String, unique: true, default: () => require('crypto').randomUUID() },
    branch_id: { type: Schema.Types.ObjectId, ref: 'Branch' },
    device_id: { type: Schema.Types.ObjectId, ref: 'IotDevice', required: true },
    type: {
      type: String,
      enum: ['preventive', 'corrective', 'calibration', 'firmware_update'],
      required: true,
    },
    status: {
      type: String,
      enum: ['scheduled', 'in_progress', 'completed', 'cancelled'],
      default: 'scheduled',
    },
    scheduled_date: { type: Date, required: true },
    completed_date: Date,
    technician_id: { type: Schema.Types.ObjectId, ref: 'User' },
    description: String,
    findings: String,
    actions_taken: String,
    cost: Number,
    parts_replaced: [String],
    next_firmware_version: String,
    created_by: { type: Schema.Types.ObjectId, ref: 'User' },
    updated_by: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// ============================================================
// نموذج خطوط الأساس للعلامات الحيوية
// ============================================================

const vitalBaselineSchema = new Schema(
  {
    uuid: { type: String, unique: true, default: () => require('crypto').randomUUID() },
    branch_id: { type: Schema.Types.ObjectId, ref: 'Branch' },
    beneficiary_id: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    metric_type: { type: String, required: true },
    baseline_min: { type: Number, required: true },
    baseline_max: { type: Number, required: true },
    target_value: Number,
    unit: { type: String, required: true },
    set_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    effective_from: { type: Date, required: true },
    effective_to: Date,
    notes: String,
    created_by: { type: Schema.Types.ObjectId, ref: 'User' },
    updated_by: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

vitalBaselineSchema.index({ beneficiary_id: 1, metric_type: 1 });

// ============================================================
// تسجيل النماذج
// ============================================================

const IotDeviceType =
  mongoose.models.IotDeviceType || mongoose.model('IotDeviceType', iotDeviceTypeSchema);
const IotDevice = mongoose.models.IotDevice || mongoose.model('IotDevice', iotDeviceSchema);
const IotDeviceAssignment =
  mongoose.models.IotDeviceAssignment ||
  mongoose.model('IotDeviceAssignment', iotDeviceAssignmentSchema);
const IotReading = mongoose.models.IotReading || mongoose.model('IotReading', iotReadingSchema);
const IotAlertRule =
  mongoose.models.IotAlertRule || mongoose.model('IotAlertRule', iotAlertRuleSchema);
const IotAlert = mongoose.models.IotAlert || mongoose.model('IotAlert', iotAlertSchema);
const IotMaintenance =
  mongoose.models.IotMaintenance || mongoose.model('IotMaintenance', iotMaintenanceSchema);
const VitalBaseline =
  mongoose.models.VitalBaseline || mongoose.model('VitalBaseline', vitalBaselineSchema);

// ============================================================
// خدمة IoT الرئيسية
// ============================================================

class IotWearablesService {
  /**
   * الحصول على قائمة الأجهزة مع الفلترة
   */
  async listDevices(filters = {}) {
    const { search, status, category, branch_id, is_online, page = 1, limit = 15 } = filters;

    const query = {};
    if (branch_id) query.branch_id = branch_id;
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { serial_number: { $regex: search, $options: 'i' } },
        { mac_address: { $regex: search, $options: 'i' } },
      ];
    }
    if (is_online === 'true') {
      query.last_ping_at = { $gt: new Date(Date.now() - 5 * 60 * 1000) };
    }

    const total = await IotDevice.countDocuments(query);
    const devices = await IotDevice.find(query)
      .populate('device_type_id', 'name name_ar category communication_protocol supported_metrics')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    // إضافة حالة الاتصال
    const now = Date.now();
    devices.forEach(d => {
      d.is_online = d.last_ping_at && now - new Date(d.last_ping_at).getTime() < 5 * 60 * 1000;
    });

    return {
      data: devices,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * تسجيل جهاز جديد
   */
  async registerDevice(data) {
    const device = new IotDevice({
      ...data,
      uuid: require('crypto').randomUUID(),
    });
    await device.save();

    // إنشاء قواعد تنبيه افتراضية
    const deviceType = await IotDeviceType.findById(data.device_type_id);
    if (deviceType?.supported_metrics?.length) {
      for (const metric of deviceType.supported_metrics) {
        await this._createDefaultAlertRule(device, metric, deviceType);
      }
    }

    return device.populate('device_type_id');
  }

  /**
   * تعيين جهاز لمستفيد
   */
  async assignTobeneficiary(deviceId, beneficiaryId, assignedBy, settings = {}) {
    // إنهاء التعيينات النشطة السابقة
    await IotDeviceAssignment.updateMany(
      { device_id: deviceId, status: 'active' },
      { status: 'returned', returned_at: new Date() }
    );

    const assignment = new IotDeviceAssignment({
      uuid: require('crypto').randomUUID(),
      device_id: deviceId,
      beneficiary_id: beneficiaryId,
      assigned_by: assignedBy,
      assigned_at: new Date(),
      status: 'active',
      device_settings: settings,
    });

    await assignment.save();
    return assignment.populate(['device_id', 'beneficiary_id']);
  }

  /**
   * معالجة قراءة واردة من جهاز IoT
   */
  async processReading(payload) {
    const device = await IotDevice.findOne({ serial_number: payload.serial_number });
    if (!device) throw new Error(`جهاز غير موجود: ${payload.serial_number}`);

    // تحديث آخر اتصال
    device.last_ping_at = new Date();
    device.last_data_at = new Date();
    device.status = 'active';
    await device.save();

    // الحصول على التعيين الحالي
    const assignment = await IotDeviceAssignment.findOne({
      device_id: device._id,
      status: 'active',
    });

    // إنشاء القراءة
    const reading = new IotReading({
      uuid: require('crypto').randomUUID(),
      device_id: device._id,
      beneficiary_id: assignment?.beneficiary_id,
      session_id: payload.session_id,
      metric_type: payload.metric_type,
      value: payload.value,
      unit: payload.unit,
      secondary_value: payload.secondary_value,
      secondary_unit: payload.secondary_unit,
      recorded_at: payload.recorded_at ? new Date(payload.recorded_at) : new Date(),
      metadata: payload.metadata,
      branch_id: device.branch_id,
    });

    await reading.save();

    // فحص الشذوذات
    await this.checkAnomalies(reading, device);

    return reading;
  }

  /**
   * فحص القراءات الشاذة وإطلاق التنبيهات
   */
  async checkAnomalies(reading, device) {
    const rules = await IotAlertRule.find({
      metric_type: reading.metric_type,
      is_active: true,
      $or: [
        { device_type_id: null },
        { device_type_id: { $exists: false } },
        { device_type_id: device.device_type_id },
      ],
    });

    for (const rule of rules) {
      const isAnomaly = this._evaluateCondition(reading.value, rule);

      if (isAnomaly) {
        // التحقق من cooldown
        const recentAlert = await IotAlert.findOne({
          device_id: device._id,
          metric_type: reading.metric_type,
          triggered_at: { $gt: new Date(Date.now() - rule.cooldown_minutes * 60 * 1000) },
        });

        if (!recentAlert) {
          reading.is_anomaly = true;
          reading.anomaly_type =
            reading.value > (rule.threshold_max || rule.threshold_min) ? 'high' : 'low';
          await reading.save();

          const alert = new IotAlert({
            uuid: require('crypto').randomUUID(),
            device_id: device._id,
            beneficiary_id: reading.beneficiary_id,
            reading_id: reading._id,
            alert_type: 'threshold_exceeded',
            severity: rule.severity,
            metric_type: reading.metric_type,
            threshold_value: rule.threshold_min,
            actual_value: reading.value,
            message: `${rule.name}: ${reading.value} ${reading.unit}`,
            message_ar: `${rule.name_ar}: ${reading.value} ${reading.unit}`,
            triggered_at: new Date(),
            status: 'active',
            branch_id: device.branch_id,
          });

          await alert.save();
        }
      }
    }
  }

  /**
   * تقييم شرط التنبيه
   */
  _evaluateCondition(value, rule) {
    switch (rule.condition) {
      case 'gt':
        return value > rule.threshold_min;
      case 'lt':
        return value < rule.threshold_min;
      case 'gte':
        return value >= rule.threshold_min;
      case 'lte':
        return value <= rule.threshold_min;
      case 'between':
        return value >= rule.threshold_min && value <= rule.threshold_max;
      case 'outside':
        return value < rule.threshold_min || value > (rule.threshold_max || Infinity);
      default:
        return false;
    }
  }

  /**
   * إنشاء قاعدة تنبيه افتراضية
   */
  async _createDefaultAlertRule(device, metric, deviceType) {
    const defaults = {
      heart_rate: { min: 40, max: 150, unit: 'bpm' },
      spo2: { min: 90, max: 100, unit: '%' },
      temperature: { min: 35.5, max: 38.5, unit: '°C' },
      blood_pressure: { min: 60, max: 180, unit: 'mmHg' },
      respiratory_rate: { min: 10, max: 30, unit: 'bpm' },
    };

    if (!defaults[metric]) return;
    const d = defaults[metric];

    const existing = await IotAlertRule.findOne({
      device_type_id: deviceType._id,
      metric_type: metric,
      branch_id: device.branch_id,
    });

    if (existing) return;

    await IotAlertRule.create({
      uuid: require('crypto').randomUUID(),
      device_type_id: deviceType._id,
      metric_type: metric,
      branch_id: device.branch_id,
      name: `${metric} threshold for ${deviceType.name}`,
      name_ar: `حد ${metric} لجهاز ${deviceType.name_ar}`,
      condition: 'outside',
      threshold_min: d.min,
      threshold_max: d.max,
      severity: 'warning',
      cooldown_minutes: 5,
      notification_channels: ['push', 'email'],
      notify_roles: ['doctor', 'nurse'],
      is_active: true,
    });
  }

  /**
   * لوحة المراقبة الحية
   */
  async getDashboard(branchId) {
    const branchFilter = branchId ? { branch_id: branchId } : {};
    const now = new Date();
    const onlineThreshold = new Date(Date.now() - 5 * 60 * 1000);
    const todayStart = new Date(now.setHours(0, 0, 0, 0));

    const [
      totalDevices,
      onlineDevices,
      activeAlerts,
      criticalAlerts,
      readingsToday,
      anomaliesToday,
      maintenanceDue,
    ] = await Promise.all([
      IotDevice.countDocuments(branchFilter),
      IotDevice.countDocuments({ ...branchFilter, last_ping_at: { $gt: onlineThreshold } }),
      IotAlert.countDocuments({ ...branchFilter, status: 'active' }),
      IotAlert.countDocuments({
        ...branchFilter,
        status: 'active',
        severity: { $in: ['critical', 'emergency'] },
      }),
      IotReading.countDocuments({ ...branchFilter, recorded_at: { $gte: todayStart } }),
      IotReading.countDocuments({
        ...branchFilter,
        is_anomaly: true,
        recorded_at: { $gte: todayStart },
      }),
      IotDevice.countDocuments({
        ...branchFilter,
        next_maintenance_date: { $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
      }),
    ]);

    const devicesByStatus = await IotDevice.aggregate([
      { $match: branchFilter },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const recentAlerts = await IotAlert.find({ ...branchFilter, status: 'active' })
      .populate('device_id', 'name serial_number')
      .sort({ triggered_at: -1 })
      .limit(10)
      .lean();

    return {
      total_devices: totalDevices,
      online_devices: onlineDevices,
      offline_devices: totalDevices - onlineDevices,
      maintenance_due: maintenanceDue,
      active_alerts: activeAlerts,
      critical_alerts: criticalAlerts,
      readings_today: readingsToday,
      anomalies_today: anomaliesToday,
      devices_by_status: devicesByStatus.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {}),
      recent_alerts: recentAlerts,
    };
  }

  /**
   * العلامات الحيوية لمستفيد محدد
   */
  async getBeneficiaryVitals(beneficiaryId, filters = {}) {
    const { metric_type, from, to, limit = 100 } = filters;
    const query = { beneficiary_id: beneficiaryId };
    if (metric_type) query.metric_type = metric_type;
    if (from || to) {
      query.recorded_at = {};
      if (from) query.recorded_at.$gte = new Date(from);
      if (to) query.recorded_at.$lte = new Date(to);
    }

    const readings = await IotReading.find(query)
      .populate('device_id', 'name serial_number')
      .sort({ recorded_at: -1 })
      .limit(parseInt(limit))
      .lean();

    // حساب الإحصائيات لكل نوع مقياس
    const metricTypes = [...new Set(readings.map(r => r.metric_type))];
    const stats = {};
    for (const mt of metricTypes) {
      const vals = readings.filter(r => r.metric_type === mt).map(r => r.value);
      stats[mt] = {
        count: vals.length,
        min: Math.min(...vals),
        max: Math.max(...vals),
        avg: vals.reduce((a, b) => a + b, 0) / vals.length,
        latest: vals[0],
      };
    }

    return { readings, stats };
  }

  /**
   * إحصائيات عامة
   */
  async getStats(branchId) {
    return this.getDashboard(branchId);
  }

  /**
   * البيانات الأولية لنموذج الجهاز
   */
  async getFormOptions() {
    const [deviceTypes] = await Promise.all([
      IotDeviceType.find({ is_active: true })
        .select('name name_ar category communication_protocol')
        .lean(),
    ]);

    return {
      device_types: deviceTypes,
      categories: [
        { value: 'wearable', label: 'جهاز قابل للارتداء' },
        { value: 'sensor', label: 'حساس' },
        { value: 'therapy_equipment', label: 'معدات علاجية' },
        { value: 'vital_monitor', label: 'مراقب العلامات الحيوية' },
        { value: 'motion_tracker', label: 'تتبع الحركة' },
        { value: 'emg_device', label: 'جهاز EMG' },
        { value: 'smart_scale', label: 'ميزان ذكي' },
      ],
      protocols: [
        { value: 'mqtt', label: 'MQTT' },
        { value: 'bluetooth', label: 'Bluetooth' },
        { value: 'ble', label: 'BLE' },
        { value: 'wifi', label: 'Wi-Fi' },
        { value: 'zigbee', label: 'Zigbee' },
        { value: 'http', label: 'HTTP/REST' },
        { value: 'websocket', label: 'WebSocket' },
      ],
      statuses: [
        { value: 'active', label: 'نشط' },
        { value: 'inactive', label: 'غير نشط' },
        { value: 'maintenance', label: 'صيانة' },
        { value: 'error', label: 'خطأ' },
        { value: 'disconnected', label: 'منقطع' },
        { value: 'decommissioned', label: 'خارج الخدمة' },
      ],
      metric_types: [
        { value: 'heart_rate', label: 'معدل ضربات القلب', unit: 'bpm' },
        { value: 'spo2', label: 'تشبع الأكسجين', unit: '%' },
        { value: 'blood_pressure', label: 'ضغط الدم', unit: 'mmHg' },
        { value: 'temperature', label: 'درجة الحرارة', unit: '°C' },
        { value: 'steps', label: 'الخطوات', unit: 'steps' },
        { value: 'emg', label: 'نشاط العضلات EMG', unit: 'mV' },
        { value: 'motion', label: 'الحركة', unit: 'deg' },
        { value: 'range_of_motion', label: 'مدى الحركة', unit: 'deg' },
        { value: 'grip_strength', label: 'قوة القبضة', unit: 'kg' },
        { value: 'balance_score', label: 'درجة التوازن', unit: 'score' },
        { value: 'gait_speed', label: 'سرعة المشي', unit: 'm/s' },
        { value: 'respiratory_rate', label: 'معدل التنفس', unit: 'bpm' },
        { value: 'weight', label: 'الوزن', unit: 'kg' },
      ],
    };
  }
}

module.exports = {
  IotWearablesService,
  IotDeviceType,
  IotDevice,
  IotDeviceAssignment,
  IotReading,
  IotAlertRule,
  IotAlert,
  IotMaintenance,
  VitalBaseline,
};
