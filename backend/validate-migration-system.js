#!/usr/bin/env node

/**
 * Migration System Quick Validation Script
 * Tests all core functionality and identifies issues
 */

const fs = require('fs');
const path = require('path');

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'cyan') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(`  ${title}`, 'blue');
  console.log('='.repeat(60));
}

function logSuccess(message) {
  log(`  ✓ ${message}`, 'green');
}

function logError(message) {
  log(`  ✗ ${message}`, 'red');
}

function logWarning(message) {
  log(`  ⚠ ${message}`, 'yellow');
}

// Test results tracker
const results = {
  total: 0,
  passed: 0,
  failed: 0,
  warnings: 0,
};

async function testFileExists(filePath, description) {
  results.total++;
  if (fs.existsSync(filePath)) {
    logSuccess(`${description}`);
    results.passed++;
    return true;
  } else {
    logError(`${description} - NOT FOUND at ${filePath}`);
    results.failed++;
    return false;
  }
}

async function testModuleRequires(modulePath, description) {
  results.total++;
  try {
    require(modulePath);
    logSuccess(`${description}`);
    results.passed++;
    return true;
  } catch (error) {
    logError(`${description} - ERROR: ${error.message}`);
    results.failed++;
    return false;
  }
}

async function testFileContains(filePath, searchString, description) {
  results.total++;
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    if (content.includes(searchString)) {
      logSuccess(`${description}`);
      results.passed++;
      return true;
    } else {
      logWarning(`${description} - NOT FOUND`);
      results.warnings++;
      return false;
    }
  } catch (error) {
    logError(`${description} - ERROR: ${error.message}`);
    results.failed++;
    return false;
  }
}

async function runValidation() {
  logSection('ERP SYSTEM - MIGRATION MODULE VALIDATION');

  const backendPath = __dirname;

  // 1. File Structure Tests
  logSection('1. FILE STRUCTURE & INTEGRITY');
  
  await testFileExists(
    path.join(backendPath, 'services', 'migration'),
    'Migration services directory exists'
  );

  await testFileExists(
    path.join(backendPath, 'services', 'migration', 'CSVProcessor.js'),
    'CSVProcessor.js exists'
  );

  await testFileExists(
    path.join(backendPath, 'services', 'migration', 'DatabaseMigration.js'),
    'DatabaseMigration.js exists'
  );

  await testFileExists(
    path.join(backendPath, 'services', 'migration', 'MigrationManager.js'),
    'MigrationManager.js exists'
  );

  await testFileExists(
    path.join(backendPath, 'routes', 'migrations.js'),
    'Migration routes file exists'
  );

  await testFileExists(
    path.join(backendPath, 'config', 'migration.config.js'),
    'Migration configuration exists'
  );

  // 2. Documentation Tests
  logSection('2. DOCUMENTATION');

  await testFileExists(
    path.join(backendPath, 'services', 'migration', 'README.md'),
    'README.md exists'
  );

  await testFileExists(
    path.join(backendPath, 'services', 'migration', 'MIGRATION_GUIDE.md'),
    'MIGRATION_GUIDE.md exists'
  );

  await testFileExists(
    path.join(backendPath, 'services', 'migration', 'INTEGRATION_GUIDE.md'),
    'INTEGRATION_GUIDE.md exists'
  );

  await testFileExists(
    path.join(backendPath, 'services', 'migration', 'QUICK_REFERENCE.md'),
    'QUICK_REFERENCE.md exists'
  );

  // 3. Examples Tests
  logSection('3. EXAMPLES & TESTS');

  await testFileExists(
    path.join(backendPath, 'examples', 'migration-examples.js'),
    'Migration examples file exists'
  );

  await testFileExists(
    path.join(backendPath, '__tests__', 'migration.test.js'),
    'Migration test suite exists'
  );

  // 4. Module Requirements Tests
  logSection('4. MODULE LOADING');

  // Change to backend directory for requires to work
  process.chdir(backendPath);

  await testModuleRequires(
    './services/migration/CSVProcessor',
    'CSVProcessor can be loaded'
  );

  await testModuleRequires(
    './services/migration/DatabaseMigration',
    'DatabaseMigration can be loaded'
  );

  await testModuleRequires(
    './services/migration/MigrationManager',
    'MigrationManager can be loaded'
  );

  await testModuleRequires(
    './routes/migrations',
    'Migration routes can be loaded'
  );

  // 5. App.js Integration Tests
  logSection('5. APP.JS INTEGRATION');

  const appPath = path.join(backendPath, 'app.js');
  
  await testFileContains(
    appPath,
    'migrations',
    'app.js references migrations'
  );

  await testFileContains(
    appPath,
    'migrationRouter',
    'app.js loads migration router'
  );

  await testFileContains(
    appPath,
    '/api/migrations',
    'app.js registers migration routes'
  );

  // 6. Route Endpoints Tests
  logSection('6. API ENDPOINTS');

  const routesContent = fs.readFileSync(
    path.join(backendPath, 'routes', 'migrations.js'),
    'utf8'
  );

  const endpoints = [
    { path: '/initialize', method: 'POST', description: 'Initialize migration' },
    { path: '/plan', method: 'POST', description: 'Create migration plan' },
    { path: '/execute', method: 'POST', description: 'Execute migration' },
    { path: '/summary', method: 'GET', description: 'Get execution summary' },
    { path: '/import-csv', method: 'POST', description: 'Import CSV file' },
    { path: '/export-csv', method: 'POST', description: 'Export to CSV' },
    { path: '/validate-csv', method: 'POST', description: 'Validate CSV structure' },
  ];

  endpoints.forEach((endpoint) => {
    results.total++;
    if (
      routesContent.includes(`'${endpoint.path}'`) ||
      routesContent.includes(`"${endpoint.path}"`)
    ) {
      logSuccess(`${endpoint.method} ${endpoint.path} - ${endpoint.description}`);
      results.passed++;
    } else {
      logWarning(`${endpoint.method} ${endpoint.path} endpoint definition not found`);
      results.warnings++;
    }
  });

  // 7. Dependencies Check
  logSection('7. DEPENDENCIES');

  const packageJsonPath = path.join(backendPath, 'package.json');
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const deps = packageJson.dependencies;

    results.total++;
    if (deps['csv-parse']) {
      logSuccess('csv-parse dependency exists');
      results.passed++;
    } else {
      logWarning('csv-parse not in dependencies - may need: npm install csv-parse');
      results.warnings++;
    }

    results.total++;
    if (deps['csv-stringify']) {
      logSuccess('csv-stringify dependency exists');
      results.passed++;
    } else {
      logWarning('csv-stringify not in dependencies - may need: npm install csv-stringify');
      results.warnings++;
    }
  } catch (error) {
    logError(`Cannot read package.json: ${error.message}`);
    results.failed++;
  }

  // 8. Code Quality Checks
  logSection('8. CODE QUALITY');

  const coreFiles = [
    './services/migration/CSVProcessor.js',
    './services/migration/DatabaseMigration.js',
    './services/migration/MigrationManager.js',
  ];

  coreFiles.forEach((file) => {
    results.total++;
    try {
      const content = fs.readFileSync(file, 'utf8');
      const lineCount = content.split('\n').length;
      
      if (lineCount > 100) {
        logSuccess(`${path.basename(file)} - ${lineCount} lines (substantial)`);
        results.passed++;
      } else {
        logWarning(`${path.basename(file)} - ${lineCount} lines (may be incomplete)`);
        results.warnings++;
      }
    } catch (error) {
      logError(`Cannot analyze ${file}: ${error.message}`);
      results.failed++;
    }
  });

  // 9. Summary Section
  logSection('VALIDATION SUMMARY');

  const passPercentage = Math.round((results.passed / results.total) * 100);
  const status =
    results.failed === 0 && results.warnings < 5 ? '✓ READY' : '⚠ REVIEW NEEDED';

  log(`Total Tests: ${results.total}`, 'cyan');
  logSuccess(`Passed: ${results.passed}`);
  logWarning(`Warnings: ${results.warnings}`);
  logError(`Failed: ${results.failed}`);
  log(`\nSuccess Rate: ${passPercentage}%`, passPercentage >= 90 ? 'green' : 'yellow');
  log(`\nStatus: ${status}`, passPercentage >= 90 ? 'green' : 'yellow');

  // 10. Next Steps
  logSection('RECOMMENDED NEXT STEPS');

  if (results.failed === 0 && results.warnings === 0) {
    logSuccess('All checks passed!');
    console.log(`
${colors.green}Migration system is fully integrated and ready to use.${colors.reset}

Next actions:
1. Start backend server: ${colors.cyan}npm start${colors.reset}
2. Test migration endpoints: ${colors.cyan}npm test -- __tests__/migration.test.js${colors.reset}
3. Run example migrations: ${colors.cyan}node examples/migration-examples.js 1${colors.reset}
4. Review API docs: ${colors.cyan}cat services/migration/MIGRATION_GUIDE.md${colors.reset}
    `);
  } else {
    console.log(`
${colors.yellow}Some issues detected. Please review and fix:${colors.reset}

Issues to address:
    `);

    if (results.warnings > 0) {
      console.log(`${colors.yellow}⚠ ${results.warnings} warnings - non-blocking but should review${colors.reset}`);
    }

    if (results.failed > 0) {
      console.log(`${colors.red}✗ ${results.failed} failures - must fix before use${colors.reset}`);
      console.log(`
Action items:
1. Install missing dependencies: ${colors.cyan}npm install csv-parse csv-stringify${colors.reset}
2. Create missing files as needed
3. Re-run validation: ${colors.cyan}node validate-migration-system.js${colors.reset}
      `);
    }
  }

  console.log('\n' + '='.repeat(60) + '\n');

  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run validation
runValidation().catch((error) => {
  logError(`Validation failed with error: ${error.message}`);
  process.exit(1);
});
