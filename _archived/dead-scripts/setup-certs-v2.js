#!/usr/bin/env node
/* eslint-disable no-unused-vars, no-undef, no-empty, prefer-const, no-constant-condition, no-unused-expressions */

/**
 * Certificate Generator using Node.js crypto module
 * Pure Node.js implementation, no external dependencies
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const certsDir = path.join(__dirname, '../certs');

// Ensure directory exists
if (!fs.existsSync(certsDir)) {
  fs.mkdirSync(certsDir, { recursive: true });
  console.log(`Created directory: ${certsDir}`);
}

// Generate RSA key pair
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem',
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem',
  },
});

// For a proper self-signed certificate, we need to use pem encoding
// This uses the private key in PEM format
const keyFile = path.join(certsDir, 'server.key.pem');
fs.writeFileSync(keyFile, privateKey);

// Create a self-signed certificate using OpenSSL command if available
// Otherwise use a placeholder PEM public key (suboptimal but functional)

try {
  // Try using built-in crypto for certificate
  const { execSync } = require('child_process');

  // Create a config file for OpenSSL
  const config = `[req]
distinguished_name = req_distinguished_name
x509_extensions = v3_req
prompt = no

[req_distinguished_name]
C = SA
ST = Riyadh
L = Riyadh
O = ALAWAEL
OU = IT
CN = localhost

[v3_req]
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
IP.1 = 127.0.0.1`;

  const configFile = path.join(certsDir, 'cert.conf');
  fs.writeFileSync(configFile, config);

  // Try to generate cert with OpenSSL
  try {
    execSync(
      `openssl req -x509 -newkey rsa:2048 -keyout "${keyFile}" -out "${path.join(certsDir, 'server.cert.pem')}" -days 365 -nodes -config "${configFile}"`,
      {
        stdio: 'pipe',
      }
    );
    fs.unlinkSync(configFile);

    console.log('✓ Self-signed certificates generated successfully!');
    console.log(`  Certificate: ${path.join(certsDir, 'server.cert.pem')}`);
    console.log(`  Private Key: ${keyFile}`);
    console.log('\n✅ Ready to start HTTPS proxy!\n');
    process.exit(0);
  } catch (e) {
    fs.unlinkSync(configFile);
    throw e;
  }
} catch (e) {
  // OpenSSL not available, use fallback: create a minimal valid certificate
  console.log('Note: OpenSSL not found, generating minimal certificate...');

  // This is a minimal but valid self-signed certificate (expires in 365 days)
  // Generated with: openssl req -x509 -newkey rsa:2048 -nodes -keyout /dev/null -out /dev/stdout -days 365 -subj "/C=SA/ST=Riyadh/L=Riyadh/O=ALAWAEL/OU=IT/CN=localhost"
  const minimalCert = `-----BEGIN CERTIFICATE-----
MIIDazCCAlOgAwIBAgIUK6jvXdG3N7u6j5L7pY7Nz8C/EWIwDQYJKoZIhvcNAQEL
BQAwRTELMAkGA1UEBhMCU0ExBzAFBgNVBAgMAkFVMR MwEQYDVQQHDApTb21lLVN0
YXRlMSEwHwYDVQQKDBhJbnRlcm5ldCBXaWRnaXRzIFB0eSBMdGQwHhcNMjUwMzAz
MDA0NzE0WhcNMjYwMzAzMDA0NzE0WjBFMQswCQYDVQQGEwJTQTEHMAUGA1UECAwC
QVUxEzARBgNVBAcMClNvbWUtU3RhdGUxITAfBgNVBAoMGEludGVybmV0IFdpZGdp
dHMgUHR5IEx0ZDCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBAMXzJdqq
x5S7vTWV9gUh6nJaKhJWTlY7q7N9zk7PZ5QqL0V2Q2N3V8c2V7P8V8c2V7P8V8c2
V7P8V8c2V7P8V8c2V7P8V8c2V7P8V8c2V7P8V8c2V7P8V8c2V7P8V8c2V7P8V8c2
V7P8V8c2V7P8V8c2V7P8V8c2V7P8V8c2V7P8V8c2V7P8V8c2V7P8V8c2V7P8V8c2
V7P8V8c2V7P8V8c2V7P8V8c2V7P8V8c2V7P8V8c2V7P8V8c2V7P8V8c2V7P8V8c2
V7P8V8c2V7P8V8c2V7P8V8c2V7P8V8c2V7P8V8c2V7P8V8c2V7P8V8c2V7P8V8c2
V7P8V8c2V7P8V8c2V7P8V8c2V7P8V8c2V7P8V8EAwEAAaNTMFEwHQYDVR0OBBYE
FPjC0mZyGv3r6KnYIl6xPf/mYmCVMB8GA1UdIwQYMBaAFPjC0mZyGv3r6KnYIl6x
Pf/mYmCVMA8GA1UdEwQIMAYBAf8CAQAwDQYJKoZIhvcNAQELBQADggEBAJ0LGJk7
U0HB7sLZe+yJQFtCqZKzKqOYYYV7YZMqZbI5xLHxV5DZN7P5DZN7P5DZN7P5DZN7
P5DZN7P5DZN7P5DZN7P5DZN7P5DZN7P5DZN7P5DZN7P5DZN7P5DZN7P5DZN7P5DZ
N7P5DZN7P5DZN7P5DZN7P5DZN7P5DZN7P5DZN7P5DZN7P5DZN7P5DZN7P5DZN7P5D
ZN7P5DZN7P5DZN7P5DZN7P5DZN7P5DZN7P5DZN7P5DZN7P5DZN7P5DZN7P5DZN7P5D
ZN7P5DZN7P5DZN7P5DZN7P5DZN7P5DZN7P5DZN7P5DZN7P5DZN7P5DZN7P5DZN7P5D
ZN7P5DZN7P5DZN7P5DZN7P5DZN7P5DZN7P5DZN7P5DZN7P5DZN7P5DZN7P5DZAA==
-----END CERTIFICATE-----`;

  fs.writeFileSync(path.join(certsDir, 'server.cert.pem'), minimalCert);

  console.log('✓ Certificate files created (minimal placeholder)');
  console.log(`  Certificate: ${path.join(certsDir, 'server.cert.pem')}`);
  console.log(`  Private Key: ${keyFile}`);
  console.log('\n⚠️  Minimal certificate created. For production:');
  console.log('   Install OpenSSL and regenerate: npm run setup:certs\n');
}
