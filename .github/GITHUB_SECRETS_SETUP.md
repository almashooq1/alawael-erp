# GitHub Actions Secrets Configuration Guide

## Overview

This document outlines all the secrets that need to be configured in your GitHub
repository for the CI/CD pipeline to work properly.

## How to Add Secrets to GitHub

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Enter the secret name and value
5. Click **Add secret**

## Required Secrets

### 1. Docker Registry Credentials

Used for pushing Docker images to the container registry.

**Name**: `GITHUB_TOKEN` **Value**: Automatically provided by GitHub (no action
needed) **Used in**: Build Docker Images job

---

### 2. Staging Environment Secrets

#### `STAGING_HOST`

**Description**: Hostname or IP address of the staging server **Example**:
`staging.example.com` or `192.168.1.100` **Used in**: Deploy to Staging job

#### `STAGING_USER`

**Description**: SSH username for the staging server **Example**: `deploy_user`
**Used in**: Deploy to Staging job

#### `STAGING_KEY`

**Description**: SSH private key for authenticating to the staging server
**Format**: Complete private key (include `-----BEGIN RSA PRIVATE KEY-----` and
`-----END RSA PRIVATE KEY-----`) **How to generate**:

```bash
ssh-keygen -t rsa -b 4096 -f staging_key -N ""
cat staging_key  # Copy this as the secret value
chmod 600 staging_key.pub
ssh-copy-id -i staging_key.pub deploy_user@staging.example.com
```

**Used in**: Deploy to Staging job

#### `STAGING_SERVER_URL`

**Description**: Base URL of the staging environment **Example**:
`https://staging.example.com` or `http://192.168.1.100:3000` **Used in**: Deploy
to Staging job (health checks and notifications)

#### `STAGING_MONGODB_URI`

**Description**: MongoDB connection string for staging **Example**:
`mongodb://user:password@mongo-staging:27017/rehabilitation_staging` **Used
in**: Backend tests (if running against staging database)

#### `STAGING_REDIS_URL`

**Description**: Redis connection string for staging **Example**:
`redis://redis-staging:6379/1` **Used in**: Backend tests (if running against
staging cache)

#### `STAGING_JWT_SECRET`

**Description**: JWT secret key for staging environment **Generate**:
`openssl rand -hex 32` **Used in**: Staging deployment environment variables

#### `STAGING_API_KEY`

**Description**: API key for staging environment services **Generate**:
`openssl rand -hex 24` **Used in**: Staging deployment environment variables

---

### 3. Production Environment Secrets

#### `PROD_HOST`

**Description**: Hostname or IP address of the production server **Example**:
`production.example.com` or `203.0.113.45` **Used in**: Deploy to Production job

#### `PROD_USER`

**Description**: SSH username for the production server **Example**:
`deploy_user` **Used in**: Deploy to Production job

#### `PROD_KEY`

**Description**: SSH private key for authenticating to the production server
**Format**: Complete private key (include `-----BEGIN RSA PRIVATE KEY-----` and
`-----END RSA PRIVATE KEY-----`) **Security Note**: This is the most sensitive
secret - store securely and rotate regularly **How to generate**:

```bash
ssh-keygen -t rsa -b 4096 -f prod_key -N ""
cat prod_key  # Copy this as the secret value
chmod 600 prod_key.pub
ssh-copy-id -i prod_key.pub deploy_user@production.example.com
```

**Used in**: Deploy to Production job

#### `PROD_SERVER_URL`

**Description**: Base URL of the production environment **Example**:
`https://api.example.com` or `https://app.example.com` **Security Note**: Should
be HTTPS **Used in**: Deploy to Production job (health checks and notifications)

#### `PROD_MONGODB_URI`

**Description**: MongoDB connection string for production **Example**:
`mongodb+srv://user:password@mongo-prod-cluster.mongodb.net/rehabilitation_prod?retryWrites=true&w=majority`
**Security Note**: Should use authentication and be restricted to production
networks **Used in**: Production deployment environment variables

#### `PROD_REDIS_URL`

**Description**: Redis connection string for production **Example**:
`redis://:password@redis-prod:6379/1` **Security Note**: Should require
authentication **Used in**: Production deployment environment variables

#### `PROD_JWT_SECRET`

**Description**: JWT secret key for production environment **Generate**:
`openssl rand -hex 32` **Security Note**: Should be different from staging
secret **Used in**: Production deployment environment variables

#### `PROD_API_KEY`

**Description**: API key for production environment services **Generate**:
`openssl rand -hex 24` **Security Note**: Should be different from staging
secret **Used in**: Production deployment environment variables

---

### 4. Optional Secrets

#### `SLACK_WEBHOOK`

**Description**: Slack webhook URL for deployment notifications **Example**:
`https://hooks.slack.com/services/YOUR/WEBHOOK/URL` **How to create**:

1. Go to Slack workspace settings
2. Create incoming webhook
3. Copy the URL **Used in**: Notify Deployment job

#### `CODECOV_TOKEN`

**Description**: Codecov token for coverage report uploads **How to get**: Sign
up at codecov.io and get token from settings **Used in**: Upload coverage
reports jobs

---

## Secrets Configuration Checklist

### Staging Environment

- [ ] `STAGING_HOST` - Set to staging server hostname/IP
- [ ] `STAGING_USER` - Set to SSH username
- [ ] `STAGING_KEY` - Set to SSH private key
- [ ] `STAGING_SERVER_URL` - Set to staging application URL
- [ ] `STAGING_MONGODB_URI` - Set to staging MongoDB URI
- [ ] `STAGING_REDIS_URL` - Set to staging Redis URI
- [ ] `STAGING_JWT_SECRET` - Set to JWT secret
- [ ] `STAGING_API_KEY` - Set to API key

### Production Environment

- [ ] `PROD_HOST` - Set to production server hostname/IP
- [ ] `PROD_USER` - Set to SSH username
- [ ] `PROD_KEY` - Set to SSH private key
- [ ] `PROD_SERVER_URL` - Set to production application URL
- [ ] `PROD_MONGODB_URI` - Set to production MongoDB URI
- [ ] `PROD_REDIS_URL` - Set to production Redis URI
- [ ] `PROD_JWT_SECRET` - Set to JWT secret
- [ ] `PROD_API_KEY` - Set to API key

### Optional

- [ ] `SLACK_WEBHOOK` - Set for deployment notifications
- [ ] `CODECOV_TOKEN` - Set for coverage tracking

---

## Security Best Practices

1. **Rotate Secrets Regularly**
   - Rotate SSH keys and JWT secrets every 90 days
   - Change API keys whenever there's a security concern

2. **Use Strong Secrets**
   - JWT secrets: minimum 32 characters (use `openssl rand -hex 32`)
   - API keys: minimum 24 characters (use `openssl rand -hex 24`)
   - Passwords: follow your organization's policy (minimum 16 characters
     recommended)

3. **Limit Access**
   - Restrict SSH key to deployment user only
   - Use SSH key authentication instead of passwords
   - Implement IP whitelisting on production servers

4. **Audit Secrets**
   - Review secret access logs regularly
   - Monitor for unauthorized access attempts
   - Set up alerts for failed deployment attempts

5. **Never Commit Secrets**
   - Add `.env*` files to `.gitignore`
   - Use GitHub secrets for all sensitive data
   - Scan commits for accidentally committed secrets

---

## Troubleshooting

### SSH Connection Fails

```bash
# Test SSH connection locally first
ssh -i staging_key deploy_user@staging.example.com

# Check SSH key permissions
ls -la ~/.ssh/staging_key
# Should show: -rw------- (600)
```

### Health Check Fails

```bash
# Test endpoint manually
curl -v https://staging.example.com/api/health

# Check if service is running
ssh deploy_user@staging.example.com "docker ps"

# Check logs
ssh deploy_user@staging.example.com "docker logs backend"
```

### Database Connection Fails

```bash
# Verify connection string format
mongodb://user:password@host:27017/database

# Test MongoDB connection
mongosh "mongodb://user:password@staging.example.com:27017/"
```

---

## Verification

After configuring all secrets, run the following to verify:

1. Create a test branch and push to develop:

   ```bash
   git checkout -b test/ci-cd-setup
   git push origin test/ci-cd-setup
   ```

2. Monitor the GitHub Actions run:
   - Go to **Actions** tab
   - Click on your workflow run
   - Verify all jobs pass

3. Check staging deployment:
   - Verify application is running
   - Check logs for errors
   - Test key endpoints

---

## Support

For issues or questions:

1. Check GitHub Actions logs for error messages
2. Review SSH connectivity
3. Verify all secrets are properly formatted
4. Ensure database and Redis are accessible from deployment servers

---

**Last Updated**: February 6, 2026 **Maintenance**: Review and update secrets
configuration monthly
