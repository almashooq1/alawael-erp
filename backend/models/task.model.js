const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: String,
  assignees: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  ],
  status: {
    type: String, // Kanban column: 'todo', 'in_progress', 'review', 'done'
    enum: ['todo', 'in_progress', 'review', 'done'],
    default: 'todo',
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
  },
  dueDate: Date,
  attachments: [
    {
      fileName: String,
      url: String,
    },
  ],
  comments: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      text: String,
      createdAt: { type: Date, default: Date.now },
    },
  ],
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date,
});

module.exports = mongoose.model('Task', TaskSchema);
