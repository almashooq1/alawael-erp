# Quick Run & Test Guide

This guide helps you start the backend reliably (with automatic port fallback)
and run a fast smoke test to verify core health.

## Start the Server (Windows PowerShell)

```powershell
# Stop any old Node processes
taskkill /F /IM node.exe 2>$null

# Navigate to backend
cd backend

# Recommended dev env (mock DB, no Redis)
$env:USE_MOCK_DB='true'
$env:DISABLE_REDIS='true'
$env:SMART_TEST_MODE='true'
$env:NODE_ENV='development'

# Optional preferred port; server auto-falls back if busy
$env:PORT='3002'

# Start server
node server.js
```

Notes:

- The server will retry on the next port if `EADDRINUSE` (e.g., shift from 3002
  → 3003 → ... up to 5 attempts).
- Health endpoints are public and do not require auth.

## Find Active Port & Smoke Test

```powershell
# From backend folder
npm run smoke:basic
```

What it does:

- Probes common ports (3001–3006) and selects the first responsive server.
- Calls `/`, `/health`, `/api/health`, and key module endpoints.
- Prints status codes and a brief payload preview.

## Manual Health Checks

```powershell
# Replace 300X with the port shown by the smoke test
Invoke-WebRequest -Uri "http://localhost:300X/health" | Select-Object -ExpandProperty Content
Invoke-WebRequest -Uri "http://localhost:300X/api/health" | Select-Object -ExpandProperty Content
```

## Sample API Calls

```powershell
$base = "http://localhost:300X/api"

# Vehicles (mock DB only)
Invoke-WebRequest -Uri "$base/vehicles" -UseBasicParsing | Select-Object -ExpandProperty Content

# Bookings stats
Invoke-WebRequest -Uri "$base/bookings/stats" -UseBasicParsing | Select-Object -ExpandProperty Content

# Driver rating level (sample)
Invoke-WebRequest -Uri "$base/driver-ratings/sample/DRV-001/level" -UseBasicParsing | Select-Object -ExpandProperty Content

# Alerts active
Invoke-WebRequest -Uri "$base/alerts/active" -UseBasicParsing | Select-Object -ExpandProperty Content
```

## Troubleshooting

- No response on `/health`:
  - Ensure no other Node process is bound to your preferred port.
  - Re-run `taskkill /F /IM node.exe` and start the server again.
  - Run `npm run smoke:basic` to discover the active port.

- 404 on module endpoints:
  - You may be hitting an older instance (e.g., port 3001) that doesn't mount
    newer routes.
  - Start the server from this repo using the steps above (mock DB recommended)
    and use the detected port.

- API key:
  - Most endpoints work without `X-API-KEY`. If present, it uses API key auth;
    otherwise it falls back to normal auth.

## Optional: Run Tests

```powershell
cd backend
npm test
```

For faster feedback, prefer `npm run smoke:basic` before full test runs.
