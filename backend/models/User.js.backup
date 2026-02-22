const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters long'],
  },
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true,
    minlength: [2, 'Full name must be at least 2 characters'],
    maxlength: [100, 'Full name cannot exceed 100 characters'],
  },
  role: {
    type: String,
    enum: [
      'user',
      'admin',
      'manager',
      'hr',
      'accountant',
      'doctor',
      'therapist',
      'receptionist',
      'parent',
    ],
    default: 'user',
  },
  lastLogin: {
    type: Date,
    default: null,
  },
  mfa: {
    enabled: { type: Boolean, default: false },
    secret: String,
    backupCodes: [String],
    smsCode: String,
    smsCodeExpires: Date,
    trustedDevices: [
      {
        fingerprint: String,
        token: String,
        createdAt: Date,
        expiresAt: Date,
      },
    ],
    enabledAt: Date,
  },
  passwordChangedAt: {
    type: Date,
    default: Date.now,
  },
  passwordHistory: {
    type: [String],
    select: false,
    default: [],
  },
  requirePasswordChange: {
    type: Boolean,
    default: false,
  },
  passwordResetReason: {
    type: String,
  },
  notificationPreferences: {
    channels: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: true },
      whatsapp: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      'in-app': { type: Boolean, default: true },
    },
    types: {
      payment: { type: Boolean, default: true },
      security: { type: Boolean, default: true },
      system: { type: Boolean, default: true },
      marketing: { type: Boolean, default: false },
      reminder: { type: Boolean, default: true },
      alert: { type: Boolean, default: true },
      info: { type: Boolean, default: true },
    },
    quietHours: {
      enabled: { type: Boolean, default: false },
      start: { type: Number, default: 22 }, // 10 PM
      end: { type: Number, default: 8 }, // 8 AM
    },
  },
  loginHistory: [
    {
      date: { type: Date, default: Date.now },
      ip: String,
      device: String,
      location: String,
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update timestamp on save
userSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  if (typeof next === 'function') {
    next();
  }
});
// Method to compare passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
  const bcrypt = require('bcrypt');
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};
// Method to get user without password
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  delete user.__v;
  return user;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
