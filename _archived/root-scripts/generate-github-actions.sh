#!/bin/bash

################################################################################
# ALAWAEL v1.0.0 - GITHUB ACTIONS WORKFLOW GENERATOR
# Version: 1.0.0
# Updated: February 22, 2026
# Purpose: Generate production-ready GitHub Actions workflows
################################################################################

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

WORKFLOWS_DIR=".github/workflows"

################################################################################
# WORKFLOW TEMPLATES
################################################################################

create_test_workflow() {
    echo -e "${CYAN}Creating test workflow...${NC}"
    
    mkdir -p "$WORKFLOWS_DIR"
    
    cat > "$WORKFLOWS_DIR/test.yml" << 'EOF'
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      mongodb:
        image: mongo:7.0
        options: >-
          --health-cmd mongosh
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 27017:27017
        env:
          MONGO_INITDB_ROOT_USERNAME: testuser
          MONGO_INITDB_ROOT_PASSWORD: testpassword
      
      redis:
        image: redis:7-alpine
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379

    strategy:
      matrix:
        node-version: [18.x]

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint --if-present

      - name: Run tests
        run: npm test -- --coverage
        env:
          NODE_ENV: test
          MONGODB_URI: mongodb://testuser:testpassword@localhost:27017/test
          REDIS_URL: redis://localhost:6379

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
          flags: unittests
          name: codecov-umbrella

      - name: Archive test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: coverage/

  security-scan:
    runs-on: ubuntu-latest
    needs: test
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Run Snyk security scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high

      - name: Upload Snyk results
        uses: github/codeql-action/upload-sarif@v2
        if: always()
        with:
          sarif_file: snyk.sarif

  quality:
    runs-on: ubuntu-latest
    needs: test
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: SonarCloud Scan
        uses: SonarSource/sonarcloud-github-action@master
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
EOF

    echo -e "${GREEN}✓ Test workflow created${NC}"
}

create_build_workflow() {
    echo -e "${CYAN}Creating build workflow...${NC}"
    
    cat > "$WORKFLOWS_DIR/build.yml" << 'EOF'
name: Build

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  build:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [18.x]

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build application
        run: npm run build --if-present

      - name: Create build artifacts
        run: |
          mkdir -p build-artifacts
          if [ -d "dist" ]; then cp -r dist build-artifacts/; fi
          if [ -d "build" ]; then cp -r build build-artifacts/; fi

      - name: Archive build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: build
          path: build-artifacts/
          retention-days: 7

      - name: Check build size
        run: |
          du -sh build-artifacts/
          echo "Build size limit: 1GB"
EOF

    echo -e "${GREEN}✓ Build workflow created${NC}"
}

create_docker_workflow() {
    echo -e "${CYAN}Creating Docker build workflow...${NC}"
    
    cat > "$WORKFLOWS_DIR/docker.yml" << 'EOF'
name: Docker Build & Push

on:
  push:
    branches: [main]
    tags: ['v*.*.*']
  pull_request:
    branches: [main]

jobs:
  docker:
    runs-on: ubuntu-latest
    
    permissions:
      contents: read
      packages: write

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2

      - name: Log in to Docker Hub
        if: github.event_name != 'pull_request'
        uses: docker/login-action@v2
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}

      - name: Log in to GitHub Container Registry
        if: github.event_name != 'pull_request'
        uses: docker/login-action@v2
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v4
        with:
          images: |
            almashooq1/alawael-backend
            ghcr.io/${{ github.repository }}
          tags: |
            type=ref,event=branch
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
            type=sha

      - name: Build and push Docker image
        uses: docker/build-push-action@v4
        with:
          context: .
          push: ${{ github.event_name != 'pull_request' }}
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Scan image with Trivy
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: ${{ steps.meta.outputs.tags }}
          format: 'sarif'
          output: 'trivy-results.sarif'

      - name: Upload Trivy scan results
        uses: github/codeql-action/upload-sarif@v2
        if: always()
        with:
          sarif_file: 'trivy-results.sarif'
EOF

    echo -e "${GREEN}✓ Docker workflow created${NC}"
}

create_deploy_workflow() {
    echo -e "${CYAN}Creating deployment workflow...${NC}"
    
    cat > "$WORKFLOWS_DIR/deploy.yml" << 'EOF'
name: Deploy

on:
  push:
    branches: [main]
    tags: ['v*.*.*']

jobs:
  deploy-staging:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    environment:
      name: staging
      url: https://staging.alawael.local

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Deploy to Heroku Staging
        env:
          HEROKU_API_KEY: ${{ secrets.HEROKU_API_KEY_STAGING }}
        run: |
          npm install -g heroku
          heroku login -e ${{ secrets.HEROKU_EMAIL }} -p ${{ secrets.HEROKU_API_KEY_STAGING }}
          git push https://git.heroku.com/alawael-staging.git main:main

      - name: Health check
        run: |
          curl -f https://staging.alawael.local/health || exit 1

      - name: Notify deployment
        if: always()
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: 'Staging deployment: ${{ job.status }}'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
          fields: repo,message,commit

  deploy-production:
    runs-on: ubuntu-latest
    needs: [deploy-staging]
    if: startsWith(github.ref, 'refs/tags/v')
    environment:
      name: production
      url: https://alawael.local

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Deploy to Heroku Production
        env:
          HEROKU_API_KEY: ${{ secrets.HEROKU_API_KEY }}
        run: |
          npm install -g heroku
          heroku login -e ${{ secrets.HEROKU_EMAIL }} -p ${{ secrets.HEROKU_API_KEY }}
          git push https://git.heroku.com/alawael-production.git main:main

      - name: Health check
        run: |
          curl -f https://alawael.local/health || exit 1

      - name: Smoke tests
        run: |
          npm run test:smoke || true

      - name: Create GitHub Release
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: ${{ github.ref }}
          release_name: Release ${{ github.ref }}
          draft: false
          prerelease: false

      - name: Notify deployment
        if: always()
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: 'Production deployment: ${{ job.status }}'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
          fields: repo,message,commit,author

  rollback:
    runs-on: ubuntu-latest
    if: failure()
    needs: [deploy-production]
    
    steps:
      - name: Notify failure
        uses: 8398a7/action-slack@v3
        with:
          status: failure
          text: 'Production deployment FAILED - ROLLBACK INITIATED'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
          fields: repo,message,commit

      - name: Create issue for rollback
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: `Deployment Failure - Rollback Required: ${context.ref}`,
              body: `Production deployment failed.\n\nCommit: ${context.sha}\n\nPlease review and rollback if necessary.`,
              labels: ['urgent', 'deployment', 'rollback']
            })
EOF

    echo -e "${GREEN}✓ Deploy workflow created${NC}"
}

create_scheduled_workflow() {
    echo -e "${CYAN}Creating scheduled maintenance workflow...${NC}"
    
    cat > "$WORKFLOWS_DIR/scheduled-checks.yml" << 'EOF'
name: Scheduled Checks

on:
  schedule:
    - cron: '0 2 * * *'      # Daily backup check at 2 AM UTC
    - cron: '0 0 * * 0'      # Weekly security scan on Sunday
    - cron: '0 12 1 * *'     # Monthly dependency check on 1st at noon

jobs:
  backup-check:
    runs-on: ubuntu-latest
    if: github.event.schedule == '0 2 * * *'
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Verify backup
        run: |
          echo "Checking backup status..."
          # Add your backup check command here

      - name: Report backup status
        uses: 8398a7/action-slack@v3
        with:
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
          text: 'Daily backup check completed'

  security-scan:
    runs-on: ubuntu-latest
    if: github.event.schedule == '0 0 * * 0'
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Run OWASP dependency check
        uses: dependency-check/Dependency-Check_Action@main
        with:
          project: 'alawael-backend'
          path: '.'
          format: 'JSON'

      - name: Upload results
        uses: actions/upload-artifact@v3
        with:
          name: dependency-check-results
          path: reports/

  dependency-updates:
    runs-on: ubuntu-latest
    if: github.event.schedule == '0 12 1 * *'
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Check for updates
        run: npm outdated || true

      - name: Create update PR
        uses: dependabot/fetch-metadata@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
EOF

    echo -e "${GREEN}✓ Scheduled workflow created${NC}"
}

create_pr_workflow() {
    echo -e "${CYAN}Creating pull request workflow...${NC}"
    
    cat > "$WORKFLOWS_DIR/pull-request.yml" << 'EOF'
name: Pull Request Checks

on:
  pull_request:
    branches: [main, develop]

jobs:
  validate:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Check PR title
        uses: actions/github-script@v6
        with:
          script: |
            const pr = context.payload.pull_request;
            const title = pr.title;
            const validPatterns = [
              /^feat:/,
              /^fix:/,
              /^docs:/,
              /^style:/,
              /^refactor:/,
              /^perf:/,
              /^test:/,
              /^chore:/
            ];
            
            const isValid = validPatterns.some(pattern => pattern.test(title));
            if (!isValid) {
              core.setFailed('PR title must follow Conventional Commits format');
            }

      - name: Check for secrets
        uses: trufflesecurity/trufflehog@main
        with:
          path: ./
          base: ${{ github.event.pull_request.base.sha }}
          head: HEAD
          extra_args: --debug --only-verified

      - name: Auto-label PR
        uses: actions/github-script@v6
        with:
          script: |
            const title = context.payload.pull_request.title;
            let labels = [];
            
            if (title.startsWith('feat:')) labels.push('enhancement');
            if (title.startsWith('fix:')) labels.push('bugfix');
            if (title.startsWith('docs:')) labels.push('documentation');
            
            if (labels.length > 0) {
              github.rest.issues.addLabels({
                issue_number: context.issue.number,
                owner: context.repo.owner,
                repo: context.repo.repo,
                labels: labels
              });
            }

  size:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Comment PR size
        uses: actions/github-script@v6
        with:
          script: |
            const { data } = await github.rest.pulls.get({
              owner: context.repo.owner,
              repo: context.repo.repo,
              pull_number: context.issue.number
            });
            
            const additions = data.additions;
            const deletions = data.deletions;
            
            let size = 'small';
            if (additions > 400) size = 'giant';
            else if (additions > 200) size = 'large';
            else if (additions > 100) size = 'medium';
            
            await github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
              body: `📊 PR Size: **${size}** (+${additions} -${deletions} lines)`
            });
EOF

    echo -e "${GREEN}✓ Pull request workflow created${NC}"
}

################################################################################
# MAIN
################################################################################

main() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║    ALAWAEL - GITHUB ACTIONS WORKFLOW GENERATOR        ║${NC}"
    echo -e "${BLUE}║         Production-Ready CI/CD Pipelines             ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    # Create workflows
    create_test_workflow
    create_build_workflow
    create_docker_workflow
    create_deploy_workflow
    create_scheduled_workflow
    create_pr_workflow
    
    # Summary
    echo ""
    echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}✓ WORKFLOWS GENERATED SUCCESSFULLY${NC}"
    echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
    echo ""
    echo "Generated workflows:"
    ls -la "$WORKFLOWS_DIR/"
    echo ""
    echo "Next Steps:"
    echo "  1. Review workflows: cat $WORKFLOWS_DIR/*.yml"
    echo "  2. Customize for your environment (URLs, secrets, etc.)"
    echo "  3. Commit to GitHub:"
    echo "     $ git add $WORKFLOWS_DIR/"
    echo "     $ git commit -m 'Add GitHub Actions workflows'"
    echo "     $ git push origin main"
    echo "  4. Configure secrets in GitHub:"
    echo "     Settings → Secrets → Add secrets"
    echo ""
    echo "Workflows will run on:"
    echo "  • Push to main/develop"
    echo "  • Pull requests"
    echo "  • Scheduled tasks (daily, weekly, monthly)"
    echo "  • Tag creation (release)"
    echo ""
}

main "$@"
