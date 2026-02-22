#!/bin/bash

################################################################################
# ALAWAEL v1.0.0 - ADVANCED DEPLOYMENT CONFIGURATIONS
# Version: 1.0.0
# Updated: February 22, 2026
# Purpose: Production deployment profiles for ALL platforms
################################################################################

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

DEPLOY_CONFIG_DIR="deployment-configs"

################################################################################
# CREATE DEPLOYMENT CONFIGURATIONS
################################################################################

create_heroku_config() {
    echo -e "${CYAN}Creating Heroku deployment configuration...${NC}"
    
    mkdir -p "$DEPLOY_CONFIG_DIR/heroku"
    
    cat > "$DEPLOY_CONFIG_DIR/heroku/Procfile" << 'EOF'
web: npm start
worker: npm run worker
release: npm run migrate
EOF
    
    cat > "$DEPLOY_CONFIG_DIR/heroku/app.json" << 'EOF'
{
  "name": "ALAWAEL ERP System",
  "description": "Complete ERP solution for supply chain management",
  "repository": "https://github.com/almashooq1/alawael-backend",
  "keywords": [
    "erp",
    "nodejs",
    "mongodb",
    "express",
    "supply-chain"
  ],
  "buildpacks": [
    {
      "url": "heroku/nodejs"
    }
  ],
  "env": {
    "NODE_ENV": {
      "description": "Environment",
      "value": "production"
    },
    "JWT_SECRET": {
      "description": "JWT Secret Key",
      "required": true,
      "generator": "secret"
    },
    "MONGODB_URI": {
      "description": "MongoDB Connection String",
      "required": true
    },
    "SENTRY_DSN": {
      "description": "Sentry Error Tracking DSN"
    },
    "REDIS_URL": {
      "description": "Redis Connection URL"
    }
  },
  "formation": {
    "web": {
      "quantity": 1,
      "size": "standard-1x"
    }
  },
  "addons": [
    {
      "plan": "mongolab:sandbox"
    }
  ]
}
EOF
    
    cat > "$DEPLOY_CONFIG_DIR/heroku/Dockerfile" << 'EOF'
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application
COPY . .

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start application
CMD ["npm", "start"]
EOF

    echo -e "${GREEN}✓ Heroku configuration created${NC}"
}

create_aws_config() {
    echo -e "${CYAN}Creating AWS deployment configuration...${NC}"
    
    mkdir -p "$DEPLOY_CONFIG_DIR/aws"
    
    # Elastic Beanstalk config
    cat > "$DEPLOY_CONFIG_DIR/aws/.ebextensions/nodejs.config" << 'EOF'
option_settings:
  aws:autoscaling:launchconfiguration:
    IamInstanceProfile: ElasticBeanstalkEC2Role
  aws:elasticbeanstalk:application:environment:
    NODE_ENV: production
    NODE_MODULES_CACHE: true
  aws:elasticbeanstalk:healthreporting:system:
    SystemType: enhanced
    EnhancedHealthAuthEnabled: true
  aws:elasticbeanstalk:cloudwatch:logs:
    StreamLogs: true
    DeleteOnTerminate: false
    RetentionInDays: 7

commands:
  01_npm_install:
    command: npm install --production

container_commands:
  01_migrate:
    command: npm run migrate
    leader_only: true
EOF
    
    # Elastic Beanstalk deploy config
    cat > "$DEPLOY_CONFIG_DIR/aws/.ebignore" << 'EOF'
# Using .gitignore by default
.git
.gitignore
.ebignore

# Node modules
node_modules
.npm

# Testing
__tests__
*.test.js
coverage

# Development
.env.development
.env.local
.DS_Store

# IDE
.vscode
.idea
*.swp
EOF
    
    # CloudFormation template
    cat > "$DEPLOY_CONFIG_DIR/aws/cloudformation.yaml" << 'EOF'
AWSTemplateFormatVersion: '2010-09-09'
Description: 'ALAWAEL Backend Infrastructure'

Parameters:
  EnvironmentName:
    Type: String
    Default: staging
    AllowedValues:
      - development
      - staging
      - production

  InstanceType:
    Type: String
    Default: t3.small
    AllowedValues:
      - t3.nano
      - t3.micro
      - t3.small
      - t3.medium

Resources:
  # Application Load Balancer
  ALBSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: ALB Security Group
      VpcId: !GetAtt VPC.VpcId
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort: 80
          ToPort: 80
          CidrIp: 0.0.0.0/0
        - IpProtocol: tcp
          FromPort: 443
          ToPort: 443
          CidrIp: 0.0.0.0/0

  # Launch Template
  EC2InstanceRole:
    Type: AWS::IAM::Role
    Properties:
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              Service: ec2.amazonaws.com
            Action: sts:AssumeRole
      ManagedPolicyArns:
        - arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore
        - arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy

  # Auto Scaling Group
  AutoScalingGroup:
    Type: AWS::AutoScaling::AutoScalingGroup
    Properties:
      MinSize: '1'
      MaxSize: '5'
      DesiredCapacity: '2'
      LaunchConfigurationName: !Ref LaunchConfiguration
      VPCZoneIdentifier:
        - subnet-xxx
        - subnet-yyy

Outputs:
  LoadBalancerDNS:
    Value: !GetAtt ApplicationLoadBalancer.DNSName
    Export:
      Name: !Sub '${EnvironmentName}-alb-dns'

  AutoScalingGroupName:
    Value: !Ref AutoScalingGroup
    Export:
      Name: !Sub '${EnvironmentName}-asg-name'
EOF

    echo -e "${GREEN}✓ AWS configuration created${NC}"
}

create_azure_config() {
    echo -e "${CYAN}Creating Azure deployment configuration...${NC}"
    
    mkdir -p "$DEPLOY_CONFIG_DIR/azure"
    
    # Azure App Service deployment
    cat > "$DEPLOY_CONFIG_DIR/azure/azure-pipelines.yml" << 'EOF'
trigger:
  - main
  - develop

pool:
  vmImage: 'ubuntu-latest'

variables:
  buildConfiguration: 'Release'
  nodeVersion: '18.x'

stages:
  - stage: Build
    displayName: Build and Test
    jobs:
      - job: Build
        displayName: Build
        steps:
          - task: NodeTool@0
            inputs:
              versionSpec: $(nodeVersion)
            displayName: 'Install Node.js'

          - script: npm ci
            displayName: 'Install dependencies'

          - script: npm run test
            displayName: 'Run tests'

          - script: npm run build
            displayName: 'Build'

          - task: PublishCodeCoverageResults@1
            inputs:
              codeCoverageTool: Cobertura
              summaryFileLocation: '$(System.DefaultWorkingDirectory)/coverage/cobertura-coverage.xml'

  - stage: Deploy
    displayName: Deploy to App Service
    dependsOn: Build
    condition: succeeded()
    jobs:
      - deployment: Deploy
        displayName: Deploy to Azure
        environment: 'production'
        strategy:
          runOnce:
            deploy:
              steps:
                - task: AzureWebApp@1
                  inputs:
                    azureSubscription: 'Azure Subscription'
                    appType: 'webAppLinux'
                    appName: 'alawael-backend'
                    runtimeStack: 'NODE|18LTS'
                    package: '$(Pipeline.Workspace)'
                    startupCommand: 'npm start'
EOF
    
    # Azure Resource Manager template
    cat > "$DEPLOY_CONFIG_DIR/azure/template.json" << 'EOF'
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "appServicePlanName": {
      "type": "string",
      "defaultValue": "alawael-plan"
    },
    "webAppName": {
      "type": "string",
      "defaultValue": "alawael-backend"
    }
  },
  "resources": [
    {
      "type": "Microsoft.Web/serverfarms",
      "apiVersion": "2021-02-01",
      "name": "[parameters('appServicePlanName')]",
      "location": "[resourceGroup().location]",
      "sku": {
        "name": "B2",
        "capacity": 2
      },
      "kind": "linux",
      "properties": {
        "reserved": true
      }
    },
    {
      "type": "Microsoft.Web/sites",
      "apiVersion": "2021-02-01",
      "name": "[parameters('webAppName')]",
      "location": "[resourceGroup().location]",
      "kind": "app,linux,container",
      "dependsOn": [
        "[resourceId('Microsoft.Web/serverfarms', parameters('appServicePlanName'))]"
      ],
      "properties": {
        "serverFarmId": "[resourceId('Microsoft.Web/serverfarms', parameters('appServicePlanName'))]",
        "siteConfig": {
          "linuxFxVersion": "NODE|18-lts",
          "appSettings": []
        }
      }
    }
  ],
  "outputs": {
    "webAppUrl": {
      "type": "string",
      "value": "[concat('https://', reference(resourceId('Microsoft.Web/sites', parameters('webAppName'))).defaultHostName)]"
    }
  }
}
EOF

    echo -e "${GREEN}✓ Azure configuration created${NC}"
}

create_gcp_config() {
    echo -e "${CYAN}Creating GCP deployment configuration...${NC}"
    
    mkdir -p "$DEPLOY_CONFIG_DIR/gcp"
    
    # Cloud Run configuration
    cat > "$DEPLOY_CONFIG_DIR/gcp/app.yaml" << 'EOF'
runtime: nodejs18

env: flex

env_variables:
  NODE_ENV: "production"
  CLOUD_RUN: "true"

automatic_scaling:
  min_instances: 1
  max_instances: 10
  cool_down_period_sec: 180
  cpu_utilization:
    target_utilization: 0.7

health_checks:
  enable_health_checks: True

network:
  enable_traffic_split: true

vpc_connector_egress_settings: "vpc-connector"

app_engine_apis: true
EOF
    
    # Cloud Build configuration
    cat > "$DEPLOY_CONFIG_DIR/gcp/cloudbuild.yaml" << 'EOF'
steps:
  # Run tests
  - name: 'node:18'
    entrypoint: npm
    args: ['test']

  # Build Docker image
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '-t'
      - 'gcr.io/$PROJECT_ID/alawael-backend:$COMMIT_SHA'
      - '-t'
      - 'gcr.io/$PROJECT_ID/alawael-backend:latest'
      - '.'

  # Push to Cloud Registry
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'push'
      - 'gcr.io/$PROJECT_ID/alawael-backend:$COMMIT_SHA'

  # Deploy to Cloud Run
  - name: 'gcr.io/cloud-builders/gke-deploy'
    args:
      - run
      - --filename=k8s/
      - --image=gcr.io/$PROJECT_ID/alawael-backend:$COMMIT_SHA
      - --location=us-central1
      - --cluster=alawael-prod

  # Health check
  - name: 'gcr.io/cloud-builders/gcloud'
    args:
      - 'beta'
      - 'run'
      - 'deploy'
      - 'alawael-backend'
      - '--image=gcr.io/$PROJECT_ID/alawael-backend:$COMMIT_SHA'
      - '--region=us-central1'
      - '--platform=managed'

images:
  - 'gcr.io/$PROJECT_ID/alawael-backend:$COMMIT_SHA'
  - 'gcr.io/$PROJECT_ID/alawael-backend:latest'

timeout: '1800s'
EOF

    # Kubernetes configuration
    cat > "$DEPLOY_CONFIG_DIR/gcp/k8s-deployment.yaml" << 'EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: alawael-backend
  labels:
    app: alawael-backend
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 1
  selector:
    matchLabels:
      app: alawael-backend
  template:
    metadata:
      labels:
        app: alawael-backend
    spec:
      containers:
        - name: alawael-backend
          image: gcr.io/PROJECT_ID/alawael-backend:latest
          ports:
            - containerPort: 3000
          env:
            - name: NODE_ENV
              value: "production"
            - name: MONGODB_URI
              valueFrom:
                secretKeyRef:
                  name: alawael-secrets
                  key: mongodb-uri
          resources:
            requests:
              memory: "256Mi"
              cpu: "250m"
            limits:
              memory: "512Mi"
              cpu: "500m"
          livenessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /ready
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 5

---
apiVersion: v1
kind: Service
metadata:
  name: alawael-backend-service
spec:
  type: LoadBalancer
  ports:
    - port: 80
      targetPort: 3000
      protocol: TCP
  selector:
    app: alawael-backend

---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: alawael-backend-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: alawael-backend
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
EOF

    echo -e "${GREEN}✓ GCP configuration created${NC}"
}

create_docker_config() {
    echo -e "${CYAN}Creating Docker deployment configuration...${NC}"
    
    mkdir -p "$DEPLOY_CONFIG_DIR/docker"
    
    cat > "$DEPLOY_CONFIG_DIR/docker/docker-compose.prod.yml" << 'EOF'
version: '3.9'

services:
  backend:
    build:
      context: ./alawael-backend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      MONGODB_URI: mongodb://mongo:27017/alawael
      REDIS_URL: redis://redis:6379
    depends_on:
      - mongo
      - redis
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - alawael-network

  frontend:
    build:
      context: ./alawael-erp
      dockerfile: Dockerfile
    ports:
      - "3001:3001"
    environment:
      NODE_ENV: production
      REACT_APP_API_URL: http://backend:3000/api
    depends_on:
      - backend
    restart: unless-stopped
    networks:
      - alawael-network

  mongo:
    image: mongo:7.0
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: alawael
      MONGO_INITDB_ROOT_PASSWORD: secure_password
      MONGO_INITDB_DATABASE: alawael
    volumes:
      - mongo-data:/data/db
    restart: unless-stopped
    networks:
      - alawael-network

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: redis-server --requirepass your_redis_password
    volumes:
      - redis-data:/data
    restart: unless-stopped
    networks:
      - alawael-network

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./deployment-configs/docker/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certs:/etc/nginx/certs:ro
    depends_on:
      - backend
      - frontend
    restart: unless-stopped
    networks:
      - alawael-network

volumes:
  mongo-data:
  redis-data:

networks:
  alawael-network:
    driver: bridge
EOF
    
    cat > "$DEPLOY_CONFIG_DIR/docker/nginx.conf" << 'EOF'
events {
  worker_connections 1024;
}

http {
  upstream backend {
    server backend:3000;
  }

  upstream frontend {
    server frontend:3001;
  }

  # HTTP to HTTPS redirect
  server {
    listen 80;
    server_name _;
    return 301 https://$host$request_uri;
  }

  # HTTPS server
  server {
    listen 443 ssl http2;
    server_name alawael.local;

    ssl_certificate /etc/nginx/certs/cert.pem;
    ssl_certificate_key /etc/nginx/certs/key.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;

    # API proxy
    location /api/ {
      proxy_pass http://backend/api/;
      proxy_http_version 1.1;
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection 'upgrade';
      proxy_set_header Host $host;
      proxy_cache_bypass $http_upgrade;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Frontend proxy
    location / {
      proxy_pass http://frontend/;
      proxy_http_version 1.1;
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection 'upgrade';
      proxy_set_header Host $host;
      proxy_cache_bypass $http_upgrade;
    }
  }
}
EOF

    echo -e "${GREEN}✓ Docker configuration created${NC}"
}

################################################################################
# MAIN
################################################################################

main() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║      ALAWAEL - DEPLOYMENT CONFIGURATIONS GENERATOR     ║${NC}"
    echo -e "${BLUE}║          Multiple Platforms & Environments            ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    # Create directory
    mkdir -p "$DEPLOY_CONFIG_DIR"
    
    # Create all configurations
    create_heroku_config
    create_aws_config
    create_azure_config
    create_gcp_config
    create_docker_config
    
    echo ""
    echo -e "${BLUE}═════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}✓ ALL DEPLOYMENT CONFIGURATIONS GENERATED${NC}"
    echo -e "${BLUE}═════════════════════════════════════════════════════════${NC}"
    echo ""
    echo "Generated configurations:"
    echo "  ├─ $DEPLOY_CONFIG_DIR/heroku/          → Heroku deployment"
    echo "  ├─ $DEPLOY_CONFIG_DIR/aws/             → AWS Elastic Beanstalk"
    echo "  ├─ $DEPLOY_CONFIG_DIR/azure/           → Azure App Service"
    echo "  ├─ $DEPLOY_CONFIG_DIR/gcp/             → GCP Cloud Run + Kubernetes"
    echo "  └─ $DEPLOY_CONFIG_DIR/docker/          → Docker + Docker Compose"
    echo ""
    echo "Next Steps:"
    echo "  1. Review configurations: ls -R $DEPLOY_CONFIG_DIR"
    echo "  2. Customize for your needs (URLs, credentials, etc.)"
    echo "  3. Deploy using: ./advanced-deploy.sh"
    echo ""
}

main "$@"
