// وحدة إعدادات النظام (Config)

const config = {
  get(key: string, def?: any): any {
    return process.env[key] || def;
  },
  SLACK_WEBHOOK_URL: process.env.SLACK_WEBHOOK_URL,
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
};

export default config;
