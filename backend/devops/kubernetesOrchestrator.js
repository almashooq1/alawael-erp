/**
 * ☸️ Kubernetes Orchestration
 *
 * Complete K8s manifests and configuration
 * - Deployment manifests
 * - Service configuration
 * - ConfigMap and Secret management
 * - Ingress and networking
 */

const kubernetesConfig = {
  // Namespace
  namespace: `
apiVersion: v1
kind: Namespace
metadata:
  name: alawael
  labels:
    name: alawael
  `,

  // ConfigMap for environment variables
  configMap: `
apiVersion: v1
kind: ConfigMap
metadata:
  name: alawael-config
  namespace: alawael
data:
  NODE_ENV: "production"
  LOG_LEVEL: "info"
  PORT: "3000"
  CACHE_TTL: "3600"
  MAX_CONNECTIONS: "100"
  API_VERSION: "v1"
  ENABLE_TRACING: "true"
  ENABLE_METRICS: "true"
  `,

  // Secret for sensitive data
  secret: `
apiVersion: v1
kind: Secret
metadata:
  name: alawael-secrets
  namespace: alawael
type: Opaque
stringData:
  MONGO_URI: "mongodb+srv://user:password@cluster.mongodb.net/alawael"
  REDIS_URL: "redis://:password@redis-host:6379"
  JWT_SECRET: "your-secret-key-here"
  API_KEY: "your-api-key-here"
  `,

  // Deployment manifest
  deployment: `
apiVersion: apps/v1
kind: Deployment
metadata:
  name: alawael-app
  namespace: alawael
  labels:
    app: alawael
    version: v1
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: alawael
  template:
    metadata:
      labels:
        app: alawael
        version: v1
    spec:
      serviceAccountName: alawael
      securityContext:
        runAsNonRoot: true
        runAsUser: 1001
        fsGroup: 1001
      containers:
      - name: alawael
        image: your-registry/alawael:latest
        imagePullPolicy: IfNotPresent
        ports:
        - name: http
          containerPort: 3000
          protocol: TCP
        env:
        - name: NODE_ENV
          valueFrom:
            configMapKeyRef:
              name: alawael-config
              key: NODE_ENV
        - name: MONGO_URI
          valueFrom:
            secretKeyRef:
              name: alawael-secrets
              key: MONGO_URI
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: alawael-secrets
              key: REDIS_URL
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
            port: http
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /ready
            port: http
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          capabilities:
            drop:
            - ALL
        volumeMounts:
        - name: tmp
          mountPath: /tmp
        - name: logs
          mountPath: /app/logs
      volumes:
      - name: tmp
        emptyDir: {}
      - name: logs
        emptyDir: {}
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app
                  operator: In
                  values:
                  - alawael
              topologyKey: kubernetes.io/hostname
  `,

  // Service
  service: `
apiVersion: v1
kind: Service
metadata:
  name: alawael-service
  namespace: alawael
  labels:
    app: alawael
spec:
  type: ClusterIP
  ports:
  - name: http
    port: 80
    targetPort: http
    protocol: TCP
  selector:
    app: alawael
  sessionAffinity: ClientIP
  `,

  // HorizontalPodAutoscaler
  hpa: `
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: alawael-hpa
  namespace: alawael
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: alawael-app
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
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 50
        periodSeconds: 15
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
      - type: Percent
        value: 100
        periodSeconds: 15
      - type: Pods
        value: 2
        periodSeconds: 15
      selectPolicy: Max
  `,

  // Ingress
  ingress: `
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: alawael-ingress
  namespace: alawael
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - api.example.com
    secretName: alawael-tls
  rules:
  - host: api.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: alawael-service
            port:
              number: 80
  `,

  // ServiceAccount
  serviceAccount: `
apiVersion: v1
kind: ServiceAccount
metadata:
  name: alawael
  namespace: alawael
  `,

  // PodDisruptionBudget
  pdb: `
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: alawael-pdb
  namespace: alawael
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: alawael
  `,
};

/**
 * Kubernetes configuration manager
 */
class KubernetesOrchestrator {
  /**
   * Get all K8s manifests
   */
  static getAllManifests() {
    return kubernetesConfig;
  }

  /**
   * Get kubectl commands
   */
  static getKubectlCommands() {
    return {
      // Deployment
      applyConfig: 'kubectl apply -f k8s/',
      getStatus: 'kubectl get deployment alawael-app -n alawael',
      getEvents: 'kubectl get events -n alawael',
      getPods: 'kubectl get pods -n alawael',

      // Logs
      viewLogs: 'kubectl logs -f deployment/alawael-app -n alawael',
      viewPreviousLogs: 'kubectl logs --previous deployment/alawael-app -n alawael',

      // Debugging
      describe: 'kubectl describe deployment alawael-app -n alawael',
      shell: 'kubectl exec -it <pod-name> -n alawael -- sh',

      // Scaling
      scale: 'kubectl scale deployment alawael-app --replicas=5 -n alawael',

      // Rolling update
      update:
        'kubectl set image deployment/alawael-app alawael=your-registry/alawael:v2 -n alawael',
      status: 'kubectl rollout status deployment/alawael-app -n alawael',
      undo: 'kubectl rollout undo deployment/alawael-app -n alawael',
      history: 'kubectl rollout history deployment/alawael-app -n alawael',

      // Port forwarding
      portForward: 'kubectl port-forward svc/alawael-service 3000:80 -n alawael',

      // Monitoring
      metrics: 'kubectl top nodes && kubectl top pods -n alawael',
    };
  }

  /**
   * Get Helm values template
   */
  static getHelmValuesTemplate() {
    return `
replicaCount: 3

image:
  repository: your-registry/alawael
  tag: latest
  pullPolicy: IfNotPresent

service:
  type: ClusterIP
  port: 80
  targetPort: 3000

ingress:
  enabled: true
  className: nginx
  hosts:
    - host: api.example.com
      paths:
        - path: /
          pathType: Prefix

resources:
  requests:
    memory: "256Mi"
    cpu: "250m"
  limits:
    memory: "512Mi"
    cpu: "500m"

autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70
  targetMemoryUtilizationPercentage: 80

env:
  NODE_ENV: production
  LOG_LEVEL: info
  CACHE_TTL: 3600

secrets:
  MONGO_URI: ""
  REDIS_URL: ""
  JWT_SECRET: ""
    `;
  }

  /**
   * Get deployment best practices
   */
  static getBestPractices() {
    return [
      '✅ Use resource requests and limits',
      '✅ Implement health checks (liveness & readiness probes)',
      '✅ Use rolling updates for zero-downtime deployments',
      '✅ Set up HorizontalPodAutoscaler for auto-scaling',
      '✅ Use PodDisruptionBudget for high availability',
      '✅ Implement pod anti-affinity for distribution',
      '✅ Use security contexts for non-root users',
      '✅ Enable RBAC and network policies',
      '✅ Use ConfigMaps for configuration and Secrets for sensitive data',
      '✅ Implement proper logging and monitoring',
      '✅ Use init containers for initialization tasks',
      '✅ Regular backup and disaster recovery plan',
    ];
  }
}

module.exports = { KubernetesOrchestrator, kubernetesConfig };
