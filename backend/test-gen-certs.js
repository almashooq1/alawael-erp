#!/usr/bin/env node

/**
 * Generate valid self-signed certificates - Alternative approach
 */

const fs = require('fs');
const path = require('path');
const certsDir = path.join(__dirname, 'certs');

// Ensure certs directory exists
if (!fs.existsSync(certsDir)) {
  fs.mkdirSync(certsDir, { recursive: true });
}

console.log('Generating self-signed SSL certificates...\n');

try {
  // Test if selfsigned works with correct API
  const selfsigned = require('selfsigned');

  const attrs = [{ name: 'commonName', value: 'localhost' }];
  const pems = selfsigned.generate(attrs, { days: 365, keySize: 2048 });

  console.log('DEBUG: pems object keys:', Object.keys(pems));
  console.log('DEBUG: pems.private:', typeof pems.private);
  console.log('DEBUG: pems.cert:', typeof pems.cert);
  console.log('DEBUG: pems.public:', typeof pems.public);

  // The selfsigned API uses 'private' and 'cert'
  if (pems.private && pems.cert) {
    fs.writeFileSync(path.join(certsDir, 'server.key.pem'), pems.private);
    fs.writeFileSync(path.join(certsDir, 'server.cert.pem'), pems.cert);

    console.log('\n✓ Valid self-signed certificates generated successfully!');
    console.log(`  Certificate: ${path.join(certsDir, 'server.cert.pem')}`);
    console.log(`  Private Key: ${path.join(certsDir, 'server.key.pem')}\n`);

    // Verify the files were created
    const certSize = fs.statSync(path.join(certsDir, 'server.cert.pem')).size;
    const keySize = fs.statSync(path.join(certsDir, 'server.key.pem')).size;
    console.log(`✓ Cert size: ${certSize} bytes, Key size: ${keySize} bytes\n`);
  } else {
    throw new Error(`Unexpected selfsigned API result. Keys: ${JSON.stringify(Object.keys(pems))}`);
  }
} catch (error) {
  console.error('Error creating certificate:', error.message);
  console.error('\nStack:', error.stack);
  process.exit(1);
}
