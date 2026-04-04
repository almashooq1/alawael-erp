/**
 * VolunteerAssignment Model — System 41
 * نموذج تكليفات المتطوعين
 */
const mongoose = require('mongoose');

const volunteerAssignmentSchema = new mongoose.Schema(
  {
    uuid: { type: String, unique: true, sparse: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    volunteerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Volunteer', required: true },
    opportunityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VolunteerOpportunity',
      required: true,
    },

    status: {
      type: String,
      enum: ['assigned', 'confirmed', 'completed', 'cancelled', 'no_show', 'excused'],
      default: 'assigned',
    },

    assignmentDate: { type: Date, required: true },
    startTime: { type: String },
    endTime: { type: String },
    actualHours: { type: Number, default: null },
    plannedHours: { type: Number, default: null },
    checkedInAt: { type: Date, default: null },
    checkedOutAt: { type: Date, default: null },

    volunteerNotes: { type: String },
    supervisorNotes: { type: String },
    rating: { type: Number, min: 1, max: 5, default: null },

    certificateIssued: { type: Boolean, default: false },
    certificateIssuedAt: { type: Date, default: null },
    certificatePath: { type: String },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

volunteerAssignmentSchema.index({ volunteerId: 1 });
volunteerAssignmentSchema.index({ opportunityId: 1 });
volunteerAssignmentSchema.index({ branchId: 1, status: 1 });
volunteerAssignmentSchema.index({ assignmentDate: 1 });
volunteerAssignmentSchema.index({ deletedAt: 1 });
// منع تكرار التكليف في نفس اليوم
volunteerAssignmentSchema.index(
  { volunteerId: 1, opportunityId: 1, assignmentDate: 1 },
  { unique: true, sparse: true }
);

volunteerAssignmentSchema.pre(/^find/, function () {
  if (this.getFilter().deletedAt === undefined) this.where({ deletedAt: null });
});

module.exports = mongoose.model('VolunteerAssignment', volunteerAssignmentSchema);
