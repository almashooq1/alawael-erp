/**
 * Sync English translations to match Arabic structure
 * Reads ar.json, preserves existing en.json values, fills missing keys
 * with English placeholders derived from the key names.
 *
 * Usage: node scripts/sync-en-translations.js [--write]
 */

const fs = require('fs');
const path = require('path');

const WRITE = process.argv.includes('--write');
const AR_PATH = path.resolve(__dirname, '..', 'src', 'locales', 'ar.json');
const EN_PATH = path.resolve(__dirname, '..', 'src', 'locales', 'en.json');

const ar = JSON.parse(fs.readFileSync(AR_PATH, 'utf8'));
const en = JSON.parse(fs.readFileSync(EN_PATH, 'utf8'));

/**
 * Convert camelCase/dot key to readable English:
 *   "sidebar.employees" → "Employees"
 *   "markAllRead" → "Mark All Read"
 *   "noNotifications" → "No Notifications"
 */
function keyToLabel(key) {
  const lastPart = key.includes('.') ? key.split('.').pop() : key;
  return lastPart
    .replace(/([A-Z])/g, ' $1') // camelCase → words
    .replace(/[_-]/g, ' ') // snake/kebab → words
    .replace(/^\s+/, '') // trim leading
    .replace(/\b\w/g, c => c.toUpperCase()) // capitalize
    .trim();
}

/**
 * Deep-merge AR structure into EN, keeping existing EN values
 */
function syncObject(arObj, enObj, prefix = '') {
  const result = {};
  let added = 0;

  for (const key of Object.keys(arObj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (typeof arObj[key] === 'object' && arObj[key] !== null && !Array.isArray(arObj[key])) {
      const { merged, count } = syncObject(arObj[key], typeof enObj[key] === 'object' ? enObj[key] : {}, fullKey);
      result[key] = merged;
      added += count;
    } else {
      if (key in enObj && enObj[key] !== '') {
        result[key] = enObj[key]; // keep existing
      } else {
        result[key] = keyToLabel(fullKey);
        added++;
      }
    }
  }

  // Keep any extra EN keys not in AR
  for (const key of Object.keys(enObj)) {
    if (!(key in result)) {
      result[key] = enObj[key];
    }
  }

  return { merged: result, count: added };
}

const { merged, count } = syncObject(ar, en);

console.log(`=== EN Translation Sync ===`);
console.log(`AR keys: ${flatCount(ar)}`);
console.log(`EN keys (before): ${flatCount(en)}`);
console.log(`EN keys (after): ${flatCount(merged)}`);
console.log(`Added: ${count} new English translations`);

function flatCount(obj) {
  let c = 0;
  for (const v of Object.values(obj)) {
    if (typeof v === 'object' && v !== null) c += flatCount(v);
    else c++;
  }
  return c;
}

if (WRITE) {
  fs.writeFileSync(EN_PATH, JSON.stringify(merged, null, 2) + '\n', 'utf8');
  console.log(`\n✅ Written to ${EN_PATH}`);
} else {
  console.log(`\n🔍 Dry run — use --write to save changes`);
  console.log('\nFirst 20 new keys:');
  const newKeys = [];
  function findNew(arObj, enObj, prefix = '') {
    for (const key of Object.keys(arObj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (typeof arObj[key] === 'object' && arObj[key] !== null) {
        findNew(arObj[key], typeof enObj[key] === 'object' ? enObj[key] : {}, fullKey);
      } else if (!(key in enObj) || enObj[key] === '') {
        newKeys.push(fullKey);
      }
    }
  }
  findNew(ar, en);
  newKeys.slice(0, 20).forEach(k => console.log(`  + ${k}: "${keyToLabel(k)}"`));
  if (newKeys.length > 20) console.log(`  ... and ${newKeys.length - 20} more`);
}
