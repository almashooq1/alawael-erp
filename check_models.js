const fs = require('fs');

const filesToCheck = [
  'backend/models/DisabilityProgram.js',
  'backend/models/DisabilitySession.js',
  'backend/models/Goal.js',
  'backend/models/disability-rehabilitation.model.js',
  'backend/models/rehabilitation/Program.js',
  'backend/models/rehabilitation/ProgramEnrollment.js',
  'backend/models/rehabilitation/RehabPlan.js',
  'backend/models/rehabilitation/RehabSession.js',
];

const modelNames = {};

filesToCheck.forEach(f => {
  if (!fs.existsSync(f)) {
    process.stdout.write('MISSING: ' + f + '\n');
    return;
  }
  const content = fs.readFileSync(f, 'utf8');
  const matches = [...content.matchAll(/mongoose\.model\s*\(\s*['"]([^'"]+)['"]/g)].map(m => m[1]);
  const short = f.replace('backend/models/', '');
  process.stdout.write(short + ': ' + (matches.length ? matches.join(', ') : '(no mongoose.model)') + '\n');
  matches.forEach(n => {
    if (!modelNames[n]) modelNames[n] = [];
    modelNames[n].push(short);
  });
});

process.stdout.write('\n=== Duplicate Model Names ===\n');
let found = false;
Object.entries(modelNames).forEach(([name, files]) => {
  if (files.length > 1) {
    found = true;
    process.stdout.write('DUPLICATE: ' + name + '\n');
    files.forEach(f => process.stdout.write('  - ' + f + '\n'));
  }
});
if (!found) process.stdout.write('OK - No duplicate model names\n');
