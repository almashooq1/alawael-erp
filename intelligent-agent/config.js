// Default config for intelligent-agent
module.exports = {
  email: {
    from: 'noreply@example.com',
    smtp: {
      host: 'localhost',
      port: 1025,
      secure: false,
      auth: { user: '', pass: '' },
    },
  },
  notifications: {
    slackWebhookUrl: '',
    teamsWebhookUrl: '',
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
  },
};
