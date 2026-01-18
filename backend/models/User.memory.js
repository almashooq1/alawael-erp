const mongoose = require('mongoose');
const db = require('../config/inMemoryDB');

// Get next ID for users
function getNextId() {
  const data = db.read();
  const users = data.users || [];
  if (users.length === 0) return 1;
  const maxId = Math.max(
    ...users.map(u => {
      const id = parseInt(u._id);
      return isNaN(id) ? 0 : id;
    }),
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
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  toObject() {
    return {
      _id: this._id,
      email: this.email,
      password: this.password,
      fullName: this.fullName,
      role: this.role,
      lastLogin: this.lastLogin,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  async save() {
    this.updatedAt = new Date();
    const data = db.read();
    const users = data.users || [];
    const index = users.findIndex(u => u._id === this._id);

    if (index >= 0) {
      users[index] = this.toObject();
    } else {
      users.push(this.toObject());
    }

    data.users = users;
    db.write(data);
    return this;
  }

  toJSON() {
    const obj = { ...this };
    delete obj.password;
    return obj;
  }
}

const UserModel = {
  async create(data) {
    const user = new InMemoryUser(data);
    await user.save();
    return user;
  },

  async findOne(query) {
    const data = db.read();
    const users = data.users || [];
    const found = users.find(u => {
      if (query.email) return u.email === query.email;
      if (query._id) return u._id == query._id;
      return false;
    });
    return found ? new InMemoryUser(found) : null;
  },

  async findById(id) {
    const data = db.read();
    const users = data.users || [];
    const found = users.find(u => u._id == id);
    return found ? new InMemoryUser(found) : null;
  },

  async find(query = {}) {
    const data = db.read();
    let results = data.users || [];

    // Apply query filters if any
    if (query.email) {
      results = results.filter(u => u.email === query.email);
    }
    if (query.role) {
      results = results.filter(u => u.role === query.role);
    }

    return results.map(u => new InMemoryUser(u));
  },

  async findByIdAndDelete(id) {
    const data = db.read();
    const users = data.users || [];
    const index = users.findIndex(u => u._id == id);

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

// Override User model methods
InMemoryUser.prototype.select = function (fields) {
  if (fields === '-password') {
    return this.toJSON();
  }
  return this;
};

// Initialize with admin user (only if no users exist and not in test mode)
// Completely skip initialization in test mode
if (process.env.NODE_ENV !== 'test') {
  (async () => {
    const data = db.read();
    if (!data.users || data.users.length === 0) {
      const bcrypt = require('bcryptjs');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('Admin@123456', salt);

      await UserModel.create({
        email: 'admin@alawael.com',
        password: hashedPassword,
        fullName: 'مدير النظام',
        role: 'admin',
      });

      console.log('✅ In-memory database initialized with admin user');
      console.log('📧 Email: admin@alawael.com');
      console.log('🔑 Password: Admin@123456');
    }
  })();
}

module.exports = UserModel;
