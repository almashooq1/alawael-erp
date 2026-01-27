// Teams Notifier Module
import fetch from 'node-fetch';
import config from './config';

export async function sendTeamsMessage(text: string) {
  const url = config.get('TEAMS_WEBHOOK_URL');
  if (!url) throw new Error('TEAMS_WEBHOOK_URL not set');
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text })
  });
}
