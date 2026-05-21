#!/usr/bin/env node
/**
 * generate-whatsapp-service-token.js
 * ════════════════════════════════════════════════════════════════════════
 * Mints a long-lived service JWT for the web-admin v4 WhatsApp provider so
 * it can call `POST /api/whatsapp/send/*` on behalf of the system (no
 * end-user JWT in hand — e.g. when dispatching from a Next.js Route Handler
 * or background job).
 *
 * The backend's existing `authenticate` middleware (middleware/auth.js)
 * accepts any JWT signed with `JWT_SECRET`. No backend code changes
 * needed; just generate a token with role='service' and a stable subject.
 *
 * Usage:
 *   cd backend
 *   node scripts/generate-whatsapp-service-token.js [--days 365]
 *
 * Output (single line, copy into web-admin .env):
 *   WHATSAPP_PROVIDER_SERVICE_TOKEN=<jwt>
 *
 * Security notes:
 *   - Treat the printed token like a credential. Anyone with it can call
 *     /api/whatsapp/send/* (rate-limited + idempotency-guarded, but still).
 *   - Rotate when staff leave or on quarterly cadence. Re-run this script
 *     and replace the value in web-admin's deployment env.
 *   - To REVOKE: the backend's tokenBlacklist (utils/tokenBlacklist.js)
 *     supports revocation. Add the jti to it, restart, done.
 *   - DO NOT commit the generated token. The script prints to stdout only.
 */

'use strict';

const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/secrets');

function parseArgs(argv) {
  const out = { days: 365 };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--days' && argv[i + 1]) {
      out.days = parseInt(argv[i + 1], 10) || 365;
      i += 1;
    } else if (a === '--help' || a === '-h') {
      out.help = true;
    } else if (a === '--subject' && argv[i + 1]) {
      out.subject = String(argv[i + 1]);
      i += 1;
    }
  }
  return out;
}

function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    console.log('Usage: node scripts/generate-whatsapp-service-token.js [--days N] [--subject ID]');
    console.log('  --days N      token lifetime in days (default 365)');
    console.log('  --subject ID  custom subject (default whatsapp-service-provider)');
    process.exit(0);
  }

  if (!jwtSecret) {
    console.error('ERROR: jwtSecret is empty. Set JWT_SECRET in backend/.env first.');
    process.exit(1);
  }

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: args.subject || 'whatsapp-service-provider',
    role: 'service',
    permissions: ['whatsapp:send'],
    iat: now,
    // jti so we can revoke a specific token via tokenBlacklist if needed.
    jti: `wa-svc-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    // Stable id so backend middleware that reads req.user.id doesn't see undefined.
    id: 'whatsapp-service',
    organizationId: process.env.WHATSAPP_PROVIDER_ORG_ID || null,
  };

  const token = jwt.sign(payload, jwtSecret, {
    expiresIn: `${args.days}d`,
    issuer: 'alawael-backend',
    audience: 'whatsapp-provider',
  });

  // Print just the env-var line so it's easy to pipe / copy.
  console.log(`WHATSAPP_PROVIDER_SERVICE_TOKEN=${token}`);
  console.log('');
  console.log('# Add the line above to apps/web-admin/.env (or your deployment env).');
  console.log(`# Lifetime: ${args.days} days. JTI: ${payload.jti}`);
  console.log('# To REVOKE: blacklist the JTI via backend/utils/tokenBlacklist + restart.');
}

main();
