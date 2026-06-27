#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# Al-Awael ERP — Frontend Build Verification
# Usage: ./scripts/verify-build.sh
# ═══════════════════════════════════════════════════════════════════════════

set -euo pipefail

echo "═══════════════════════════════════════════════════════════════════════"
echo "  Al-Awael ERP — Frontend Build Verification"
echo "═══════════════════════════════════════════════════════════════════════"

BUILD_DIR="build"

cd "$(dirname "$0")/.."

# ─── Check 1: Build directory exists ────────────────────────────────────
echo ""
echo "🔍 Check 1: Build Directory"
if [ ! -d "$BUILD_DIR" ]; then
  echo "   ❌ Build directory not found: $BUILD_DIR"
  echo "   Run 'npm run build' first"
  exit 1
fi
echo "   ✅ Build directory found"

# ─── Check 2: index.html exists ─────────────────────────────────────────
echo ""
echo "🔍 Check 2: index.html"
if [ ! -f "$BUILD_DIR/index.html" ]; then
  echo "   ❌ index.html missing"
  exit 1
fi
echo "   ✅ index.html found"

# ─── Check 3: JS and CSS files exist ────────────────────────────────────
echo ""
echo "🔍 Check 3: JS/CSS Assets"
JS_COUNT=$(find "$BUILD_DIR" -name "*.js" | wc -l)
CSS_COUNT=$(find "$BUILD_DIR" -name "*.css" | wc -l)
if [ "$JS_COUNT" -eq 0 ] || [ "$CSS_COUNT" -eq 0 ]; then
  echo "   ❌ No JS or CSS files found"
  exit 1
fi
echo "   ✅ JS files: $JS_COUNT, CSS files: $CSS_COUNT"

# ─── Check 4: No secrets in bundle ──────────────────────────────────────
echo ""
echo "🔍 Check 4: Secrets Leak Detection"
SECRETS_FOUND=0

# Check for common secret patterns in JS files
for pattern in "password" "secret" "token" "api_key" "apikey" "private_key"; do
  if grep -ri "$pattern" "$BUILD_DIR/static/js/" 2>/dev/null | grep -v "node_modules" | head -1 > /dev/null; then
    echo "   ⚠️ Potential secret keyword found: $pattern"
    SECRETS_FOUND=1
  fi
done

if [ "$SECRETS_FOUND" -eq 0 ]; then
  echo "   ✅ No obvious secrets detected"
fi

# ─── Check 5: Bundle size ─────────────────────────────────────────────────
echo ""
echo "🔍 Check 5: Bundle Size"
BUNDLE_SIZE=$(du -sh "$BUILD_DIR" | cut -f1)
echo "   Total: $BUNDLE_SIZE"

# Check largest JS chunk
LARGEST_JS=$(find "$BUILD_DIR" -name "*.js" -exec du -h {} + | sort -rh | head -1)
if [ -n "$LARGEST_JS" ]; then
  LARGEST_JS_SIZE=$(echo "$LARGEST_JS" | awk '{print $1}')
  LARGEST_JS_NAME=$(echo "$LARGEST_JS" | awk '{print $2}')
  echo "   Largest JS: $LARGEST_JS_NAME ($LARGEST_JS_SIZE)"
fi

# ─── Check 6: CSP meta tag present ──────────────────────────────────────
echo ""
echo "🔍 Check 6: CSP Headers"
if grep -q "Content-Security-Policy" "$BUILD_DIR/index.html"; then
  echo "   ✅ CSP meta tag found"
else
  echo "   ⚠️ CSP meta tag missing (may be handled by nginx)"
fi

# ─── Check 7: manifest.json exists ──────────────────────────────────────
echo ""
echo "🔍 Check 7: PWA Manifest"
if [ -f "$BUILD_DIR/manifest.json" ]; then
  echo "   ✅ manifest.json found"
else
  echo "   ⚠️ manifest.json missing"
fi

# ─── Check 8: Service Worker exists ───────────────────────────────────
echo ""
echo "🔍 Check 8: Service Worker"
if [ -f "$BUILD_DIR/service-worker.js" ]; then
  echo "   ✅ service-worker.js found"
else
  echo "   ⚠️ service-worker.js missing"
fi

# ─── Summary ──────────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════════════════════"
echo "  ✅ Build Verification Complete"
echo "═══════════════════════════════════════════════════════════════════════"
echo "  Build size: $BUNDLE_SIZE"
echo "  JS files: $JS_COUNT, CSS files: $CSS_COUNT"
echo ""
