/* eslint-disable no-unused-vars */
const mongoose = require('mongoose');

const minuteSchema = new mongoose.Schema({
  content: { type: String, required: true },
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  recordedAt: { type: Date, default: Date.now },
});

const attendeeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: { type: String, required: true },
  email: { type: String },
  role: { type: String, enum: ['organizer', 'required', 'optional'], default: 'required' },
  rsvp: {
    type: String,
    enum: ['pending', 'accepted', 'declined', 'tentative'],
    default: 'pending',
  },
  attended: { type: Boolean, default: false },
});

const meetingSchema = new mongoose.Schema(
  {
    meetingId: { type: String, required: true, unique: true },
    title: { type: String, required: true, minlength: 3, maxlength: 200 },
    description: { type: String, maxlength: 1000 },
    type: {
      type: String,
      enum: ['board', 'department', 'project', 'training', 'review', 'emergency', 'other'],
      default: 'department',
    },
    status: {
      type: String,
      enum: ['scheduled', 'in_progress', 'completed', 'cancelled'],
      default: 'scheduled',
    },
    date: { type: Date, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String },
    duration: { type: Number, default: 60 },
    location: { type: String },
    isVirtual: { type: Boolean, default: false },
    meetingLink: { type: String },
    organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    attendees: [attendeeSchema],
    minutes: [minuteSchema],
    decisions: [{ type: String }],
    actionItems: [
      {
        task: String,
        assignee: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        dueDate: Date,
        status: { type: String, enum: ['pending', 'done'], default: 'pending' },
      },
    ],
    attachments: [{ name: String, url: String, uploadedAt: { type: Date, default: Date.now } }],
    department: { type: String, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

meetingSchema.index({ date: 1, status: 1 });
meetingSchema.index({ organizer: 1 });

module.exports = mongoose.models.Meeting || mongoose.model('Meeting', meetingSchema);
