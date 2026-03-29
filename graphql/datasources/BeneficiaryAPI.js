/** Stub BeneficiaryAPI datasource */
module.exports = {
  getBeneficiaries: async () => [],
  getBeneficiaryById: async id => null,
  createBeneficiary: async input => ({ id: '1', ...input, status: 'ACTIVE', programs: [], sessions: [], createdAt: new Date() }),
  updateBeneficiary: async (id, input) => ({ id, ...input, status: 'ACTIVE', programs: [], sessions: [], createdAt: new Date() }),
  deleteBeneficiary: async id => true,
  getProgramsByBeneficiary: async id => [],
};
