/**
 * fileUtils — File handling helpers.
 * أدوات التعامل مع الملفات
 */

/** Allowed MIME types by category */
export const ALLOWED_MIME_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
  document: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
  ],
  video: ['video/mp4', 'video/webm', 'video/ogg'],
  audio: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm'],
};

/** Max file sizes in bytes */
export const MAX_FILE_SIZES = {
  image: 5 * 1024 * 1024, // 5 MB
  document: 20 * 1024 * 1024, // 20 MB
  video: 100 * 1024 * 1024, // 100 MB
  audio: 20 * 1024 * 1024, // 20 MB
  default: 10 * 1024 * 1024, // 10 MB
};

/**
 * Format file size to human-readable Arabic string.
 * @param {number} bytes
 * @returns {string}
 */
export const formatFileSize = bytes => {
  if (!bytes || bytes === 0) return '0 بایت';
  const units = ['بایت', 'كيلوبایت', 'ميجابایت', 'جيجابایت'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const size = parseFloat((bytes / Math.pow(k, i)).toFixed(2));
  return `${size} ${units[i] || units[0]}`;
};

/**
 * Get file extension from filename or path.
 * @param {string} filename
 * @returns {string} Lowercase extension without dot
 */
export const getFileExtension = filename => {
  if (!filename) return '';
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop().toLowerCase() : '';
};

/**
 * Get file category from MIME type or extension.
 * @param {string} mimeOrFilename
 * @returns {'image'|'document'|'video'|'audio'|'unknown'}
 */
export const getFileCategory = mimeOrFilename => {
  if (!mimeOrFilename) return 'unknown';
  const mime = mimeOrFilename.includes('/') ? mimeOrFilename : getMimeType(mimeOrFilename);
  for (const [category, types] of Object.entries(ALLOWED_MIME_TYPES)) {
    if (types.includes(mime)) return category;
  }
  return 'unknown';
};

/**
 * Get MIME type from file extension.
 * @param {string} filename
 * @returns {string}
 */
export const getMimeType = filename => {
  const ext = getFileExtension(filename);
  const mimeMap = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    txt: 'text/plain',
    csv: 'text/csv',
    mp4: 'video/mp4',
    webm: 'video/webm',
    ogg: 'video/ogg',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
  };
  return mimeMap[ext] || 'application/octet-stream';
};

/**
 * Validate file against allowed types and max size.
 * @param {File} file
 * @param {object} [options]
 * @param {string[]} [options.allowedTypes] — MIME types
 * @param {number} [options.maxSize] — Max size in bytes
 * @returns {{ valid: boolean, error?: string }}
 */
export const validateFile = (file, options = {}) => {
  if (!file) return { valid: false, error: 'لم يتم اختيار ملف' };

  const category = getFileCategory(file.type || file.name);
  const allowedTypes = options.allowedTypes || Object.values(ALLOWED_MIME_TYPES).flat();
  const maxSize = options.maxSize || MAX_FILE_SIZES[category] || MAX_FILE_SIZES.default;

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `نوع الملف غير مسموح: ${file.type || getFileExtension(file.name)}`,
    };
  }
  if (file.size > maxSize) {
    return { valid: false, error: `حجم الملف يتجاوز الحد المسموح: ${formatFileSize(maxSize)}` };
  }
  return { valid: true };
};

/**
 * Create an object URL for file preview.
 * @param {File|Blob} file
 * @returns {string}
 */
export const createPreviewUrl = file => {
  if (!file) return '';
  return URL.createObjectURL(file);
};

/**
 * Revoke an object URL to free memory.
 * @param {string} url
 */
export const revokePreviewUrl = url => {
  if (url && url.startsWith('blob:')) URL.revokeObjectURL(url);
};

/**
 * Read a file as Base64 data URL.
 * @param {File} file
 * @returns {Promise<string>}
 */
export const readAsDataUrl = file => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('فشل في قراءة الملف'));
    reader.readAsDataURL(file);
  });
};

/**
 * Read a file as text.
 * @param {File} file
 * @param {string} [encoding='UTF-8']
 * @returns {Promise<string>}
 */
export const readAsText = (file, encoding = 'UTF-8') => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('فشل في قراءة الملف'));
    reader.readAsText(file, encoding);
  });
};

/**
 * Get icon name (MUI) based on file type.
 * @param {string} mimeOrFilename
 * @returns {string}
 */
export const getFileIcon = mimeOrFilename => {
  const category = getFileCategory(mimeOrFilename);
  const iconMap = {
    image: 'Image',
    document: 'Description',
    video: 'VideoFile',
    audio: 'AudioFile',
    unknown: 'InsertDriveFile',
  };
  return iconMap[category] || iconMap.unknown;
};

/**
 * Sanitize a filename — remove special characters, keep Arabic and standard chars.
 * @param {string} filename
 * @returns {string}
 */
export const sanitizeFilename = filename => {
  if (!filename) return 'file';
  const ext = getFileExtension(filename);
  const name = filename.replace(/\.[^/.]+$/, '');
  const sanitized = name.replace(/[^\u0600-\u06FFa-zA-Z0-9\s_\-]/g, '').trim();
  return ext ? `${sanitized || 'file'}.${ext}` : sanitized || 'file';
};

export default {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZES,
  formatFileSize,
  getFileExtension,
  getFileCategory,
  getMimeType,
  validateFile,
  createPreviewUrl,
  revokePreviewUrl,
  readAsDataUrl,
  readAsText,
  getFileIcon,
  sanitizeFilename,
};
