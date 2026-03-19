#!/bin/bash

# ALAWAEL v1.0.0 - Command Center & Quick Navigation
# Central hub for all automation and operations

clear

cat << "EOF"
╔═══════════════════════════════════════════════════════════════════════════╗
║                                                                           ║
║              🎯 ALAWAEL v1.0.0 - OPERATIONS COMMAND CENTER 🎯            ║
║                                                                           ║
║                  Complete Production System - All-in-One                  ║
║                                                                           ║
║              👋 Welcome! Choose what you'd like to do:                    ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
EOF

echo ""
sleep 1

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

print_menu() {
    cat << "EOF"

════════════════════════════════════════════════════════════════════════════

🚀 GETTING STARTED

    1️⃣  First Time Setup (Interactive Wizard)
        👉 ./first-run-wizard.sh
        ⏱️  30-45 minutes | Guided setup for new users

    2️⃣  View Complete System Documentation
        👉 cat ALAWAEL_COMPLETE_PACKAGE_INDEX.md
        📖  Comprehensive overview of everything

════════════════════════════════════════════════════════════════════════════

⚙️  SETUP & CONFIGURATION

    3️⃣  Run Master Setup Script
        👉 ./master-setup.sh
        🔧 Choose: Full (18h) | Express (8h) | Minimal (5h) | Manual

    4️⃣  Individual Setup Scripts
        📊 Monitoring:           ./setup-monitoring.sh (1-2h)
        🔄 CI/CD Pipeline:       ./setup-cicd-pipeline.sh (2-3h)
        🔐 Disaster Recovery:    ./setup-disaster-recovery.sh (2-3h)
        ⚡ Scaling & Perf:       ./setup-scaling-performance.sh (2-3h)
        👥 Team & Operations:    ./setup-team-training-operations.sh (3-4h)
        🛡️  Security & Crisis:   ./setup-security-crisis-management.sh (2-3h)

════════════════════════════════════════════════════════════════════════════

🐙 GITHUB & INTEGRATION

    5️⃣  GitHub Integration
        👉 ./github-integration.sh
        🔗 Auto-setup CI/CD, Actions, hooks

    6️⃣  Check GitHub Status
        👉 ./check-github-status.sh
        📊 Real-time repository and workflow status

════════════════════════════════════════════════════════════════════════════

🚀 DEPLOYMENT & OPERATIONS

    7️⃣  Deploy to Environment
        👉 ./advanced-deploy.sh
        🌍 Local | Staging | Prod (AWS/Azure/GCP)

    8️⃣  Verify System Status
        👉 ./verify-complete-setup.sh
        ✅ Check all components, generate reports

════════════════════════════════════════════════════════════════════════════

📚 DOCUMENTATION (Read These!)

    START HERE:
        👉 cat 00_START_ADVANCED_SETUP_HERE.md
        ✔️  Primary entry point with quick start guides

    COMPLETE OVERVIEW:
        👉 cat ALAWAEL_COMPLETE_PACKAGE_INDEX.md
        📋  Everything you need to know

    SPECIFIC TOPICS:
        • Operations:        OPERATIONAL_HANDBOOK.md
        • Team Onboarding:   TEAM_ONBOARDING_GUIDE.md
        • Troubleshooting:   TROUBLESHOOTING_GUIDE.md
        • Security:          SECURITY_HARDENING_GUIDE.md
        • Disaster Recovery: DISASTER_RECOVERY_PLAN.md
        • GitHub Integration: GITHUB_INTEGRATION_GUIDE.md

════════════════════════════════════════════════════════════════════════════

🛠️  COMMON OPERATIONS

    9️⃣  Start/Stop Services
        Start all:          docker-compose up -d
        Stop all:           docker-compose down
        View logs:          docker-compose logs -f
        Specific service:   docker-compose logs -f backend

    🔟 Run Tests
        Backend tests:      cd backend && npm test
        Frontend tests:     cd frontend && npm test -- --passWithNoTests
        E2E tests:          cd backend && npm run test:e2e

    1️⃣1️⃣ Development
        Backend dev:        cd backend && npm run dev
        Frontend dev:       cd frontend && npm run dev
        Both:              docker-compose -f docker-compose.dev.yml up

    1️⃣2️⃣ Build & Optimize
        Build backend:      cd backend && npm run build
        Build frontend:     cd frontend && npm run build
        Analyze bundles:    npm run analyze

════════════════════════════════════════════════════════════════════════════

🔒 SECURITY & COMPLIANCE

    1️⃣3️⃣ Security Audit
        👉 Review SECURITY_AUDIT_CHECKLIST.md (130 points)
        🎯 Run audit checks against your system

    1️⃣4️⃣ Crisis Management
        👉 cat CRISIS_MANAGEMENT_PLAN.md
        🚨 Procedures for P1-P4 incidents

    1️⃣5️⃣ Backup & Recovery
        👉 Review DISASTER_RECOVERY_PLAN.md
        💾 Set up automated backups

════════════════════════════════════════════════════════════════════════════

📊 MONITORING & OBSERVABILITY

    1️⃣6️⃣ Health Dashboard
        👉 ./verify-complete-setup.sh
        ✅ 15+ verification points

    1️⃣7️⃣ Monitoring Setup
        👉 Review MONITORING_SETUP_CHECKLIST.md
        📈 Sentry, alerts, dashboards

    1️⃣8️⃣ Performance Metrics
        👉 cat PERFORMANCE_OPTIMIZATION.md
        ⚡ Optimization strategies

════════════════════════════════════════════════════════════════════════════

👥 TEAM & TRAINING

    1️⃣9️⃣ Team Roles & Responsibilities
        👉 cat TEAM_ROLES_RESPONSIBILITIES.md
        👨‍💼 7 defined team positions with workflows

    2️⃣0️⃣ Onboarding Program
        👉 cat TEAM_ONBOARDING_GUIDE.md
        📚 4-week structured training

    2️⃣1️⃣ Daily Operations
        👉 cat OPERATIONAL_HANDBOOK.md
        📋 Daily checklist, common issues, procedures

════════════════════════════════════════════════════════════════════════════

🆘 HELP & SUPPORT

    2️⃣2️⃣ Troubleshooting
        👉 cat TROUBLESHOOTING_GUIDE.md
        🔧 20+ common issues + solutions

    2️⃣3️⃣ API Documentation
        👉 cat API_DOCUMENTATION.md or in local repos
        📡 All endpoints documented

    2️⃣4️⃣ Quick Reference
        👉 cat README_QUICK_START.md
        📑 Common commands at a glance

════════════════════════════════════════════════════════════════════════════

🎯 3 QUICK START OPTIONS

    ⏱️  OPTION A: EXPRESS (1 day)
        1. ./first-run-wizard.sh
        2. ./master-setup.sh (choose Express)
        3. ./advanced-deploy.sh
        Result: Core system ready to go

    📋 OPTION B: FULL (2-3 weeks)
        1. ./first-run-wizard.sh
        2. ./master-setup.sh (choose Full)
        3. Read all documentation
        4. Train team
        Result: Complete production system

    🔧 OPTION C: PHASED (Distributed)
        Week 1: ./setup-monitoring.sh + ./setup-cicd-pipeline.sh
        Week 2: ./setup-disaster-recovery.sh + ./setup-scaling-performance.sh
        Week 3: ./setup-team-training-operations.sh
        Week 4: ./setup-security-crisis-management.sh
        Result: Gradual rollout with team training

════════════════════════════════════════════════════════════════════════════

📈 IMPLEMENTATION TRACKING

    ✅ Setup Status:      ./verify-complete-setup.sh
    📊 Dashboard:         See MONITORING_SETUP_CHECKLIST.md
    🎯 Progress:          Check .setup-progress file

════════════════════════════════════════════════════════════════════════════

❓ WHAT SHOULD I DO NOW?

    👉 NEW USER?              Run: ./first-run-wizard.sh
    👉 EXPERIENCED TEAM?      Run: ./master-setup.sh
    👉 NEED QUICK START?      Read: 00_START_ADVANCED_SETUP_HERE.md
    👉 TROUBLESHOOTING?       Read: TROUBLESHOOTING_GUIDE.md
    👉 CHECKING STATUS?       Run: ./verify-complete-setup.sh

════════════════════════════════════════════════════════════════════════════

EOF

# Interactive menu
echo ""
echo "════════════════════════════════════════════════════════════════════════════"
echo ""
echo -e "${CYAN}Choose an option above (type the script name or read a file):${NC}"
echo ""
echo "Examples:"
echo "  ./first-run-wizard.sh"
echo "  ./master-setup.sh"
echo "  cat ALAWAEL_COMPLETE_PACKAGE_INDEX.md"
echo ""
echo -e "${YELLOW}Or press Ctrl+C to exit${NC}"
echo ""

# Function to execute commands
read -p "Enter command: " cmd

if [[ ! -z "$cmd" ]]; then
    eval "$cmd"
else
    echo "No command entered"
fi
