/**
 * Training & Development Model
 * نموذج التدريب والتطوير
 */

const mongoose = require('mongoose');

const trainingSchema = new mongoose.Schema(
  {
    // معلومات البرنامج
    title: {
      type: String,
      required: true,
    },
    description: String,
    category: {
      type: String,
      enum: ['technical', 'soft-skills', 'leadership', 'compliance', 'language', 'other'],
    },
    provider: String,
    cost: Number,

    // التواريخ والمدة
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    duration: Number, // في الساعات
    schedule: String, // online, in-person, hybrid

    // المشاركون
    participants: [
      {
        employeeId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Employee',
        },
        status: {
          type: String,
          enum: ['registered', 'completed', 'cancelled', 'postponed'],
        },
        completionDate: Date,
        certificateUrl: String,
        score: Number,
      },
    ],

    // التقييمات
    evaluations: {
      instructorRating: Number,
      contentRating: Number,
      facilitiesRating: Number,
      feedback: [String],
    },

    // الحالة
    status: {
      type: String,
      enum: ['planned', 'scheduled', 'ongoing', 'completed', 'cancelled'],
      default: 'planned',
    },

    budget: {
      allocated: Number,
      spent: Number,
      remaining: Number,
    },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    collection: 'trainings',
  },
);

trainingSchema.index({ startDate: 1, status: 1 });

/**
 * إضافة مشارك
 */
trainingSchema.methods.addParticipant = function (employeeId) {
  if (!this.participants.find(p => p.employeeId.toString() === employeeId)) {
    this.participants.push({
      employeeId,
      status: 'registered',
    });
  }
  return this.save();
};

/**
 * تحديث حالة المشارك
 */
trainingSchema.methods.updateParticipantStatus = function (employeeId, status, score) {
  const participant = this.participants.find(p => p.employeeId.toString() === employeeId);
  if (participant) {
    participant.status = status;
    if (status === 'completed') {
      participant.completionDate = new Date();
      participant.score = score;
    }
  }
  return this.save();
};

/**
 * حساب النسبة المئوية للإكمال
 */
trainingSchema.methods.getCompletionRate = function () {
  if (this.participants.length === 0) return 0;
  const completed = this.participants.filter(p => p.status === 'completed').length;
  return (completed / this.participants.length) * 100;
};

module.exports = mongoose.model('Training', trainingSchema);
