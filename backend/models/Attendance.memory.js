const db = require('../config/inMemoryDB');

class Attendance {
  static async create(data) {
    try {
      const attendances = db.read().attendances || [];

      const newAttendance = {
        _id: `att_${Date.now()}`,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      attendances.push(newAttendance);
      db.write({ ...db.read(), attendances });

      return newAttendance;
    } catch (error) {
      throw error;
    }
  }

  static async findByEmployeeAndDate(employeeId, date) {
    try {
      const attendances = db.read().attendances || [];
      const dateStr = new Date(date).toISOString().split('T')[0];

      return attendances.find(a => a.employeeId === employeeId && new Date(a.date).toISOString().split('T')[0] === dateStr) || null;
    } catch (error) {
      throw error;
    }
  }

  static async find(query = {}) {
    try {
      const attendances = db.read().attendances || [];
      return attendances;
    } catch (error) {
      throw error;
    }
  }

  static async findByEmployeeRange(employeeId, startDate, endDate) {
    try {
      const attendances = db.read().attendances || [];
      const start = new Date(startDate);
      const end = new Date(endDate);

      return attendances.filter(a => a.employeeId === employeeId && new Date(a.date) >= start && new Date(a.date) <= end);
    } catch (error) {
      throw error;
    }
  }

  static async getStatsByEmployee(employeeId, month) {
    try {
      const year = new Date().getFullYear();
      const start = new Date(year, month, 1);
      const end = new Date(year, month + 1, 0);

      const attendances = await this.findByEmployeeRange(employeeId, start, end);

      return {
        present: attendances.filter(a => a.status === 'present').length,
        absent: attendances.filter(a => a.status === 'absent').length,
        late: attendances.filter(a => a.status === 'late').length,
        half_day: attendances.filter(a => a.status === 'half_day').length,
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Attendance;
