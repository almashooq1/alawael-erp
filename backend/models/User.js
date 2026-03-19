/* eslint-disable no-unused-vars */
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
    select: false,
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
      'super_admin',
      'admin',
      'manager',
      'supervisor',
      'hr',
      'hr_manager',
      'accountant',
      'finance',
      'doctor',
      'therapist',
      'teacher',
      'receptionist',
      'data_entry',
      'parent',
      'student',
      'viewer',
      'user',
      'guest',
    ],
    default: 'user',
  },
  customPermissions: {
    type: [String],
    default: [],
    select: true,
  },
  deniedPermissions: {
    type: [String],
    default: [],
    select: true,
  },
  lastLogin: {
    type: Date,
    default: null,
  },
  failedLoginAttempts: {
    type: Number,
    default: 0,
  },
  lockUntil: {
    type: Date,
    default: null,
  },
  tokenVersion: {
    type: Number,
    default: 0,
  },
  mfa: {
    enabled: { type: Boolean, default: false },
    secret: { type: String, select: false },
    backupCodes: { type: [String], select: false },
    smsCode: { type: String, select: false },
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

// Update timestamp, hash password, and cap loginHistory on save
userSchema.pre('save', async function (next) {
  this.updatedAt = Date.now();

  // Only hash password if it was modified (or is new) and not already hashed
  if (this.isModified('password') && this.password) {
    // Skip if value is already a bcrypt hash (prevents double-hashing)
    const isBcryptHash = /^\$2[aby]\$\d{2}\$/.test(this.password);
    if (!isBcryptHash) {
      const bcrypt = require('bcryptjs');
      this.password = await bcrypt.hash(this.password, 12);
    }
  }

  // Cap loginHistory to last 50 entries to prevent unbounded document growth
  if (this.loginHistory && this.loginHistory.length > 50) {
    this.loginHistory = this.loginHistory.slice(-50);
  }

  if (typeof next === 'function') {
    next();
  }
});
// Method to compare passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
  const bcrypt = require('bcryptjs');
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

// Virtual: is the account currently locked?
userSchema.virtual('isLocked').get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Increment failed login attempts; lock after 5 consecutive failures for 15 minutes
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME_MS = 15 * 60 * 1000; // 15 minutes

userSchema.methods.incLoginAttempts = async function () {
  // If previous lock has expired, reset and start fresh
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $set: { failedLoginAttempts: 1 },
      $unset: { lockUntil: 1 },
    });
  }

  const updates = { $inc: { failedLoginAttempts: 1 } };
  // Lock the account when threshold is reached
  if (this.failedLoginAttempts + 1 >= MAX_LOGIN_ATTEMPTS && !this.isLocked) {
    updates.$set = { lockUntil: new Date(Date.now() + LOCK_TIME_MS) };
  }
  return this.updateOne(updates);
};

// Reset login attempts on successful login
userSchema.methods.resetLoginAttempts = function () {
  return this.updateOne({
    $set: { failedLoginAttempts: 0 },
    $unset: { lockUntil: 1 },
  });
};

// ─── Indexes ─────────────────────────────────────────────────────────────────
// email already has { unique: true } → implicit unique index
userSchema.index({ role: 1 }); // RBAC queries: list users by role
userSchema.index({ createdAt: -1 }); // Admin listings sorted by newest
userSchema.index({ lastLogin: -1 }); // Last-active reports
userSchema.index({ role: 1, createdAt: -1 }); // Role-based admin listing

const User = mongoose.model('User', userSchema);

module.exports = User;
