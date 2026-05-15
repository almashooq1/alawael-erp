const mongoose = require('mongoose');

const gpsTrackingSchema = new mongoose.Schema(
  {
    vehicle_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
    trip_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip' },
    device_id: { type: String },
    timestamp: { type: Date, required: true, default: Date.now },
    latitude: { type: Number, required: true, min: -90, max: 90 },
    longitude: { type: Number, required: true, min: -180, max: 180 },
    speed: { type: Number, default: 0, min: 0 },
    heading: { type: Number, min: 0, max: 360 },
    altitude: { type: Number },
    accuracy: { type: Number },
    engine_on: { type: Boolean, default: true },
    is_speeding: { type: Boolean, default: false },
    speed_limit: { type: Number, default: 120 },
    is_outside_geofence: { type: Boolean, default: false },
    geofence_id: { type: String },
    odometer: { type: Number },
    fuel_level: { type: Number },
    raw_data: { type: Object },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: false },
  }
);

gpsTrackingSchema.virtual('lat').get(function () {
  return this.latitude;
});
gpsTrackingSchema.virtual('lng').get(function () {
  return this.longitude;
});
gpsTrackingSchema.virtual('speed_kmh').get(function () {
  return this.speed;
});

gpsTrackingSchema.set('toJSON', { virtuals: true });
gpsTrackingSchema.set('toObject', { virtuals: true });

gpsTrackingSchema.index({ timestamp: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });
gpsTrackingSchema.index({ vehicle_id: 1, timestamp: -1 });
gpsTrackingSchema.index({ trip_id: 1, timestamp: 1 });
gpsTrackingSchema.index({ is_speeding: 1 });
gpsTrackingSchema.index({ latitude: 1, longitude: 1 });

module.exports = mongoose.models.GpsTracking || mongoose.model('GpsTracking', gpsTrackingSchema);
