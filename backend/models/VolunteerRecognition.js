/**
 * VolunteerRecognition Model — System 41
 * نموذج جوائز وشهادات تقدير المتطوعين
 */
const mongoose = require('mongoose');

const volunteerRecognitionSchema = new mongoose.Schema(
  {
    uuid: { type: String, unique: true, sparse: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    volunteerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Volunteer', required: true },

    awardType: {
      type: String,
      enum: ['hours_milestone', 'best_volunteer', 'loyalty', 'special_achievement'],
      required: true,
    },
    title: { type: String, required: true },
    description: { type: String },
    awardedDate: { type: Date, required: true },
    pointsAwarded: { type: Number, default: 0 },
    certificatePath: { type: String },
    awardedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    isPublic: { type: Boolean, default: true },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

volunteerRecognitionSchema.index({ volunteerId: 1 });
volunteerRecognitionSchema.index({ branchId: 1, awardType: 1 });
volunteerRecognitionSchema.index({ deletedAt: 1 });

volunteerRecognitionSchema.pre(/^find/, function () {
  if (this.getFilter().deletedAt === undefined) this.where({ deletedAt: null });
});

module.exports = mongoose.model('VolunteerRecognition', volunteerRecognitionSchema);
