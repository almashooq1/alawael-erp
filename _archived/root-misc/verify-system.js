#!/usr/bin/env node

/**
 * System Verification Script
 * Part of ERP System Fix Process
 */

const fs = require('fs');
const path = require('path');

console.log('\n');
console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║           🔍 SYSTEM VERIFICATION REPORT - FEB 24 2026          ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

let allGood = true;

// Check 1: Required Files
console.log('📋 CHECKING REQUIRED FILES...\n');
const requiredFiles = [
  'app.js',
  'server.js',
  'package.json',
  'routes/qiwa.routes.js',
  'routes/measurements.routes.js',
  'routes/migrations.js',
  'services/migration/MigrationManager.js',
  'config/database.js',
  'middleware/errorHandler.js'
];

const backendDir = path.join(__dirname, 'erp_new_system', 'backend');
requiredFiles.forEach(file => {
  const filePath = path.join(backendDir, file);
  if (fs.existsSync(filePath)) {
    console.log(`  ✅ ${file}`);
  } else {
    console.log(`  ❌ ${file} - MISSING`);
    allGood = false;
  }
});

// Check 2: Environment Files
console.log('\n🌍 CHECKING ENVIRONMENT FILES...\n');
const envFiles = [
  ['.env', 'Root environment'],
  ['erp_new_system/backend/.env', 'Backend environment'],
  ['.env.example', 'Environment template']
];

envFiles.forEach(([file, desc]) => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`  ✅ ${file} - ${desc}`);
  } else {
    console.log(`  ⚠️  ${file} - OPTIONAL`);
  }
});

// Check 3: Routes Count
console.log('\n🛣️  CHECKING ROUTES...\n');
const routesDir = path.join(backendDir, 'routes');
if (fs.existsSync(routesDir)) {
  const routeFiles = fs.readdirSync(routesDir).filter(f => f.endsWith('.js'));
  console.log(`  ✅ Total routes found: ${routeFiles.length}`);
  console.log('     Expected: 75+');
  if (routeFiles.length >= 60) {
    console.log('     Status: ✅ GOOD');
  } else {
    console.log('     Status: ⚠️  LOW');
  }
} else {
  console.log('  ❌ Routes directory not found');
  allGood = false;
}

// Check 4: Models Count
console.log('\n📦 CHECKING MODELS...\n');
const modelsDir = path.join(backendDir, 'models');
if (fs.existsSync(modelsDir)) {
  const modelFiles = fs.readdirSync(modelsDir).filter(f => f.endsWith('.js'));
  console.log(`  ✅ Total models found: ${modelFiles.length}`);
  console.log('     Expected: 40+');
  if (modelFiles.length >= 35) {
    console.log('     Status: ✅ GOOD');
  } else {
    console.log('     Status: ⚠️  LOW');
  }
} else {
  console.log('  ❌ Models directory not found');
  allGood = false;
}

// Check 5: Services Count
console.log('\n⚙️  CHECKING SERVICES...\n');
const servicesDir = path.join(backendDir, 'services');
if (fs.existsSync(servicesDir)) {
  const serviceFiles = fs.readdirSync(servicesDir).filter(f => f.endsWith('.js'));
  console.log(`  ✅ Total services found: ${serviceFiles.length}`);
  console.log('     Expected: 80+');
  if (serviceFiles.length >= 70) {
    console.log('     Status: ✅ GOOD');
  } else {
    console.log('     Status: ⚠️  LOW');
  }
} else {
  console.log('  ❌ Services directory not found');
  allGood = false;
}

// Check 6: Node Modules
console.log('\n📚 CHECKING DEPENDENCIES...\n');
const nodeModulesDir = path.join(backendDir, 'node_modules');
if (fs.existsSync(nodeModulesDir)) {
  console.log('  ✅ node_modules directory exists');
  console.log('     Status: ✅ npm packages installed');
} else {
  console.log('  ⚠️  node_modules not found');
  console.log(`     Action Required: Run 'npm install' in ${backendDir}`);
}

// Summary
console.log('\n');
console.log('╔════════════════════════════════════════════════════════════════╗');
if (allGood) {
  console.log('║                    ✅ ALL CHECKS PASSED                       ║');
  console.log('║              SYSTEM IS READY FOR TESTING                      ║');
} else {
  console.log('║                ⚠️  SOME ISSUES DETECTED                        ║');
  console.log('║            PLEASE FIX THEM BEFORE PROCEEDING                   ║');
}
console.log('╚════════════════════════════════════════════════════════════════╝\n');

// Recommendations
console.log('📌 NEXT STEPS:\n');
console.log('  1. cd erp_new_system/backend');
console.log('  2. npm install (if node_modules missing)');
console.log('  3. npm start');
console.log('  4. Test endpoints: curl http://localhost:3000/api/health\n');

process.exit(allGood ? 0 : 1);
