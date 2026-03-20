/**
 * نموذج الشكاوى والمقترحات الموحّد
 * Unified Complaint Model — employees, students, customers, suggestions
 */
const mongoose = require('mongoose');

const responseSchema = new mongoose.Schema({
  content: { type: String, required: true },
  respondedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  respondedAt: { type: Date, default: Date.now },
});

const complaintSchema = new mongoose.Schema(
  {
    complaintId: { type: String, unique: true, index: true },
    type: {
      type: String,
      required: true,
      enum: ['complaint', 'suggestion', 'grievance', 'feedback'],
      default: 'complaint',
    },
    source: {
      type: String,
      required: true,
      enum: ['employee', 'student', 'customer', 'parent', 'other'],
    },
    category: {
      type: String,
      enum: [
        'administrative',
        'technical',
        'financial',
        'service',
        'hr',
        'safety',
        'academic',
        'other',
      ],
      default: 'other',
    },
    subject: { type: String, required: true, trim: true, maxlength: 300 },
    description: { type: String, required: true, maxlength: 5000 },
    priority: {
      type: String,
      enum: ['critical', 'high', 'medium', 'low'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: ['new', 'under_review', 'in_progress', 'escalated', 'resolved', 'closed', 'rejected'],
      default: 'new',
    },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    submitterName: { type: String },
    submitterEmail: { type: String },
    submitterPhone: { type: String },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    department: { type: String },
    responses: [responseSchema],
    resolution: { type: String },
    resolvedAt: { type: Date },
    rating: { type: Number, min: 1, max: 5 },
    isAnonymous: { type: Boolean, default: false },
    attachments: [{ name: String, url: String }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Auto-generate complaint ID
complaintSchema.pre('save', async function () {
  if (!this.complaintId) {
    const count = await mongoose.model('Complaint').countDocuments();
    const prefix = this.type === 'suggestion' ? 'SUG' : 'CMP';
    this.complaintId = `${prefix}-${String(count + 1).padStart(5, '0')}`;
  }
});

complaintSchema.index({ source: 1, status: 1 });
complaintSchema.index({ type: 1, priority: 1 });
complaintSchema.index({ assignedTo: 1 });
complaintSchema.index({ createdAt: -1 });

module.exports = mongoose.models.Complaint || mongoose.model('Complaint', complaintSchema);
