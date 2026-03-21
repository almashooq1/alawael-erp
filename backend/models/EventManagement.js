/**
 * Event Management Models — نظام إدارة الفعاليات
 */
const mongoose = require('mongoose');

/* ── Event ────────────────────────────────────────────────── */
const eventSchema = new mongoose.Schema(
  {
    eventCode: { type: String, required: true, unique: true },
    titleAr: { type: String, required: true },
    titleEn: { type: String },
    type: {
      type: String,
      enum: ['conference', 'seminar', 'workshop', 'ceremony', 'exhibition', 'meeting', 'training', 'social', 'sports', 'other'],
      default: 'seminar',
    },
    category: {
      type: String,
      enum: ['internal', 'external', 'governmental', 'community', 'corporate'],
      default: 'internal',
    },
    description: String,
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    location: { name: String, address: String, capacity: Number, isVirtual: { type: Boolean, default: false }, virtualLink: String },
    organizer: { department: String, contactPerson: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } },
    budget: { estimated: { type: Number, default: 0 }, actual: { type: Number, default: 0 }, currency: { type: String, default: 'SAR' } },
    sponsors: [{ name: String, contribution: Number }],
    speakers: [{ name: String, title: String, topic: String, bio: String }],
    agenda: [{ time: String, title: String, speaker: String, duration: Number }],
    maxAttendees: { type: Number, default: 100 },
    registrationDeadline: Date,
    status: {
      type: String,
      enum: ['draft', 'planning', 'approved', 'registration_open', 'in_progress', 'completed', 'cancelled', 'postponed'],
      default: 'draft',
    },
    tags: [String],
    attachments: [{ name: String, url: String }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

/* ── Event Registration ───────────────────────────────────── */
const eventRegistrationSchema = new mongoose.Schema(
  {
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    participant: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, required: true },
    email: String,
    phone: String,
    department: String,
    organization: String,
    role: { type: String, enum: ['attendee', 'speaker', 'volunteer', 'vip', 'organizer'], default: 'attendee' },
    status: { type: String, enum: ['registered', 'confirmed', 'attended', 'cancelled', 'no_show'], default: 'registered' },
    checkInTime: Date,
    feedback: { rating: { type: Number, min: 1, max: 5 }, comment: String },
    certificateIssued: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Event = mongoose.models.Event || mongoose.model('Event', eventSchema);
const EventRegistration = mongoose.models.EventRegistration || mongoose.model('EventRegistration', eventRegistrationSchema);

module.exports = { Event, EventRegistration };
