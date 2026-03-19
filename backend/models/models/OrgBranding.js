const mongoose = require('mongoose');

const OrgBrandingSchema = new mongoose.Schema({
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, unique: true },
  name: { type: String, default: '' },
  color: { type: String, default: '#667eea' },
  logo: { type: String, default: '' }, // base64 or URL
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('OrgBranding', OrgBrandingSchema);
