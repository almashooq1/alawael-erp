"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const templates_1 = require("../templates");
const prisma_1 = require("../infra/prisma");
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
            prisma_1.prisma.template.create.mockResolvedValue(mockTemplate);
            const result = await (0, templates_1.createTemplate)({ name: 'greet', locale: 'en', category: 'service', body: 'Hi' });
            expect(result).toEqual(mockTemplate);
            expect(prisma_1.prisma.template.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'pending' }) }));
        });
    });
    describe('listTemplates', () => {
        it('should list templates with filters', async () => {
            const mockTemplates = [{ id: '1', name: 'test', locale: 'en', status: 'approved' }];
            prisma_1.prisma.template.findMany.mockResolvedValue(mockTemplates);
            const result = await (0, templates_1.listTemplates)('en', 'approved');
            expect(result).toEqual(mockTemplates);
            expect(prisma_1.prisma.template.findMany).toHaveBeenCalled();
        });
    });
    describe('approveTemplate', () => {
        it('should update status to approved', async () => {
            const mockTemplate = { id: '123', status: 'approved' };
            prisma_1.prisma.template.update.mockResolvedValue(mockTemplate);
            const result = await (0, templates_1.approveTemplate)('123');
            expect(result.status).toBe('approved');
        });
    });
});
