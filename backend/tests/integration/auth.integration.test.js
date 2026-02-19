const request = require('supertest');
const app = require('../../server');

describe('Auth integration', () => {
  beforeAll(() => {
    jest.setTimeout(30000); // Increase timeout for auth operations
  });

  afterAll(async () => {
    try {
      jest.clearAllTimers();
      if (app && app.close) {
        await new Promise(resolve => app.close(resolve));
      }
    } catch (err) {
      // Ignore cleanup errors
    }
  });

  it('registers and logs in a user', async () => {
    const email = `user_${Date.now()}@example.com`;
    const password = 'Test@12345';
    const fullName = 'Test User';

    const registerRes = await request(app).post('/api/auth/register').send({
      email,
      password,
      fullName,
    });

    expect(registerRes.status).toBe(201);
    expect(registerRes.body?.success).toBe(true);

    const loginRes = await request(app).post('/api/auth/login').send({
      email,
      password,
    });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body?.success).toBe(true);
    expect(loginRes.body?.data?.accessToken).toBeTruthy();
  });
});
