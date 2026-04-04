@echo off
cd /d "c:\Users\x-be\OneDrive\المستندات\04-10-2025\66666\backend"
set CI=true
set NODE_ENV=test
set JWT_SECRET=test-ci-secret
echo Running npm run test:ci with CI=true ...
call npm run test:ci > "c:\Users\x-be\AppData\Local\Temp\jest_ci_output.txt" 2>&1
set EXIT_CODE=%ERRORLEVEL%
echo EXIT_CODE=%EXIT_CODE%
echo Output saved to: c:\Users\x-be\AppData\Local\Temp\jest_ci_output.txt
