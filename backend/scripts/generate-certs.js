#!/usr/bin/env node
/* eslint-disable no-unused-vars */

/**
 * SSL Certificate Generator for ALAWAEL ERP
 *
 * Generates self-signed certificates for development/staging
 * or prepares Let's Encrypt integration for production
 *
 * Usage:
 *   node scripts/generate-certs.js
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const CERTS_DIR = path.join(__dirname, '../certs');
const CERT_FILE = path.join(CERTS_DIR, 'server.cert.pem');
const KEY_FILE = path.join(CERTS_DIR, 'server.key.pem');

console.log('\n╔════════════════════════════════════════╗');
console.log('║  SSL Certificate Generation - ALAWAEL  ║');
console.log('╚════════════════════════════════════════╝\n');

// Ensure certs directory exists
if (!fs.existsSync(CERTS_DIR)) {
  fs.mkdirSync(CERTS_DIR, { recursive: true });
  console.log(`✓ Created directory: ${CERTS_DIR}`);
}

// Check if certs already exist
if (fs.existsSync(CERT_FILE) && fs.existsSync(KEY_FILE)) {
  console.log('✓ Certificates already exist:');
  console.log(`  Certificate: ${CERT_FILE}`);
  console.log(`  Private Key: ${KEY_FILE}`);

  // Check expiration
  const cmd = `openssl x509 -in "${CERT_FILE}" -text -noout`;
  console.log('\nTo view certificate details:');
  console.log(`  ${cmd}`);
  process.exit(0);
}

console.log('Generating self-signed SSL certificates...\n');

// Generate self-signed certificate using Node.js crypto
function generateSelfSignedCert() {
  const crypto = require('crypto');

  // Generate key pair
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
  });

  // Create certificate
  const cert = crypto.createSecureContext({
    key: privateKey,
    cert: publicKey,
  });

  // Export keys to PEM format
  const keyPem = crypto.createPrivateKey(privateKey).export({
    format: 'pem',
    type: 'pkcs8',
  });

  const certPem = crypto.createPublicKey(publicKey).export({
    format: 'pem',
    type: 'spki',
  });

  // For self-signed, we need to use a different approach
  // Use the built-in Node.js approach with OpenSSL command line
  generateWithOpenSSL();
}

function generateWithOpenSSL() {
  // Build OpenSSL command for self-signed certificate
  const subject =
    '/C=SA/ST=Riyadh/L=Riyadh/O=ALAWAEL/OU=IT/CN=localhost/emailAddress=admin@alawael.local';
  const days = '365';

  // Windows compatibility: use openssl directly or use Node.js native
  const opensslCmd = `openssl req -x509 -newkey rsa:2048 -keyout "${KEY_FILE}" -out "${CERT_FILE}" -days ${days} -nodes -subj "${subject}"`;

  console.log(`Executing: ${opensslCmd}\n`);

  // Try with OpenSSL command line
  try {
    const { execSync } = require('child_process');
    execSync(opensslCmd, { shell: true, stdio: 'inherit' });

    if (fs.existsSync(CERT_FILE) && fs.existsSync(KEY_FILE)) {
      console.log('\n✓ Certificates generated successfully!');
      console.log(`  Certificate: ${CERT_FILE}`);
      console.log(`  Private Key: ${KEY_FILE}`);
      console.log('\n📋 Certificate Details:');

      try {
        const verifyCmd = `openssl x509 -in "${CERT_FILE}" -text -noout`;
        const { execSync: exec } = require('child_process');
        const details = exec(verifyCmd, { shell: true, encoding: 'utf-8' });
        console.log(details.split('\n').slice(0, 10).join('\n'));
        console.log('   ...\n');
      } catch (e) {
        console.log('(Use openssl to view details)\n');
      }

      console.log('⚠️  IMPORTANT:');
      console.log('   - This is a self-signed certificate (DEV/STAGING ONLY)');
      console.log('   - Browsers will show security warnings');
      console.log("   - For production, use Let's Encrypt certificates");
      console.log('   - See IMPLEMENTATION_1_HTTPS_DEPLOYMENT.md for details\n');

      process.exit(0);
    }
  } catch (error) {
    console.error('✗ OpenSSL command failed:', error.message);
    console.log('\nAlternative: Using PowerShell on Windows...\n');
    generateWithPowerShell();
  }
}

function generateWithPowerShell() {
  // Windows PowerShell approach using New-SelfSignedCertificate
  if (process.platform !== 'win32') {
    console.error('✗ OpenSSL not available and not on Windows. Please install OpenSSL.');
    process.exit(1);
  }

  console.log('Using PowerShell to generate self-signed certificate...\n');

  const psScript = `
    try {
      $cert = New-SelfSignedCertificate -CertStoreLocation "Cert:\\CurrentUser\\My" -Subject "CN=localhost" -NotAfter (Get-Date).AddYears(1)
      
      # Export certificate
      $certPath = "${CERT_FILE}".Replace('\\', '\\\\')
      $keyPath = "${KEY_FILE}".Replace('\\', '\\\\')
      
      [System.IO.File]::WriteAllBytes($certPath, $cert.Export([System.Security.Cryptography.X509Certificates.X509ContentType]::Cert))
      Write-Host "Generated: $certPath"
      Write-Host "Generated: $keyPath"
      Write-Host "Note: Windows stores private key in certificate store, not as separate file"
    } catch {
      Write-Host "Error: $_"
      exit 1
    }
  `;

  fs.writeFileSync('temp-cert-gen.ps1', psScript);

  const { execSync } = require('child_process');
  try {
    execSync(`powershell -ExecutionPolicy Bypass -File temp-cert-gen.ps1`, {
      shell: true,
      stdio: 'inherit',
    });
    fs.unlinkSync('temp-cert-gen.ps1');

    console.log('\n✓ Using system certificate store (Windows)\n');
    process.exit(0);
  } catch (error) {
    console.error('✗ PowerShell generation failed:', error.message);
    fs.unlinkSync('temp-cert-gen.ps1');
    process.exit(1);
  }
}

// Check if OpenSSL is available
const { execSync } = require('child_process');
try {
  execSync('openssl version', { stdio: 'ignore' });
  generateWithOpenSSL();
} catch (e) {
  if (process.platform === 'win32') {
    generateWithPowerShell();
  } else {
    console.error('✗ OpenSSL not found. Please install OpenSSL:');
    console.error('  Ubuntu/Debian: apt-get install openssl');
    console.error('  macOS: brew install openssl');
    process.exit(1);
  }
}
