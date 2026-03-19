#!/usr/bin/env pwsh
# ═══════════════════════════════════════════════════════════════════════════
# DOCKER DEPLOYMENT - STEP BY STEP EXECUTION GUIDE
# AL-AWAEL ERP BACKEND → HOSTINGER VPS
# ═══════════════════════════════════════════════════════════════════════════

Write-Host @"
╔═══════════════════════════════════════════════════════════════════════════╗
║           🐳 DOCKER DEPLOYMENT EXECUTION GUIDE (Jan 25, 2026)            ║
║                        AL-AWAEL ERP BACKEND                              ║
╚═══════════════════════════════════════════════════════════════════════════╝

📋 This script provides COPY-PASTE commands for each phase.
   Follow phases in order. Each phase takes 5-15 minutes.

"@ -ForegroundColor Cyan

# ════════════════════════════════════════════════════════════════════════════
# PHASE 1: LOCAL PREPARATION
# ════════════════════════════════════════════════════════════════════════════

Write-Host @"
┌─────────────────────────────────────────────────────────────────────────────┐
│ 🚀 PHASE 1: LOCAL DOCKER BUILD & TEST (15 minutes)                         │
│   Prerequisites: Docker Desktop installed on Windows                        │
│   Expected Result: Image builds, container starts, endpoints respond       │
└─────────────────────────────────────────────────────────────────────────────┘

1️⃣  NAVIGATE TO BACKEND FOLDER:
    Copy and paste this command:

    cd "C:\Users\x-be\OneDrive\المستندات\04-10-2025\66666\backend"

    Expected: Prompt should show backend directory

─────────────────────────────────────────────────────────────────────────────

2️⃣  BUILD DOCKER IMAGE (takes 2-3 minutes):
    Copy and paste this command:

    docker build -t alawael-backend:v1 .

    Expected output ends with: "Successfully tagged alawael-backend:v1"
    If error: Check package.json exists, try: npm ci

─────────────────────────────────────────────────────────────────────────────

3️⃣  VERIFY IMAGE BUILT:
    Copy and paste this command:

    docker images | findstr alawael

    Expected: Shows "alawael-backend    v1    xxxxxxx    150MB    ..."

─────────────────────────────────────────────────────────────────────────────

4️⃣  START CONTAINER (takes 5-8 seconds):
    Copy and paste this command:

    docker-compose up -d

    Expected: "Creating alawael-backend ... done"

─────────────────────────────────────────────────────────────────────────────

5️⃣  WAIT FOR STARTUP (keep PowerShell open):
    Copy and paste this command:

    Start-Sleep -Seconds 8

    Expected: Waits silently for 8 seconds

─────────────────────────────────────────────────────────────────────────────

6️⃣  TEST ENDPOINTS (verify server is working):
    Copy and paste this command:

    `$endpoints = @('health','test-first','phases-29-33');
    foreach(`$e in `$endpoints) {
      try {
        `$r = Invoke-RestMethod -Uri "http://localhost:3001/`$e" -TimeoutSec 3;
        Write-Host "✓ `/`$e - OK" -ForegroundColor Green
      } catch {
        Write-Host "✗ `/`$e - FAILED" -ForegroundColor Red
      }
    }

    Expected: All three show "✓ - OK" in green

─────────────────────────────────────────────────────────────────────────────

7️⃣  VIEW LOGS (if you want to see container logs):
    Copy and paste this command:

    docker-compose logs

    Expected: Shows startup logs from Node.js server

─────────────────────────────────────────────────────────────────────────────

8️⃣  STOP CONTAINER:
    Copy and paste this command:

    docker-compose down

    Expected: "Stopping alawael-backend ... done"

─────────────────────────────────────────────────────────────────────────────

✅ PHASE 1 COMPLETE: If all tests passed, continue to Phase 2

" -ForegroundColor Cyan

Read-Host "Press Enter after completing PHASE 1..."

# ════════════════════════════════════════════════════════════════════════════
# PHASE 2: DOCKER HUB SETUP
# ════════════════════════════════════════════════════════════════════════════

Write-Host @"
┌─────────────────────────────────────────────────────────────────────────────┐
│ 🌐 PHASE 2: DOCKER HUB REGISTRY SETUP (5 minutes)                          │
│   You'll need: Docker Hub account (free at hub.docker.com)                 │
│   Expected Result: Image pushed to your Docker Hub registry               │
└─────────────────────────────────────────────────────────────────────────────┘

1️⃣  CREATE DOCKER HUB ACCOUNT (if you don't have one):
    - Go to: https://hub.docker.com
    - Sign up (free)
    - Verify email
    - Create repository named: alawael-backend
      * Set to PRIVATE (for security)
      * Description: AL-AWAEL ERP Backend

─────────────────────────────────────────────────────────────────────────────

2️⃣  GENERATE ACCESS TOKEN:
    - Go to: https://hub.docker.com/settings/security
    - Click: New Access Token
    - Name it: alawael-deploy
    - Select: Read & Write permissions
    - COPY the token (you'll use it next)

─────────────────────────────────────────────────────────────────────────────

3️⃣  LOGIN TO DOCKER HUB (locally):
    Copy and paste this command:

    docker login

    When prompted:
    - Username: [Enter your Docker Hub username]
    - Password: [Paste the access token you created]

    Expected: "Login Succeeded"

─────────────────────────────────────────────────────────────────────────────

4️⃣  SET YOUR USERNAME VARIABLE:
    Copy and paste this command (REPLACE "your-username" with actual username):

    `$dockerUser = "your-username"

    Example: `$dockerUser = "john-doe"

─────────────────────────────────────────────────────────────────────────────

5️⃣  BUILD AGAIN & TAG FOR REGISTRY:
    Copy and paste this command:

    docker build -t `$dockerUser/alawael-backend:v1 -t `$dockerUser/alawael-backend:latest .

    Expected: "Successfully tagged..."

─────────────────────────────────────────────────────────────────────────────

6️⃣  PUSH TO DOCKER HUB (takes 3-5 minutes):
    Copy and paste this command:

    docker push `$dockerUser/alawael-backend:v1
    docker push `$dockerUser/alawael-backend:latest

    Expected output includes: "Pushed" and "digest: sha256:..."
    At the end: "v1: digest: sha256:xxxxxx size: xxxxx"

─────────────────────────────────────────────────────────────────────────────

7️⃣  VERIFY ON DOCKER HUB:
    Go to: https://hub.docker.com/r/your-username/alawael-backend
    (Replace "your-username" with your actual Docker Hub username)

    Expected: See your image listed with tags "v1" and "latest"

─────────────────────────────────────────────────────────────────────────────

✅ PHASE 2 COMPLETE: Image is now on Docker Hub

" -ForegroundColor Cyan

Read-Host "Press Enter after completing PHASE 2..."

# ════════════════════════════════════════════════════════════════════════════
# PHASE 3: HOSTINGER VPS SETUP
# ════════════════════════════════════════════════════════════════════════════

Write-Host @"
┌─────────────────────────────────────────────────────────────────────────────┐
│ 🖥️  PHASE 3: HOSTINGER VPS PREPARATION (15 minutes)                        │
│   You'll need: SSH access to your Hostinger VPS (Ubuntu 22.04)            │
│   Expected Result: Docker installed and running on VPS                    │
└─────────────────────────────────────────────────────────────────────────────┘

⚠️  Important: All commands in this phase run ON YOUR VPS (via SSH)
    NOT on your local Windows machine!

─────────────────────────────────────────────────────────────────────────────

1️⃣  CONNECT TO YOUR VPS VIA SSH:
    From PowerShell, copy and paste:

    ssh root@<your-vps-ip>

    Example: ssh root@192.168.1.100
    Or: ssh root@yourdomain.com

    When prompted for password: Enter your VPS password
    Expected: You'll see the VPS command prompt

─────────────────────────────────────────────────────────────────────────────

2️⃣  UPDATE SYSTEM PACKAGES (takes 1-2 minutes):
    On VPS, copy and paste:

    apt update && apt upgrade -y

    Expected: Lots of output, ends with "All packages are up to date"

─────────────────────────────────────────────────────────────────────────────

3️⃣  INSTALL DOCKER (takes 2-3 minutes):
    On VPS, copy and paste:

    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh

    Expected: Ends with "Docker is installed and running"

─────────────────────────────────────────────────────────────────────────────

4️⃣  ADD CURRENT USER TO DOCKER GROUP:
    On VPS, copy and paste:

    sudo usermod -aG docker \$USER
    newgrp docker

    Expected: Prompt might briefly pause

─────────────────────────────────────────────────────────────────────────────

5️⃣  INSTALL DOCKER COMPOSE (takes 30-60 seconds):
    On VPS, copy and paste:

    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-\$(uname -s)-\$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose

    Expected: No error messages

─────────────────────────────────────────────────────────────────────────────

6️⃣  VERIFY DOCKER INSTALLATION:
    On VPS, copy and paste:

    docker --version && docker-compose --version

    Expected: Shows two version numbers
    Example output:
      Docker version 25.0.1, build xxxxxxxx
      Docker Compose version 2.24.1

─────────────────────────────────────────────────────────────────────────────

7️⃣  CREATE PROJECT DIRECTORY:
    On VPS, copy and paste:

    mkdir -p /opt/alawael && cd /opt/alawael

    Expected: New directory created

─────────────────────────────────────────────────────────────────────────────

✅ PHASE 3 COMPLETE: VPS is ready for Docker deployment

" -ForegroundColor Cyan

Read-Host "Press Enter after completing PHASE 3..."

# ════════════════════════════════════════════════════════════════════════════
# PHASE 4: VPS DEPLOYMENT
# ════════════════════════════════════════════════════════════════════════════

Write-Host @"
┌─────────────────────────────────────────────────────────────────────────────┐
│ 🚀 PHASE 4: DEPLOY ON HOSTINGER VPS (10 minutes)                           │
│   Prerequisites: SSH connected to VPS, Docker installed                   │
│   Expected Result: Container running and responding to requests           │
└─────────────────────────────────────────────────────────────────────────────┘

⚠️  IMPORTANT: Still running commands ON YOUR VPS (via SSH)

─────────────────────────────────────────────────────────────────────────────

1️⃣  ENSURE IN VPS PROJECT DIRECTORY:
    On VPS, copy and paste:

    cd /opt/alawael && pwd

    Expected: Output shows "/opt/alawael"

─────────────────────────────────────────────────────────────────────────────

2️⃣  LOGIN TO DOCKER HUB (on VPS):
    On VPS, copy and paste:

    docker login

    When prompted:
    - Username: [Your Docker Hub username]
    - Password: [Your access token (same as before)]

    Expected: "Login Succeeded"

─────────────────────────────────────────────────────────────────────────────

3️⃣  PULL YOUR IMAGE (takes 2-5 minutes):
    On VPS, copy and paste (replace YOUR-USERNAME):

    docker pull <your-username>/alawael-backend:v1

    Example: docker pull john-doe/alawael-backend:v1

    Expected: "Downloaded newer image for ..."

─────────────────────────────────────────────────────────────────────────────

4️⃣  START CONTAINER (takes 5 seconds):
    On VPS, copy and paste (replace YOUR-USERNAME):

    docker run -d \
      --name alawael-app \
      -p 3001:3001 \
      -e PORT=3001 \
      -e NODE_ENV=production \
      -e USE_MOCK_DB=false \
      -e SKIP_SOCKET_IO=false \
      -e DISABLE_REDIS=false \
      -e SKIP_PHASE17=false \
      --restart=unless-stopped \
      <your-username>/alawael-backend:v1

    Example:
    docker run -d \
      --name alawael-app \
      -p 3001:3001 \
      -e PORT=3001 \
      -e NODE_ENV=production \
      -e USE_MOCK_DB=false \
      -e SKIP_SOCKET_IO=false \
      -e DISABLE_REDIS=false \
      -e SKIP_PHASE17=false \
      --restart=unless-stopped \
      john-doe/alawael-backend:v1

    Expected: Long container ID (looks like: a3f8b2c9e4d1f6a8...)

─────────────────────────────────────────────────────────────────────────────

5️⃣  WAIT FOR CONTAINER TO START:
    On VPS, copy and paste:

    sleep 5

    Expected: Waits silently

─────────────────────────────────────────────────────────────────────────────

6️⃣  CHECK CONTAINER STATUS:
    On VPS, copy and paste:

    docker ps

    Expected: Shows your "alawael-app" container with STATUS "Up X seconds"
              If not shown, try: docker ps -a (to see all containers)

─────────────────────────────────────────────────────────────────────────────

7️⃣  VIEW STARTUP LOGS:
    On VPS, copy and paste:

    docker logs alawael-app

    Expected: Shows Node.js startup messages, no error stack traces

─────────────────────────────────────────────────────────────────────────────

8️⃣  TEST HEALTH ENDPOINT (on VPS):
    On VPS, copy and paste:

    curl http://localhost:3001/health

    Expected: Returns JSON like: {"status":"ok",...}

─────────────────────────────────────────────────────────────────────────────

✅ PHASE 4 COMPLETE: Container is running on VPS!

" -ForegroundColor Cyan

Read-Host "Press Enter after completing PHASE 4..."

# ════════════════════════════════════════════════════════════════════════════
# PHASE 5: NGINX SETUP (OPTIONAL BUT RECOMMENDED)
# ════════════════════════════════════════════════════════════════════════════

Write-Host @"
┌─────────────────────────────────────────────────────────────────────────────┐
│ 🔐 PHASE 5: NGINX & SSL SETUP (Optional - 15 minutes)                      │
│   Purpose: Use domain instead of IP, add HTTPS security                   │
│   Prerequisites: Domain pointing to your VPS IP                           │
│   Expected Result: https://your-domain.com works                          │
└─────────────────────────────────────────────────────────────────────────────┘

⚠️  OPTIONAL: Skip if you don't have a domain or just want IP access
    Still running commands ON YOUR VPS (via SSH)

─────────────────────────────────────────────────────────────────────────────

1️⃣  INSTALL NGINX & CERTBOT (takes 1-2 minutes):
    On VPS, copy and paste:

    apt install -y nginx certbot python3-certbot-nginx

    Expected: "Setting up nginx ... done"

─────────────────────────────────────────────────────────────────────────────

2️⃣  CREATE NGINX CONFIG:
    On VPS, copy and paste EXACTLY (use nano editor):

    sudo nano /etc/nginx/sites-available/default

    This opens a text editor. Delete all content and paste:

    server {
        listen 80;
        server_name your-domain.com www.your-domain.com;

        location / {
            proxy_pass http://127.0.0.1:3001;
            proxy_http_version 1.1;
            proxy_set_header Upgrade \$http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host \$host;
            proxy_cache_bypass \$http_upgrade;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
        }

        location /health {
            access_log off;
            proxy_pass http://127.0.0.1:3001/health;
        }
    }

    Then:
    - Press: Ctrl + X
    - Press: Y (yes to save)
    - Press: Enter (keep filename)

    Expected: File saved

─────────────────────────────────────────────────────────────────────────────

3️⃣  TEST NGINX CONFIG:
    On VPS, copy and paste:

    sudo nginx -t

    Expected: "Syntax is OK" and "Test is successful"

─────────────────────────────────────────────────────────────────────────────

4️⃣  RELOAD NGINX:
    On VPS, copy and paste:

    sudo systemctl reload nginx

    Expected: No output (success)

─────────────────────────────────────────────────────────────────────────────

5️⃣  SETUP SSL CERTIFICATE (takes 1-2 minutes):
    On VPS, copy and paste (replace your-domain.com):

    sudo certbot --nginx -d your-domain.com -d www.your-domain.com

    When prompted:
    - Enter email address
    - Agree to terms (Y)
    - Choose redirect (recommend: 2 = Redirect all to HTTPS)

    Expected: "Successfully installed certificate"

─────────────────────────────────────────────────────────────────────────────

6️⃣  TEST HTTPS (from your local machine):
    PowerShell (on your Windows computer), copy and paste:

    Invoke-RestMethod -Uri "https://your-domain.com/health" -TimeoutSec 5

    Expected: Returns JSON health response

─────────────────────────────────────────────────────────────────────────────

✅ PHASE 5 COMPLETE: Domain with HTTPS is working!

" -ForegroundColor Cyan

Read-Host "Press Enter after completing PHASE 5 (or skip if optional)..."

# ════════════════════════════════════════════════════════════════════════════
# FINAL SUMMARY
# ════════════════════════════════════════════════════════════════════════════

Write-Host @"
╔═══════════════════════════════════════════════════════════════════════════╗
║                  ✅ DEPLOYMENT COMPLETE - SUMMARY                        ║
╚═══════════════════════════════════════════════════════════════════════════╝

🎉 Your AL-AWAEL ERP backend is now LIVE on Hostinger VPS!

📊 DEPLOYMENT SUMMARY:
   ✓ Docker image built locally and tested
   ✓ Image pushed to Docker Hub registry
   ✓ VPS prepared with Docker/Docker Compose
   ✓ Container deployed and running
   ✓ Nginx configured (if Phase 5 done)
   ✓ SSL certificate installed (if Phase 5 done)

🔗 ACCESS POINTS:
   - IP Access:        http://<your-vps-ip>:3001
   - Domain (HTTP):    http://your-domain.com
   - Domain (HTTPS):   https://your-domain.com

📝 IMPORTANT ENDPOINTS:
   - Health check:     /health (or https://your-domain.com/health)
   - Test endpoint:    /test-first
   - Phases 29-33:     /phases-29-33
   - API routes:       /api/phases-*

🔧 MAINTENANCE COMMANDS (on VPS):

   View logs:
   docker logs -f alawael-app

   Check status:
   docker ps

   Update image:
   docker pull <your-username>/alawael-backend:v1
   docker stop alawael-app
   docker rm alawael-app
   (then run docker run command again)

   Monitor resources:
   docker stats alawael-app

📚 REFERENCE FILES:
   ✓ DOCKER_DEPLOYMENT_GUIDE.md   (Complete detailed guide)
   ✓ DOCKER_QUICK_REFERENCE.txt   (Quick commands reference)
   ✓ docker-compose.yml           (Local testing config)
   ✓ Dockerfile                   (Production image definition)
   ✓ .dockerignore                (Build optimization)

🆘 SUPPORT:
   - Check Phase X section in DOCKER_DEPLOYMENT_GUIDE.md for details
   - View container logs: docker logs alawael-app
   - Troubleshooting: https://docs.docker.com
   - VPS issues: Check Hostinger support portal

📅 NEXT STEPS:
   1. Monitor application for 24 hours
   2. Setup backup strategy
   3. Configure monitoring/alerting
   4. Document any custom configurations
   5. Plan Phase 34 (if applicable)

╔═══════════════════════════════════════════════════════════════════════════╗
║        🎯 AL-AWAEL ERP Backend is PRODUCTION READY on Hostinger!         ║
║                  Status: LIVE ✅  Performance: OPTIMAL 📈                 ║
╚═══════════════════════════════════════════════════════════════════════════╝

" -ForegroundColor Green

To view this guide again, open: DOCKER_QUICK_REFERENCE.txt
For detailed instructions, see: DOCKER_DEPLOYMENT_GUIDE.md

Questions? Check the documentation files in your backend directory.
" -ForegroundColor Yellow

################################################################################
# ملحق الصيانة والنسخ الاحتياطي والمراقبة (مهم للإنتاج)
################################################################################

Write-Host @"
╔═══════════════════════════════════════════════════════════════════════════╗
║                🛡️  MAINTENANCE, BACKUP & MONITORING GUIDE              ║
╚═══════════════════════════════════════════════════════════════════════════╝

################################################################################
# QUICK ENGLISH SUMMARY (Best Practices)
################################################################################
# - Automated daily full backup (system + MongoDB) to /opt/backups
# - Telegram alert if main container is down (set BOT_TOKEN/CHAT_ID)
# - Netdata for live monitoring (http://your-vps-ip:19999)
# - Restore: untar backup, copy mongo archive, run mongorestore
# - Test restore monthly (schedule a test restore to a temp container)
# - Download backups off-server/cloud regularly (do NOT rely on local only)
# - All scripts are ready for crontab automation
# - For details, see below (Arabic + English comments)

################################################################################

################################################################################
# 🔄 BACKUP & MONITORING (IMPROVED BEST PRACTICES)
################################################################################

1️⃣ النسخ الاحتياطي التلقائي المتكامل (ملف واحد يشمل النظام وقاعدة البيانات):
-------------------------------------------------------------------------------
# /opt/backup-alawael.sh
#!/bin/bash
BACKUP_DIR="/opt/alawael"
DEST="/opt/backups"
DATE=$(date +%F)
MONGO_BACKUP="/tmp/mongo-backup-$DATE.archive"
mkdir -p "$DEST"
# أخذ نسخة من قاعدة البيانات (من داخل الحاوية)
docker exec alawael-app mongodump --archive=$MONGO_BACKUP
# نسخ ملف قاعدة البيانات من الحاوية
docker cp alawael-app:$MONGO_BACKUP $DEST/
# ضغط ملفات النظام وقاعدة البيانات معاً
tar czf "$DEST/alawael-full-backup-$DATE.tar.gz" "$BACKUP_DIR" "$DEST/mongo-backup-$DATE.archive"
# حذف نسخة قاعدة البيانات المؤقتة
docker exec alawael-app rm -f $MONGO_BACKUP
rm -f "$DEST/mongo-backup-$DATE.archive"
# حذف النسخ الأقدم من 7 أيام
find "$DEST" -name "alawael-full-backup-*.tar.gz" -mtime +7 -delete

# Monthly restore test (recommended):
# 0 3 1 * * /opt/test-restore-alawael.sh
# Example: Automated monthly restore test script
# /opt/test-restore-alawael.sh
#!/bin/bash
BACKUP_DATE=$(date +%F -d "-1 day")  # Use yesterday's backup
BACKUP_TAR="/opt/backups/alawael-full-backup-$BACKUP_DATE.tar.gz"
MONGO_ARCHIVE="/opt/backups/mongo-backup-$BACKUP_DATE.archive"
TMP_CONTAINER="alawael-restore-test"

# 1. Untar backup to /tmp/restore-test
mkdir -p /tmp/restore-test
tar xzf "$BACKUP_TAR" -C /tmp/restore-test

# 2. Start temp MongoDB container
docker run -d --name $TMP_CONTAINER -v /tmp/restore-test:/data/restore mongo:6 sleep 300
sleep 10

# 3. Restore DB to temp container
docker cp "$MONGO_ARCHIVE" $TMP_CONTAINER:/data/restore/
docker exec $TMP_CONTAINER mongorestore --archive=/data/restore/mongo-backup-$BACKUP_DATE.archive --drop

# 4. Check restore success (list databases)
docker exec $TMP_CONTAINER mongo --quiet --eval 'db.adminCommand({listDatabases:1})' > /tmp/restore-test/restore-check.log

# 4b. Check if production DB exists and has collections
HAS_PROD_DB=$(grep -o '"name" : "production"' /tmp/restore-test/restore-check.log | wc -l)
if [ "$HAS_PROD_DB" -eq 1 ]; then
    docker exec $TMP_CONTAINER mongo production --quiet --eval 'db.getCollectionNames()' > /tmp/restore-test/collections.log
    HAS_COLLECTIONS=$(cat /tmp/restore-test/collections.log | grep -v '\[\]' | wc -l)
else
    HAS_COLLECTIONS=0
fi

# 4c. Check if critical collection (users) has at least 1 document
HAS_USERS=0
if [ "$HAS_PROD_DB" -eq 1 ] && [ "$HAS_COLLECTIONS" -gt 0 ]; then
    USER_COUNT=$(docker exec $TMP_CONTAINER mongo production --quiet --eval 'db.users.countDocuments({})')
    if [ "$USER_COUNT" -ge 1 ]; then
        HAS_USERS=1
    fi
fi

# 5. Cleanup
docker rm -f $TMP_CONTAINER
rm -rf /tmp/restore-test

# 6. Telegram alert if restore failed or DB/collections missing
BOT_TOKEN="<TELEGRAM_BOT_TOKEN>"
CHAT_ID="<TELEGRAM_CHAT_ID>"

# Alert if restore failed, DB/collections missing, or users collection empty
if ! grep -q '"ok" : 1' /tmp/restore-test/restore-check.log || [ "$HAS_PROD_DB" -eq 0 ] || [ "$HAS_COLLECTIONS" -eq 0 ] || [ "$HAS_USERS" -eq 0 ]; then
    MSG="❌ Monthly restore test FAILED for $BACKUP_DATE! Check backup integrity or DB content."
    if [ "$HAS_USERS" -eq 0 ]; then
        MSG+=" [users collection is empty!]"
    fi
    curl -s -X POST "https://api.telegram.org/bot$BOT_TOKEN/sendMessage" -d chat_id=$CHAT_ID -d text="$MSG"
fi

# 7. Log result
echo "Restore test for $BACKUP_DATE completed. DB found: $HAS_PROD_DB, Collections: $HAS_COLLECTIONS. See /tmp/restore-test/restore-check.log"

chmod +x /opt/backup-alawael.sh
# أضف للـ crontab ليعمل يومياً 2 صباحاً:
# 0 2 * * * /opt/backup-alawael.sh

# لاستعادة النظام وقاعدة البيانات:
# 1. فك الضغط:
#    tar xzf /opt/backups/alawael-full-backup-YYYY-MM-DD.tar.gz -C /
# 2. استعادة قاعدة البيانات:
#    docker cp /opt/backups/mongo-backup-YYYY-MM-DD.archive alawael-app:/tmp/
#    docker exec -it alawael-app mongorestore --archive=/tmp/mongo-backup-YYYY-MM-DD.archive --drop
#    docker exec alawael-app rm -f /tmp/mongo-backup-YYYY-MM-DD.archive

⚠️ ملاحظة: اختبر النسخ الاحتياطي والاستعادة بشكل دوري وتأكد من سلامة البيانات.

2️⃣ مراقبة الحاويات والموارد:
----------------------------
# تثبيت Netdata (لوحة مراقبة فورية):
bash <(curl -Ss https://my-netdata.io/kickstart.sh)
# افتح http://your-vps-ip:19999

# مراقبة حالة الحاوية كل 5 دقائق:
*/5 * * * * docker ps --format '{{.Names}}: {{.Status}}' > /opt/docker-health.log

3️⃣ تنبيه عند توقف الحاوية (Telegram):
--------------------------------------
# استخدم Telegram Bot API لإرسال تنبيه فوري:
#!/bin/bash
BOT_TOKEN="<TELEGRAM_BOT_TOKEN>"   # Get from @BotFather
CHAT_ID="<TELEGRAM_CHAT_ID>"       # Get from @userinfobot or group
if ! docker ps | grep -q alawael-app; then
    MSG="🚨 Container alawael-app is DOWN on $(hostname)!"
    curl -s -X POST "https://api.telegram.org/bot$BOT_TOKEN/sendMessage" -d chat_id=$CHAT_ID -d text="$MSG"
fi
# Add to crontab every 5 min
# (You may also keep email alert if desired)

4️⃣ أوامر الصيانة والتحديث:
--------------------------
# مراقبة الحاوية:
docker ps
docker logs -f alawael-app
docker stats alawael-app

# تحديث التطبيق:
docker pull <your-username>/alawael-backend:v1
docker stop alawael-app
docker rm alawael-app
# ثم أعد تشغيل الحاوية كالمعتاد

# استعادة نسخة احتياطية كاملة:
tar xzf /opt/backups/alawael-full-backup-YYYY-MM-DD.tar.gz -C /
# ثم استعادة قاعدة البيانات كما هو موضح أعلاه

# اختبار الشهادة:
sudo certbot renew --dry-run
# إعادة تحميل Nginx:
sudo systemctl reload nginx

🔒 نصائح أمان:
- لا تترك ملفات النسخ الاحتياطي في نفس السيرفر لفترة طويلة، قم بتنزيلها بشكل دوري.
- استخدم كلمات مرور قوية لحسابات VPS وDocker Hub.
- راقب سجل الدخول إلى السيرفر وغيّر بيانات الدخول بشكل دوري.

☁️ Cloud Backup:
- Use rclone or similar to sync /opt/backups to Google Drive, S3, or OneDrive.
- Example: rclone sync /opt/backups remote:alawael-backups

🚨 Emergency Steps:
- If server fails: deploy new VPS, untar backup, restore MongoDB, update DNS.
- Keep a copy of this script and credentials in a safe place (offline/cloud).

📈 توصيات مراقبة متقدمة:
- اربط Netdata أو Prometheus/Grafana لمراقبة الأداء بشكل احترافي.
- أضف تنبيهات Slack أو SMS حسب الحاجة.

للمزيد من التفاصيل راجع: DOCKER_DEPLOYMENT_GUIDE.md
