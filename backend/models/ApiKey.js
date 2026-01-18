const mongoose = require('mongoose');
const crypto = require('crypto');

const apiKeySchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String, // e.g. "Mobile App", "Reporting Service"
      required: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    permissions: [
      {
        type: String, // e.g. "READ_REPORTS", "WRITE_ATTENDANCE"
      },
    ],
    lastUsed: {
      type: Date,
    },
    expiresAt: {
      type: Date,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

// Generate a secure random key before saving
apiKeySchema.statics.generateKey = function () {
  return 'sk_' + crypto.randomBytes(24).toString('hex');
};

module.exports = mongoose.model('ApiKey', apiKeySchema);
