# Production nginx — live config of record

`production-alawael.conf` in this folder is a **verbatim snapshot** of the live
Hostinger VPS config at `/etc/nginx/sites-enabled/alawael` (server
`72.60.84.56`, domain `alaweal.org`).

**Why this file exists:** the live nginx config is edited directly on the server
and is **not** managed by the deploy pipeline (`deploy-hostinger.yml` only rsyncs
the frontend build to the nginx root; it never touches the server-block config).
So without a snapshot in the repo, hand-made fixes would be lost if the VPS or
its nginx config is ever rebuilt/regenerated. Keep this file in sync whenever the
live config changes (re-fetch: `ssh … 'cat /etc/nginx/sites-enabled/alawael'`).

## Invariants that MUST hold (each fixed a real prod incident)

1. **Service-worker scripts are served `no-cache`.** Exact-match blocks —
   `location = /service-worker.js`, `= /sw.js`, `= /registerSW.js` — set
   `Cache-Control: no-cache, no-store, must-revalidate`. Exact-match beats the
   regex `location ~* \.js$` (which serves hashed assets `immutable 1y`). WHY: if
   a SW script is HTTP-cached immutably, a browser never downloads its
   replacement, so a bad/stale SW can never be superseded (W1586: a cache-first
   SW pinned a stale app shell → routes 404'd; the kill-switch that fixes it can
   only reach browsers if the SW script itself is `no-cache`).

   **`/registerSW.js` is overridden to a cleanup shim (2026-07-02, W1611).** It
   is `alias`ed to `/etc/nginx/overrides/registerSW.js` (snapshotted in this repo
   at `nginx/overrides/registerSW.js`) instead of `try_files $uri`, so it
   registers NO service worker and instead **unregisters any existing SW +
   purges all caches** on load. WHY: the legacy frontend used to register a
   root-scope (`scope:'/'`) SW that served the stale legacy shell for EVERY
   navigation — including sibling apps `/rehab` and `/admin` — causing the
   recurring "404 on most of the site". Deploy-proof (a frontend rebuild can't
   revert nginx) and belt-and-suspenders with the source fix (W1611 removed all
   3 SW-registration paths from `frontend/`) + the `/service-worker.js`
   kill-switch. Old cached shells that still request `/registerSW.js` get the
   cleanup; new shells no longer reference it.

2. **`/etc/nginx/sites-enabled/` contains ONLY `alawael`.** nginx `include`s
   `sites-enabled/*` with **no extension filter**, so any `*.bak` file there is
   loaded as a **duplicate `server_name` block** that can shadow the live config
   (this silently defeated the SW header change until the 3 `.bak` files were
   moved out). Keep backups anywhere EXCEPT `sites-enabled/` (e.g.
   `/root/nginx-disabled-backups/`).

3. **Hashed static assets stay `immutable`** (`location ~* \.js|css|…$` →
   `expires 1y; Cache-Control "public, immutable"`). Content-hashed filenames make
   this safe and it's required for the SW/prune strategy to work.

## Restore / apply on the server

```sh
# the config aliases /registerSW.js to /etc/nginx/overrides/registerSW.js — copy it FIRST
ssh root@72.60.84.56 'mkdir -p /etc/nginx/overrides'
scp nginx/overrides/registerSW.js root@72.60.84.56:/etc/nginx/overrides/registerSW.js
scp nginx/production-alawael.conf root@72.60.84.56:/etc/nginx/sites-enabled/alawael
ssh root@72.60.84.56 'nginx -t && nginx -s reload'
# verify:
curl -sI https://alaweal.org/service-worker.js | grep -i cache-control      # -> no-cache
curl -s  https://alaweal.org/registerSW.js       | grep -c CLEANUP           # -> 1 (cleanup shim)
ls /etc/nginx/sites-enabled/                                                 # -> only "alawael"
```

> Note: `ssl_certificate` / `ssl_certificate_key` are Let's Encrypt **paths**
> (`/etc/letsencrypt/live/alaweal.org/…`), not secrets. The private key itself is
> never in this file.
