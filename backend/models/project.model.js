const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: String,
  manager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  team: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  ],
  status: {
    type: String,
    enum: ['active', 'completed', 'on_hold', 'access_request'],
    default: 'active',
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
  },
  startDate: Date,
  endDate: Date,
  budget: Number,
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date,
});

module.exports = mongoose.model('Project', ProjectSchema);
