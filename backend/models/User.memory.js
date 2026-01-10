const mongoose = require('mongoose');

// In-memory storage for development
let users = [];
let nextId = 1;

// Simulate Mongoose model
class InMemoryUser {
  constructor(data) {
    this._id = nextId++;
    this.email = data.email;
    this.password = data.password;
    this.fullName = data.fullName;
    this.role = data.role || 'user';
    this.lastLogin = data.lastLogin || null;
    this.createdAt = new Date();
    this.updatedAt = new Date();
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
    const index = users.findIndex(u => u._id === this._id);
    if (index >= 0) {
      users[index] = this;
    } else {
      users.push(this);
    }
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
    return users.find(u => {
      if (query.email) return u.email === query.email;
      if (query._id) return u._id == query._id;
      return false;
    });
  },

  async findById(id) {
    return users.find(u => u._id == id);
  },

  async find(query = {}) {
    let results = [...users];

    // Apply query filters if any
    if (query.email) {
      results = results.filter(u => u.email === query.email);
    }
    if (query.role) {
      results = results.filter(u => u.role === query.role);
    }

    return results;
  },

  async findByIdAndDelete(id) {
    const index = users.findIndex(u => u._id == id);
    if (index >= 0) {
      const deleted = users[index];
      users.splice(index, 1);
      return deleted;
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

// Initialize with admin user
(async () => {
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
})();

module.exports = UserModel;
