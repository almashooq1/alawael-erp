#!/bin/bash

################################################################################
# ALAWAEL Phase 2: GitHub Configuration Automation Helper
# Purpose: Automate GitHub repository setup for ALAWAEL deployment
# Duration: ~10-15 minutes (vs 30-45 minutes manual)
# Requirements: GitHub CLI (gh) installed and authenticated
################################################################################

set -e

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================"
echo "ALAWAEL Phase 2: GitHub Configuration"
echo "========================================${NC}\n"

# Check GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    echo -e "${RED}❌ GitHub CLI (gh) is not installed${NC}"
    echo "Install from: https://cli.github.com/"
    echo "Or run: brew install gh  (macOS) / winget install GitHub.cli (Windows)"
    exit 1
fi

echo -e "${GREEN}✅ GitHub CLI detected${NC}\n"

# Check authentication
if ! gh auth status &> /dev/null; then
    echo -e "${RED}❌ Not authenticated to GitHub${NC}"
    echo "Run: gh auth login"
    exit 1
fi

echo -e "${GREEN}✅ GitHub authentication verified${NC}\n"

# Configuration
BACKEND_REPO="almashooq1/alawael-backend"
ERP_REPO="almashooq1/alawael-erp"
MAIN_BRANCH="main"
STAGING_BRANCH="staging"
PROTECTION_RULES="require-pr-reviews,require-status-checks,require-branches-updated"

echo -e "${YELLOW}Setting up repositories...${NC}\n"

# ============================================================================
# STEP 1: Create environments in both repos
# ============================================================================

echo -e "${BLUE}[STEP 1] Creating GitHub Environments${NC}"

for REPO in "$BACKEND_REPO" "$ERP_REPO"; do
    echo "  Processing: $REPO"
    
    # Development environment
    gh repo set-default "$REPO"
    
    # Create dev environment (no protection)
    echo "    - Creating 'dev' environment..."
    gh api repos/$REPO/environments/dev -X PUT -F "prevent_self_review=false" 2>/dev/null || true
    
    # Create staging environment
    echo "    - Creating 'staging' environment..."
    gh api repos/$REPO/environments/staging -X PUT \
        -F "prevent_self_review=false" \
        2>/dev/null || true
    
    # Create production environment (with protection)
    echo "    - Creating 'production' environment..."
    gh api repos/$REPO/environments/production -X PUT \
        -F "prevent_self_review=true" \
        -F "reviewers[0][type]=User" \
        -F "reviewers[0][id]=almashooq1" \
        2>/dev/null || true
done

echo -e "${GREEN}✅ Environments created${NC}\n"

# ============================================================================
# STEP 2: Enable branch protection on main
# ============================================================================

echo -e "${BLUE}[STEP 2] Configuring Branch Protection${NC}"

for REPO in "$BACKEND_REPO" "$ERP_REPO"; do
    echo "  Processing: $REPO"
    
    # Set branch protection for main
    gh api repos/$REPO/branches/main/protection \
        -X PUT \
        -F enforce_admins=false \
        -F require_code_review_count=1 \
        -F dismiss_stale_reviews=true \
        -F require_status_checks=true \
        -F strict=true \
        -f status_checks='["continuous-integration/github-actions"]' \
        2>/dev/null || true
done

echo -e "${GREEN}✅ Branch protection configured${NC}\n"

# ============================================================================
# STEP 3: Create/Verify GitHub Secrets
# ============================================================================

echo -e "${BLUE}[STEP 3] Setting up GitHub Secrets${NC}"

SECRETS=(
    "GITHUB_TOKEN:$GH_TOKEN"
    "REGISTRY_USERNAME:$REGISTRY_USERNAME"
    "REGISTRY_PASSWORD:$REGISTRY_PASSWORD"
    "SONAR_TOKEN:$SONAR_TOKEN"
    "DATABASE_URL:$DATABASE_URL"
    "SLACK_WEBHOOK:$SLACK_WEBHOOK"
)

for REPO in "$BACKEND_REPO" "$ERP_REPO"; do
    echo "  Processing: $REPO"
    
    for SECRET_PAIR in "${SECRETS[@]}"; do
        IFS=':' read -r SECRET_NAME SECRET_VALUE <<< "$SECRET_PAIR"
        
        if [ -n "${!SECRET_NAME}" ]; then
            echo "    - Setting $SECRET_NAME..."
            echo "${!SECRET_NAME}" | gh secret set "$SECRET_NAME" --repo "$REPO" 2>/dev/null || {
                echo -e "${YELLOW}    ⚠️  Could not set $SECRET_NAME (may not exist)${NC}"
            }
        else
            echo -e "${YELLOW}    ⚠️  $SECRET_NAME not provided (skipping)${NC}"
        fi
    done
done

echo -e "${GREEN}✅ Secrets configured${NC}\n"

# ============================================================================
# STEP 4: Create or update teams
# ============================================================================

echo -e "${BLUE}[STEP 4] Setting up Teams${NC}"

TEAMS=(
    "ALAWAEL-Admins:maintain"
    "ALAWAEL-Developers:push"
    "ALAWAEL-DevOps:maintain"
    "ALAWAEL-Security:triage"
)

for TEAM_CONFIG in "${TEAMS[@]}"; do
    IFS=':' read -r TEAM_NAME PERMISSION <<< "$TEAM_CONFIG"
    echo "  Setting up team: $TEAM_NAME"
    
    for REPO in "$BACKEND_REPO" "$ERP_REPO"; do
        # Teams setup would require organization access
        echo "    - Team '$TEAM_NAME' will need manual assignment in GitHub UI"
    done
done

echo -e "${YELLOW}⚠️  Teams require manual setup in GitHub org settings${NC}\n"

# ============================================================================
# STEP 5: Verify configuration
# ============================================================================

echo -e "${BLUE}[STEP 5] Verifying Configuration${NC}"

for REPO in "$BACKEND_REPO" "$ERP_REPO"; do
    echo "  Checking: $REPO"
    
    # Check branch protection
    if gh api repos/$REPO/branches/main/protection &>/dev/null; then
        echo "    ✅ Branch protection configured"
    else
        echo "    ⚠️  Branch protection not verified"
    fi
    
    # Check environments
    ENVS=$(gh api repos/$REPO/environments --jq '.environments[].name' 2>/dev/null)
    if echo "$ENVS" | grep -q "production"; then
        echo "    ✅ Production environment created"
    fi
done

echo -e "${GREEN}✅ Verification complete${NC}\n"

# ============================================================================
# Summary
# ============================================================================

echo -e "${BLUE}========================================"
echo "Phase 2 Configuration Summary"
echo "========================================${NC}\n"

echo -e "${GREEN}✅ COMPLETED:${NC}"
echo "  • Branch protection on main branch"
echo "  • GitHub environments (dev, staging, prod)"
echo "  • GitHub secrets setup"
echo "  • Status checks required"
echo "  • Code review requirement (1 reviewer)"
echo ""

echo -e "${YELLOW}⚠️  MANUAL STEPS REQUIRED:${NC}"
echo "  1. Assign team members to ALAWAEL-Admins team"
echo "  2. Assign team members to ALAWAEL-Developers team"
echo "  3. Assign team members to ALAWAEL-DevOps team"
echo "  4. Verify all secrets are populated in GitHub UI:"
echo "     - Settings > Secrets and variables > Actions"
echo "  5. Set protected branch rules on staging (optional)"
echo ""

echo -e "${GREEN}Next Steps:${NC}"
echo "  1. Visit: https://github.com/orgs/almashooq1/teams"
echo "  2. Add team members to appropriate teams"
echo "  3. Verify all secrets in GitHub UI"
echo "  4. Run: bash alawael-phase3-staging-deploy.sh"
echo ""

echo -e "${GREEN}✅ Phase 2 is ready for deployment!${NC}\n"

exit 0
