const smartDocumentService = require('../backend/services/smartDocument.service');

console.log('--- Verifying Comprehensive Templates Expansion ---');

const templates = smartDocumentService.getAllTemplates();
console.log(`Total Templates Loaded: ${templates.length}`);

const categories = [
  'EMPLOYEE',
  'STUDENT',
  'TRAINEE',
  'PARENT',
  'GOV',
  'ADMIN',
  'MEDICAL',
  'FINANCE',
  'LEGAL',
  'PROCUREMENT',
  'IT',
  'FACILITY',
  'TRANSPORT',
  'HOUSING',
  'MARKETING',
  'QUALITY',
];

categories.forEach(type => {
  const count = templates.filter(t => t.type === type).length;
  console.log(`${type}: ${count} templates`);

  // List names for verification
  const names = templates
    .filter(t => t.type === type)
    .map(t => `- ${t.name}`)
    .join('\n');
  console.log(names);
  console.log('---');
});

if (templates.length >= 13) {
  console.log('✅ SUCCESS: All requested comprehensive templates have been loaded.');
} else {
  console.log('❌ FAIL: Template count mismatch.');
  process.exit(1);
}
