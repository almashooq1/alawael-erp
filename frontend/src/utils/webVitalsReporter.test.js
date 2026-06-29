/**
 * Tests for Web Vitals Reporter
 */

describe('webVitalsReporter', () => {
  beforeEach(() => {
    delete window.__ALAWAEL_SESSION_ID__;
    vi.stubEnv('REACT_APP_PERFORMANCE_MONITORING_ENABLED', 'true');
    vi.stubEnv('REACT_APP_WEB_VITALS_SAMPLE_RATE', '1.0');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('starts reporting when enabled', async () => {
    const { startWebVitalsReporting } = await import('./webVitalsReporter');
    expect(startWebVitalsReporting()).toBe(true);
  });

  it('does not start when disabled', async () => {
    vi.stubEnv('REACT_APP_PERFORMANCE_MONITORING_ENABLED', 'false');
    const { startWebVitalsReporting } = await import('./webVitalsReporter');
    expect(startWebVitalsReporting()).toBe(false);
  });
});
