const IntegrationServiceClass = require('../services/integrationService');
const Integration = require('../models/Integration');

// Mock Mongoose Model
jest.mock('../models/Integration');

// Create instance
const service = new IntegrationServiceClass();

describe('Phase 9: Integrations Hub', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Configuration Management', () => {
    test('configureIntegration should create new if not exists', async () => {
      Integration.findOne.mockResolvedValue(null);

      // Mock save on instance
      const saveMock = jest.fn();
      Integration.mockImplementation(data => ({
        ...data,
        save: saveMock,
      }));

      const config = { webhookUrl: 'http://test.com' };
      const result = await service.configureIntegration('TestHook', 'WEBHOOK', config);

      expect(Integration.findOne).toHaveBeenCalledWith({ name: 'TestHook' });
      expect(result.name).toBe('TestHook');
      expect(result.type).toBe('WEBHOOK');
      expect(result.status).toBe('ACTIVE');
      expect(saveMock).toHaveBeenCalled();
    });

    test('configureIntegration should update if exists', async () => {
      const existingMock = {
        name: 'TestHook',
        type: 'OLD',
        config: {},
        status: 'INACTIVE',
        save: jest.fn(),
      };
      Integration.findOne.mockResolvedValue(existingMock);

      const newConfig = { key: '123' };
      await service.configureIntegration('TestHook', 'API', newConfig);

      expect(existingMock.type).toBe('API');
      expect(existingMock.config.key).toBe('123');
      expect(existingMock.status).toBe('ACTIVE');
      expect(existingMock.save).toHaveBeenCalled();
    });
  });

  describe('Webhook Triggering', () => {
    test('triggerWebhook should add log and update timestamp', async () => {
      const mockInt = {
        name: 'Webhook1',
        status: 'ACTIVE',
        config: { webhookUrl: 'http://test.com/hook' },
        logs: [],
        save: jest.fn(),
      };
      Integration.findOne.mockResolvedValue(mockInt);

      const payload = { event: 'user_created' };
      const result = await service.triggerWebhook('Webhook1', payload);

      expect(result.success).toBe(true);
      expect(mockInt.logs).toHaveLength(1);
      expect(mockInt.logs[0].action).toBe('WEBHOOK_DISPATCH');
      expect(mockInt.logs[0].status).toBe('SUCCESS');
      expect(mockInt.lastSync).toBeDefined();
      expect(mockInt.save).toHaveBeenCalled();
    });

    test('triggerWebhook should throw if integration not found', async () => {
      Integration.findOne.mockResolvedValue(null);
      await expect(service.triggerWebhook('Missing', {})).rejects.toThrow('Integration not found');
    });
  });
});
