/**
 * ALAWAEL Quality Dashboard - Multi-Region Deployment Configuration
 * Phase 13 - Pillar 2: Scalability (Week 2)
 */

const multiRegionConfig = {
  // Primary Region - North America (US East)
  primaryRegion: {
    name: 'us-east-1',
    displayName: 'US East (Primary)',
    endpoints: {
      api: 'https://api-us-east.alawael.io',
      database: 'db.us-east.alawael.io:5432',
      cache: 'cache.us-east.alawael.io:6379',
      cdn: 'cdn.us-east.alawael.io',
    },
    services: {
      backend: {
        instances: 3,
        cpu: '2000m',
        memory: '2Gi',
        image: 'alawael/backend:latest',
      },
      database: {
        type: 'PostgreSQL',
        version: '16',
        replication: 'primary',
        backups: {
          enabled: true,
          frequency: 'hourly',
          retention: '30 days',
        },
      },
      cache: {
        type: 'Redis Cluster',
        nodes: 3,
        memory: '8Gi',
      },
    },
    sla: {
      uptime: '99.99%',
      rto: '15 minutes',
      rpo: '1 minute',
    },
  },

  // Secondary Region - Europe (EU West)
  secondaryRegion: {
    name: 'eu-west-1',
    displayName: 'EU West (Secondary)',
    endpoints: {
      api: 'https://api-eu-west.alawael.io',
      database: 'db.eu-west.alawael.io:5432',
      cache: 'cache.eu-west.alawael.io:6379',
      cdn: 'cdn.eu-west.alawael.io',
    },
    services: {
      backend: {
        instances: 2,
        cpu: '2000m',
        memory: '2Gi',
        image: 'alawael/backend:latest',
      },
      database: {
        type: 'PostgreSQL',
        version: '16',
        replication: 'streaming_replica',
        syncDelay: '< 1s',
      },
      cache: {
        type: 'Redis Cache',
        nodes: 2,
        memory: '4Gi',
      },
    },
    sla: {
      uptime: '99.95%',
      rto: '30 minutes',
      rpo: '5 minutes',
    },
  },

  // Tertiary Region - Asia Pacific (APAC)
  tertiaryRegion: {
    name: 'ap-southeast-1',
    displayName: 'Asia Pacific (APAC)',
    endpoints: {
      api: 'https://api-apac.alawael.io',
      database: 'db.apac.alawael.io:5432',
      cache: 'cache.apac.alawael.io:6379',
      cdn: 'cdn.apac.alawael.io',
    },
    services: {
      backend: {
        instances: 2,
        cpu: '2000m',
        memory: '2Gi',
        image: 'alawael/backend:latest',
      },
      database: {
        type: 'PostgreSQL',
        version: '16',
        replication: 'async_replica',
        syncDelay: '< 5s',
      },
      cache: {
        type: 'Redis Cache',
        nodes: 2,
        memory: '4Gi',
      },
    },
    sla: {
      uptime: '99.90%',
      rto: '60 minutes',
      rpo: '15 minutes',
    },
  },

  // Global Load Balancer Configuration
  loadBalancer: {
    type: 'GeoDNS + Application Load Balancer',
    healthCheck: {
      enabled: true,
      interval: '5s',
      timeout: '2s',
      healthyThreshold: 2,
      unhealthyThreshold: 3,
    },
    failover: {
      strategy: 'automatic',
      failoverRegions: ['us-east-1', 'eu-west-1', 'ap-southeast-1'],
      healthCheckEndpoint: '/health',
    },
    routing: {
      rule: 'geo-latency based',
      fallback: 'us-east-1',
    },
  },

  // Database Replication Strategy
  databaseReplication: {
    topology: 'primary-replica with async failover',
    primaryRegion: 'us-east-1',
    replicas: [
      {
        region: 'eu-west-1',
        type: 'streaming',
        syncMode: 'synchronous',
        maxSyncDelay: '1s',
      },
      {
        region: 'ap-southeast-1',
        type: 'streaming',
        syncMode: 'asynchronous',
        maxSyncDelay: '5s',
      },
    ],
    failover: {
      automaticFailover: true,
      promotionDelay: '30s',
      dataLossTolerance: '< 1 transaction',
    },
    monitoring: {
      replicationLag: true,
      walArchiving: true,
      driftDetection: true,
    },
  },

  // Cache Distribution (Redis Cluster)
  cacheStrategy: {
    type: 'Redis Cluster with regional caching',
    primaryCluster: {
      region: 'us-east-1',
      nodes: 6, // 3 primary + 3 replica
      memory: '16Gi',
      persistence: 'AOF + RDB',
    },
    regionalCache: {
      'eu-west-1': {
        nodes: 3, // Read-only replicas
        memory: '8Gi',
        replicateFrom: 'us-east-1',
      },
      'ap-southeast-1': {
        nodes: 3, // Read-only replicas
        memory: '8Gi',
        replicateFrom: 'us-east-1',
      },
    },
    invalidation: {
      strategy: 'pub-sub',
      lag: '< 100ms',
    },
  },

  // Data Consistency Configuration
  dataConsistency: {
    readPreference: {
      session: 'primary-preferred', // For session data
      analytics: 'secondary-ok', // For read-heavy analytics
      realtime: 'primary', // For critical data
    },
    conflictResolution: {
      strategy: 'last-write-wins',
      vectorClocks: true,
      timestampComparison: true,
    },
  },

  // Network Configuration
  networking: {
    cdn: {
      provider: 'CloudFront + Akamai',
      caching: {
        static: '30 days',
        api: '5 minutes',
        html: 'no-cache (browser revalidate)',
      },
    },
    peering: {
      directConnect: true,
      regions: ['us-east-1', 'eu-west-1', 'ap-southeast-1'],
      bandwidth: '10 Gbps each',
    },
    ddosProtection: {
      enabled: true,
      provider: 'AWS Shield Advanced',
      monitoring: '24/7',
    },
  },

  // Monitoring & Observability
  monitoring: {
    metrics: {
      collection: 'Prometheus + CloudWatch',
      interval: '15s',
      retention: '90 days',
    },
    logs: {
      aggregation: 'ELK Stack + CloudWatch Logs',
      retention: '30 days',
      analysis: 'Splunk',
    },
    tracing: {
      system: 'Jaeger',
      samplingRate: '10%',
      traceRetention: '7 days',
    },
    alerts: {
      platform: 'PagerDuty + Slack',
      slo: {
        availability: '99.95%',
        latency_p99: '< 100ms',
        errorRate: '< 0.1%',
      },
    },
  },
};

module.exports = multiRegionConfig;
