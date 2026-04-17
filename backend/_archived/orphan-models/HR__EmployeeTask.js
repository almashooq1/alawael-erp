/**
 * Employee Task Model — نموذج المهام والتكليفات
 *
 * Full task/assignment management with priorities, deadlines, and progress tracking.
 */
const mongoose = require('mongoose');

const SubTaskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  completed: { type: Boolean, default: false },
  completedAt: Date,
});

const CommentSchema = new mongoose.Schema({
  text: { type: String, required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  createdAt: { type: Date, default: Date.now },
  attachments: [String],
});

const EmployeeTaskSchema = new mongoose.Schema(
  {
    taskNumber: { type: String, unique: true, required: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, maxlength: 2000 },

    type: {
      type: String,
      enum: ['مهمة عادية', 'تكليف رسمي', 'مشروع', 'مهمة عاجلة', 'متابعة', 'تحسين', 'بحث ودراسة'],
      default: 'مهمة عادية',
    },
    priority: {
      type: String,
      enum: ['منخفضة', 'متوسطة', 'عالية', 'حرجة'],
      default: 'متوسطة',
    },
    status: {
      type: String,
      enum: ['جديدة', 'قيد التنفيذ', 'في الانتظار', 'مراجعة', 'مكتملة', 'ملغية', 'مؤجلة'],
      default: 'جديدة',
    },

    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    department: String,

    startDate: { type: Date, default: Date.now },
    dueDate: { type: Date, required: true },
    completedDate: Date,

    progress: { type: Number, min: 0, max: 100, default: 0 },
    subTasks: [SubTaskSchema],
    comments: [CommentSchema],

    // Delegation
    delegatedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    delegationReason: String,
    delegatedAt: Date,

    // Rating
    rating: { type: Number, min: 1, max: 5 },
    ratingComment: String,
    ratedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },

    tags: [String],
    attachments: [String],
    isRecurring: { type: Boolean, default: false },
    recurringPattern: { type: String, enum: ['يومي', 'أسبوعي', 'شهري', 'ربع سنوي', ''] },
  },
  { timestamps: true }
);

EmployeeTaskSchema.index({ assignedTo: 1, status: 1 });
EmployeeTaskSchema.index({ assignedBy: 1, status: 1 });
EmployeeTaskSchema.index({ dueDate: 1, status: 1 });
// taskNumber: removed — unique:true creates implicit index

module.exports = mongoose.models.EmployeeTask || mongoose.model('EmployeeTask', EmployeeTaskSchema);
