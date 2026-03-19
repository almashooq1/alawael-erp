# Hostinger VPS Deployment - Quick Reference
# ════════════════════════════════════════════

# Step 1: SSH into your VPS
ssh root@YOUR_SERVER_IP

# Step 2: Upload files (from your local machine)
scp -r backend/ root@YOUR_SERVER_IP:/home/alawael/app/backend/
scp -r frontend/ root@YOUR_SERVER_IP:/home/alawael/app/frontend/
scp -r deploy/ root@YOUR_SERVER_IP:/home/alawael/app/deploy/

# Step 3: Run server setup (on VPS)
cd /home/alawael/app
chmod +x deploy/hostinger/setup-server.sh
sudo bash deploy/hostinger/setup-server.sh

# Step 4: Configure .env (on VPS)
cp deploy/hostinger/.env.production backend/.env
nano backend/.env
# → Set MONGODB_URI, JWT secrets, CORS_ORIGIN, FRONTEND_URL

# Step 5: Update frontend domain (on VPS)
nano frontend/.env.production
# → Replace YOUR_DOMAIN.com with your actual domain

# Step 6: Deploy! (on VPS)
chmod +x deploy/hostinger/deploy.sh
sudo -u alawael bash deploy/hostinger/deploy.sh

# Step 7: Verify
curl https://yourdomain.com/health
pm2 list
