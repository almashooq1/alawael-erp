/**
 * Phase 32: Advanced DevOps/MLOps Service
 * CI/CD Pipelines, Kubernetes, ML Deployment, Monitoring, Auto-Scaling
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api/phases-29-33';

const fetchAPI = async (endpoint, options = {}) => {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Phase 32 API Error on ${endpoint}:`, error);
    throw error;
  }
};

/**
 * Phase 32: Advanced DevOps/MLOps APIs
 */
export const phase32DevOps = {
  // CI/CD Pipelines
  cicd: {
    /**
     * Create CI/CD pipeline
     * @param {object} config - Pipeline configuration
     */
    createPipeline: async config => {
      return fetchAPI('/cicd/pipeline', {
        method: 'POST',
        body: JSON.stringify(config),
      });
    },

    /**
     * List CI/CD pipelines
     */
    listPipelines: async () => {
      return fetchAPI('/cicd/pipelines');
    },

    /**
     * Get pipeline details
     * @param {string} pipelineId - Pipeline ID
     */
    getPipeline: async pipelineId => {
      return fetchAPI(`/cicd/pipelines/${pipelineId}`);
    },

    /**
     * Execute pipeline
     * @param {string} pipelineId - Pipeline ID
     * @param {object} params - Execution parameters
     */
    execute: async (pipelineId, params = {}) => {
      return fetchAPI(`/cicd/pipeline/${pipelineId}/execute`, {
        method: 'POST',
        body: JSON.stringify(params),
      });
    },

    /**
     * Get pipeline execution history
     * @param {string} pipelineId - Pipeline ID
     */
    getExecutionHistory: async pipelineId => {
      return fetchAPI(`/cicd/pipelines/${pipelineId}/executions`);
    },
  },

  // Kubernetes Orchestration
  kubernetes: {
    /**
     * Create Kubernetes cluster
     * @param {object} config - Cluster configuration
     */
    createCluster: async config => {
      return fetchAPI('/devops/k8s/cluster', {
        method: 'POST',
        body: JSON.stringify(config),
      });
    },

    /**
     * List Kubernetes clusters
     */
    listClusters: async () => {
      return fetchAPI('/devops/k8s/clusters');
    },

    /**
     * Get cluster details
     * @param {string} clusterId - Cluster ID
     */
    getCluster: async clusterId => {
      return fetchAPI(`/devops/k8s/clusters/${clusterId}`);
    },

    /**
     * Deploy to Kubernetes
     * @param {string} clusterId - Cluster ID
     * @param {object} deploymentConfig - Deployment configuration
     */
    deploy: async (clusterId, deploymentConfig) => {
      return fetchAPI('/devops/k8s/deploy', {
        method: 'POST',
        body: JSON.stringify({ clusterId, ...deploymentConfig }),
      });
    },

    /**
     * Get cluster resources
     * @param {string} clusterId - Cluster ID
     */
    getResources: async clusterId => {
      return fetchAPI(`/devops/k8s/clusters/${clusterId}/resources`);
    },
  },

  // ML Model Deployment
  mlops: {
    /**
     * Deploy ML model
     * @param {object} modelConfig - Model configuration
     */
    deployModel: async modelConfig => {
      return fetchAPI('/ml/model/deploy', {
        method: 'POST',
        body: JSON.stringify(modelConfig),
      });
    },

    /**
     * List deployed ML models
     */
    listModels: async () => {
      return fetchAPI('/ml/models');
    },

    /**
     * Get model details
     * @param {string} modelId - Model ID
     */
    getModel: async modelId => {
      return fetchAPI(`/ml/models/${modelId}`);
    },

    /**
     * Get deployment metrics
     * @param {string} deploymentId - Deployment ID
     */
    getDeploymentMetrics: async deploymentId => {
      return fetchAPI(`/ml/deployment/${deploymentId}/metrics`);
    },

    /**
     * Make prediction with deployed model
     * @param {string} modelId - Model ID
     * @param {object} data - Input data
     */
    predict: async (modelId, data) => {
      return fetchAPI(`/ml/models/${modelId}/predict`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    /**
     * Update model version
     * @param {string} modelId - Model ID
     * @param {object} versionConfig - Version configuration
     */
    updateVersion: async (modelId, versionConfig) => {
      return fetchAPI(`/ml/models/${modelId}/update`, {
        method: 'PUT',
        body: JSON.stringify(versionConfig),
      });
    },
  },

  // Advanced Monitoring & Observability
  monitoring: {
    /**
     * Get monitoring metrics
     */
    getMetrics: async () => {
      return fetchAPI('/monitoring/metrics');
    },

    /**
     * Get specific resource metrics
     * @param {string} resourceId - Resource ID
     */
    getResourceMetrics: async resourceId => {
      return fetchAPI(`/monitoring/metrics/${resourceId}`);
    },

    /**
     * Create monitoring alert
     * @param {object} alertConfig - Alert configuration
     */
    createAlert: async alertConfig => {
      return fetchAPI('/monitoring/alerts', {
        method: 'POST',
        body: JSON.stringify(alertConfig),
      });
    },

    /**
     * List active alerts
     */
    listAlerts: async () => {
      return fetchAPI('/monitoring/alerts');
    },

    /**
     * Get system logs
     * @param {object} filter - Filter options
     */
    getLogs: async (filter = {}) => {
      const params = new URLSearchParams(filter);
      return fetchAPI(`/monitoring/logs?${params.toString()}`);
    },
  },

  // Auto-Scaling
  scaling: {
    /**
     * Create scaling rule
     * @param {object} ruleConfig - Scaling rule configuration
     */
    createRule: async ruleConfig => {
      return fetchAPI('/autoscaling/rule', {
        method: 'POST',
        body: JSON.stringify(ruleConfig),
      });
    },

    /**
     * List scaling rules
     */
    listRules: async () => {
      return fetchAPI('/autoscaling/rules');
    },

    /**
     * Get scaling recommendations
     * @param {string} resourceId - Resource ID
     */
    getRecommendations: async resourceId => {
      return fetchAPI(`/autoscaling/recommendations/${resourceId}`);
    },

    /**
     * Apply auto-scaling
     * @param {string} resourceId - Resource ID
     * @param {object} scalingConfig - Scaling configuration
     */
    apply: async (resourceId, scalingConfig) => {
      return fetchAPI(`/autoscaling/${resourceId}/apply`, {
        method: 'POST',
        body: JSON.stringify(scalingConfig),
      });
    },
  },

  // System Health
  health: {
    /**
     * Get Phase 32 health status
     */
    getStatus: async () => {
      return fetchAPI('/health');
    },
  },
};

export default phase32DevOps;
