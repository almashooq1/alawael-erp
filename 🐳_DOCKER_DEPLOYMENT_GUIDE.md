# 🐳 Professional Deployment Guide (Docker)

## 📌 Overview

The system has been containerized using Docker to ensure consistency, scalability, and ease of deployment. This setup orchestrates 4 services:

1.  **Frontend**: React App (Served via Nginx)
2.  **Backend**: Node.js Express API
3.  **Database**: MongoDB
4.  **Cache/Queue**: Redis

## 🚀 Quick Start in Production

### 1. Prerequisites

- Docker Engine installed
- Docker Compose installed

### 2. Build and Run

```bash
docker-compose up --build -d
```

### 3. Verify Services

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **MongoDB**: localhost:27017
- **Redis**: localhost:6379

### 4. Stop Services

```bash
docker-compose down
```

## 🛠 Service Configuration

### Frontend (`client`)

- **Port:** 3000 (Mapped to 80 internally)
- **Tech:** React + Nginx (Alpine)
- **Build:** Multi-stage build for minimized image size.

### Backend (`api`)

- **Port:** 3001
- **Tech:** Node.js 18 (Alpine)
- **Environment:**
  - `NODE_ENV=production`
  - `MONGODB_URI`: Auto-connected to `mongo` service.
  - `REDIS_URL`: Auto-connected to `redis` service.

### Database (`mongo`)

- **Image:** Mongo 6.0
- **Volume:** `mongo_data` (Persistent storage)

## 🔄 Development vs Production

This setup is optimized for **Production**.

- **Frontend** is built to static files (`npm run build`) and served by Nginx. It does **not** support Hot Reload (HMR).
- **Backend** runs `node server.js` directly.

For development with containers, you would mount volumes (`- ./backend:/app`) to enable live code updates.
