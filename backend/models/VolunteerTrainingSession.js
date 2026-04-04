/**
 * VolunteerTrainingSession Model — System 41
 * نموذج جلسات تدريب المتطوعين
 */
const mongoose = require('mongoose');

const volunteerTrainingSessionSchema = new mongoose.Schema(
  {
    uuid: { type: String, unique: true, sparse: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },

    title: { type: String, required: true },
    titleAr: { type: String, required: true },
    description: { type: String },
    trainingType: {
      type: String,
      enum: ['orientation', 'skills', 'safety', 'disability_awareness'],
      required: true,
    },

    sessionDate: { type: Date, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    location: { type: String },
    deliveryMode: {
      type: String,
      enum: ['in_person', 'online', 'hybrid'],
      required: true,
    },
    meetingLink: { type: String },
    maxParticipants: { type: Number, default: null },

    trainerName: { type: String },
    trainerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    isMandatory: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['scheduled', 'completed', 'cancelled'],
      default: 'scheduled',
    },
    materialsPath: { type: String },
    notes: { type: String },

    // المتطوعون المسجلون (embedded enrollments summary)
    enrolledCount: { type: Number, default: 0 },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

volunteerTrainingSessionSchema.index({ branchId: 1, status: 1 });
volunteerTrainingSessionSchema.index({ sessionDate: 1 });
volunteerTrainingSessionSchema.index({ trainingType: 1 });
volunteerTrainingSessionSchema.index({ deletedAt: 1 });

volunteerTrainingSessionSchema.pre(/^find/, function () {
  if (this.getFilter().deletedAt === undefined) this.where({ deletedAt: null });
});

module.exports = mongoose.model('VolunteerTrainingSession', volunteerTrainingSessionSchema);
