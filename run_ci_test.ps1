$env:CI = 'true'
$env:NODE_ENV = 'test'
$env:USE_MOCK_DB = 'true'
$env:DISABLE_REDIS = 'true'
$env:BCRYPT_ROUNDS = '4'
$env:JWT_SECRET = 'test-ci-secret-key-minimum-32-chars-ok!!'
$env:JWT_REFRESH_SECRET = 'test-ci-refresh-secret-minimum-32-chars-ok!!'
$env:ENCRYPTION_KEY = 'test-ci-encryption-key-minimum-32chars-ok!!'
$env:SESSION_SECRET = 'test-ci-session-secret-min-16chars!'
$env:MONGODB_URI = 'mongodb://127.0.0.1:27017/alawael_test'

Set-Location 'c:\Users\x-be\OneDrive\المستندات\04-10-2025\66666\backend'

$output = node node_modules/jest/bin/jest.js `
    __tests__/auth.test.js `
    __tests__/messaging-routes.phase2.test.js `
    __tests__/finance-routes.phase2.test.js `
    __tests__/notifications-routes.phase2.test.js `
    __tests__/reporting-routes.phase2.test.js `
    --passWithNoTests --no-coverage --ci --runInBand --forceExit `
    --json --outputFile=jest-results-ci.json 2>&1

$exitCode = $LASTEXITCODE
$output | Out-File 'c:\Users\x-be\AppData\Local\Temp\jest_ci_output.txt' -Encoding utf8
Write-Output "EXIT_CODE: $exitCode"
$output | Where-Object { $_ -match 'PASS|FAIL|Tests:|Test Suites:|failed|error' }
