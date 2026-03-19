$root = "c:\Users\x-be\OneDrive\المستندات\04-10-2025\66666\frontend\src"
$logFile = "c:\Users\x-be\OneDrive\المستندات\04-10-2025\66666\migrate-log.txt"
$count = 0
$fileCount = 0

# Get all .js and .jsx files in pages/ and components/ that contain console.error or console.warn
$dirs = @("$root\pages", "$root\components")
$files = @()
foreach ($dir in $dirs) {
    if (Test-Path $dir) {
        $found = Get-ChildItem -Path $dir -Recurse -Include *.js,*.jsx | Where-Object {
            $content = Get-Content $_.FullName -Raw -ErrorAction SilentlyContinue
            $content -match 'console\.(error|warn)\('
        }
        if ($found) { $files += $found }
    }
}

"Found $($files.Count) files to migrate" | Out-File $logFile

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $relPath = $file.FullName.Replace($root + "\", "").Replace("\", "/")

    # Skip if already imports logger
    $hasLoggerImport = $content -match 'import\s+logger\s+from\s+'

    # Count replacements
    $errorMatches = ([regex]::Matches($content, 'console\.error\(')).Count
    $warnMatches = ([regex]::Matches($content, 'console\.warn\(')).Count
    $totalReplacements = $errorMatches + $warnMatches

    if ($totalReplacements -eq 0) { continue }

    # Replace console.error( with logger.error( and console.warn( with logger.warn(
    $newContent = $content -replace 'console\.error\(', 'logger.error(' -replace 'console\.warn\(', 'logger.warn('

    # Add import logger if not already present
    if (-not $hasLoggerImport) {
        # Find the last import line and add after it
        $lines = $newContent -split "`n"
        $lastImportIndex = -1
        for ($i = 0; $i -lt $lines.Count; $i++) {
            if ($lines[$i] -match '^\s*import\s+') {
                $lastImportIndex = $i
            }
        }

        if ($lastImportIndex -ge 0) {
            $importLine = "import logger from 'utils/logger';"
            $newLines = @()
            for ($i = 0; $i -lt $lines.Count; $i++) {
                $newLines += $lines[$i]
                if ($i -eq $lastImportIndex) {
                    $newLines += $importLine
                }
            }
            $newContent = $newLines -join "`n"
        }
    }

    # Write back
    [System.IO.File]::WriteAllText($file.FullName, $newContent)

    $fileCount++
    $count += $totalReplacements
    "$relPath : errors=$errorMatches warns=$warnMatches (import_added=$(-not $hasLoggerImport))" | Out-File $logFile -Append
}

"" | Out-File $logFile -Append
"TOTAL: $fileCount files modified, $count replacements" | Out-File $logFile -Append
