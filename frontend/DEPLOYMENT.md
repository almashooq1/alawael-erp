# Phase 12 Frontend - Production Deployment Guide

## 🚀 Quick Deployment

### Option 1: Static Hosting (Recommended)

```bash
# Build production bundle
npm run build

# Deploy to Netlify
npm install -g netlify-cli
netlify deploy --prod

# Or deploy to Vercel
npm install -g vercel
vercel --prod
```

### Option 2: Docker Deployment

```bash
# Build Docker image
docker build -t erp-frontend:latest .

# Run container
docker run -p 3000:3000 erp-frontend:latest
```

### Option 3: Traditional Server

```bash
# Build production bundle
npm run build

# Install serve
npm install -g serve

# Serve on port 3000
serve -s build -p 3000
```

---

## 📦 Build Configuration

### Production Build

```bash
npm run build
```

Output:

- Optimized bundle in `build/` directory
- Minified JS/CSS
- Source maps for debugging
- Manifest for PWA support

### Build Options

```json
{
  "scripts": {
    "build": "react-scripts build",
    "build:prod": "REACT_APP_ENV=production npm run build",
    "build:staging": "REACT_APP_ENV=staging npm run build",
    "analyze": "source-map-explorer 'build/static/js/*.js'"
  }
}
```

---

## 🌐 Environment Configuration

### Create Production .env

```bash
# .env.production
REACT_APP_API_URL=https://api.erpsystem.com
REACT_APP_REFRESH_INTERVAL=10000
REACT_APP_ENABLE_ANALYTICS=true
REACT_APP_DEBUG=false
```

### Environment Variables

- `REACT_APP_API_URL` - Backend API URL
- `REACT_APP_REFRESH_INTERVAL` - Dashboard refresh interval (ms)
- `REACT_APP_DEBUG` - Enable debug mode
- `REACT_APP_ENABLE_ANALYTICS` - Enable analytics tracking

---

## 🐳 Docker Deployment

### Dockerfile

```dockerfile
FROM node:18-alpine as build

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### nginx.conf

```nginx
server {
  listen 80;
  server_name localhost;
  root /usr/share/nginx/html;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }

  location /api {
    proxy_pass http://backend:3001;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }

  gzip on;
  gzip_types text/plain text/css application/json application/javascript;
}
```

### Docker Compose

```yaml
version: '3.8'

services:
  frontend:
    build: .
    ports:
      - '80:80'
    environment:
      - REACT_APP_API_URL=http://backend:3001
    depends_on:
      - backend

  backend:
    image: erp-backend:latest
    ports:
      - '3001:3001'
    environment:
      - NODE_ENV=production
```

---

## ☁️ Cloud Deployment

### Netlify Deployment

1. **Connect Repository**

   ```bash
   netlify init
   ```

2. **Configure Build**
   - Build command: `npm run build`
   - Publish directory: `build`
   - Environment variables: Add in Netlify dashboard

3. **Deploy**
   ```bash
   netlify deploy --prod
   ```

### Vercel Deployment

1. **Install Vercel CLI**

   ```bash
   npm install -g vercel
   ```

2. **Deploy**

   ```bash
   vercel --prod
   ```

3. **Configure**
   - Add environment variables in Vercel dashboard
   - Set API proxy rules in `vercel.json`

### AWS S3 + CloudFront

1. **Build Application**

   ```bash
   npm run build
   ```

2. **Upload to S3**

   ```bash
   aws s3 sync build/ s3://your-bucket-name
   ```

3. **Configure CloudFront**
   - Create distribution
   - Set origin to S3 bucket
   - Configure custom error pages

---

## 🔒 Security Configuration

### HTTPS Setup

```nginx
server {
  listen 443 ssl http2;
  ssl_certificate /path/to/cert.pem;
  ssl_certificate_key /path/to/key.pem;

  # SSL configuration
  ssl_protocols TLSv1.2 TLSv1.3;
  ssl_ciphers HIGH:!aNULL:!MD5;
}
```

### Security Headers

```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "no-referrer-when-downgrade" always;
add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
```

---

## 📊 Performance Optimization

### Build Optimization

```bash
# Analyze bundle size
npm run build
npm run analyze

# Enable code splitting
# Automatically handled by React Scripts

# Optimize images
npm install --save-dev imagemin imagemin-webpack-plugin
```

### Runtime Optimization

- Enable gzip compression
- Use CDN for static assets
- Implement caching headers
- Lazy load routes
- Code splitting

---

## 🔍 Monitoring & Analytics

### Error Tracking

```javascript
// Add to index.js
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: process.env.REACT_APP_SENTRY_DSN,
  environment: process.env.NODE_ENV,
});
```

### Analytics

```javascript
// Google Analytics
import ReactGA from 'react-ga4';

ReactGA.initialize(process.env.REACT_APP_GA_ID);
```

### Performance Monitoring

```javascript
// Web Vitals
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

function sendToAnalytics(metric) {
  // Send to your analytics endpoint
}

getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getFCP(sendToAnalytics);
getLCP(sendToAnalytics);
getTTFB(sendToAnalytics);
```

---

## 🧪 Pre-Deployment Checklist

- [ ] Run production build successfully
- [ ] Test all pages and components
- [ ] Verify API endpoints work
- [ ] Check responsive design
- [ ] Test on multiple browsers
- [ ] Verify HTTPS configuration
- [ ] Configure error tracking
- [ ] Set up monitoring
- [ ] Configure CDN
- [ ] Test performance
- [ ] Review security headers
- [ ] Set up backup strategy

---

## 📝 Deployment Scripts

### package.json

```json
{
  "scripts": {
    "build": "react-scripts build",
    "deploy:netlify": "npm run build && netlify deploy --prod",
    "deploy:vercel": "npm run build && vercel --prod",
    "deploy:s3": "npm run build && aws s3 sync build/ s3://bucket-name",
    "verify": "node scripts/verify.js"
  }
}
```

---

## 🔄 CI/CD Pipeline

### GitHub Actions

```yaml
name: Deploy Frontend

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v2

      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build
        env:
          REACT_APP_API_URL: ${{ secrets.API_URL }}

      - name: Deploy to Netlify
        uses: netlify/actions/cli@master
        with:
          args: deploy --dir=build --prod
        env:
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_TOKEN }}
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
```

---

## 🆘 Troubleshooting

### Build Issues

```bash
# Clear cache
rm -rf node_modules package-lock.json
npm install

# Clear React Scripts cache
rm -rf node_modules/.cache
```

### Deployment Issues

- Verify environment variables are set
- Check API URL is correct
- Verify CORS configuration on backend
- Check browser console for errors

### Performance Issues

- Enable production mode
- Enable gzip compression
- Use CDN for assets
- Optimize images
- Implement caching

---

**Version**: Phase 12 v1.0 **Last Updated**: January 21, 2026 **Status**:
Production Ready
