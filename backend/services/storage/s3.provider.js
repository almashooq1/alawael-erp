'use strict';

/**
 * S3 Storage Provider
 * ═══════════════════
 * تخزين الملفات على AWS S3 أو خدمات متوافقة مع S3.
 */

const crypto = require('crypto');
const logger = require('../../utils/logger');

let S3Client;
let GetObjectCommand;
let PutObjectCommand;
let DeleteObjectCommand;
let HeadObjectCommand;

try {
  ({
    S3Client,
    GetObjectCommand,
    PutObjectCommand,
    DeleteObjectCommand,
    HeadObjectCommand,
  } = require('@aws-sdk/client-s3'));
} catch {
  logger.warn('[Storage:s3] @aws-sdk/client-s3 not installed. S3 provider unavailable.');
}

const BUCKET = process.env.AWS_S3_BUCKET;
const REGION = process.env.AWS_REGION || process.env.AWS_S3_REGION;
const ACCESS_KEY = process.env.AWS_ACCESS_KEY_ID;
const SECRET_KEY = process.env.AWS_SECRET_ACCESS_KEY;

let client = null;

function getClient() {
  if (!S3Client) {
    throw new Error('@aws-sdk/client-s3 is not installed');
  }
  if (!BUCKET || !REGION || !ACCESS_KEY || !SECRET_KEY) {
    throw new Error('S3 credentials are not configured');
  }
  if (!client) {
    client = new S3Client({
      region: REGION,
      credentials: {
        accessKeyId: ACCESS_KEY,
        secretAccessKey: SECRET_KEY,
      },
    });
  }
  return client;
}

async function upload(buffer, fileName, mimeType, options = {}) {
  const checksum = crypto.createHash('sha256').update(buffer).digest('hex');
  const now = new Date();
  const folder =
    options.folder || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const subFolder = options.subFolder || options.purpose || 'documents';
  const ext = (fileName || '').split('.').pop() || 'bin';
  const storedName = options.storedName || `${crypto.randomBytes(16).toString('hex')}.${ext}`;
  const key = `${subFolder}/${folder}/${storedName}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: mimeType || 'application/octet-stream',
    Metadata: {
      checksum,
      originalname: encodeURIComponent(fileName || ''),
    },
  });

  await getClient().send(command);
  logger.info(`[Storage:s3] Uploaded s3://${BUCKET}/${key} (${buffer.length} bytes)`);

  return {
    storagePath: `s3://${BUCKET}/${key}`,
    storageProvider: 's3',
    size: buffer.length,
    checksum,
  };
}

async function download(storagePath) {
  const key = extractKey(storagePath);
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  const response = await getClient().send(command);
  return streamToBuffer(response.Body);
}

async function remove(storagePath) {
  const key = extractKey(storagePath);
  const command = new DeleteObjectCommand({ Bucket: BUCKET, Key: key });
  await getClient().send(command);
  logger.info(`[Storage:s3] Deleted s3://${BUCKET}/${key}`);
  return true;
}

async function exists(storagePath) {
  try {
    const key = extractKey(storagePath);
    const command = new HeadObjectCommand({ Bucket: BUCKET, Key: key });
    await getClient().send(command);
    return true;
  } catch {
    return false;
  }
}

function getUrl(storagePath) {
  const key = extractKey(storagePath);
  return `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
}

function extractKey(storagePath) {
  if (storagePath.startsWith('s3://')) {
    return storagePath.replace(`s3://${BUCKET}/`, '');
  }
  return storagePath;
}

function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', chunk => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

module.exports = {
  upload,
  download,
  delete: remove,
  exists,
  getUrl,
};
