const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  // email was referenced by the register/login handlers but missing from the
  // schema, so Mongoose silently dropped it. sparse keeps the unique index from
  // colliding on any legacy docs that predate this field.
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, sparse: true },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ['admin', 'manager', 'user'], default: 'user' },
  createdAt: { type: Date, default: Date.now },
});

// Auto-hash password on create/update (Round 44)
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
