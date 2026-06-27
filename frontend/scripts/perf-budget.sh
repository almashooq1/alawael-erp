#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# Al-Awael ERP — Frontend Performance Budget
# Usage: ./scripts/perf-budget.sh
# ═══════════════════════════════════════════════════════════════════════════

set -euo pipefail

BUILD_DIR="build/static"

cd "$(dirname "$0")/.."

# Budget limits (in KB)
declare -A BUDGETS=(
  [vendor]=200
  [mui]=300
  [charts]=150
  [exceljs]=200
  [pdf-tools]=150
  [routes-finance]=100
  [routes-hr]=100
  [routes-rehab]=100
  [routes-admin]=100
  [routes-enterprise]=100
  [routes-misc]=100
)

echo "═══════════════════════════════════════════════════════════════════════"
echo "  Al-Awael ERP — Performance Budget"
echo "═══════════════════════════════════════════════════════════════════════"

PASS=0
FAIL=0

for chunk in "${!BUDGETS[@]}"; do
  budget=${BUDGETS[$chunk]}
  # Find all JS files matching this chunk name
  files=$(find "$BUILD_DIR/js" -name "*$chunk*.js" 2>/dev/null || true)
  
  if [ -n "$files" ]; then
    size=$(echo "$files" | xargs wc -c 2>/dev/null | tail -1 | awk '{print $1}')
    size_kb=$((size / 1024))
    
    if [ "$size_kb" -le "$budget" ]; then
      echo "  ✅ $chunk: ${size_kb}KB (budget: ${budget}KB)"
      PASS=$((PASS + 1))
    else
      echo "  ❌ $chunk: ${size_kb}KB (budget: ${budget}KB) — OVER BUDGET"
      FAIL=$((FAIL + 1))
    fi
  fi
done

# Total bundle size
TOTAL_SIZE=$(find "$BUILD_DIR" -name "*.js" -exec wc -c {} + 2>/dev/null | tail -1 | awk '{print $1}')
TOTAL_MB=$((TOTAL_SIZE / 1024 / 1024))

echo ""
echo "  Total JS: ${TOTAL_MB}MB"

echo ""
echo "═══════════════════════════════════════════════════════════════════════"
echo "  Pass: $PASS, Fail: $FAIL"
echo "═══════════════════════════════════════════════════════════════════════"

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
