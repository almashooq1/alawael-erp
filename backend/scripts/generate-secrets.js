#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════
 * Al-Awael ERP — Generate Secure Secrets
 * نظام الأوائل — توليد مفاتيح آمنة
 * ════════════════════════════════════════════════════════════════
 *
 * Usage:
 *   node scripts/generate-secrets.js           # Print new secrets
 *   node scripts/generate-secrets.js --apply   # Update .env file
 *   node scripts/generate-secrets.js --json    # Output as JSON
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const C = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

const args = process.argv.slice(2);
const applyToEnv = args.includes('--apply');
const jsonOutput = args.includes('--json');

// ─── Secret Generators ──────────────────────────────────────────────────────
function generateSecret(length = 64) {
  return crypto.randomBytes(length).toString('base64url').slice(0, length);
}

function generateHex(length = 32) {
  return crypto.randomBytes(length).toString('hex').slice(0, length);
}

// ─── Secrets to Generate ────────────────────────────────────────────────────
const secrets = {
  JWT_SECRET: generateSecret(64),
  JWT_REFRESH_SECRET: generateSecret(64),
  SESSION_SECRET: generateSecret(48),
  ENCRYPTION_KEY: generateHex(64),
};

// ─── JSON Output ────────────────────────────────────────────────────────────
if (jsonOutput) {
  console.log(JSON.stringify(secrets, null, 2));
  process.exit(0);
}

// ─── Print Secrets ──────────────────────────────────────────────────────────
console.log(`\n${C.bold}${C.cyan}🔐 Generated Secure Secrets${C.reset}\n`);
console.log(`${C.yellow}Copy these to your .env file:${C.reset}\n`);

for (const [key, value] of Object.entries(secrets)) {
  console.log(`${C.green}${key}${C.reset}=${value}`);
}

// ─── Apply to .env ──────────────────────────────────────────────────────────
if (applyToEnv) {
  const envPath = path.join(__dirname, '..', '.env');

  if (!fs.existsSync(envPath)) {
    const examplePath = path.join(__dirname, '..', '.env.example');
    if (fs.existsSync(examplePath)) {
      fs.copyFileSync(examplePath, envPath);
      console.log(`\n${C.cyan}ℹ️  Created .env from .env.example${C.reset}`);
    } else {
      console.log(`\n${C.red}❌ No .env or .env.example found${C.reset}`);
      process.exit(1);
    }
  }

  let envContent = fs.readFileSync(envPath, 'utf8');
  let updated = 0;

  for (const [key, value] of Object.entries(secrets)) {
    // Only replace if the current value is a placeholder/default
    const regex = new RegExp(`^(${key})=(.*)$`, 'm');
    const match = envContent.match(regex);

    if (match) {
      const currentVal = match[2];
      if (
        currentVal.includes('change-me') ||
        currentVal.includes('your-') ||
        currentVal.length < 16
      ) {
        envContent = envContent.replace(regex, `$1=${value}`);
        updated++;
        console.log(`  ${C.green}✅ Updated ${key}${C.reset}`);
      } else {
        console.log(`  ${C.yellow}⏭️  Skipped ${key} (already has a custom value)${C.reset}`);
      }
    } else {
      // Variable doesn't exist, append it
      envContent += `\n${key}=${value}`;
      updated++;
      console.log(`  ${C.green}➕ Added ${key}${C.reset}`);
    }
  }

  if (updated > 0) {
    fs.writeFileSync(envPath, envContent);
    console.log(`\n${C.green}${C.bold}✅ Updated ${updated} secret(s) in .env${C.reset}\n`);
  } else {
    console.log(`\n${C.yellow}No secrets needed updating.${C.reset}\n`);
  }
} else {
  console.log(
    `\n${C.cyan}Tip: Run with ${C.bold}--apply${C.reset}${C.cyan} to update .env automatically.${C.reset}\n`
  );
}
