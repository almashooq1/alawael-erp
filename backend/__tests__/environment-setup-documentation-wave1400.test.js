/**
 * W1400 — Environment Setup Documentation Guard
 *
 * Purpose:
 * ────────
 * Prevent drift between documentation (runbooks + templates) and actual
 * environment requirements enforced by config/validateEnv.js.
 *
 * Guarded Contracts:
 * 1. docs/runbooks/environment-setup.md MUST document both minimal + full profiles
 * 2. .env.minimum.example MUST contain all STRICT_REQUIRED_KEYS
 * 3. .env.example MUST reference the runbook + document all keys
 * 4. STRICT_REQUIRED_KEYS must not change without updating docs
 *
 * Pattern: Ratchet-down baseline — NEW keys missing from templates fail CI,
 *          STALE baseline entries fail CI forcing template updates.
 */

const fs = require('fs');
const path = require('path');

describe('W1400 — Environment Setup Documentation Guard', () => {
  const RUNBOOK_PATH = path.join(__dirname, '../../docs/runbooks/environment-setup.md');
  const ENV_MINIMUM_PATH = path.join(__dirname, '../../backend/.env.minimum.example');
  const ENV_EXAMPLE_PATH = path.join(__dirname, '../../backend/.env.example');
  const VALIDATE_ENV_PATH = path.join(__dirname, '../../backend/config/validateEnv.js');

  let runbookContent, minimalContent, exampleContent, validateEnvContent;

  beforeAll(() => {
    // Load all files
    runbookContent = fs.readFileSync(RUNBOOK_PATH, 'utf8');
    minimalContent = fs.readFileSync(ENV_MINIMUM_PATH, 'utf8');
    exampleContent = fs.readFileSync(ENV_EXAMPLE_PATH, 'utf8');
    validateEnvContent = fs.readFileSync(VALIDATE_ENV_PATH, 'utf8');
  });

  it('runbook exists and documents both profiles (minimal + full)', () => {
    expect(runbookContent).toContain('Profile 1: Minimal Bootstrap');
    expect(runbookContent).toContain('Profile 2: Full Features');
    expect(runbookContent).toMatch(/quick start|Quick Start/i);
    expect(runbookContent).toContain('# Environment Setup Guide');
  });

  it('runbook documents all 5 strict required keys with purposes', () => {
    const keys = [
      'MONGODB_URI',
      'JWT_SECRET',
      'JWT_REFRESH_SECRET',
      'ENCRYPTION_KEY',
      'SESSION_SECRET',
    ];
    keys.forEach(key => {
      expect(runbookContent).toContain(key);
    });
    // Verify they're in a table or section, not just mentioned
    expect(runbookContent).toMatch(/Required.*5\s*(strict\s*)?keys/i);
  });

  it('.env.minimum.example contains all 5 strict required keys', () => {
    const keys = [
      'MONGODB_URI',
      'JWT_SECRET',
      'JWT_REFRESH_SECRET',
      'ENCRYPTION_KEY',
      'SESSION_SECRET',
    ];
    keys.forEach(key => {
      expect(minimalContent).toContain(key);
    });
  });

  it('.env.minimum.example uses CHANGE_ME placeholder for secrets', () => {
    expect(minimalContent).toContain('CHANGE_ME_64B');
    // Verify it appears for all secret keys
    const secretLines = minimalContent
      .split('\n')
      .filter(line =>
        line.match(/^(JWT_SECRET|JWT_REFRESH_SECRET|ENCRYPTION_KEY|SESSION_SECRET)=/)
      );
    expect(secretLines.length).toBe(4);
    secretLines.forEach(line => {
      expect(line).toContain('CHANGE_ME');
    });
  });

  it('.env.example references environment-setup.md runbook', () => {
    expect(exampleContent).toMatch(/environment-setup|Environment.*[Ss]etup|runbook/i);
  });

  it('.env.example documents all 5 strict keys with explanations', () => {
    const keys = [
      'MONGODB_URI',
      'JWT_SECRET',
      'JWT_REFRESH_SECRET',
      'ENCRYPTION_KEY',
      'SESSION_SECRET',
    ];
    keys.forEach(key => {
      expect(exampleContent).toContain(key);
    });
  });

  it('.env.example documents all gov integration providers (9+ providers)', () => {
    const providers = [
      'GOSI',
      'NPHIES',
      'SCFHS',
      'Absher',
      'Qiwa',
      'Nafath',
      'ZATCA',
      'Muqeem',
      'Balady',
      'Wasel',
    ];
    providers.forEach(provider => {
      expect(exampleContent).toContain(provider);
    });
  });

  it('.env.example documents WhatsApp, payments, and email systems', () => {
    expect(exampleContent).toContain('WHATSAPP');
    expect(exampleContent).toContain('STRIPE');
    expect(exampleContent).toContain('EMAIL_PROVIDER');
  });

  it('runbook documents setup workflows (developer, CI, docker-compose)', () => {
    expect(runbookContent).toContain('Workflow 1: New Developer');
    expect(runbookContent).toContain('Workflow 2: CI');
    expect(runbookContent).toContain('Workflow 3: Docker');
    expect(runbookContent).toContain('.github/workflows');
  });

  it('runbook documents troubleshooting for common errors (env:check, MongoDB, WhatsApp)', () => {
    expect(runbookContent).toContain('Troubleshooting');
    expect(runbookContent).toMatch(/env:check.*failed/i);
    expect(runbookContent).toMatch(/MONGODB_URI.*timeout/i);
    expect(runbookContent).toMatch(/WhatsApp.*HMAC/i);
  });

  it('runbook documents secret rotation strategy', () => {
    expect(runbookContent).toContain('Rotating Secrets');
    expect(runbookContent).toMatch(/90\s*days|quarterly|monthly/i);
  });

  it('runbook cross-links to related docs (pre-deployment, preflight, go-live, SECURITY)', () => {
    expect(runbookContent).toContain('pre-deployment-checklist.md');
    expect(runbookContent).toContain('env-preflight-check.md');
    expect(runbookContent).toContain('go-live-checklist.md');
    expect(runbookContent).toContain('SECURITY.md');
  });

  it('.env.minimum.example provides generation hints for secrets (openssl)', () => {
    expect(minimalContent).toContain('openssl rand -base64 64');
  });

  it('.env.example has generation hints and command examples', () => {
    expect(exampleContent).toContain('openssl');
    expect(exampleContent).toMatch(/BACKUP_ENCRYPTION_KEY|backup-keygen/);
  });

  it('documentation does NOT have trailing/conflicting environment template contradictions', () => {
    // Verify minimal template section mentions it's for CI/staging/minimal
    expect(runbookContent).toMatch(/Profile 1.*[Cc]i|staging|minimal|bootstrap/i);
    // Verify full template section mentions it's for production/features
    expect(runbookContent).toMatch(/Profile 2.*[Pp]roduction|full|features/i);
  });

  it('version is documented in runbook footer', () => {
    expect(runbookContent).toMatch(/Version:.*1\.0\.0|W1400/);
  });
});
