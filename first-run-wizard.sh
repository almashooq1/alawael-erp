#!/bin/bash

# ALAWAEL v1.0.0 - First Run Wizard & Complete Setup
# Interactive guided setup for first-time users

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_DIR="$SCRIPT_DIR/.alawael-config"
mkdir -p "$CONFIG_DIR"

clear
cat << "EOF"
╔════════════════════════════════════════════════════════════════════╗
║                                                                    ║
║       🚀 ALAWAEL v1.0.0 - Complete Setup Wizard 🚀                ║
║                                                                    ║
║      Welcome! This wizard will guide you through the complete      ║
║      setup of your production-grade ERP and backend system.        ║
║                                                                    ║
║                    ⏱️  Estimated time: 30-45 minutes               ║
║                                                                    ║
╚════════════════════════════════════════════════════════════════════╝
EOF

echo ""
sleep 2

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Utilities
progress_bar() {
    local current=$1
    local total=$2
    local percent=$((current * 100 / total))
    local filled=$((current * 50 / total))
    printf "\r["
    printf "%${filled}s" | tr ' ' '█'
    printf "%$((50 - filled))s" | tr ' ' '░'
    printf "] %d%%" $percent
}

pause_wizard() {
    read -p "Press Enter to continue..." </dev/tty
}

# Step 1: Welcome & Overview
step_welcome() {
    clear
    
    echo "╔════════════════════════════════════════════════════════════════════╗"
    echo "║                        📋 STEP 1: Overview                         ║"
    echo "╚════════════════════════════════════════════════════════════════════╝"
    echo ""
    
    cat << "EOF"
This setup wizard will configure:

   1️⃣  Environment Setup
       • Check system requirements
       • Install dependencies
       • Configure Node.js and npm

   2️⃣  Repository Configuration
       • Clone/initialize Git repositories
       • Configure GitHub integration
       • Set up Git hooks

   3️⃣  Development Environment
       • Docker setup (optional)
       • Database configuration
       • Cache setup

   4️⃣  Monitoring & Observability
       • Health check configuration
       • Error tracking setup
       • Performance monitoring

   5️⃣  CI/CD Pipeline
       • GitHub Actions setup
       • Automated testing
       • Deployment automation

   6️⃣  Team & Operations
       • Roles and responsibilities definition
       • Documentation setup
       • Training materials

   7️⃣  Security & Compliance
       • Security hardening
       • Backup configuration
       • Disaster recovery setup

Would you like to proceed with full setup?
EOF
    
    echo ""
    select opt in "Yes, proceed" "Custom setup" "Exit"; do
        case $opt in
            "Yes, proceed") echo "setup_type=full" > "$CONFIG_DIR/setup.conf"; break;;
            "Custom setup") echo "setup_type=custom" > "$CONFIG_DIR/setup.conf"; break;;
            "Exit") echo "setup_type=exit" > "$CONFIG_DIR/setup.conf"; exit 0;;
        esac
    done
}

# Step 2: Environment Check
step_environment_check() {
    clear
    echo "╔════════════════════════════════════════════════════════════════════╗"
    echo "║                   🔍 STEP 2: Environment Check                    ║"
    echo "╚════════════════════════════════════════════════════════════════════╝"
    echo ""
    
    local step=1
    local total=8
    
    # Check Node.js
    echo -n "Checking Node.js... "
    if command -v node &> /dev/null; then
        local node_version=$(node --version)
        printf "${GREEN}✅${NC} Found: $node_version\n"
    else
        printf "${RED}❌${NC} Not installed\n"
        read -p "Install Node.js? (y/n): " install_node
        if [[ "$install_node" == "y" ]]; then
            # Installation instructions
            printf "${YELLOW}Please visit: https://nodejs.org/${NC}\n"
            pause_wizard
        fi
    fi
    progress_bar $((step++)) $total
    
    # Check npm
    echo -n "Checking npm... "
    if command -v npm &> /dev/null; then
        local npm_version=$(npm --version)
        printf "${GREEN}✅${NC} Found: $npm_version\n"
        progress_bar $((step++)) $total
    else
        printf "${RED}❌${NC} Not found\n"
        progress_bar $((step++)) $total
    fi
    
    # Check Git
    echo -n "Checking Git... "
    if command -v git &> /dev/null; then
        local git_version=$(git --version)
        printf "${GREEN}✅${NC} $git_version\n"
        progress_bar $((step++)) $total
    else
        printf "${YELLOW}⚠️ ${NC} Not installed\n"
        progress_bar $((step++)) $total
    fi
    
    # Check Docker
    echo -n "Checking Docker... "
    if command -v docker &> /dev/null; then
        printf "${GREEN}✅${NC} Installed\n"
        progress_bar $((step++)) $total
    else
        printf "${YELLOW}ⓘ${NC} Not installed (optional)\n"
        progress_bar $((step++)) $total
    fi
    
    # Check disk space
    echo -n "Checking disk space... "
    local disk_free=$(df "$SCRIPT_DIR" | tail -1 | awk '{print $4}')
    if [[ $disk_free -gt 5000000 ]]; then
        printf "${GREEN}✅${NC} Sufficient\n"
        progress_bar $((step++)) $total
    else
        printf "${RED}⚠️${NC} Low disk space\n"
        progress_bar $((step++)) $total
    fi
    
    # Summary
    echo ""
    echo "Environment check complete! ✅"
    echo ""
    pause_wizard
}

# Step 3: Project Configuration
step_project_config() {
    clear
    echo "╔════════════════════════════════════════════════════════════════════╗"
    echo "║               ⚙️  STEP 3: Project Configuration                   ║"
    echo "╚════════════════════════════════════════════════════════════════════╝"
    echo ""
    
    read -p "Project name (default: alawael): " project_name
    project_name=${project_name:-alawael}
    
    read -p "Project version (default: 1.0.0): " project_version
    project_version=${project_version:-1.0.0}
    
    read -p "Your GitHub username: " github_user
    read -p "Your email: " user_email
    
    # Save configuration
    cat > "$CONFIG_DIR/project.conf" << EOF
PROJECT_NAME=$project_name
PROJECT_VERSION=$project_version
GITHUB_USER=$github_user
USER_EMAIL=$user_email
SETUP_DATE=$(date '+%Y-%m-%d %H:%M:%S')
EOF
    
    echo ""
    echo "Configuration saved:"
    echo "  Project: $project_name"
    echo "  Version: $project_version"
    echo "  GitHub: $github_user"
    echo ""
    pause_wizard
}

# Step 4: Backend Setup
step_backend_setup() {
    clear
    echo "╔════════════════════════════════════════════════════════════════════╗"
    echo "║                 🔧 STEP 4: Backend Configuration                  ║"
    echo "╚════════════════════════════════════════════════════════════════════╝"
    echo ""
    
    if [[ ! -d "$SCRIPT_DIR/backend" ]]; then
        echo "Backend directory not found. Would you like to:"
        select opt in "Clone from GitHub" "Use existing local path" "Skip"; do
            case $opt in
                "Clone from GitHub")
                    read -p "GitHub repository URL (e.g., https://github.com/almashooq1/alawael-backend.git): " repo_url
                    echo "Cloning backend..."
                    git clone "$repo_url" backend
                    break;;
                "Use existing local path")
                    read -p "Enter path to backend: " backend_path
                    cp -r "$backend_path" backend
                    break;;
                "Skip")
                    break;;
            esac
        done
    fi
    
    if [[ -d "$SCRIPT_DIR/backend" ]]; then
        echo "Installing backend dependencies..."
        cd "$SCRIPT_DIR/backend"
        npm install
        cd "$SCRIPT_DIR"
        echo "✅ Backend configured"
    fi
    
    echo ""
    pause_wizard
}

# Step 5: Frontend Setup
step_frontend_setup() {
    clear
    echo "╔════════════════════════════════════════════════════════════════════╗"
    echo "║                 🎨 STEP 5: Frontend Configuration                 ║"
    echo "╚════════════════════════════════════════════════════════════════════╝"
    echo ""
    
    if [[ ! -d "$SCRIPT_DIR/frontend" ]]; then
        echo "Frontend directory not found. Would you like to:"
        select opt in "Clone from GitHub" "Use existing local path" "Skip"; do
            case $opt in
                "Clone from GitHub")
                    read -p "GitHub repository URL: " repo_url
                    echo "Cloning frontend..."
                    git clone "$repo_url" frontend
                    break;;
                "Use existing local path")
                    read -p "Enter path to frontend: " frontend_path
                    cp -r "$frontend_path" frontend
                    break;;
                "Skip")
                    break;;
            esac
        done
    fi
    
    if [[ -d "$SCRIPT_DIR/frontend" ]]; then
        echo "Installing frontend dependencies..."
        cd "$SCRIPT_DIR/frontend"
        npm install
        cd "$SCRIPT_DIR"
        echo "✅ Frontend configured"
    fi
    
    echo ""
    pause_wizard
}

# Step 6: Database Setup
step_database_setup() {
    clear
    echo "╔════════════════════════════════════════════════════════════════════╗"
    echo "║                  🗄️  STEP 6: Database Configuration               ║"
    echo "╚════════════════════════════════════════════════════════════════════╝"
    echo ""
    
    echo "Database Configuration:"
    echo ""
    echo "1. MongoDB Atlas (Cloud - Recommended)"
    echo "2. MongoDB Local (Docker)"
    echo "3. Custom Connection String"
    echo ""
    
    read -p "Choose option (1-3): " db_option
    
    case $db_option in
        1)
            read -p "MongoDB Atlas connection string: " db_connection
            echo "MONGODB_URI=$db_connection" > "$CONFIG_DIR/db.conf"
            echo "✅ MongoDB Atlas configured"
            ;;
        2)
            if command -v docker &> /dev/null; then
                echo "Starting MongoDB container..."
                docker run -d --name alawael-mongodb -p 27017:27017 mongo:7.0
                echo "MONGODB_URI=mongodb://localhost:27017/alawael" > "$CONFIG_DIR/db.conf"
                echo "✅ Local MongoDB configured"
            else
                echo "Docker not found. Please install Docker or use option 3."
            fi
            ;;
        3)
            read -p "Database connection string: " db_connection
            echo "MONGODB_URI=$db_connection" > "$CONFIG_DIR/db.conf"
            echo "✅ Custom database configured"
            ;;
    esac
    
    echo ""
    pause_wizard
}

# Step 7: GitHub Integration
step_github_integration() {
    clear
    echo "╔════════════════════════════════════════════════════════════════════╗"
    echo "║                  🐙 STEP 7: GitHub Integration                    ║"
    echo "╚════════════════════════════════════════════════════════════════════╝"
    echo ""
    
    read -p "Configure GitHub integration? (y/n): " git_config
    
    if [[ "$git_config" == "y" ]]; then
        if [[ -f "$SCRIPT_DIR/github-integration.sh" ]]; then
            echo "Running GitHub integration script..."
            bash "$SCRIPT_DIR/github-integration.sh"
        fi
    fi
    
    echo ""
    pause_wizard
}

# Step 8: Setup Scripts Execution
step_setup_scripts() {
    clear
    echo "╔════════════════════════════════════════════════════════════════════╗"
    echo "║              🚀 STEP 8: Run Advanced Setup Scripts                 ║"
    echo "╚════════════════════════════════════════════════════════════════════╝"
    echo ""
    
    echo "Available setup scripts:"
    echo "1. Monitoring & Observability"
    echo "2. CI/CD Pipeline"
    echo "3. Disaster Recovery"
    echo "4. Scaling & Performance"
    echo "5. Team & Operations"
    echo "6. Security & Crisis Management"
    echo "7. Run all (recommended)"
    echo "8. Skip for now"
    echo ""
    
    read -p "Choose option (1-8): " scripts_option
    
    case $scripts_option in
        7)
            echo "Running all setup scripts..."
            bash "$SCRIPT_DIR/master-setup.sh"
            ;;
        *)
            echo "You can run setup scripts later with: ./master-setup.sh"
            ;;
    esac
    
    echo ""
    pause_wizard
}

# Step 9: Verification
step_verification() {
    clear
    echo "╔════════════════════════════════════════════════════════════════════╗"
    echo "║                  ✅ STEP 9: Verification                          ║"
    echo "╚════════════════════════════════════════════════════════════════════╝"
    echo ""
    
    if [[ -f "$SCRIPT_DIR/verify-complete-setup.sh" ]]; then
        echo "Running verification..."
        bash "$SCRIPT_DIR/verify-complete-setup.sh"
    fi
    
    echo ""
    pause_wizard
}

# Final Summary
step_summary() {
    clear
    echo "╔════════════════════════════════════════════════════════════════════╗"
    echo "║                    🎉 Setup Complete! 🎉                          ║"
    echo "╚════════════════════════════════════════════════════════════════════╝"
    echo ""
    
    cat << "EOF"
Your Alawael v1.0.0 system is now configured and ready!

═══════════════════════════════════════════════════════════════════

📚 DOCUMENTATION
   Main guide: 00_START_ADVANCED_SETUP_HERE.md
   Full index: ADVANCED_SETUP_MASTER_INDEX.md

🚀 NEXT STEPS
   1. Review documentation
   2. Run: ./master-setup.sh (if not done)
   3. Start services: docker-compose up -d
   4. Access backend: http://localhost:3000
   5. Access frontend: http://localhost:3001

⚙️  QUICK COMMANDS
   Start services:    docker-compose up -d
   Stop services:     docker-compose down
   View logs:         docker-compose logs -f
   Run tests:         npm test (in backend/frontend)
   Deploy:            ./advanced-deploy.sh

📊 MONITORING
   Check health:      ./verify-complete-setup.sh
   GitHub status:     ./check-github-status.sh
   Real-time logs:    docker-compose logs -f

🔐 SECURITY
   Run audit:         Review SECURITY_AUDIT_CHECKLIST.md
   Setup backup:      Run setup-disaster-recovery.sh
   Configure monitoring: Run setup-monitoring.sh

🆘 SUPPORT
   Documentation:     Read relevant .md files
   Troubleshooting:   TROUBLESHOOTING_GUIDE.md
   Team handbook:     OPERATIONAL_HANDBOOK.md

═══════════════════════════════════════════════════════════════════

Configuration saved to: $CONFIG_DIR/

Thank you for using Alawael v1.0.0!

EOF
    
    echo ""
    read -p "Press Enter to finish..." </dev/tty
}

# Main wizard execution
main() {
    step_welcome
    step_environment_check
    step_project_config
    step_backend_setup
    step_frontend_setup
    step_database_setup
    step_github_integration
    step_setup_scripts
    step_verification
    step_summary
    
    echo ""
    echo "Setup wizard complete! 🚀"
    echo ""
}

# Run wizard
main "$@"
