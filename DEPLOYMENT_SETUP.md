# ═══════════════════════════════════════════════════════════════════════════════
# Al-Awael ERP — GitHub Actions + VPS Deployment Setup Guide
# ═══════════════════════════════════════════════════════════════════════════════
#
# This guide walks you through setting up automatic deployment (CD)
# from GitHub to your VPS server using GitHub Actions.
#
# What you'll get:
#   • Every push to `main` → automatic deployment to your VPS
#   • Manual deployment trigger via workflow_dispatch
#   • Health check after each deploy
#   • Docker Compose: MongoDB + Redis + Backend + Nginx
#
# Estimated time: 30–45 minutes (first time)
# ═══════════════════════════════════════════════════════════════════════════════

---

## 📋 Prerequisites

| Requirement | Details |
|-------------|---------|
| **VPS Server** | Ubuntu 22.04/24.04 LTS (2 vCPU, 4GB RAM minimum) |
| **Domain** | Optional but recommended (e.g., alawael.org) |
| **GitHub Account** | With admin access to this repository |
| **SSH Client** | On your local machine (PowerShell, Terminal, or PuTTY) |

**VPS Providers:** DigitalOcean, AWS Lightsail, Hetzner, Linode, Vultr, Hostinger

---

## 🚀 Step 1: Prepare Your VPS

### 1.1 Connect to your VPS
```bash
ssh root@YOUR_VPS_IP
```

### 1.2 Create a deployment user (recommended)
```bash
# Create user and add to sudo group
adduser alawael
usermod -aG sudo alawael

# Switch to the new user
su - alawael
```

### 1.3 Install Docker & Docker Compose
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
sudo apt install -y curl ca-certificates gnupg lsb-release

# Add Docker's official GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Add Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine + Compose
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Add your user to docker group (so you can run docker without sudo)
sudo usermod -aG docker $USER

# Verify installation
docker --version
docker compose version
```

**⚠️ Important:** Log out and log back in for the docker group to take effect:
```bash
exit
# Then reconnect
ssh alawael@YOUR_VPS_IP
```

### 1.4 Set up app directory
```bash
# Create the app directory
sudo mkdir -p /opt/alawael-erp
sudo chown $USER:$USER /opt/alawael-erp

# Clone the repository
cd /opt
# If you already have the repo, skip this step
git clone https://github.com/almashooq1/alawael-erp.git alawael-erp

cd /opt/alawael-erp
# Verify the files are there
ls -la
```

---

## 🔐 Step 2: Create .env File

The `.env` file contains all secrets and configuration. **Never commit it to GitHub!**

```bash
cd /opt/alawael-erp

# Copy from the example file
cp .env.example .env

# Edit the file (use nano or vim)
nano .env
```

### Required minimum values (set these first):

```env
# ─── REQUIRED SECRETS ───────────────────────────────────────────────────────
MONGO_ROOT_USER=admin
MONGO_ROOT_PASSWORD=YourStrongMongoPassword123!
REDIS_PASSWORD=YourStrongRedisPassword456!
JWT_SECRET=GenerateWithNodeJsCommandBelow
JWT_REFRESH_SECRET=GenerateWithNodeJsCommandBelow
SETUP_SECRET_KEY=GenerateWithNodeJsCommandBelow
ADMIN_EMAIL=admin@alawael.com
ADMIN_PASSWORD=YourStrongAdminPassword789!

# ─── Basic Environment ──────────────────────────────────────────────────────
NODE_ENV=production
TZ=Asia/Riyadh
CORS_ORIGINS=http://YOUR_VPS_IP,https://yourdomain.com
```

### Generate random secrets:
```bash
# Run this on your VPS to generate strong random secrets
node -e "console.log('JWT_SECRET:', require('crypto').randomBytes(64).toString('hex'))"
node -e "console.log('JWT_REFRESH_SECRET:', require('crypto').randomBytes(64).toString('hex'))"
node -e "console.log('SETUP_SECRET_KEY:', require('crypto').randomBytes(64).toString('hex'))"
```

**Copy each generated value into your `.env` file.**

### Save and exit:
- In nano: `Ctrl+O`, `Enter`, `Ctrl+X`

---

## 🔑 Step 3: Generate SSH Key for GitHub Actions

GitHub Actions needs an SSH key to connect to your VPS and run deployment commands.

### 3.1 Generate the key on your VPS:
```bash
# Run as the deployment user (alawael)
ssh-keygen -t ed25519 -f ~/.ssh/github_deploy -C "github-actions-deploy" -N ""

# This creates:
#   ~/.ssh/github_deploy      (private key — goes to GitHub Secrets)
#   ~/.ssh/github_deploy.pub  (public key — stays on VPS)
```

### 3.2 Add the public key to authorized_keys:
```bash
cat ~/.ssh/github_deploy.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

### 3.3 Copy the private key (to add to GitHub):
```bash
cat ~/.ssh/github_deploy
```

**Copy the entire output** (including `-----BEGIN OPENSSH PRIVATE KEY-----` and `-----END OPENSSH PRIVATE KEY-----`). You'll paste this into GitHub.

---

## ⚙️ Step 4: Add GitHub Secrets

Go to your repository on GitHub and add these secrets:

### 4.1 Navigate to GitHub Secrets
```
https://github.com/almashooq1/alawael-erp/settings/secrets/actions
```

Or: GitHub → Repository → Settings → Secrets and variables → Actions → New repository secret

### 4.2 Add these 4 secrets:

| Secret Name | Value | Description |
|-------------|-------|-------------|
| `VPS_HOST` | `YOUR_VPS_IP` (e.g., `203.0.113.45`) | Your VPS IP address |
| `VPS_USER` | `alawael` (or `root`) | SSH username |
| `VPS_SSH_KEY` | Paste the private key from Step 3.3 | The entire `-----BEGIN OPENSSH PRIVATE KEY-----` ... `-----END OPENSSH PRIVATE KEY-----` |

**⚠️ Important:** The `VPS_SSH_KEY` secret must include the entire key, including the begin/end lines. No extra spaces at the end.

---

## 🐳 Step 5: First Manual Test (Optional but Recommended)

Before relying on GitHub Actions, test the Docker setup manually on your VPS:

```bash
cd /opt/alawael-erp

# Check if .env is ready
cat .env | grep MONGO_ROOT_PASSWORD

# Start the services
docker compose -f docker-compose.yml -f docker-compose.production.yml up -d --build

# Check if containers are running
docker ps

# Check logs
docker compose logs -f backend
```

Wait 30–60 seconds, then test:
```bash
# Health check (from the VPS itself)
curl http://localhost:3001/health

# From your local computer (replace with your VPS IP)
curl http://YOUR_VPS_IP:3001/health
```

You should see a JSON response like:
```json
{"status":"ok","timestamp":"...","version":"1.0.0"}
```

---

## 🚀 Step 6: Trigger Automatic Deployment

### Option A: Push to main (automatic)
```bash
# On your local machine, make sure you have the latest changes
git pull origin main

# Make any change (even a small one), commit, and push
echo "# Deploy test" >> README.md
git add README.md
git commit -m "Trigger deployment"
git push origin main
```

### Option B: Manual trigger (workflow_dispatch)
1. Go to GitHub → Actions → "🚀 Deploy to VPS"
2. Click "Run workflow"
3. Type `deploy` in the confirm field
4. Click "Run workflow"

### Monitor the deployment:
1. Go to GitHub → Actions tab
2. Click on the running "Deploy to VPS" workflow
3. Watch the logs in real-time

---

## ✅ Step 7: Verify Deployment

After the GitHub Actions workflow completes (green checkmark):

```bash
# Test from your local computer
curl http://YOUR_VPS_IP:3001/health

# Or open in browser
http://YOUR_VPS_IP:3001/api-docs
```

---

## 🔧 Troubleshooting

### ❌ "Docker is not installed"
```bash
# Reinstall Docker on VPS
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Log out and back in
```

### ❌ ".env file not found"
Make sure you created `.env` at `/opt/alawael-erp/.env` (not in a subdirectory).

```bash
cd /opt/alawael-erp
ls -la .env
# If not found:
cp .env.example .env
nano .env
```

### ❌ "SSH connection failed"
1. Check that the VPS IP is correct in `VPS_HOST` secret
2. Check that the SSH port is open (default 22)
3. Check firewall: `sudo ufw status`
4. Verify the SSH key works:
```bash
# From your local machine (not the VPS)
ssh -i ~/.ssh/github_deploy alawael@YOUR_VPS_IP
```

### ❌ "Health check failed after deploy"
```bash
# On the VPS, check backend logs
docker compose logs --tail 100 backend

# Check if MongoDB is running
docker compose logs --tail 50 mongodb

# Check if all containers are up
docker ps
```

### ❌ "Permission denied (publickey)"
1. Make sure the public key is in `~/.ssh/authorized_keys` on the VPS
2. Make sure `authorized_keys` has correct permissions: `chmod 600 ~/.ssh/authorized_keys`
3. Make sure the private key in GitHub Secrets is complete (no missing lines)

### ❌ Docker Compose "missing required variable"
Your `.env` file is missing required values. Check:
```bash
docker compose -f docker-compose.yml -f docker-compose.production.yml config
# This will show which variables are missing
```

---

## 📊 Useful Commands (on the VPS)

```bash
# View all running containers
docker ps

# View backend logs
docker compose logs -f backend

# View MongoDB logs
docker compose logs -f mongodb

# Restart all services
docker compose restart

# Rebuild and restart
docker compose -f docker-compose.yml -f docker-compose.production.yml up -d --build

# Stop all services
docker compose down

# Stop and remove data (⚠️ WARNING: deletes all data)
docker compose down -v

# Update code and redeploy manually
cd /opt/alawael-erp
git pull origin main
docker compose -f docker-compose.yml -f docker-compose.production.yml up -d --build
```

---

## 🛡️ Security Checklist

- [ ] `.env` file is NOT committed to GitHub (check `.gitignore`)
- [ ] SSH key is only used for deployment (not for daily login)
- [ ] Root login is disabled on VPS (`PermitRootLogin no` in `/etc/ssh/sshd_config`)
- [ ] Firewall allows only ports 22, 80, 443 (`sudo ufw allow 22 && sudo ufw allow 80 && sudo ufw allow 443 && sudo ufw enable`)
- [ ] Strong passwords are used for MONGO_ROOT_PASSWORD, REDIS_PASSWORD, JWT_SECRET, ADMIN_PASSWORD
- [ ] HTTPS/SSL is configured (see `scripts/letsencrypt-setup.sh` or use Cloudflare)

---

## 📚 Next Steps

1. **Set up SSL/HTTPS**: Use Let's Encrypt (`scripts/letsencrypt-setup.sh`) or Cloudflare
2. **Set up monitoring**: Enable `health-check.yml` workflow for automated health checks
3. **Set up backups**: Use `scripts/backup.sh` or configure MongoDB backups
4. **Set up domain**: Point your domain's A record to the VPS IP

---

## 🆘 Need Help?

If you get stuck, check:
1. The VPS_SETUP_GUIDE.md (more detailed manual setup)
2. GitHub Actions logs (Actions tab → click on the failed run)
3. Docker logs on the VPS (`docker compose logs`)

**Common first-time issues:**
- Forgetting to create `.env` on the VPS
- SSH key not working (wrong permissions or missing in authorized_keys)
- Docker not running (`sudo systemctl start docker`)
- Wrong `APP_DIR` path (must be `/opt/alawael-erp`)
