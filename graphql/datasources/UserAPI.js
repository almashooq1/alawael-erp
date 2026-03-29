/** Stub UserAPI datasource */
module.exports = {
  getUsers: async () => ({ edges: [], pageInfo: { hasNextPage: false, hasPreviousPage: false }, totalCount: 0 }),
  getUserById: async id => null,
  getUsersByIds: async ids => [],
  getUsersByDepartment: async departmentId => [],
  createUser: async input => ({ id: '1', ...input, status: 'ACTIVE', createdAt: new Date(), updatedAt: new Date() }),
  updateUser: async (id, input) => ({ id, ...input, status: 'ACTIVE', createdAt: new Date(), updatedAt: new Date() }),
  deleteUser: async id => true,
};
