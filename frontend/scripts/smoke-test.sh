#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# Al-Awael ERP — Frontend Smoke Test
# Usage: ./scripts/smoke-test.sh [url]
#   url: Base URL to test (default: http://localhost:3000)
# ═══════════════════════════════════════════════════════════════════════════

set -euo pipefail

URL="${1:-http://localhost:3000}"

echo "═══════════════════════════════════════════════════════════════════════"
echo "  Al-Awael ERP — Frontend Smoke Test"
echo "  URL: $URL"
echo "═══════════════════════════════════════════════════════════════════════"

# ─── Check 1: Server responds ────────────────────────────────────────────
echo ""
echo "🔍 Check 1: Server Response"
if curl -sf -o /dev/null "$URL"; then
  echo "   ✅ Server responds (200)"
else
  echo "   ❌ Server not responding"
  exit 1
fi

# ─── Check 2: HTML content ────────────────────────────────────────────
echo ""
echo "🔍 Check 2: HTML Content"
HTML=$(curl -sf "$URL")
if echo "$HTML" | grep -q "id=\"root\""; then
  echo "   ✅ React root element found"
else
  echo "   ⚠️ React root element missing"
fi

if echo "$HTML" | grep -q "lang=\"ar\""; then
  echo "   ✅ Arabic lang attribute found"
else
  echo "   ⚠️ Arabic lang attribute missing"
fi

if echo "$HTML" | grep -q "dir=\"rtl\""; then
  echo "   ✅ RTL direction found"
else
  echo "   ⚠️ RTL direction missing"
fi

# ─── Check 3: CSP meta tag ──────────────────────────────────────────────
echo ""
echo "🔍 Check 3: CSP Meta Tag"
if echo "$HTML" | grep -q "Content-Security-Policy"; then
  echo "   ✅ CSP meta tag found"
else
  echo "   ⚠️ CSP meta tag missing (may be handled by server headers)"
fi

# ─── Check 4: Static assets ─────────────────────────────────────────────
echo ""
echo "🔍 Check 4: Static Assets"
ASSET_URLS=$(echo "$HTML" | grep -oE 'src="[^"]+"' | grep -oE '[^"]+\.js' | head -5)
if [ -n "$ASSET_URLS" ]; then
  JS_URL=$(echo "$ASSET_URLS" | head -1)
  if [[ "$JS_URL" != http* ]]; then
    JS_URL="$URL$JS_URL"
  fi
  if curl -sf -o /dev/null "$JS_URL"; then
    echo "   ✅ JS assets loadable"
  else
    echo "   ⚠️ JS asset not found: $JS_URL"
  fi
else
  echo "   ⚠️ No JS assets found in HTML"
fi

# ─── Check 5: API health (if backend available) ──────────────────────────
echo ""
echo "🔍 Check 5: API Health"
API_URL="${URL/api/}/api/v1/health"
if curl -sf -o /dev/null "$API_URL" 2>/dev/null; then
  echo "   ✅ Backend API reachable"
else
  echo "   ⚠️ Backend API not reachable (expected in static-only testing)"
fi

# ─── Summary ──────────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════════════════════"
echo "  ✅ Smoke Test Complete"
echo "═══════════════════════════════════════════════════════════════════════"
echo ""
