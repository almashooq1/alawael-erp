# Runbook — RAG retrieval quality + embed errors

**Metrics endpoint:** `GET /api/rag/metrics` (MFA tier 1)
**Underlying registry:** `intelligence/risk-metrics.registry` (W297) — same source the
`/api/risk-sweep/metrics` Prometheus scraper consumes.
**Built across:** W283 (MVP) · W283e (Arabic keyword fallback) · W283f (real Cohere/OpenAI) ·
W283g (telemetry) · W283h (this endpoint).

## What this runbook covers

How to read the RAG quality signals, what each threshold means, and the concrete
action per failure mode. Three signals:

| Signal                  | Source                                       | What it means                                                                                  | When to act                                                         |
| ----------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `health.rescueRate`     | counter `rag.retrieve` w/ `fallback=rescued` | Vector retrieval found 0 chunks above 0.6 threshold; Arabic keyword fallback rescued the query | Sustained `> 5%` → embedder underperforming                         |
| `health.vectorMissRate` | counter `rag.retrieve` w/ `vector=none`      | Vector pass returned 0 results regardless of fallback                                          | Sustained `> 10%` → embed dim/model mismatch or empty branch corpus |
| `health.embedErrorRate` | counter `rag.embed.error` / total retrieves  | Failures hitting the provider's API                                                            | Sustained `> 1%` → provider/network/quota issue                     |

The `counters` block under each name gives the LABEL breakdown so you can see
which provider + error-code is driving the rate.

## What this means in plain Arabic

نظام RAG (Retrieval-Augmented Generation) يعمل في طبقتين:

1. **Vector retrieval** — يحول السؤال إلى رقم متجه عبر مزوّد embeddings
   (mock في dev، cohere/openai في الإنتاج)، ثم يقارن مع chunks مخزنة.
2. **Keyword fallback (عربي)** — احتياطي. إذا الـ vector فشل (similarity أقل
   من العتبة)، يُجرى بحث بكلمات مفتاحية مع تطبيع عربي (أ→ا، ة→ه، إزالة
   التشكيل، إلخ).

ارتفاع نسبة rescue معناه أن الـ embedder لا يفهم العربية جيداً ويحتاج ترقية.
ارتفاع أخطاء الـ embed معناه مشكلة في المزوّد (مصادقة، تجاوز حصة، انقطاع).

## Who should respond

- **rescueRate / vectorMissRate high**: AI ops engineer (tune model / upgrade provider)
- **embedErrorRate high**: on-call (provider/network — same playbook as gov adapter)

## Immediate actions (2 minutes)

1. Open `GET /api/rag/metrics` — capture `health` block + `counters['rag.embed.error']`.
2. Identify the dominant `code` in `rag.embed.error`:
   - `EMBEDDING_AUTH_FAIL` → rotate API key (Case A below)
   - `EMBEDDING_RATE_LIMITED` → throttle or scale tier (Case B)
   - `EMBEDDING_UPSTREAM_5XX` → provider outage (Case C — usually self-heals)
   - `EMBEDDING_TIMEOUT` / `EMBEDDING_NETWORK_FAIL` → network path (Case D)
   - `EMBEDDING_LIVE_NOT_CONFIGURED` → misconfigured env (Case E — should never happen post-launch)
   - `EMBEDDING_MALFORMED_RESPONSE` → vendor API changed shape (Case F — rare, vendor incident)
3. If `health.rescueRate > 5%` without correlating embed errors → quality issue (Case G).

## Diagnosis paths

### Case A — `EMBEDDING_AUTH_FAIL` (401 from provider)

- Provider rotated/revoked your key, OR env got bad value on last deploy.
- **Verify**: cohere/openai dashboard → API keys → check active status of the key
  referenced by `COHERE_API_KEY` / `OPENAI_API_KEY`.
- **Fix**: generate new key on vendor dashboard, update env, redeploy.
- **Mitigation while fixing**: the chatbot's POLICY_QUERY will downgrade to UNKNOWN
  (no answer, no hallucination) — degraded but safe.
- **Do not** retry on auth failures; the W283f retry policy correctly excludes 4xx.

### Case B — `EMBEDDING_RATE_LIMITED` (429)

- You exceeded the provider's per-second/per-minute quota.
- **Check**: `gov-status` style snapshot of recent retrieval volume —
  `GET /api/rag/metrics` → `health.totalRetrieves` rate.
- **Common cause**: a batch ingest (`npm run seed:rag-policies`) running
  alongside live retrieves, both sharing the same key/tier.
- **Fix**:
  1. Throttle the ingest (run during low-traffic window).
  2. Upgrade vendor tier (Cohere Production / OpenAI usage tier).
  3. Verify `health.cacheHitRate` (W283j) — if it's low (<30%), the cache
     isn't helping. Could be many distinct queries (long-tail) OR cache TTL
     too short (default 15min — tune via `RAG_CACHE_TTL_MS` env). Cache is
     ENABLED in production by default; check `health.cacheSize` confirms
     entries are landing.

### Case C — `EMBEDDING_UPSTREAM_5XX` (provider down)

- Vendor having an incident. Check vendor status page.
- **Mitigation**: RAG retrieval continues to "work" via keyword fallback —
  POLICY_QUERY answers are degraded but the chatbot doesn't error.
- **Action**: nothing immediate. Monitor vendor status. The W283f retry layer
  already retries once on 5xx; persistent 5xx for >5 min means it's a real
  vendor outage, not a transient blip.

### Case D — `EMBEDDING_TIMEOUT` / `EMBEDDING_NETWORK_FAIL`

- Network path between our infra and the provider is slow or broken.
- **Check**: from a backend host, `curl -w '%{time_total}' https://api.cohere.com/v2/embed`
  with a real key. If > 8s, you're at the timeout boundary.
- **Tune**: increase `EMBEDDING_HTTP_TIMEOUT_MS` (default 10000) — but be careful,
  this delays chatbot response which is user-facing. A better fix is usually a
  regional issue with the vendor or our egress.

### Case E — `EMBEDDING_LIVE_NOT_CONFIGURED` (post-launch)

- Should never happen in production. Means `EMBEDDING_PROVIDER=<live>` is set
  but the corresponding API key env is empty.
- **Verify**: in app pod, `echo $COHERE_API_KEY | wc -c` — if 0, the env wasn't
  propagated (Kubernetes Secret rotation issue, or deploy template missing var).
- **Fix**: restore the env var, restart. While fixing, RAG falls back to keyword-only
  (W283e) — POLICY_QUERY still returns answers, just less precise.

### Case F — `EMBEDDING_MALFORMED_RESPONSE` (vendor API changed)

- Vendor returned 200 OK but the JSON shape doesn't match what `liveCohereEmbed` /
  `liveOpenAIEmbed` expects.
- Very rare. Means the vendor changed their API contract without our adapter
  catching up.
- **Action**: check vendor changelog/blog. Update the response parsing in
  `services/ai/embeddingProvider.js` to match new shape. Add a test case to
  `__tests__/embedding-provider-live-wave283f.test.js`.

### Case G — High `rescueRate` without embed errors (quality issue)

- Vector retrieval is RETURNING results but consistently below the 0.6 threshold.
- Either the embedder is weak for Arabic, OR the corpus isn't aligned with
  query distribution.
- **Diagnose**:
  1. `GET /api/rag/chunks` — count active chunks. Below ~20 chunks per branch?
     The corpus is too small for vector retrieval to discriminate well.
  2. Sample 5 real queries from chatbot logs. Run them against
     `POST /api/rag/retrieve` with `{"query": "...", "topK": 5, "similarityThreshold": 0}`.
     If top similarity is < 0.4, the embedder genuinely can't separate them.
- **Fixes** (in increasing scope):
  1. Lower the threshold per-call from the chatbot (currently hard-coded 0.6 in
     `parent-chatbot.service.js`). Drops precision; raises recall.
  2. Switch to `EMBEDDING_PROVIDER=cohere-embed-multilingual-v3` if currently
     using OpenAI (cohere is significantly better for Arabic per design).
  3. Re-ingest the corpus with `npm run seed:rag-policies` after switching
     providers (vector dim differs: cohere=1024, openai=3072, mock=384).
  4. Expand the corpus — add more policies, more granular chunks (smaller
     chunkSize). More documents → vector retrieval has more to choose from.

## Common runbook actions

### Re-ingest after provider switch

After changing `EMBEDDING_PROVIDER`, the existing chunks have vectors from the
OLD provider — incompatible. Re-seed:

```bash
EMBEDDING_PROVIDER=cohere-embed-multilingual-v3 \
COHERE_API_KEY=<key> \
npm run seed:rag-policies
```

The `replacePreviousVersion: true` flag (built into the seed script)
deactivates old chunks before inserting new. Retrieval filters by
`embeddingProvider` so cross-provider chunks don't mix.

### Tune similarity threshold per consumer

The Parent Chatbot uses 0.6 (set in `intelligence/parent-chatbot.service.js`,
`ragRetriever.retrieve(message, { similarityThreshold: 0.6 })`). Lower it to
0.4 if rescueRate is consistently high — but that means more responses with
weaker citation backing. Don't go below 0.3.

### Disable keyword fallback (debug only)

To confirm vector retrieval is the bottleneck and not the fallback masking
it, temporarily pass `keywordFallback: false` from the consumer. POLICY_QUERY
will then downgrade to UNKNOWN on every vector miss — exposes the true
vector-quality rate.

## Out of scope for this runbook

- **Atlas Vector Search migration**: when chunk count exceeds ~10K per branch,
  in-process cosine becomes slow. Swap to `$vectorSearch` aggregation in
  `services/ai/rag.service.js` `retrieve()`. Separate workstream.
- **Multi-tenant key isolation**: currently single `COHERE_API_KEY` org-wide.
  Per-branch keys would let one branch's runaway not exhaust the org quota.
- ~~**Cache layer**~~ — **shipped W283j 2026-05-23**. LRU+TTL in-process cache,
  enabled by default (`cacheEnabled:true` in `ragBootstrap`). Tunable via
  `RAG_CACHE_TTL_MS` (default 900000 = 15min) + `RAG_CACHE_MAX_ENTRIES`
  (default 512). Auto-flushed on `ingestDocument` (new chunks may match
  previously-cached queries). `GET /api/rag/metrics` reports
  `health.cacheHits/cacheMisses/cacheHitRate/cacheSize`. Force-bypass per
  call via `opts.skipCache:true`. Counter `rag.retrieve.cache` labels
  `{provider, result: 'hit'|'miss'}`.

## Related architecture references

- `services/ai/rag.service.js` — ingest + retrieve + cite
- `services/ai/embeddingProvider.js` — provider abstraction + HTTP layer
- `intelligence/risk-metrics.registry.js` — shared counter registry (W297)
- `routes/rag.routes.js` — admin + metrics endpoint (W283h)
- `intelligence/parent-chatbot.service.js` — POLICY_QUERY intent + RAG call site
- `scripts/seed-rag-policies.js` — 7 starter Saudi policies

## On-call escalation

- **All RAG signals normal but POLICY_QUERY answers wrong**: the issue is in
  the corpus content, not retrieval. Forward to product/SLP to review the
  policy documents themselves (they may be outdated or unclear).
- **All RAG signals normal but chatbot returns UNKNOWN to obvious queries**:
  the intent classifier (rule-based or LLM, see W123) isn't routing to
  POLICY_QUERY. Check `__tests__/wave120-parent-chatbot.test.js` patterns
  and verify the keyword set in `parent-chatbot.registry.js`.
