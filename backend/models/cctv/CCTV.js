const mongoose = require('mongoose');

const CCTVSchema = new mongoose.Schema({
  name: { type: String, required: true },
  location: { type: String },
  status: { type: String, enum: ['active', 'inactive', 'maintenance'], default: 'active' },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('CCTV', CCTVSchema);
