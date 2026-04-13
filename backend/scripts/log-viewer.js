#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════
 * Al-Awael ERP — Log Viewer & Analyzer
 * نظام الأوائل — عارض السجلات
 * ════════════════════════════════════════════════════════════════
 *
 * Usage:
 *   node scripts/log-viewer.js                       # Show latest logs
 *   node scripts/log-viewer.js --level=error         # Filter by level
 *   node scripts/log-viewer.js --tail=50             # Last N lines
 *   node scripts/log-viewer.js --search="keyword"    # Search in logs
 *   node scripts/log-viewer.js --stats               # Log statistics
 *   node scripts/log-viewer.js --file=error.log      # Specific log file
 */

const fs = require('fs');
const path = require('path');

const C = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  magenta: '\x1b[35m',
};

const ROOT = path.resolve(__dirname, '..');
const LOGS_DIR = path.join(ROOT, 'logs');
const args = process.argv.slice(2);

// Parse arguments
function getArg(name, defaultVal = null) {
  const arg = args.find(a => a.startsWith(`--${name}=`));
  return arg ? arg.split('=').slice(1).join('=') : defaultVal;
}

const level = getArg('level');
const tail = parseInt(getArg('tail', '100'), 10);
const search = getArg('search');
const showStats = args.includes('--stats');
const fileName = getArg('file');

// ─── Level Colors ───────────────────────────────────────────────────────────
const levelColors = {
  error: C.red,
  warn: C.yellow,
  info: C.green,
  debug: C.cyan,
  verbose: C.dim,
  http: C.magenta,
};

function colorLevel(lvl) {
  const color = levelColors[lvl?.toLowerCase()] || C.reset;
  return `${color}${lvl?.toUpperCase()?.padEnd(7)}${C.reset}`;
}

// ─── Read Log File ──────────────────────────────────────────────────────────
function readLogLines(filePath, maxLines = 1000) {
  if (!fs.existsSync(filePath)) return [];

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n').filter(Boolean);

  // Take the last N lines
  return lines.slice(-maxLines);
}

// ─── Parse Log Line ─────────────────────────────────────────────────────────
function parseLogLine(line) {
  // Try JSON format (pino/winston)
  try {
    const obj = JSON.parse(line);
    return {
      timestamp: obj.time || obj.timestamp || obj.ts,
      level: obj.level || obj.severity || 'info',
      message: obj.msg || obj.message || JSON.stringify(obj),
      raw: line,
      parsed: true,
    };
  } catch {
    /* not JSON */
  }

  // Try standard format: [2024-01-01 12:00:00] [INFO] message
  const stdMatch = line.match(
    /\[?(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}[^\]]*)\]?\s*\[?(error|warn|info|debug|verbose|http)\]?\s*(.*)/i
  );
  if (stdMatch) {
    return {
      timestamp: stdMatch[1],
      level: stdMatch[2].toLowerCase(),
      message: stdMatch[3],
      raw: line,
      parsed: true,
    };
  }

  return { timestamp: null, level: null, message: line, raw: line, parsed: false };
}

// ─── Get Log Files ──────────────────────────────────────────────────────────
function getLogFiles() {
  if (!fs.existsSync(LOGS_DIR)) return [];

  return fs
    .readdirSync(LOGS_DIR)
    .filter(f => f.endsWith('.log') || f.endsWith('.txt'))
    .map(f => {
      const fullPath = path.join(LOGS_DIR, f);
      const stat = fs.statSync(fullPath);
      return {
        name: f,
        path: fullPath,
        size: stat.size,
        modified: stat.mtime,
      };
    })
    .sort((a, b) => b.modified - a.modified);
}

// ─── Stats Mode ─────────────────────────────────────────────────────────────
function showLogStats() {
  const files = getLogFiles();

  console.log(`\n${C.bold}${C.cyan}📊 Log Statistics${C.reset}\n`);

  if (files.length === 0) {
    console.log(`  ${C.yellow}No log files found in ${LOGS_DIR}${C.reset}\n`);
    return;
  }

  let totalSize = 0;
  const levelCounts = { error: 0, warn: 0, info: 0, debug: 0, http: 0, other: 0 };

  console.log(`${C.bold}  Log Files:${C.reset}`);
  for (const f of files) {
    totalSize += f.size;
    const sizeStr = formatSize(f.size);
    const age = timeSince(f.modified);
    console.log(
      `    ${C.cyan}${f.name.padEnd(30)}${C.reset} ${sizeStr.padStart(10)}  ${C.dim}(${age})${C.reset}`
    );

    // Count levels
    const lines = readLogLines(f.path, 10000);
    for (const line of lines) {
      const parsed = parseLogLine(line);
      if (parsed.level && levelCounts[parsed.level] !== undefined) {
        levelCounts[parsed.level]++;
      } else {
        levelCounts.other++;
      }
    }
  }

  console.log(`\n  ${C.bold}Total Size: ${formatSize(totalSize)}${C.reset}`);
  console.log(`\n${C.bold}  Level Distribution:${C.reset}`);

  const total = Object.values(levelCounts).reduce((a, b) => a + b, 0);
  for (const [lvl, count] of Object.entries(levelCounts)) {
    if (count === 0) continue;
    const pct = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
    const bar = '█'.repeat(Math.ceil((count / Math.max(...Object.values(levelCounts))) * 30));
    const color = levelColors[lvl] || C.dim;
    console.log(
      `    ${color}${lvl.padEnd(8)}${C.reset} ${String(count).padStart(6)} (${String(pct).padStart(5)}%) ${color}${bar}${C.reset}`
    );
  }
  console.log('');
}

function formatSize(bytes) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function timeSince(date) {
  const ms = Date.now() - date.getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ═══════════════════════════════════════════════════════════════════════════════
function main() {
  if (!fs.existsSync(LOGS_DIR)) {
    console.log(`\n${C.yellow}⚠️  Logs directory not found: ${LOGS_DIR}${C.reset}`);
    console.log(`${C.cyan}Create it with: mkdir logs${C.reset}\n`);
    process.exit(0);
  }

  if (showStats) {
    showLogStats();
    return;
  }

  // Determine which log file to read
  let logFile;
  if (fileName) {
    logFile = path.join(LOGS_DIR, fileName);
    if (!fs.existsSync(logFile)) {
      console.log(`\n${C.red}❌ File not found: ${fileName}${C.reset}\n`);
      process.exit(1);
    }
  } else {
    const files = getLogFiles();
    if (files.length === 0) {
      console.log(`\n${C.yellow}No log files found.${C.reset}\n`);
      process.exit(0);
    }
    logFile = files[0].path;
  }

  console.log(`\n${C.bold}${C.cyan}📋 Log Viewer — ${path.basename(logFile)}${C.reset}\n`);

  const lines = readLogLines(logFile, tail * 2); // Read more to allow filtering
  let output = [];

  for (const line of lines) {
    const parsed = parseLogLine(line);

    // Filter by level
    if (level && parsed.level && parsed.level !== level.toLowerCase()) continue;

    // Filter by search
    if (search && !line.toLowerCase().includes(search.toLowerCase())) continue;

    // Format output
    if (parsed.parsed) {
      const ts = parsed.timestamp
        ? `${C.dim}${String(parsed.timestamp).slice(0, 23)}${C.reset} `
        : '';
      output.push(`${ts}${colorLevel(parsed.level)} ${parsed.message}`);
    } else {
      output.push(`${C.dim}${line}${C.reset}`);
    }
  }

  // Apply tail limit
  output = output.slice(-tail);

  if (output.length === 0) {
    console.log(`  ${C.yellow}No matching log entries found.${C.reset}\n`);
  } else {
    console.log(
      `  ${C.dim}Showing last ${output.length} entries${search ? ` matching "${search}"` : ''}${level ? ` [${level}]` : ''}${C.reset}\n`
    );
    output.forEach(l => console.log(`  ${l}`));
  }

  console.log('');
}

main();
