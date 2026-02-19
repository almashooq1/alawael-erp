/**
 * 🔄 CI/CD Pipeline Configuration
 *
 * Automated testing, building, and deployment
 * - GitHub Actions workflows
 * - Build optimization
 * - Automated testing
 * - Continuous deployment
 */

const cicdConfig = {
  // GitHub Actions - Test Workflow
  testWorkflow: `
name: Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      mongodb:
        image: mongo:6.0-alpine
        env:
          MONGO_INITDB_ROOT_USERNAME: admin
          MONGO_INITDB_ROOT_PASSWORD: password
        options: >-
          --health-cmd mongosh
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 27017:27017
      
      redis:
        image: redis:7-alpine
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379

    steps:
    - uses: actions/checkout@v3
    
    - name: Use Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run linter
      run: npm run lint
    
    - name: Run tests
      run: npm test
      env:
        MONGO_URI: mongodb://admin:password@localhost:27017/test
        REDIS_URL: redis://localhost:6379
    
    - name: Upload coverage
      uses: codecov/codecov-action@v3
      with:
        files: ./coverage/lcov.info
  `,

  // GitHub Actions - Build and Push Workflow
  buildWorkflow: `
name: Build and Push

on:
  push:
    branches: [ main ]
    tags: [ 'v*' ]

jobs:
  build:
    runs-on: ubuntu-latest
    
    permissions:
      contents: read
      packages: write
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v2
    
    - name: Login to Docker Hub
      uses: docker/login-action@v2
      with:
        username: \${{ secrets.DOCKER_USERNAME }}
        password: \${{ secrets.DOCKER_PASSWORD }}
    
    - name: Extract metadata
      id: meta
      uses: docker/metadata-action@v4
      with:
        images: your-registry/alawael
        tags: |
          type=ref,event=branch
          type=semver,pattern={{version}}
          type=semver,pattern={{major}}.{{minor}}
          type=sha
    
    - name: Build and push Docker image
      uses: docker/build-push-action@v4
      with:
        context: .
        push: true
        tags: \${{ steps.meta.outputs.tags }}
        labels: \${{ steps.meta.outputs.labels }}
        cache-from: type=registry,ref=your-registry/alawael:buildcache
        cache-to: type=registry,ref=your-registry/alawael:buildcache,mode=max
  `,

  // GitHub Actions - Deploy Workflow
  deployWorkflow: `
name: Deploy

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    needs: build
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Configure kubectl
      run: |
        mkdir -p \$HOME/.kube
        echo "\${{ secrets.KUBE_CONFIG }}" | base64 -d > \$HOME/.kube/config
        chmod 600 \$HOME/.kube/config
    
    - name: Deploy to Kubernetes
      run: |
        kubectl apply -f k8s/
        kubectl rollout status deployment/alawael-app -n alawael --timeout=5m
    
    - name: Verify deployment
      run: |
        kubectl get all -n alawael
        kubectl logs -l app=alawael -n alawael --tail=100
    
    - name: Slack notification
      if: always()
      uses: 8398a7/action-slack@v3
      with:
        status: \${{ job.status }}
        text: 'Deployment \${{ job.status }}'
        webhook_url: \${{ secrets.SLACK_WEBHOOK }}
  `,

  // GitLab CI
  gitlabCI: `
stages:
  - test
  - build
  - deploy

variables:
  DOCKER_IMAGE: \$CI_REGISTRY_IMAGE

test:
  stage: test
  image: node:18-alpine
  services:
    - mongodb:6.0-alpine
    - redis:7-alpine
  script:
    - npm ci
    - npm run lint
    - npm test
  coverage: '/Lines\\s*:\\s*(\\d+\\.\\d+)%/'
  artifacts:
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
    - docker login -u \$CI_REGISTRY_USER -p \$CI_REGISTRY_PASSWORD \$CI_REGISTRY
    - docker build -t \$DOCKER_IMAGE:\$CI_COMMIT_SHA -t \$DOCKER_IMAGE:latest .
    - docker push \$DOCKER_IMAGE:\$CI_COMMIT_SHA
    - docker push \$DOCKER_IMAGE:latest

deploy:
  stage: deploy
  image: bitnami/kubectl:latest
  script:
    - kubectl config use-context \$KUBE_CONTEXT
    - kubectl set image deployment/alawael-app alawael=\$DOCKER_IMAGE:\$CI_COMMIT_SHA -n alawael
    - kubectl rollout status deployment/alawael-app -n alawael
  only:
    - main
  `,
};

/**
 * CI/CD Pipeline Manager
 */
class CIPipelineManager {
  /**
   * Get test workflow
   */
  static getTestWorkflow() {
    return cicdConfig.testWorkflow;
  }

  /**
   * Get build workflow
   */
  static getBuildWorkflow() {
    return cicdConfig.buildWorkflow;
  }

  /**
   * Get deploy workflow
   */
  static getDeployWorkflow() {
    return cicdConfig.deployWorkflow;
  }

  /**
   * Get GitLab CI configuration
   */
  static getGitlabCI() {
    return cicdConfig.gitlabCI;
  }

  /**
   * Get CI/CD best practices
   */
  static getBestPractices() {
    return [
      '1. Run tests on every push to ensure code quality',
      '2. Use matrix builds for testing multiple Node versions',
      '3. Cache dependencies to speed up builds',
      '4. Implement automated code coverage reporting',
      '5. Build Docker images only on successful tests',
      '6. Use semantic versioning for tags',
      '7. Implement automated deployment to staging',
      '8. Require manual approval for production deployments',
      '9. Use environment-specific secrets securely',
      '10. Implement automatic rollback on failed deployment',
      '11. Use build cache for faster Docker builds',
      '12. Generate release notes automatically',
    ];
  }

  /**
   * Get GitHub Actions setup instructions
   */
  static getGitHubActionsSetup() {
    return {
      secretsToAdd: [
        'DOCKER_USERNAME - Docker registry username',
        'DOCKER_PASSWORD - Docker registry password',
        'KUBE_CONFIG - Base64 encoded kubeconfig',
        'SLACK_WEBHOOK - Slack webhook for notifications',
      ],
      fileLocations: [
        '.github/workflows/test.yml',
        '.github/workflows/build-push.yml',
        '.github/workflows/deploy.yml',
      ],
      triggers: [
        'Push to main/develop branches',
        'Pull requests',
        'Manual dispatch',
        'Scheduled (for periodic checks)',
      ],
    };
  }

  /**
   * Get GitLab CI setup instructions
   */
  static getGitlabCISetup() {
    return {
      secretsToAdd: ['KUBE_CONTEXT - Kubernetes context', 'DOCKER_REGISTRY - Docker registry URL'],
      fileLocations: ['.gitlab-ci.yml - Root directory'],
      runners: ['Docker runner (for builds)', 'Kubernetes runner (for deployments)'],
    };
  }

  /**
   * Get deployment strategies
   */
  static getDeploymentStrategies() {
    return {
      rollingUpdate: {
        description: 'Gradually replace old pods with new ones',
        pros: ['Zero downtime', 'Easy rollback'],
        cons: ['Longer deployment time'],
      },
      canary: {
        description: 'Deploy to small percentage of users first',
        pros: ['Low risk', 'Easy validation'],
        cons: ['More complex setup'],
      },
      blueGreen: {
        description: 'Run two identical environments, switch traffic',
        pros: ['Instant rollback', 'Safe testing'],
        cons: ['Double infrastructure cost'],
      },
      recreate: {
        description: 'Stop old and start new pods',
        pros: ['Simple', 'No resource concerns'],
        cons: ['Downtime during deployment'],
      },
    };
  }
}

module.exports = { CIPipelineManager, cicdConfig };
