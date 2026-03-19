/**
 * Slack Integration Service
 * Sends notifications and reports to Slack channels
 */

const axios = require('axios');

class SlackService {
  constructor() {
    this.webhookUrl = process.env.SLACK_WEBHOOK_URL || '';
    this.channel = process.env.SLACK_CHANNEL || '#quality-alerts';
    this.botName = process.env.SLACK_BOT_NAME || 'Quality Dashboard';
    this.enabled = !!this.webhookUrl;

    if (!this.enabled) {
      console.log('⚠️  Slack integration disabled (no webhook URL configured)');
    }
  }

  /**
   * Send a basic message to Slack
   */
  async sendMessage(text, options = {}) {
    if (!this.enabled) {
      console.log('📝 [Slack - Disabled]:', text);
      return { success: false, error: 'Slack not configured' };
    }

    try {
      const payload = {
        channel: options.channel || this.channel,
        username: options.username || this.botName,
        icon_emoji: options.icon || ':robot_face:',
        text,
        ...options,
      };

      const response = await axios.post(this.webhookUrl, payload);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('❌ Failed to send Slack message:', error.message);
      return { success: false, error: 'حدث خطأ داخلي' };
    }
  }

  /**
   * Send a rich message with blocks
   */
  async sendBlocks(blocks, text, options = {}) {
    if (!this.enabled) {
      console.log('📝 [Slack - Disabled]:', text);
      return { success: false, error: 'Slack not configured' };
    }

    try {
      const payload = {
        channel: options.channel || this.channel,
        username: options.username || this.botName,
        icon_emoji: options.icon || ':robot_face:',
        text, // Fallback text
        blocks,
        ...options,
      };

      const response = await axios.post(this.webhookUrl, payload);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('❌ Failed to send Slack blocks:', error.message);
      return { success: false, error: 'حدث خطأ داخلي' };
    }
  }

  /**
   * Notify about test failure
   */
  async notifyTestFailure(service, details) {
    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '❌ Test Failure Alert',
          emoji: true,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Service:*\n${service}`,
          },
          {
            type: 'mrkdwn',
            text: `*Status:*\n${details.status || 'Failed'}`,
          },
          {
            type: 'mrkdwn',
            text: `*Tests:*\n${details.totalTests || 0}`,
          },
          {
            type: 'mrkdwn',
            text: `*Failed:*\n${details.failedTests || 0}`,
          },
        ],
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Error:*\n${details.error || 'Unknown error'}`,
        },
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `⏰ ${new Date().toLocaleString('ar-SA')}`,
          },
        ],
      },
    ];

    if (details.dashboardUrl) {
      blocks.push({
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'View Dashboard',
              emoji: true,
            },
            url: details.dashboardUrl,
            style: 'danger',
          },
        ],
      });
    }

    return this.sendBlocks(blocks, `Test failure: ${service}`);
  }

  /**
   * Notify about test success
   */
  async notifyTestSuccess(service, details) {
    const blocks = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `✅ *${service}* - All tests passed\n${details.totalTests || 0} tests | ${details.duration || 0}s`,
        },
      },
    ];

    return this.sendBlocks(blocks, `Test success: ${service}`);
  }

  /**
   * Send daily summary report
   */
  async sendDailySummary(summary) {
    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '📊 Daily Quality Report',
          emoji: true,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Total Tests:*\n${summary.totalTests || 0}`,
          },
          {
            type: 'mrkdwn',
            text: `*Success Rate:*\n${summary.successRate || 0}%`,
          },
          {
            type: 'mrkdwn',
            text: `*Services:*\n${summary.totalServices || 0}`,
          },
          {
            type: 'mrkdwn',
            text: `*Failed:*\n${summary.failedServices || 0}`,
          },
        ],
      },
    ];

    // Add services breakdown
    if (summary.services && summary.services.length > 0) {
      const servicesList = summary.services
        .map(s => {
          const icon = s.status === 'passed' ? '✅' : '❌';
          return `${icon} *${s.name}*: ${s.passed}/${s.total} tests`;
        })
        .join('\n');

      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Services Status:*\n${servicesList}`,
        },
      });
    }

    // Add trend indicator
    if (summary.trend) {
      const trendIcon = summary.trend === 'up' ? '📈' : summary.trend === 'down' ? '📉' : '➡️';
      blocks.push({
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `${trendIcon} Trend: ${summary.trendText || 'Stable'}`,
          },
        ],
      });
    }

    if (summary.dashboardUrl) {
      blocks.push({
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'View Dashboard',
              emoji: true,
            },
            url: summary.dashboardUrl,
            style: 'primary',
          },
        ],
      });
    }

    blocks.push({
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `📅 ${new Date().toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`,
        },
      ],
    });

    return this.sendBlocks(blocks, 'Daily quality report');
  }

  /**
   * Send system health alert
   */
  async sendHealthAlert(health) {
    const icon = health.status === 'healthy' ? '💚' : health.status === 'degraded' ? '💛' : '❤️';
    const color =
      health.status === 'healthy' ? 'good' : health.status === 'degraded' ? 'warning' : 'danger';

    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${icon} System Health Alert`,
          emoji: true,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Status:*\n${health.status.toUpperCase()}`,
          },
          {
            type: 'mrkdwn',
            text: `*Health Score:*\n${health.score || 0}%`,
          },
          {
            type: 'mrkdwn',
            text: `*Services Up:*\n${health.servicesUp || 0}/${health.totalServices || 0}`,
          },
          {
            type: 'mrkdwn',
            text: `*Avg Success:*\n${health.avgSuccessRate || 0}%`,
          },
        ],
      },
    ];

    if (health.issues && health.issues.length > 0) {
      const issuesList = health.issues.map(i => `• ${i}`).join('\n');
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Issues:*\n${issuesList}`,
        },
      });
    }

    return this.sendBlocks(blocks, `System health: ${health.status}`, { attachments: [{ color }] });
  }

  /**
   * Send custom alert
   */
  async sendAlert(title, message, severity = 'info') {
    const icons = {
      info: 'ℹ️',
      warning: '⚠️',
      error: '❌',
      success: '✅',
    };

    const colors = {
      info: '#36a64f',
      warning: '#ff9900',
      error: '#ff0000',
      success: '#36a64f',
    };

    const blocks = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `${icons[severity] || 'ℹ️'} *${title}*\n${message}`,
        },
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `⏰ ${new Date().toLocaleString('ar-SA')}`,
          },
        ],
      },
    ];

    return this.sendBlocks(blocks, title, { attachments: [{ color: colors[severity] }] });
  }

  /**
   * Interactive command: Run tests
   */
  async sendRunTestsRequest(services) {
    const blocks = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '🧪 *Run Quality Tests*\nSelect services to test:',
        },
      },
      {
        type: 'actions',
        elements: services.slice(0, 5).map(service => ({
          type: 'button',
          text: {
            type: 'plain_text',
            text: service,
            emoji: true,
          },
          value: service,
          action_id: `run_test_${service}`,
        })),
      },
    ];

    return this.sendBlocks(blocks, 'Run quality tests');
  }
}

// Create singleton instance
const slackService = new SlackService();

module.exports = slackService;
