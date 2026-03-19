/**
 * Scheduler Service
 * Handles scheduled tasks like daily reports
 */

const cron = require('node-cron');
const qualityService = require('./quality');

class Scheduler {
  constructor() {
    this.tasks = [];
    this.enabled = process.env.ENABLE_SCHEDULER !== 'false';
  }

  /**
   * Start all scheduled tasks
   */
  start() {
    if (!this.enabled) {
      console.log('⏰ Scheduler disabled');
      return;
    }

    console.log('⏰ Starting scheduler...');

    // Daily summary at 9 AM (every day)
    const dailySummary = cron.schedule(
      '0 9 * * *',
      async () => {
        console.log('📊 Running scheduled daily summary...');
        try {
          await qualityService.sendDailySummary();
          console.log('✅ Daily summary sent successfully');
        } catch (error) {
          console.error('❌ Failed to send daily summary:', error);
        }
      },
      {
        scheduled: true,
        timezone: 'Asia/Riyadh',
      }
    );

    this.tasks.push({ name: 'daily-summary', task: dailySummary });

    // Weekly comprehensive report (Sunday at 10 AM)
    const weeklyReport = cron.schedule(
      '0 10 * * 0',
      async () => {
        console.log('📊 Running scheduled weekly report...');
        // Weekly report logic here (can be implemented later)
      },
      {
        scheduled: true,
        timezone: 'Asia/Riyadh',
      }
    );

    this.tasks.push({ name: 'weekly-report', task: weeklyReport });

    // Health check every hour
    const healthCheck = cron.schedule(
      '0 * * * *',
      async () => {
        console.log('🏥 Running scheduled health check...');
        try {
          const services = await qualityService.getAllServicesStatus();
          const health = qualityService.calculateSystemHealth(services);

          if (health === 'critical') {
            const slackService = require('../integrations/slack');
            const failedServices = services.filter(s => s.status === 'fail');

            await slackService.sendHealthAlert({
              status: 'critical',
              score: 0,
              servicesUp: services.length - failedServices.length,
              totalServices: services.length,
              issues: failedServices.map(s => `${s.name}: ${s.error || 'Failed'}`),
            });
          }
        } catch (error) {
          console.error('❌ Health check failed:', error);
        }
      },
      {
        scheduled: true,
        timezone: 'Asia/Riyadh',
      }
    );

    this.tasks.push({ name: 'health-check', task: healthCheck });

    console.log(`✅ ${this.tasks.length} scheduled tasks started`);
    this.tasks.forEach(t => console.log(`   - ${t.name}`));
  }

  /**
   * Stop all scheduled tasks
   */
  stop() {
    console.log('⏰ Stopping scheduler...');
    this.tasks.forEach(({ name, task }) => {
      task.stop();
      console.log(`   - ${name} stopped`);
    });
    this.tasks = [];
  }

  /**
   * Get status of all tasks
   */
  getStatus() {
    return this.tasks.map(({ name, task }) => ({
      name,
      running: task.running,
    }));
  }

  /**
   * Manually trigger a task
   */
  async triggerTask(taskName) {
    switch (taskName) {
      case 'daily-summary':
        return await qualityService.sendDailySummary();

      case 'health-check':
        const services = await qualityService.getAllServicesStatus();
        const health = qualityService.calculateSystemHealth(services);
        return { health, services: services.length };

      default:
        throw new Error(`Unknown task: ${taskName}`);
    }
  }
}

// Create singleton instance
const scheduler = new Scheduler();

module.exports = scheduler;
