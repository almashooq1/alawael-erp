import { prisma } from './infra/prisma';
import { logger } from './infra/logger';

export interface MediaInput {
  messageId: string;
  type: 'image' | 'video' | 'document' | 'audio';
  url?: string;
  mimeType?: string;
  fileSize?: number;
}

export async function createMedia(input: MediaInput) {
  return prisma.media.create({ data: input });
}

export async function getMediaByMessageId(messageId: string) {
  return prisma.media.findUnique({ where: { messageId } });
}

export async function listMediaByType(type: string) {
  return prisma.media.findMany({ where: { type } });
}

export function getMediaUploadUrl(type: string): string {
  // Return a placeholder for file upload (integrate with S3/Cloudinary later)
  return `https://api.example.com/upload?type=${type}`;
}
