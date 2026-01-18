# MongoDB Atlas Setup Helper Script

# Colors for output
function Write-Success {
    Write-Host $args -ForegroundColor Green
}

function Write-Error-Custom {
    Write-Host $args -ForegroundColor Red
}

function Write-Warning-Custom {
    Write-Host $args -ForegroundColor Yellow
}

function Write-Info {
    Write-Host $args -ForegroundColor Cyan
}

# Clear screen
Clear-Host

Write-Info "╔════════════════════════════════════════╗"
Write-Info "║   MongoDB Atlas Setup Helper 🚀       ║"
Write-Info "║   17 يناير 2026                      ║"
Write-Info "╚════════════════════════════════════════╝"
Write-Host ""

# Menu
Write-Info "Choose an option:"
Write-Host "1) Quick Setup Guide (2 min)"
Write-Host "2) Detailed Setup Guide (10 min)"
Write-Host "3) Visual Setup Guide (with ASCII diagrams)"
Write-Host "4) 5 Steps Setup"
Write-Host "5) Verify MongoDB Connection"
Write-Host "6) Test Complete Setup"
Write-Host "7) Import Sample Data"
Write-Host "8) Start Backend"
Write-Host "0) Exit"
Write-Host ""

$choice = Read-Host "Enter your choice (0-8)"

switch ($choice) {
    "1" {
        Write-Info "`n📖 Opening Quick Commands Guide...`n"
        if (Test-Path "⚡_QUICK_COMMANDS.md") {
            code ⚡_QUICK_COMMANDS.md
        }
        else {
            Write-Error-Custom "File not found!"
        }
    }

    "2" {
        Write-Info "`n📖 Opening Detailed Setup Guide...`n"
        if (Test-Path "💾_MONGODB_ATLAS_SETUP.md") {
            code 💾_MONGODB_ATLAS_SETUP.md
        }
        else {
            Write-Error-Custom "File not found!"
        }
    }

    "3" {
        Write-Info "`n📖 Opening Visual Setup Guide...`n"
        if (Test-Path "📸_MONGODB_ATLAS_VISUAL_GUIDE.md") {
            code 📸_MONGODB_ATLAS_VISUAL_GUIDE.md
        }
        else {
            Write-Error-Custom "File not found!"
        }
    }

    "4" {
        Write-Info "`n📖 Opening 5 Steps Guide...`n"
        if (Test-Path "⚡_MONGODB_ATLAS_5_STEPS.md") {
            code ⚡_MONGODB_ATLAS_5_STEPS.md
        }
        else {
            Write-Error-Custom "File not found!"
        }
    }

    "5" {
        Write-Info "`n🔍 Verifying MongoDB Connection...`n"
        
        # Change to backend directory
        if (Test-Path "backend") {
            Set-Location backend
            
            if (Test-Path "scripts\verify-mongodb.js") {
                node scripts\verify-mongodb.js
                Set-Location ..
            }
            else {
                Write-Error-Custom "Script not found: backend/scripts/verify-mongodb.js"
                Set-Location ..
            }
        }
        else {
            Write-Error-Custom "backend directory not found!"
        }
    }

    "6" {
        Write-Info "`n🧪 Running Complete Setup Test...`n"
        
        if (Test-Path "backend") {
            Set-Location backend
            
            if (Test-Path "scripts\test-setup.js") {
                node scripts\test-setup.js
                Set-Location ..
            }
            else {
                Write-Error-Custom "Script not found: backend/scripts/test-setup.js"
                Set-Location ..
            }
        }
        else {
            Write-Error-Custom "backend directory not found!"
        }
    }

    "7" {
        Write-Info "`n📊 Importing Sample Data...`n"
        
        if (Test-Path "backend") {
            Set-Location backend
            
            if (Test-Path "scripts\seed.js") {
                Write-Host ""
                node scripts\seed.js
                Write-Host ""
                Write-Success "✅ Import completed!"
                Set-Location ..
            }
            else {
                Write-Error-Custom "Script not found: backend/scripts/seed.js"
                Set-Location ..
            }
        }
        else {
            Write-Error-Custom "backend directory not found!"
        }
    }

    "8" {
        Write-Info "`n🚀 Starting Backend...`n"
        
        if (Test-Path "backend") {
            Set-Location backend
            
            Write-Success "Backend starting on port 3001..."
            Write-Info "Press Ctrl+C to stop"
            Write-Host ""
            
            npm start
            
            Set-Location ..
        }
        else {
            Write-Error-Custom "backend directory not found!"
        }
    }

    "0" {
        Write-Info "`nGoodbye! 👋"
        exit
    }

    default {
        Write-Error-Custom "Invalid choice!"
    }
}

Write-Host ""
Write-Info "Press any key to continue..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
