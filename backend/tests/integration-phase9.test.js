const IntegrationServiceClass = require('../services/integrationService');
const Integration = require('../models/Integration');

// Mock Mongoose Model
jest.mock('../models/Integration');

// Create instance
const integrationService = new IntegrationServiceClass();

describe('Integration Service (Phase 9)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Setup constructor mock to return the object passed to it
    Integration.mockImplementation(doc => {
      doc.save = jest.fn().mockResolvedValue(doc);
      // Ensure logs array exists if not provided
      if (!doc.logs) doc.logs = [];
      return doc;
    });
  });

  test('configureIntegration should create new integration', async () => {
    Integration.findOne.mockResolvedValue(null);

    // The service does `new Integration({...})`
    // Our mock implementation above ensures `new Integration()` returns the object passed to it, plus the save method.
    // However, if the Service creates it like `new Integration({name...})`, `result` will be that object.

    const result = await integrationService.configureIntegration('Slack', 'WEBHOOK', { url: 'http://test.com' });

    expect(result.name).toBe('Slack');
    expect(result.status).toBe('ACTIVE');
    expect(result.save).toHaveBeenCalled();
  });

  test('configureIntegration should update existing integration', async () => {
    const mockIntegration = {
      name: 'Slack',
      status: 'INACTIVE',
      save: jest.fn().mockResolvedValue(true),
    };
    Integration.findOne.mockResolvedValue(mockIntegration);

    const result = await integrationService.configureIntegration('Slack', 'WEBHOOK', { url: 'http://new-url.com' });

    expect(mockIntegration.status).toBe('ACTIVE');
    expect(mockIntegration.save).toHaveBeenCalled();
  });

  test('triggerWebhook should add log entry on success', async () => {
    const mockIntegration = {
      name: 'TestHook',
      status: 'ACTIVE',
      config: { webhookUrl: 'http://example.com' },
      logs: [],
      save: jest.fn().mockResolvedValue(true),
    };
    Integration.findOne.mockResolvedValue(mockIntegration);

    await integrationService.triggerWebhook('TestHook', { message: 'hello' });

    expect(mockIntegration.logs[0].action).toBe('WEBHOOK_DISPATCH');
    expect(mockIntegration.logs[0].status).toBe('SUCCESS');
    expect(mockIntegration.save).toHaveBeenCalled();
  });

  test('triggerWebhook should fail if integration is inactive', async () => {
    const mockIntegration = {
      name: 'TestHook',
      status: 'INACTIVE',
    };
    Integration.findOne.mockResolvedValue(mockIntegration);

    await expect(integrationService.triggerWebhook('TestHook', {})).rejects.toThrow('Integration not found or inactive');
  });
});
