/**
 * EmergencyContact Model — جهات الاتصال الطارئة
 * Based on: emergency_contacts table (prompt_02 §5.2)
 */
const mongoose = require('mongoose');

const EmergencyContactSchema = new mongoose.Schema(
  {
    beneficiary: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
    },
    name: { type: String, required: true, trim: true },
    relationship: {
      type: String,
      required: true,
      enum: [
        'father',
        'mother',
        'brother',
        'sister',
        'grandfather',
        'grandmother',
        'uncle',
        'aunt',
        'legal_guardian',
        'other',
      ],
    },
    phone: { type: String, required: true, trim: true },
    phoneSecondary: { type: String, trim: true },
    // ترتيب الأولوية في الاتصال
    priority: { type: Number, default: 1, min: 1, max: 10 },
    // هل يمكنه استلام المستفيد؟
    canPickup: { type: Boolean, default: true },
    // هل يستقبل إشعارات؟
    receivesNotifications: { type: Boolean, default: false },
    notes: { type: String },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

EmergencyContactSchema.index({ beneficiary: 1 });
EmergencyContactSchema.index({ beneficiary: 1, priority: 1 });
EmergencyContactSchema.index({ branchId: 1 });

module.exports =
  mongoose.models.EmergencyContact || mongoose.model('EmergencyContact', EmergencyContactSchema);
