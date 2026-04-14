#!/usr/bin/env node
/**
 * Architecture Guard — يُشغَّل في pre-commit hook
 *
 * يفحص الملفات المرحلية (staged) فقط — لا يعاقب على مشاكل تاريخية.
 * الهدف: منع إضافة انتهاكات جديدة، وليس إصلاح كل شيء دفعة واحدة.
 *
 * Checks:
 *  1. لا import/require جديد يشير لـ _archived
 *  2. لا import جديد من proxy middleware المهملة
 *  3. ملفات routes جديدة ≤ 500 سطر
 *  4. ملفات services جديدة ≤ 800 سطر
 *  5. لا ملفات Python جديدة تُضاف للمستودع
 *  6. لا أسرار مُضمَّنة في الكود الجديد
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
let errors = 0;
let warnings = 0;

function fail(msg) {
  console.error(`  ✗ ${msg}`);
  errors++;
}
function warn(msg) {
  console.warn(`  ⚠  ${msg}`);
  warnings++;
}
function pass(msg) {
  console.log(`  ✓ ${msg}`);
}

// ── Get only STAGED files (new additions or modifications) ────────────────
function getStagedFiles() {
  try {
    const repoRoot = path.join(ROOT, '..');
    return execSync('git diff --cached --name-only', { cwd: repoRoot })
      .toString()
      .split('\n')
      .filter(f => f.trim() && !f.includes('node_modules'));
  } catch {
    return [];
  }
}

// ── Count lines ───────────────────────────────────────────────────────────
function countLines(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8').split('\n').length;
  } catch {
    return 0;
  }
}

// ── Read file safely ──────────────────────────────────────────────────────
function readFile(relPath) {
  try {
    const repoRoot = path.join(ROOT, '..');
    const abs = path.join(repoRoot, relPath);
    return fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : '';
  } catch {
    return '';
  }
}

const staged = getStagedFiles();
const stagedJs = staged.filter(f => f.endsWith('.js') && !f.includes('_archived'));

console.log(`\n🏗️  Architecture Guard — checking ${stagedJs.length} staged JS file(s)...\n`);

if (stagedJs.length === 0) {
  console.log('  (no JS files staged — nothing to check)\n');
  process.exit(0);
}

// ──────────────────────────────────────────────────────────────────────────
// Check 1: No new require() calls pointing to _archived paths
// ──────────────────────────────────────────────────────────────────────────
console.log('📌 Check 1: No imports from _archived folders');
const ARCHIVED_IMPORT_RE = /require\s*\(\s*['"`][^'"`]*_archived[^'"`]*['"`]\s*\)/;
let c1 = 0;
for (const rel of stagedJs) {
  const content = readFile(rel);
  if (ARCHIVED_IMPORT_RE.test(content)) {
    fail(`${rel} — contains require() pointing to _archived`);
    c1++;
  }
}
if (c1 === 0) pass('No _archived require() calls in staged files');

// ──────────────────────────────────────────────────────────────────────────
// Check 2: New code must not import deprecated proxy auth files
// ──────────────────────────────────────────────────────────────────────────
console.log('\n📌 Check 2: Auth imports must use canonical middleware/auth');
const DEPRECATED_AUTH_RE =
  /require\s*\(\s*['"`][^'"`]*(middleware\/authenticate|middleware\/authMiddleware|middleware\/authorize|auth\/middleware)['"`]\s*\)/;
let c2 = 0;
for (const rel of stagedJs) {
  // Skip the deprecated files themselves
  if (
    rel.includes('middleware/authenticate') ||
    rel.includes('middleware/authMiddleware') ||
    rel.includes('middleware/authorize') ||
    rel.endsWith('auth/middleware.js')
  )
    continue;
  const content = readFile(rel);
  if (DEPRECATED_AUTH_RE.test(content)) {
    fail(`${rel} — use middleware/auth instead of deprecated proxy`);
    c2++;
  }
}
if (c2 === 0) pass('Auth imports correct in staged files');

// ──────────────────────────────────────────────────────────────────────────
// Check 3: New route files ≤ 500 lines
// ──────────────────────────────────────────────────────────────────────────
console.log('\n📌 Check 3: New route files ≤ 500 lines');
const ROUTE_LIMIT = 500;
let c3 = 0;
for (const rel of stagedJs) {
  if (!rel.includes('.routes.') && !rel.endsWith('.routes.js')) continue;
  const repoRoot = path.join(ROOT, '..');
  const abs = path.join(repoRoot, rel);
  const lines = countLines(abs);
  // Only fail if this is a NEWLY ADDED file (A in git status), warn for modifications
  let status = '';
  try {
    status = execSync(`git diff --cached --name-status "${rel}"`, { cwd: repoRoot })
      .toString()
      .trim()[0];
  } catch {
    status = 'M';
  }
  if (lines > ROUTE_LIMIT) {
    if (status === 'A') {
      fail(`${rel} — new file has ${lines} lines (limit: ${ROUTE_LIMIT})`);
      c3++;
    } else {
      warn(`${rel} — ${lines} lines (limit: ${ROUTE_LIMIT}) — schedule for splitting`);
    }
  }
}
if (c3 === 0) pass('No new oversized route files');

// ──────────────────────────────────────────────────────────────────────────
// Check 4: New service files ≤ 800 lines
// ──────────────────────────────────────────────────────────────────────────
console.log('\n📌 Check 4: New service files ≤ 800 lines');
const SERVICE_LIMIT = 800;
let c4 = 0;
for (const rel of stagedJs) {
  if (!rel.includes('/services/')) continue;
  const repoRoot = path.join(ROOT, '..');
  const abs = path.join(repoRoot, rel);
  const lines = countLines(abs);
  let status = 'M';
  try {
    status = execSync(`git diff --cached --name-status "${rel}"`, { cwd: repoRoot })
      .toString()
      .trim()[0];
  } catch {
    /* */
  }
  if (lines > SERVICE_LIMIT) {
    if (status === 'A') {
      fail(`${rel} — new file has ${lines} lines (limit: ${SERVICE_LIMIT})`);
      c4++;
    } else {
      warn(`${rel} — ${lines} lines (limit: ${SERVICE_LIMIT}) — schedule for splitting`);
    }
  }
}
if (c4 === 0) pass('No new oversized service files');

// ──────────────────────────────────────────────────────────────────────────
// Check 5: No new Python files being added to the JS backend
// ──────────────────────────────────────────────────────────────────────────
console.log('\n📌 Check 5: No new Python files added to backend');
const newPythonFiles = staged.filter(
  f => f.startsWith('backend/') && (f.endsWith('.py') || f.endsWith('.pyc'))
);
let c5 = 0;
for (const f of newPythonFiles) {
  const repoRoot = path.join(ROOT, '..');
  let status = 'A';
  try {
    status = execSync(`git diff --cached --name-status "${f}"`, { cwd: repoRoot })
      .toString()
      .trim()[0];
  } catch {
    /* */
  }
  if (status === 'A') {
    fail(`${f} — Python file added to JS backend`);
    c5++;
  }
}
if (c5 === 0) pass('No new Python files added to backend');

// ──────────────────────────────────────────────────────────────────────────
// Check 6: No hardcoded secrets in staged JS files
// ──────────────────────────────────────────────────────────────────────────
console.log('\n📌 Check 6: No hardcoded secrets in staged files');
const SECRET_PATTERNS = [
  { re: /password\s*[:=]\s*['"][^'"]{8,}['"]/i, label: 'hardcoded password' },
  { re: /secret\s*[:=]\s*['"][^'"]{16,}['"]/i, label: 'hardcoded secret (long value)' },
  { re: /api[_-]?key\s*[:=]\s*['"][^'"]{16,}['"]/i, label: 'hardcoded API key' },
  { re: /mongodb:\/\/[^'"]*:[^'"]*@/i, label: 'MongoDB credentials in URL' },
];
let c6 = 0;
for (const rel of stagedJs) {
  if (
    rel.includes('.env.example') ||
    rel.includes('.test.') ||
    rel.includes('check-architecture') ||
    rel.includes('jest.setup') ||
    rel.includes('test-helpers') ||
    rel.includes('reset-password') ||
    rel.includes('test-utils/')
  )
    continue;
  const content = readFile(rel);
  for (const { re, label } of SECRET_PATTERNS) {
    if (re.test(content)) {
      fail(`${rel} — possible ${label}`);
      c6++;
      break;
    }
  }
}
if (c6 === 0) pass('No hardcoded secrets detected');

// ──────────────────────────────────────────────────────────────────────────
// Summary
// ──────────────────────────────────────────────────────────────────────────
console.log('\n' + '─'.repeat(60));
if (warnings > 0) {
  console.warn(`\n⚠  ${warnings} warning(s) — existing issues to fix in future phases`);
}
if (errors > 0) {
  console.error(`\n❌ ${errors} violation(s) block this commit. Fix and retry.\n`);
  process.exit(1);
} else {
  console.log(`\n✅ All architecture checks passed.\n`);
  process.exit(0);
}
