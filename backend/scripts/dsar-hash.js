#!/usr/bin/env node
/**
 * dsar-hash.js — helper for the PDPL DSAR runbook.
 *
 * Computes the SHA-256 targetHash for a given raw identifier so
 * compliance officers can query /admin/adapter-audit without needing
 * to know the hashing implementation.
 *
 * Usage:
 *   node scripts/dsar-hash.js <nationalId>
 *   JWT_SECRET=... node scripts/dsar-hash.js <nationalId>   # override salt
 *
 * Security note: run this locally on the compliance officer's machine,
 * NEVER on a shared server or with the raw ID in a shell history
 * that multiple users have access to. The whole point of hashing is
 * so the audit DB never sees the raw ID — don't defeat that by
 * leaking it into shell history files under home directories.
 */

'use strict';

const crypto = require('crypto');

const id = process.argv[2];
if (!id || id === '--help' || id === '-h') {
  console.log('Usage: node scripts/dsar-hash.js <rawIdentifier>');
  console.log('');
  console.log('Computes the SHA-256 hash (same algorithm as adapterAuditLogger)');
  console.log('so you can query /admin/adapter-audit?targetHash=<output>.');
  process.exit(id ? 0 : 1);
}

const salt = process.env.JWT_SECRET || 'alawael-pdpl-salt';
const hash = crypto.createHash('sha256').update(`${id}:${salt}`).digest('hex').slice(0, 32);

console.log(hash);
