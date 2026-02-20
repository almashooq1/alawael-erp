# START HERE (ERP)

This guide standardizes start/stop and validation for the ERP services.

## Quick Start (Development)

- Backend: run `scripts/start-backend.ps1`
- Frontend (dev): run `scripts/start-frontend-dev.ps1`

## Production-like (Static build)

- Build & serve frontend: run `scripts/serve-frontend-prod.ps1`
  - Default API: `http://localhost:3001/api`

## Validation

- Backend health: http://localhost:3001/api/health
- Frontend: http://localhost:3002
- Login: admin@alawael.com / Admin@123456

## Notes

- Use ERP paths only: `erp_new_system/backend`, `erp_new_system/frontend`
- Frontend scripts available in `frontend/package.json` (`serve:prod`)
