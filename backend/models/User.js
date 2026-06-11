/* eslint-disable no-unused-vars */
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [50, 'Username cannot exceed 50 characters'],
  },
  email: {
    type: String,
    unique: true,
    sparse: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
  },
  phone: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
  },
  // Saudi national ID — required for Nafath SSO linkage (W205b).
  // sparse so users without one don't collide on null.
  nationalId: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    match: [/^[12]\d{9}$/, 'الهوية الوطنية يجب أن تبدأ بـ 1 أو 2 و10 أرقام'],
    index: true,
  },
  password: {
    type: String,
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
  isActive: {
    type: Boolean,
    default: true,
  },
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    alias: 'branch', // backward compat: user.branch still works
    index: true,
  },
  // Phase 7 — region-level governance.
  // `regionIds` is a multi-value field because regional_director
  // may cover >1 region (e.g. عمليات المنطقتين الغربية والوسطى).
  // Branch.regionId is the authoritative parent — when evaluating a
  // region-scoped query, branchScope middleware resolves each user's
  // regionIds to an in-set of branches before filtering.
  regionIds: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Region' }],
    default: [],
    index: true,
  },
  // `branchIds` for secondment / multi-branch assignment. Old `branchId`
  // stays as the PRIMARY branch (backwards-compatible) and as the
  // default for branchFilter() when the user is on their home branch.
  branchIds: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Branch' }],
    default: [],
  },
  department: {
    type: String,
    trim: true,
    maxlength: 80,
  },
  emailVerified: {
    type: Boolean,
    default: false,
  },
  phoneVerified: {
    type: Boolean,
    default: false,
  },
  resetPasswordToken: {
    type: String,
    select: false,
  },
  resetPasswordExpires: {
    type: Date,
    select: false,
  },
  role: {
    type: String,
    enum: [
      // Level 0 — HQ / Group
      'super_admin',
      'head_office_admin',
      'ceo',
      'group_gm',
      'group_cfo',
      'group_chro',
      'group_quality_officer',
      'compliance_officer',
      'internal_auditor',
      'it_admin',
      // Level 1 — Region (Phase 7)
      'regional_director',
      'regional_quality',
      // Level 2 — Branch
      'admin',
      'manager',
      'branch_manager',
      'clinical_director',
      'quality_coordinator',
      // Level 3 — Department
      'supervisor',
      'hr_supervisor',
      'finance_supervisor',
      'therapy_supervisor',
      'special_ed_supervisor',
      // Level 4 — Specialty / Program
      'doctor',
      'therapist',
      'therapist_slp',
      'therapist_ot',
      'therapist_pt',
      'therapist_psych',
      'teacher',
      'special_ed_teacher',
      'therapy_assistant',
      // ADR-037 D3 (W731, 2026-06-01): the 9 const-only roles, now resolvable in
      // rbac.config — must be assignable on a User too (rbac-roles-consistency).
      'nurse',
      'head_nurse',
      'nursing_supervisor',
      'dpo',
      'family_counsellor',
      'independent_advocate',
      'cultural_officer',
      'patient_relations_officer',
      'crm_supervisor',
      // Level 5 — Support
      'hr',
      'hr_manager',
      'hr_officer',
      'accountant',
      'finance',
      'receptionist',
      'data_entry',
      'driver',
      'bus_assistant',
      // External
      'parent',
      'guardian',
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
// Kareem 3.0 (Mongoose 9): async hooks — no next callback, use throw for errors
userSchema.pre('save', async function () {
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
  // W435: race-free failed-login increment.
  //
  // Previous implementation decided whether to set `lockUntil` based on
  // the in-memory `this.failedLoginAttempts` snapshot taken at doc-load.
  // Five parallel failed logins each observed `0 + 1 < 5` and none set
  // the lock — counter ended at 5+ but the account was never locked,
  // letting an attacker bypass the brute-force gate entirely.
  //
  // Fix: (1) atomically increment (or reset on expired lock) via an
  // aggregation-pipeline update so the DB makes the time comparison —
  // not the in-memory snapshot; (2) re-read the post-increment value
  // and, if it crossed the threshold and no lock is currently active,
  // set `lockUntil` in a second update guarded by a CAS filter so
  // simultaneous threshold-crossers idempotently write the same lock.
  const Model = this.constructor;

  const updated = await Model.findOneAndUpdate(
    { _id: this._id },
    [
      {
        $set: {
          failedLoginAttempts: {
            $cond: [
              {
                $and: [
                  { $ne: [{ $ifNull: ['$lockUntil', null] }, null] },
                  { $lt: ['$lockUntil', '$$NOW'] },
                ],
              },
              1,
              { $add: [{ $ifNull: ['$failedLoginAttempts', 0] }, 1] },
            ],
          },
          lockUntil: {
            $cond: [
              {
                $and: [
                  { $ne: [{ $ifNull: ['$lockUntil', null] }, null] },
                  { $lt: ['$lockUntil', '$$NOW'] },
                ],
              },
              null,
              '$lockUntil',
            ],
          },
        },
      },
    ],
    // Mongoose 9 refuses array (aggregation-pipeline) updates unless
    // `updatePipeline: true` is passed — without it every wrong-password
    // login threw MongooseError and the route returned 500 (and the
    // brute-force counter never incremented).
    {
      returnDocument: 'after',
      projection: { failedLoginAttempts: 1, lockUntil: 1 },
      updatePipeline: true,
    }
  );

  if (!updated) return null;

  if (updated.failedLoginAttempts >= MAX_LOGIN_ATTEMPTS && !updated.lockUntil) {
    await Model.updateOne(
      {
        _id: this._id,
        $or: [
          { lockUntil: null },
          { lockUntil: { $exists: false } },
          { lockUntil: { $lt: new Date() } },
        ],
      },
      { $set: { lockUntil: new Date(Date.now() + LOCK_TIME_MS) } }
    );
  }

  return updated;
};

// Reset login attempts on successful login
userSchema.methods.resetLoginAttempts = function () {
  return this.updateOne({
    $set: { failedLoginAttempts: 0 },
    $unset: { lockUntil: 1 },
  });
};

// Pre-validate: ensure at least one identifier (email, phone, or username) exists
// Kareem 3.0 (Mongoose 9): use throw instead of next(err), no next callback needed
userSchema.pre('validate', function () {
  if (!this.email && !this.phone && !this.username) {
    throw new Error('At least one identifier (email, phone, or username) is required');
  }
});

// ─── Indexes ─────────────────────────────────────────────────────────────────
// email, username, phone have { unique: true, sparse: true } → allow null but enforce uniqueness
userSchema.index({ role: 1 }); // RBAC queries: list users by role
userSchema.index({ createdAt: -1 }); // Admin listings sorted by newest
userSchema.index({ lastLogin: -1 }); // Last-active reports
userSchema.index({ role: 1, createdAt: -1 }); // Role-based admin listing
userSchema.index({ branchId: 1, role: 1 }); // Branch-scoped role queries

const User = mongoose.models.User || mongoose.model('User', userSchema);

module.exports = User;
