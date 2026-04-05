/**
 * CommunityEvent Model — System 42
 * نموذج الفعاليات المجتمعية
 */
const mongoose = require('mongoose');

const communityEventSchema = new mongoose.Schema(
  {
    uuid: { type: String, unique: true, sparse: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    programId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CommunityProgram',
      default: null,
    },

    title: { type: String, required: true, trim: true },
    titleAr: { type: String, required: true, trim: true },
    description: { type: String },

    eventType: {
      type: String,
      enum: [
        'workshop',
        'seminar',
        'awareness_campaign',
        'sports',
        'cultural',
        'health_fair',
        'fundraiser',
        'training',
      ],
      required: true,
    },
    status: {
      type: String,
      enum: ['upcoming', 'ongoing', 'completed', 'cancelled'],
      default: 'upcoming',
    },

    eventDate: { type: Date, required: true },
    startTime: { type: String },
    endTime: { type: String },

    venue: { type: String },
    venueAddress: { type: String },
    venueLat: { type: Number },
    venueLng: { type: Number },

    maxAttendees: { type: Number, default: null },
    registeredAttendees: { type: Number, default: 0 },
    actualAttendees: { type: Number, default: 0 },

    isFree: { type: Boolean, default: true },
    ticketPrice: { type: Number, default: null },
    requiresRegistration: { type: Boolean, default: false },
    registrationDeadline: { type: Date },

    speakers: [{ type: mongoose.Schema.Types.Mixed }],
    sponsors: [{ type: mongoose.Schema.Types.Mixed }],
    imagePath: { type: String },

    isAccessible: { type: Boolean, default: true },
    accessibilityNotes: { type: String },
    notes: { type: String },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

communityEventSchema.index({ branchId: 1, status: 1 });
communityEventSchema.index({ eventDate: 1 });
communityEventSchema.index({ eventType: 1 });
communityEventSchema.index({ programId: 1 });
communityEventSchema.index({ deletedAt: 1 });

communityEventSchema.pre(/^find/, function () {
  if (this.getFilter().deletedAt === undefined) this.where({ deletedAt: null });
});

module.exports =
  mongoose.models.CommunityEvent || mongoose.model('CommunityEvent', communityEventSchema);
