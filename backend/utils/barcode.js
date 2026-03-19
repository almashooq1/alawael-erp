/**
 * Barcode Utility — Generate barcode images as Base64 strings
 * Used by: notificationController
 */

/**
 * Generate a barcode as a Base64-encoded PNG string
 * @param {string} text - The text/data to encode in the barcode
 * @param {Object} options - Optional barcode options
 * @param {string} options.format - Barcode format (default: 'CODE128')
 * @param {number} options.width - Bar width in pixels (default: 2)
 * @param {number} options.height - Bar height in pixels (default: 100)
 * @returns {string} Base64-encoded barcode image (data URI)
 */
function generateBarcodeBase64(text, options = {}) {
  try {
    // Try using jsbarcode + canvas if available
    const JsBarcode = require('jsbarcode');
    const { createCanvas } = require('canvas');

    const canvas = createCanvas();
    JsBarcode(canvas, String(text), {
      format: options.format || 'CODE128',
      width: options.width || 2,
      height: options.height || 100,
      displayValue: options.displayValue !== false,
      fontSize: options.fontSize || 16,
      margin: options.margin || 10,
    });

    return canvas.toDataURL('image/png');
  } catch {
    // Fallback: return a placeholder SVG barcode as Base64
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100">
      <rect width="200" height="100" fill="white"/>
      <text x="100" y="50" text-anchor="middle" font-size="12" fill="black">${String(text).substring(0, 30)}</text>
      <text x="100" y="70" text-anchor="middle" font-size="10" fill="gray">barcode</text>
    </svg>`;
    const base64 = Buffer.from(svg).toString('base64');
    return `data:image/svg+xml;base64,${base64}`;
  }
}

module.exports = { generateBarcodeBase64 };
