#!/usr/bin/env node
/**
 * whatsapp-smoke-test.js
 * ════════════════════════════════════════════════════════════════════════
 * End-to-end smoke test against the LIVE Meta WhatsApp Cloud API.
 *
 * What it does (in order):
 *   1. Loads backend/.env via dotenv.
 *   2. Validates required env vars are present + non-empty.
 *   3. Calls Meta `GET /v21.0/{phoneId}` to confirm the token works
 *      and prints the verified phone number + quality rating.
 *   4. (Optional, --to=<phone>) Sends a `hello_world` template message
 *      to the supplied phone. This is Meta's reserved test template;
 *      it works even before you've registered your own templates.
 *   5. Prints the returned Meta message ID + a copy-paste curl you can
 *      run to fetch its delivery status later.
 *
 * Usage:
 *   cd backend
 *   node scripts/whatsapp-smoke-test.js                  # status check only
 *   node scripts/whatsapp-smoke-test.js --to=+9665XXXXXXXX  # send hello_world too
 *   node scripts/whatsapp-smoke-test.js --to=... --text="مرحباً"  # send free text instead
 *
 * Important: free-text sends ONLY work to numbers that have messaged YOUR
 * business in the last 24h. Use --to with a template (default behavior)
 * for cold sends; switch to --text only after you've sent yourself a
 * WhatsApp message FROM the target phone TO your business number.
 *
 * Exits 0 on success, non-zero on any failure.
 */

'use strict';

// Load .env if present — production deployments inject env directly so dotenv
// is a no-op there.
try {
  require('dotenv').config();
} catch {
  // dotenv not installed — fine if env is already set externally.
}

const whatsappService = require('../services/whatsapp/whatsappService');
const { maskPhone } = require('../services/whatsapp/phone');

function parseArgs(argv) {
  const out = {};
  for (const a of argv.slice(2)) {
    const m = a.match(/^--([^=]+)=(.*)$/);
    if (m) out[m[1]] = m[2];
    else if (a === '--help' || a === '-h') out.help = true;
  }
  return out;
}

function fail(msg) {
  console.error(`\n❌ ${msg}\n`);
  process.exit(1);
}

function ok(msg) {
  console.log(`✓ ${msg}`);
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    console.log(__filename.split(/[\\/]/).pop());
    console.log('  --to=<phone>       phone to message (E.164 or local Saudi format)');
    console.log('  --text="..."       send free-form text instead of hello_world');
    console.log('  --template=<name>  send a specific template name (default: hello_world)');
    console.log('  --lang=<code>      template language (default: en_US for hello_world)');
    process.exit(0);
  }

  console.log('\n═══ WhatsApp Cloud API Smoke Test ═══\n');

  // ── 1. Validate env ────────────────────────────────────────────────
  const required = ['WHATSAPP_API_TOKEN', 'WHATSAPP_PHONE_ID'];
  const missing = required.filter(k => !process.env[k]);
  if (missing.length) {
    fail(`Missing required env vars: ${missing.join(', ')}\n   Edit backend/.env and re-run.`);
  }
  ok(`WHATSAPP_API_TOKEN     present (${process.env.WHATSAPP_API_TOKEN.length} chars)`);
  ok(`WHATSAPP_PHONE_ID      ${process.env.WHATSAPP_PHONE_ID}`);
  if (process.env.WHATSAPP_BUSINESS_ID) {
    ok(`WHATSAPP_BUSINESS_ID   ${process.env.WHATSAPP_BUSINESS_ID}`);
  } else {
    console.log("⚠  WHATSAPP_BUSINESS_ID not set — /templates/sync won't work yet.");
  }
  if (process.env.WHATSAPP_WEBHOOK_SECRET) {
    ok(`WHATSAPP_WEBHOOK_SECRET present (${process.env.WHATSAPP_WEBHOOK_SECRET.length} chars)`);
  } else {
    console.log(
      '⚠  WHATSAPP_WEBHOOK_SECRET not set — webhook will accept ANY payload (insecure).'
    );
  }
  if (process.env.WHATSAPP_VERIFY_TOKEN) {
    ok(`WHATSAPP_VERIFY_TOKEN  present (use this in Meta dashboard webhook setup)`);
  } else {
    console.log(
      '⚠  WHATSAPP_VERIFY_TOKEN not set — falls back to WEBHOOK_SECRET for GET handshake.'
    );
  }
  console.log();

  // Confirm cfg() picks up the env vars correctly.
  if (!whatsappService.isEnabled()) {
    fail(
      'whatsappService.isEnabled()=false despite token present. Did you spell WHATSAPP_API_TOKEN right?'
    );
  }
  ok('whatsappService.isEnabled() = true (stub mode disabled)\n');

  // ── 2. Call Meta /phone-id to confirm the token works ──────────────
  console.log('━━ Step 1: Meta phone-number lookup ━━');
  let phoneInfo;
  try {
    phoneInfo = await whatsappService.getPhoneInfo();
  } catch (err) {
    fail(
      `Meta API call failed: ${err.message}\n` +
        `   statusCode: ${err.statusCode || 'unknown'}\n` +
        `   ${err.meta ? 'Meta error: ' + JSON.stringify(err.meta).slice(0, 300) : ''}\n` +
        `   → Token might be revoked / expired / wrong phone-number-id.`
    );
  }
  ok(`Verified name:    ${phoneInfo.verified_name || '(unknown)'}`);
  ok(`Display phone:    ${phoneInfo.display_phone_number || '(unknown)'}`);
  ok(`Quality rating:   ${phoneInfo.quality_rating || '(unknown)'}`);
  ok(`Messaging limit:  ${phoneInfo.messaging_limit_tier || '(unknown)'}`);
  console.log();

  // ── 3. (Optional) send a message ───────────────────────────────────
  if (!args.to) {
    console.log('━━ Step 2: SKIPPED — no --to phone given ━━');
    console.log('   To send a real message, re-run with:');
    console.log('     node scripts/whatsapp-smoke-test.js --to=+9665XXXXXXXX');
    console.log("   (use a number that's in your Meta test contacts OR opted-in)\n");
    process.exit(0);
  }

  console.log(`━━ Step 2: Sending to ${maskPhone(args.to)} ━━`);
  let result;
  try {
    if (args.text) {
      console.log(
        `   mode: free-form text ("${args.text.slice(0, 40)}${args.text.length > 40 ? '…' : ''}")`
      );
      console.log('   (only works if recipient messaged you in the last 24h)');
      result = await whatsappService.sendText(args.to, args.text);
    } else {
      const template = args.template || 'hello_world';
      const lang = args.lang || (template === 'hello_world' ? 'en_US' : 'ar');
      console.log(`   mode: template "${template}" (${lang})`);
      result = await whatsappService.sendTemplate(args.to, template, lang, []);
    }
  } catch (err) {
    fail(
      `Send failed: ${err.message}\n` +
        `   statusCode: ${err.statusCode || 'unknown'}\n` +
        `   code: ${err.code || 'unknown'}\n` +
        `   details: ${err.details ? JSON.stringify(err.details).slice(0, 200) : ''}\n` +
        `   ${err.meta ? 'Meta error: ' + JSON.stringify(err.meta).slice(0, 300) : ''}`
    );
  }

  if (result?.stub) {
    fail('Got stub response — WHATSAPP_ENABLED check failed mid-run. Should not happen.');
  }
  ok(`success: ${result.success}`);
  ok(`messageId: ${result.messageId}`);
  if (result.to) ok(`to:        ${maskPhone(result.to)}`);
  console.log();
  console.log('━━ Step 3: Where to look next ━━');
  console.log(
    '   1. Check your WhatsApp app on the recipient phone — message should arrive in <30s.'
  );
  console.log(
    '   2. After Meta updates delivery status, your /api/whatsapp/webhook will be hit IF'
  );
  console.log('      you have ngrok + Meta webhook URL configured.');
  console.log(`   3. Manual delivery-status fetch (no webhook needed):`);
  console.log(
    `      curl -H "Authorization: Bearer $WHATSAPP_API_TOKEN" \\\n` +
      `        "https://graph.facebook.com/v21.0/${result.messageId}"`
  );
  console.log();
  console.log('━━ Smoke test complete ━━\n');
}

main().catch(err => {
  console.error('\n❌ Unexpected error:', err.message);
  console.error(err.stack);
  process.exit(1);
});
