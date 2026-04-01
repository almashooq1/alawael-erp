/* eslint-disable no-unused-vars */
const mongoose = require('mongoose');

// نموذج الطالب
const StudentSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  birthDate: Date,
  gender: { type: String, enum: ['ذكر', 'أنثى'] },
  disabilityTypes: [{ type: String }], // ذهنية، سمعية، حركية، توحد...
  parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Parent' },
  plan: { type: mongoose.Schema.Types.ObjectId, ref: 'MontessoriPlan' },
  evaluations: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Evaluation' }],
  media: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MediaFile' }],
  notes: String,
  createdAt: { type: Date, default: Date.now },
});

// نموذج الخطة الفردية
const MontessoriPlanSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
  goals: [
    {
      area: String, // مجال (حسي، لغوي، حركي...)
      objective: String,
      activities: [String],
      targetDate: Date,
      achieved: { type: Boolean, default: false },
    },
  ],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
});

// نموذج الجلسة
const SessionSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
  plan: { type: mongoose.Schema.Types.ObjectId, ref: 'MontessoriPlan' },
  date: { type: Date, default: Date.now },
  type: { type: String }, // منتسوري، علاج وظيفي، نطق...
  activities: [String],
  attendance: { type: Boolean, default: true },
  notes: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
});

// نموذج التقييم
const EvaluationSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
  plan: { type: mongoose.Schema.Types.ObjectId, ref: 'MontessoriPlan' },
  date: { type: Date, default: Date.now },
  area: String,
  skill: String,
  level: { type: String, enum: ['ضعيف', 'متوسط', 'جيد', 'ممتاز'] },
  notes: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
});

// نموذج النشاط
const ActivitySchema = new mongoose.Schema({
  name: String,
  description: String,
  area: String,
  media: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MediaFile' }],
});

// نموذج الفريق
const TeamMemberSchema = new mongoose.Schema({
  name: String,
  role: { type: String, enum: ['مدير', 'معلم', 'أخصائي', 'مشرف'] },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  contact: String,
});

// نموذج ولي الأمر
const ParentSchema = new mongoose.Schema({
  name: String,
  phone: String,
  email: String,
  students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }],
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
});

// نموذج ملف الوسائط
const MediaFileSchema = new mongoose.Schema({
  url: String,
  type: String, // صورة، فيديو، مستند
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  uploadedAt: { type: Date, default: Date.now },
});

// نموذج التقرير
const ReportSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
  plan: { type: mongoose.Schema.Types.ObjectId, ref: 'MontessoriPlan' },
  date: { type: Date, default: Date.now },
  summary: String,
  recommendations: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
});

// نموذج برنامج المنتسوري (للعرض في الفرونت)
const MontessoriProgramSchema = new mongoose.Schema({
  name: { type: String, required: true },
  ageGroup: { type: String },
  capacity: { type: Number, default: 0 },
  enrolled: { type: Number, default: 0 },
  instructor: { type: String },
  status: {
    type: String,
    enum: ['active', 'planned', 'suspended', 'completed', 'archived'],
    default: 'active',
  },
  schedule: { type: String },
  description: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

MontessoriProgramSchema.pre('findOneAndUpdate', function () {
  this.set({ updatedAt: Date.now() });
});

// ── Indexes ───────────────────────────────────────────────────────────────────
StudentSchema.index({ parent: 1 });
StudentSchema.index({ fullName: 1 });
MontessoriPlanSchema.index({ student: 1 });
MontessoriPlanSchema.index({ createdBy: 1 });
SessionSchema.index({ student: 1, date: -1 });
SessionSchema.index({ plan: 1 });
EvaluationSchema.index({ student: 1, date: -1 });
EvaluationSchema.index({ plan: 1 });
EvaluationSchema.index({ area: 1 });
ActivitySchema.index({ area: 1 });
TeamMemberSchema.index({ user: 1 }, { unique: true, sparse: true });
TeamMemberSchema.index({ role: 1 });
ParentSchema.index({ user: 1 }, { unique: true, sparse: true });
ParentSchema.index({ phone: 1 });
MediaFileSchema.index({ uploadedBy: 1 });
ReportSchema.index({ student: 1, date: -1 });
ReportSchema.index({ plan: 1 });
MontessoriProgramSchema.index({ status: 1 });
MontessoriProgramSchema.index({ createdBy: 1 });

module.exports = {
  Student: mongoose.models.Student || mongoose.model('Student', StudentSchema),
  MontessoriPlan:
    mongoose.models.MontessoriPlan || mongoose.model('MontessoriPlan', MontessoriPlanSchema),
  Session: mongoose.models.MontessoriSession || mongoose.model('MontessoriSession', SessionSchema),
  Evaluation: mongoose.models.Evaluation || mongoose.model('Evaluation', EvaluationSchema),
  Activity: mongoose.models.Activity || mongoose.model('Activity', ActivitySchema),
  TeamMember: mongoose.models.TeamMember || mongoose.model('TeamMember', TeamMemberSchema),
  Parent: mongoose.models.Parent || mongoose.model('Parent', ParentSchema),
  MediaFile: mongoose.models.MediaFile || mongoose.model('MediaFile', MediaFileSchema),
  Report: mongoose.models.MontessoriReport || mongoose.model('MontessoriReport', ReportSchema),
  MontessoriProgram:
    mongoose.models.MontessoriProgram ||
    mongoose.models.MontessoriProgram ||
    mongoose.models.MontessoriProgram ||
    mongoose.model('MontessoriProgram', MontessoriProgramSchema),
};
