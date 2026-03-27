# Docker Compose Guide — Al-Awael ERP

This document explains the four Docker Compose files in the project and which
services are **implemented** versus **aspirational** (planned for the future).

---

## Compose Files

| File | Purpose | When to use |
|------|---------|-------------|
| `docker-compose.yml` | **Full stack** — all infrastructure, app services, monitoring, and aspirational microservices | Reference only — see "Aspirational Services" below |
| `docker-compose.production.yml` | **Production deployment** — hardened settings, resource limits, restart policies | `docker compose -f docker-compose.yml -f docker-compose.production.yml up` |
| `docker-compose.professional.yml` | **Professional tier** — subset of services for paid/professional environments | `docker compose -f docker-compose.yml -f docker-compose.professional.yml up` |
| `docker-compose.optional.yml` | **Dev tools** — optional services like Mongo Express, Mailhog, Redis Commander | `docker compose -f docker-compose.yml -f docker-compose.optional.yml up` |

---

## Quick Start (Development)

To run **only the implemented, working services**:

```bash
# Core infrastructure + main app
docker compose up mongodb redis backend frontend nginx
```

To include monitoring:
```bash
docker compose up mongodb redis backend frontend nginx prometheus grafana
```

To include sub-modules:
```bash
docker compose up mongodb redis backend frontend nginx \
  finance-backend scm-backend scm-frontend \
  dashboard-api dashboard-ui intelligent-agent
```

---

## Service Classification

### ✅ Implemented Services (have actual code / standard images)

| Service | Source | Description |
|---------|--------|-------------|
| `mongodb` | Official image | Primary database |
| `redis` | Official image | Cache & session store |
| `nats` | Official image | Message broker |
| `minio` | Official image | Object storage (S3-compatible) |
| `backend` | `./backend` | Main Node.js API (port 3001) |
| `frontend` | `./frontend` | React SPA |
| `api-gateway` | `./gateway` | API gateway / reverse proxy |
| `graphql` | `./graphql` | GraphQL layer |
| `nginx` | `./nginx` | Reverse proxy |
| `finance-backend` | `./finance-module` | Finance module API |
| `scm-backend` | `./supply-chain-management` | Supply chain management API |
| `scm-frontend` | `./supply-chain-management/frontend` | SCM frontend |
| `dashboard-api` | `./dashboard` | Dashboard API |
| `dashboard-ui` | `./dashboard` | Dashboard frontend |
| `intelligent-agent` | `./intelligent-agent` | AI agent module |
| `secretary-ai` | `./secretary_ai` | Secretary AI assistant |
| `whatsapp` | `./whatsapp` | WhatsApp integration |

### ✅ Monitoring & Dev Tools (standard images)

| Service | Image | Description |
|---------|-------|-------------|
| `prometheus` | prom/prometheus | Metrics collection |
| `grafana` | grafana/grafana | Metrics dashboards |
| `loki` | grafana/loki | Log aggregation |
| `alertmanager` | prom/alertmanager | Alert routing |
| `node-exporter` | prom/node-exporter | Host metrics |
| `redis-exporter` | oliver006/redis_exporter | Redis metrics |
| `jaeger` | jaegertracing/all-in-one | Distributed tracing |
| `postgres` | postgres | Secondary database |
| `elasticsearch` | elasticsearch | Search engine |
| `kibana` | kibana | Log visualization |
| `mongo-express` | mongo-express | MongoDB admin UI |
| `mailhog` | mailhog/mailhog | Email testing |
| `redis-commander` | rediscommander/redis-commander | Redis admin UI |

### ⏳ Aspirational Services (no implementation yet — DO NOT start)

These services are defined in `docker-compose.yml` as a **roadmap** for future
microservice architecture. They reference Docker images that **do not exist yet**.
Running `docker compose up` without specifying service names will fail because
of these services.

| Service | Planned Purpose |
|---------|-----------------|
| `python-ml` | Machine learning engine |
| `notification-service` | Push/email/SMS notifications |
| `queue-worker` | Background job processor |
| `backup-service` | Automated backup |
| `log-aggregator` | Centralized logging |
| `payment-gateway` | Payment processing (HyperPay/Stripe) |
| `communication-hub` | Unified communications |
| `report-worker` | Report generation worker |
| `audit-service` | Audit trail microservice |
| `search-service` | Full-text search |
| `webhook-worker` | Webhook delivery |
| `scheduler` | Task scheduler |
| `file-processor` | File conversion/processing |
| `saudi-gov-gateway` | Saudi government API integration |
| `iot-gateway` | IoT device management |
| `hr-payroll-service` | HR & payroll |
| `crm-service` | Customer relationship management |
| `attendance-biometric-service` | Biometric attendance |
| `fleet-transport-service` | Fleet management |
| `document-management-service` | DMS |
| `workflow-engine-service` | BPMN workflow engine |
| `identity-service` | Identity & access management |
| `analytics-bi-service` | Business intelligence |
| `e-learning-service` | E-learning platform |
| `parent-portal-service` | Parent portal |
| `rehabilitation-care-service` | Rehab care management |
| `fee-billing-service` | Fee & billing |
| `multi-tenant-service` | Multi-tenancy |
| `realtime-collaboration-service` | Real-time collaboration |
| `kitchen-laundry-facility-service` | Facility services |
| `inventory-warehouse-service` | Inventory management |
| `academic-curriculum-service` | Curriculum management |
| `student-health-medical-service` | Student health |
| `visitor-campus-security-service` | Visitor & security |
| `crisis-safety-service` | Crisis management |
| `compliance-accreditation-service` | Compliance tracking |
| `events-activities-service` | Events management |
| `asset-equipment-service` | Asset tracking |
| `staff-training-development-service` | Staff training |
| `cms-announcements-service` | CMS & announcements |
| `forms-survey-service` | Forms & surveys |
| `budget-financial-planning-service` | Budget planning |
| `student-lifecycle-service` | Student lifecycle |
| `external-integration-hub-service` | External integrations |
| `facility-space-management-service` | Space management |
| `platform-api-gateway` | Platform gateway |
| `security-auth-service` | Auth service |
| `smart-reports-service` | Smart analytics reports |
| `service-mesh-monitor` | Service mesh observability |
| `notification-center` | Notification management |
| `backup-recovery` | Backup & recovery |
| `ai-engine` | AI/ML engine |
| `advanced-audit` | Advanced audit trails |
| `multilingual` | Translation service |
| `payment-gateway-service` | Payment processing (duplicate) |
| `task-project` | Task/project management |
| `file-storage` | File storage service |
| `chat-messaging` | Chat & messaging |
| `report-scheduler` | Report scheduling |
| `system-config` | System configuration |
| `data-migration` | Data migration |

> **Recommendation:** When implementing a service from this list, move it to the
> "Implemented" section above and ensure its Docker image builds correctly before
> adding it to any production compose command.

---

## Environment Variables

All compose files expect a `.env` file in the project root. Required variables:

```env
# Required (compose will fail without these)
JWT_SECRET=<generate-a-strong-random-secret>
DB_PASSWORD=<strong-database-password>
REDIS_PASSWORD=<strong-redis-password>
GRAFANA_PASSWORD=<strong-grafana-password>
MONGO_ROOT_PASSWORD=<strong-mongo-root-password>

# Optional (have sensible defaults)
NODE_ENV=production
TZ=Asia/Riyadh
LOG_LEVEL=info
```

---

## Common Commands

```bash
# Start core services only
docker compose up -d mongodb redis backend frontend nginx

# Start with monitoring
docker compose up -d mongodb redis backend frontend nginx prometheus grafana loki

# View logs
docker compose logs -f backend

# Rebuild after code changes
docker compose build backend frontend && docker compose up -d

# Stop everything
docker compose down

# Stop and remove volumes (⚠️ destroys data)
docker compose down -v
```
