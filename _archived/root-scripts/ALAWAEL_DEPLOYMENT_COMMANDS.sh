#!/bin/bash

################################################################################
# ALAWAEL Complete Deployment Command Reference
# Quick execution guide for all deployment operations
################################################################################

# ANSI Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

################################################################################
# PHASE 1: ACTIVATION & INTEGRATION
################################################################################

echo -e "\n${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║        ALAWAEL v1.0.0 DEPLOYMENT COMMAND REFERENCE          ║${NC}"
echo -e "${GREEN}║  Production Deployment - February 22, 2026                  ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"

echo -e "\n${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}PHASE 1: ACTIVATION & REPOSITORY INTEGRATION${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"

echo -e "\n${CYAN}Step 1.1: Run Complete Activation Script${NC}"
echo -e "${CYAN}Duration: 20-30 minutes${NC}"
echo -e "${CYAN}What it does: Integrates ALAWAEL into both repositories${NC}"
echo ""
echo -e "  ${YELLOW}bash alawael-activate-all.sh${NC}"
echo ""

echo -e "\n${CYAN}Step 1.2: Review Integration Changes (Backend)${NC}"
echo ""
echo -e "  ${YELLOW}cd alawael-backend${NC}"
echo -e "  ${YELLOW}git log --oneline -3${NC}"
echo -e "  ${YELLOW}git status${NC}"
echo -e "  ${YELLOW}ls -la .alawael/tools/ | wc -l${NC}"
echo ""

echo -e "\n${CYAN}Step 1.3: Review Integration Changes (ERP)${NC}"
echo ""
echo -e "  ${YELLOW}cd ../alawael-erp${NC}"
echo -e "  ${YELLOW}git log --oneline -3${NC}"
echo -e "  ${YELLOW}git status${NC}"
echo -e "  ${YELLOW}ls -la .alawael/tools/ | wc -l${NC}"
echo ""

echo -e "\n${CYAN}Step 1.4: Push to GitHub${NC}"
echo -e "${CYAN}Duration: 10 minutes${NC}"
echo ""
echo -e "  ${YELLOW}# Backend push${NC}"
echo -e "  ${YELLOW}cd alawael-backend${NC}"
echo -e "  ${YELLOW}git push origin main${NC}"
echo ""
echo -e "  ${YELLOW}# ERP push${NC}"
echo -e "  ${YELLOW}cd ../alawael-erp${NC}"
echo -e "  ${YELLOW}git push origin master${NC}"
echo ""
echo -e "  ${YELLOW}cd ..${NC}"
echo ""

################################################################################
# PHASE 2: GITHUB CONFIGURATION
################################################################################

echo -e "\n${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}PHASE 2: GITHUB CONFIGURATION${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"

echo -e "\n${CYAN}Step 2.1: Run GitHub Configuration Guidance Script${NC}"
echo -e "${CYAN}Duration: 60 minutes (mostly manual GitHub UI)${NC}"
echo ""
echo -e "  ${YELLOW}bash alawael-github-config.sh${NC}"
echo ""

echo -e "\n${CYAN}Step 2.2: Manual Configuration Required${NC}"
echo ""
echo -e "  ${MAGENTA}IN GITHUB UI (Settings → Secrets and variables → Actions):${NC}"
echo ""
echo -e "    ${YELLOW}1. GITHUB_TOKEN${NC}"
echo -e "    2. SONAR_TOKEN${NC}"
echo -e "    3. SNYK_TOKEN${NC}"
echo -e "    4. DEPLOY_TOKEN${NC}"
echo -e "    5. SLACK_WEBHOOK${NC}"
echo -e "    6. DATABASE_PASSWORD${NC}"
echo ""
echo -e "  ${MAGENTA}IN GITHUB UI (Organization → Settings → Teams):${NC}"
echo ""
echo -e "    ${YELLOW}1. alawael-admins (admin access)${NC}"
echo -e "    2. alawael-developers (write access)${NC}"
echo -e "    3. alawael-ops (maintain access)${NC}"
echo -e "    4. alawael-security (triage access)${NC}"
echo ""
echo -e "  ${MAGENTA}IN GITHUB UI (Repository → Settings → Branches):${NC}"
echo ""
echo -e "    ${YELLOW}For main/master branch:${NC}"
echo -e "      - Require 2 PR reviews${NC}"
echo -e "      - Require status checks${NC}"
echo -e "      - Require up-to-date branches${NC}"
echo ""

################################################################################
# PHASE 3: TESTING & VALIDATION
################################################################################

echo -e "\n${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}PHASE 3: TESTING & VALIDATION${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"

echo -e "\n${CYAN}Step 3.1: Run Backend Tests${NC}"
echo -e "${CYAN}Duration: 15 minutes${NC}"
echo ""
echo -e "  ${YELLOW}cd alawael-backend && npm test${NC}"
echo ""

echo -e "\n${CYAN}Step 3.2: Build Backend${NC}"
echo -e "${CYAN}Duration: 10 minutes${NC}"
echo ""
echo -e "  ${YELLOW}cd alawael-backend && npm run build${NC}"
echo ""

echo -e "\n${CYAN}Step 3.3: Run ERP Tests${NC}"
echo -e "${CYAN}Duration: 15 minutes${NC}"
echo ""
echo -e "  ${YELLOW}cd ../alawael-erp && npm test${NC}"
echo ""

echo -e "\n${CYAN}Step 3.4: Build ERP${NC}"
echo -e "${CYAN}Duration: 10 minutes${NC}"
echo ""
echo -e "  ${YELLOW}cd ../alawael-erp && npm run build${NC}"
echo ""

echo -e "\n${CYAN}Step 3.5: Security Validation${NC}"
echo -e "${CYAN}Duration: 5 minutes${NC}"
echo ""
echo -e "  ${YELLOW}npm audit${NC}"
echo ""

################################################################################
# PHASE 4: STAGING DEPLOYMENT
################################################################################

echo -e "\n${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}PHASE 4: STAGING DEPLOYMENT${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"

echo -e "\n${CYAN}Step 4.1: Deploy to Staging (Canary Strategy)${NC}"
echo -e "${CYAN}Duration: 45 minutes${NC}"
echo -e "${CYAN}Strategy: Gradual rollout (5% → 25% → 50% → 100%)${NC}"
echo ""
echo -e "  ${YELLOW}bash alawael-deployment.sh canary staging${NC}"
echo ""

echo -e "\n${CYAN}Step 4.2: Validate Staging Deployment${NC}"
echo ""
echo -e "  ${YELLOW}# Health check${NC}"
echo -e "  ${YELLOW}bash health-dashboard.sh staging${NC}"
echo ""
echo -e "  ${YELLOW}# Check status${NC}"
echo -e "  ${YELLOW}curl -s https://staging.internal/health | jq .${NC}"
echo ""

echo -e "\n${CYAN}Step 4.3: Run Staging Load Test${NC}"
echo ""
echo -e "  ${YELLOW}bash load-test.sh staging 100 60${NC}"
echo ""

################################################################################
# PHASE 5: PRODUCTION DEPLOYMENT
################################################################################

echo -e "\n${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}PHASE 5: PRODUCTION DEPLOYMENT${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"

echo -e "\n${CYAN}Step 5.1: Pre-Deployment Checklist${NC}"
echo -e "${CYAN}Duration: 15 minutes${NC}"
echo ""
echo -e "  ${YELLOW}Before executing, verify all items:${NC}"
echo ""
echo -e "    ✓ Leadership approval obtained"
echo -e "    ✓ All staging tests passed"
echo -e "    ✓ War room team assembled"
echo -e "    ✓ Database backups taken"
echo -e "    ✓ Monitoring dashboards active"
echo -e "    ✓ On-call engineer assigned"
echo -e "    ✓ Communications channels open"
echo -e "    ✓ Rollback procedure tested"
echo -e "    ✓ Incident contacts notified"
echo -e "    ✓ Feature flags configured"
echo ""

echo -e "\n${CYAN}Step 5.2: Final Health Check${NC}"
echo ""
echo -e "  ${YELLOW}bash health-dashboard.sh production${NC}"
echo ""

echo -e "\n${CYAN}Step 5.3: Deploy to Production (Blue-Green Strategy)${NC}"
echo -e "${CYAN}Duration: 30 minutes${NC}"
echo -e "${CYAN}Strategy: Zero-downtime, instant rollback capability${NC}"
echo ""
echo -e "  ${RED}${MAGENTA}⚠️  CRITICAL OPERATION - REQUIRES APPROVAL${NC}${NC}"
echo ""
echo -e "  ${YELLOW}bash alawael-deployment.sh blue-green production${NC}"
echo ""
echo -e "  ${CYAN}What happens:${NC}"
echo -e "    1. Captures current state (Blue)"
echo -e "    2. Deploys to new environment (Green)"
echo -e "    3. Validates Green environment"
echo -e "    4. Switches traffic to Green"
echo -e "    5. Monitors Green for 30 minutes"
echo ""

echo -e "\n${CYAN}Step 5.4: Verify Production Deployment${NC}"
echo ""
echo -e "  ${YELLOW}# Health status${NC}"
echo -e "  ${YELLOW}bash health-dashboard.sh production${NC}"
echo ""
echo -e "  ${YELLOW}# Check metrics${NC}"
echo -e "  ${YELLOW}curl -s https://api.company.com/metrics | jq .${NC}"
echo ""
echo -e "  ${YELLOW}# Check logs (no errors)${NC}"
echo -e "  ${YELLOW}tail -100 .alawael/logs/deployment-*.log${NC}"
echo ""

################################################################################
# PHASE 6: POST-DEPLOYMENT MONITORING
################################################################################

echo -e "\n${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}PHASE 6: POST-DEPLOYMENT MONITORING${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"

echo -e "\n${CYAN}Step 6.1: Intensive Monitoring (First 24 Hours)${NC}"
echo -e "${CYAN}Frequency: Every hour, 24 checks${NC}"
echo ""
echo -e "  ${YELLOW}# Run hourly health check (keep terminal open)${NC}"
echo -e "  ${YELLOW}while true; do${NC}"
echo -e "  ${YELLOW}  echo \"[$(date)] Health check...\"${NC}"
echo -e "  ${YELLOW}  bash health-dashboard.sh production${NC}"
echo -e "  ${YELLOW}  sleep 3600  # 1 hour${NC}"
echo -e "  ${YELLOW}done${NC}"
echo ""

echo -e "\n${CYAN}Step 6.2: Daily Monitoring (First 7 Days)${NC}"
echo -e "${CYAN}Frequency: Once per day${NC}"
echo ""
echo -e "  ${YELLOW}# Daily health report${NC}"
echo -e "  ${YELLOW}bash daily-report.sh production${NC}"
echo ""

echo -e "\n${CYAN}Step 6.3: Weekly Summary (First Month)${NC}"
echo ""
echo -e "  ${YELLOW}# Weekly report${NC}"
echo -e "  ${YELLOW}bash weekly-report.sh production${NC}"
echo ""

################################################################################
# PHASE 7: EMERGENCY PROCEDURES
################################################################################

echo -e "\n${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}PHASE 7: EMERGENCY PROCEDURES${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"

echo -e "\n${RED}⚠️  Only use these if deployment has critical issues${NC}"

echo -e "\n${CYAN}Emergency Rollback (Instant)${NC}"
echo -e "${CYAN}Duration: <3 minutes to previous state${NC}"
echo ""
echo -e "  ${RED}${YELLOW}bash alawael-deployment.sh rollback production${NC}${NC}"
echo ""
echo -e "  ${CYAN}What happens:${NC}"
echo -e "    - Switches back to Blue environment immediately"
echo -e "    - Reverts database transactions if applicable"
echo -e "    - Notifies entire team"
echo -e "    - Creates incident record"
echo ""

echo -e "\n${CYAN}Check Deployment Logs${NC}"
echo ""
echo -e "  ${YELLOW}tail -200 .alawael/logs/deployment-*.log${NC}"
echo ""

echo -e "\n${CYAN}Get Deployment Status${NC}"
echo ""
echo -e "  ${YELLOW}cat .alawael/logs/deployment-status.json${NC}"
echo ""

echo -e "\n${CYAN}Emergency Incident Mode${NC}"
echo ""
echo -e "  ${RED}${YELLOW}bash .alawael/incident-response.sh${NC}${NC}"
echo ""

################################################################################
# REFERENCE COMMANDS
################################################################################

echo -e "\n${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}QUICK REFERENCE COMMANDS${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"

echo -e "\n${MAGENTA}Health Checks${NC}"
echo ""
echo -e "  ${YELLOW}bash health-dashboard.sh production${NC}"
echo -e "  ${YELLOW}curl https://api.company.com/health${NC}"
echo -e "  ${YELLOW}bash monitoring-dashboard.sh${NC}"
echo ""

echo -e "\n${MAGENTA}Deployment Status${NC}"
echo ""
echo -e "  ${YELLOW}cat .alawael/logs/deployment-status.json${NC}"
echo -e "  ${YELLOW}tail .alawael/logs/deployment-*.log${NC}"
echo -e "  ${YELLOW}bash deployment-status.sh${NC}"
echo ""

echo -e "\n${MAGENTA}Monitoring & Metrics${NC}"
echo ""
echo -e "  ${YELLOW}bash metrics-dashboard.sh production${NC}"
echo -e "  ${YELLOW}bash performance-report.sh${NC}"
echo -e "  ${YELLOW}bash error-analysis.sh production${NC}"
echo ""

echo -e "\n${MAGENTA}Tools & Operations${NC}"
echo ""
echo -e "  ${YELLOW}./.alawael/tools/health-check.sh${NC}"
echo -e "  ${YELLOW}./.alawael/tools/performance-test.sh${NC}"
echo -e "  ${YELLOW}./.alawael/tools/security-scan.sh{{NC}"
echo -e "  ${YELLOW}./.alawael/tools/backup-manager.sh${NC}"
echo ""

echo -e "\n${MAGENTA}Team Communications${NC}"
echo ""
echo -e "  ${YELLOW}Slack: #alawael-alerts${NC}"
echo -e "  ${YELLOW}Email: alawael-team@company.com${NC}"
echo -e "  ${YELLOW}PagerDuty: alawael-oncall${NC}"
echo ""

################################################################################
# SUMMARY
################################################################################

echo -e "\n${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                    DEPLOYMENT SUMMARY                      ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"

echo -e "\n${BLUE}Timeline${NC}"
echo ""
echo -e "  Day 1:     Activation & GitHub Integration (90 min)"
echo -e "  Day 2:     Staging Deployment & Testing (45 min)"
echo -e "  Day 3:     Production Deployment (30 min) ⚠️"
echo -e "  Days 4-10: Post-Deployment Monitoring"
echo ""

echo -e "${BLUE}Team Size${NC}"
echo ""
echo -e "  Phase 1: 2 DevOps engineers"
echo -e "  Phase 2: 3 DevOps + QA engineers"
echo -e "  Phase 3: 6 engineers + CTO (war room) ⚠️"
echo -e "  Phase 4+: 2 on-call + 2 ops engineers"
echo ""

echo -e "${BLUE}Estimated Costs${NC}"
echo ""
echo -e "  Implementation:  $50K - $100K"
echo -e "  Annual Support:  $100K"
echo -e "  Expected Savings: $400K - $500K Y1"
echo -e "  ROI:             150-200%"
echo ""

echo -e "${BLUE}Success Criteria${NC}"
echo ""
echo -e "  ✓ Zero downtime deployment"
echo -e "  ✓ All tests passing (>98%)"
echo -e "  ✓ Metrics within SLA"
echo -e "  ✓ Team operational"
echo -e "  ✓ Cost savings achieved"
echo ""

echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}STATUS: ✅ READY FOR PRODUCTION DEPLOYMENT${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"

echo -e "\n${MAGENTA}For detailed information, see:${NC}"
echo ""
echo -e "  📋 ${YELLOW}ALAWAEL_GOLIVE_ACTIVATION_GUIDE.md${NC}"
echo -e "  📋 ${YELLOW}ALAWAEL_DEPLOYMENT_CHECKLIST.md${NC}"
echo -e "  📋 ${YELLOW}ALAWAEL_OPERATIONS_MANUAL.md${NC}"
echo -e "  📋 ${YELLOW}ALAWAEL_INCIDENT_RESPONSE.md{{NC}"
echo ""

echo -e "\n"
