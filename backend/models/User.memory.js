/* eslint-disable no-unused-vars, no-undef, no-empty, prefer-const, no-constant-condition, no-unused-expressions */
const mongoose = require('mongoose');
const db = require('../config/inMemoryDB');
const logger = require('../utils/logger');

// Get next ID for users
function getNextId() {
  const data = db.read();
  const users = data.users || [];
  if (users.length === 0) return 1;
  const maxId = Math.max(
    ...users.map(u => {
      const id = parseInt(u._id);
      return isNaN(id) ? 0 : id;
    })
  );
  return maxId + 1;
}

// Simulate Mongoose model
class InMemoryUser {
  constructor(data) {
    this._id = data._id || getNextId().toString();
    this.email = data.email;
    this.password = data.password;
    this.fullName = data.fullName;
    this.role = data.role || 'user';
    this.lastLogin = data.lastLogin || null;
    this.failedLoginAttempts = data.failedLoginAttempts || 0;
    this.lockUntil = data.lockUntil || null;
    this.tokenVersion = data.tokenVersion || 0;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  get id() {
    return this._id;
  }

  get isLocked() {
    return !!(this.lockUntil && new Date(this.lockUntil) > Date.now());
  }

  toObject({ includePassword = false } = {}) {
    const obj = {
      _id: this._id,
      email: this.email,
      fullName: this.fullName,
      role: this.role,
      lastLogin: this.lastLogin,
      failedLoginAttempts: this.failedLoginAttempts,
      lockUntil: this.lockUntil,
      tokenVersion: this.tokenVersion,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
    // Only include password when explicitly requested (e.g. for persistence)
    if (includePassword) {
      obj.password = this.password;
    }
    return obj;
  }

  async save() {
    this.updatedAt = new Date();
    const data = db.read();
    const users = data.users || [];
    const index = users.findIndex(u => u._id === this._id);

    if (index >= 0) {
      users[index] = this.toObject({ includePassword: true });
    } else {
      users.push(this.toObject({ includePassword: true }));
    }

    data.users = users;
    db.write(data);
    return this;
  }

  async updateOne(update) {
    if (update.$inc) {
      for (const [key, val] of Object.entries(update.$inc)) {
        this[key] = (this[key] || 0) + val;
      }
    }
    if (update.$set) {
      for (const [key, val] of Object.entries(update.$set)) {
        this[key] = val;
      }
    }
    if (update.$unset) {
      for (const key of Object.keys(update.$unset)) {
        this[key] = null;
      }
    }
    await this.save();
  }

  async incLoginAttempts() {
    const MAX_LOGIN_ATTEMPTS = 5;
    const LOCK_TIME_MS = 15 * 60 * 1000;
    if (this.lockUntil && new Date(this.lockUntil) < Date.now()) {
      this.failedLoginAttempts = 1;
      this.lockUntil = null;
      await this.save();
      return;
    }
    this.failedLoginAttempts = (this.failedLoginAttempts || 0) + 1;
    if (this.failedLoginAttempts >= MAX_LOGIN_ATTEMPTS && !this.isLocked) {
      this.lockUntil = new Date(Date.now() + LOCK_TIME_MS);
    }
    await this.save();
  }

  async resetLoginAttempts() {
    this.failedLoginAttempts = 0;
    this.lockUntil = null;
    await this.save();
  }

  toJSON() {
    const obj = { ...this };
    delete obj.password;
    return obj;
  }
}

// Chainable query wrapper — mimics Mongoose Query with .select()/.sort()/.skip()/.limit()/.lean() support
function chainable(promise) {
  const chain = {
    _promise: promise,
    select() {
      // In-memory model always returns all fields — select is a no-op
      return chain;
    },
    sort() {
      return chain;
    },
    skip() {
      return chain;
    },
    limit() {
      return chain;
    },
    lean() {
      return chain;
    },
    then(resolve, reject) {
      return chain._promise.then(resolve, reject);
    },
    catch(reject) {
      return chain._promise.catch(reject);
    },
  };
  return chain;
}

const UserModel = {
  async create(data) {
    const user = new InMemoryUser(data);
    await user.save();
    return user;
  },

  findOne(query) {
    const promise = (async () => {
      const data = db.read();
      const users = data.users || [];
      const found = users.find(u => {
        if (query.email) return u.email === query.email;
        if (query._id) return String(u._id) === String(query._id);
        return false;
      });
      return found ? new InMemoryUser(found) : null;
    })();
    return chainable(promise);
  },

  findById(id) {
    const promise = (async () => {
      const data = db.read();
      const users = data.users || [];
      const found = users.find(u => String(u._id) === String(id));
      return found ? new InMemoryUser(found) : null;
    })();
    return chainable(promise);
  },

  find(query = {}) {
    const promise = (async () => {
      const data = db.read();
      let results = data.users || [];

      // Apply query filters if any
      if (query.email) {
        results = results.filter(u => u.email === query.email);
      }
      if (query.role) {
        results = results.filter(u => u.role === query.role);
      }
      if (query.$or) {
        results = results.filter(u =>
          query.$or.some(condition => {
            return Object.entries(condition).some(([key, val]) => {
              if (val && val.$regex) {
                return new RegExp(val.$regex, val.$options || '').test(u[key]);
              }
              return u[key] === val;
            });
          })
        );
      }

      return results.map(u => new InMemoryUser(u));
    })();
    return chainable(promise);
  },

  async countDocuments(query = {}) {
    const data = db.read();
    let results = data.users || [];
    if (query.email) results = results.filter(u => u.email === query.email);
    if (query.role) results = results.filter(u => u.role === query.role);
    if (query.$or) {
      results = results.filter(u =>
        query.$or.some(condition => {
          return Object.entries(condition).some(([key, val]) => {
            if (val && val.$regex) {
              return new RegExp(val.$regex, val.$options || '').test(u[key]);
            }
            return u[key] === val;
          });
        })
      );
    }
    return results.length;
  },

  async findByIdAndDelete(id) {
    const data = db.read();
    const users = data.users || [];
    const index = users.findIndex(u => String(u._id) === String(id));

    if (index >= 0) {
      const deleted = users[index];
      users.splice(index, 1);
      data.users = users;
      db.write(data);
      return new InMemoryUser(deleted);
    }
    return null;
  },
};

// Initialize with admin user (only if no users exist and not in test mode)
// AUTO INITIALIZATION DISABLED - Use pre-seeded users from db.json
if (false && process.env.NODE_ENV !== 'test') {
  (async () => {
    const data = db.read();
    if (!data.users || data.users.length === 0) {
      const bcrypt = require('bcryptjs');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(
        process.env.ADMIN_INITIAL_PASS || 'Change_Me_On_First_Login!1',
        salt
      );

      await UserModel.create({
        email: 'admin@alawael.com',
        password: hashedPassword,
        fullName: 'مدير النظام',
        role: 'admin',
      });

      logger.info('✅ In-memory database initialized with admin user');
      logger.info('📧 Email: admin@alawael.com');
      logger.info('🔑 Password: (set via ADMIN_INITIAL_PASS env var)');
    }
  })();
}

module.exports = UserModel;
