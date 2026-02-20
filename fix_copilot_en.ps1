# GitHub Copilot Troubleshooting & Repair Script

Write-Host "================================" -ForegroundColor Cyan
Write-Host "GitHub Copilot Troubleshooting" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# 1. Check VS Code version
Write-Host "[1/5] Checking VS Code version..." -ForegroundColor Yellow
$vsCodeVersion = code --version 2>$null | Select-Object -First 1
if ($vsCodeVersion) {
    Write-Host "✓ Version: $vsCodeVersion" -ForegroundColor Green
} else {
    Write-Host "✗ VS Code not found or not in PATH" -ForegroundColor Red
}

Write-Host ""

# 2. Check Copilot extensions
Write-Host "[2/5] Checking GitHub Copilot extensions..." -ForegroundColor Yellow
$copilotExtensions = code --list-extensions 2>$null | Select-String -Pattern "copilot"
if ($copilotExtensions) {
    Write-Host "✓ Extensions found:" -ForegroundColor Green
    $copilotExtensions | ForEach-Object { Write-Host "  - $_" -ForegroundColor Cyan }
} else {
    Write-Host "✗ No Copilot extensions found" -ForegroundColor Red
    Write-Host "  Tip: Install 'GitHub Copilot' from VS Code Marketplace" -ForegroundColor Yellow
}

Write-Host ""

# 3. Check important folders
Write-Host "[3/5] Checking configuration folders..." -ForegroundColor Yellow
$appDataPath = "$env:APPDATA\Code"
$extensionsPath = "$env:USERPROFILE\.vscode\extensions"

if (Test-Path $appDataPath) {
    Write-Host "✓ VS Code folder exists" -ForegroundColor Green
} else {
    Write-Host "✗ VS Code folder not found" -ForegroundColor Red
}

if (Test-Path $extensionsPath) {
    $copilotExt = Get-ChildItem $extensionsPath -Filter "*copilot*" -ErrorAction SilentlyContinue
    if ($copilotExt) {
        Write-Host "✓ Copilot folders found:" -ForegroundColor Green
        $copilotExt | ForEach-Object { Write-Host "  - $($_.Name)" -ForegroundColor Cyan }
    } else {
        Write-Host "! No local Copilot folders found" -ForegroundColor Yellow
    }
} else {
    Write-Host "! Extensions folder not found" -ForegroundColor Yellow
}

Write-Host ""

# 4. Display available options
Write-Host "[4/5] Available repair options:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1) Reload VS Code" -ForegroundColor Cyan
Write-Host "2) Clean cache" -ForegroundColor Cyan
Write-Host "3) Reinstall Copilot" -ForegroundColor Cyan
Write-Host "4) Show recommended settings" -ForegroundColor Cyan
Write-Host "5) Run all checks and repairs" -ForegroundColor Cyan
Write-Host "6) Exit" -ForegroundColor Cyan
Write-Host ""

$choice = Read-Host "Choose option (1-6)"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "Reloading VS Code..." -ForegroundColor Yellow
        Write-Host "Steps:" -ForegroundColor Cyan
        Write-Host "1. Press Ctrl+Shift+P in VS Code" -ForegroundColor White
        Write-Host "2. Type: Developer: Reload Window" -ForegroundColor White
        Write-Host "3. Press Enter" -ForegroundColor White
    }
    
    "2" {
        Write-Host ""
        Write-Host "Cleaning cache..." -ForegroundColor Yellow
        
        $cachePath = "$env:APPDATA\Code\Cache"
        if (Test-Path $cachePath) {
            try {
                Remove-Item $cachePath -Force -Recurse -ErrorAction Stop
                Write-Host "✓ Cache cleaned successfully" -ForegroundColor Green
            } catch {
                Write-Host "✗ Error: VS Code might be running. Close it first." -ForegroundColor Red
            }
        } else {
            Write-Host "! Cache folder not found" -ForegroundColor Yellow
        }
    }
    
    "3" {
        Write-Host ""
        Write-Host "Uninstalling and reinstalling Copilot..." -ForegroundColor Yellow
        
        $vsCodeRunning = Get-Process code -ErrorAction SilentlyContinue
        if ($vsCodeRunning) {
            Write-Host "✗ Error: VS Code is running. Close it first." -ForegroundColor Red
            Write-Host "Press Ctrl+Q in VS Code or close it from Task Manager" -ForegroundColor Yellow
        } else {
            try {
                $extensionPath = "$env:USERPROFILE\.vscode\extensions"
                Get-ChildItem $extensionPath -Filter "*copilot*" -ErrorAction SilentlyContinue |
                    Remove-Item -Force -Recurse -ErrorAction Stop
                Write-Host "✓ Copilot extensions removed" -ForegroundColor Green
                Write-Host "Next steps:" -ForegroundColor Cyan
                Write-Host "1. Open VS Code" -ForegroundColor White
                Write-Host "2. Go to Extensions (Ctrl+Shift+X)" -ForegroundColor White
                Write-Host "3. Search for 'GitHub Copilot'" -ForegroundColor White
                Write-Host "4. Click 'Install'" -ForegroundColor White
            } catch {
                Write-Host "✗ Error during deletion: $_" -ForegroundColor Red
            }
        }
    }
    
    "4" {
        Write-Host ""
        Write-Host "Recommended settings:" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Add this to settings.json (Ctrl+Shift+P > Preferences: Open Settings JSON):" -ForegroundColor Cyan
        Write-Host ""
        Write-Host '{
  "github.copilot.enable": {
    "*": true,
    "yaml": false,
    "plaintext": false
  },
  "github.copilot.autocomplete.enable": true,
  "[javascript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "editor.formatOnSave": true
  },
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "editor.formatOnSave": true
  }
}' -ForegroundColor Green
    }
    
    "5" {
        Write-Host ""
        Write-Host "Running all checks and repairs..." -ForegroundColor Yellow
        
        # Clean cache
        Write-Host ""
        Write-Host "▶ Cleaning cache..." -ForegroundColor Cyan
        $cachePath = "$env:APPDATA\Code\Cache"
        if (Test-Path $cachePath) {
            try {
                Remove-Item $cachePath -Force -Recurse -ErrorAction Stop
                Write-Host "✓ Cleaned" -ForegroundColor Green
            } catch {
                Write-Host "! Skipped: VS Code might be running" -ForegroundColor Yellow
            }
        }
        
        # Verify extensions
        Write-Host ""
        Write-Host "▶ Verifying extensions..." -ForegroundColor Cyan
        $copilotExt = code --list-extensions 2>$null | Select-String -Pattern "copilot"
        if ($copilotExt) {
            Write-Host "✓ Copilot extensions found" -ForegroundColor Green
        } else {
            Write-Host "! No Copilot extensions found" -ForegroundColor Yellow
        }
        
        # Summary
        Write-Host ""
        Write-Host "================================" -ForegroundColor Green
        Write-Host "Check Summary:" -ForegroundColor Green
        Write-Host "================================" -ForegroundColor Green
        Write-Host "✓ All components checked" -ForegroundColor Green
        Write-Host "✓ Cache cleaned (if possible)" -ForegroundColor Green
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Yellow
        Write-Host "1. Close VS Code completely" -ForegroundColor White
        Write-Host "2. Reopen VS Code" -ForegroundColor White
        Write-Host "3. Sign in to GitHub if needed" -ForegroundColor White
    }
    
    "6" {
        Write-Host ""
        Write-Host "Exiting..." -ForegroundColor Yellow
        exit
    }
    
    default {
        Write-Host ""
        Write-Host "✗ Invalid choice" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "================================" -ForegroundColor Green
Write-Host "Script completed" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
