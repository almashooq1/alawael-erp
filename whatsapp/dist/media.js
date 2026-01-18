"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMedia = createMedia;
exports.getMediaByMessageId = getMediaByMessageId;
exports.listMediaByType = listMediaByType;
exports.getMediaUploadUrl = getMediaUploadUrl;
const prisma_1 = require("./infra/prisma");
async function createMedia(input) {
    return prisma_1.prisma.media.create({ data: input });
}
async function getMediaByMessageId(messageId) {
    return prisma_1.prisma.media.findUnique({ where: { messageId } });
}
async function listMediaByType(type) {
    return prisma_1.prisma.media.findMany({ where: { type } });
}
function getMediaUploadUrl(type) {
    // Return a placeholder for file upload (integrate with S3/Cloudinary later)
    return `https://api.example.com/upload?type=${type}`;
}
