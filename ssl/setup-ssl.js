/**
 * SSL/TLS Certificate Setup
 * إعداد شهادات SSL/TLS
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// ================== Configuration ==================

const SSL_DIR = path.join(__dirname);
const CERT_FILE = path.join(SSL_DIR, 'server.crt');
const KEY_FILE = path.join(SSL_DIR, 'server.key');

const SELF_SIGNED_CONFIG = {
  subject: {
    C: 'SA',
    ST: 'Riyadh',
    L: 'Riyadh',
    O: 'AlAwael Corporation',
    OU: 'IT Department',
    CN: 'localhost',
  },
  validity: 365, // days
  algorithm: 'rsa:2048',
};

// ================== Self-Signed Certificate Generation ==================

/**
 * Generate Self-Signed Certificate (For Development)
 * إنشاء شهادة موقعة ذاتياً (للتطوير)
 */
async function generateSelfSignedCertificate() {
  console.log('🔒 Generating Self-Signed SSL Certificate...\n');

  const subjectString = `/C=${SELF_SIGNED_CONFIG.subject.C}/ST=${SELF_SIGNED_CONFIG.subject.ST}/L=${SELF_SIGNED_CONFIG.subject.L}/O=${SELF_SIGNED_CONFIG.subject.O}/OU=${SELF_SIGNED_CONFIG.subject.OU}/CN=${SELF_SIGNED_CONFIG.subject.CN}`;

  const command = `openssl req -x509 -newkey ${SELF_SIGNED_CONFIG.algorithm} -keyout ${KEY_FILE} -out ${CERT_FILE} -days ${SELF_SIGNED_CONFIG.validity} -nodes -subj "${subjectString}"`;

  try {
    const { stdout, stderr } = await execAsync(command);
    if (stderr && !stderr.includes('error')) {
      console.log(stderr);
    }
    console.log('✅ Certificate generated successfully!\n');
    return true;
  } catch (error) {
    console.error('❌ Error generating certificate:', error.message);
    return false;
  }
}

/**
 * Check if certificates already exist
 * التحقق من وجود شهادات موجودة
 */
function certificatesExist() {
  return fs.existsSync(CERT_FILE) && fs.existsSync(KEY_FILE);
}

/**
 * Display Certificate Information
 * عرض معلومات الشهادة
 */
async function displayCertificateInfo() {
  if (!certificatesExist()) {
    console.log('❌ Certificates not found');
    return;
  }

  console.log('📋 Certificate Information:\n');

  try {
    const { stdout } = await execAsync(`openssl x509 -in ${CERT_FILE} -text -noout`);
    console.log(stdout);
  } catch (error) {
    console.error('Error reading certificate:', error.message);
  }
}

/**
 * Check Certificate Expiration
 * التحقق من تاريخ انتهاء الشهادة
 */
async function checkCertificateExpiration() {
  if (!certificatesExist()) {
    return null;
  }

  try {
    const { stdout } = await execAsync(`openssl x509 -in ${CERT_FILE} -noout -dates`);
    return stdout.trim();
  } catch (error) {
    console.error('Error checking expiration:', error.message);
    return null;
  }
}

/**
 * Convert to PKCS12 Format (For Browser Import)
 * تحويل إلى تنسيق PKCS12 (لاستيراد المتصفح)
 */
async function convertToPKCS12(password = 'alawael-pass') {
  const pkcsFile = path.join(SSL_DIR, 'certificate.p12');

  console.log('🔄 Converting to PKCS12 format...\n');

  const command = `openssl pkcs12 -export -in ${CERT_FILE} -inkey ${KEY_FILE} -out ${pkcsFile} -name "AlAwael Certificate" -passout pass:${password}`;

  try {
    await execAsync(command);
    console.log(`✅ PKCS12 certificate created: ${pkcsFile}`);
    console.log(`   Password: ${password}\n`);
    return true;
  } catch (error) {
    console.error('❌ Error converting certificate:', error.message);
    return false;
  }
}

/**
 * Create Environment File for HTTPS
 * إنشاء ملف البيئة لـ HTTPS
 */
function createHttpsEnvFile() {
  const envContent = `# SSL/TLS Configuration
SSL_ENABLED=true
SSL_CERT_PATH=${CERT_FILE}
SSL_KEY_PATH=${KEY_FILE}
HTTPS_PORT=3443
HTTP_REDIRECT_HTTPS=true

# Certificate Renewal
CERT_AUTO_RENEW=true
CERT_CHECK_INTERVAL=86400
`;

  const envFilePath = path.join(__dirname, '../.env.https');

  fs.writeFileSync(envFilePath, envContent);
  console.log(`✅ HTTPS environment file created: ${envFilePath}\n`);
}

/**
 * Create HTTPS Server Configuration
 * إنشاء تكوين خادم HTTPS
 */
function createHttpsServerConfig() {
  const configContent = `/**
 * HTTPS Server Configuration
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const sslOptions = {
  key: fs.readFileSync(process.env.SSL_KEY_PATH),
  cert: fs.readFileSync(process.env.SSL_CERT_PATH),
  // For production, add additional security options:
  secureOptions: 
    require('constants').SSL_OP_NO_SSLv3 |
    require('constants').SSL_OP_NO_TLSv1
};

module.exports = sslOptions;
`;

  const configPath = path.join(__dirname, '../config/https.js');
  fs.writeFileSync(configPath, configContent);
  console.log(`✅ HTTPS server config created: ${configPath}\n`);
}

/**
 * Generate Let's Encrypt Certificate (Production)
 * إنشاء شهادة Let's Encrypt (الإنتاج)
 */
async function generateLetsEncryptCertificate(domain, email) {
  console.log("🔒 Generating Let's Encrypt Certificate...\n");

  // Check if certbot is installed
  try {
    await execAsync('certbot --version');
  } catch (error) {
    console.error('❌ Certbot is not installed. Please install it first.');
    console.log('   Windows: choco install certbot');
    console.log('   Linux: sudo apt-get install certbot');
    return false;
  }

  const command = `certbot certonly --standalone -d ${domain} -m ${email} --agree-tos --non-interactive`;

  try {
    const { stdout } = await execAsync(command);
    console.log(stdout);
    console.log("✅ Let's Encrypt certificate generated successfully!\n");
    return true;
  } catch (error) {
    console.error("❌ Error generating Let's Encrypt certificate:", error.message);
    return false;
  }
}

/**
 * Main Setup Function
 */
async function setupSSL() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║          🔒 SSL/TLS CERTIFICATE SETUP WIZARD 🔒               ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  // Check if OpenSSL is installed
  try {
    await execAsync('openssl version');
  } catch (error) {
    console.error('❌ OpenSSL is not installed. Please install it first.');
    process.exit(1);
  }

  // Check existing certificates
  if (certificatesExist()) {
    console.log('✅ Certificates already exist:\n');
    const expirationInfo = await checkCertificateExpiration();
    console.log(expirationInfo);
    console.log('\n');

    console.log('Options:');
    console.log('1. View certificate information');
    console.log('2. Regenerate certificates');
    console.log('3. Convert to PKCS12');
    console.log('4. Exit\n');

    // For automation, default to option 4
    console.log('Using existing certificates...\n');
  } else {
    console.log('No existing certificates found.\n');
    console.log('Certificate Type:');
    console.log('1. Self-Signed (Development) - Fast & Local');
    console.log("2. Let's Encrypt (Production) - Browser Trusted\n");

    // For automation, use self-signed
    console.log('Generating Self-Signed Certificate...\n');
    await generateSelfSignedCertificate();
  }

  // Create environment files
  createHttpsEnvFile();
  createHttpsServerConfig();

  // Display results
  console.log('📁 Generated Files:\n');
  console.log(`   ✓ Certificate: ${CERT_FILE}`);
  console.log(`   ✓ Private Key: ${KEY_FILE}`);
  console.log(`   ✓ Config File: ${path.join(__dirname, '../config/https.js')}`);
  console.log(`   ✓ Env File: ${path.join(__dirname, '../.env.https')}\n`);

  console.log('🚀 Next Steps:\n');
  console.log('1. Update your server.js to use HTTPS:');
  console.log("   const https = require('https');");
  console.log("   const sslOptions = require('./config/https');");
  console.log('   https.createServer(sslOptions, app).listen(3443);\n');

  console.log('2. Add to Docker: -p 3443:3443\n');

  console.log('3. For browser access:');
  console.log('   https://localhost:3443\n');

  console.log('✅ SSL/TLS Setup Complete!\n');
}

// ================== CLI Interface ==================

if (require.main === module) {
  const args = process.argv.slice(2);

  switch (args[0]) {
    case 'generate':
      generateSelfSignedCertificate();
      break;

    case 'info':
      displayCertificateInfo();
      break;

    case 'check':
      checkCertificateExpiration().then(info => {
        if (info) console.log(info);
      });
      break;

    case 'pkcs12':
      convertToPKCS12(args[1] || 'alawael-pass');
      break;

    case 'letsencrypt':
      generateLetsEncryptCertificate(args[1], args[2]);
      break;

    case 'setup':
      setupSSL();
      break;

    default:
      setupSSL();
  }
}

module.exports = {
  generateSelfSignedCertificate,
  certificatesExist,
  displayCertificateInfo,
  checkCertificateExpiration,
  convertToPKCS12,
  createHttpsEnvFile,
  createHttpsServerConfig,
  generateLetsEncryptCertificate,
  setupSSL,
  SSL_DIR,
  CERT_FILE,
  KEY_FILE,
};
