# 🌐 Priority 3: Domain + SSL Setup Guide

## Part 1: Domain Registration (Hostinger)

### Step 1: Register Domain

1. Go to https://www.hostinger.com
2. Search for your domain name
3. Select ".com" or preferred TLD
4. Add to cart & checkout
5. **Domain Name**: alawael-erp.com (example)

### Step 2: Configure DNS Records

**A Records:**

```
Type: A
Name: @
Value: YOUR_SERVER_IP (e.g., 192.168.1.100 or hosting provider IP)
TTL: 3600
```

**CNAME Records:**

```
Type: CNAME
Name: www
Value: alawael-erp.com
TTL: 3600
```

**MX Records (for Email):**

```
Type: MX
Name: @
Value: mail.alawael-erp.com
Priority: 10
TTL: 3600
```

---

## Part 2: SSL Certificate (Let's Encrypt)

### Option 1: Automatic (Recommended for Linux/Mac)

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Get certificate
sudo certbot certonly --standalone -d alawael-erp.com -d www.alawael-erp.com

# Certificate location:
# /etc/letsencrypt/live/alawael-erp.com/fullchain.pem
# /etc/letsencrypt/live/alawael-erp.com/privkey.pem
```

### Option 2: Manual (Windows)

1. Use ZeroSSL.com or SSL.com
2. Generate CSR (Certificate Signing Request)
3. Verify domain ownership
4. Download certificates
5. Store in `/ssl/` directory

### Option 3: Cloudflare (Easiest)

1. Go to https://www.cloudflare.com
2. Add site & update nameservers
3. Enable "Flexible SSL"
4. Automatic certificate provisioning

---

## Part 3: Configure Express with SSL

**File: backend/ssl-config.js**

```javascript
const fs = require('fs');
const path = require('path');

const sslOptions = {
  key: fs.readFileSync(path.join(__dirname, '../ssl/privkey.pem')),
  cert: fs.readFileSync(path.join(__dirname, '../ssl/fullchain.pem')),
};

module.exports = { sslOptions };
```

**Update server.js:**

```javascript
const https = require('https');
const { sslOptions } = require('./ssl-config');

// Create HTTPS server
https.createServer(sslOptions, app).listen(443, '0.0.0.0', () => {
  console.log('Server running on https://alawael-erp.com');
});

// Also run HTTP on port 80 for redirects
const http = require('http');
http
  .createServer((req, res) => {
    res.writeHead(301, { Location: `https://${req.headers.host}${req.url}` });
    res.end();
  })
  .listen(80);
```

---

## Part 4: Nginx Reverse Proxy (Recommended for Production)

**File: /etc/nginx/sites-available/alawael-erp**

```nginx
# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name alawael-erp.com www.alawael-erp.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS Configuration
server {
    listen 443 ssl http2;
    server_name alawael-erp.com www.alawael-erp.com;

    # SSL Certificates
    ssl_certificate /etc/letsencrypt/live/alawael-erp.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/alawael-erp.com/privkey.pem;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Gzip Compression
    gzip on;
    gzip_types text/plain text/css text/javascript application/json application/javascript;

    # Frontend (React)
    location / {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # WebSocket Support
    location /socket.io {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

**Enable site:**

```bash
sudo ln -s /etc/nginx/sites-available/alawael-erp /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## Part 5: SSL Auto-Renewal

**File: /etc/cron.d/letsencrypt-renewal**

```bash
# Renew at 3 AM every Monday
0 3 * * 1 root certbot renew --quiet && systemctl reload nginx
```

---

## Testing & Verification

```bash
# Test SSL certificate
curl -I https://alawael-erp.com

# Check certificate expiry
openssl s_client -connect alawael-erp.com:443 -showcerts | openssl x509 -noout -dates

# SSL Labs test
# Visit: https://www.ssllabs.com/ssltest/analyze.html?d=alawael-erp.com

# HTTPS redirect test
curl -I http://alawael-erp.com
# Should return 301 with Location: https://
```

---

## Security Checklist

- [ ] Domain registered and pointing to server
- [ ] SSL certificate installed and valid
- [ ] HTTP redirects to HTTPS
- [ ] Security headers configured
- [ ] HSTS enabled
- [ ] Certificate auto-renewal set up
- [ ] Firewall rules configured (80, 443)
- [ ] Regular backups enabled

---

**Status**: ⏳ Ready for implementation
**Time**: ~60 minutes
**Difficulty**: Medium
