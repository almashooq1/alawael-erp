# 🌐 PRIORITY 3: DOMAIN + SSL - STEP-BY-STEP IMPLEMENTATION

**Status Date:** 18 January 2026  
**Estimated Time:** 60 minutes total

---

## 🎯 OVERVIEW

This guide will help you:

1. Register a domain name (15 min)
2. Configure DNS records (10 min)
3. Get an SSL certificate (20 min)
4. Configure your application (15 min)

---

## ⚡ QUICK REQUIREMENTS

- Domain name (e.g., alawael-erp.com)
- Credit card for domain registration
- Server IP address or hosting details
- Email for SSL verification

---

## 📍 STEP 1: DOMAIN REGISTRATION (15 minutes)

### Option A: Hostinger (Recommended)

**Cost:** ~$10-12/year  
**Support:** 24/7

1. Go to https://www.hostinger.com
2. Enter your desired domain name
3. Check availability
4. Select ".com" (or .app, .io, .co)
5. Add to cart
6. Complete checkout
7. Save domain name & nameservers

### Option B: Namecheap

**Cost:** ~$8-10/year  
**URL:** https://www.namecheap.com

Similar process to Hostinger.

### Option C: GoDaddy

**Cost:** ~$7-12/year  
**URL:** https://www.godaddy.com

---

## 🔗 STEP 2: DNS CONFIGURATION (10 minutes)

Once domain is registered, update DNS records:

### A Record (Main domain pointing to server)

```
Record Type: A
Host: @
Value: YOUR_SERVER_IP (example: 192.168.1.100)
TTL: 3600 (1 hour)
```

**Finding Your Server IP:**

```bash
# Windows
ipconfig

# Linux
ip addr show

# Get public IP
curl ifconfig.me
```

### CNAME Record (www subdomain)

```
Record Type: CNAME
Host: www
Value: alawael-erp.com
TTL: 3600
```

### MX Records (Email - Optional)

```
Record Type: MX
Host: @
Mail Server: mail.alawael-erp.com
Priority: 10
TTL: 3600
```

---

## 🔒 STEP 3: SSL CERTIFICATE (20 minutes)

### Option A: Cloudflare (EASIEST - Recommended)

**Cost:** Free + optional paid features  
**Time:** 5 minutes

1. Go to https://www.cloudflare.com
2. Click "Sign Up"
3. Enter email & password
4. Click "Add Site"
5. Enter your domain name
6. Scan & review DNS records
7. Update nameservers at Hostinger:
   - Replace nameservers with Cloudflare ones
   - Takes 10-30 minutes to propagate
8. In Cloudflare dashboard:
   - SSL/TLS → Overview → "Flexible SSL" ✅
   - Done! Certificate auto-generates

**Advantages:**

- Automatic certificate provisioning
- Free SSL for life
- No renewal needed
- Extra security features
- Works with any hosting

### Option B: Let's Encrypt (Free, Linux/Mac only)

**Cost:** Free  
**Complexity:** Medium

```bash
# Install Certbot
sudo apt-get install certbot

# Get certificate
sudo certbot certonly --standalone \
  -d alawael-erp.com \
  -d www.alawael-erp.com

# Certificates location:
/etc/letsencrypt/live/alawael-erp.com/
```

### Option C: ZeroSSL (Free)

**Cost:** Free  
**URL:** https://zerossl.com

1. Go to ZeroSSL.com
2. Enter your domain
3. Email verification
4. Download certificates
5. Upload to server

---

## ⚙️ STEP 4: CONFIGURE APPLICATION (15 minutes)

### 4.1 Create SSL Configuration File

**File: backend/ssl-config.js**

```javascript
const fs = require('fs');
const path = require('path');

// For Cloudflare: use these paths when deployed
// For Let's Encrypt: use /etc/letsencrypt/live/domain/

const sslOptions = {
  key: fs.readFileSync(path.join(__dirname, '../ssl/privkey.pem')),
  cert: fs.readFileSync(path.join(__dirname, '../ssl/fullchain.pem')),
};

module.exports = { sslOptions };
```

### 4.2 Update server.js for HTTPS

```javascript
const https = require('https');
const fs = require('fs');

// SSL configuration
let server;

if (process.env.USE_SSL === 'true' && fs.existsSync('./ssl/privkey.pem')) {
  const sslOptions = {
    key: fs.readFileSync('./ssl/privkey.pem'),
    cert: fs.readFileSync('./ssl/fullchain.pem'),
  };
  server = https.createServer(sslOptions, app);
} else {
  server = require('http').createServer(app);
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🔒 Server running at https://localhost:${PORT}`);
});
```

### 4.3 Update .env

```env
# .env
NODE_ENV=production
PORT=3001
USE_SSL=true
DOMAIN=alawael-erp.com
```

---

## 🌍 STEP 5: VERIFY SETUP (10 minutes)

### Check SSL Certificate

```bash
# Linux/Mac
openssl s_client -connect alawael-erp.com:443

# Windows PowerShell
$req = [Net.WebRequest]::Create("https://alawael-erp.com")
$response = $req.GetResponse()
$response.Headers
```

### Test Domain Access

1. Open browser
2. Navigate to: https://alawael-erp.com
3. Check for ✅ green lock icon
4. Certificate info should appear

### Check DNS Propagation

```
Website: https://dnschecker.org
Enter your domain
Should show your server IP
```

---

## 📊 NGINX CONFIGURATION (Optional - For Reverse Proxy)

If using Nginx as reverse proxy:

**File: /etc/nginx/sites-available/alawael**

```nginx
server {
  listen 80;
  server_name alawael-erp.com www.alawael-erp.com;

  # Redirect HTTP to HTTPS
  return 301 https://$server_name$request_uri;
}

server {
  listen 443 ssl http2;
  server_name alawael-erp.com www.alawael-erp.com;

  # SSL Certificates (from Cloudflare or Let's Encrypt)
  ssl_certificate /etc/letsencrypt/live/alawael-erp.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/alawael-erp.com/privkey.pem;

  # SSL Configuration
  ssl_protocols TLSv1.2 TLSv1.3;
  ssl_ciphers HIGH:!aNULL:!MD5;
  ssl_prefer_server_ciphers on;

  # HSTS (optional)
  add_header Strict-Transport-Security "max-age=31536000" always;

  location / {
    proxy_pass http://localhost:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
  }
}
```

Enable site:

```bash
sudo ln -s /etc/nginx/sites-available/alawael /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 🔄 AUTO-RENEWAL SETUP

### For Let's Encrypt (Linux)

```bash
# Create cron job
sudo crontab -e

# Add this line:
0 2 * * * /usr/bin/certbot renew --quiet
```

### For Cloudflare

Automatic! No action needed.

---

## ✅ TROUBLESHOOTING

| Issue                   | Solution                                  |
| ----------------------- | ----------------------------------------- |
| "Domain not resolving"  | Wait 24 hours for DNS propagation         |
| "SSL certificate error" | Verify certificate path in config         |
| "Connection refused"    | Ensure backend is running on correct port |
| "Mixed content warning" | Load all resources over HTTPS             |
| "Certificate expired"   | Set up auto-renewal cron job              |

---

## 📝 CHECKLIST

- [ ] Domain registered
- [ ] DNS A record configured
- [ ] DNS CNAME record configured
- [ ] SSL certificate obtained
- [ ] SSL files uploaded to server
- [ ] Application configuration updated
- [ ] HTTPS test successful
- [ ] SSL certificate valid in browser
- [ ] DNS propagation verified
- [ ] Auto-renewal configured

---

## ⏱️ TIMING BREAKDOWN

| Step                | Time       | Status   |
| ------------------- | ---------- | -------- |
| Domain Registration | 15 min     | TODO     |
| DNS Configuration   | 10 min     | TODO     |
| SSL Certificate     | 20 min     | TODO     |
| Application Config  | 15 min     | TODO     |
| **TOTAL**           | **60 min** | **TODO** |

---

## 🎯 WHAT'S NEXT

After completing Priority 3:

1. ✅ Domain registered
2. ✅ SSL certificate active
3. ➡️ Move to Priority 4: Testing Suite (60 min)
4. ➡️ Move to Priority 5: Production Deployment (90 min)

---

## 📞 QUICK REFERENCE

**Domain Registrars:**

- Hostinger: https://www.hostinger.com
- Namecheap: https://www.namecheap.com
- GoDaddy: https://www.godaddy.com

**SSL Providers:**

- Cloudflare: https://www.cloudflare.com (Recommended)
- Let's Encrypt: https://letsencrypt.org
- ZeroSSL: https://zerossl.com

**Verification Tools:**

- DNS Check: https://dnschecker.org
- SSL Test: https://www.ssllabs.com/ssltest/
- Domain Info: https://whois.com

---

**🚀 Ready? Start with Step 1: Domain Registration!**
