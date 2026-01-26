#!/usr/bin/env node
/**
 * Pre-Deployment Configuration Validator
 *
 * Validates that all required environment variables are set
 * and no placeholder values remain before production deployment.
 *
 * Usage: node validate-env.js [env-file]
 */

const fs = require('fs');
const path = require('path');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

// Critical variables that must be set
const CRITICAL_VARS = [
  'MONGODB_URI',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'FRONTEND_URL',
  'CORS_ORIGIN',
];

// Optional but recommended variables
const RECOMMENDED_VARS = [
  'GOV_CLIENT_ID',
  'GOV_CLIENT_SECRET',
  'INSURANCE_API_KEY',
  'LAB_API_KEY',
  'STRIPE_SECRET_KEY',
  'EMAIL_USER',
  'EMAIL_PASSWORD',
];

// Placeholder patterns that indicate incomplete configuration
const PLACEHOLDER_PATTERNS = [
  /your_/i,
  /replace_with/i,
  /change_this/i,
  /change-me/i,
  /username:password/i,
  /yourdomain\.com/i,
  /<username>/i,
  /<password>/i,
  /<cluster>/i,
];

// Development flags that must be false in production
const PRODUCTION_FLAGS = {
  NODE_ENV: 'production',
  USE_MOCK_DB: 'false',
  SEED_DATABASE: 'false',
  MOCK_EXTERNAL_APIS: 'false',
  ALLOW_TEST_ENDPOINTS: 'false',
};

function parseEnvFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const env = {};

  content.split('\n').forEach((line, idx) => {
    line = line.trim();
    // Skip comments and empty lines
    if (!line || line.startsWith('#')) return;

    const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (match) {
      const key = match[1];
      const value = match[2].trim();
      env[key] = value;
    }
  });

  return env;
}

function hasPlaceholder(value) {
  return PLACEHOLDER_PATTERNS.some(pattern => pattern.test(value));
}

function validateConfiguration(envFile) {
  console.log(
    `${colors.bold}${colors.cyan}🔍 Validating configuration: ${envFile}${colors.reset}\n`
  );

  if (!fs.existsSync(envFile)) {
    console.log(`${colors.red}❌ Error: File not found: ${envFile}${colors.reset}`);
    return false;
  }

  const env = parseEnvFile(envFile);
  let hasErrors = false;
  let hasWarnings = false;

  // Check critical variables
  console.log(`${colors.bold}Critical Variables:${colors.reset}`);
  CRITICAL_VARS.forEach(varName => {
    const value = env[varName];
    if (!value) {
      console.log(`  ${colors.red}❌ ${varName}: NOT SET${colors.reset}`);
      hasErrors = true;
    } else if (hasPlaceholder(value)) {
      console.log(`  ${colors.red}❌ ${varName}: Contains placeholder value${colors.reset}`);
      hasErrors = true;
    } else if (value.length < 16 && varName.includes('SECRET')) {
      console.log(
        `  ${colors.yellow}⚠️  ${varName}: Too short (minimum 32 chars recommended)${colors.reset}`
      );
      hasWarnings = true;
    } else {
      console.log(`  ${colors.green}✅ ${varName}: OK${colors.reset}`);
    }
  });

  // Check production flags
  console.log(`\n${colors.bold}Production Flags:${colors.reset}`);
  Object.entries(PRODUCTION_FLAGS).forEach(([varName, expectedValue]) => {
    const value = env[varName];
    if (!value) {
      console.log(
        `  ${colors.yellow}⚠️  ${varName}: NOT SET (expected: ${expectedValue})${colors.reset}`
      );
      hasWarnings = true;
    } else if (value.toLowerCase() !== expectedValue.toLowerCase()) {
      console.log(
        `  ${colors.red}❌ ${varName}: ${value} (expected: ${expectedValue})${colors.reset}`
      );
      hasErrors = true;
    } else {
      console.log(`  ${colors.green}✅ ${varName}: ${value}${colors.reset}`);
    }
  });

  // Check recommended variables
  console.log(`\n${colors.bold}Recommended Variables:${colors.reset}`);
  RECOMMENDED_VARS.forEach(varName => {
    const value = env[varName];
    if (!value || value === '') {
      console.log(
        `  ${colors.yellow}⚠️  ${varName}: NOT SET (optional but recommended)${colors.reset}`
      );
      hasWarnings = true;
    } else if (hasPlaceholder(value)) {
      console.log(`  ${colors.yellow}⚠️  ${varName}: Contains placeholder value${colors.reset}`);
      hasWarnings = true;
    } else {
      console.log(`  ${colors.green}✅ ${varName}: OK${colors.reset}`);
    }
  });

  // Summary
  console.log(`\n${colors.bold}${'='.repeat(60)}${colors.reset}`);
  if (hasErrors) {
    console.log(
      `${colors.red}${colors.bold}❌ VALIDATION FAILED - Cannot deploy to production${colors.reset}`
    );
    console.log(`${colors.red}Please fix all critical errors before deployment.${colors.reset}\n`);
    return false;
  } else if (hasWarnings) {
    console.log(`${colors.yellow}${colors.bold}⚠️  VALIDATION PASSED WITH WARNINGS${colors.reset}`);
    console.log(
      `${colors.yellow}Review warnings - some features may not work correctly.${colors.reset}\n`
    );
    return true;
  } else {
    console.log(
      `${colors.green}${colors.bold}✅ VALIDATION PASSED - Ready for production deployment${colors.reset}\n`
    );
    return true;
  }
}

// Main execution
const envFile = process.argv[2] || path.join(__dirname, '.env');
const isValid = validateConfiguration(envFile);
process.exit(isValid ? 0 : 1);
