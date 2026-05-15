# CCTV Edge Gateway — Phase 27 C11

A small Node.js service that runs **one per branch** and bridges the
local Hikvision NVR to the central Al-Awael backend.

## What it does

1. **Long-polls the NVR's ISAPI alertStream** for motion, intrusion,
   face, ANPR, fall events. Parses each chunk, ships it to central via
   the HMAC-signed webhook at `/api/v1/cctv/webhooks/nvr/:nvrCode`.
2. **TCP-pings every camera + the NVR** every 30s / 60s. Ships the
   reachability + latency to central.
3. **Spawns ffmpeg per live session** to convert RTSP → HLS. Serves
   `/hls/:sessionId/index.m3u8` + segments. Idle sessions are reaped.
4. **Buffers locally to Redis** when central is unreachable. The replay
   worker drains the queue every 10s once central comes back.

## Why it exists (vs central polling directly)

- **Scale**: 12 branches × 50 cameras × multiple smart events/sec =
  thousands of ISAPI long-polls. Central can't open one per camera.
- **Latency**: ffmpeg transcode close to the camera is cheaper than
  pulling RTSP across the WAN.
- **Resilience**: when the WAN drops, events queue locally instead of
  being lost.
- **NVR password locality**: edge keeps the camera password on the
  branch host. Central only sees opaque `passwordRef` strings.

## Deploy (one per branch)

```bash
cd services/cctv-edge-gateway
cp config.local.example.json config.local.json   # edit per branch
npm install
BRANCH_CODE=RY-MAIN \
  CENTRAL_URL=https://alaweal.org \
  CENTRAL_HMAC_SECRET=<from NVR record on central> \
  NVR_RY_MAIN_01_PASSWORD=<actual NVR password> \
  node server.js
```

For production: run under `pm2` or `systemd`, behind a local nginx that
forwards `/cctv/hls/...` from central to this edge on port 3291.

## Environment

| Variable              | Default                     | Notes                                 |
| --------------------- | --------------------------- | ------------------------------------- |
| `BRANCH_CODE`         | from `config.local.json`    | uppercase, e.g. `RY-MAIN`             |
| `CENTRAL_URL`         | `http://localhost:5000`     | base URL of central backend           |
| `CENTRAL_HMAC_SECRET` | (empty — webhook will 401)  | shared secret with central NVR record |
| `REDIS_URL`           | `redis://127.0.0.1:6379/11` | local Redis for offline queue         |
| `PORT`                | `3291`                      | edge listener                         |
| `HLS_OUT_DIR`         | `/tmp/hls`                  | scratch for ffmpeg output             |
| `FFMPEG_BIN`          | `ffmpeg`                    | absolute path if not on PATH          |
| `HLS_MAX_SESSIONS`    | `30`                        | per-edge cap                          |
| `HLS_IDLE_MS`         | `60000`                     | reap idle sessions after this         |
| `PROBE_CAMERA_MS`     | `30000`                     | camera tcp-ping cadence               |
| `PROBE_NVR_MS`        | `60000`                     | NVR tcp-ping cadence                  |
| `POLLER_ENABLED`      | `1`                         | `0` to disable ISAPI poller (dev)     |
| `REPLAY_TICK_MS`      | `10000`                     | replay worker cadence                 |
| `LOG_LEVEL`           | `info`                      | `debug` for verbose                   |

NVR passwords are read from `process.env[nvr.passwordRef]` — never
stored in `config.local.json`.

## Endpoints exposed by the edge

```
GET  /health                         → status + queue size + sessions
GET  /sessions                       → list active HLS sessions
POST /hls/start                      → { sessionId, rtspUrl }
POST /hls/heartbeat                  → { sessionId }
POST /hls/stop                       → { sessionId }
GET  /hls/:sessionId/index.m3u8      → manifest
GET  /hls/:sessionId/seg_NNNNN.ts    → segment
```

The central `streamService.startLive()` decides the `sessionId` and
RTSP URL, then calls `POST /hls/start` on the appropriate branch edge
before returning the HLS URL to the browser.

## Files

| File                        | Role                                      |
| --------------------------- | ----------------------------------------- |
| `server.js`                 | Express app + boot                        |
| `config.js`                 | env + JSON merge                          |
| `eventPoller.js`            | ISAPI alertStream long-poll + Digest auth |
| `healthProber.js`           | TCP ping camera + NVR                     |
| `centralClient.js`          | HMAC-signed POSTs to central              |
| `queue.js`                  | Redis FIFO (fallback to memory)           |
| `replayWorker.js`           | drains queue once central is back         |
| `hlsManager.js`             | ffmpeg spawn + idle reaper                |
| `logger.js`                 | winston JSON-line logger                  |
| `config.local.example.json` | per-branch config template                |
