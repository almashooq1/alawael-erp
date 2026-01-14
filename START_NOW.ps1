# 🚀 AlAwael ERP - تشغيل الآن!
# Script لتشغيل النظام بالكامل بأسهل طريقة

Clear-Host

Write-Host "
╔════════════════════════════════════════════════════════╗
║                                                        ║
║        🚀 AlAwael ERP - جاري التشغيل الآن... 🚀       ║
║                                                        ║
╚════════════════════════════════════════════════════════╝
" -ForegroundColor Cyan

# المسار الأساسي
$projectRoot = "c:\Users\x-be\OneDrive\المستندات\04-10-2025\66666"

# 1. Stop old processes
Write-Host "`n[STOPPING] Old processes..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

# 2. Start Backend
Write-Host "`n[STARTING] Backend (port 3001)..." -ForegroundColor Green
Push-Location "$projectRoot\backend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm start"
Pop-Location
Start-Sleep -Seconds 3

# 3. Start Frontend
Write-Host "[STARTING] Frontend (port 3000)..." -ForegroundColor Green
Push-Location "$projectRoot\frontend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev"
Pop-Location
Start-Sleep -Seconds 3

# 4. Open Browser
Write-Host "`n[BROWSER] Opening..." -ForegroundColor Cyan
Start-Sleep -Seconds 2
Start-Process "http://localhost:3000"

# 5. Show login info
Write-Host "
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ SYSTEM READY!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Backend:  http://localhost:3001
Frontend: http://localhost:3000

Email: admin@alawael.com
Password: Admin@123456

Test the system now!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
" -ForegroundColor Green

# 6. Additional info
Write-Host "
INFORMATION:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Database: In-Memory (temporary)
For permanent storage: Read 'CHOOSE_YOUR_PATH.md'

Documents:
  • CHOOSE_YOUR_PATH.md - Choose your path
  • MONGODB_ATLAS_QUICK_SETUP.md - Add MongoDB
  • START_DEPLOYMENT.md - Production deploy

" -ForegroundColor Gray

Write-Host "Waiting 5 seconds..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host "`nAll services running! Enjoy! " -ForegroundColor Green
