# 🔄 CI/CD Pipeline و GitHub Actions

**التاريخ**: يناير 17, 2026  
**الأولوية**: 🟠 HIGH  
**الحالة**: شامل وجاهز

---

## 📋 GitHub Actions Workflow

### .github/workflows/test.yml - اختبارات تلقائية

```yaml
name: Automated Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      mysql:
        image: mysql:8.0
        env:
          MYSQL_DATABASE: alawael_test
          MYSQL_ROOT_PASSWORD: root
        options: >-
          --health-cmd="mysqladmin ping"
          --health-interval=10s
          --health-timeout=5s
          --health-retries=3
        ports:
          - 3306:3306

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run ESLint
        run: npm run lint

      - name: Run security audit
        run: npm audit --audit-level=moderate

      - name: Run tests
        run: npm test
        env:
          DB_HOST: localhost
          DB_PORT: 3306
          DB_USER: root
          DB_PASSWORD: root
          DB_NAME: alawael_test

      - name: Generate coverage report
        run: npm run test:coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
```

---

### .github/workflows/deploy-production.yml - النشر التلقائي

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
    tags: [v*]
  workflow_dispatch:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - run: npm ci
      - run: npm run lint
      - run: npm run build
      - run: npm test

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'

    steps:
      - uses: actions/checkout@v3

      - name: Deploy to server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SERVER_SSH_KEY }}
          script: |
            cd /var/www/alawael-erp
            git pull origin main
            npm ci --only=production
            npm run migrate
            pm2 restart alawael-erp
            pm2 logs alawael-erp --lines 100

      - name: Health check
        run: |
          curl -f https://alawael.com/api/health || exit 1

      - name: Slack notification
        uses: slackapi/slack-github-action@v1
        with:
          webhook-url: ${{ secrets.SLACK_WEBHOOK }}
          payload: |
            {
              "text": "✅ Deployment successful",
              "attachments": [
                {
                  "color": "good",
                  "fields": [
                    {
                      "title": "Environment",
                      "value": "Production",
                      "short": true
                    },
                    {
                      "title": "Status",
                      "value": "Deployed",
                      "short": true
                    }
                  ]
                }
              ]
            }
```

---

### .github/workflows/security-scan.yml - فحص الأمان

```yaml
name: Security Scanning

on:
  push:
    branches: [main, develop]
  schedule:
    - cron: '0 2 * * *' # يومياً في 2 صباحاً

jobs:
  security:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Run npm audit
        run: npm audit

      - name: SAST with SonarQube
        uses: SonarSource/sonarqube-scan-action@master
        env:
          SONAR_HOST_URL: ${{ secrets.SONAR_HOST_URL }}
          SONAR_LOGIN: ${{ secrets.SONAR_LOGIN }}

      - name: Check test coverage
        uses: codecov/codecov-action@v3

      - name: Trivy vulnerability scan
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scan-ref: '.'
```

---

## 📋 gitlab-ci.yml - GitLab CI/CD

```yaml
stages:
  - test
  - build
  - deploy

variables:
  DOCKER_IMAGE: $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA

test:
  stage: test
  image: node:18
  services:
    - mysql:8.0
  script:
    - npm ci
    - npm run lint
    - npm run test
    - npm run test:coverage
  coverage: '/Coverage: \d+\.\d+%/'
  artifacts:
    paths:
      - coverage/
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml

build:
  stage: build
  image: docker:latest
  services:
    - docker:dind
  script:
    - docker build -t $DOCKER_IMAGE .
    - docker push $DOCKER_IMAGE

deploy_production:
  stage: deploy
  image: alpine:latest
  script:
    - apk add --no-cache openssh-client
    - mkdir -p ~/.ssh
    - echo "$SSH_KEY" | base64 -d > ~/.ssh/id_ed25519
    - chmod 600 ~/.ssh/id_ed25519
    - ssh-keyscan -H $SERVER_HOST >> ~/.ssh/known_hosts
    - ssh -i ~/.ssh/id_ed25519 deploy@$SERVER_HOST "cd /var/www/alawael-erp && git pull && npm ci && npm run migrate && pm2 restart alawael-erp"
  only:
    - main
  environment:
    name: production
    url: https://alawael.com
```

---

## ✅ قائمة فحص CI/CD

```
GitHub Actions:
☐ Workflow files منظمة في .github/workflows/
☐ Test workflow يعمل تلقائياً على PRs
☐ Build workflow يعمل على main branch
☐ Security scan يعمل دورياً
☐ Deploy workflow مؤمن بـ secrets
☐ Health checks بعد النشر

متغيرات البيئة:
☐ جميع secrets محفوظة في GitHub
☐ SSH keys آمنة
☐ Database credentials محمية
☐ API keys لا تظهر في logs

الإخطارات:
☐ Slack notifications للنشر
☐ Email notifications للفشل
☐ GitHub notifications مفعلة

التدقيق (Monitoring):
☐ Build status مرئي
☐ Test coverage tracked
☐ Security issues reported
☐ Deploy history محفوظة
```

---

**الحالة**: ✅ جاهز للاستخدام  
**آخر تحديث**: يناير 17, 2026
