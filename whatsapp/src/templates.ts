import { prisma } from './infra/prisma';
import { logger } from './infra/logger';

export interface TemplateInput {
  name: string;
  locale: string;
  category: 'service' | 'marketing' | 'authentication';
  body: string;
  variables?: string[];
}

export async function createTemplate(input: TemplateInput) {
  return prisma.template.create({
    data: { ...input, status: 'pending', variables: input.variables || [] },
  });
}

export async function listTemplates(locale?: string, status?: string) {
  return prisma.template.findMany({
    where: {
      ...(locale && { locale }),
      ...(status && { status }),
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getTemplateByName(name: string) {
  return prisma.template.findUnique({ where: { name } });
}

export async function approveTemplate(id: string) {
  logger.info({ templateId: id }, 'Approving template');
  return prisma.template.update({ where: { id }, data: { status: 'approved' } });
}

export async function rejectTemplate(id: string) {
  logger.info({ templateId: id }, 'Rejecting template');
  return prisma.template.update({ where: { id }, data: { status: 'rejected' } });
}
