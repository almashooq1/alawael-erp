const puppeteer = require('puppeteer');

describe('E2E smoke', () => {
  const baseUrl = process.env.E2E_BASE_URL;

  if (!baseUrl) {
    it('skips when E2E_BASE_URL is not set', () => {
      expect(true).toBe(true);
    });
    return;
  }

  it('loads the health endpoint', async () => {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();

    const response = await page.goto(`${baseUrl}/api/test`, {
      waitUntil: 'networkidle2',
    });

    expect(response.status()).toBe(200);
    await browser.close();
  }, 30000);
});
