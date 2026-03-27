# 🚀 ALAWAEL v1.0.0 - Phase 2: GitHub Configuration Guide

**Date:** February 22, 2026  
**Status:** Ready for Manual Configuration  
**Duration:** 30-45 minutes  

---

## 📋 What This Phase Does

Configures GitHub repositories for production-grade deployment automation:
- ✅ Branch protection rules (prevent direct pushes, require reviews)
- ✅ Deployment environments (dev, staging, production)
- ✅ GitHub secrets (safe credential storage)
- ✅ Required status checks (enforce quality gates)
- ✅ Teams & permissions (access control)

---

## 🎯 Quick Checklist

**Total Steps:** 3 main sections  
**Time Estimate:** 30-45 minutes  
**Manual Required:** Yes (GitHub UI)  

---

## ▶️ SECTION 1: Configure Backend Repository

### Repository: almashooq1/alawael-backend
**URL:** https://github.com/almashooq1/alawael-backend

### Step 1.1: Enable Branch Protection

1. Go to: **Settings → Branches**
2. Click "Add rule" button
3. Enter "main" in pattern box
4. Enable these checkboxes:
   - ✅ "Require a pull request before merging"
   - ✅ "Require 2 approvals for pull requests"
   - ✅ "Require status checks to pass before merging"
   - ✅ "Require branches to be up to date"
   - ✅ "Require code reviews before merging"
5. Click "Create"

**Expected Result:** ✅ Main branch protected

---

### Step 1.2: Create Deployment Environments

**Create "dev" Environment:**
1. Go to: **Settings → Environments**
2. Click "New environment"
3. Enter: `dev`
4. Click "Configure environment"
5. Leave defaults, click "Save"

**Create "staging" Environment:**
1. Click "New environment"
2. Enter: `staging`
3. Click "Configure environment"
4. Enable "Require reviewers" (optional)
5. Set "Wait timer" to "3600" seconds (1 hour)
6. Click "Save"

**Create "production" Environment:**
1. Click "New environment"
2. Enter: `production`
3. Click "Configure environment"
4. Enable "Require reviewers": Add DevOps team
5. Set "Wait timer" to "3600" seconds (1 hour)
6. Click "Save"

**Expected Result:** ✅ Three environments created (dev, staging, production)

---

### Step 1.3: Configure GitHub Secrets

1. Go to: **Settings → Secrets and variables → Actions**
2. Click "New repository secret" button
3. Create 6 secrets:

| Secret Name | Value | Notes |
|-------------|-------|-------|
| `GITHUB_TOKEN` | Your GitHub token | For automated deployments |
| `SONAR_TOKEN` | SonarQube token | For code quality |
| `SNYK_TOKEN` | Snyk security token | For vulnerability scanning |
| `DEPLOY_TOKEN` | Docker/Package registry token | For image push |
| `SLACK_WEBHOOK` | Slack webhook URL | For notifications |
| `DATABASE_PASSWORD` | Production DB password | For deployment |

**For each secret:**
1. Click "New repository secret"
2. Paste Name
3. Paste Value
4. Click "Add secret"

**Expected Result:** ✅ 6 secrets configured

---

### Step 1.4: Add Repository Labels

1. Go to: **Issues → Labels**
2. Click "New label"
3. Add these labels:
   - `alawael` (color: blue)
   - `deployment` (color: green)
   - `critical` (color: red)
   - `enhancement` (color: purple)
4. Click "Create label"

**Expected Result:** ✅ Labels created for issue management

---

### Step 1.5: Enable Actions

1. Go to: **Actions**
2. Should see: "alawael-health-check" workflow
3. Click on it
4. If showing "Needs permission", click "Enable"
5. Click "Run workflow" → "Run workflow" to test

**Expected Result:** ✅ Workflow visible and executable

---

## ▶️ SECTION 2: Configure ERP Repository

### Repository: almashooq1/alawael-erp
**URL:** https://github.com/almashooq1/alawael-erp

### Repeat All Steps from SECTION 1

Apply identical configuration as backend repository:
- ✅ Step 2.1: Branch protection (main branch)
- ✅ Step 2.2: Deployment environments (dev, staging, production)
- ✅ Step 2.3: GitHub secrets (6 secrets)
- ✅ Step 2.4: Labels
- ✅ Step 2.5: Enable Actions workflow

---

## ▶️ SECTION 3: Organization-Level Configuration

### Create GitHub Teams

**Location:** https://github.com/organizations/almashooq1/settings/teams

#### Team 1: alawael-admins
1. Click "New team"
2. Name: `alawael-admins`
3. Description: "ALAWAEL deployment administrators and infrastructure leads"
4. Click "Create team"
5. Add members (yourself, infrastructure team)
6. Go to team settings
7. Add repositories:
   - `alawael-backend`: Admin role
   - `alawael-erp`: Admin role

#### Team 2: alawael-developers
1. Click "New team"
2. Name: `alawael-developers`
3. Description: "ALAWAEL development team with write access"
4. Click "Create team"
5. Add members (backend team, ERP developers)
6. Add repositories:
   - `alawael-backend`: Write role
   - `alawael-erp`: Write role

#### Team 3: alawael-ops
1. Click "New team"
2. Name: `alawael-ops`
3. Description: "ALAWAEL operations and deployment team"
4. Click "Create team"
5. Add members (DevOps/SRE team)
6. Add repositories:
   - `alawael-backend`: Maintain role
   - `alawael-erp`: Maintain role

#### Team 4: alawael-security
1. Click "New team"
2. Name: `alawael-security`
3. Description: "Security engineering and compliance team"
4. Click "Create team"
5. Add members (security team)
6. Add repositories:
   - `alawael-backend`: Read role
   - `alawael-erp`: Read role

**Team Access Levels:**
- **Admin:** Full control (force push, delete branches, admin settings)
- **Maintain:** Deploy & merge (can't delete branches or change settings)
- **Write:** Push & merge PRs (standard developer access)
- **Read:** View only (review & comment, no merge)

---

## 📊 Configuration Summary

### Backend Repository (alawael-backend)
- ✅ Branch protection on main
- ✅ 3 environments (dev, staging, production)
- ✅ 6 secrets configured
- ✅ 4 labels created
- ✅ Actions workflow enabled
- **Status:** Ready for deployment

### ERP Repository (alawael-erp)
- ✅ Branch protection on main
- ✅ 3 environments (dev, staging, production)
- ✅ 6 secrets configured
- ✅ 4 labels created
- ✅ Actions workflow enabled
- **Status:** Ready for deployment

### Organization (almashooq1)
- ✅ 4 teams created
- ✅ Team permissions assigned
- ✅ Repository access configured
- **Status:** Ready for team collaboration

---

## ⏱️ Estimated Time

| Task | Time |
|------|------|
| Backend branch protection | 3 min |
| Backend environments | 5 min |
| Backend secrets (6×) | 5 min |
| Backend labels | 2 min |
| ERP configuration (repeat) | 15 min |
| Teams creation | 10 min |
| **Total** | **40 minutes** |

---

## ✅ Verification Checklist

After completing all steps, verify:

### Backend (alawael-backend)
- [ ] Settings → Branches shows "main" protected
- [ ] Settings → Environments shows dev, staging, production
- [ ] Settings → Secrets shows 6 secrets (names only visible)
- [ ] Actions tab shows "alawael-health-check" workflow
- [ ] Running workflow shows all 7 steps completing

### ERP (alawael-erp)
- [ ] Settings → Branches shows "main" protected
- [ ] Settings → Environments shows dev, staging, production
- [ ] Settings → Secrets shows 6 secrets
- [ ] Actions tab shows "alawael-health-check" workflow
- [ ] Running workflow shows all 7 steps completing

### Organization
- [ ] Teams page shows 4 ALAWAEL teams
- [ ] Each team has correct members and repository permissions

---

## 📞 Need Help?

**GitHub branch protection:** https://docs.github.com/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches  
**Deployment environments:** https://docs.github.com/actions/deployment/targeting-different-environments/using-environments-for-deployment  
**GitHub secrets:** https://docs.github.com/actions/security-guides/encrypted-secrets  
**Teams & permissions:** https://docs.github.com/organizations/organizing-members-into-teams  

---

## 🚀 Next Phase

Once Phase 2 is complete:

```bash
# Phase 3: Deploy to Staging
bash alawael-deployment.sh canary staging

# Phase 4: Deploy to Production
bash alawael-deployment.sh blue-green production
```

---

## 📋 Automated Configuration (Alternative)

If you have GitHub CLI installed:

```bash
bash alawael-github-phase2-setup.sh
```

This script automates most of Phase 2, but still requires:
- Manual team creation
- Manual secret values entry
- Manual branch protection (some settings)

---

**Status:** Phase 2 Guide Ready  
**Next:** Complete the checklist items above, then proceed to Phase 3

