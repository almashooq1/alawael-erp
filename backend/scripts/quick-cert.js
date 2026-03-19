#!/usr/bin/env node
/* eslint-disable no-unused-vars */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const certsDir = path.join(__dirname, '../certs');
const keyFile = path.join(certsDir, 'server.key.pem');
const certFile = path.join(certsDir, 'server.cert.pem');

if (!fs.existsSync(certsDir)) {
  fs.mkdirSync(certsDir, { recursive: true });
}

if (fs.existsSync(keyFile) && fs.existsSync(certFile)) {
  console.log('✓ Certificates already exist');
  process.exit(0);
}

try {
  execSync(
    `openssl req -x509 -newkey rsa:2048 -nodes -sha256 -days 3650 -keyout "${keyFile}" -out "${certFile}" -subj "/C=US/ST=Dev/L=Local/O=SCM/CN=localhost"`,
    { stdio: 'ignore' }
  );
  console.log('✓ Development certificates generated');
  console.log(`  - ${keyFile}`);
  console.log(`  - ${certFile}`);
} catch (error) {
  console.error('✗ Failed to generate certificates with OpenSSL.');
  console.error('Install OpenSSL and run this script again.');
  process.exit(1);
}
