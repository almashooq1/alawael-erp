// Mock service for branches
const branches = [
  { id: 'branch1', name: 'الفرع الرئيسي', organizationId: 'org1' },
  { id: 'branch2', name: 'فرع الرياض', organizationId: 'org1' },
  { id: 'branch3', name: 'فرع جدة', organizationId: 'org2' },
  { id: 'branch4', name: 'فرع الدمام', organizationId: 'org3' }
];

export function fetchBranches(organizationId) {
  // Simulate async fetch, filter by org
  return Promise.resolve(
    branches.filter(branch => branch.organizationId === organizationId)
  );
}

export function getBranchById(id) {
  return branches.find(branch => branch.id === id);
}
