/**
 * Seed Database Tests
 * Tests for database seeding utilities
 */

const seedDatabase = require('../utils/seedDatabase');

// Mock User model - must match the path in seedDatabase.js
jest.mock('../models/User', () => {
  const mockUsers = new Map();

  return class User {
    constructor(data) {
      Object.assign(this, data);
      this._id = 'user_' + Date.now() + Math.random();
    }

    async save() {
      mockUsers.set(this.email, this);
      return this;
    }

    static async findOne(query) {
      if (query.email) {
        return mockUsers.get(query.email) || null;
      }
      return null;
    }

    static clearMock() {
      mockUsers.clear();
    }

    static getMockUsers() {
      return mockUsers;
    }
  };
});

// Mock bcrypt
jest.mock('bcryptjs', () => ({
  hash: jest.fn(async (password, rounds) => `hashed_${password}`),
}));

describe('Seed Database Utility', () => {
  const User = require('../models/User');

  beforeEach(() => {
    User.clearMock();
    jest.clearAllMocks();
    // Suppress console logs during tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.log.mockRestore();
    console.error.mockRestore();
  });

  test('should seed admin user when database is empty', async () => {
    await seedDatabase();

    const users = User.getMockUsers();
    expect(users.size).toBe(1);
    expect(users.has('admin@alawael.com')).toBe(true);

    const adminUser = users.get('admin@alawael.com');
    expect(adminUser.email).toBe('admin@alawael.com');
    expect(adminUser.fullName).toBe('مدير النظام');
    expect(adminUser.role).toBe('admin');
    expect(adminUser.status).toBe('active');
  });

  test('should not create duplicate admin when already exists', async () => {
    // First seed
    await seedDatabase();
    const firstCount = User.getMockUsers().size;

    // Second seed attempt
    await seedDatabase();
    const secondCount = User.getMockUsers().size;

    expect(firstCount).toBe(secondCount);
    expect(console.log).toHaveBeenCalledWith('✅ Admin user already exists');
  });

  test('should hash password before saving', async () => {
    const bcrypt = require('bcryptjs');

    await seedDatabase();

    expect(bcrypt.hash).toHaveBeenCalledWith('Admin@123456', 10);

    const users = User.getMockUsers();
    const adminUser = users.get('admin@alawael.com');
    expect(adminUser.password).toBe('hashed_Admin@123456');
  });

  test('should set correct user properties', async () => {
    await seedDatabase();

    const users = User.getMockUsers();
    const adminUser = users.get('admin@alawael.com');

    expect(adminUser).toMatchObject({
      email: 'admin@alawael.com',
      fullName: 'مدير النظام',
      phone: '966501234567',
      department: 'إدارة',
      role: 'admin',
      status: 'active',
    });
  });

  test('should log success message after creating user', async () => {
    await seedDatabase();

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('✅ Admin user created'));
  });

  test('should handle errors gracefully', async () => {
    const User = require('../models/User');

    // Mock save to throw error
    User.prototype.save = jest.fn().mockRejectedValue(new Error('Database error'));

    await seedDatabase();

    expect(console.error).toHaveBeenCalledWith('⚠️  Seeding warning:', 'Database error');
  });

  test('should ignore duplicate key errors', async () => {
    const User = require('../models/User');

    // Mock save to throw duplicate key error
    const duplicateError = new Error('Duplicate key');
    duplicateError.code = 11000;
    User.prototype.save = jest.fn().mockRejectedValue(duplicateError);

    await seedDatabase();

    // Should not log error for duplicate key
    expect(console.error).not.toHaveBeenCalled();
  });

  test('should use correct bcrypt rounds', async () => {
    const bcrypt = require('bcryptjs');

    await seedDatabase();

    expect(bcrypt.hash).toHaveBeenCalledWith(expect.any(String), 10);
  });
});

describe('Seed Database Integration', () => {
  const User = require('../models/User');

  beforeEach(() => {
    User.clearMock();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.log.mockRestore();
    console.error.mockRestore();
  });

  test('should work with async/await pattern', async () => {
    const result = await seedDatabase();
    expect(result).toBeUndefined(); // Function doesn't return anything
  });

  test('should not throw when called', async () => {
    await expect(seedDatabase()).resolves.not.toThrow();
  });

  test('should be idempotent', async () => {
    const firstRun = await seedDatabase();
    const secondRun = await seedDatabase();
    const thirdRun = await seedDatabase();

    expect(firstRun).toEqual(secondRun);
    expect(secondRun).toEqual(thirdRun);
  });
});
