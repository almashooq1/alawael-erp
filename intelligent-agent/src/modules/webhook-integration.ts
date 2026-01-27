import axios from 'axios';

export async function sendWebhook({ url, event, data }: { url: string; event: string; data: any }) {
  await axios.post(url, { event, data });
}
