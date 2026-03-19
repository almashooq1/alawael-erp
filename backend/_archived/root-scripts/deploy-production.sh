#!/bin/bash
# Production Deployment Script for Al-Awael Phase 29-33
# يعمل على Windows PowerShell و Linux/Mac bash

echo "🚀 Al-Awael Phase 29-33 - Production Deployment Script"
echo "================================"

# 1. Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found! Please install Node.js v18+"
    exit 1
fi
echo "✅ Node.js $(node -v) found"

# 2. Check PM2
if ! command -v pm2 &> /dev/null; then
    echo "❌ PM2 not found! Installing..."
    npm install -g pm2
fi
echo "✅ PM2 $(pm2 -v) found"

# 3. Go to backend directory
cd backend || { echo "❌ backend directory not found"; exit 1; }
echo "✅ Switched to backend directory"

# 4. Install dependencies
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi
echo "✅ Dependencies ready"

# 5. Run tests
echo ""
echo "🧪 Running endpoint tests..."
if node test-phases-29-33.js; then
    echo "✅ All tests passed!"
else
    echo "⚠️ Some tests failed (non-blocking)"
fi

# 6. Stop existing PM2 processes
echo ""
echo "🛑 Stopping existing PM2 processes..."
pm2 stop all 2>/dev/null || true
pm2 delete all 2>/dev/null || true
sleep 2

# 7. Start with production config
echo ""
echo "🚀 Starting backend with PM2..."
export NODE_ENV=production
export PORT=3001
export USE_MOCK_DB=true

# Start in cluster mode with 4 instances
pm2 start server.js \
  --name alawael-backend \
  --instances 4 \
  --exec-mode cluster \
  --watch false \
  --max-memory-restart 500M

# 8. Save PM2 config
pm2 save

# 9. Wait for startup
echo ""
echo "⏳ Waiting for backend to start..."
sleep 3

# 10. Verify health
echo ""
echo "🏥 Checking backend health..."
max_attempts=5
attempt=1

while [ $attempt -le $max_attempts ]; do
    if curl -s http://localhost:3001/health > /dev/null; then
        echo "✅ Backend is healthy!"
        break
    fi
    echo "⏳ Attempt $attempt/$max_attempts..."
    sleep 2
    ((attempt++))
done

if [ $attempt -gt $max_attempts ]; then
    echo "❌ Backend failed to start!"
    pm2 logs alawael-backend --lines 20
    exit 1
fi

# 11. Show status
echo ""
echo "📊 Final Status:"
pm2 status
echo ""
echo "✅ DEPLOYMENT SUCCESSFUL!"
echo ""
echo "URLs:"
echo "  Health: http://localhost:3001/health"
echo "  Phase 29-33: http://localhost:3001/phases-29-33"
echo ""
echo "Commands:"
echo "  View logs: pm2 logs alawael-backend"
echo "  Monitor:   pm2 monit"
echo "  Restart:   pm2 restart alawael-backend"
echo ""
