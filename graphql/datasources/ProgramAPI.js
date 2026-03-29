/** Stub ProgramAPI datasource */
module.exports = {
  getPrograms: async () => [],
  getProgramById: async id => null,
  getProgramsByBeneficiary: async id => [],
  createProgram: async input => ({ id: '1', ...input, status: 'ACTIVE', beneficiaries: [], sessions: [], createdAt: new Date() }),
  updateProgram: async (id, input) => ({ id, ...input, status: 'ACTIVE', beneficiaries: [], sessions: [], createdAt: new Date() }),
  deleteProgram: async id => true,
};
