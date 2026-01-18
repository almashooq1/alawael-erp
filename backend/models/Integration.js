const mongoose = require('mongoose');

const integrationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    type: {
      type: String,
      enum: ['WEBHOOK', 'API', 'OAUTH'],
      required: true,
    },
    config: {
      apiKey: String,
      endpointUrl: String,
      secret: String,
      webhookUrl: String,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE', 'ERROR'],
      default: 'INACTIVE',
    },
    logs: [
      {
        timestamp: { type: Date, default: Date.now },
        action: String,
        status: String,
        message: String,
      },
    ],
    lastSync: Date,
  },
  { timestamps: true },
);

module.exports = mongoose.model('Integration', integrationSchema);
