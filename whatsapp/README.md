# WhatsApp Business Platform Service

Enterprise-ready WhatsApp Business Platform integration:

- **Webhook** with X-Hub-Signature-256 verification
- **Messaging** (text/template/media) with persistence
- **Queue modes** (SQS or local backoff with retries)
- **Rate limiting** per contact/minute
- **HSM Templates** (create, list, approve/reject)
- **Metrics & Alerts** (success rate, failure rate, response time)
- **Media tracking** (images, videos, documents, audio)
- **Database** (Postgres + Prisma) and cache (Redis)
- **Docker Compose** for local development

## Quick start

1. `cp .env.example .env` and fill required values:
   - `APP_SECRET`, `VERIFY_TOKEN` (from Meta App)
   - `WHATSAPP_TOKEN`, `PHONE_NUMBER_ID` (from WhatsApp Business)
   - `AWS_REGION`, `SQS_QUEUE_URL` (optional, for SQS mode)
   - `RATE_LIMIT_PER_MINUTE` (default 20)

2. `npm install`

3. Start services:

   ```bash
   docker-compose up -d db redis
   ```

4. Initialize database:

   ```bash
   npx prisma migrate dev --name init
   ```

5. Start server:
   ```bash
   npm run dev
   ```

## API Endpoints

### Webhook

- **GET/POST** `/webhook` – Meta webhook (Verify Token on GET, receive messages on POST)

### Templates (HSM Management)

- **POST** `/api/templates` – Create template
- **GET** `/api/templates?locale=en&status=pending` – List templates
- **GET** `/api/templates/:name` – Get template by name
- **PATCH** `/api/templates/:id/approve` – Approve template for use
- **PATCH** `/api/templates/:id/reject` – Reject template

## Configuration

### Queue modes

- **Local** (default): `QUEUE_MODE=local` – In-memory retries with backoff [10s, 60s, 5m]
- **SQS**: Set `QUEUE_MODE=sqs`, `SQS_QUEUE_URL`, `AWS_REGION` – Consumer auto-starts

### Rate limiting

- `RATE_LIMIT_PER_MINUTE` (default 20) – Requests per contact per minute
- Exceeding limit raises error and triggers retry/SQS redelivery

### Logging & Metrics

- Metrics logged every 60 seconds: sent, delivered, read, failed, avg response time
- Alerts: high failure rate (>10%), slow sends (>5s avg)
- Logs in structured JSON format via Pino

## Features

- ✅ Persistent message storage (inbound/outbound)
- ✅ 24-hour conversation windows
- ✅ HSM template management with approval workflow
- ✅ Media metadata tracking
- ✅ Built-in retry strategy
- ✅ Rate limiting
- ✅ Metrics & alerts
- ✅ SQS or local queue
- ✅ Docker-ready
