/**
 * Geofence Model - نموذج السياج الجغرافي
 *
 * إدارة المناطق الجغرافية المحددة لتتبع دخول/خروج المركبات
 * وتنبيهات الانحراف عن المسارات المحددة
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const geofenceAlertSchema = new Schema({
  vehicleId: { type: Schema.Types.ObjectId, ref: 'Vehicle' },
  driverId: { type: Schema.Types.ObjectId, ref: 'Driver' },
  alertType: {
    type: String,
    enum: ['entry', 'exit', 'dwell', 'speeding_in_zone', 'unauthorized_entry', 'after_hours'],
    required: true,
  },
  triggeredAt: { type: Date, default: Date.now },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true }, // [lng, lat]
  },
  acknowledged: { type: Boolean, default: false },
  acknowledgedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  acknowledgedAt: Date,
  severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
  notes: String,
});

const geofenceSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    nameAr: { type: String, trim: true },
    description: String,

    // نوع السياج
    type: {
      type: String,
      enum: ['circle', 'polygon', 'corridor', 'rectangle'],
      required: true,
    },

    // الشكل الهندسي
    geometry: {
      type: { type: String, enum: ['Point', 'Polygon'], required: true },
      coordinates: { type: Schema.Types.Mixed, required: true },
    },

    // نصف القطر (للسياج الدائري فقط) بالمتر
    radius: { type: Number, min: 50 },

    // عرض الممر (لسياج الممر فقط) بالمتر
    corridorWidth: { type: Number, min: 10 },

    // اللون على الخريطة
    color: { type: String, default: '#3388ff' },

    // الفئة
    category: {
      type: String,
      enum: [
        'operational',
        'restricted',
        'loading_zone',
        'parking',
        'school_zone',
        'client_site',
        'warehouse',
        'fuel_station',
        'maintenance_center',
        'custom',
      ],
      default: 'operational',
    },

    // الحالة
    status: {
      type: String,
      enum: ['active', 'inactive', 'archived'],
      default: 'active',
    },

    // قواعد التنبيه
    rules: {
      alertOnEntry: { type: Boolean, default: true },
      alertOnExit: { type: Boolean, default: true },
      alertOnDwell: { type: Boolean, default: false },
      dwellTimeMinutes: { type: Number, default: 30 },
      maxSpeedInZone: { type: Number }, // km/h
      allowedVehicles: [{ type: Schema.Types.ObjectId, ref: 'Vehicle' }],
      allowedDrivers: [{ type: Schema.Types.ObjectId, ref: 'Driver' }],
      restrictedHours: {
        enabled: { type: Boolean, default: false },
        startTime: String, // "HH:mm"
        endTime: String, // "HH:mm"
        days: [{ type: String, enum: ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] }],
      },
    },

    // إحصائيات
    stats: {
      totalEntries: { type: Number, default: 0 },
      totalExits: { type: Number, default: 0 },
      totalAlerts: { type: Number, default: 0 },
      averageDwellMinutes: { type: Number, default: 0 },
      lastActivity: Date,
    },

    // التنبيهات
    alerts: [geofenceAlertSchema],

    // المركبات الموجودة حالياً داخل السياج
    vehiclesInside: [
      {
        vehicleId: { type: Schema.Types.ObjectId, ref: 'Vehicle' },
        enteredAt: { type: Date, default: Date.now },
        driverId: { type: Schema.Types.ObjectId, ref: 'Driver' },
      },
    ],

    // الإشعارات
    notificationChannels: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      push: { type: Boolean, default: true },
      whatsapp: { type: Boolean, default: false },
    },
    notificationRecipients: [{ type: Schema.Types.ObjectId, ref: 'User' }],

    // المؤسسة والفرع
    organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch' },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
  }
);

// فهرس جغرافي
geofenceSchema.index({ geometry: '2dsphere' });
geofenceSchema.index({ status: 1, category: 1 });
geofenceSchema.index({ organization: 1 });

module.exports = mongoose.models.Geofence || mongoose.model('Geofence', geofenceSchema);
