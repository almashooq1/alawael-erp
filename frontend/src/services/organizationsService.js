// Mock service for organizations
const organizations = [
  { id: 'org1', name: 'المؤسسة الأولى' },
  { id: 'org2', name: 'المؤسسة الثانية' },
  { id: 'org3', name: 'المؤسسة الثالثة' },
];

export function fetchOrganizations() {
  // Simulate async fetch
  return Promise.resolve(organizations);
}

export function getOrganizationById(id) {
  return organizations.find(org => org.id === id);
}
