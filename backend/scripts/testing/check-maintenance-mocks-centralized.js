const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..', '..');

const targetFiles = [];

const mustContainPatterns = [
  /maintenanceMockFactories/,
  /maintenanceMockSeeder/,
  /reseedMaintenanceServiceMocks\(/,
];

const forbiddenInlinePatterns = [
  /jest\.mock\('\.\.\/models\/Vehicle'\s*,\s*\(\)\s*=>\s*\(\{/,
  /jest\.mock\('\.\.\/models\/MaintenanceSchedule'\s*,\s*\(\)\s*=>\s*\{/,
  /jest\.mock\('\.\.\/services\/advancedMaintenanceService'\s*,\s*\(\)\s*=>\s*\(\{/,
  /const\s+reseedMaintenanceServiceMocks\s*=\s*\(\)\s*=>\s*\{/,
];

let hasErrors = false;

for (const filePath of targetFiles) {
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Missing expected file: ${path.relative(rootDir, filePath)}`);
    hasErrors = true;
    continue;
  }

  const content = fs.readFileSync(filePath, 'utf8');

  for (const rule of mustContainPatterns) {
    if (!rule.test(content)) {
      console.error(
        `❌ Missing required shared helper usage in ${path.relative(rootDir, filePath)} (pattern: ${rule})`
      );
      hasErrors = true;
    }
  }

  for (const rule of forbiddenInlinePatterns) {
    if (rule.test(content)) {
      console.error(
        `❌ Found forbidden inline mock block in ${path.relative(rootDir, filePath)} (pattern: ${rule})`
      );
      hasErrors = true;
    }
  }
}

if (hasErrors) {
  console.error('\nMaintenance mock centralization check failed.');
  process.exit(1);
}

console.log('✅ Maintenance mock centralization check passed.');
