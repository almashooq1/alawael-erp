import { createTemplate, listTemplates, getTemplateByName, approveTemplate, rejectTemplate } from '../templates';
import { prisma } from '../infra/prisma';

jest.mock('../infra/prisma', () => ({
  prisma: {
    template: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

describe('templates', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createTemplate', () => {
    it('should create template with pending status', async () => {
      const mockTemplate = { id: '123', name: 'greet', locale: 'en', category: 'service', body: 'Hi', status: 'pending', variables: [], createdAt: new Date(), updatedAt: new Date() };
      (prisma.template.create as jest.Mock).mockResolvedValue(mockTemplate);

      const result = await createTemplate({ name: 'greet', locale: 'en', category: 'service', body: 'Hi' });

      expect(result).toEqual(mockTemplate);
      expect(prisma.template.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'pending' }) })
      );
    });
  });

  describe('listTemplates', () => {
    it('should list templates with filters', async () => {
      const mockTemplates = [{ id: '1', name: 'test', locale: 'en', status: 'approved' }];
      (prisma.template.findMany as jest.Mock).mockResolvedValue(mockTemplates);

      const result = await listTemplates('en', 'approved');

      expect(result).toEqual(mockTemplates);
      expect(prisma.template.findMany).toHaveBeenCalled();
    });
  });

  describe('approveTemplate', () => {
    it('should update status to approved', async () => {
      const mockTemplate = { id: '123', status: 'approved' };
      (prisma.template.update as jest.Mock).mockResolvedValue(mockTemplate);

      const result = await approveTemplate('123');

      expect(result.status).toBe('approved');
    });
  });
});
