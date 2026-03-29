/** Stub DepartmentAPI datasource */
module.exports = {
  getDepartments: async () => [],
  getDepartmentById: async id => null,
  getDepartmentsByIds: async ids => [],
  createDepartment: async input => ({ id: '1', ...input, employees: [], createdAt: new Date() }),
  updateDepartment: async (id, input) => ({ id, ...input, employees: [], createdAt: new Date() }),
  deleteDepartment: async id => true,
};
