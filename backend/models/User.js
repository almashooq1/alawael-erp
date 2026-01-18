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
    enum: ['user', 'admin', 'manager', 'hr', 'accountant', 'doctor', 'therapist', 'receptionist', 'parent'],
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
  next();
});

// Method to get user without password
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  delete user.__v;
  return user;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
