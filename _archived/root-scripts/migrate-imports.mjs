/**
 * R43 — Normalize relative imports (../) to absolute imports
 * jsconfig.json has baseUrl: "src", so 'services/api.client' resolves to src/services/api.client
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.join(__dirname, 'frontend', 'src');

function findFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.name === '_archive' || entry.name === 'node_modules') continue;
    if (entry.isDirectory()) {
      files.push(...findFiles(fullPath));
    } else if (/\.(js|jsx)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const fileDir = path.dirname(filePath);
  const relToSrc = path.relative(srcDir, fileDir).replace(/\\/g, '/');

  let changes = [];
  const newContent = content.replace(/from '(\.\.\/[^']+)'/g, (match, relImport) => {
    const resolved = path.posix.normalize(path.posix.join(relToSrc, relImport));
    changes.push(`  ${relImport} → ${resolved}`);
    return `from '${resolved}'`;
  });

  if (changes.length > 0) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    const shortPath = path.relative(srcDir, filePath).replace(/\\/g, '/');
    console.log(`✅ ${shortPath} (${changes.length} imports)`);
    changes.forEach(c => console.log(c));
    return changes.length;
  }
  return 0;
}

const files = findFiles(srcDir);
let totalFiles = 0;
let totalImports = 0;

for (const f of files) {
  const count = processFile(f);
  if (count > 0) {
    totalFiles++;
    totalImports += count;
  }
}

console.log(`\n📊 Migrated ${totalImports} relative imports across ${totalFiles} files`);
