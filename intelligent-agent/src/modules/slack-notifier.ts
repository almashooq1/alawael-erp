// Slack Notifier Module
import fetch from 'node-fetch';
import config from './config';

export async function sendSlackMessage(text: string) {
  const url = config.SLACK_WEBHOOK_URL;
  if (!url) throw new Error('SLACK_WEBHOOK_URL not set');
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text })
  });
}
