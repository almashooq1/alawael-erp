// نموذج سياسة الامتثال (Compliance Policy)
import mongoose from 'mongoose';

const CompliancePolicySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String },
  enabled: { type: Boolean, default: true },
  rules: { type: Object, default: {} }, // يمكن تخصيص القواعد لاحقاً
  riskAlertThreshold: { type: Number, default: 70 }, // عتبة التنبيه الافتراضية لهذه السياسة
  userThresholdOverrides: { type: Object, default: {} }, // { userId: threshold }
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

CompliancePolicySchema.pre('save', function(this: any) {
  this.updatedAt = new Date();
});

export default mongoose.model('CompliancePolicy', CompliancePolicySchema);
