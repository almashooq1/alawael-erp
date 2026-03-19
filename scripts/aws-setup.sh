#!/bin/bash

###############################################################################
# AWS Setup Script for Alawael System
# Configures all necessary AWS resources for CI/CD
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}🚀 AWS Setup for Alawael System${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check prerequisites
check_prerequisites() {
    echo -e "${YELLOW}📋 Checking prerequisites...${NC}"
    
    if ! command -v aws &> /dev/null; then
        echo -e "${RED}❌ AWS CLI not found. Please install it first.${NC}"
        exit 1
    fi
    
    if ! aws sts get-caller-identity &>/dev/null; then
        echo -e "${RED}❌ AWS credentials not configured.${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Prerequisites met${NC}"
}

# Create IAM role for GitHub Actions
create_iam_role() {
    echo ""
    echo -e "${YELLOW}🔐 Creating IAM Role...${NC}"
    
    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    ROLE_NAME="github-actions-role"
    
    # Trust policy for GitHub OIDC
    TRUST_POLICY=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::${ACCOUNT_ID}:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:almashooq1/*"
        }
      }
    }
  ]
}
EOF
)
    
    # Check if role exists
    if aws iam get-role --role-name $ROLE_NAME &>/dev/null; then
        echo -e "${YELLOW}⚠️  Role $ROLE_NAME already exists${NC}"
    else
        echo "$TRUST_POLICY" > /tmp/trust-policy.json
        aws iam create-role \
            --role-name $ROLE_NAME \
            --assume-role-policy-document file:///tmp/trust-policy.json
        echo -e "${GREEN}✅ IAM role created${NC}"
    fi
    
    echo "ROLE_ARN=arn:aws:iam::${ACCOUNT_ID}:role/${ROLE_NAME}"
}

# Create inline policy for ECR access
create_ecr_policy() {
    echo ""
    echo -e "${YELLOW}📦 Creating ECR Policy...${NC}"
    
    ROLE_NAME="github-actions-role"
    POLICY_NAME="github-actions-ecr-policy"
    
    ECR_POLICY=$(cat <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:CreateRepository",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "ecr:PutImage",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload",
        "ecr:GetAuthorizationToken",
        "ecr:DescribeRepositories",
        "ecr:ListImages"
      ],
      "Resource": "*"
    }
  ]
}
EOF
)
    
    echo "$ECR_POLICY" > /tmp/ecr-policy.json
    aws iam put-role-policy \
        --role-name $ROLE_NAME \
        --policy-name $POLICY_NAME \
        --policy-document file:///tmp/ecr-policy.json
    echo -e "${GREEN}✅ ECR policy created${NC}"
}

# Create inline policy for ECS deployment
create_ecs_policy() {
    echo ""
    echo -e "${YELLOW}🚀 Creating ECS Policy...${NC}"
    
    ROLE_NAME="github-actions-role"
    POLICY_NAME="github-actions-ecs-policy"
    
    ECS_POLICY=$(cat <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecs:DescribeServices",
        "ecs:DescribeTaskDefinition",
        "ecs:DescribeClusters",
        "ecs:UpdateService",
        "ecs:RegisterTaskDefinition",
        "ecs:ListClusters",
        "ecs:ListServices",
        "ecs:ListTasks"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "iam:PassRole"
      ],
      "Resource": [
        "arn:aws:iam::*:role/ecsTaskExecutionRole",
        "arn:aws:iam::*:role/ecsTaskRole"
      ]
    }
  ]
}
EOF
)
    
    echo "$ECS_POLICY" > /tmp/ecs-policy.json
    aws iam put-role-policy \
        --role-name $ROLE_NAME \
        --policy-name $POLICY_NAME \
        --policy-document file:///tmp/ecs-policy.json
    echo -e "${GREEN}✅ ECS policy created${NC}"
}

# Create ECR repositories
create_ecr_repositories() {
    echo ""
    echo -e "${YELLOW}📦 Creating ECR Repositories...${NC}"
    
    for repo in alawael-api-backend alawael-api-frontend alawael-api; do
        if aws ecr describe-repositories --repository-names $repo &>/dev/null; then
            echo -e "${YELLOW}⚠️  Repository $repo already exists${NC}"
        else
            aws ecr create-repository --repository-name $repo
            echo -e "${GREEN}✅ Repository $repo created${NC}"
        fi
    done
}

# Output summary
output_summary() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}📊 Setup Summary${NC}"
    echo -e "${BLUE}========================================${NC}"
    
    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    
    echo ""
    echo -e "${YELLOW}AWS Account ID: ${GREEN}$ACCOUNT_ID${NC}"
    echo -e "${YELLOW}GitHub Secrets to add:${NC}"
    echo "  - AWS_ACCOUNT_ID: $ACCOUNT_ID"
    echo ""
    echo -e "${YELLOW}IAM Role ARN:${NC}"
    echo "  arn:aws:iam::$ACCOUNT_ID:role/github-actions-role"
    echo ""
    echo -e "${GREEN}✅ AWS Setup Complete!${NC}"
}

# Main execution
main() {
    check_prerequisites
    create_iam_role
    create_ecr_policy
    create_ecs_policy
    create_ecr_repositories
    output_summary
}

main
