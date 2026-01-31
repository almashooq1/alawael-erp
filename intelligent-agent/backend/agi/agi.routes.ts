// agi.routes.ts
// 🌐 AGI API Routes
// RESTful API for AGI system

import express, { Router, Request, Response } from 'express';
import AGICoreSystem from './agi.core';
import { monitoring } from './monitoring';

const router: Router = express.Router();

// Singleton AGI instance
let agiInstance: AGICoreSystem | null = null;

/**
 * Get or create AGI instance
 */
function getAGI(): AGICoreSystem {
  if (!agiInstance) {
    agiInstance = new AGICoreSystem({
      cognitiveFrequency: 1000,
      maxWorkingMemory: 7,
      learningRate: 0.01,
      explorationRate: 0.1,
    });

    // Setup event logging
    agiInstance.on('process:start', (data) => {
      console.log('🧠 AGI Processing started:', data.input);
    });

    agiInstance.on('process:complete', (data) => {
      console.log('✅ AGI Processing completed:', data.task.id);
    });

    agiInstance.on('task:error', (data) => {
      console.error('❌ AGI Task error:', data.error);
    });

    agiInstance.on('cognitive:cycle', (state) => {
      // Log cognitive state periodically (every 10 seconds)
      const now = Date.now();
      if (!getAGI()['lastCognitiveLog'] || now - getAGI()['lastCognitiveLog'] > 10000) {
        console.log('🔄 Cognitive State:', {
          attention: state.attention.focus,
          concentration: state.attention.concentrationLevel,
          energy: state.energyLevel,
        });
        getAGI()['lastCognitiveLog'] = now;
      }
    });

    console.log('🚀 AGI System initialized');
  }

  return agiInstance;
}

/**
 * POST /api/agi/process
 * Process any input through AGI
 */
router.post('/process', async (req: Request, res: Response) => {
  try {
    const { input, context } = req.body;

    if (!input) {
      return res.status(400).json({
        error: 'Input is required',
      });
    }

    const agi = getAGI();
    const result = await agi.process(input, context);

    res.json({
      success: true,
      result,
      timestamp: new Date(),
    });
  } catch (error: any) {
    console.error('AGI process error:', error);
    res.status(500).json({
      error: error.message,
    });
  }
});

/**
 * POST /api/agi/reason
 * Reasoning task
 */
router.post('/reason', async (req: Request, res: Response) => {
  try {
    const { goal, evidence, method } = req.body;

    if (!goal) {
      return res.status(400).json({
        error: 'Goal is required',
      });
    }

    const agi = getAGI();
    const result = await agi.process(goal, {
      evidence: evidence || [],
      method: method || 'best',
    });

    res.json({
      success: true,
      result,
      timestamp: new Date(),
    });
  } catch (error: any) {
    console.error('AGI reasoning error:', error);
    res.status(500).json({
      error: error.message,
    });
  }
});

/**
 * POST /api/agi/learn
 * Learning task
 */
router.post('/learn', async (req: Request, res: Response) => {
  try {
    const { data, mode } = req.body;

    if (!data) {
      return res.status(400).json({
        error: 'Data is required',
      });
    }

    const agi = getAGI();
    const result = await agi.process(`Learn from: ${JSON.stringify(data)}`, {
      mode: mode || 'self-supervised',
      data,
    });

    res.json({
      success: true,
      result,
      timestamp: new Date(),
    });
  } catch (error: any) {
    console.error('AGI learning error:', error);
    res.status(500).json({
      error: error.message,
    });
  }
});

/**
 * POST /api/agi/decide
 * Decision-making task
 */
router.post('/decide', async (req: Request, res: Response) => {
  try {
    const { situation, options, criteria } = req.body;

    if (!situation) {
      return res.status(400).json({
        error: 'Situation is required',
      });
    }

    const agi = getAGI();
    const result = await agi.process(`Make decision about: ${situation}`, {
      context: { situation },
      options: options || [],
      criteria: criteria || [],
    });

    res.json({
      success: true,
      result,
      timestamp: new Date(),
    });
  } catch (error: any) {
    console.error('AGI decision error:', error);
    res.status(500).json({
      error: error.message,
    });
  }
});

/**
 * POST /api/agi/create
 * Creativity task
 */
router.post('/create', async (req: Request, res: Response) => {
  try {
    const { problem, constraints, outcomes, domain } = req.body;

    if (!problem) {
      return res.status(400).json({
        error: 'Problem is required',
      });
    }

    const agi = getAGI();
    const result = await agi.process(`Create solution for: ${problem}`, {
      constraints: constraints || [],
      outcomes: outcomes || [],
      inspirations: [],
      domain: domain || 'general',
    });

    res.json({
      success: true,
      result,
      timestamp: new Date(),
    });
  } catch (error: any) {
    console.error('AGI creativity error:', error);
    res.status(500).json({
      error: error.message,
    });
  }
});

/**
 * POST /api/agi/plan
 * Planning task
 */
router.post('/plan', async (req: Request, res: Response) => {
  try {
    const { goal, deadline, constraints, resources, horizon } = req.body;

    if (!goal) {
      return res.status(400).json({
        error: 'Goal is required',
      });
    }

    const agi = getAGI();
    const result = await agi.process(`Plan for: ${goal}`, {
      goalType: 'achievement',
      deadline: deadline ? new Date(deadline) : undefined,
      constraints: constraints || [],
      criteria: [],
      dependencies: [],
      resources: resources || [],
      horizon: horizon || 'short_term',
    });

    res.json({
      success: true,
      result,
      timestamp: new Date(),
    });
  } catch (error: any) {
    console.error('AGI planning error:', error);
    res.status(500).json({
      error: error.message,
    });
  }
});

/**
 * GET /api/agi/status
 * Get AGI system status and health with comprehensive monitoring
 */
router.get('/status', (req: Request, res: Response) => {
  try {
    const agi = getAGI();
    
    // Get comprehensive monitoring data
    const health = monitoring.getHealthStatus();
    const componentMetrics = monitoring.getComponentMetrics();

    res.json({
      status: 'active',
      health: health,
      performance: health.metrics.performance,
      resources: health.metrics.resources,
      components: health.components,
      componentMetrics: componentMetrics,
      initialized: !!agiInstance,
      version: '1.0.0',
      uptime: process.uptime(),
      timestamp: new Date(),
    });
  } catch (error: any) {
    console.error('AGI status error:', error);
    res.status(500).json({
      error: error.message,
    });
  }
});

/**
 * GET /api/agi/metrics
 * Get Prometheus-format metrics
 */
router.get('/metrics', (req: Request, res: Response) => {
  try {
    const prometheusMetrics = monitoring.exportPrometheus();
    res.set('Content-Type', 'text/plain');
    res.send(prometheusMetrics);
  } catch (error: any) {
    console.error('AGI metrics error:', error);
    res.status(500).json({
      error: error.message,
    });
  }
});

/**
 * GET /api/agi/health
 * Dedicated health check endpoint for load balancers
 */
router.get('/health', (req: Request, res: Response) => {
  try {
    const health = monitoring.getHealthStatus();
    
    const statusCode = health.status === 'healthy' ? 200 : 
                      health.status === 'degraded' ? 200 : 503;
    
    res.status(statusCode).json({
      status: health.status,
      uptime: health.uptime,
      version: health.version,
      timestamp: health.timestamp
    });
  } catch (error: any) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

/**
 * GET /api/agi/report
 * Get formatted monitoring report
 */
router.get('/report', (req: Request, res: Response) => {
  try {
    const report = monitoring.generateReport();
    res.set('Content-Type', 'text/plain; charset=utf-8');
    res.send(report);
  } catch (error: any) {
    console.error('AGI report error:', error);
    res.status(500).json({
      error: error.message,
    });
  }
});

/**
 * POST /api/agi/reset
 * Reset AGI system
 */
router.post('/reset', (req: Request, res: Response) => {
  try {
    if (agiInstance) {
      agiInstance.removeAllListeners();
      agiInstance = null;
    }

    res.json({
      success: true,
      message: 'AGI system reset successfully',
      timestamp: new Date(),
    });
  } catch (error: any) {
    console.error('AGI reset error:', error);
    res.status(500).json({
      error: error.message,
    });
  }
});

/**
 * GET /api/agi/capabilities
 * Get AGI capabilities
 */
router.get('/capabilities', (req: Request, res: Response) => {
  try {
    res.json({
      capabilities: [
        {
          name: 'Reasoning',
          types: ['deductive', 'inductive', 'abductive', 'analogical', 'causal', 'counterfactual', 'metacognitive'],
          description: 'Multi-layered reasoning with formal logic and evidence-based inference',
        },
        {
          name: 'Continual Learning',
          modes: ['supervised', 'unsupervised', 'reinforcement', 'self-supervised', 'meta-learning', 'transfer', 'multi-task', 'curriculum'],
          description: 'Self-improving adaptive learning with catastrophic forgetting prevention',
        },
        {
          name: 'Autonomous Decision',
          types: ['strategic', 'tactical', 'operational', 'reactive', 'creative', 'ethical'],
          description: 'Self-directed goal-oriented decision making with ethical framework',
        },
        {
          name: 'Creativity & Innovation',
          types: ['combinatorial', 'exploratory', 'transformational', 'emergent', 'analogical', 'serendipitous'],
          description: 'Generative thinking, problem solving, and creative synthesis',
        },
        {
          name: 'Long-term Planning',
          algorithms: ['HTN', 'STRIPS', 'Partial Order', 'MCTS', 'Multi-objective'],
          description: 'Strategic goal decomposition, scheduling, and plan execution',
        },
      ],
      timestamp: new Date(),
    });
  } catch (error: any) {
    console.error('AGI capabilities error:', error);
    res.status(500).json({
      error: error.message,
    });
  }
});

/**
 * Example requests for testing
 */
router.get('/examples', (req: Request, res: Response) => {
  res.json({
    examples: [
      {
        endpoint: '/api/agi/process',
        method: 'POST',
        body: {
          input: 'How can I solve the climate change problem?',
          context: { domain: 'environment' },
        },
        description: 'General AGI processing - automatically classifies and routes to appropriate component',
      },
      {
        endpoint: '/api/agi/reason',
        method: 'POST',
        body: {
          goal: 'Determine if this system is secure',
          evidence: ['Uses HTTPS', 'Has authentication', 'No input validation'],
          method: 'deductive',
        },
        description: 'Reasoning task with evidence and method',
      },
      {
        endpoint: '/api/agi/learn',
        method: 'POST',
        body: {
          data: { patterns: [1, 2, 3, 5, 8, 13] },
          mode: 'unsupervised',
        },
        description: 'Learning task - discovers Fibonacci pattern',
      },
      {
        endpoint: '/api/agi/decide',
        method: 'POST',
        body: {
          situation: 'Choose investment strategy',
          options: ['Stocks', 'Bonds', 'Real Estate', 'Crypto'],
          criteria: ['Risk', 'Return', 'Liquidity'],
        },
        description: 'Decision-making with multiple criteria',
      },
      {
        endpoint: '/api/agi/create',
        method: 'POST',
        body: {
          problem: 'Design a new transportation system for cities',
          constraints: ['Environmentally friendly', 'Cost-effective', 'Scalable'],
          outcomes: ['Reduce traffic', 'Lower emissions', 'Improve accessibility'],
          domain: 'urban-planning',
        },
        description: 'Creative solution generation',
      },
      {
        endpoint: '/api/agi/plan',
        method: 'POST',
        body: {
          goal: 'Launch a successful startup',
          deadline: '2026-12-31',
          constraints: ['Limited budget', 'Small team'],
          resources: [{ type: 'money', amount: 50000, unit: 'USD' }],
          horizon: 'long_term',
        },
        description: 'Long-term strategic planning',
      },
    ],
  });
});

export default router;
