// نموذج حدث الامتثال (Compliance Event)
import mongoose from 'mongoose';

const ComplianceEventSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  userId: { type: String, required: false },
  action: { type: String, required: true }, // مثال: 'login', 'update', 'delete', 'permission-change'
  resource: { type: String, required: true }, // مثال: 'contract', 'meeting', 'user', ...
  resourceId: { type: String, required: false },
  status: { type: String, required: true }, // 'success' | 'fail' | 'warning'
  details: { type: String },
  policy: { type: String }, // اسم سياسة الامتثال المرتبطة
});

export default mongoose.model('ComplianceEvent', ComplianceEventSchema);
