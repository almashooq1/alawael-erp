#!/usr/bin/env node

/**
 * Certificate Generator using Selfsigned Package
 * Standalone script to generate HTTPS certificates
 */

const path = require('path');
const fs = require('fs');

try {
  const selfsigned = require('selfsigned');

  const attrs = [{ name: 'commonName', value: 'localhost' }];
  const { private: privateKey, cert } = selfsigned.generate(attrs, {
    days: 365,
    keySize: 2048,
    algorithm: 'sha256',
  });

  const certsDir = path.join(__dirname, '../certs');
  if (!fs.existsSync(certsDir)) {
    fs.mkdirSync(certsDir, { recursive: true });
  }

  if (!cert || !privateKey) {
    throw new Error('Certificate generation failed - missing cert or key data');
  }

  fs.writeFileSync(path.join(certsDir, 'server.cert.pem'), cert);
  fs.writeFileSync(path.join(certsDir, 'server.key.pem'), privateKey);

  console.log('✓ Self-signed certificates generated successfully!');
  console.log(`  Certificate: ${path.join(certsDir, 'server.cert.pem')}`);
  console.log(`  Private Key: ${path.join(certsDir, 'server.key.pem')}`);
  console.log(
    '\n✅ Ready to start HTTPS proxy with: pm2 start https-proxy.js --name alawael-https\n'
  );
} catch (error) {
  if (error.code === 'MODULE_NOT_FOUND') {
    console.error('selfsigned package not found.');
    console.error('Install it with: npm install selfsigned');
    process.exit(1);
  }
  console.error('Error generating certificates:', error.message);
  process.exit(1);
}
