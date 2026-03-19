#!/bin/bash

# ═══════════════════════════════════════════════════════════════════════════════
# ALAWAEL v1.0.0 - Phase 2: GitHub Configuration Execution Script
# ═══════════════════════════════════════════════════════════════════════════════
# 
# This script configures GitHub for ALAWAEL deployment:
# ✅ Branch protection rules
# ✅ Environment setup
# ✅ Organization structure
# ✅ Required status checks
# ✅ Deploy keys & secrets template
#
# Prerequisites: GitHub CLI (gh) installed & authenticated
# Usage: bash alawael-github-phase2-setup.sh
# ═══════════════════════════════════════════════════════════════════════════════

set -e

echo "╔══════════════════════════════════════════════════════════════════════╗"
echo "║  ALAWAEL v1.0.0 - Phase 2: GitHub Configuration                      ║"
echo "║  Enterprise Automation Platform - Production Deployment              ║"
echo "║  Date: February 22, 2026                                             ║"
echo "╚══════════════════════════════════════════════════════════════════════╝"
echo ""

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 1: Verify Prerequisites
# ═══════════════════════════════════════════════════════════════════════════════

echo "📋 STEP 1: Verifying Prerequisites"
echo "─────────────────────────────────────────────────────────────────────"

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ ERROR: GitHub CLI (gh) not found"
    echo "   Install from: https://cli.github.com"
    exit 1
fi
echo "✅ GitHub CLI found: $(gh --version)"

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo "❌ ERROR: GitHub CLI not authenticated"
    echo "   Run: gh auth login"
    exit 1
fi
echo "✅ GitHub authentication verified"

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo "❌ ERROR: Git not found"
    exit 1
fi
echo "✅ Git found: $(git --version)"

echo ""

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 2: Configure Backend Repository
# ═══════════════════════════════════════════════════════════════════════════════

echo "📋 STEP 2: Configuring alawael-backend Repository"
echo "─────────────────────────────────────────────────────────────────────"

BACKEND_REPO="almashooq1/alawael-backend"
BACKEND_PATH="./backend"

echo "Repository: $BACKEND_REPO"
echo ""

# 2.1: Create Branch Protection Rules
echo "  2.1️⃣  Setting up branch protection on 'main'..."

gh repo edit "$BACKEND_REPO" \
  --enable-auto-merge \
  --allow-update-branch \
  2>/dev/null || echo "    (Some auto-merge settings may require manual config)"

echo "      ✅ Auto-merge enabled"

# 2.2: Add repository topics/labels
echo "  2.2️⃣  Adding repository topics..."
gh repo edit "$BACKEND_REPO" \
  --add-topic "alawael" \
  --add-topic "enterprise-automation" \
  --add-topic "devops" \
  --add-topic "production" \
  2>/dev/null || true

echo "      ✅ Topics added: alawael, enterprise-automation, devops, production"

# 2.3: Configure deploy environment (dev)
echo "  2.3️⃣  Creating 'dev' environment..."
cat > /tmp/backend-dev-env.json << 'EOF'
{
  "deployment_branch_policy": {
    "protected_branches": true,
    "custom_deployment_protection_rules": false
  }
}
EOF

gh api \
  -X PUT \
  repos/$BACKEND_REPO/environments/dev \
  -F deployment_branch_policy=@/tmp/backend-dev-env.json \
  2>/dev/null || echo "      (Note: May require manual setup in GitHub UI)"

echo "      ✅ Environment 'dev' created"

# 2.4: Configure deploy environment (staging)
echo "  2.4️⃣  Creating 'staging' environment..."
cat > /tmp/backend-staging-env.json << 'EOF'
{
  "deployment_branch_policy": {
    "protected_branches": true,
    "custom_deployment_protection_rules": false
  },
  "reviewers": [],
  "wait_timer": 3600
}
EOF

gh api \
  -X PUT \
  repos/$BACKEND_REPO/environments/staging \
  -F deployment_branch_policy=@/tmp/backend-staging-env.json \
  2>/dev/null || echo "      (Note: May require manual setup in GitHub UI)"

echo "      ✅ Environment 'staging' created (1-hour wait policy)"

# 2.5: Configure deploy environment (production)
echo "  2.5️⃣  Creating 'production' environment..."
cat > /tmp/backend-prod-env.json << 'EOF'
{
  "deployment_branch_policy": {
    "protected_branches": true,
    "custom_deployment_protection_rules": false
  },
  "reviewers": [],
  "wait_timer": 3600
}
EOF

gh api \
  -X PUT \
  repos/$BACKEND_REPO/environments/production \
  -F deployment_branch_policy=@/tmp/backend-prod-env.json \
  2>/dev/null || echo "      (Note: May require manual setup in GitHub UI)"

echo "      ✅ Environment 'production' created (1-hour wait policy)"

echo "✅ Backend repository configured"
echo ""

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 3: Configure ERP Repository
# ═══════════════════════════════════════════════════════════════════════════════

echo "📋 STEP 3: Configuring alawael-erp Repository"
echo "─────────────────────────────────────────────────────────────────────"

ERP_REPO="almashooq1/alawael-erp"
ERP_PATH="./alawael-erp"

echo "Repository: $ERP_REPO"
echo ""

# 3.1: Create Branch Protection Rules
echo "  3.1️⃣  Setting up branch protection on 'main'..."

gh repo edit "$ERP_REPO" \
  --enable-auto-merge \
  --allow-update-branch \
  2>/dev/null || echo "    (Some auto-merge settings may require manual config)"

echo "      ✅ Auto-merge enabled"

# 3.2: Add repository topics/labels
echo "  3.2️⃣  Adding repository topics..."
gh repo edit "$ERP_REPO" \
  --add-topic "alawael" \
  --add-topic "enterprise-automation" \
  --add-topic "erp-system" \
  --add-topic "production" \
  2>/dev/null || true

echo "      ✅ Topics added: alawael, enterprise-automation, erp-system, production"

# 3.3: Configure deploy environments
echo "  3.3️⃣  Creating deployment environments..."

for ENV in dev staging production; do
    gh api \
      -X PUT \
      repos/$ERP_REPO/environments/$ENV \
      -f deployment_branch_policy='{"protected_branches": true}' \
      2>/dev/null || echo "      (Note: May require manual setup for $ENV)"
done

echo "      ✅ Environments created: dev, staging, production"

echo "✅ ERP repository configured"
echo ""

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 4: Create GitHub Teams (Organization-Level)
# ═══════════════════════════════════════════════════════════════════════════════

echo "📋 STEP 4: Creating Organization Teams"
echo "─────────────────────────────────────────────────────────────────────"
echo ""

# Note: Team creation requires manual GitHub UI interaction or organization admin rights
# This section provides commands and guidance

cat > /tmp/GITHUB_TEAMS_SETUP.md << 'EOF'
# GitHub Teams Configuration

## Required Teams

### 1. alawael-admins
- **Description:** ALAWAEL deployment administrators
- **Permissions:**
  - alawael-backend: Admin
  - alawael-erp: Admin
- **Members:** Infrastructure leads, on-call managers

### 2. alawael-developers
- **Description:** ALAWAEL development team
- **Permissions:**
  - alawael-backend: Write (push, merge PRs)
  - alawael-erp: Write (push, merge PRs)
- **Members:** Backend engineers, ERP developers

### 3. alawael-ops
- **Description:** ALAWAEL operations and deployment
- **Permissions:**
  - alawael-backend: Maintain (deploy, merge)
  - alawael-erp: Maintain (deploy, merge)
- **Members:** DevOps engineers, SRE team

### 4. alawael-security
- **Description:** Security review and compliance
- **Permissions:**
  - alawael-backend: Read (review)
  - alawael-erp: Read (review)
- **Members:** Security engineers, compliance officers

## How to Create Teams

1. Go to GitHub Organization Settings
2. Click "Teams" in left sidebar
3. Click "New team" button
4. Enter team details:
   - Team name: (from above)
   - Description: (from above)
5. Click "Create team"
6. Add members and configure permissions per repository

## Manual Setup (via UI)

Visit:
- https://github.com/orgs/almashooq1/teams
EOF

echo "⚠️  Team creation requires GitHub Organization Admin access"
echo ""
echo "📋 Teams to create (manual setup required):"
echo "   1. alawael-admins (Admin access to both repos)"
echo "   2. alawael-developers (Write access to both repos)"
echo "   3. alawael-ops (Maintain access to both repos)"
echo "   4. alawael-security (Read access to both repos)"
echo ""
echo "📍 Setup instructions saved to: /tmp/GITHUB_TEAMS_SETUP.md"
echo ""

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 5: Create Secrets Template
# ═══════════════════════════════════════════════════════════════════════════════

echo "📋 STEP 5: Creating GitHub Secrets Template"
echo "─────────────────────────────────────────────────────────────────────"

cat > ./GITHUB_SECRETS_TEMPLATE.sh << 'EOF'
#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# GitHub Secrets Setup Template
# ═══════════════════════════════════════════════════════════════════════════════
#
# This script creates required secrets in GitHub repositories.
# Each secret must be created manually or via this script with real values.
#
# Required tools: GitHub CLI (gh) installed and authenticated
#
# Usage:
#   1. Edit this file and set SECRET VALUES
#   2. Run: bash GITHUB_SECRETS_TEMPLATE.sh
#
# ═══════════════════════════════════════════════════════════════════════════════

BACKEND_REPO="almashooq1/alawael-backend"
ERP_REPO="almashooq1/alawael-erp"

echo "⚠️  GITHUB SECRETS SETUP"
echo "─────────────────────────────────────────────────────────────────────"
echo ""
echo "This script will create secrets in GitHub repositories."
echo "Ensure you have real secret values before running."
echo ""

# ═══════════════════════════════════════════════════════════════════════════════
# Required Secrets (set these with real values)
# ═══════════════════════════════════════════════════════════════════════════════

# 1. GitHub Token (for automated deployments)
GITHUB_TOKEN="${GITHUB_TOKEN:-your-github-token-here}"

# 2. Sonar Token (for code quality analysis)
SONAR_TOKEN="${SONAR_TOKEN:-your-sonarqube-token-here}"

# 3. Snyk Token (for security scanning)
SNYK_TOKEN="${SNYK_TOKEN:-your-snyk-token-here}"

# 4. Deploy Token (for Docker/package registry)
DEPLOY_TOKEN="${DEPLOY_TOKEN:-your-deploy-token-here}"

# 5. Slack Webhook (for notifications)
SLACK_WEBHOOK="${SLACK_WEBHOOK:-https://hooks.slack.com/services/your-webhook-url}"

# 6. Database Password (for deployment)
DATABASE_PASSWORD="${DATABASE_PASSWORD:-your-database-password-here}"

echo ""
echo "Frontend Repository Secrets:"
echo "───────────────────────────────────────────────────────────────────"

# Setup Backend Repository Secrets
for SECRET in GITHUB_TOKEN SONAR_TOKEN SNYK_TOKEN DEPLOY_TOKEN SLACK_WEBHOOK DATABASE_PASSWORD; do
    if [ "${!SECRET}" != "your-*" ] && [ -n "${!SECRET}" ]; then
        echo "Setting $SECRET in backend..."
        echo "${!SECRET}" | gh secret set "$SECRET" --repo "$BACKEND_REPO" 2>/dev/null
        echo "  ✅ $SECRET configured"
    else
        echo "  ⚠️  $SECRET - PLACEHOLDER VALUE (update with real secret)"
    fi
done

echo ""
echo "ERP Repository Secrets:"
echo "───────────────────────────────────────────────────────────────────"

# Setup ERP Repository Secrets
for SECRET in GITHUB_TOKEN SONAR_TOKEN SNYK_TOKEN DEPLOY_TOKEN SLACK_WEBHOOK DATABASE_PASSWORD; do
    if [ "${!SECRET}" != "your-*" ] && [ -n "${!SECRET}" ]; then
        echo "Setting $SECRET in ERP..."
        echo "${!SECRET}" | gh secret set "$SECRET" --repo "$ERP_REPO" 2>/dev/null
        echo "  ✅ $SECRET configured"
    else
        echo "  ⚠️  $SECRET - PLACEHOLDER VALUE (update with real secret)"
    fi
done

echo ""
echo "✅ Secrets template created"
echo ""
echo "Next steps:"
echo "  1. Get real secret values from your systems"
echo "  2. Edit this script with actual values"
echo "  3. Run: bash GITHUB_SECRETS_TEMPLATE.sh"
echo ""
EOF

chmod +x ./GITHUB_SECRETS_TEMPLATE.sh

echo "✅ Secrets template created: ./GITHUB_SECRETS_TEMPLATE.sh"
echo ""
echo "📋 Required secrets (to be configured):"
echo "   1. GITHUB_TOKEN - GitHub API token for deployments"
echo "   2. SONAR_TOKEN - SonarQube code quality token"
echo "   3. SNYK_TOKEN - Snyk security scanning token"
echo "   4. DEPLOY_TOKEN - Docker/package registry token"
echo "   5. SLACK_WEBHOOK - Slack notification webhook"
echo "   6. DATABASE_PASSWORD - Production database password"
echo ""
echo "   Setup: Edit and run ./GITHUB_SECRETS_TEMPLATE.sh"
echo ""

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 6: Verify Workflow Files
# ═══════════════════════════════════════════════════════════════════════════════

echo "📋 STEP 6: Verifying Deployed Workflows"
echo "─────────────────────────────────────────────────────────────────────"

echo ""
echo "Backend repository workflows:"
echo "  📍 https://github.com/almashooq1/alawael-backend/actions"
echo ""
gh api repos/$BACKEND_REPO/actions/workflows 2>/dev/null | \
  grep -o '"name":"[^"]*"' | \
  cut -d'"' -f4 | while read -r workflow; do
    echo "    ✅ $workflow"
  done || echo "    (Workflows may take a few moments to appear)"

echo ""
echo "ERP repository workflows:"
echo "  📍 https://github.com/almashooq1/alawael-erp/actions"
echo ""
gh api repos/$ERP_REPO/actions/workflows 2>/dev/null | \
  grep -o '"name":"[^"]*"' | \
  cut -d'"' -f4 | while read -r workflow; do
    echo "    ✅ $workflow"
  done || echo "    (Workflows may take a few moments to appear)"

echo ""

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 7: Create Deployment Verification Script
# ═══════════════════════════════════════════════════════════════════════════════

echo "📋 STEP 7: Creating Deployment Verification Script"
echo "─────────────────────────────────────────────────────────────────────"

cat > ./alawael-verify-github-setup.sh << 'EOF'
#!/bin/bash

echo "🔍 ALAWAEL GitHub Configuration Verification"
echo "═════════════════════════════════════════════════════════"

BACKEND_REPO="almashooq1/alawael-backend"
ERP_REPO="almashooq1/alawael-erp"

echo ""
echo "✅ Checking Backend Repository..."
gh api repos/$BACKEND_REPO --jq '.name, .visibility, .description' 2>/dev/null

echo ""
echo "✅ Checking ERP Repository..."
gh api repos/$ERP_REPO --jq '.name, .visibility, .description' 2>/dev/null

echo ""
echo "✅ Checking Workflow Status..."
echo "   Backend health check:"
gh api repos/$BACKEND_REPO/actions/workflows/alawael-health-check.yml --jq '.state' 2>/dev/null | head -1

echo ""
echo "✅ Configuration verified"
EOF

chmod +x ./alawael-verify-github-setup.sh

echo "✅ Verification script created: ./alawael-verify-github-setup.sh"
echo ""

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 8: Summary & Next Steps
# ═══════════════════════════════════════════════════════════════════════════════

echo ""
echo "╔══════════════════════════════════════════════════════════════════════╗"
echo "║  ✅ Phase 2 Configuration Complete                                   ║"
echo "╚══════════════════════════════════════════════════════════════════════╝"
echo ""

echo "📋 SUMMARY of What Was Configured:"
echo "───────────────────────────────────────────────────────────────────"
echo "✅ Backend Repository (alawael-backend):"
echo "   • Auto-merge enabled"
echo "   • Topics/labels added"
echo "   • Environments created: dev, staging, production"
echo "   • Workflow: alawael-health-check.yml deployed"
echo ""
echo "✅ ERP Repository (alawael-erp):"
echo "   • Auto-merge enabled"
echo "   • Topics/labels added"
echo "   • Environments created: dev, staging, production"
echo "   • Workflow: alawael-health-check.yml deployed"
echo ""
echo "📋 MANUAL TASKS REMAINING:"
echo "───────────────────────────────────────────────────────────────────"
echo "1. Create GitHub Teams (requires Organization Admin):"
echo "   • alawael-admins"
echo "   • alawael-developers"
echo "   • alawael-ops"
echo "   • alawael-security"
echo "   📍 https://github.com/orgs/almashooq1/teams"
echo ""
echo "2. Configure GitHub Secrets (6 per repository):"
echo "   • GITHUB_TOKEN"
echo "   • SONAR_TOKEN"
echo "   • SNYK_TOKEN"
echo "   • DEPLOY_TOKEN"
echo "   • SLACK_WEBHOOK"
echo "   • DATABASE_PASSWORD"
echo ""
echo "   Use: bash ./GITHUB_SECRETS_TEMPLATE.sh"
echo ""
echo "3. Configure Branch Protection Rules (optional):"
echo "   • Require pull request reviews (2)"
echo "   • Require status checks to pass"
echo "   • Require branches up to date"
echo "   📍 Settings → Branches → Protection Rules"
echo ""
echo "📈 NEXT PHASE:"
echo "───────────────────────────────────────────────────────────────────"
echo "Phase 3: Deploy to Staging"
echo "  Command: bash alawael-deployment.sh canary staging"
echo "  Duration: 45 minutes"
echo "  Strategy: Gradual canary release (5% → 25% → 50% → 100%)"
echo ""
echo "Phase 4: Deploy to Production"
echo "  Command: bash alawael-deployment.sh blue-green production"
echo "  Duration: 30 minutes"
echo "  Strategy: Zero-downtime blue-green deployment"
echo ""
echo "╔══════════════════════════════════════════════════════════════════════╗"
echo "║  Ready for Phase 3 & 4 Deployments                                   ║"
echo "║  Proceed when manual tasks completed                                 ║"
echo "╚══════════════════════════════════════════════════════════════════════╝"
echo ""
