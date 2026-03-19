/* eslint-disable no-unused-vars */
/**
 * Simple test file for Barcode Service
 * Run: node test-barcode.js
 */

import QRCode from 'qrcode';
import bwipjs from 'bwip-js';

async function testBarcodeGeneration() {
  console.log('🚀 Testing Barcode Generation Service...\n');

  try {
    // Test 1: QR Code Generation
    console.log('1️⃣  Testing QR Code Generation...');
    const qrDataUrl = await QRCode.toDataURL('https://example.com/product/123', {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      width: 300,
      margin: 2,
    });
    console.log('✅ QR Code generated successfully');
    console.log(`   Size: ${qrDataUrl.length} bytes`);
    console.log(`   Starts with: ${qrDataUrl.substring(0, 50)}...\n`);

    // Test 2: CODE128 Barcode
    console.log('2️⃣  Testing CODE128 Barcode Generation...');
    const barcodePng = await bwipjs.toBuffer({
      bcid: 'code128',
      text: 'PROD-2025-001',
      scale: 3,
      height: 10,
      includetext: true,
    });
    console.log('✅ CODE128 Barcode generated successfully');
    console.log(`   Size: ${barcodePng.length} bytes\n`);

    // Test 3: EAN13 Barcode
    console.log('3️⃣  Testing EAN13 Barcode Generation...');
    const ean13Png = await bwipjs.toBuffer({
      bcid: 'ean13',
      text: '5901234123457',
      scale: 3,
      height: 10,
      includetext: true,
    });
    console.log('✅ EAN13 Barcode generated successfully');
    console.log(`   Size: ${ean13Png.length} bytes\n`);

    // Test 4: CODE39 Barcode
    console.log('4️⃣  Testing CODE39 Barcode Generation...');
    const code39Png = await bwipjs.toBuffer({
      bcid: 'code39',
      text: 'HELLO-WORLD-123',
      scale: 3,
      height: 10,
      includetext: true,
    });
    console.log('✅ CODE39 Barcode generated successfully');
    console.log(`   Size: ${code39Png.length} bytes\n`);

    console.log('✅ All tests passed! 🎉\n');
    console.log('Summary:');
    console.log('--------');
    console.log('✓ QR Code generation: Working');
    console.log('✓ CODE128 generation: Working');
    console.log('✓ EAN13 generation: Working');
    console.log('✓ CODE39 generation: Working');
    console.log('\n✅ All libraries are working correctly!');
  } catch (error) {
    console.error('❌ Error during testing:');
    console.error(error.message);
    process.exit(1);
  }
}

// Run tests
testBarcodeGeneration();
