# 🚨 EMERGENCY: PowerShell Extension Crash Fix

**Status**: CRITICAL | Terminal Crashing Every 3-55 Minutes | Feb 20, 2026  
**Impact**: "Freezes" are actually terminal crashes - extension dying repeatedly  
**Solution**: Disable problematic extension & reconfigure safely

---

## 📊 Problem Diagnosis

**Your logs show**:
- ❌ PowerShell Extension PID 20404 started at 14:29
- ❌ Process crashed at 14:35 (6 minutes later)
- ❌ Pattern repeats: crashes every 3-55 minutes
- ❌ Error: "PowerShell process terminated"
- ❌ Extension tries to auto-restart, crashes again

**This explains your "freezes"!**
- Not I/O lag or module loading
- Not OnDrive sync (that's secondary)
- **PRIMARY**: Extension terminal is dying repeatedly

---

## 🎯 Quick Fix (5 minutes)

### **Step 1: Uninstall Problematic Version**

1. Open VS Code
2. Go to **Extensions** (Ctrl+Shift+X)
3. Search: **PowerShell**
4. Find: **PowerShell (Microsoft)** v2025.4.0
5. Click **Uninstall** (you'll see "Uninstall" button)
6. **Do NOT install immediately** - wait for next step

### **Step 2: Create Safe Profile**

```powershell
# Create the directory if needed
$profileDir = "$env:USERPROFILE\Documents\PowerShell"
if (!(Test-Path $profileDir)) {
    New-Item -ItemType Directory -Path $profileDir -Force | Out-Null
}

# Get the correct profile path  (NOT the mixed path with Arabic)
$profilePath = "$profileDir\profile.ps1"

# Create MINIMAL profile (no heavy imports)
$profileContent = @'
# Minimal PowerShell profile - No heavy imports, no auto-loading
# This prevents extension crashes

# Suppress module auto-loading
$env:PSModuleAutoLoadingPreference = 'ModuleQualified'

# Only set basic aliases
Set-Alias -Name grep -Value Select-String -Force -ErrorAction SilentlyContinue
Set-Alias -Name which -Value Get-Command -Force -ErrorAction SilentlyContinue

Write-Host "✓ PowerShell Ready" -ForegroundColor Green
'@

# Write the profile
Set-Content -Path $profilePath -Value $profileContent -Encoding UTF8 -Force
Write-Host "✓ Profile created: $profilePath" -ForegroundColor Green
```

Run this in PowerShell (copy-paste into terminal):

```powershell
# Run in PowerShell - Copy this entire block and paste
$profileDir = "$env:USERPROFILE\Documents\PowerShell"
if (!(Test-Path $profileDir)) { New-Item -ItemType Directory -Path $profileDir -Force | Out-Null }
$profilePath = "$profileDir\profile.ps1"
$profileContent = '# Minimal profile - No crashes
$env:PSModuleAutoLoadingPreference = "ModuleQualified"
Set-Alias -Name grep -Value Select-String -Force -ErrorAction SilentlyContinue
Write-Host "✓ PowerShell Safe Mode Active" -ForegroundColor Green'
Set-Content -Path $profilePath -Value $profileContent -Encoding UTF8 -Force
Write-Host "✓ Safe profile created" -ForegroundColor Green
```

### **Step 3: Clear VS Code Cache**

```powershell
# Stop VS Code first
# Then run this:
$cachePath = "$env:APPDATA\Code\Cache"
if (Test-Path $cachePath) {
    Remove-Item -Path $cachePath -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "✓ Cache cleared" -ForegroundColor Green
}

# Also clear extension cache
$extCache = "$env:USERPROFILE\.vscode\extensions"
Get-ChildItem -Path $extCache -Filter "*powershell*" -ErrorAction SilentlyContinue | 
    ForEach-Object { Remove-Item -Path $_.FullName -Recurse -Force -ErrorAction SilentlyContinue }
Write-Host "✓ PowerShell Extension cache cleared" -ForegroundColor Green
```

### **Step 4: Reinstall Extension**

1. **Close VS Code completely**
2. **Reopen VS Code**
3. Go to **Extensions** (Ctrl+Shift+X)
4. Search: "PowerShell"
5. Click **"PowerShell" by Microsoft** (v2025.4.0 or latest)
6. Click **Install** (NOT install)
7. VS Code will restart

### **Step 5: Test**

1. Open new Terminal (Ctrl+`)
2. Should see: "✓ PowerShell Safe Mode Active"
3. Run a command: `npm --version`
4. Wait 5-10 minutes - no crashes?
5. ✓ **FIXED!**

---

## 🛠️ Detailed Fix (If Quick Fix Doesn't Work)

### **Problem #1: Corrupted Extension Settings**

**Symptoms**: Extension keeps crashing despite reinstall

**Fix**:
```powershell
# Backup, then delete extension folder
$extPath = "$env:USERPROFILE\.vscode\extensions"
$psExtFolder = Get-ChildItem -Path $extPath -Filter "*powershell*" -Directory | Select-Object -First 1

if ($psExtFolder) {
    $backupPath = "$PSScriptRoot\powershell-ext-backup"
    Copy-Item -Path $psExtFolder.FullName -Destination $backupPath -Recurse -Force
    Remove-Item -Path $psExtFolder.FullName -Recurse -Force
    Write-Host "✓ Extension backed up and removed" -ForegroundColor Green
}
```

Then reinstall fresh:
1. VS Code > Extensions
2. type: @installed
3. Find PowerShell
4. Uninstall
5. Reload
6. Search "PowerShell" again
7. Install fresh

### **Problem #2: Profile Path Issues**

**Symptoms**: Profile mixing Arabic/English paths, not loading correctly

**Fix - SET CORRECT PROFILE PATH MANUALLY**:

Edit: **File > Preferences > Settings**
Search: "powershell.cwd"

Add to settings.json:
```json
"powershell.profiles.windows": [
    {
        "name": "PowerShell",
        "source": "PowerShell",
        "icon": "terminal-powershell",
        "args": ["-NoProfile", "-NoExit", "-Command", "& {$global:__profile=1}"]
    }
],
"powershell.startAutomaticallyOnOpen": false,
"powershell.enableProfileLoading": true,
"powershell.profiles.windows[0].name": "PowerShell (Safe)"
```

Even better - add this to disable auto-loading that might be causing crashes:

```json
"powershell.scriptAnalysis.enable": false,
"powershell.codeLens.enable": false,
"powershell.integratedConsole.showOnStartup": false
```

### **Problem #3: OneDrive Path Issues**

**Symptoms**: Profile path contains "المستندات" (Arabic), causing issues

**Fix - USE ENGLISH PATH**:

```powershell
# Create profile in standard location
$profileDir = "C:\Users\x-be\Documents\PowerShell"
New-Item -ItemType Directory -Path $profileDir -Force | Out-Null

$profilePath = "$profileDir\profile.ps1"
$content = '$env:PSModuleAutoLoadingPreference = "ModuleQualified"'
Set-Content -Path $profilePath -Value $content -Encoding UTF8 -Force

# Verify
Write-Host "Profile: $profilePath"
Write-Host "Exists: $(Test-Path $profilePath)"
```

---

## ✅ Verification Checklist

After applying fix, verify:

- [ ] 1. Terminal opens without errors
- [ ] 2. No "PowerShell Extension Terminal has stopped" message
- [ ] 3. Commands respond in <500ms (not hanging)
- [ ] 4. npm commands work without freezing
- [ ] 5. Terminal stays open for >10 minutes without crashing
- [ ] 6. npm test runs to completion without terminal dying

## 📊 Expected Timeline

| Time | Event |
|------|-------|
| Now | Start fix (5 min) |
| +5 min | Reinstall extension |
| +10 min | Verify stability |
| +20 min | Run full test suite |
| Success | No crashes for 1 hour ✓ |

---

## 🆘 If Still Crashing After Fix

**The extension is unstable on your system.** Try these nuclear options:

### **Option A: Downgrade Extension**
```
VS Code > Extensions > PowerShell > 
"Install Another Version" > 2025.2.0 (or 2025.1.0)
```

### **Option B: Use PowerShell 7.x (Core)**
- Download: https://github.com/PowerShell/PowerShell/releases
- Install PowerShell 7.4+
- Set as default in VS Code settings:
  ```json
  "terminal.integrated.defaultProfile.windows": "PowerShell 7"
  ```

### **Option C: Use CMD or Git Bash Instead**
If extension keeps breaking, use safer alternatives:
```
"terminal.integrated.defaultProfile.windows": "Command Prompt"
```

---

## 📝 What NOT to Do

❌ **Don't** use profile with lots of imports
❌ **Don't** auto-load heavy modules (Posh-SSH, Appx, etc.)
❌ **Don't** enable all IntelliSense features
❌ **Don't** enable Code Analysis in extension
❌ **Don't** use slow network drives for profile

---

## 🎯 Prevention

Once fixed, prevent future crashes:

✅ **Keep profile minimal** - Only essential aliases/configs
✅ **Disable auto-loading** - Set PSModuleAutoLoadingPreference = 'ModuleQualified'
✅ **Disable IntelliSense** if terminal is unstable
✅ **Use latest Extension** (but can downgrade if issues)
✅ **Disable Code Analysis** - Not needed for terminal work

---

**Status**: 🔧 **Ready to Fix** | Created: Feb 20, 2026 23:42

*This is the root cause of your "freezes". Apply immediately for stable terminal.*

