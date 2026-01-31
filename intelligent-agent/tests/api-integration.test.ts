import { describe, it, expect, vi, beforeEach } from 'vitest';
import { APIIntegration } from '../src/modules/api-integration';
import axios from 'axios';

vi.mock('axios');

describe('APIIntegration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch data from API', async () => {
    const mockGet = vi.mocked(axios.get);
    mockGet.mockResolvedValue({ data: { message: 'success' } } as any);

    const api = new APIIntegration();
    const data = await api.fetchData('https://example.com/api');
    expect(data).toEqual({ message: 'success' });
  });
});
