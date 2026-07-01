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
scp nginx/production-alawael.conf root@72.60.84.56:/etc/nginx/sites-enabled/alawael
ssh root@72.60.84.56 'nginx -t && nginx -s reload'
# verify:
curl -sI https://alaweal.org/service-worker.js | grep -i cache-control   # -> no-cache
ls /etc/nginx/sites-enabled/                                              # -> only "alawael"
```

> Note: `ssl_certificate` / `ssl_certificate_key` are Let's Encrypt **paths**
> (`/etc/letsencrypt/live/alaweal.org/…`), not secrets. The private key itself is
> never in this file.
