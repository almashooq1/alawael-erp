# 🚀 Deployment Guide: ScaleHealth Smart Ecosystem

## 1. Overview

This guide provides instructions for deploying the **ScaleHealth Smart Ecosystem (Phases 101-110)** to a containerized production environment. The system is encapsulated in a single Node.js service running on Port 3001.

## 2. Prerequisites

- Docker & Docker Compose installed.
- (Optional) Access to a cloud provider (Azure, AWS, GCP) for remote hosting.

## 3. Deployment Files

- **Dockerfile:** `Dockerfile.smart` (Multi-stage build optimized for Node.js 18).
- **Compose File:** `docker-compose.smart.yml` (Orchestration config).

## 4. Local Deployment (Testing)

Run the following command in the root directory:

```bash
docker-compose -f docker-compose.smart.yml up --build -d
```

- **Access:** `http://localhost:3001`
- **Dashboard:** `http://localhost:3001/dashboard/dashboard.html`
- **Health Check:** `http://localhost:3001/health` (If implemented)

## 5. Cloud Deployment (Azure Container Apps Example)

1. **Login to Azure:**
   ```bash
   az login
   ```
2. **Push Image:**
   ```bash
   az acr build --registry <your_registry> --image scalehealth-smart:v1 --file Dockerfile.smart .
   ```
3. **Deploy Container App:**
   ```bash
   az containerapp create \
     --name scalehealth-smart \
     --resource-group <resource_group> \
     --image <your_registry>.azurecr.io/scalehealth-smart:v1 \
     --target-port 3001 \
     --env-vars NODE_ENV=production
   ```

## 6. Accessing Endpoints

Once deployed, your base URL will change from `localhost` to your cloud URL.

- **Smart API:** `https://<app-name>.azurecontainerapps.io/api/...`
- **Digital Twin:** `https://<app-name>.azurecontainerapps.io/api/patient-integrator-smart/digital-twin/:id`

## 7. Scaling

The Smart Core is stateless (currently using in-memory caches for Phase 101/110). To scale horizontally (multiple instances), you must connect a Redis instance for shared state management.
