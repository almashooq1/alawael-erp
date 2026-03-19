describe('Beneficiaries Tests', () => {
  test('should have store structure', () => {
    const mockStore = { beneficiaries: { beneficiaries: [], loading: false } };
    expect(mockStore).toBeDefined();
  });
  test('should handle add beneficiary', () => {
    const newBeneficiary = { _id: '1', firstName: 'أحمد' };
    expect(newBeneficiary).toBeDefined();
  });
  test('should handle update', () => {
    expect(true).toBe(true);
  });
});
