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

| Type     | Pattern              | Example                        |
|----------|----------------------|--------------------------------|
| Feature  | `feature/<topic>`    | `feature/invoice-pdf-export`   |
| Bug fix  | `fix/<issue>`        | `fix/login-redirect`           |
| Chore    | `chore/<topic>`      | `chore/upgrade-mongoose`       |
| Release  | `release/<version>`  | `release/1.1.0`                |

## Code Quality

Before pushing, run the full quality gate:

```bash
cd backend
npm run quality:push          # mock-guard + phase-2 tests
npm run quality:ci            # mock-guard + full test suite
npm run lint                  # ESLint
npm run format:check          # Prettier
```

All 288 test suites / 8 930 tests **must** pass. The CI pipeline will reject pushes that drop below the threshold.

## Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
feat(finance): add invoice PDF export
fix(auth): prevent token refresh race condition
chore(deps): bump mongoose to 9.1.4
docs(readme): update deployment guide
```

## Pull Request Checklist

- [ ] Tests pass locally (`npm run quality:ci`)
- [ ] Lint passes (`npm run lint -- --max-warnings 0`)
- [ ] New routes have `authenticate` middleware
- [ ] New models use mass-assignment whitelist (`pickFields`)
- [ ] No `console.log` — use `logger.info/warn/error` instead
- [ ] Arabic UI strings are added to `src/locales/ar.json`

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
