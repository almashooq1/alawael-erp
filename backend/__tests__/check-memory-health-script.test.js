'use strict';

/**
 * check-memory-health-script.test.js — exit-code + helper-contract
 * coverage for scripts/check-memory-health.js.
 *
 * Two layers per the gate-4 reference (check-mongoose-hook-style-script):
 *   1. Pure-helper assertions on classify (tier boundaries),
 *      scanIndexFile (line counting + long-line detection),
 *      listMemoryFiles (size sorting + exclusion rules),
 *      buildReport (composite verdict + skip semantics),
 *      decideExit (strict-mode promotion logic) — using in-memory
 *      tmpdir fixtures so we never touch the real ~/.claude/ tree.
 *   2. CLI smoke against a controlled tmpdir overridden via --dir=.
 *
 * Why this matters: the memory dir lives outside the repo, so the
 * usual git-history safety net doesn't protect it. A health gate that
 * silently classifies a 400-line MEMORY.md as OK is worse than no gate
 * — the agent would keep operating on a truncated load.
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'check-memory-health.js');
const {
  classify,
  kbOf,
  scanIndexFile,
  listMemoryFiles,
  buildReport,
  decideExit,
  resolveMemoryDir,
  THRESHOLDS,
  DEFAULT_MEMORY_DIR_SLUG,
} = require('../scripts/check-memory-health');

describe('check-memory-health — classify (tier boundaries)', () => {
  it('returns OK when value is below soft cap', () => {
    expect(classify(50, 100, 200)).toBe('OK');
  });

  it('returns WARN when value reaches soft cap exactly', () => {
    expect(classify(100, 100, 200)).toBe('WARN');
  });

  it('returns WARN when value is between soft and hard', () => {
    expect(classify(150, 100, 200)).toBe('WARN');
  });

  it('returns FAIL when value reaches hard cap exactly', () => {
    expect(classify(200, 100, 200)).toBe('FAIL');
  });

  it('returns FAIL when value exceeds hard cap', () => {
    expect(classify(999, 100, 200)).toBe('FAIL');
  });

  it('returns OK for zero', () => {
    expect(classify(0, 100, 200)).toBe('OK');
  });
});

describe('check-memory-health — kbOf', () => {
  it('converts bytes to KB rounded to 1 decimal', () => {
    expect(kbOf(1024)).toBe(1);
    expect(kbOf(1536)).toBe(1.5);
    expect(kbOf(0)).toBe(0);
  });

  it('handles large sizes without precision loss', () => {
    expect(kbOf(353 * 1024)).toBe(353);
  });
});

describe('check-memory-health — scanIndexFile', () => {
  let tmpDir;
  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mem-health-scan-'));
  });
  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('counts lines correctly (including the trailing empty split)', () => {
    const p = path.join(tmpDir, 'MEMORY.md');
    fs.writeFileSync(p, 'line1\nline2\nline3', 'utf8');
    const r = scanIndexFile(p, 200);
    expect(r.lineCount).toBe(3);
  });

  it('flags lines exceeding maxChars threshold', () => {
    const p = path.join(tmpDir, 'MEMORY.md');
    const longLine = 'X'.repeat(250);
    fs.writeFileSync(p, `short\n${longLine}\nshort`, 'utf8');
    const r = scanIndexFile(p, 200);
    expect(r.longLines).toHaveLength(1);
    expect(r.longLines[0].idx).toBe(2);
    expect(r.longLines[0].len).toBe(250);
  });

  it('returns empty longLines when all lines are within threshold', () => {
    const p = path.join(tmpDir, 'MEMORY.md');
    fs.writeFileSync(p, 'a\nb\nc\n', 'utf8');
    expect(scanIndexFile(p, 200).longLines).toEqual([]);
  });

  it('handles CRLF line endings (Windows-friendly)', () => {
    const p = path.join(tmpDir, 'MEMORY.md');
    fs.writeFileSync(p, 'a\r\nb\r\nc', 'utf8');
    expect(scanIndexFile(p, 200).lineCount).toBe(3);
  });

  it('reports file size in KB', () => {
    const p = path.join(tmpDir, 'MEMORY.md');
    fs.writeFileSync(p, 'X'.repeat(2048), 'utf8');
    expect(scanIndexFile(p, 200).kb).toBe(2);
  });
});

describe('check-memory-health — listMemoryFiles', () => {
  let tmpDir;
  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mem-health-list-'));
  });
  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('lists every regular file except MEMORY.md, dotfiles, and *.tmp', () => {
    fs.writeFileSync(path.join(tmpDir, 'MEMORY.md'), 'index', 'utf8');
    fs.writeFileSync(path.join(tmpDir, 'feedback_foo.md'), 'foo', 'utf8');
    fs.writeFileSync(path.join(tmpDir, 'project_bar.md'), 'bar bar', 'utf8');
    fs.writeFileSync(path.join(tmpDir, '.hidden'), 'x', 'utf8');
    fs.writeFileSync(path.join(tmpDir, 'MEMORY.md.tmp'), 'temp', 'utf8');
    const files = listMemoryFiles(tmpDir);
    const names = files.map(f => f.name).sort();
    expect(names).toEqual(['feedback_foo.md', 'project_bar.md']);
  });

  it('sorts results by size descending', () => {
    fs.writeFileSync(path.join(tmpDir, 'small.md'), 'a', 'utf8');
    fs.writeFileSync(path.join(tmpDir, 'big.md'), 'X'.repeat(20480), 'utf8');
    fs.writeFileSync(path.join(tmpDir, 'medium.md'), 'X'.repeat(5120), 'utf8');
    const files = listMemoryFiles(tmpDir);
    expect(files.map(f => f.name)).toEqual(['big.md', 'medium.md', 'small.md']);
  });

  it('returns [] when dir does not exist', () => {
    expect(listMemoryFiles(path.join(tmpDir, 'nope'))).toEqual([]);
  });
});

describe('check-memory-health — buildReport composite', () => {
  let tmpDir;
  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mem-health-report-'));
  });
  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns SKIP when memory dir does not exist', () => {
    const out = buildReport(path.join(tmpDir, 'missing'));
    expect(out.verdict).toBe('SKIP');
    expect(out.report).toBeNull();
  });

  it('returns SKIP when MEMORY.md absent but dir exists', () => {
    const out = buildReport(tmpDir);
    expect(out.verdict).toBe('SKIP');
  });

  it('returns OK statuses on a small healthy memory dir', () => {
    fs.writeFileSync(path.join(tmpDir, 'MEMORY.md'), 'tiny\n- entry one\n', 'utf8');
    fs.writeFileSync(path.join(tmpDir, 'project_foo.md'), 'X'.repeat(1024), 'utf8');
    const out = buildReport(tmpDir);
    expect(out.verdict).toBe('CHECKED');
    expect(out.report.index.linesStatus).toBe('OK');
    expect(out.report.index.sizeStatus).toBe('OK');
    expect(out.report.files.bigFiles).toEqual([]);
  });

  it('classifies oversized MEMORY.md as WARN/FAIL by line count', () => {
    const lines = Array(THRESHOLDS.memoryMdHardLines + 5)
      .fill('- entry')
      .join('\n');
    fs.writeFileSync(path.join(tmpDir, 'MEMORY.md'), lines, 'utf8');
    const out = buildReport(tmpDir);
    expect(out.report.index.linesStatus).toBe('FAIL');
  });

  it('detects per-file size FAIL via the perFileHardKB threshold', () => {
    fs.writeFileSync(path.join(tmpDir, 'MEMORY.md'), 'tiny', 'utf8');
    const huge = 'X'.repeat(THRESHOLDS.perFileHardKB * 1024 + 100);
    fs.writeFileSync(path.join(tmpDir, 'project_huge.md'), huge, 'utf8');
    const out = buildReport(tmpDir);
    const oversize = out.report.files.bigFiles.find(f => f.name === 'project_huge.md');
    expect(oversize).toBeDefined();
    expect(oversize.status).toBe('FAIL');
  });
});

describe('check-memory-health — decideExit', () => {
  function mkReport({ linesStatus = 'OK', sizeStatus = 'OK', bigFiles = [], longLines = [] } = {}) {
    return {
      index: { linesStatus, sizeStatus, longLines, lineCount: 100, kb: 50 },
      files: { total: 1, bigFiles, allFiles: [] },
      thresholds: THRESHOLDS,
    };
  }

  it('returns 0 when everything is OK', () => {
    expect(decideExit(mkReport(), false)).toBe(0);
  });

  it('returns 0 on WARN without --strict', () => {
    expect(decideExit(mkReport({ linesStatus: 'WARN' }), false)).toBe(0);
  });

  it('returns 1 on FAIL index lines', () => {
    expect(decideExit(mkReport({ linesStatus: 'FAIL' }), false)).toBe(1);
  });

  it('returns 1 on FAIL index size', () => {
    expect(decideExit(mkReport({ sizeStatus: 'FAIL' }), false)).toBe(1);
  });

  it('returns 1 on FAIL per-file', () => {
    expect(
      decideExit(mkReport({ bigFiles: [{ name: 'x.md', kb: 300, status: 'FAIL' }] }), false)
    ).toBe(1);
  });

  it('promotes WARN to FAIL under --strict', () => {
    expect(decideExit(mkReport({ linesStatus: 'WARN' }), true)).toBe(1);
  });

  it('strict mode fails when long index lines exist', () => {
    expect(decideExit(mkReport({ longLines: [{ idx: 5, len: 250 }] }), true)).toBe(1);
  });

  it('returns 0 when report is null (skipped)', () => {
    expect(decideExit(null, true)).toBe(0);
  });
});

describe('check-memory-health — resolveMemoryDir', () => {
  const ORIG = process.env.CLAUDE_MEMORY_DIR;
  afterEach(() => {
    if (ORIG === undefined) delete process.env.CLAUDE_MEMORY_DIR;
    else process.env.CLAUDE_MEMORY_DIR = ORIG;
  });

  it('honors CLAUDE_MEMORY_DIR env override', () => {
    process.env.CLAUDE_MEMORY_DIR = '/tmp/custom-mem';
    expect(resolveMemoryDir()).toBe(path.resolve('/tmp/custom-mem'));
  });

  it('falls back to the documented slug under ~/.claude/projects/', () => {
    delete process.env.CLAUDE_MEMORY_DIR;
    const r = resolveMemoryDir();
    expect(r).toContain(DEFAULT_MEMORY_DIR_SLUG);
    expect(r).toContain(path.join('.claude', 'projects'));
    expect(r.endsWith('memory') || r.endsWith(path.sep + 'memory')).toBe(true);
  });
});

describe('check-memory-health — CLI exit-code contract', () => {
  let tmpDir;
  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mem-health-cli-'));
  });
  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('exits 0 against an empty (missing-MEMORY.md) dir — soft-skip', () => {
    const r = spawnSync('node', [SCRIPT, `--dir=${tmpDir}`], { encoding: 'utf8', timeout: 30000 });
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/SKIPPED/);
  });

  it('exits 0 + emits valid JSON on a healthy fixture', () => {
    fs.writeFileSync(path.join(tmpDir, 'MEMORY.md'), '- entry 1\n- entry 2\n', 'utf8');
    fs.writeFileSync(path.join(tmpDir, 'project_x.md'), 'small', 'utf8');
    const r = spawnSync('node', [SCRIPT, `--dir=${tmpDir}`, '--json'], {
      encoding: 'utf8',
      timeout: 30000,
    });
    expect(r.status).toBe(0);
    const parsed = JSON.parse(r.stdout);
    expect(parsed.verdict).toBe('CHECKED');
    expect(parsed.report.index.lineCount).toBeGreaterThanOrEqual(2);
  });

  it('exits 1 when MEMORY.md is OVER hard line cap', () => {
    const lines = Array(THRESHOLDS.memoryMdHardLines + 50)
      .fill('- e')
      .join('\n');
    fs.writeFileSync(path.join(tmpDir, 'MEMORY.md'), lines, 'utf8');
    const r = spawnSync('node', [SCRIPT, `--dir=${tmpDir}`], { encoding: 'utf8', timeout: 30000 });
    expect(r.status).toBe(1);
  });

  it('exits 1 when an individual memory file is over hard cap', () => {
    fs.writeFileSync(path.join(tmpDir, 'MEMORY.md'), '- e\n', 'utf8');
    const huge = 'X'.repeat(THRESHOLDS.perFileHardKB * 1024 + 100);
    fs.writeFileSync(path.join(tmpDir, 'project_giant.md'), huge, 'utf8');
    const r = spawnSync('node', [SCRIPT, `--dir=${tmpDir}`], { encoding: 'utf8', timeout: 30000 });
    expect(r.status).toBe(1);
  });

  it('--strict promotes WARN to FAIL (small file just over soft cap)', () => {
    fs.writeFileSync(path.join(tmpDir, 'MEMORY.md'), '- e\n', 'utf8');
    const warnSized = 'X'.repeat((THRESHOLDS.perFileSoftKB + 5) * 1024);
    fs.writeFileSync(path.join(tmpDir, 'project_warn.md'), warnSized, 'utf8');
    // Without strict: exits 0 (WARN only).
    const r1 = spawnSync('node', [SCRIPT, `--dir=${tmpDir}`], { encoding: 'utf8', timeout: 30000 });
    expect(r1.status).toBe(0);
    // With strict: exits 1.
    const r2 = spawnSync('node', [SCRIPT, `--dir=${tmpDir}`, '--strict'], {
      encoding: 'utf8',
      timeout: 30000,
    });
    expect(r2.status).toBe(1);
  });
});
