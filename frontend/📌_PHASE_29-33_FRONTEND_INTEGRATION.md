# Phase 29-33 Frontend Integration Guide

## Overview

This guide explains how to integrate and use the Phase 29-33 APIs in your React
frontend application.

---

## 📦 Service Files Created

### 1. **phase29-ai.service.js** - Advanced AI Integration

Provides access to LLM providers, autonomous workflows, predictive BI, and
recommendations.

**Main Features:**

- LLM Integration (GPT-4, Claude, Gemini)
- Autonomous Workflow Orchestration
- Predictive Business Intelligence
- AI-Powered Automation
- Intelligent Recommendations

### 2. **phase30-quantum.service.js** - Quantum-Ready Computing

Post-quantum cryptography, QKD, and quantum simulation capabilities.

**Main Features:**

- Post-Quantum Cryptography (Kyber, Dilithium, SPHINCS+)
- Quantum Key Distribution (QKD)
- Quantum Simulation Engine
- Quantum-Safe Transition Tools
- Vulnerability Scanner

### 3. **phase31-xr.service.js** - Extended Reality (XR)

Mixed reality, holographic visualization, and BCI integration.

**Main Features:**

- Mixed Reality Sessions (AR/VR/MR)
- Holographic Data Visualization
- Brain-Computer Interface (BCI)
- Cross-Reality Collaboration
- Immersive Analytics Dashboards

### 4. **phase32-devops.service.js** - Advanced DevOps/MLOps

CI/CD pipelines, Kubernetes orchestration, and ML deployment.

**Main Features:**

- Advanced CI/CD Pipelines
- Kubernetes Orchestration
- ML Model Deployment
- Advanced Monitoring & Observability
- Auto-Scaling Controller

### 5. **phase33-optimization.service.js** - System Optimization

Performance tuning, caching, database optimization, and resource management.

**Main Features:**

- Performance Tuning Engine
- Advanced Caching Strategy
- Database Optimization
- Resource Utilization Optimizer
- Uptime & Reliability Monitoring

---

## 🎣 Hook Files Created

### **usePhase2933.js** - Unified Hook

Provides easy access to all Phase 29-33 functionality with loading and error
states.

---

## 📝 Usage Examples

### Example 1: Using Phase 29 AI Service

```jsx
import { phase29AI } from '@/services/phase29-ai.service';

// In your component
const LLMComponent = () => {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadProviders = async () => {
      try {
        setLoading(true);
        const data = await phase29AI.llm.listProviders();
        setProviders(data);
      } catch (error) {
        console.error('Error loading providers:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProviders();
  }, []);

  const queryLLM = async (providerId, prompt) => {
    try {
      const result = await phase29AI.llm.queryLLM(providerId, prompt);
      console.log('LLM Response:', result);
    } catch (error) {
      console.error('Query failed:', error);
    }
  };

  return (
    <div>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <p>Providers loaded: {providers.length}</p>
      )}
      <button onClick={() => queryLLM('provider-id', 'Hello!')}>
        Query LLM
      </button>
    </div>
  );
};
```

### Example 2: Using usePhase29AI Hook

```jsx
import { usePhase29AI } from '@/hooks/usePhase2933';

const AIWorkflowComponent = () => {
  const { loading, error, workflows } = usePhase29AI();

  const handleCreateWorkflow = async () => {
    try {
      const result = await workflows('createAgent', 'agent-1', {
        name: 'Marketing Workflow',
        tasks: ['analyze', 'optimize'],
      });
      console.log('Workflow created:', result);
    } catch (err) {
      console.error('Failed to create workflow:', err);
    }
  };

  return (
    <div>
      {loading && <p>Processing...</p>}
      {error && <p style={{ color: 'red' }}>Error: {error.message}</p>}
      <button onClick={handleCreateWorkflow} disabled={loading}>
        Create Workflow
      </button>
    </div>
  );
};
```

### Example 3: Using Phase 32 DevOps Service

```jsx
import { phase32DevOps } from '@/services/phase32-devops.service';

const DeploymentComponent = () => {
  const [pipelines, setPipelines] = useState([]);

  useEffect(() => {
    const loadPipelines = async () => {
      try {
        const data = await phase32DevOps.cicd.listPipelines();
        setPipelines(data);
      } catch (error) {
        console.error('Failed to load pipelines:', error);
      }
    };

    loadPipelines();
  }, []);

  const executePipeline = async pipelineId => {
    try {
      const result = await phase32DevOps.cicd.execute(pipelineId);
      console.log('Pipeline execution started:', result);
    } catch (error) {
      console.error('Execution failed:', error);
    }
  };

  return (
    <div>
      <h2>CI/CD Pipelines</h2>
      <ul>
        {pipelines.map(pipeline => (
          <li key={pipeline.id}>
            <span>{pipeline.name}</span>
            <button onClick={() => executePipeline(pipeline.id)}>
              Execute
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};
```

### Example 4: Using usePhase33Optimization Hook

```jsx
import { usePhase33Optimization } from '@/hooks/usePhase2933';

const OptimizationDashboard = () => {
  const { loading, metrics, recommendations, error } = usePhase33Optimization();

  return (
    <div>
      {loading && <p>Loading optimization data...</p>}

      {metrics && (
        <div className="metrics">
          <h3>Performance Metrics</h3>
          <p>CPU: {metrics.cpu}%</p>
          <p>Memory: {metrics.memory}%</p>
          <p>Disk: {metrics.disk}%</p>
        </div>
      )}

      {recommendations && (
        <div className="recommendations">
          <h3>Optimization Recommendations</h3>
          <ul>
            {recommendations.map((rec, idx) => (
              <li key={idx}>{rec.message}</li>
            ))}
          </ul>
        </div>
      )}

      {error && <p style={{ color: 'red' }}>Error: {error.message}</p>}
    </div>
  );
};
```

### Example 5: Using usePhase2933 Unified Hook

```jsx
import { usePhase2933 } from '@/hooks/usePhase2933';

const Phase2933Dashboard = () => {
  const {
    loading,
    error,
    data,
    execute,
    ai,
    quantum,
    xr,
    devops,
    optimization,
  } = usePhase2933();

  const loadAllStatus = async () => {
    try {
      await execute(async () => {
        const results = await Promise.all([
          ai.health.getStatus(),
          quantum.crypto.listAlgorithms(),
          xr.xr.listSessions(),
          devops.kubernetes.listClusters(),
          optimization.performance.getMetrics(),
        ]);
        return results;
      });
    } catch (err) {
      console.error('Failed to load status:', err);
    }
  };

  return (
    <div>
      <h1>Phase 29-33 Dashboard</h1>
      <button onClick={loadAllStatus} disabled={loading}>
        {loading ? 'Loading...' : 'Load All Status'}
      </button>
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      {data && <pre>{JSON.stringify(data, null, 2)}</pre>}
    </div>
  );
};
```

---

## 🔌 API Endpoint Structure

All Phase 29-33 endpoints follow this pattern:

```
Base URL: http://localhost:3001/api/phases-29-33

Phase 29 Endpoints:  /ai/*, /bi/*, /automation/*, /recommendations/*
Phase 30 Endpoints:  /quantum/*, /qkd/*
Phase 31 Endpoints:  /xr/*, /holo/*, /bci/*, /immersive/*
Phase 32 Endpoints:  /cicd/*, /devops/*, /ml/*, /monitoring/*, /autoscaling/*
Phase 33 Endpoints:  /optimization/*, /cache/*, /db/*, /resource/*, /uptime/*, /scaling/*
```

---

## ⚙️ Configuration

### Environment Variables

Add to your `.env` file:

```env
REACT_APP_API_URL=http://localhost:3001/api
```

### API Base URL Override

In individual service files, you can override the base URL:

```javascript
const API_BASE_URL =
  process.env.REACT_APP_API_URL || 'http://localhost:3001/api/phases-29-33';
```

---

## 🚀 Integration Checklist

- [x] Create 5 Service files (phase29-33.service.js)
- [x] Create unified hook (usePhase2933.js)
- [x] Create phase-specific hooks
- [ ] Create UI components for each phase
- [ ] Integrate real-time Socket.IO updates
- [ ] Add error boundary components
- [ ] Create testing suite
- [ ] Deploy to production

---

## 📋 Next Steps

### 1. **Create UI Components**

Create React components that consume these services:

```
/components/Phase29/
  - AIWorkflowBuilder.jsx
  - LLMChat.jsx
  - WorkflowOrchestrator.jsx

/components/Phase30/
  - QuantumKeyManager.jsx
  - CryptoOperations.jsx

/components/Phase31/
  - XRSessionManager.jsx
  - HologramViewer.jsx

/components/Phase32/
  - DeploymentPipeline.jsx
  - KubernetesCluster.jsx
  - MLModelManager.jsx

/components/Phase33/
  - OptimizationDashboard.jsx
  - PerformanceMonitor.jsx
  - ResourceAllocator.jsx
```

### 2. **Set Up Socket.IO Real-time Updates**

```jsx
import io from 'socket.io-client';

const socket = io('http://localhost:3001');

socket.on('kpi:module:reports', data => {
  console.log('Reports KPI update:', data);
});

socket.on('kpi:dashboard', data => {
  console.log('Dashboard update:', data);
});
```

### 3. **Add Error Handling**

Create a global error boundary:

```jsx
const Phase2933ErrorBoundary = ({ children }) => {
  const [error, setError] = useState(null);

  return (
    <ErrorBoundary fallback={<ErrorDisplay error={error} />}>
      {children}
    </ErrorBoundary>
  );
};
```

### 4. **Create Test Suite**

```javascript
// __tests__/phase29-ai.service.test.js
describe('Phase 29 AI Service', () => {
  test('should list LLM providers', async () => {
    const providers = await phase29AI.llm.listProviders();
    expect(providers).toBeDefined();
    expect(Array.isArray(providers)).toBe(true);
  });

  test('should query LLM', async () => {
    const result = await phase29AI.llm.queryLLM('provider-id', 'test prompt');
    expect(result).toBeDefined();
  });
});
```

---

## 🔗 Related Documentation

- [Phase 29-33 Backend Status](./📌_PHASE_29-33_FINAL_STATUS.md)
- [API Reference](http://localhost:3001/api-docs)
- [Backend Routes](../backend/routes/phases-29-33.routes.js)

---

## 💡 Tips & Best Practices

1. **Always use the Hooks** - They handle loading and error states
2. **Wrap async calls in try-catch** - Handle network errors gracefully
3. **Use Socket.IO for real-time data** - Don't poll endpoints repeatedly
4. **Cache results locally** - Use React Query or Redux for state management
5. **Add loading indicators** - Users should see feedback for async operations
6. **Test thoroughly** - Each service has 20+ endpoints to validate
7. **Monitor performance** - Use Phase 33 optimization features

---

## 📞 Support

For issues or questions:

1. Check the [Backend Integration Status](./📌_PHASE_29-33_FINAL_STATUS.md)
2. Review service documentation in each file
3. Test endpoints directly: `curl http://localhost:3001/api/phases-29-33/health`
4. Check browser console for detailed error messages

---

**Status:** ✅ Frontend Integration Files Created  
**Last Updated:** January 24, 2026  
**Version:** 1.0.0
