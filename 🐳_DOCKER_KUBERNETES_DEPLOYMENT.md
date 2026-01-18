# 🐳 نشر Docker و Kubernetes

# Docker & Kubernetes Deployment

**التاريخ:** 14 يناير 2026  
**الإصدار:** 1.0  
**الحالة:** ✅ جاهز للإنتاج

---

## 📦 Dockerfile

```dockerfile
# Dockerfile للتطبيق الخلفي

# المرحلة 1: Build
FROM python:3.11-slim as builder

WORKDIR /app

# تثبيت التبعيات
COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# المرحلة 2: Runtime
FROM python:3.11-slim

WORKDIR /app

# نسخ التبعيات من مرحلة البناء
COPY --from=builder /root/.local /root/.local

# نسخ الكود
COPY . .

# تعيين متغيرات البيئة
ENV PATH=/root/.local/bin:$PATH
ENV PYTHONUNBUFFERED=1
ENV FLASK_APP=app.py
ENV FLASK_ENV=production

# فتح المنفذ
EXPOSE 5000

# صحة الحاوية
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD python -c "import requests; requests.get('http://localhost:5000/health')"

# تشغيل التطبيق
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "4", "--timeout", "120", "app:app"]
```

### Dockerfile للواجهة الأمامية

```dockerfile
# Dockerfile للواجهة React

# المرحلة 1: Build
FROM node:18-alpine as builder

WORKDIR /app

# تثبيت التبعيات
COPY package*.json ./
RUN npm ci --only=production

# نسخ الكود
COPY . .

# البناء
RUN npm run build

# المرحلة 2: Runtime مع Nginx
FROM nginx:alpine

# نسخ البناء
COPY --from=builder /app/build /usr/share/nginx/html

# نسخ إعدادات Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# فتح المنفذ
EXPOSE 80

# تشغيل Nginx
CMD ["nginx", "-g", "daemon off;"]
```

---

## 🔧 Docker Compose

```yaml
# docker-compose.yml

version: '3.8'

services:
  # قاعدة البيانات MongoDB
  mongodb:
    image: mongo:7.0
    container_name: rehabilitation_mongodb
    restart: always
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD}
      MONGO_INITDB_DATABASE: rehabilitation
    volumes:
      - mongodb_data:/data/db
      - ./mongo-init.js:/docker-entrypoint-initdb.d/mongo-init.js
    ports:
      - '27017:27017'
    networks:
      - rehabilitation_network
    healthcheck:
      test: echo 'db.runCommand("ping").ok' | mongosh localhost:27017/test --quiet
      interval: 30s
      timeout: 10s
      retries: 5

  # Redis للتخزين المؤقت
  redis:
    image: redis:7-alpine
    container_name: rehabilitation_redis
    restart: always
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    ports:
      - '6379:6379'
    networks:
      - rehabilitation_network
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 30s
      timeout: 10s
      retries: 5

  # الخلفية Flask
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: rehabilitation_backend
    restart: always
    environment:
      MONGO_URI: mongodb://admin:${MONGO_PASSWORD}@mongodb:27017/rehabilitation?authSource=admin
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379/0
      JWT_SECRET: ${JWT_SECRET}
      FLASK_ENV: production
      OPENAI_API_KEY: ${OPENAI_API_KEY}
    volumes:
      - ./backend:/app
      - backend_uploads:/app/uploads
      - backend_reports:/app/reports
    ports:
      - '5000:5000'
    depends_on:
      mongodb:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - rehabilitation_network
    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost:5000/health']
      interval: 30s
      timeout: 10s
      retries: 3

  # الواجهة الأمامية React
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: rehabilitation_frontend
    restart: always
    environment:
      REACT_APP_API_URL: http://backend:5000
    ports:
      - '80:80'
      - '443:443'
    depends_on:
      - backend
    networks:
      - rehabilitation_network
    volumes:
      - ./ssl:/etc/nginx/ssl:ro

  # Nginx Reverse Proxy
  nginx:
    image: nginx:alpine
    container_name: rehabilitation_nginx
    restart: always
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
      - nginx_logs:/var/log/nginx
    ports:
      - '8080:80'
      - '8443:443'
    depends_on:
      - backend
      - frontend
    networks:
      - rehabilitation_network

volumes:
  mongodb_data:
    driver: local
  redis_data:
    driver: local
  backend_uploads:
    driver: local
  backend_reports:
    driver: local
  nginx_logs:
    driver: local

networks:
  rehabilitation_network:
    driver: bridge
```

---

## ☸️ Kubernetes Deployment

### Namespace

```yaml
# namespace.yaml

apiVersion: v1
kind: Namespace
metadata:
  name: rehabilitation-system
  labels:
    name: rehabilitation-system
    environment: production
```

### ConfigMap

```yaml
# configmap.yaml

apiVersion: v1
kind: ConfigMap
metadata:
  name: rehabilitation-config
  namespace: rehabilitation-system
data:
  FLASK_ENV: 'production'
  MONGO_DB: 'rehabilitation'
  REDIS_DB: '0'
  LOG_LEVEL: 'INFO'
  API_VERSION: 'v1'
```

### Secrets

```yaml
# secrets.yaml

apiVersion: v1
kind: Secret
metadata:
  name: rehabilitation-secrets
  namespace: rehabilitation-system
type: Opaque
data:
  # يجب تشفير القيم بـ base64
  MONGO_PASSWORD: <base64-encoded-password>
  REDIS_PASSWORD: <base64-encoded-password>
  JWT_SECRET: <base64-encoded-secret>
  OPENAI_API_KEY: <base64-encoded-key>
```

### MongoDB Deployment

```yaml
# mongodb-deployment.yaml

apiVersion: apps/v1
kind: Deployment
metadata:
  name: mongodb
  namespace: rehabilitation-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: mongodb
  template:
    metadata:
      labels:
        app: mongodb
    spec:
      containers:
        - name: mongodb
          image: mongo:7.0
          ports:
            - containerPort: 27017
          env:
            - name: MONGO_INITDB_ROOT_USERNAME
              value: 'admin'
            - name: MONGO_INITDB_ROOT_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: rehabilitation-secrets
                  key: MONGO_PASSWORD
            - name: MONGO_INITDB_DATABASE
              valueFrom:
                configMapKeyRef:
                  name: rehabilitation-config
                  key: MONGO_DB
          volumeMounts:
            - name: mongodb-storage
              mountPath: /data/db
          resources:
            requests:
              memory: '512Mi'
              cpu: '500m'
            limits:
              memory: '2Gi'
              cpu: '1000m'
          livenessProbe:
            exec:
              command:
                - mongosh
                - --eval
                - "db.adminCommand('ping')"
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            exec:
              command:
                - mongosh
                - --eval
                - "db.adminCommand('ping')"
            initialDelaySeconds: 5
            periodSeconds: 10
      volumes:
        - name: mongodb-storage
          persistentVolumeClaim:
            claimName: mongodb-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: mongodb
  namespace: rehabilitation-system
spec:
  selector:
    app: mongodb
  ports:
    - port: 27017
      targetPort: 27017
  type: ClusterIP
```

### Redis Deployment

```yaml
# redis-deployment.yaml

apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
  namespace: rehabilitation-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
        - name: redis
          image: redis:7-alpine
          command:
            - redis-server
            - --requirepass
            - $(REDIS_PASSWORD)
          ports:
            - containerPort: 6379
          env:
            - name: REDIS_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: rehabilitation-secrets
                  key: REDIS_PASSWORD
          volumeMounts:
            - name: redis-storage
              mountPath: /data
          resources:
            requests:
              memory: '256Mi'
              cpu: '250m'
            limits:
              memory: '512Mi'
              cpu: '500m'
          livenessProbe:
            exec:
              command:
                - redis-cli
                - ping
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            exec:
              command:
                - redis-cli
                - ping
            initialDelaySeconds: 5
            periodSeconds: 10
      volumes:
        - name: redis-storage
          persistentVolumeClaim:
            claimName: redis-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: redis
  namespace: rehabilitation-system
spec:
  selector:
    app: redis
  ports:
    - port: 6379
      targetPort: 6379
  type: ClusterIP
```

### Backend Deployment

```yaml
# backend-deployment.yaml

apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  namespace: rehabilitation-system
spec:
  replicas: 3
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
        - name: backend
          image: rehabilitation/backend:latest
          ports:
            - containerPort: 5000
          env:
            - name: FLASK_ENV
              valueFrom:
                configMapKeyRef:
                  name: rehabilitation-config
                  key: FLASK_ENV
            - name: MONGO_URI
              value: 'mongodb://admin:$(MONGO_PASSWORD)@mongodb:27017/rehabilitation?authSource=admin'
            - name: REDIS_URL
              value: 'redis://:$(REDIS_PASSWORD)@redis:6379/0'
            - name: MONGO_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: rehabilitation-secrets
                  key: MONGO_PASSWORD
            - name: REDIS_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: rehabilitation-secrets
                  key: REDIS_PASSWORD
            - name: JWT_SECRET
              valueFrom:
                secretKeyRef:
                  name: rehabilitation-secrets
                  key: JWT_SECRET
            - name: OPENAI_API_KEY
              valueFrom:
                secretKeyRef:
                  name: rehabilitation-secrets
                  key: OPENAI_API_KEY
          resources:
            requests:
              memory: '512Mi'
              cpu: '500m'
            limits:
              memory: '1Gi'
              cpu: '1000m'
          livenessProbe:
            httpGet:
              path: /health
              port: 5000
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /health
              port: 5000
            initialDelaySeconds: 5
            periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: backend
  namespace: rehabilitation-system
spec:
  selector:
    app: backend
  ports:
    - port: 5000
      targetPort: 5000
  type: ClusterIP
```

### Frontend Deployment

```yaml
# frontend-deployment.yaml

apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  namespace: rehabilitation-system
spec:
  replicas: 2
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      containers:
        - name: frontend
          image: rehabilitation/frontend:latest
          ports:
            - containerPort: 80
          resources:
            requests:
              memory: '128Mi'
              cpu: '100m'
            limits:
              memory: '256Mi'
              cpu: '200m'
          livenessProbe:
            httpGet:
              path: /
              port: 80
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /
              port: 80
            initialDelaySeconds: 5
            periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: frontend
  namespace: rehabilitation-system
spec:
  selector:
    app: frontend
  ports:
    - port: 80
      targetPort: 80
  type: LoadBalancer
```

### Ingress

```yaml
# ingress.yaml

apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: rehabilitation-ingress
  namespace: rehabilitation-system
  annotations:
    kubernetes.io/ingress.class: 'nginx'
    cert-manager.io/cluster-issuer: 'letsencrypt-prod'
    nginx.ingress.kubernetes.io/ssl-redirect: 'true'
    nginx.ingress.kubernetes.io/force-ssl-redirect: 'true'
spec:
  tls:
    - hosts:
        - rehabilitation.example.com
        - api.rehabilitation.example.com
      secretName: rehabilitation-tls
  rules:
    - host: rehabilitation.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: frontend
                port:
                  number: 80
    - host: api.rehabilitation.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: backend
                port:
                  number: 5000
```

### HorizontalPodAutoscaler

```yaml
# hpa.yaml

apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: backend-hpa
  namespace: rehabilitation-system
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: backend
  minReplicas: 3
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
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: frontend-hpa
  namespace: rehabilitation-system
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: frontend
  minReplicas: 2
  maxReplicas: 5
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

---

## 🚀 سكريبتات النشر

### سكريبت بناء الصور

```bash
#!/bin/bash
# build.sh

echo "🔨 Building Docker images..."

# البناء مع تاريخ ورقم الإصدار
VERSION=$(date +%Y%m%d-%H%M%S)
echo "Version: $VERSION"

# بناء الخلفية
echo "Building backend..."
docker build -t rehabilitation/backend:$VERSION -t rehabilitation/backend:latest ./backend

# بناء الواجهة
echo "Building frontend..."
docker build -t rehabilitation/frontend:$VERSION -t rehabilitation/frontend:latest ./frontend

echo "✅ Build completed!"
echo "Images:"
echo "  - rehabilitation/backend:$VERSION"
echo "  - rehabilitation/frontend:$VERSION"
```

### سكريبت النشر على Kubernetes

```bash
#!/bin/bash
# deploy.sh

echo "🚀 Deploying to Kubernetes..."

# إنشاء Namespace
kubectl apply -f k8s/namespace.yaml

# تطبيق ConfigMaps و Secrets
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secrets.yaml

# نشر قواعد البيانات
kubectl apply -f k8s/mongodb-deployment.yaml
kubectl apply -f k8s/redis-deployment.yaml

# انتظار جاهزية قواعد البيانات
echo "⏳ Waiting for databases..."
kubectl wait --for=condition=ready pod -l app=mongodb -n rehabilitation-system --timeout=120s
kubectl wait --for=condition=ready pod -l app=redis -n rehabilitation-system --timeout=120s

# نشر التطبيقات
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/frontend-deployment.yaml

# تطبيق Ingress و HPA
kubectl apply -f k8s/ingress.yaml
kubectl apply -f k8s/hpa.yaml

echo "✅ Deployment completed!"
echo "Check status:"
echo "  kubectl get pods -n rehabilitation-system"
```

---

**آخر تحديث:** 14 يناير 2026  
**الحالة:** ✅ جاهز للنشر على الإنتاج
