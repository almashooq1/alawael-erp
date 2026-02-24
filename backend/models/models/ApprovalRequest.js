// ApprovalRequest.js
// نموذج موافقة ذكي للطلبات
const mongoose = require('mongoose');

const approvalRequestSchema = new mongoose.Schema({
  requestType: { type: String, required: true }, // مثال: "إجازة"، "صرف مالي"، "تعديل بيانات"
  requestRefId: { type: mongoose.Schema.Types.ObjectId }, // مرجع للطلب الأصلي
  requester: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
    default: 'pending',
  },
  steps: [
    {
      approver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      action: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
      actedAt: Date,
      comment: String,
    },
  ],
  currentStep: { type: Number, default: 0 },
  comments: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      text: String,
      createdAt: { type: Date, default: Date.now },
    },
  ],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('ApprovalRequest', approvalRequestSchema);
