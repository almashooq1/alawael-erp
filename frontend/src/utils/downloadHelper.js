/**
 * Centralized file-download utility.
 * Replaces scattered document.createElement('a') patterns throughout the codebase.
 *
 * Handles:
 * - Blob → Object URL → click → cleanup  (triggerBlobDownload)
 * - Existing URL → click                  (triggerUrlDownload)
 *
 * All helpers properly clean up DOM nodes and revoke Object URLs
 * to prevent memory leaks.
 */

/**
 * Download a Blob as a named file.
 *
 * @param {Blob} blob  – the binary data to download
 * @param {string} filename – suggested filename for the Save-As dialog
 */
export const triggerBlobDownload = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

/**
 * Trigger a download from an existing URL (no Blob needed).
 * Useful when the file is already accessible via a direct link.
 *
 * @param {string} url      – the URL to download from
 * @param {string} filename – suggested filename for the Save-As dialog
 */
export const triggerUrlDownload = (url, filename) => {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
};
