// مراقبة الأداء (Prometheus metrics)
import client from 'prom-client';
import express from 'express';

const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics();

export function setupMonitoring(app: express.Application) {
  app.get('/metrics', async (req, res) => {
    res.set('Content-Type', client.register.contentType);
    res.end(await client.register.metrics());
  });
}
