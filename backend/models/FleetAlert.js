/**
 * Fleet Alert Model - نموذج تنبيهات الأسطول
 * Centralized alert engine for maintenance, insurance, licenses, violations, fuel
 */

const mongoose = require('mongoose');

const fleetAlertSchema = new mongoose.Schema(
  {
    alertNumber: { type: String, unique: true },
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },

    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },

    category: {
      type: String,
      enum: [
        'maintenance_due',
        'insurance_expiry',
        'license_expiry',
        'registration_expiry',
        'inspection_due',
        'speed_violation',
        'geofence_breach',
        'fuel_anomaly',
        'tire_wear',
        'document_expiry',
        'compliance_issue',
        'accident',
        'breakdown',
        'idle_alert',
        'harsh_driving',
        'temperature_breach',
        'overweight',
        'unauthorized_usage',
        'service_reminder',
        'custom',
      ],
      required: true,
    },

    severity: {
      type: String,
      enum: ['info', 'low', 'medium', 'high', 'critical'],
      default: 'medium',
    },

    title: { type: String, required: true },
    titleAr: { type: String },
    message: { type: String, required: true },
    messageAr: { type: String },

    status: {
      type: String,
      enum: ['active', 'acknowledged', 'in_progress', 'resolved', 'dismissed', 'escalated'],
      default: 'active',
    },

    source: {
      type: String,
      enum: ['system', 'gps', 'sensor', 'manual', 'schedule', 'ai', 'integration'],
      default: 'system',
    },

    // Trigger details
    trigger: {
      type: { type: String },
      threshold: { type: Number },
      actualValue: { type: Number },
      unit: { type: String },
      referenceId: { type: mongoose.Schema.Types.ObjectId },
      referenceModel: { type: String },
    },

    // Actions taken
    acknowledgedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    acknowledgedAt: { type: Date },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: { type: Date },
    resolutionNotes: { type: String },

    // Escalation
    escalatedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    escalatedAt: { type: Date },
    escalationLevel: { type: Number, default: 0 },

    // Notification tracking
    notificationsSent: [
      {
        channel: { type: String, enum: ['email', 'sms', 'push', 'in_app', 'whatsapp'] },
        sentTo: { type: String },
        sentAt: { type: Date },
        delivered: { type: Boolean, default: false },
      },
    ],

    // Auto-resolve
    autoResolve: { type: Boolean, default: false },
    autoResolveAfterHours: { type: Number },

    expiresAt: { type: Date },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number] },
    },

    tags: [{ type: String }],
    notes: { type: String },

    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

fleetAlertSchema.pre('save', async function (next) {
  if (!this.alertNumber) {
    const count = await mongoose.model('FleetAlert').countDocuments();
    this.alertNumber = `ALR-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

fleetAlertSchema.index({ organization: 1, category: 1, status: 1 });
fleetAlertSchema.index({ vehicle: 1, status: 1 });
fleetAlertSchema.index({ severity: 1, status: 1 });
fleetAlertSchema.index({ createdAt: -1 });
fleetAlertSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('FleetAlert', fleetAlertSchema);
