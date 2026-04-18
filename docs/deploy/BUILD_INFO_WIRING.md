# Wiring build identity into CI/CD

The `/api/build-info` endpoint reports `commit` and `buildTime` from
the environment. Containers built without setting these show
`"unknown"` — useful as a dev default, useless for production
incident triage. This doc is the copy-paste recipe for every CI/CD
system we've shipped to.

---

## GitHub Actions

```yaml
- name: Build backend image with build identity
  run: |
    docker build \
      --build-arg GIT_SHA=${{ github.sha }} \
      --build-arg BUILD_TIME=$(date -u +%Y-%m-%dT%H:%M:%SZ) \
      -t alawael-backend:${{ github.sha }} \
      -f backend/Dockerfile backend/
```

Bonus: add `labels:` with `org.opencontainers.image.revision` too so
`docker inspect` shows the SHA without starting the container.

---

## GitLab CI

```yaml
build:
  script:
    - docker build
      --build-arg GIT_SHA=$CI_COMMIT_SHA
      --build-arg BUILD_TIME=$(date -u +%Y-%m-%dT%H:%M:%SZ)
      -t $IMAGE:$CI_COMMIT_SHA .
```

---

## Docker Compose (local dev + simple prod)

The repo's `docker-compose.professional.yml` already interpolates
these. Just set them before `docker compose up`:

```bash
GIT_SHA=$(git rev-parse HEAD) \
BUILD_TIME=$(date -u +%Y-%m-%dT%H:%M:%SZ) \
docker compose -f docker-compose.professional.yml up -d --build
```

Or use the shipped npm alias which does the same thing:

```bash
npm run docker:build   # resolves both via git + date automatically
```

---

## Kubernetes (Helm values / plain manifests)

The image label route is better than env — `kubectl describe pod`
shows the SHA without hitting the endpoint:

```yaml
spec:
  containers:
    - name: backend
      image: alawael-backend:abc1234
      env:
        - name: GIT_SHA
          value: 'abc1234fullshahere...'
        - name: BUILD_TIME
          value: '2026-04-18T11:30:00Z'
```

If you're running Helm, template these from the release:

```yaml
env:
  - name: GIT_SHA
    value: { { .Values.gitSha | default "unknown" | quote } }
  - name: BUILD_TIME
    value: { { .Values.buildTime | default "unknown" | quote } }
```

---

## Verifying a deploy

After any deploy, curl the endpoint and check the SHA matches what
you intended:

```bash
curl -s $BASE/api/build-info | jq '{commit: .commitShort, uptime: .uptimeHuman}'
# { "commit": "abc12345", "uptime": "3m 22s" }
```

The Grafana dashboard could alert on `commit != expected` during a
rolling restart — left as an exercise unless the ops team asks for it.

---

## What NOT to wire

- **Don't** inject secrets via build args — they're baked into the
  image layer history. Use orchestrator secrets for anything sensitive.
- **Don't** set `GIT_SHA` to the branch name. The endpoint is meant
  to resolve to an immutable commit, not a moving pointer.
- **Don't** cache the `build-info` route at the CDN/proxy layer. The
  whole point is that each replica reports its own identity.
