#!/usr/bin/env node
/**
 * @file backup-keygen.js
 * @description توليد مفتاح AES-256-GCM للنسخ الاحتياطي
 *
 * Usage:
 *   node backend/scripts/backup-keygen.js          # human output + .env hint
 *   node backend/scripts/backup-keygen.js --raw    # only the hex (for pipes)
 *
 * STORE THE KEY OUT-OF-BAND.
 *   • A backup encrypted with key X is unreadable without key X.
 *   • If the key is committed to git, encryption gives zero protection.
 *   • If the key is lost, the backups are unrecoverable.
 *
 * Recommended:
 *   1. Run this on the VPS (NOT a dev laptop).
 *   2. Add `BACKUP_ENCRYPTION_KEY=…` to the VPS-only secrets store.
 *   3. Save a copy in the org's password manager (1Password / Bitwarden).
 *   4. Document the key version + creation date in ops runbook.
 */

'use strict';

const { generateKey } = require('../utils/backup-crypto');

const args = process.argv.slice(2);
const raw = args.includes('--raw');
const key = generateKey();

if (raw) {
  process.stdout.write(key);
  process.exit(0);
}

console.log('\n╔══════════════════════════════════════════════════════════════════╗');
console.log('║           Al-Awael ERP — Backup Encryption Keygen                ║');
console.log('╚══════════════════════════════════════════════════════════════════╝\n');
console.log('  مفتاح جديد بطول 32 بايت (AES-256):\n');
console.log(`  BACKUP_ENCRYPTION_KEY=${key}\n`);
console.log('  ⚠️  تحذير حرج / CRITICAL:');
console.log('     • أضف هذا السطر إلى ملف .env على VPS فقط (وليس git)');
console.log('     • احفظ نسخة في password manager المؤسسي');
console.log('     • فقدان المفتاح = فقدان كل النسخ المشفّرة المستقبلية');
console.log('     • تدوير المفتاح يتطلب فك تشفير النسخ القديمة قبل حذفه');
console.log('');
