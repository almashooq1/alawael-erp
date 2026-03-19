#!/bin/bash

################################################################################
# ALAWAEL v1.0.0 - REPOSITORY MAINTENANCE & BRANCH MANAGEMENT
# Version: 1.0.0
# Updated: February 22, 2026
# Purpose: Advanced branch management and repository maintenance
################################################################################

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

################################################################################
# HELPER FUNCTIONS
################################################################################

log_info() {
    echo -e "${CYAN}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
}

check_repo() {
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        log_error "Not in a git repository!"
        exit 1
    fi
}

################################################################################
# BRANCH MANAGEMENT
################################################################################

sync_master_to_main() {
    log_info "Syncing master branch to main..."
    
    check_repo
    
    # Fetch latest from remote
    git fetch origin
    
    # Check if both branches exist
    MASTER_EXISTS=$(git rev-parse --verify origin/master >/dev/null 2>&1 && echo "true" || echo "false")
    MAIN_EXISTS=$(git rev-parse --verify origin/main >/dev/null 2>&1 && echo "true" || echo "false")
    
    if [ "$MASTER_EXISTS" = "false" ]; then
        log_error "master branch does not exist on remote"
        return 1
    fi
    
    if [ "$MAIN_EXISTS" = "false" ]; then
        log_warning "main branch does not exist on remote, creating..."
        git push origin origin/master:refs/heads/main
    fi
    
    # Switch to main
    git checkout main || git checkout -b main origin/main
    
    # Merge master into main
    log_info "Merging master into main..."
    git merge origin/master --no-ff -m "Merge master branch into main (automatic sync)"
    
    # Push to remote
    git push origin main
    
    log_success "Successfully synced master to main"
    
    # Delete master if desired
    read -p "Delete master branch after sync? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_warning "Deleting master branch..."
        git push origin --delete master
        log_success "Deleted remote master branch"
    fi
}

create_branch() {
    local BRANCH_NAME=$1
    local SOURCE_BRANCH=${2:-main}
    
    if [ -z "$BRANCH_NAME" ]; then
        log_error "Branch name required"
        return 1
    fi
    
    check_repo
    
    log_info "Creating branch: $BRANCH_NAME from $SOURCE_BRANCH..."
    
    # Fetch latest
    git fetch origin
    
    # Create branch from source
    git checkout -b "$BRANCH_NAME" "origin/$SOURCE_BRANCH"
    
    # Push to remote
    git push -u origin "$BRANCH_NAME"
    
    log_success "Created branch: $BRANCH_NAME"
}

delete_branch() {
    local BRANCH_NAME=$1
    
    if [ -z "$BRANCH_NAME" ]; then
        log_error "Branch name required"
        return 1
    fi
    
    check_repo
    
    log_warning "Deleting branch: $BRANCH_NAME..."
    
    # Delete local
    git branch -D "$BRANCH_NAME"
    
    # Delete remote
    git push origin --delete "$BRANCH_NAME"
    
    log_success "Deleted branch: $BRANCH_NAME"
}

list_branches() {
    log_info "Local branches:"
    git branch -v
    echo ""
    log_info "Remote branches:"
    git branch -r -v
}

cleanup_branches() {
    log_info "Cleaning up stale branches..."
    
    check_repo
    
    # Fetch to update remote tracking
    git fetch -p
    
    # Find and delete merged branches (except main/develop)
    log_info "Deleting merged branches..."
    git branch --merged main | grep -v main | grep -v develop | xargs -r git branch -D
    
    log_success "Branch cleanup complete"
    
    # Show remaining branches
    log_info "Remaining branches:"
    git branch -v
}

################################################################################
# REPOSITORY MANAGEMENT
################################################################################

show_repo_status() {
    check_repo
    
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}REPOSITORY STATUS${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
    echo ""
    
    # Repository info
    REPO_NAME=$(git config --get remote.origin.url | xargs basename -s .git)
    REPO_URL=$(git config --get remote.origin.url)
    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
    CURRENT_COMMIT=$(git rev-parse --short HEAD)
    
    echo -e "${CYAN}Repository:${NC}"
    echo "  Name: $REPO_NAME"
    echo "  URL: $REPO_URL"
    echo ""
    
    echo -e "${CYAN}Current State:${NC}"
    echo "  Branch: $CURRENT_BRANCH"
    echo "  Commit: $CURRENT_COMMIT"
    git log -1 --pretty=format:"  Message: %s%n  Author: %an%n  Date: %ad" --date=short
    echo ""
    
    # Branch status
    echo -e "${CYAN}Branches:${NC}"
    BRANCH_COUNT=$(git branch | wc -l)
    echo "  Local: $BRANCH_COUNT"
    
    REMOTE_BRANCH_COUNT=$(git branch -r | wc -l)
    echo "  Remote: $REMOTE_BRANCH_COUNT"
    echo ""
    
    # Commits status
    echo -e "${CYAN}Commits:${NC}"
    TOTAL_COMMITS=$(git rev-list --count HEAD)
    echo "  Total: $TOTAL_COMMITS"
    
    # Unstaged changes
    echo ""
    echo -e "${CYAN}Working Directory:${NC}"
    UNSTAGED=$(git diff --name-only | wc -l)
    STAGED=$(git diff --cached --name-only | wc -l)
    UNTRACKED=$(git ls-files --others --exclude-standard | wc -l)
    
    echo "  Unstaged changes: $UNSTAGED"
    echo "  Staged changes: $STAGED"
    echo "  Untracked files: $UNTRACKED"
    
    if [ $UNSTAGED -gt 0 ] || [ $STAGED -gt 0 ] || [ $UNTRACKED -gt 0 ]; then
        echo ""
        echo -e "${YELLOW}⚠ Repository has uncommitted changes${NC}"
        git status --short | head -10
    else
        echo ""
        echo -e "${GREEN}✓ Clean working directory${NC}"
    fi
    
    echo ""
}

backup_repo() {
    log_info "Creating repository backup..."
    
    check_repo
    
    BACKUP_DIR="backups"
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    REPO_NAME=$(git config --get remote.origin.url | xargs basename -s .git)
    BACKUP_NAME="${REPO_NAME}_${TIMESTAMP}.tar.gz"
    
    mkdir -p "$BACKUP_DIR"
    
    # Create backup excluding .git
    tar --exclude='.git' --exclude='node_modules' --exclude='dist' \
        -czf "$BACKUP_DIR/$BACKUP_NAME" .
    
    log_success "Repository backed up to: $BACKUP_DIR/$BACKUP_NAME"
    
    # Show backup size
    du -h "$BACKUP_DIR/$BACKUP_NAME"
}

################################################################################
# GIT FLOW SETUP
################################################################################

setup_git_flow() {
    log_info "Setting up Git Flow branches..."
    
    check_repo
    
    # Ensure main exists
    git fetch origin
    MAIN_EXISTS=$(git rev-parse --verify origin/main >/dev/null 2>&1 && echo "true" || echo "false")
    if [ "$MAIN_EXISTS" = "false" ]; then
        log_warning "main branch not found, creating from current branch"
        git push origin HEAD:refs/heads/main
    fi
    
    # Create develop if doesn't exist
    DEVELOP_EXISTS=$(git rev-parse --verify origin/develop >/dev/null 2>&1 && echo "true" || echo "false")
    if [ "$DEVELOP_EXISTS" = "false" ]; then
        log_info "Creating develop branch..."
        git checkout -b develop origin/main
        git push -u origin develop
    else
        git checkout develop
    fi
    
    log_success "Git Flow branches setup complete"
    
    echo ""
    echo "Git Flow structure:"
    echo "  main          - Production releases"
    echo "  develop       - Integration/staging"
    echo "  feature/*     - New features"
    echo "  bugfix/*      - Bug fixes"
    echo "  release/*     - Release preparation"
    echo "  hotfix/*      - Production hotfixes"
}

create_feature_branch() {
    local FEATURE_NAME=$1
    
    if [ -z "$FEATURE_NAME" ]; then
        log_error "Feature name required"
        return 1
    fi
    
    check_repo
    
    # Ensure valid branch name
    BRANCH_NAME="feature/$FEATURE_NAME"
    BRANCH_NAME=$(echo "$BRANCH_NAME" | tr ' ' '-' | tr '[:upper:]' '[:lower:]')
    
    log_info "Creating feature branch: $BRANCH_NAME..."
    
    git fetch origin
    git checkout -b "$BRANCH_NAME" origin/develop
    git push -u origin "$BRANCH_NAME"
    
    log_success "Created feature branch: $BRANCH_NAME"
}

create_hotfix_branch() {
    local HOTFIX_NAME=$1
    
    if [ -z "$HOTFIX_NAME" ]; then
        log_error "Hotfix name required"
        return 1
    fi
    
    check_repo
    
    # Ensure valid branch name
    BRANCH_NAME="hotfix/$HOTFIX_NAME"
    BRANCH_NAME=$(echo "$BRANCH_NAME" | tr ' ' '-' | tr '[:upper:]' '[:lower:]')
    
    log_info "Creating hotfix branch: $BRANCH_NAME..."
    
    git fetch origin
    git checkout -b "$BRANCH_NAME" origin/main
    git push -u origin "$BRANCH_NAME"
    
    log_success "Created hotfix branch: $BRANCH_NAME"
}

################################################################################
# MAIN MENU
################################################################################

show_menu() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║     ALAWAEL - REPOSITORY MANAGEMENT TOOLS         ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "Branch Management:"
    echo "  1. Sync master → main"
    echo "  2. Create new branch"
    echo "  3. Delete branch"
    echo "  4. List all branches"
    echo "  5. Cleanup stale branches"
    echo ""
    echo "Repository Management:"
    echo "  6. Show repository status"
    echo "  7. Backup repository"
    echo ""
    echo "Git Flow:"
    echo "  8. Setup Git Flow"
    echo "  9. Create feature branch"
    echo " 10. Create hotfix branch"
    echo ""
    echo "Other:"
    echo "  0. Exit"
    echo ""
}

main() {
    while true; do
        show_menu
        read -p "Select option (0-10): " choice
        
        case $choice in
            1)
                sync_master_to_main
                ;;
            2)
                read -p "Enter branch name: " BRANCH_NAME
                read -p "Source branch [main]: " SOURCE
                SOURCE=${SOURCE:-main}
                create_branch "$BRANCH_NAME" "$SOURCE"
                ;;
            3)
                read -p "Enter branch name to delete: " BRANCH_NAME
                delete_branch "$BRANCH_NAME"
                ;;
            4)
                list_branches
                ;;
            5)
                cleanup_branches
                ;;
            6)
                show_repo_status
                ;;
            7)
                backup_repo
                ;;
            8)
                setup_git_flow
                ;;
            9)
                read -p "Enter feature name: " FEATURE_NAME
                create_feature_branch "$FEATURE_NAME"
                ;;
            10)
                read -p "Enter hotfix name: " HOTFIX_NAME
                create_hotfix_branch "$HOTFIX_NAME"
                ;;
            0)
                log_info "Exiting..."
                exit 0
                ;;
            *)
                log_error "Invalid option"
                ;;
        esac
        
        echo ""
        read -p "Press Enter to continue..."
    done
}

# Run if executable
if [ "${BASH_SOURCE[0]}" == "${0}" ]; then
    main "$@"
fi
