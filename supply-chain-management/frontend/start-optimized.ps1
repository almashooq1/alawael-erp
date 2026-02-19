# PowerShell script to start frontend with optimizations
# Run this file in PowerShell

# Set environment variables for optimal performance
$env:FAST_REFRESH = "true"
$env:SKIP_PREFLIGHT_CHECK = "true"
$env:CI = "false"
$env:DANGEROUSLY_DISABLE_HOST_CHECK = "true"
$env:GENERATE_SOURCEMAP = "false"
$env:NODE_OPTIONS = "--max-old-space-size=4096"
$env:DISABLE_ESLINT_PLUGIN = "true"

Write-Host "✓ Environment variables set for optimized startup" -ForegroundColor Green
Write-Host "`nStarting development server..." -ForegroundColor Cyan

npm start
