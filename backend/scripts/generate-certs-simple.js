#!/usr/bin/env node
/* eslint-disable no-unused-vars */

/**
 * Self-Signed Certificate Generator for ALAWAEL
 * Uses Node.js crypto module - platform independent
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

const CERTS_DIR = path.join(__dirname, '../certs');
const CERT_FILE = path.join(CERTS_DIR, 'server.cert.pem');
const KEY_FILE = path.join(CERTS_DIR, 'server.key.pem');

// Ensure directory exists
if (!fs.existsSync(CERTS_DIR)) {
  fs.mkdirSync(CERTS_DIR, { recursive: true });
}

// Check if already generated
if (fs.existsSync(CERT_FILE) && fs.existsSync(KEY_FILE)) {
  console.log('✓ Certificates already exist');
  console.log(`  Cert: ${CERT_FILE}`);
  console.log(`  Key:  ${KEY_FILE}`);
  process.exit(0);
}

console.log('Generating self-signed certificates...\n');

// Simple approach: Create a temporary OpenSSL config and use it if OpenSSL available
// Otherwise, create dummy cert files (they will be replaced during Let's Encrypt setup)

const config = `
[req]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = dn
x509_extensions = v3_req

[dn]
C=SA
ST=Riyadh
L=Riyadh
O=ALAWAEL
OU=IT
emailAddress=admin@alawael.local
CN=localhost

[v3_req]
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = 127.0.0.1
DNS.3 = *.alawael.local
IP.1 = 127.0.0.1
`;

// Write config to temp file
const configFile = path.join(CERTS_DIR, 'cert.conf');
fs.writeFileSync(configFile, config);

// Try OpenSSL first
try {
  execSync(
    `openssl req -x509 -newkey rsa:2048 -keyout "${KEY_FILE}" -out "${CERT_FILE}" -days 365 -nodes -config "${configFile}"`,
    {
      shell: true,
      stdio: 'pipe',
    }
  );

  fs.unlinkSync(configFile);
  console.log('✓ Certificates generated with OpenSSL');
  console.log(`  Certificate: ${CERT_FILE}`);
  console.log(`  Private Key: ${KEY_FILE}`);
  console.log('\n⚠️  Self-signed certificate (valid for 365 days)');
  console.log("   For production, use Let's Encrypt (see IMPLEMENTATION_1_HTTPS_DEPLOYMENT.md)\n");
  process.exit(0);
} catch (e) {
  // OpenSSL not available, use alternative
  console.log('OpenSSL not found, using alternative method...\n');
  fs.unlinkSync(configFile);
}

// Alternative: Use Node.js to generate, then use PowerShell on Windows
if (process.platform === 'win32') {
  // Try WSL if available
  try {
    execSync('where wsl', { stdio: 'ignore' });
    console.log('Using WSL to generate certificates...\n');
    execSync(
      `wsl openssl req -x509 -newkey rsa:2048 -keyout /tmp/server.key.pem -out /tmp/server.cert.pem -days 365 -nodes -subj "/C=SA/ST=Riyadh/L=Riyadh/O=ALAWAEL/OU=IT/CN=localhost"`,
      { shell: true, stdio: 'inherit' }
    );

    // Copy from WSL to Windows
    const wslKeyPath = '/tmp/server.key.pem';
    const wslCertPath = '/tmp/server.cert.pem';
    execSync(`wsl cat ${wslKeyPath} > "${KEY_FILE}"`, { shell: true });
    execSync(`wsl cat ${wslCertPath} > "${CERT_FILE}"`, { shell: true });

    console.log('\n✓ Certificates generated with WSL');
    process.exit(0);
  } catch (e) {
    // No WSL either
  }

  // Last resort: Create placeholder files and show instructions
  console.log('⚠️  Cannot auto-generate certificates');
  console.log('\nPlease generate manually on Windows:');
  console.log('\n1. Install OpenSSL for Windows:');
  console.log('   https://slproweb.com/products/Win32OpenSSL.html');
  console.log('   (Choose "Win64 OpenSSL v3.x")');
  console.log('\n2. After installation, run:');
  console.log(
    `   openssl req -x509 -newkey rsa:2048 -keyout "${KEY_FILE}" -out "${CERT_FILE}" -days 365 -nodes -subj "/C=SA/ST=Riyadh/L=Riyadh/O=ALAWAEL/OU=IT/CN=localhost"`
  );
  console.log('\n3. Or use PowerShell (admin):');
  console.log(
    '   $cert = New-SelfSignedCertificate -DnsName localhost,127.0.0.1 -CertStoreLocation "Cert:\\CurrentUser\\My"'
  );
  console.log('   Export-Certificate -Cert $cert -FilePath "' + CERT_FILE + '"');
  console.log('\nOr proceed with testing on http://localhost:3001 for now.');
  process.exit(1);
}

console.log('Generating using Node.js crypto...\n');

// Generate keys using Node.js crypto
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

fs.writeFileSync(KEY_FILE, privateKey);
fs.writeFileSync(CERT_FILE, publicKey);

console.log('✓ Generated key pair (Note: Public key format, not full certificate)');
console.log(`  Files created in: ${CERTS_DIR}`);
console.log('\n⚠️  This is a partial implementation. For full HTTPS:');
console.log('   1. Install OpenSSL and regenerate proper certificate');
console.log('   2. Or use WSL if available');
console.log("   3. Or obtain Let's Encrypt certificate (production)\n");
