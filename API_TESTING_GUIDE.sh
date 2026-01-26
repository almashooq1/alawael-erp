#!/usr/bin/env bash
# API Testing Guide with cURL
# دليل اختبار API مع cURL

API_URL="http://localhost:3001/api"
TOKEN=""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "🧪 ERP System - API Testing Guide"
echo "=================================="

# 1. Login
echo -e "\n${BLUE}1. Login and get JWT Token${NC}"
echo "Command:"
echo "curl -X POST $API_URL/auth/login \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"email\":\"admin@example.com\",\"password\":\"admin123\"}'"
echo ""
echo "Save the token from response:"
echo "TOKEN=<your_token_here>"
echo ""

# 2. Admin Endpoints
echo -e "${BLUE}2. Admin Dashboard${NC}"
echo "Get dashboard data:"
echo "curl -X GET $API_URL/admin/dashboard \\"
echo "  -H 'Authorization: Bearer \$TOKEN'"
echo ""

echo -e "${BLUE}3. Get Users List${NC}"
echo "curl -X GET $API_URL/admin/users \\"
echo "  -H 'Authorization: Bearer \$TOKEN'"
echo ""

echo -e "${BLUE}4. Create New User${NC}"
echo "curl -X POST $API_URL/admin/users \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -H 'Authorization: Bearer \$TOKEN' \\"
echo "  -d '{\"name\":\"John\",\"email\":\"john@example.com\",\"role\":\"user\"}'"
echo ""

# 3. Predictions
echo -e "${BLUE}5. Get Sales Prediction${NC}"
echo "curl -X POST $API_URL/predictions/sales \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -H 'Authorization: Bearer \$TOKEN' \\"
echo "  -d '{\"historical_data\":[100,120,150,140,160]}'"
echo ""

# 4. Reports
echo -e "${BLUE}6. Generate Sales Report${NC}"
echo "curl -X GET '$API_URL/reports/sales?start_date=2024-01-01&end_date=2024-12-31' \\"
echo "  -H 'Authorization: Bearer \$TOKEN'"
echo ""

echo -e "${BLUE}7. Export Report to CSV${NC}"
echo "curl -X POST $API_URL/reports/export \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -H 'Authorization: Bearer \$TOKEN' \\"
echo "  -d '{\"report_id\":\"report_1\",\"format\":\"csv\"}' \\"
echo "  -o report.csv"
echo ""

# 5. Notifications
echo -e "${BLUE}8. Create Notification${NC}"
echo "curl -X POST $API_URL/notifications \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -H 'Authorization: Bearer \$TOKEN' \\"
echo "  -d '{\"title\":\"Test\",\"message\":\"This is a test notification\",\"channels\":[\"in_app\"]}'"
echo ""

echo -e "${BLUE}9. Get Notifications${NC}"
echo "curl -X GET '$API_URL/notifications?limit=10' \\"
echo "  -H 'Authorization: Bearer \$TOKEN'"
echo ""

# 6. Monitoring
echo -e "${BLUE}10. Get System Metrics${NC}"
echo "curl -X GET $API_URL/monitoring/system \\"
echo "  -H 'Authorization: Bearer \$TOKEN'"
echo ""

echo -e "${BLUE}11. Get Performance Dashboard${NC}"
echo "curl -X GET $API_URL/monitoring/dashboard \\"
echo "  -H 'Authorization: Bearer \$TOKEN'"
echo ""

echo -e "${BLUE}12. Create Alert Rule${NC}"
echo "curl -X POST $API_URL/monitoring/alerts/rules \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -H 'Authorization: Bearer \$TOKEN' \\"
echo "  -d '{\"name\":\"High CPU\",\"metric_type\":\"cpu_usage\",\"condition\":\"greater_than\",\"threshold\":80}'"
echo ""

# Health Check
echo -e "${BLUE}13. Health Check (No Auth Required)${NC}"
echo "curl -X GET $API_URL/health"
echo ""

echo -e "${GREEN}✅ API Testing Guide Complete${NC}"
echo ""
echo "📝 Notes:"
echo "  - Replace \$TOKEN with your actual JWT token"
echo "  - Use \$API_URL with your actual API URL"
echo "  - Add --verbose flag for detailed response"
echo "  - Add --pretty for formatted JSON output"
echo ""
