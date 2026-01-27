import { Webhook } from '../src/modules/webhook';

jest.mock('axios', () => ({
  post: jest.fn(() => Promise.resolve({ data: { status: 'ok' } }))
}));

describe('Webhook', () => {
  it('should send webhook', async () => {
    const webhook = new Webhook();
    const res = await webhook.send('https://webhook.site/xxx', { test: true });
    expect(res.data.status).toBe('ok');
  });
});
