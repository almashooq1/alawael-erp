# Railway Deployment Guide - Step by Step (English)

## 🚀 Complete Deployment Steps

### Step 1: Upload Code to GitHub ⏳

**First, we need to upload your code to GitHub:**

```bash
# In your project folder
git init
git add .
git commit -m "Alawael ERP System - Ready for deployment"
git branch -M main
git remote add origin https://github.com/yourusername/alawael-erp.git
git push -u origin main
```

**If you don't have a GitHub repository yet:**
1. Go to **github.com**
2. Click **"New repository"**
3. Name it: `alawael-erp-system`
4. Click **"Create repository"**
5. Copy the repository URL

### Step 2: Create Railway Account ✅

1. Go to: **https://railway.app**
2. Click **"Sign up"** or **"Login with GitHub"**
3. Choose **"Continue with GitHub"**
4. Accept permissions

### Step 3: Create New Project ✅

1. In Railway Dashboard click **"New Project"**
2. Select **"GitHub Repo"** ✅
3. You'll see a list of your repositories

### Step 4: Select Your Repository 🔄

**Look for your project repository:**
- Name: `splitwise` or `alawael-erp-system`
- Contains `app.py` file
- Click on the repository name

### Step 5: Wait for Initial Deployment ⏳

**What will happen:**
- Railway will detect it's a Python project
- Read `requirements.txt` file
- Install required libraries (2-3 minutes)
- Try to run the application

**Expected result:**
- ✅ Deployment will partially succeed
- ❌ App won't work yet (we need database)

### Step 6: Add Database

**In Railway Dashboard:**
1. Click **"Add Service"** or **"+"**
2. Select **"PostgreSQL"**
3. Wait 1-2 minutes for setup
4. You'll get `DATABASE_URL` automatically

### Step 7: Configure Environment Variables

**Click on your app service (Web Service):**
1. Go to **"Variables"** tab
2. Add these variables:

```bash
SECRET_KEY=your-32-character-secret-key-here
JWT_SECRET_KEY=your-32-character-jwt-secret-here
FLASK_ENV=production
DATABASE_URI=postgresql://... (will be created automatically)
```

**To generate secure keys:**
```python
import secrets
print(secrets.token_urlsafe(32))  # Copy result for SECRET_KEY
print(secrets.token_urlsafe(32))  # Copy result for JWT_SECRET_KEY
```

### Step 8: Redeploy

**After adding variables:**
- Railway will redeploy automatically
- Wait 2-3 minutes
- You'll get a working URL

### Step 9: Test the System

**Final URL:**
```
https://your-project-name.railway.app
```

**Test:**
- ✅ Open homepage
- ✅ Login functionality
- ✅ Access AI features page

## 🔧 Troubleshooting

### Problem: "Application Error"
**Solution:**
- Check Variables tab
- Ensure DATABASE_URL exists
- Review Logs in Railway

### Problem: "Build Failed"
**Solution:**
- Check `requirements.txt` file
- Ensure `Procfile` exists

### Problem: "Database Connection Error"
**Solution:**
- Make sure PostgreSQL Service is added
- Check DATABASE_URL in Variables

## ⏱️ Expected Timeline

- **Initial setup**: 5-10 minutes
- **First deployment**: 3-5 minutes
- **Add database**: 2-3 minutes
- **Final configuration**: 2-3 minutes

**Total: 15-20 minutes for fully working system**

## 🎯 Current Step

**You are now at Step 4:**
- Select your project repository from GitHub list
- Look for `splitwise` or your project name
- Click on it to start deployment

## 📋 Quick Commands

**If repository doesn't exist, create it first:**

```bash
# Initialize git
git init

# Add all files
git add .

# Commit changes
git commit -m "Initial commit - Alawael ERP System"

# Set main branch
git branch -M main

# Add remote origin (replace with your GitHub URL)
git remote add origin https://github.com/yourusername/alawael-erp.git

# Push to GitHub
git push -u origin main
```

## 🌐 What You'll Get

After successful deployment:
- **Live URL**: `https://your-project.railway.app`
- **SSL Certificate**: Automatic HTTPS
- **Database**: PostgreSQL with backups
- **Auto-deploy**: Updates when you push to GitHub
- **Monitoring**: Built-in logs and metrics
