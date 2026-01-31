#!/bin/bash

# 🐳 Docker Helper Scripts for Rehab AGI
# مساعد لإدارة حاويات Docker

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

show_menu() {
  echo -e "${BLUE}🐳 Docker Management Menu${NC}"
  echo "=========================="
  echo "1) Start all services"
  echo "2) Stop all services"
  echo "3) Restart services"
  echo "4) View logs"
  echo "5) Database backup"
  echo "6) Database restore"
  echo "7) View status"
  echo "8) Clean up"
  echo "9) Exit"
  echo ""
  read -p "Choose [1-9]: " choice
}

start_services() {
  echo -e "${BLUE}Starting services...${NC}"
  docker-compose up -d
  echo -e "${GREEN}✓ Services started${NC}"
  docker-compose ps
}

stop_services() {
  echo -e "${BLUE}Stopping services...${NC}"
  docker-compose down
  echo -e "${GREEN}✓ Services stopped${NC}"
}

restart_services() {
  echo -e "${BLUE}Restarting services...${NC}"
  docker-compose restart
  echo -e "${GREEN}✓ Services restarted${NC}"
}

view_logs() {
  echo -e "${BLUE}View logs for which service?${NC}"
  echo "1) Main server"
  echo "2) Database"
  echo "3) Redis"
  echo "4) All services"
  read -p "Choose [1-4]: " log_choice

  case $log_choice in
    1) docker-compose logs -f agi-server ;;
    2) docker-compose logs -f postgres ;;
    3) docker-compose logs -f redis ;;
    4) docker-compose logs -f ;;
  esac
}

backup_database() {
  echo -e "${BLUE}Backing up database...${NC}"
  BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
  docker exec rehab-postgres pg_dump -U postgres rehab_agi > "$BACKUP_FILE"
  echo -e "${GREEN}✓ Backup created: $BACKUP_FILE${NC}"
}

restore_database() {
  echo -e "${BLUE}Restoring database...${NC}"
  read -p "Enter backup file name: " backup_file

  if [ ! -f "$backup_file" ]; then
    echo -e "${RED}✗ File not found: $backup_file${NC}"
    return
  fi

  docker exec -i rehab-postgres psql -U postgres rehab_agi < "$backup_file"
  echo -e "${GREEN}✓ Database restored${NC}"
}

view_status() {
  echo -e "${BLUE}Container Status:${NC}"
  docker-compose ps

  echo ""
  echo -e "${BLUE}Resource Usage:${NC}"
  docker stats --no-stream
}

cleanup() {
  echo -e "${YELLOW}This will remove stopped containers and dangling images${NC}"
  read -p "Continue? (y/n): " confirm

  if [ "$confirm" = "y" ]; then
    docker system prune -f
    echo -e "${GREEN}✓ Cleanup complete${NC}"
  fi
}

# Main loop
while true; do
  show_menu

  case $choice in
    1) start_services ;;
    2) stop_services ;;
    3) restart_services ;;
    4) view_logs ;;
    5) backup_database ;;
    6) restore_database ;;
    7) view_status ;;
    8) cleanup ;;
    9) echo -e "${BLUE}Goodbye!${NC}"; exit 0 ;;
    *) echo -e "${RED}Invalid choice${NC}" ;;
  esac

  echo ""
  read -p "Press Enter to continue..."
done
