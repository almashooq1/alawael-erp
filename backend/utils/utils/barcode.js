// backend/utils/barcode.js
const { createCanvas } = require('canvas');
const JsBarcode = require('jsbarcode');

// توليد باركود كـ base64 PNG
function generateBarcodeBase64(text) {
  const canvas = createCanvas();
  JsBarcode(canvas, text, { format: 'CODE128', width: 2, height: 60 });
  return canvas.toDataURL();
}

module.exports = { generateBarcodeBase64 };
