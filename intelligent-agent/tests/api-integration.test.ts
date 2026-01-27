import { APIIntegration } from '../src/modules/api-integration';

jest.mock('axios', () => ({
  get: jest.fn(() => Promise.resolve({ data: { message: 'success' } }))
}));

describe('APIIntegration', () => {
  it('should fetch data from API', async () => {
    const api = new APIIntegration();
    const data = await api.fetchData('https://example.com/api');
    expect(data).toEqual({ message: 'success' });
  });
});
