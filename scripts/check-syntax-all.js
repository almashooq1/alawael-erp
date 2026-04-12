'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const dirs = [
  { dir: 'backend/models', pattern: /^Ddd.*\.js$/ },
  { dir: 'backend/routes', pattern: /^ddd-.*\.routes\.js$/ },
  { dir: 'backend/routes', pattern: /^platform\.routes\.js$/ },
  { dir: 'backend/routes', pattern: /^_registry\.js$/ },
  { dir: 'backend/routes/registries', pattern: /\.js$/ },
  { dir: 'backend/services', pattern: /^ddd.*\.js$/ },
];

const results = { ok: [], broken: [] };

for (const { dir, pattern } of dirs) {
  const fullDir = path.join(root, dir);
  if (!fs.existsSync(fullDir)) continue;
  const files = fs.readdirSync(fullDir).filter(f => pattern.test(f));
  for (const f of files) {
    const fp = path.join(fullDir, f);
    try {
      const code = fs.readFileSync(fp, 'utf8');
      new vm.Script(code, { filename: f });
      results.ok.push(dir + '/' + f);
    } catch (e) {
      results.broken.push({ file: dir + '/' + f, error: e.message.split('\n')[0] });
    }
  }
}

console.log('=== SYNTAX CHECK RESULTS ===');
console.log('OK: ' + results.ok.length);
console.log('BROKEN: ' + results.broken.length);
if (results.broken.length > 0) {
  console.log('--- BROKEN FILES ---');
  results.broken.forEach(b => console.log('  ' + b.file + ' -> ' + b.error));
}
console.log('=== DONE ===');
