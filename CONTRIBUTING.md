# Contributing to Al-Awael ERP

شكراً لاهتمامك بالمساهمة في نظام الأوائل!
Thank you for your interest in contributing to Al-Awael ERP!

---

## Quick Start

```bash
# 1. Clone & install
git clone https://github.com/almashooq1/alawael-erp.git
cd alawael-erp
npm run install:all          # installs backend + frontend deps

# 2. Start backend (uses in-memory MongoDB by default)
cd backend && npm run dev

# 3. Start frontend
cd ../frontend && npm start
```

## Branch Naming

| Type    | Pattern             | Example                      |
| ------- | ------------------- | ---------------------------- |
| Feature | `feature/<topic>`   | `feature/invoice-pdf-export` |
| Bug fix | `fix/<issue>`       | `fix/login-redirect`         |
| Chore   | `chore/<topic>`     | `chore/upgrade-mongoose`     |
| Release | `release/<version>` | `release/1.1.0`              |

## Code Quality

Before pushing, run the sprint gate (the same suite CI enforces):

```bash
npm run test:drift            # ~15s — static drift checks only (auth
                              # wiring, count consistency, link existence,
                              # etc.). Catches ~half of sprint-gate
                              # regressions at 1/12th the runtime.
npm run test:sprint           # ~3 min — full 1282 tests across 71 suites,
                              # blocks the PR if anything fails
npm run lint                  # ESLint (warnings tolerated, errors not)
npm run format:check          # Prettier
```

If you're touching ops / gov-integration / rate-limit / circuit-breaker
code, also run:

```bash
npm run ship-check            # ~2 min — preflight + ops-subsystems
```

The sprint gate is the **hard gate** — `.github/workflows/sprint-tests.yml`
runs the same 1282 tests on every push and PR; any drop fails the merge.
Run it locally before pushing to avoid the "fails in CI, passes on my
machine" cycle.

The wider repo has thousands of additional tests (most as `npm test`)
but they're not CI-gated because the codebase has known stale-import-path
suites that fail without indicating real regressions. Don't panic if the
broader suite count looks off — focus on the sprint gate.

## Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
feat(finance): add invoice PDF export
fix(auth): prevent token refresh race condition
chore(deps): bump mongoose to 9.1.4
docs(readme): update deployment guide
```

## Pull Request Checklist

- [ ] Sprint gate passes locally (`npm run test:sprint`)
- [ ] Lint passes (`npm run lint`) — 0 errors required, warnings tolerated
- [ ] New admin routes wire `authenticateToken` AND `requireRole` (the
      `admin-routes-auth-wiring` drift test catches both, but check first)
- [ ] New PII-touching writes go through the model's mass-assignment
      whitelist (`pickFields`) — never spread `req.body` directly
- [ ] No `console.log` — use `logger.info/warn/error` instead
- [ ] Arabic UI strings live in the component or `src/locales/ar.json`,
      never English-only labels for user-visible text
- [ ] If you add a new sprint test, bump the count in **all 6 surfaces**:
      sprint-tests.yml summary, CHANGELOG entry, SPRINT doc, DELIVERY
      scorecard + local-run line, README badge. The
      `doc-test-count-consistency` test will catch the ones you miss.

## Reporting Bugs

Open an issue and include:

1. Steps to reproduce
2. Expected vs actual behaviour
3. Browser / Node version
4. Relevant logs or screenshots

## Security Issues

**Do NOT open a public issue for security vulnerabilities.**
Email `security@alawael-erp.com` — see `/.well-known/security.txt`.

---

## License

By contributing you agree that your contributions will be licensed under the [MIT License](LICENSE).
