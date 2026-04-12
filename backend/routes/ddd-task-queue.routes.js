'use strict';
/**
 * TaskQueue Routes
 * Auto-extracted from services/dddTaskQueue.js
 * 9 endpoints — Auth required on all
 */

const { Router } = require('express');
const router = Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

const { getQueueDashboard, enqueueJob, cancelJob, retryDeadJob, purgeDeadJobs } = require('../services/dddTaskQueue');
const { DDDJob } = require('../models/DddTaskQueue');
const { validate } = require('../middleware/validate');
const v = require('../validations/task-queue.validation');

  router.get('/queue/dashboard', authenticate, async (_req, res) => {
    try {
    res.json({ success: true, ...(await getQueueDashboard()) });
    } catch (e) {
      safeError(res, e, 'task-queue');
    }
  });

  router.get('/queue/jobs', authenticate, async (req, res) => {
    try {
    const query = { isDeleted: { $ne: true } };
    if (req.query.queue) query.queue = req.query.queue;
    if (req.query.type) query.type = req.query.type;
    if (req.query.status) query.status = req.query.status;
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const jobs = await DDDJob.find(query).sort({ createdAt: -1 }).limit(limit).lean();
    res.json({ success: true, count: jobs.length, jobs });
    } catch (e) {
      safeError(res, e, 'task-queue');
    }
  });

  router.post('/queue/jobs', authenticate, validate(v.createJob), async (req, res) => {
    try {
    const job = await enqueueJob({ ...req.body, userId: req.user?._id });
    res.status(201).json({ success: true, job });
    } catch (e) {
      safeError(res, e, 'task-queue');
    }
  });

  router.get('/queue/jobs/:id', authenticate, async (req, res) => {
    try {
    const job = await DDDJob.findById(req.params.id).lean();
    if (!job) return res.status(404).json({ success: false, error: 'Job not found' });
    res.json({ success: true, job });
    } catch (e) {
      safeError(res, e, 'task-queue');
    }
  });

  router.post('/queue/jobs/:id/cancel', authenticate, async (req, res) => {
    try {
    const job = await cancelJob(req.params.id);
    res.json({ success: true, job });
    } catch (e) {
      safeError(res, e, 'task-queue');
    }
  });

  router.post('/queue/jobs/:id/retry', authenticate, async (req, res) => {
    try {
    const job = await retryDeadJob(req.params.id);
    if (!job)
    return res.status(400).json({ success: false, error: 'Job not eligible for retry' });
    res.json({ success: true, job });
    } catch (e) {
      safeError(res, e, 'task-queue');
    }
  });

  router.get('/queue/dead-letter', authenticate, async (req, res) => {
    try {
    const query = { status: 'dead', isDeleted: { $ne: true } };
    if (req.query.queue) query.queue = req.query.queue;
    const jobs = await DDDJob.find(query).sort({ completedAt: -1 }).limit(50).lean();
    res.json({ success: true, count: jobs.length, jobs });
    } catch (e) {
      safeError(res, e, 'task-queue');
    }
  });

  router.delete('/queue/dead-letter', authenticate, async (req, res) => {
    try {
    const days = parseInt(req.query.olderThanDays, 10) || 30;
    const result = await purgeDeadJobs(req.query.queue, days);
    res.json({ success: true, ...result });
    } catch (e) {
      safeError(res, e, 'task-queue');
    }
  });

  router.get('/queue/definitions', authenticate, async (_req, res) => {
    try {
      res.json({ success: true });
    } catch (e) {
      safeError(res, e, 'task-queue');
    }
  });

module.exports = router;
