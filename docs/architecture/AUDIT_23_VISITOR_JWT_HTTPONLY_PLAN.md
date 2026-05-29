# Audit #23 — Visitor JWT → httpOnly cookie (implementation plan)

**Finding (LOW):** the visitor OTP JWT is stored in `localStorage` (`visitor.jwt`)
in web-admin → XSS-exfiltratable. Move it to an httpOnly cookie the browser can't
read from JS.

## Current flow (verified 2026-05-30)

```
web-admin (origin A)                     66666 API (origin B = NEXT_PUBLIC_API_URL → alaweal.org)
visitor-login/page.tsx                   routes/visitor-auth.routes.js  (mounted /api/v1/public/visitor)
  POST /request-otp  ───────────────────►  request-otp   (OTP, in-memory, 5-min TTL)
  POST /verify-otp   ───────────────────►  verify-otp    → res.json({ ok, token, contact })   ← HS256 24h
  localStorage.setItem('visitor.jwt')                       (token returned in BODY)
my-submissions/page.tsx
  GET /my-submissions  (Authorization: Bearer <token>) ──►  my-submissions  (verify Bearer, GET-only, read-only)
```

Blast radius: **2 frontend files** (`visitor-login/page.tsx` sets, `my-submissions/page.tsx`
reads + clears on logout/401) + **1 backend route file** (`visitor-auth.routes.js`).
The only token-gated call is a **GET** → **CSRF risk is minimal** (no state-changing
visitor endpoint uses this token).

## The decision that gates a safe implementation

Is web-admin served from the **same site** as the API, or a **different** one?

- **Same-site** (e.g. both under `alaweal.org`, web-admin at `/admin`): use
  `SameSite=Lax; Secure; HttpOnly` — simplest, no CORS change, browser sends the
  cookie automatically. **Strongly preferred.**
- **Cross-site** (web-admin on a different domain, e.g. Vercel / `admin.*`): the
  cookie must be `SameSite=None; Secure; HttpOnly`, AND the API CORS must switch to
  `Access-Control-Allow-Credentials: true` with an **explicit** allow-origin (no `*`),
  AND every visitor `fetch` must use `credentials: 'include'`. This widens CORS
  posture and needs the **exact production web-admin origin**.

I will not guess this — picking wrong either breaks the visitor flow (cookie not sent)
or loosens CORS more than necessary.

## Planned changes (once the topology is confirmed)

**Backend `routes/visitor-auth.routes.js`:**
1. Ensure `cookie-parser` is applied (check `app.js`; add scoped if absent).
2. `verify-otp`: after signing, `res.cookie('visitor_jwt', token, { httpOnly:true,
   secure:true, sameSite:<lax|none>, maxAge: 24*3600*1000, path:'/api/v1/public/visitor' })`.
   Keep returning `{ ok, contact }` (drop `token` from the body once the frontend no
   longer needs it — or keep it one release for dual-read transition).
3. `my-submissions`: read the JWT from `req.cookies.visitor_jwt` **first**, fall back
   to the `Authorization: Bearer` header (transitional, so existing sessions don't break).
4. Add `POST /logout` → `res.clearCookie('visitor_jwt', { path: ... })`.

**Frontend:**
5. `visitor-login/page.tsx`: `fetch(verify-otp, { credentials:'include' })`; **remove**
   the `localStorage.setItem('visitor.jwt', …)`. Keep `visitor.contact` (non-secret) or
   move it server-side.
6. `my-submissions/page.tsx`: `fetch(my-submissions, { credentials:'include' })`; drop the
   `Authorization` header + the `localStorage.getItem('visitor.jwt')` read; logout calls
   the new `POST /logout` instead of `localStorage.removeItem`.

**Rollout:** ship backend (cookie-set + dual-read) first → then frontend (cookie-only).
Dual-read means in-flight localStorage sessions keep working through the transition.

## CSRF note

GET-only token surface → CSRF is not exploitable today (no state change). If a
state-changing visitor endpoint is added later, pair it with a CSRF token or rely on
`SameSite=Lax/Strict`. Documented so it isn't forgotten.

## Status

Plan only — **awaiting the same-site vs cross-site answer** (and, if cross-site, the
production web-admin origin) before implementing. Everything above is verified against
current source.
