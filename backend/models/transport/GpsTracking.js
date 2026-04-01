const mongoose = require('mongoose');

const gpsTrackingSchema = new mongoose.Schema(
  {
    vehicle_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
    trip_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip' },
    device_id: { type: String },
    timestamp: { type: Date, required: true, default: Date.now },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    speed_kmh: { type: Number, default: 0 },
    heading: { type: Number }, // درجة الاتجاه 0-360
    altitude: { type: Number },
    accuracy: { type: Number }, // دقة GPS بالمتر
    engine_on: { type: Boolean, default: true },
    // تنبيهات
    is_speeding: { type: Boolean, default: false }, // تجاوز السرعة
    speed_limit: { type: Number, default: 120 },
    is_outside_geofence: { type: Boolean, default: false },
    geofence_id: { type: String },
    // بيانات إضافية
    odometer: { type: Number },
    fuel_level: { type: Number },
    raw_data: { type: Object },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: false },
    // TTL: حذف بيانات GPS بعد 90 يوم تلقائياً
    expireAfterSeconds: 7776000,
  }
);

// Geospatial index لاستعلامات الموقع
gpsTrackingSchema.index({ lat: 1, lng: 1 });
gpsTrackingSchema.index({ vehicle_id: 1, timestamp: -1 });
gpsTrackingSchema.index({ trip_id: 1, timestamp: 1 });
gpsTrackingSchema.index({ timestamp: -1 });
gpsTrackingSchema.index({ is_speeding: 1 });

module.exports = mongoose.model('GpsTracking', gpsTrackingSchema);
