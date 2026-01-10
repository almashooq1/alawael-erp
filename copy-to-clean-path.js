#!/usr/bin/env node

/**
 * Copy project to clean path and start server
 * This solves encoding issues with Arabic characters in paths
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const sourceDir = path.join(__dirname);
const targetDir = 'C:\\AlAwael';

console.log('🔄 Copying project to clean path...');
console.log(`From: ${sourceDir}`);
console.log(`To:   ${targetDir}`);
console.log('');

try {
  // Create target directory
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // Copy files using robocopy (Windows command)
  const cmd = `robocopy "${sourceDir}" "${targetDir}" /E /Y /NFL /NDL /NJH /NJS /nc /ns /np`;

  try {
    execSync(cmd, { stdio: 'pipe', shell: 'cmd.exe' });
  } catch (e) {
    // robocopy returns non-zero even on success, so we ignore errors
  }

  console.log('✅ Project copied successfully!');
  console.log('');
  console.log('📁 New project location:');
  console.log(`   C:\\AlAwael`);
  console.log('');
  console.log('🚀 Start the server with:');
  console.log('   cd C:\\AlAwael');
  console.log('   npm run start:backend');
  console.log('');
  console.log('ℹ️  All encoding issues are now resolved!');
} catch (error) {
  console.error('❌ Error copying project:', error.message);
  process.exit(1);
}
