"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTemplate = createTemplate;
exports.listTemplates = listTemplates;
exports.getTemplateByName = getTemplateByName;
exports.approveTemplate = approveTemplate;
exports.rejectTemplate = rejectTemplate;
const prisma_1 = require("./infra/prisma");
const logger_1 = require("./infra/logger");
async function createTemplate(input) {
    return prisma_1.prisma.template.create({
        data: { ...input, status: 'pending', variables: input.variables || [] },
    });
}
async function listTemplates(locale, status) {
    return prisma_1.prisma.template.findMany({
        where: {
            ...(locale && { locale }),
            ...(status && { status }),
        },
        orderBy: { createdAt: 'desc' },
    });
}
async function getTemplateByName(name) {
    return prisma_1.prisma.template.findUnique({ where: { name } });
}
async function approveTemplate(id) {
    logger_1.logger.info({ templateId: id }, 'Approving template');
    return prisma_1.prisma.template.update({ where: { id }, data: { status: 'approved' } });
}
async function rejectTemplate(id) {
    logger_1.logger.info({ templateId: id }, 'Rejecting template');
    return prisma_1.prisma.template.update({ where: { id }, data: { status: 'rejected' } });
}
