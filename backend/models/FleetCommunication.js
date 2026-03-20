/**
 * Fleet Communication Model - نموذج اتصالات الأسطول
 * Driver-dispatcher messaging, broadcasts, emergency SOS
 */

const mongoose = require('mongoose');

const fleetCommunicationSchema = new mongoose.Schema(
  {
    messageNumber: { type: String, unique: true },
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },

    type: {
      type: String,
      enum: [
        'direct_message',
        'broadcast',
        'sos_alert',
        'dispatch_order',
        'announcement',
        'warning',
        'system_notification',
      ],
      required: true,
    },

    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent', 'emergency'],
      default: 'normal',
    },

    // Sender
    sender: {
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
      role: { type: String, enum: ['driver', 'dispatcher', 'manager', 'admin', 'system'] },
      name: { type: String },
    },

    // Recipients
    recipients: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
        role: { type: String },
        readAt: { type: Date },
        acknowledgedAt: { type: Date },
        deliveredAt: { type: Date },
      },
    ],

    // Broadcast targeting
    broadcast: {
      targetAll: { type: Boolean, default: false },
      targetGroups: [{ type: String }],
      targetBranches: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Branch' }],
      targetVehicleTypes: [{ type: String }],
      targetRoutes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'TransportRoute' }],
    },

    // Message content
    subject: { type: String },
    subjectAr: { type: String },
    body: { type: String, required: true },
    bodyAr: { type: String },
    contentType: {
      type: String,
      enum: ['text', 'voice_note', 'image', 'location', 'document', 'template'],
      default: 'text',
    },

    // Attachments
    attachments: [
      {
        type: { type: String, enum: ['image', 'audio', 'video', 'document', 'location'] },
        url: { type: String },
        filename: { type: String },
        size: { type: Number },
        duration: { type: Number }, // seconds for audio/video
      },
    ],

    // SOS specific
    sos: {
      active: { type: Boolean, default: false },
      location: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: [Number],
      },
      address: { type: String },
      vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
      sosType: {
        type: String,
        enum: ['accident', 'medical', 'security', 'breakdown', 'hazmat', 'other'],
      },
      resolvedAt: { type: Date },
      resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      escalationLevel: { type: Number, default: 0 },
      escalationHistory: [
        {
          level: Number,
          escalatedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
          escalatedAt: Date,
          notes: String,
        },
      ],
    },

    // Template
    template: {
      templateId: { type: String },
      templateName: { type: String },
      variables: { type: Map, of: String },
    },

    // Related
    relatedTrip: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip' },
    relatedVehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },

    // Thread
    parentMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'FleetCommunication' },
    threadCount: { type: Number, default: 0 },

    // Stats
    deliveryStats: {
      sent: { type: Number, default: 0 },
      delivered: { type: Number, default: 0 },
      read: { type: Number, default: 0 },
      acknowledged: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
    },

    // Expiry
    expiresAt: { type: Date },

    status: {
      type: String,
      enum: ['draft', 'sent', 'delivered', 'read', 'acknowledged', 'expired', 'cancelled'],
      default: 'draft',
    },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

fleetCommunicationSchema.pre('save', async function (next) {
  if (!this.messageNumber) {
    const count = await this.constructor.countDocuments();
    this.messageNumber = `MSG-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

fleetCommunicationSchema.index({ organization: 1, type: 1, createdAt: -1 });
fleetCommunicationSchema.index({ 'sender.user': 1, createdAt: -1 });
fleetCommunicationSchema.index({ 'sender.driver': 1, createdAt: -1 });
fleetCommunicationSchema.index({ 'recipients.user': 1, 'recipients.readAt': 1 });
fleetCommunicationSchema.index({ 'recipients.driver': 1 });
fleetCommunicationSchema.index({ 'sos.active': 1 });
fleetCommunicationSchema.index({ 'sos.location': '2dsphere' });
fleetCommunicationSchema.index({ parentMessage: 1 });
fleetCommunicationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('FleetCommunication', fleetCommunicationSchema);
