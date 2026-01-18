import { sendAndPersist } from '../send';
import { persistOutboundMessage } from '../persistence';
import { enforceRateLimit } from '../rateLimit';
import fetch from 'node-fetch';

jest.mock('node-fetch');
jest.mock('../persistence');
jest.mock('../rateLimit');

const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('send', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.WHATSAPP_TOKEN = 'test-token';
    process.env.PHONE_NUMBER_ID = '123456';
  });

  it('should enforce rate limit before sending', async () => {
    (enforceRateLimit as jest.Mock).mockResolvedValue(undefined);
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ messages: [{ id: 'wamsg123' }] }),
    } as any);
    (persistOutboundMessage as jest.Mock).mockResolvedValue({ id: 'msg123' });

    await sendAndPersist({ to: '1234567890', body: 'test' });

    expect(enforceRateLimit).toHaveBeenCalledWith('1234567890');
  });

  it('should persist message after sending', async () => {
    (enforceRateLimit as jest.Mock).mockResolvedValue(undefined);
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ messages: [{ id: 'wamsg123' }] }),
    } as any);
    (persistOutboundMessage as jest.Mock).mockResolvedValue({ id: 'msg123' });

    await sendAndPersist({ to: '1234567890', body: 'test' });

    expect(persistOutboundMessage).toHaveBeenCalledWith(
      expect.objectContaining({ to: '1234567890', waMessageId: 'wamsg123' })
    );
  });
});
