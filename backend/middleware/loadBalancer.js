/**
 * ⚖️ Dynamic Load Balancing
 *
 * Intelligent routing based on server health and load
 * Supports: Round-robin, Least connections, Weighted
 */

class DynamicLoadBalancer {
  constructor(servers = [], options = {}) {
    this.servers = servers.map((s, i) => ({
      ...s,
      id: s.id || i,
      healthy: true,
      load: 0,
      responseTime: 0,
      requestCount: 0,
      errorCount: 0,
      weight: s.weight || 1,
      lastCheck: Date.now(),
    }));

    this.options = {
      strategy: options.strategy || 'least-connections', // round-robin, least-connections, weighted, response-time
      healthCheckInterval: options.healthCheckInterval || 10000,
      unhealthyThreshold: options.unhealthyThreshold || 5,
      responseTimeWindow: options.responseTimeWindow || 60000,
    };

    this.currentRoundRobin = 0;
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      serverSwitches: 0,
    };

    // Start health checks
    this.startHealthChecks();
  }

  /**
   * Select next server based on strategy
   */
  selectServer() {
    const healthyServers = this.servers.filter(s => s.healthy);

    if (healthyServers.length === 0) {
      console.error('[LoadBalancer] No healthy servers available');
      return null;
    }

    switch (this.options.strategy) {
      case 'round-robin':
        return this.roundRobin(healthyServers);
      case 'least-connections':
        return this.leastConnections(healthyServers);
      case 'weighted':
        return this.weighted(healthyServers);
      case 'response-time':
        return this.responseTime(healthyServers);
      default:
        return healthyServers[0];
    }
  }

  /**
   * Round-robin selection
   */
  roundRobin(servers) {
    const server = servers[this.currentRoundRobin % servers.length];
    this.currentRoundRobin++;
    return server;
  }

  /**
   * Least connections selection
   */
  leastConnections(servers) {
    return servers.reduce((least, server) => {
      return server.load < least.load ? server : least;
    });
  }

  /**
   * Weighted selection
   */
  weighted(servers) {
    const totalWeight = servers.reduce((sum, s) => sum + s.weight, 0);
    let random = Math.random() * totalWeight;

    for (const server of servers) {
      random -= server.weight;
      if (random <= 0) return server;
    }

    return servers[0];
  }

  /**
   * Response time based selection
   */
  responseTime(servers) {
    return servers.reduce((best, server) => {
      return server.responseTime < best.responseTime ? server : best;
    });
  }

  /**
   * Record request metrics
   */
  recordRequest(serverId, duration, success = true) {
    const server = this.servers.find(s => s.id === serverId);
    if (!server) return;

    server.requestCount++;
    this.stats.totalRequests++;

    // Update response time (exponential smoothing)
    const alpha = 0.3;
    server.responseTime = alpha * duration + (1 - alpha) * server.responseTime;

    if (success) {
      this.stats.successfulRequests++;
      server.errorCount = Math.max(0, server.errorCount - 1);
    } else {
      this.stats.failedRequests++;
      server.errorCount++;
    }

    // Check if server should be marked unhealthy
    if (server.errorCount >= this.options.unhealthyThreshold) {
      server.healthy = false;
      console.warn(
        `[LoadBalancer] Server ${server.id} marked unhealthy (${server.errorCount} errors)`
      );
    }
  }

  /**
   * Update server load
   */
  updateLoad(serverId, delta = 1) {
    const server = this.servers.find(s => s.id === serverId);
    if (server) {
      server.load = Math.max(0, server.load + delta);
    }
  }

  /**
   * Start health checks
   */
  startHealthChecks() {
    this.healthCheckTimer = setInterval(() => {
      this.performHealthChecks();
    }, this.options.healthCheckInterval);
  }

  /**
   * Perform health checks on all servers
   */
  async performHealthChecks() {
    for (const server of this.servers) {
      try {
        // Simulate health check (ping endpoint)
        const isHealthy = await this.checkServerHealth(server);

        if (isHealthy) {
          server.healthy = true;
          server.errorCount = 0;
        } else if (!server.healthy) {
          server.errorCount++;
        }
      } catch (error) {
        server.errorCount++;
        if (server.errorCount >= this.options.unhealthyThreshold) {
          server.healthy = false;
        }
      }
    }
  }

  /**
   * Check individual server health
   */
  async checkServerHealth(server) {
    // This would make actual health check requests
    // For now, we simulate it
    return true;
  }

  /**
   * Get server statistics
   */
  getServerStats() {
    return this.servers.map(server => ({
      id: server.id,
      url: server.url,
      healthy: server.healthy,
      load: server.load,
      responseTime: `${server.responseTime.toFixed(2)}ms`,
      requestCount: server.requestCount,
      errorCount: server.errorCount,
      errorRate: ((server.errorCount / Math.max(1, server.requestCount)) * 100).toFixed(2) + '%',
      weight: server.weight,
    }));
  }

  /**
   * Get overall statistics
   */
  getStats() {
    const successRate = (
      (this.stats.successfulRequests / this.stats.totalRequests) * 100 || 0
    ).toFixed(2);

    return {
      totalRequests: this.stats.totalRequests,
      successfulRequests: this.stats.successfulRequests,
      failedRequests: this.stats.failedRequests,
      successRate: `${successRate}%`,
      serverSwitches: this.stats.serverSwitches,
      strategy: this.options.strategy,
      healthyServers: this.servers.filter(s => s.healthy).length,
      totalServers: this.servers.length,
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      serverSwitches: 0,
    };
  }

  /**
   * Stop load balancer
   */
  stop() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
  }
}

/**
 * Express middleware for load balancing
 */
function loadBalancingMiddleware(loadBalancer) {
  return (req, res, next) => {
    const server = loadBalancer.selectServer();

    if (!server) {
      return res.status(503).json({
        success: false,
        message: 'No available servers',
      });
    }

    // Attach server info to request
    req.selectedServer = server;
    loadBalancer.updateLoad(server.id, 1);

    const startTime = Date.now();

    // Track response
    const originalSend = res.send.bind(res);
    res.send = function (data) {
      const duration = Date.now() - startTime;
      const success = res.statusCode < 400;

      loadBalancer.recordRequest(server.id, duration, success);
      loadBalancer.updateLoad(server.id, -1);

      return originalSend(data);
    };

    // Add server info to response headers
    res.set('X-Served-By', server.id);
    res.set('X-Server-Load', server.load);

    next();
  };
}

module.exports = {
  DynamicLoadBalancer,
  loadBalancingMiddleware,
};
