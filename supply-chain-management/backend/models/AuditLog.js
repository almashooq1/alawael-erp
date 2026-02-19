const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true }, // مثال: 'create', 'update', 'delete', 'login', ...
  entity: { type: String }, // مثال: 'Supplier', 'Product', ...
  entityId: { type: String },
  details: { type: Object }, // تفاصيل إضافية (قبل/بعد، بيانات مختصرة)
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
