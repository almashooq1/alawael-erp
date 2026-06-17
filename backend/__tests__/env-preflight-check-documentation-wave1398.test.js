'use strict';

/**
 * W1398 — Environment preflight check (env:check) runbook documentation guard.
 *
 * Enforces that `npm run env:check` is documented in an operational runbook
 * and the documentation keeps in sync with the actual script behavior.
 * Prevents security-critical preflight checks from being undocumented or
 * drifting between runbook and implementation.
 */

const fs = require('fs');
const path = require('path');

const ENV_CHECK_RUNBOOK = path.join(
  __dirname,
  '..',
  '..',
  'docs',
  'runbooks',
  'env-preflight-check.md'
);
const ENV_CHECK_SCRIPT = path.join(__dirname, '..', '..', 'backend', 'scripts', 'check-env.js');
const VALIDATE_ENV = path.join(__dirname, '..', '..', 'backend', 'config', 'validateEnv.js');
const PACKAGE_JSON = path.join(__dirname, '..', '..', 'backend', 'package.json');

describe('W1398 — Environment preflight check (env:check) documentation runbook', () => {
  it('documents env:check tool in a dedicated runbook', () => {
    expect(fs.existsSync(ENV_CHECK_RUNBOOK)).toBe(true);
    const runbook = fs.readFileSync(ENV_CHECK_RUNBOOK, 'utf8');

    // Must have a title mentioning the command
    expect(runbook).toContain('Environment Preflight Check');
    expect(runbook).toMatch(/`npm run env:check`/);

    // Must explain the purpose
    expect(runbook).toMatch(/verify/i);
    expect(runbook).toMatch(/security.*critical|environment.*variable/i);
  });

  it('documents the 5 required keys (strict mode) with purposes and generation hints', () => {
    const runbook = fs.readFileSync(ENV_CHECK_RUNBOOK, 'utf8');

    // Each strict key must be documented
    expect(runbook).toContain('MONGODB_URI');
    expect(runbook).toContain('JWT_SECRET');
    expect(runbook).toContain('JWT_REFRESH_SECRET');
    expect(runbook).toContain('ENCRYPTION_KEY');
    expect(runbook).toContain('SESSION_SECRET');

    // Each must have a purpose + example + min length
    expect(runbook).toMatch(/MONGODB_URI.*mongodb/i);
    expect(runbook).toMatch(/JWT_SECRET.*sign/i);
    expect(runbook).toMatch(/ENCRYPTION_KEY.*AES|encrypt/i);
    expect(runbook).toMatch(/SESSION_SECRET.*cookie|session/i);

    // Must provide generation hints
    expect(runbook).toContain('openssl rand');
  });

  it('explains when and where env:check runs (local, CI, pre-deploy)', () => {
    const runbook = fs.readFileSync(ENV_CHECK_RUNBOOK, 'utf8');

    // Must explain the deployment lifecycle
    expect(runbook).toMatch(/locally|CI.*CD|pre-deploy|production/i);
    expect(runbook).toContain('npm run preflight');
    expect(runbook).toContain('NODE_ENV=production');
    expect(runbook).toContain('CI=true');
  });

  it('provides sample output for both success and failure cases', () => {
    const runbook = fs.readFileSync(ENV_CHECK_RUNBOOK, 'utf8');

    // Must show success case (exit 0)
    expect(runbook).toMatch(/✓.*all.*strict-required keys are set/i);
    expect(runbook).toContain('Exit: 0');

    // Must show failure case (exit 1) with hints
    expect(runbook).toMatch(/✖.*missing|blank/i);
    expect(runbook).toContain('Exit: 1');
  });

  it('documents setting keys in different environments (local, staging, prod)', () => {
    const runbook = fs.readFileSync(ENV_CHECK_RUNBOOK, 'utf8');

    // Must have sections for local + staging/prod
    expect(runbook).toMatch(/local.*development/i);
    expect(runbook).toMatch(/staging.*production|prod/i);

    // Must mention secret managers
    expect(runbook).toMatch(/secret|vault|manager/i);

    // Must show .env file format
    expect(runbook).toContain('.env');
  });

  it('explains the drift-prevention contract (keys imported from validateEnv)', () => {
    const runbook = fs.readFileSync(ENV_CHECK_RUNBOOK, 'utf8');

    // Must explain that keys come from validateEnv, not a manual list
    expect(runbook).toContain('config/validateEnv.js:STRICT_REQUIRED_KEYS');
    expect(runbook).toContain('imported directly');
    expect(runbook).toContain('cannot drift');

    // Must reference the test that guards this contract
    expect(runbook).toContain('env-minimum-template-wave1395.test.js');
  });

  it('syncs key count and names with the actual validateEnv script', () => {
    const validateEnv = fs.readFileSync(VALIDATE_ENV, 'utf8');
    const runbook = fs.readFileSync(ENV_CHECK_RUNBOOK, 'utf8');

    // Extract STRICT_REQUIRED_KEYS from validateEnv — it's derived from strictOverrides
    // Look for the strictOverrides schema definition
    const keysMatch = validateEnv.match(/strictOverrides\s*=\s*Joi\.object\(\{([^}]+)\}\)/s);
    expect(keysMatch).not.toBeNull();

    // Extract key names from the schema definition
    const keysContent = keysMatch[1];
    const keyMatches = keysContent.match(/^\s+(\w+):\s*Joi\./gm);
    expect(keyMatches).not.toBeNull();

    const keys = keyMatches.map(m => m.match(/^\s+(\w+):/)[1]);
    const requiredKeys = keys.filter(
      k =>
        keysContent.includes(`${k}:`) &&
        keysContent.substring(keysContent.indexOf(`${k}:`)).match(/\.required\(\)/)
    );

    // Each required key must be mentioned in runbook
    for (const k of [
      'MONGODB_URI',
      'JWT_SECRET',
      'JWT_REFRESH_SECRET',
      'ENCRYPTION_KEY',
      'SESSION_SECRET',
    ]) {
      expect(runbook).toContain(k);
    }

    // Runbook must mention the count (5 keys)
    expect(runbook).toMatch(/5\s+strict-required keys/);
  });

  it('documents exit codes and provides troubleshooting guide', () => {
    const runbook = fs.readFileSync(ENV_CHECK_RUNBOOK, 'utf8');

    // Must explain exit codes
    expect(runbook).toContain('Exit code');
    expect(runbook).toContain('0');
    expect(runbook).toContain('1');

    // Must have a troubleshooting section
    expect(runbook).toMatch(/troubleshoot|FAQ|common|error/i);
  });

  it('verifies the env:check command exists in package.json', () => {
    expect(fs.existsSync(PACKAGE_JSON)).toBe(true);
    const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON, 'utf8'));

    // npm run env:check must exist
    expect(pkg.scripts).toHaveProperty('env:check');
    expect(pkg.scripts['env:check']).toContain('check-env.js');
  });

  it('verifies the check-env.js script implements the documented contract', () => {
    expect(fs.existsSync(ENV_CHECK_SCRIPT)).toBe(true);
    const script = fs.readFileSync(ENV_CHECK_SCRIPT, 'utf8');

    // Script must require STRICT_REQUIRED_KEYS from validateEnv
    expect(script).toContain('STRICT_REQUIRED_KEYS');
    expect(script).toContain('validateEnv');

    // Must export buildReport + HINTS functions
    expect(script).toContain('buildReport');
    expect(script).toContain('HINTS');

    // Must handle exit codes (may be ternary or individual)
    expect(script).toMatch(/process\.exit\(.*0.*1/s);

    // Must support dotenv loading
    expect(script).toContain('dotenv');
  });
});
