const Employee = require('../models/Employee.memory');
const db = require('../config/inMemoryDB');

describe('Employee Model', () => {
  beforeEach(() => {
    db.write({
      users: [],
      employees: [],
      attendances: [],
      leaves: [],
    });
  });

  describe('create', () => {
    it('should create a new employee', async () => {
      const emp = await Employee.create({
        fullName: 'أحمد محمد',
        email: 'ahmed@company.com',
        department: 'hr',
        position: 'مدير',
        salary: 5000,
      });

      expect(emp._id).toBeDefined();
      expect(emp.fullName).toBe('أحمد محمد');
      expect(emp.status).toBe('active');
      expect(emp.createdAt).toBeDefined();
    });
  });

  describe('findById', () => {
    it('should find employee by id', async () => {
      const created = await Employee.create({
        fullName: 'محمد علي',
        email: 'm.ali@company.com',
        department: 'it',
        position: 'مطور',
      });

      const found = await Employee.findById(created._id);
      expect(found).toBeDefined();
      expect(found.fullName).toBe('محمد علي');
    });

    it('should return null if not found', async () => {
      const found = await Employee.findById('nonexistent_id');
      expect(found).toBeNull();
    });
  });

  describe('findAll', () => {
    beforeEach(async () => {
      await Employee.create({
        fullName: 'علي أحمد',
        email: 'ali@company.com',
        department: 'hr',
        position: 'HR Manager',
      });
      await Employee.create({
        fullName: 'سارة خالد',
        email: 'sarah@company.com',
        department: 'finance',
        position: 'مراجع مالي',
      });
    });

    it('should find all employees', async () => {
      const employees = await Employee.findAll();
      expect(employees.length).toBe(2);
    });

    it('should filter by department', async () => {
      const employees = await Employee.findAll({ department: 'hr' });
      expect(employees.length).toBe(1);
      expect(employees[0].department).toBe('hr');
    });
  });

  describe('updateById', () => {
    it('should update employee', async () => {
      const emp = await Employee.create({
        fullName: 'الموظف الأول',
        email: 'emp1@company.com',
        department: 'it',
        position: 'مطور',
      });

      const updated = await Employee.updateById(emp._id, {
        position: 'رئيس فريق',
        salary: 6000,
      });

      expect(updated.position).toBe('رئيس فريق');
      expect(updated.salary).toBe(6000);
      expect(updated._id).toBe(emp._id);
    });
  });

  describe('deleteById', () => {
    it('should delete employee', async () => {
      const emp = await Employee.create({
        fullName: 'سيتم حذفه',
        email: 'delete@company.com',
        department: 'it',
        position: 'مطور',
      });

      const deleted = await Employee.deleteById(emp._id);
      expect(deleted).toBe(true);

      const found = await Employee.findById(emp._id);
      expect(found).toBeNull();
    });
  });

  describe('getTotalCount', () => {
    beforeEach(async () => {
      await Employee.create({
        fullName: 'نشط 1',
        email: 'active1@company.com',
        department: 'hr',
        position: 'Manager',
        status: 'active',
      });
      await Employee.create({
        fullName: 'غير نشط',
        email: 'inactive@company.com',
        department: 'it',
        position: 'Developer',
        status: 'inactive',
      });
    });

    it('should get total count by status', async () => {
      const stats = await Employee.getTotalCount();
      expect(stats.total).toBe(2);
      expect(stats.active).toBe(1);
      expect(stats.inactive).toBe(1);
    });
  });
});
