// report-notifiers.ts
import { sendSlackMessage } from './slack-notifier';
import { sendTeamsMessage } from './teams-notifier';

export async function sendReportToSlack(text: string, webhookUrl?: string) {
  if (webhookUrl) {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
  } else {
    await sendSlackMessage(text);
  }
}

export async function sendReportToTeams(text: string, webhookUrl?: string) {
  if (webhookUrl) {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
  } else {
    await sendTeamsMessage(text);
  }
}
