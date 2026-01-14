// backend/config/in-memory-db.js
// محاكاة قاعدة بيانات في الذاكرة للتطوير السريع

const db = {
  users: [
    {
      _id: '1',
      email: 'admin@alawael.com',
      fullName: 'مدير النظام',
      password: '$2b$10$pIZzh3IQY6.XPy6bxeFTi.qkGCdGpWMz02H.FhcKYQrR7.Fk0iVCq', // Admin@123456 (bcrypted)
      role: 'admin',
      phone: '966501234567',
      department: 'إدارة',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
  sessions: [],
  documents: [],
  appointments: [],
  communications: [],
};

const InMemoryDB = {
  // Users
  createUser: async userData => {
    const user = {
      _id: Date.now().toString(),
      ...userData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    db.users.push(user);
    return user;
  },

  findUserByEmail: async email => {
    return db.users.find(u => u.email === email) || null;
  },

  findUserById: async id => {
    return db.users.find(u => u._id === id) || null;
  },

  getAllUsers: async () => {
    return db.users;
  },

  updateUser: async (id, updates) => {
    const user = db.users.find(u => u._id === id);
    if (user) {
      Object.assign(user, updates, { updatedAt: new Date() });
    }
    return user;
  },

  deleteUser: async id => {
    const index = db.users.findIndex(u => u._id === id);
    if (index > -1) {
      return db.users.splice(index, 1)[0];
    }
    return null;
  },

  // Generic operations
  create: async (collection, data) => {
    const item = {
      _id: Date.now().toString(),
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    if (!db[collection]) db[collection] = [];
    db[collection].push(item);
    return item;
  },

  find: async (collection, query = {}) => {
    if (!db[collection]) return [];
    return db[collection].filter(item => {
      return Object.keys(query).every(key => item[key] === query[key]);
    });
  },

  findById: async (collection, id) => {
    if (!db[collection]) return null;
    return db[collection].find(item => item._id === id) || null;
  },

  update: async (collection, id, updates) => {
    const item = db[collection]?.find(i => i._id === id);
    if (item) {
      Object.assign(item, updates, { updatedAt: new Date() });
    }
    return item;
  },

  delete: async (collection, id) => {
    if (!db[collection]) return null;
    const index = db[collection].findIndex(i => i._id === id);
    if (index > -1) {
      return db[collection].splice(index, 1)[0];
    }
    return null;
  },

  // Status
  getStatus: async () => {
    return {
      connected: true,
      type: 'in-memory',
      collections: Object.keys(db),
      counts: Object.entries(db).reduce((acc, [key, val]) => {
        acc[key] = val.length;
        return acc;
      }, {}),
    };
  },
};

module.exports = InMemoryDB;
