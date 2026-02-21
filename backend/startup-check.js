#!/usr/bin/env node

/**
 * Backend Server Startup Diagnostics
 * Automatically checks and fixes common issues before starting
 */

const fs = require('fs');
const path = require('path');

console.log('\n📋 Backend Server Pre-flight Checks\n');

const checks = {
  success: [],
  warnings: [],
  errors: []
};

// 1. Check .env file
console.log('1. Checking .env file...');
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  checks.success.push('✅ .env file found');
  console.log('   ✅ .env file found');
} else {
  console.log('   ⚠️  .env file not found - using defaults');
  checks.warnings.push('.env file missing');
}

// 2. Check node_modules
console.log('\n2. Checking node_modules...');
const nodeModulesPath = path.join(__dirname, 'node_modules');
if (fs.existsSync(nodeModulesPath)) {
  checks.success.push('✅ node_modules installed');
  console.log('   ✅ node_modules installed');
} else {
  console.log('   ⚠️  node_modules not found - run: npm install');
  checks.warnings.push('node_modules missing - run npm install');
}

// 3. Check routes directory
console.log('\n3. Checking routes directory...');
const routesPath = path.join(__dirname, 'routes');
if (fs.existsSync(routesPath)) {
  const routeFiles = fs.readdirSync(routesPath).filter(f => f.endsWith('.js')).length;
  console.log(`   ✅ Routes directory found (${routeFiles} route files)`);
  checks.success.push(`✅ Routes directory with ${routeFiles} files`);
} else {
  console.log('   ❌ Routes directory not found!');
  checks.errors.push('Routes directory missing');
}

// 4. Check models directory
console.log('\n4. Checking models directory...');
const modelsPath = path.join(__dirname, 'models');
if (fs.existsSync(modelsPath)) {
  const modelFiles = fs.readdirSync(modelsPath).filter(f => f.endsWith('.js')).length;
  console.log(`   ✅ Models directory found (${modelFiles} model files)`);
  checks.success.push(`✅ Models directory with ${modelFiles} files`);
} else {
  console.log('   ⚠️  Models directory not found');
  checks.warnings.push('Models directory missing');
}

// 5. Check middleware directory
console.log('\n5. Checking middleware directory...');
const middlewarePath = path.join(__dirname, 'middleware');
if (fs.existsSync(middlewarePath)) {
  const middlewareFiles = fs.readdirSync(middlewarePath).filter(f => f.endsWith('.js')).length;
  console.log(`   ✅ Middleware directory found (${middlewareFiles} files)`);
  checks.success.push(`✅ Middleware directory with ${middlewareFiles} files`);
} else {
  console.log('   ⚠️  Middleware directory not found');
  checks.warnings.push('Middleware directory missing');
}

// 6. Check config directory
console.log('\n6. Checking config directory...');
const configPath = path.join(__dirname, 'config');
if (fs.existsSync(configPath)) {
  const configFiles = fs.readdirSync(configPath).filter(f => f.endsWith('.js')).length;
  console.log(`   ✅ Config directory found (${configFiles} config files)`);
  checks.success.push(`✅ Config directory with ${configFiles} files`);
} else {
  console.log('   ⚠️  Config directory not found');
  checks.warnings.push('Config directory missing');
}

// Summary
console.log('\n' + '='.repeat(50));
console.log('📊 DIAGNOSTICS SUMMARY\n');
console.log(`✅ Success: ${checks.success.length}`);
checks.success.forEach(s => console.log(`   ${s}`));

if (checks.warnings.length > 0) {
  console.log(`\n⚠️  Warnings: ${checks.warnings.length}`);
  checks.warnings.forEach(w => console.log(`   ${w}`));
}

if (checks.errors.length > 0) {
  console.log(`\n❌ Errors: ${checks.errors.length}`);
  checks.errors.forEach(e => console.log(`   ${e}`));
  console.log('\n⛔ Cannot start server - fix errors above');
  process.exit(1);
}

console.log('\n' + '='.repeat(50));
console.log('✅ Pre-flight checks passed!');
console.log('🚀 Starting backend server...\n');
console.log('='.repeat(50) + '\n');

// Now start the actual server
require('./server.js');
