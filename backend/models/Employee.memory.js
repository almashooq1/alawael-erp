const db = require('../config/inMemoryDB');

class Employee {
  static async create(data) {
    try {
      const employees = db.read().employees || [];

      const newEmployee = {
        _id: `emp_${Date.now()}`,
        ...data,
        status: data.status || 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      employees.push(newEmployee);
      db.write({ ...db.read(), employees });

      return newEmployee;
    } catch (error) {
      throw error;
    }
  }

  static async findById(id) {
    try {
      const employees = db.read().employees || [];
      return employees.find(e => e._id === id) || null;
    } catch (error) {
      throw error;
    }
  }

  static async findAll(filters = {}) {
    try {
      let employees = db.read().employees || [];

      if (filters.department) {
        employees = employees.filter(e => e.department === filters.department);
      }
      if (filters.status) {
        employees = employees.filter(e => e.status === filters.status);
      }
      if (filters.search) {
        const search = filters.search.toLowerCase();
        employees = employees.filter(
          e => e.fullName?.toLowerCase().includes(search) || e.email?.toLowerCase().includes(search) || e.nationalId?.includes(search),
        );
      }

      return employees;
    } catch (error) {
      throw error;
    }
  }

  // Alias for compatibility with AI routes
  static async find(filters = {}) {
    return this.findAll(filters);
  }

  static async findByEmail(email) {
    try {
      const employees = db.read().employees || [];
      return employees.find(e => e.email === email) || null;
    } catch (error) {
      throw error;
    }
  }

  static async updateById(id, data) {
    try {
      const employees = db.read().employees || [];
      const index = employees.findIndex(e => e._id === id);

      if (index === -1) return null;

      employees[index] = {
        ...employees[index],
        ...data,
        updatedAt: new Date(),
      };

      db.write({ ...db.read(), employees });
      return employees[index];
    } catch (error) {
      throw error;
    }
  }

  static async deleteById(id) {
    try {
      const data = db.read();
      const employees = data.employees || [];
      const index = employees.findIndex(e => e._id === id);

      if (index === -1) return false;

      employees.splice(index, 1);
      db.write({ ...data, employees });

      return true;
    } catch (error) {
      throw error;
    }
  }

  static async countByDepartment(department) {
    try {
      const employees = db.read().employees || [];
      return employees.filter(e => e.department === department && e.status === 'active').length;
    } catch (error) {
      throw error;
    }
  }

  static async getTotalCount() {
    try {
      const employees = db.read().employees || [];
      return {
        total: employees.length,
        active: employees.filter(e => e.status === 'active').length,
        inactive: employees.filter(e => e.status === 'inactive').length,
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Employee;
