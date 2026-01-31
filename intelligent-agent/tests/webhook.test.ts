import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Webhook } from '../src/modules/webhook';
import axios from 'axios';

vi.mock('axios');

describe('Webhook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should send webhook', async () => {
    const mockPost = vi.mocked(axios.post);
    mockPost.mockResolvedValue({ data: { status: 'ok' } } as any);

    const webhook = new Webhook();
    const res = await webhook.send('https://webhook.site/xxx', { test: true });
    expect(res.data.status).toBe('ok');
  });
});
