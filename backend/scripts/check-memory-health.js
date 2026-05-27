#!/usr/bin/env node
/**
 * check-memory-health.js — surface bloat in the agent's persistent
 * auto-memory directory before MEMORY.md gets truncated mid-load and
 * starts dropping context silently.
 *
 * WHY (the incident class):
 *   The Claude Code agent loads MEMORY.md into every conversation. The
 *   loader has a soft cap at ~200 lines: past that the tail is dropped
 *   without warning, leaving the agent half-informed. As of 2026-05-27
 *   MEMORY.md sits at 488 lines / ~353KB and the in-load reminder
 *   already shows the "only part of it was loaded" warning. Individual
 *   memory FILES that grow past ~50KB also become noticeably slower to
 *   load and start crowding the conversation window when recalled.
 *
 *   This script scans the memory dir + flags 3 health classes:
 *     1. MEMORY.md line count + KB size against soft/hard caps.
 *     2. Individual memory files over per-file size threshold.
 *     3. Long index entries in MEMORY.md (lines > 200 chars — the spec
 *        says "keep entries to one line under ~200 chars").
 *
 * HOW THIS GATE WORKS:
 *   - Resolves the memory dir via:
 *       1. env CLAUDE_MEMORY_DIR (override)
 *       2. CLAUDE.md-documented default for this repo (the slugified
 *          project path under ~/.claude/projects/)
 *     If neither resolves to a real directory → soft-skip with note.
 *
 *   - Three severity tiers per check:
 *       - OK       : within soft cap, no action
 *       - WARN     : printed but exit stays 0
 *       - FAIL     : exit 1 (only the hard caps trip this)
 *
 * USAGE:
 *   node scripts/check-memory-health.js              # human-readable
 *   node scripts/check-memory-health.js --json       # machine-readable
 *   node scripts/check-memory-health.js --strict     # promote WARN → FAIL
 *   node scripts/check-memory-health.js --dir=/path  # override memory dir
 *
 * EXIT:
 *   0 = no hard-cap breach (warnings may still print).
 *   1 = at least one hard cap exceeded (or --strict promoted a warn).
 *
 * INTENTIONALLY ON-DEMAND (not wired into pre-push): the memory dir
 * lives OUTSIDE the repo + CI runners don't have it. Run manually
 * during /loop self-pacing or as part of a memory-cleanup wave.
 */

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const ARGS = process.argv.slice(2);
const JSON_MODE = ARGS.includes('--json');
const STRICT = ARGS.includes('--strict');
const DIR_ARG = ARGS.find(a => a.startsWith('--dir='));

// Thresholds — chosen against current real values (MEMORY.md @ 488
// lines / 353KB on 2026-05-27, individual files ranging 5-30KB).
// SOFT caps trigger WARN; HARD caps trigger FAIL.
const THRESHOLDS = Object.freeze({
  memoryMdSoftLines: 200,
  memoryMdHardLines: 400,
  memoryMdSoftKB: 100,
  memoryMdHardKB: 250,
  perFileSoftKB: 50,
  perFileHardKB: 200,
  indexEntryMaxChars: 200,
});

// CLAUDE.md documents the project-slug location of the memory dir.
// On Windows the home is %USERPROFILE%; on POSIX it's $HOME. The slug
// is derived from the project path — non-ASCII chars + path separators
// get replaced with dashes by the runtime. This default reflects the
// current 66666/ checkout.
const DEFAULT_MEMORY_DIR_SLUG = 'c--Users-x-be-OneDrive-----------04-10-2025-66666';

function homeDir() {
  return process.env.USERPROFILE || process.env.HOME || os.homedir();
}

function resolveMemoryDir() {
  if (DIR_ARG) return path.resolve(DIR_ARG.split('=').slice(1).join('='));
  if (process.env.CLAUDE_MEMORY_DIR) return path.resolve(process.env.CLAUDE_MEMORY_DIR);
  return path.join(homeDir(), '.claude', 'projects', DEFAULT_MEMORY_DIR_SLUG, 'memory');
}

function statSafe(p) {
  try {
    return fs.statSync(p);
  } catch {
    return null;
  }
}

function kbOf(bytes) {
  return Math.round((bytes / 1024) * 10) / 10;
}

function classify(value, soft, hard) {
  if (value >= hard) return 'FAIL';
  if (value >= soft) return 'WARN';
  return 'OK';
}

// Read MEMORY.md and return { lineCount, kb, longLines: [{ idx, len }, ...] }.
// Pure (apart from fs.readFileSync) — exposed for tests.
function scanIndexFile(absPath, maxChars) {
  const buf = fs.readFileSync(absPath);
  const text = buf.toString('utf8');
  const lines = text.split(/\r?\n/);
  const longLines = [];
  for (let i = 0; i < lines.length; i++) {
    // Use Unicode-aware length — Arabic + emoji surrogates inflate
    // the visible/byte count differently. The reminder uses char count
    // so we mirror that.
    if (lines[i].length > maxChars) {
      longLines.push({ idx: i + 1, len: lines[i].length });
    }
  }
  return { lineCount: lines.length, kb: kbOf(buf.length), longLines };
}

// List every regular file in the memory dir EXCEPT MEMORY.md itself and
// hidden / temp files. Returns [{ name, kb }, ...] sorted by kb desc.
function listMemoryFiles(dir) {
  const out = [];
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  for (const e of entries) {
    if (!e.isFile()) continue;
    if (e.name === 'MEMORY.md') continue;
    if (e.name.startsWith('.')) continue;
    if (e.name.endsWith('.tmp')) continue;
    if (e.name.endsWith('.bak')) continue;
    const full = path.join(dir, e.name);
    const st = statSafe(full);
    if (!st) continue;
    out.push({ name: e.name, kb: kbOf(st.size) });
  }
  out.sort((a, b) => b.kb - a.kb);
  return out;
}

function buildReport(memDir, thresholds = THRESHOLDS) {
  const indexPath = path.join(memDir, 'MEMORY.md');
  if (!fs.existsSync(memDir)) {
    return {
      memDir,
      exists: false,
      report: null,
      verdict: 'SKIP',
      reason: `memory dir does not exist: ${memDir}`,
    };
  }
  if (!fs.existsSync(indexPath)) {
    return {
      memDir,
      exists: true,
      indexPath,
      report: null,
      verdict: 'SKIP',
      reason: `MEMORY.md not found in ${memDir}`,
    };
  }
  const index = scanIndexFile(indexPath, thresholds.indexEntryMaxChars);
  const files = listMemoryFiles(memDir);

  const indexLinesStatus = classify(
    index.lineCount,
    thresholds.memoryMdSoftLines,
    thresholds.memoryMdHardLines
  );
  const indexSizeStatus = classify(index.kb, thresholds.memoryMdSoftKB, thresholds.memoryMdHardKB);
  const bigFiles = files
    .map(f => ({
      ...f,
      status: classify(f.kb, thresholds.perFileSoftKB, thresholds.perFileHardKB),
    }))
    .filter(f => f.status !== 'OK');

  return {
    memDir,
    exists: true,
    indexPath,
    verdict: 'CHECKED',
    report: {
      index: {
        lineCount: index.lineCount,
        kb: index.kb,
        longLines: index.longLines,
        linesStatus: indexLinesStatus,
        sizeStatus: indexSizeStatus,
      },
      files: { total: files.length, bigFiles, allFiles: files },
      thresholds,
    },
  };
}

function decideExit(report, strict) {
  if (!report) return 0;
  const failures = [];
  if (report.index.linesStatus === 'FAIL') failures.push('memory-md-lines');
  if (report.index.sizeStatus === 'FAIL') failures.push('memory-md-size');
  for (const f of report.files.bigFiles) {
    if (f.status === 'FAIL') failures.push(`file:${f.name}`);
  }
  if (strict) {
    if (report.index.linesStatus === 'WARN')
      failures.push('memory-md-lines (warn→fail via --strict)');
    if (report.index.sizeStatus === 'WARN')
      failures.push('memory-md-size (warn→fail via --strict)');
    for (const f of report.files.bigFiles) {
      if (f.status === 'WARN') failures.push(`file:${f.name} (warn→fail via --strict)`);
    }
    if (report.index.longLines.length > 0) {
      failures.push(`${report.index.longLines.length} long index entries (>200 chars)`);
    }
  }
  return failures.length === 0 ? 0 : 1;
}

function statusGlyph(status) {
  return status === 'OK' ? '✓' : status === 'WARN' ? '⚠' : '✗';
}

function printHuman(out) {
  if (out.verdict === 'SKIP') {
    console.log(`check:memory-health — SKIPPED (${out.reason})`);
    return;
  }
  const { report } = out;
  const t = report.thresholds;
  console.log(`Memory dir: ${out.memDir}`);
  console.log('');
  console.log('MEMORY.md');
  console.log(
    `  ${statusGlyph(report.index.linesStatus)} lines:  ${report.index.lineCount} ` +
      `(soft=${t.memoryMdSoftLines}, hard=${t.memoryMdHardLines})`
  );
  console.log(
    `  ${statusGlyph(report.index.sizeStatus)} size:   ${report.index.kb} KB ` +
      `(soft=${t.memoryMdSoftKB}, hard=${t.memoryMdHardKB})`
  );
  if (report.index.longLines.length > 0) {
    console.log(
      `  ⚠ ${report.index.longLines.length} index line(s) over ${t.indexEntryMaxChars} chars ` +
        '(spec says one-liners under ~200 chars):'
    );
    for (const l of report.index.longLines.slice(0, 8)) {
      console.log(`    line ${l.idx}: ${l.len} chars`);
    }
    if (report.index.longLines.length > 8) {
      console.log(`    … +${report.index.longLines.length - 8} more`);
    }
  }
  console.log('');
  console.log(`Memory files: ${report.files.total} total`);
  if (report.files.bigFiles.length === 0) {
    console.log(`  ✓ no individual file over ${t.perFileSoftKB} KB`);
  } else {
    console.log(`  ${report.files.bigFiles.length} oversize file(s):`);
    for (const f of report.files.bigFiles) {
      console.log(`    ${statusGlyph(f.status)} ${f.kb} KB  ${f.name}`);
    }
  }
  if (report.index.linesStatus !== 'OK' || report.index.sizeStatus !== 'OK') {
    console.log('');
    console.log('Recipes:');
    console.log('  - Archive oldest project_*.md entries: move them into');
    console.log('    `memory/_archive/<YYYY-MM>/` + drop the MEMORY.md line.');
    console.log('  - Consolidate adjacent same-topic entries into a single');
    console.log('    project_<topic>.md and one MEMORY.md line.');
    console.log('  - Shorten one-liners > 200 chars (use the body of the linked');
    console.log('    file for detail; the index entry is just a hook).');
  }
}

function main() {
  const memDir = resolveMemoryDir();
  const out = buildReport(memDir);
  const exitCode = decideExit(out.report, STRICT);

  if (JSON_MODE) {
    process.stdout.write(JSON.stringify(out, null, 2) + '\n');
  } else {
    printHuman(out);
  }
  process.exit(exitCode);
}

// Pure helpers exported for unit tests.
module.exports = {
  classify,
  kbOf,
  scanIndexFile,
  listMemoryFiles,
  buildReport,
  decideExit,
  resolveMemoryDir,
  THRESHOLDS,
  DEFAULT_MEMORY_DIR_SLUG,
};

if (require.main === module) {
  main();
}
