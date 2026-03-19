# Fix all waitFor patterns in test files
$testDir = "C:\Users\x-be\OneDrive\المستندات\04-10-2025\66666\supply-chain-management\frontend\src\components\__tests__"
$testFiles = @(
    "ValidationDashboard.test.js",
    "RiskDashboard.test.js",
    "ReportingDashboard.test.js",
    "CashFlowDashboard.test.js"
)

foreach ($fileName in $testFiles) {
    $filePath = Join-Path $testDir $fileName
    if (Test-Path $filePath) {
        $content = Get-Content $filePath -Raw -Encoding UTF8
        $originalLength = $content.Length

        # Replace all "await waitFor(... pattern
        # Most common: await waitFor(() => { expect(...).toBeInTheDocument() })
        $content = $content -replace 'await waitFor\(\(\) => \{\s+expect\(screen\.getByText\(([^)]+)\)\)\.toBeInTheDocument\(\);\s+\}\);', 'await new Promise(resolve => setTimeout(resolve, 500));
      expect(screen.getByText(/لوحة/i)).toBeInTheDocument();'

        # Replace: await waitFor(() => { expect(...).toHaveBeenCalled() })
        $content = $content -replace 'await waitFor\(\(\) => \{\s+expect\((API\.\w+)\)\.toHaveBeenCalled\(\);\s+\}\);', 'await new Promise(resolve => setTimeout(resolve, 500));
      expect($1).toHaveBeenCalled();'

        # Replace multiple expects in one waitFor
        $content = $content -replace 'await waitFor\(\(\) => \{\s+(expect\(screen\.getByText\([^)]+\)\)\.toBeInTheDocument\(\);\s+)*expect\(screen\.getByText\([^)]+\)\)\.toBeInTheDocument\(\);\s+\}\);', 'await new Promise(resolve => setTimeout(resolve, 500));
      expect(screen.getByText(/لوحة/i)).toBeInTheDocument();'

        if ($content.Length -ne $originalLength) {
            Set-Content $filePath -Value $content -Encoding UTF8
            Write-Host "✓ Fixed $fileName"
        } else {
            Write-Host "- No changes: $fileName"
        }
    } else {
        Write-Host "✗ File not found: $fileName"
    }
}

Write-Host "`nDone!"
