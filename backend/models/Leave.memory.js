const db = require('../config/inMemoryDB');

class Leave {
  static async create(data) {
    try {
      const leaves = db.read().leaves || [];

      const newLeave = {
        _id: `leave_${Date.now()}`,
        ...data,
        status: data.status || 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      leaves.push(newLeave);
      db.write({ ...db.read(), leaves });

      return newLeave;
    } catch (error) {
      throw error;
    }
  }

  static async findById(id) {
    try {
      const leaves = db.read().leaves || [];
      return leaves.find(l => l._id === id) || null;
    } catch (error) {
      throw error;
    }
  }

  static async findByEmployeeId(employeeId) {
    try {
      const leaves = db.read().leaves || [];
      return leaves.filter(l => l.employeeId === employeeId);
    } catch (error) {
      throw error;
    }
  }

  static async findAll(filters = {}) {
    try {
      let leaves = db.read().leaves || [];

      if (filters.status) {
        leaves = leaves.filter(l => l.status === filters.status);
      }
      if (filters.employeeId) {
        leaves = leaves.filter(l => l.employeeId === filters.employeeId);
      }

      return leaves;
    } catch (error) {
      throw error;
    }
  }

  // Alias for compatibility
  static async find(filters = {}) {
    return this.findAll(filters);
  }

  static async updateStatus(id, status) {
    try {
      const leaves = db.read().leaves || [];
      const index = leaves.findIndex(l => l._id === id);

      if (index === -1) return null;

      leaves[index] = {
        ...leaves[index],
        status,
        updatedAt: new Date(),
      };

      db.write({ ...db.read(), leaves });
      return leaves[index];
    } catch (error) {
      throw error;
    }
  }

  static async deleteById(id) {
    try {
      const data = db.read();
      const leaves = data.leaves || [];
      const index = leaves.findIndex(l => l._id === id);

      if (index === -1) return false;

      leaves.splice(index, 1);
      db.write({ ...data, leaves });

      return true;
    } catch (error) {
      throw error;
    }
  }

  static async countByType(leaveType) {
    try {
      const leaves = db.read().leaves || [];
      return leaves.filter(l => l.leaveType === leaveType && l.status === 'approved').length;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Leave;
