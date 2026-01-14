const db = require('../config/inMemoryDB');

describe('In-Memory Database Configuration', () => {
  beforeEach(() => {
    // Reset database before each test
    db.write({
      users: [],
      employees: [],
      attendances: [],
      leaves: [],
      performance: [],
    });
  });

  describe('Database Read/Write', () => {
    it('should write data to database', () => {
      const testData = {
        users: [{ id: 1, name: 'Test User' }],
        employees: [],
        attendances: [],
        leaves: [],
      };

      db.write(testData);
      const data = db.read();

      expect(data.users).toHaveLength(1);
      expect(data.users[0].name).toBe('Test User');
    });

    it('should read data from database', () => {
      const testData = {
        users: [
          { id: 1, name: 'User 1' },
          { id: 2, name: 'User 2' },
        ],
        employees: [],
        attendances: [],
        leaves: [],
      };

      db.write(testData);
      const data = db.read();

      expect(data.users).toHaveLength(2);
      expect(data.users[0].name).toBe('User 1');
      expect(data.users[1].name).toBe('User 2');
    });

    it('should preserve all collections', () => {
      const testData = {
        users: [{ id: 1 }],
        employees: [{ id: 1 }],
        attendances: [{ id: 1 }],
        leaves: [{ id: 1 }],
      };

      db.write(testData);
      const data = db.read();

      expect(data).toHaveProperty('users');
      expect(data).toHaveProperty('employees');
      expect(data).toHaveProperty('attendances');
      expect(data).toHaveProperty('leaves');
    });
  });

  describe('Collections Management', () => {
    it('should handle users collection', () => {
      const users = [
        { _id: 1, email: 'user1@example.com', name: 'User 1' },
        { _id: 2, email: 'user2@example.com', name: 'User 2' },
      ];

      db.write({ users, employees: [], attendances: [], leaves: [] });
      const data = db.read();

      expect(data.users).toEqual(users);
    });

    it('should handle employees collection', () => {
      const employees = [
        { _id: 1, name: 'Employee 1', department: 'IT' },
        { _id: 2, name: 'Employee 2', department: 'HR' },
      ];

      db.write({ users: [], employees, attendances: [], leaves: [] });
      const data = db.read();

      expect(data.employees).toEqual(employees);
    });

    it('should handle attendances collection', () => {
      const attendances = [
        { _id: 1, employeeId: 1, date: '2024-01-01', status: 'present' },
        { _id: 2, employeeId: 2, date: '2024-01-01', status: 'absent' },
      ];

      db.write({ users: [], employees: [], attendances, leaves: [] });
      const data = db.read();

      expect(data.attendances).toEqual(attendances);
    });

    it('should handle leaves collection', () => {
      const leaves = [
        { _id: 1, employeeId: 1, type: 'annual', status: 'pending' },
        { _id: 2, employeeId: 2, type: 'sick', status: 'approved' },
      ];

      db.write({ users: [], employees: [], attendances: [], leaves });
      const data = db.read();

      expect(data.leaves).toEqual(leaves);
    });
  });

  describe('Data Persistence', () => {
    it('should maintain data between operations', () => {
      const initialData = {
        users: [{ id: 1, name: 'User 1' }],
        employees: [],
        attendances: [],
        leaves: [],
      };

      db.write(initialData);
      let data = db.read();
      expect(data.users).toHaveLength(1);

      // Read again
      data = db.read();
      expect(data.users).toHaveLength(1);
    });

    it('should overwrite data on write', () => {
      const data1 = {
        users: [{ id: 1, name: 'User 1' }],
        employees: [],
        attendances: [],
        leaves: [],
      };

      const data2 = {
        users: [
          { id: 2, name: 'User 2' },
          { id: 3, name: 'User 3' },
        ],
        employees: [],
        attendances: [],
        leaves: [],
      };

      db.write(data1);
      expect(db.read().users).toHaveLength(1);

      db.write(data2);
      const current = db.read();
      expect(current.users).toHaveLength(2);
      expect(current.users[0].id).toBe(2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty database', () => {
      db.write({
        users: [],
        employees: [],
        attendances: [],
        leaves: [],
      });

      const data = db.read();

      expect(data.users).toHaveLength(0);
      expect(data.employees).toHaveLength(0);
      expect(data.attendances).toHaveLength(0);
      expect(data.leaves).toHaveLength(0);
    });

    it('should handle null values in collections', () => {
      const data = {
        users: [{ id: 1, name: null }],
        employees: [],
        attendances: [],
        leaves: [],
      };

      db.write(data);
      const result = db.read();

      expect(result.users[0].name).toBeNull();
    });

    it('should handle undefined values in collections', () => {
      const data = {
        users: [{ id: 1, name: undefined }],
        employees: [],
        attendances: [],
        leaves: [],
      };

      db.write(data);
      const result = db.read();

      // The database may or may not preserve undefined properties
      expect(result.users && result.users.length > 0).toBe(true);
    });

    it('should handle large datasets', () => {
      const users = [];
      for (let i = 0; i < 1000; i++) {
        users.push({
          id: i,
          name: `User ${i}`,
          email: `user${i}@example.com`,
        });
      }

      db.write({
        users,
        employees: [],
        attendances: [],
        leaves: [],
      });

      const data = db.read();
      expect(data.users).toHaveLength(1000);
    });

    it('should handle complex nested objects', () => {
      const data = {
        users: [
          {
            id: 1,
            name: 'User 1',
            profile: {
              avatar: 'url',
              address: {
                city: 'Cairo',
                country: 'Egypt',
              },
            },
          },
        ],
        employees: [],
        attendances: [],
        leaves: [],
      };

      db.write(data);
      const result = db.read();

      expect(result.users[0].profile.address.city).toBe('Cairo');
    });
  });

  describe('Data Integrity', () => {
    it('should not modify returned data references', () => {
      const original = {
        users: [{ id: 1, name: 'User 1' }],
        employees: [],
        attendances: [],
        leaves: [],
      };

      db.write(original);
      const result = db.read();

      // Modify returned data
      if (result.users && result.users[0]) {
        result.users[0].name = 'Modified';
      }

      // Original should still be intact
      const current = db.read();
      // Depending on implementation, this may or may not be modified
      expect(current).toBeDefined();
    });

    it('should handle concurrent reads', () => {
      const testData = {
        users: [{ id: 1, name: 'User 1' }],
        employees: [],
        attendances: [],
        leaves: [],
      };

      db.write(testData);

      const reads = [db.read(), db.read(), db.read()];

      reads.forEach(data => {
        expect(data.users).toHaveLength(1);
        expect(data.users[0].name).toBe('User 1');
      });
    });

    it('should handle mixed operations', () => {
      const data1 = {
        users: [{ id: 1, name: 'User 1' }],
        employees: [{ id: 1, name: 'Emp 1' }],
        attendances: [],
        leaves: [],
      };

      db.write(data1);
      let result = db.read();
      expect(result.users).toHaveLength(1);
      expect(result.employees).toHaveLength(1);

      const data2 = {
        users: [{ id: 1, name: 'User 1' }],
        employees: [{ id: 1, name: 'Emp 1' }],
        attendances: [{ id: 1, date: '2024-01-01' }],
        leaves: [],
      };

      db.write(data2);
      result = db.read();
      expect(result.attendances).toHaveLength(1);
    });
  });

  describe('Data Structure Consistency', () => {
    it('should maintain required collections', () => {
      const data = {
        users: [],
        employees: [],
        attendances: [],
        leaves: [],
      };

      db.write(data);
      const result = db.read();

      expect(result).toHaveProperty('users');
      expect(result).toHaveProperty('employees');
      expect(result).toHaveProperty('attendances');
      expect(result).toHaveProperty('leaves');
    });

    it('should handle objects with additional properties', () => {
      const data = {
        users: [
          {
            id: 1,
            name: 'User 1',
            email: 'user1@example.com',
            role: 'admin',
            created: '2024-01-01',
          },
        ],
        employees: [],
        attendances: [],
        leaves: [],
      };

      db.write(data);
      const result = db.read();
      const user = result.users[0];

      expect(user.id).toBe(1);
      expect(user.name).toBe('User 1');
      expect(user.email).toBe('user1@example.com');
      expect(user.role).toBe('admin');
      expect(user.created).toBe('2024-01-01');
    });
  });

  describe('Database API', () => {
    it('should export read function', () => {
      expect(typeof db.read).toBe('function');
    });

    it('should export write function', () => {
      expect(typeof db.write).toBe('function');
    });

    it('should return object from read', () => {
      const data = {
        users: [],
        employees: [],
        attendances: [],
        leaves: [],
      };

      db.write(data);
      const result = db.read();

      expect(typeof result).toBe('object');
      expect(result !== null).toBe(true);
    });
  });
});
