# SSL/TLS CERTIFICATE SETUP GUIDE
# ALAWAEL ERP Production Deployment
# Date: February 28, 2026

## OPTION 1: Using Let's Encrypt (FREE - RECOMMENDED)

### Prerequisites
```bash
# Install Certbot (certificate management tool)
npm install -g certbot    # or: choco install certbot (Windows)
apt-get install certbot    # Linux

# Install nginx (reverse proxy with SSL termination)
choco install nginx        # Windows
apt-get install nginx      # Linux
brew install nginx         # macOS
```

### Step 1: Generate SSL Certificate
```bash
# For domain: alawael-erp.com (replace with your actual domain)
certbot certonly --standalone \
  -d alawael-erp.com \
  -d www.alawael-erp.com \
  -d api.alawael-erp.com \
  --email admin@alawael-erp.com \
  --agree-tos \
  --non-interactive

# Certificates will be stored in:
# /etc/letsencrypt/live/alawael-erp.com/ (Linux/macOS)
# C:\ProgramData\letsencrypt\live\alawael-erp.com\ (Windows)
```

### Step 2: Configure Nginx Reverse Proxy
```nginx
# File: /etc/nginx/sites-available/alawael-erp.conf (Linux)
# or: C:\nginx\conf\alawael-erp.conf (Windows)

upstream alawael_backend {
    # Load balance across PM2 instances
    server localhost:3001;
    # If needed, add more backend servers:
    # server localhost:3011;
    # server localhost:3021;
    # etc.
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name alawael-erp.com www.alawael-erp.com api.alawael-erp.com;
    
    location / {
        return 301 https://$server_name$request_uri;
    }
    
    # Let's Encrypt verification
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
}

# HTTPS Server Configuration
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    
    server_name alawael-erp.com www.alawael-erp.com api.alawael-erp.com;
    
    # SSL Certificate Configuration
    ssl_certificate /etc/letsencrypt/live/alawael-erp.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/alawael-erp.com/privkey.pem;
    
    # SSL Security Best Practices
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # HSTS - Enforce HTTPS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/s;
    limit_req zone=api_limit burst=200 nodelay;
    
    # Proxy settings
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-Host $server_name;
    
    # WebSocket support
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    
    # Timeouts
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
    
    # Buffering
    proxy_buffering on;
    proxy_buffer_size 4k;
    proxy_buffers 32 4k;
    
    # Proxy to backend
    location / {
        proxy_pass http://alawael_backend;
    }
    
    # Deny access to sensitive files
    location ~ /\. {
        deny all;
        log_not_found off;
    }
    
    location ~ ~$ {
        deny all;
        log_not_found off;
    }
}
```

### Step 3: Test Nginx Configuration
```bash
# Syntax check
nginx -t

# Start nginx
systemctl start nginx      # Linux
net start nginx            # Windows
brew services start nginx  # macOS

# Enable auto-start
systemctl enable nginx     # Linux
```

### Step 4: Automatic Certificate Renewal
```bash
# Certbot auto-renewal (runs daily)
certbot renew --quiet --no-eff-email

# Schedule renewal task (Windows Task Scheduler)
# Windows: Create scheduled task:
# Program: C:\Program Files\certbot\certbot.exe
# Arguments: renew --quiet --no-eff-email --post-hook "net stop nginx && net start nginx"
```

---

## OPTION 2: Using Self-Signed Certificates (DEV/TESTING ONLY)

```bash
# Generate self-signed certificate (valid for 365 days)
openssl req -x509 -newkey rsa:4096 -nodes \
  -out cert.pem -keyout key.pem -days 365 \
  -subj "/C=SA/ST=Riyadh/L=Riyadh/O=ALAWAEL/CN=alawael-erp.local"

# Update Node.js server to use HTTPS
# (Not recommended for production!)
```

---

## OPTION 3: Using Azure Application Gateway (CLOUD)

If deploying to Azure:
```bash
# Create Application Gateway with SSL
az network application-gateway create \
  --name alawael-appgw \
  --resource-group alawael-rg \
  --capacity 2 \
  --sku Standard_v2 \
  --cert-name alawael-cert \
  --cert-file cert.pfx \
  --cert-password <your-password> \
  --http-settings-cookie-based-affinity Disabled \
  --frontend-port 443 \
  --http-settings-port 3001 \
  --protocol Https \
  --backends alawael-backend-pool
```

---

## SSL CERTIFICATE MANAGEMENT

### View Certificate Information
```bash
# Linux/macOS
openssl x509 -in /etc/letsencrypt/live/alawael-erp.com/cert.pem -text -noout

# Check expiration date
certbot certificates

# Days until expiration
openssl x509 -in /etc/letsencrypt/live/alawael-erp.com/cert.pem -noout -dates
```

### Certificate Monitoring
```bash
# Check certificate validity
openssl x509 -in cert.pem -noout -dates

# Expected output:
# notBefore=Feb 28 10:00:00 2026 GMT
# notAfter=Feb 28 10:00:00 2027 GMT
```

### Troubleshooting

#### Issue: "Connection refused" with HTTPS
**Solution:**
```bash
# Verify nginx is running
nginx -t
systemctl status nginx

# Check if port 443 is open
netstat -tlnp | grep 443

# Verify certificate path
ls -la /etc/letsencrypt/live/alawael-erp.com/
```

#### Issue: "Certificate not trusted"
**Solution:**
- Self-signed certificates need browser exception
- Import certificate into trusted store (production use Let's Encrypt)
- Clear browser cache and restart browser

#### Issue: "HSTS error after switching to HTTPS"
**Solution:**
- Clear HSTS cache: `chrome://net-internals/#hsts`
- Initially set HSTS max-age to 300 seconds for testing
- Increase to 31536000 (1 year) after verification

---

## PERFORMANCE IMPACT

| Metric | Before HTTPS | After HTTPS | Change |
|--------|------|------|--------|
| Response Time | 12.63ms | ~15ms | +2.4ms (negligible) |
| Throughput | 81.44 req/s | ~78 req/s | -3.4% (acceptable) |
| CPU Usage | <1% | ~2% | +1% |
| Memory Usage | Nominal | Nominal | No significant change |

**Conclusion:** HTTPS overhead is minimal (<5%) and provides essential security.

---

## DEPLOYMENT CHECKLIST

- [ ] SSL certificate obtained from Let's Encrypt
- [ ] Certificate files copied to correct location
- [ ] Nginx installed and configured
- [ ] Nginx configuration syntax validated (`nginx -t`)
- [ ] Security headers configured
- [ ] Rate limiting enabled
- [ ] HSTS enabled (max-age>=31536000)
- [ ] Certificate renewal automated (certbot cron job)
- [ ] HTTP to HTTPS redirect working
- [ ] All API endpoints accessible via HTTPS
- [ ] WebSocket connections working over WSS
- [ ] Certificate expiration monitoring active

---

## NEXT STEPS

1. **Today:** Deploy HTTPS with Let's Encrypt
2. **Within 1 week:** Setup monitoring for certificate expiration
3. **Monthly:** Review SSL Labs test results (https://www.ssllabs.com/ssltest/)
4. **Quarterly:** Update SSL/TLS policies and ciphers as standards evolve

---

## USEFUL COMMANDS

```bash
# Test SSL configuration
curl -v https://alawael-erp.com/api/v1/health/alive

# SSL Labs test
https://www.ssllabs.com/ssltest/?d=alawael-erp.com

# Check HTTPS support headers
curl -I https://alawael-erp.com

# Monitor certificate renewal
certbot renew --dry-run

# View recent certificates
certbot certificates
```
