# PHASE 1: HTTPS/TLS Implementation - Quick Start Guide
# ALAWAEL ERP Production System
# Windows Compatible Edition

## STATUS: HTTPS Proxy Framework Ready ✅

Your system is prepared for HTTPS/TLS. Now we need SSL certificates.

---

## QUICK START (5 minutes)

### Option A: Using `mkcert` (Recommended - Easiest)

```powershell
# 1. Install mkcert via Chocolatey
choco install mkcert -y

# 2. Set up local CA
mkcert -install

# 3. Generate certificate for localhost
cd C:\Users\x-be\OneDrive\المستندات\04-10-2025\66666\backend\certs
mkcert -key-file server.key.pem -cert-file server.cert.pem localhost 127.0.0.1

# Done! ✓
ls server.*
```

### Option B: Using OpenSSL (Most Compatible)

```powershell
# 1. Install OpenSSL for Windows
# Download: https://slproweb.com/products/Win32OpenSSL.html
# (Choose "Win64 OpenSSL v3.x")
# During installation, select "Copy OpenSSL DLLs to Windows system directory"

# 2. After installation, verify
openssl version

# 3. Generate certificate
cd C:\Users\x-be\OneDrive\المستندات\04-10-2025\66666\backend
openssl req -x509 -newkey rsa:2048 -nodes \
  -keyout certs\server.key.pem \
  -out certs\server.cert.pem \
  -days 365 \
  -subj "/C=SA/ST=Riyadh/L=Riyadh/O=ALAWAEL/OU=IT/CN=localhost"

# Done! ✓
dir /B certs\server.*
```

### Option C: Using Python (Alternative)

```powershell
# If you have Python installed:
pip install cryptography

# Then run certificate generation:
python -c "
from cryptography import x509
from cryptography.x509.oid import NameOID
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives.asymmetric import rsa
import datetime

# Generate private key
private_key = rsa.generate_private_key(
    public_exponent=65537,
    key_size=2048,
    backend=default_backend()
)

# Generate certificate
subject = issuer = x509.Name([
    x509.NameAttribute(NameOID.COUNTRY_NAME, u'SA'),
    x509.NameAttribute(NameOID.STATE_OR_PROVINCE_NAME, u'Riyadh'),
    x509.NameAttribute(NameOID.ORGANIZATION_NAME, u'ALAWAEL'),
    x509.NameAttribute(NameOID.COMMON_NAME, u'localhost'),
])

cert = x509.CertificateBuilder().subject_name(
    subject
).issuer_name(
    issuer
).public_key(
    private_key.public_key()
).serial_number(
    x509.random_serial_number()
).not_valid_before(
    datetime.datetime.utcnow()
).not_valid_after(
    datetime.datetime.utcnow() + datetime.timedelta(days=365)
).add_extension(
    x509.SubjectAlternativeName([
        x509.DNSName(u'localhost'),
        x509.DNSName(u'127.0.0.1'),
    ]),
    critical=False,
).sign(private_key, hashes.SHA256(), default_backend())

# Write files
from cryptography.hazmat.primitives import serialization

with open('certs/server.key.pem', 'wb') as f:
    f.write(private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption()
    ))

with open('certs/server.cert.pem', 'wb') as f:
    f.write(cert.public_bytes(serialization.Encoding.PEM))

print('✓ Certificates generated!')
"
```

---

## VERIFY CERTIFICATES ARE CREATED

```powershell
cd 'C:\Users\x-be\OneDrive\المستندات\04-10-2025\66666\backend'
dir /B certs\server.*

# Expected output:
# server.cert.pem
# server.key.pem
```

---

## AFTER GENERATING CERTIFICATES

### Step 1: Install PM2 (if not already done)

```powershell
npm install -g pm2
pm2 startup
pm2 save
```

### Step 2: Start HTTPS Proxy

```powershell
cd 'C:\Users\x-be\OneDrive\المستندات\04-10-2025\66666\backend'

# Start the HTTPS proxy server
pm2 start https-proxy.js --name "alawael-https" --max-memory-restart 500M
pm2 save

# Verify it started
pm2 list
# You should see status "online" for "alawael-https"
```

### Step 3: Test HTTPS Connection

```powershell
# Test with self-signed cert (allow insecure)
curl -k https://localhost/health

# Expected response:
# {"status":"ok","service":"https-proxy","timestamp":"...","uptime":...}

# Test HTTPS API
curl -k https://localhost/api/v1/health/alive

# Test HTTP redirect to HTTPS
curl -L http://localhost/api/v1/health/alive
# Should redirect and respond with 200
```

---

## CONFIGURE FOR PRODUCTION

### Step 4: Set Up Let's Encrypt (Production Only)

For a real domain (not localhost), use Let's Encrypt:

```powershell
# Install Certbot (Windows)
# https://certbot.eff.org/instructions?os=windows

# Or use Certbot via WSL/WSL2:
#   wsl sudo apt update
#   wsl sudo apt install certbot
#   wsl certbot certonly --standalone -d api.yourdomain.com

# Update certificate paths in https-proxy.js
# Restart the proxy:
pm2 restart alawael-https
```

---

## TROUBLESHOOTING

### Issue: "Certificate not found" Error

**Solution:**
```powershell
# Verify files exist
Test-Path 'C:\Users\x-be\OneDrive\المستندات\04-10-2025\66666\backend\certs\server.cert.pem'
Test-Path 'C:\Users\x-be\OneDrive\المستندات\04-10-2025\66666\backend\certs\server.key.pem'

# If not, generate them using one of the methods above
```

### Issue: "Port 443 already in use"

```powershell
# Find process using port 443
netstat -ano | find "443"

# Kill the process (replace PID)
taskkill /PID <PID> /F

# Or change proxy port in https-proxy.js to 8443
# Then update tests to use port 8443
```

### Issue: "Permission denied" on port 80/443

**Solution:**
```powershell
# Windows requires admin privileges for ports <1024
# Either:
# Option 1: Run terminal as Administrator
# Option 2: Use higher ports (8080, 8443) and configure firewall

# Change in https-proxy.js:
# HTTPS_PORT: 8443,
# HTTP_PORT: 8080
```

---

## VERIFICATION CHECKLIST

After setup, verify:

```powershell
# ✓ Certs exist
Test-Path 'C:\Users\x-be\OneDrive\المستندات\04-10-2025\66666\backend\certs\server.*.pem'

# ✓ Proxy running
pm2 list | Select-String "alawael-https"
# Expected: online

# ✓ Can reach HTTPS endpoint
$resp = curl -k -s https://localhost/health
$resp | ConvertFrom-Json | Select-Object status

# ✓ Health checks passing
curl -k https://localhost/api/v1/health/alive

# ✓ All 8 backend instances still running
pm2 list | Select-String "alawael-backend"
# Expected: 8 x online
```

---

## NEXT STEPS

Once certificates are generated and HTTPS proxy is running:

1. ✅ **HTTPS/TLS is complete**
   - All traffic encrypted
   - HTTP redirects to HTTPS
   - Ready for Phase 2

2. **Tomorrow: Phase 2 - Monitoring**
   - Install Prometheus + Grafana
   - Set up metrics collection
   - Create dashboards
   - Duration: 1.5-2 hours

3. **Wednesday: Phase 3 - Database Replication**
   - Convert to MongoDB 3-node replica set
   - Configure auto-failover
   - Duration: 1.5-2 hours

4. **Thursday: Phase 4 - Verification**
   - Health checks
   - Performance testing
   - Final sign-off
   - Duration: 2-4 hours

---

## PRODUCTION READINESS

After completing Phase 1:

- ✅ API endpoints encrypted (HTTPS)
- ✅ HTTP traffic redirected (to HTTPS)
- ✅ Security headers configured
- ✅ TLS 1.2/1.3 enabled
- ✅ Strong ciphers in use
- ⏳ Next: Implement Let's Encrypt for real domain

---

## HELP & SUPPORT

If you encounter issues:

1. Check logs:
   ```powershell
   pm2 logs alawael-https --lines 50
   ```

2. Verify dependencies:
   ```powershell
   npm list http-proxy-middleware
   npm list express
   ```

3. Test backend is running:
   ```powershell
   curl http://localhost:3001/api/v1/health/alive
   ```

4. Check ports:
   ```powershell
   netstat -ano | find "443"
   netstat -ano | find "80"
   netstat -ano | find "3001"
   ```

---

**Status: Ready for Certificate Generation**  
**Next: Choose an option (A, B, or C) and generate certificates**  
**Duration: 5-10 minutes**  
**Then restart and test HTTPS**
