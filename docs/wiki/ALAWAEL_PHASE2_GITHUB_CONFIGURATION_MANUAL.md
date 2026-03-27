# ALAWAEL Phase 2: GitHub Configuration - Manual Setup Guide

**Duration:** 30-45 minutes  
**Type:** Manual GitHub UI configuration  
**Status:** Ready to execute  
**Prerequisite:** GitHub account access to both repositories

---

## 📋 OVERVIEW

Phase 2 configures GitHub repositories for secure, automated deployment. This includes:
- ✅ Branch protection rules
- ✅ GitHub Environments (dev, staging, prod)
- ✅ GitHub Secrets for deployment
- ✅ Teams & permissions
- ✅ Status checks & code review requirements

---

## 🔐 STEP 1: Configure Branch Protection on Main Branch

### For alawael-backend Repository

1. **Navigate to repository settings:**
   - Go to: https://github.com/almashooq1/alawael-backend
   - Click: Settings (top right)
   - Click: Branches (left sidebar)

2. **Add branch protection rule for 'main':**
   - Click: "Add rule" button
   - Branch name pattern: `main`
   - Check: ✅ "Require a pull request before merging"
     - Sub-option: ✅ "Require approvals" → Set to: `1`
     - Sub-option: ✅ "Dismiss stale pull request approvals when new commits are pushed"
   - Check: ✅ "Require status checks to pass before merging"
     - Select: Any GitHub Actions checks (if available)
   - Check: ✅ "Require branches to be up to date before merging"
   - Check: ✅ "Include administrators"
   - Click: "Create" button

3. **Verify:**
   - Should see main branch is now "Protected"

### For alawael-erp Repository

Repeat the same steps for: https://github.com/almashooq1/alawael-erp

**Status:** ✅ Both repos now have protected main branches

---

## 🌍 STEP 2: Create GitHub Environments

### What is a GitHub Environment?

GitHub Environments allow you to define deployment rules for different stages:
- **dev**: Development deployments (no protection)
- **staging**: Staging deployments (manual approval optional)
- **production**: Production deployments (REQUIRES approval)

### Create Environments for alawael-backend

1. **Navigate to environments:**
   - Go to: https://github.com/almashooq1/alawael-backend
   - Click: Settings
   - Click: Environments (left sidebar)

2. **Create 'dev' environment:**
   - Click: "New environment" button
   - Name: `dev`
   - Configuration:
     - Do NOT enable "Protection rules"
     - Click: "Configure environment"
   - Click: "Save protection rules"

3. **Create 'staging' environment:**
   - Click: "New environment" button
   - Name: `staging`
   - Configuration:
     - Enable: ☐ "Required reviewers" (optional for staging)
     - Click: "Configure environment"
   - Click: "Save protection rules"

4. **Create 'production' environment:**
   - Click: "New environment" button
   - Name: `production`
   - Configuration:
     - Enable: ☑️ "Required reviewers"
     - Reviewers: Select your GitHub username (or team)
     - Enable: ☑️ "Prevent self-review"
     - Click: "Configure environment"
   - Click: "Save protection rules"

### Create Environments for alawael-erp

Repeat the same steps for: https://github.com/almashooq1/alawael-erp

**Status:** ✅ Both repos now have dev, staging, production environments

---

## 🔑 STEP 3: Configure GitHub Secrets

GitHub Secrets store sensitive values needed for deployment. These are encrypted and only accessible in GitHub Actions workflows.

### Add Secrets to alawael-backend

1. **Navigate to secrets:**
   - Go to: https://github.com/almashooq1/alawael-backend
   - Click: Settings
   - Click: Secrets and variables → Actions (left sidebar)

2. **Add these secrets** (click "New repository secret" for each):

   | Secret Name | Value | Example |
   |-------------|-------|---------|
   | `GITHUB_TOKEN` | (auto-generated) | Leave as-is |
   | `DOCKER_REGISTRY_USERNAME` | Your Docker Hub username | `almashooq1` |
   | `DOCKER_REGISTRY_PASSWORD` | Your Docker Hub password | `your-password` |
   | `SONAR_TOKEN` | SonarQube token (optional) | `squ_xxxxx` |
   | `DATABASE_URL` | Production database connection | `postgresql://...` |
   | `SLACK_WEBHOOK` | Slack notification webhook | `https://hooks.slack.com/...` |
   | `AWS_ACCESS_KEY_ID` | AWS IAM access key | `AKIAIOSFODNN7EXAMPLE` |
   | `AWS_SECRET_ACCESS_KEY` | AWS IAM secret key | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` |

3. **For each secret:**
   - Name: (use exact name from table above)
   - Value: (paste actual secret value)
   - Click: "Add secret"

### Add Secrets to alawael-erp

Repeat for same secrets: https://github.com/almashooq1/alawael-erp/settings/secrets/actions

**Status:** ✅ Both repos now have secrets configured

---

## 👥 STEP 4: Create & Configure Teams

GitHub Teams allow you to grant permissions to groups of people and set up required reviews.

### Create Team 'ALAWAEL-Admins'

1. **Navigate to organization teams:**
   - Go to: https://github.com/orgs/almashooq1/teams
   - Click: "New team" button
   - Team name: `ALAWAEL-Admins`
   - Visibility: `Closed`
   - Click: "Create team"

2. **Add members:**
   - Click: "Members" tab
   - Click: "Add a member"
   - Select your GitHub username + other admins
   - Role: `Maintainer`
   - Click: "Add"

3. **Grant repo access:**
   - Click: "Repositories" tab
   - Click: "Add repository"
   - Select: `almashooq1/alawael-backend`
   - Role: `Maintain` (can merge, cannot delete repo)
   - Click: "Add"
   - Repeat for `almashooq1/alawael-erp`

### Create Team 'ALAWAEL-Developers'

1. **Navigate to teams:**
   - Go to: https://github.com/orgs/almashooq1/teams
   - Click: "New team"
   - Team name: `ALAWAEL-Developers`
   - Visibility: `Closed`
   - Click: "Create team"

2. **Add members:**
   - Add 5 backend engineers
   - Role: `Member`

3. **Grant repo access:**
   - Both repos
   - Role: `Push` (can push code, create PRs)

### Create Team 'ALAWAEL-DevOps'

1. **Create team:**
   - Name: `ALAWAEL-DevOps`
   - Visibility: `Closed`

2. **Add members:**
   - 2 DevOps engineers
   - Role: `Member`

3. **Grant repo access:**
   - Both repos
   - Role: `Maintain` (can merge deployments)

### Create Team 'ALAWAEL-Security'

1. **Create team:**
   - Name: `ALAWAEL-Security`
   - Visibility: `Closed`

2. **Add members:**
   - Security team members
   - Role: `Member`

3. **Grant repo access:**
   - Both repos
   - Role: `Triage` (can see PRs, cannot merge)

**Status:** ✅ All 4 teams created with appropriate members

---

## 🔍 STEP 5: Configure Code Owners (CODEOWNERS file)

This file automatically assigns reviewers for specific code paths.

### For alawael-backend

1. **Create file:** `.github/CODEOWNERS`

2. **Add content:**
```
# Global owner (default for all files)
* @almashooq1

# Backend team owns these paths
/src/**/*.ts @almashooq1/alawael-developers
/src/routes/ @almashooq1/alawael-developers
/src/models/ @almashooq1/alawael-developers

# DevOps team owns deployment configs
/.github/workflows/ @almashooq1/alawael-devops
/docker/ @almashooq1/alawael-devops
/.alawael/ @almashooq1/alawael-devops

# Security team owns security configs
/security/ @almashooq1/alawael-security
```

3. **Commit & push** to main branch

### For alawael-erp

Create similar CODEOWNERS file for ERP repository

**Status:** ✅ CODEOWNERS files configured

---

## ✅ STEP 6: Verify Configuration

### Checklist for alawael-backend

- [ ] Settings > Branches > main branch is protected
- [ ] Settings > Environments > dev, staging, production created
- [ ] Settings > Secrets > All 8 secrets configured
- [ ] Organization > Teams > All 4 teams created
- [ ] Team members assigned to teams
- [ ] Team permissions set on repositories
- [ ] `.github/CODEOWNERS` file committed

### Checklist for alawael-erp

- [ ] Settings > Branches > main branch is protected
- [ ] Settings > Environments > dev, staging, production created
- [ ] Settings > Secrets > All 8 secrets configured
- [ ] Team permissions verified on repository
- [ ] `.github/CODEOWNERS` file committed

**Status:** ✅ Configuration verified

---

## 🚀 What These Settings Accomplish

| Setting | Purpose | Benefit |
|---------|---------|---------|
| **Branch Protection** | Requires PR review before merge to main | Prevents accidental direct commits |
| **Environments** | Stages deployment to dev → staging → prod | Controlled release pipeline |
| **Required Reviewers** | Production requires approval | No unreviewed code goes to prod |
| **Secrets** | Store and secure sensitive values | Passwords/tokens never exposed |
| **CODEOWNERS** | Auto-assign reviewers by code path | Right people review right code |
| **Teams** | Group permissions by role | Easier permission management |

---

## ⏱️ Time Estimate

| Step | Duration | Effort |
|------|----------|--------|
| 1. Branch Protection | 8 min | Low |
| 2. Environments | 10 min | Low |
| 3. Secrets | 15 min | Medium (gathering values) |
| 4. Teams | 12 min | Low |
| 5. CODEOWNERS | 5 min | Low |
| 6. Verification | 5 min | Low |
| **TOTAL** | **~55 min** | Low-Medium |

---

## 📝 Notes & Tips

### Secret Values
- Docker Registry credentials: From Docker Hub account
- SonarQube token: From SonarQube project settings
- Database URL: From RDS connection string
- Slack webhook: From Slack app configuration
- AWS keys: From IAM console (create new programmatic access)

### Team Management
- Use organization teams (don't add permissions per-repo)
- Easier to manage: change 1 team member, grants all permission changes
- Document which team has which role in your internal wiki

### Code Review Requirements
- Require at least 1 reviewer for main branch
- For production: require approval from senior engineer
- Use protected branches to enforce review

### Automation Benefits
- GitHub Actions can use these secrets safely
- Environments segment deployments by stage
- Teams automate permissions (no manual per-user setup)

---

## ✅ SUCCESS CRITERIA

- **All repositories protected:** ✅ main branch requires PR + review
- **Environments created:** ✅ dev, staging, production available
- **Secrets configured:** ✅ All 8 secrets stored & accessible
- **Teams assigned:** ✅ Developers, DevOps, Security teams ready
- **Code review enforced:** ✅ CODEOWNERS + branch protection active

---

## 🔐 Security Checklist

- [ ] No secrets stored in code (using GitHub Secrets)
- [ ] Branch protection prevents direct commits
- [ ] Code review required (CODEOWNERS enforces)
- [ ] Production requires special approval
- [ ] Teams separate by role/responsibility
- [ ] Least privilege: Each role has minimum required permissions

---

## 🎯 Next Phase

After completing Phase 2:

**Phase 3: Staging Deployment (45 minutes, automated)**
```bash
bash alawael-phase3-staging-deploy.sh
```

This will:
- Deploy v1.0.0 to staging environment
- Run smoke tests automatically
- Validate SLA metrics
- Generate deployment report

---

## 📞 Troubleshooting

| Issue | Solution |
|-------|----------|
| Can't create team | Check org admin permissions |
| Branch protection won't save | Ensure pull request check is available |
| Secrets not showing in Actions | Refresh page or re-login |
| Teams not seeing repos | Check team repo permissions granted |
| Secrets won't save | Check secret length/format (max 64KB) |

---

## ✅ Phase 2 Complete!

Once you've completed all steps:

1. ✅ Commit any file changes (CODEOWNERS)
2. ✅ Verify all GitHub settings
3. ✅ Notify team of new environment
4. ✅ Proceed to Phase 3: Staging Deployment

---

**Prepared by:** GitHub Copilot  
**Date:** February 22, 2026  
**Status:** Ready to Execute
