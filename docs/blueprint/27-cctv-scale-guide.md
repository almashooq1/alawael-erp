# CCTV Platform — Scale & Dimensioning Guide

Companion to [27-cctv-platform.md](27-cctv-platform.md). This document
covers **how to dial the platform up to 50,000+ cameras** and how to
diagnose the bottleneck if you can't.

---

## What the platform can sustain today

| Tier | Branches | Cameras      | Smart events/sec | Status                              |
| ---- | -------- | ------------ | ---------------- | ----------------------------------- |
| S    | 1–3      | 10–60        | < 50             | works out of the box                |
| M    | 4–10     | 200–500      | 50–500           | works, default env                  |
| L    | 10–30    | 500–5,000    | 500–5,000        | needs the scale knobs below         |
| XL   | 30+      | 5,000–50,000 | 5,000–50,000     | needs scale knobs + ops items below |

The bottleneck moves as you go up:

1. **S/M**: ISAPI round-trip latency to each NVR. Already solved by the
   per-host **keep-alive HTTP agent pool** (`httpAgentPool.js`).
2. **L**: synchronous Mongo write per event. Solved by the **batched
   event queue** (`eventQueue.service.js`).
3. **XL**: Mongo write throughput. Solved by the **bulk insertMany +
   capped AI fan-out** plus the **per-target circuit breakers** so one
   bad NVR can't open a global breaker.

---

## Scale levers (env)

### Event ingestion

| Var                   | Default | What it controls              | When to raise                         |
| --------------------- | ------- | ----------------------------- | ------------------------------------- |
| `CCTV_QUEUE_CAPACITY` | `10000` | max events buffered in memory | raise to `50000` for XL               |
| `CCTV_QUEUE_BATCH`    | `500`   | max events per `insertMany`   | raise to `2000` for XL                |
| `CCTV_QUEUE_FLUSH_MS` | `250`   | flusher cadence               | lower to `100` for low-latency        |
| `CCTV_AI_CONCURRENCY` | `16`    | concurrent AI dispatches      | raise to `64` if AI is the bottleneck |
| `CCTV_QUEUE_DISABLE`  | `0`     | set `1` to bypass the queue   | tests only                            |

The queue rejects new pushes with `{ok:false, code:'QUEUE_FULL'}` once
depth ≥ 95% of capacity. The webhook returns **429 + Retry-After: 1**,
and Hikvision retries automatically.

### Hikvision adapter

| Var                                 | Default  | What it controls                      |
| ----------------------------------- | -------- | ------------------------------------- |
| `HIKVISION_AGENT_MAX_SOCKETS`       | `8`      | per-origin keep-alive socket cap      |
| `HIKVISION_AGENT_MAX_FREE_SOCKETS`  | `4`      | retained idle sockets                 |
| `HIKVISION_AGENT_KEEPALIVE_MS`      | `30000`  | TCP keep-alive timer                  |
| `HIKVISION_AGENT_SOCKET_TIMEOUT`    | `15000`  | per-socket timeout                    |
| `HIKVISION_PER_TARGET_MAX_FAILURES` | `4`      | failures to trip a single-NVR breaker |
| `HIKVISION_PER_TARGET_COOLDOWN_MS`  | `30000`  | per-NVR cooldown                      |
| `HIKVISION_BREAKER_IDLE_TTL_MS`     | `600000` | GC idle breakers after 10 m           |
| `HIKVISION_BREAKER_SOFT_CAP`        | `500`    | max breakers retained                 |

The breaker registry is **per-target**. Failing 10.0.0.5 does **not**
take down 10.0.0.6. Inactive breakers are garbage-collected.

### Health monitor

| Var                      | Default | What it controls               |
| ------------------------ | ------- | ------------------------------ |
| `CCTV_PROBE_BATCH`       | `20`    | total cameras probed per tick  |
| `CCTV_PROBE_CONCURRENCY` | `16`    | parallel probe workers         |
| `CCTV_HEALTH_TICK_MS`    | `60000` | tick cadence                   |
| `CCTV_FAIL_THRESHOLD`    | `3`     | consecutive failures → offline |

The tick now **shards by branch**: each branch gets `ceil(BATCH /
branchCount)` cameras per tick with its own cursor. A sluggish branch
can't starve the others. Within a tick, probes run with `CONCURRENCY`
workers so 100 cameras don't open 100 sockets at once.

Full-cycle time at scale 5000 cameras / 12 branches:

```
perBranch = ceil(500 / 12) = 42 cameras/branch/tick
ticks per full cycle = ceil(5000 / 42) ≈ 120 ticks
elapsed = 120 × 60s = 120 min ≈ 2 hours
```

To probe every camera every 15 minutes, raise `CCTV_PROBE_BATCH=2000`
and `CCTV_PROBE_CONCURRENCY=64`.

---

## Per-tier deploy checklist

### L tier (5,000 cameras)

- [ ] Set `CCTV_QUEUE_CAPACITY=20000`, `CCTV_QUEUE_BATCH=1000`
- [ ] Set `CCTV_PROBE_BATCH=2000`, `CCTV_PROBE_CONCURRENCY=32`
- [ ] Set `HIKVISION_AGENT_MAX_SOCKETS=16`
- [ ] Mongo: index check on `CctvEvent.startedAt` + `CctvEvent.cameraId`
      (both already declared in the schema)
- [ ] Mongo: enable `wiredTiger` cache to ≥ 4 GB
- [ ] Deploy **one edge gateway per branch** (`services/cctv-edge-gateway/`)
      — central no longer polls each NVR
- [ ] Prom scraper on `/api/v1/cctv/admin/queue` and `/admin/config`
- [ ] Alert rule: `cctv_queue_depth > 8000 for 1m → page`
- [ ] Alert rule: `breaker.open == true for any target → notify`

### XL tier (50,000 cameras)

Everything above, plus:

- [ ] **Shard the CctvEvent collection by branchCode** (Mongo replica
      set → sharded cluster)
- [ ] Set `CCTV_QUEUE_CAPACITY=100000`, `CCTV_QUEUE_BATCH=5000`,
      `CCTV_AI_CONCURRENCY=64`
- [ ] Run **multiple Node processes** behind nginx for ingestion
      (PM2 cluster mode N≥4). Each process has its own queue, so the
      effective capacity is `N × CCTV_QUEUE_CAPACITY`.
- [ ] Move HLS sessions to **dedicated transcoders** (separate hosts).
      Central just creates the session and returns the URL.
- [ ] Push AI dispatch off-node onto a worker pool consuming the same
      queue (Phase 28 work).
- [ ] Aggregate retention: rolling daily summary collection so the
      hot `CctvEvent` collection is bounded by the TTL index.

---

## Ops endpoints

```
GET  /api/v1/cctv/admin/queue           # snapshot: depth / hwm / drops / errors
POST /api/v1/cctv/admin/queue/flush     # force-flush right now (debug)
GET  /api/v1/cctv/admin/config          # adapter mode + breakers + agent stats
POST /api/v1/cctv/admin/breakers/reset/:target?
                                        # reset one breaker or all
POST /api/v1/cctv/admin/probe           # manual probe tick
```

---

## Verification & load testing

A quick capacity sanity check (in mock mode):

```bash
# Fire 5000 fake webhooks in parallel
for i in $(seq 1 5000); do
  curl -s -X POST \
    -H "X-Hikvision-Signature: sha256=$(printf 'mock' | openssl dgst -sha256 -hmac "${SECRET}" | awk '{print $2}')" \
    -H "Content-Type: application/xml" \
    --data "<EventNotificationAlert><eventType>VMD</eventType><channelID>1</channelID></EventNotificationAlert>" \
    "http://localhost:5000/api/v1/cctv/webhooks/nvr/RY-MAIN-NVR-01" &
done | wait

# Watch the queue drain
watch -n 1 'curl -s http://localhost:5000/api/v1/cctv/admin/queue | jq .data'
```

Expected: depth spikes, drops < 1%, queue drains to 0 within
`CCTV_QUEUE_FLUSH_MS × ceil(depth / batch)`.

---

## Symptoms → fixes

| Symptom                            | Likely cause                      | Fix                                                      |
| ---------------------------------- | --------------------------------- | -------------------------------------------------------- |
| Webhook returning **429**          | queue saturated                   | raise `CCTV_QUEUE_CAPACITY` + `CCTV_QUEUE_BATCH`         |
| `CctvEvent.insertMany` slow        | Mongo cold cache or missing index | check `db.cctvevents.getIndexes()`; bump WT cache        |
| Camera **degraded** in waves       | Single-target breaker opening     | check `/admin/config` for which IP is failing            |
| All cameras of one branch flapping | branch edge gateway down          | check edge `/health` endpoint                            |
| AI events lag behind raw events    | flusher is fast but AI is slow    | raise `CCTV_AI_CONCURRENCY`, or move AI to a worker pool |
| Health probe full cycle > 30 min   | not enough batch/concurrency      | raise `CCTV_PROBE_BATCH` + `CCTV_PROBE_CONCURRENCY`      |
